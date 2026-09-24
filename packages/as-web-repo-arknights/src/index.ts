import type {
  AssetInfo,
  BundleLoadOptions,
  RepositoryItem,
  ResourceItem,
} from '@arkntools/as-web-repo';
import { BundleEnv, defineRepositories, getResourceHelper, lib } from '@arkntools/as-web-repo';
import { getUnpackerName, unpack, unpackManifest } from './fbs';
import type { ResourceManifest } from './fbs';
import { unzipSingle } from './unzip';

interface NetWorkConfig {
  configVer: string;
  funcVer: string;
  configs: Record<
    string,
    {
      override: boolean;
      network: NetworkUrls;
    }
  >;
}

interface NetworkUrls {
  gs: string;
  as: string;
  u8: string;
  hu: string;
  hv: string;
  rc: string;
  an: string;
  prean: string;
  sl: string;
  of: string;
  pkgAd: string;
  pkgIOS: string;
  secure: boolean;
}

interface AbInfo {
  name: string;
  hash: string;
  md5: string;
  totalSize: number;
  abSize: number;
  cid: number;
}

const fetchJson = async <T = any>(url: string): Promise<T> =>
  new Promise((resolve, reject) => {
    lib.request({
      url,
      responseType: 'json',
      fetch: true,
      onload: res => resolve(res.response),
      onerror: res => reject(res.error),
    });
  });

const fetchBuffer = async (url: string): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    lib.request({
      url,
      responseType: 'arraybuffer',
      fetch: true,
      onload: res => resolve(res.response),
      onerror: res => reject(res.error),
    });
  });

const formatDatName = (name: string) => name.replace(/\.[^.]+$/, '.dat').replace(/\//g, '_');

const loadOptions: BundleLoadOptions = {
  env: BundleEnv.ARKNIGHTS,
};

class ArknightsRepository implements RepositoryItem {
  readonly id: string;
  readonly loadOptions = loadOptions;

  private urls?: NetworkUrls;

  constructor(
    readonly name: string,
    readonly cfgUrl: string,
    readonly platform = 'Android',
  ) {
    this.id = name.toLowerCase().replace(/ /g, '_');
  }

  async getResourceVersion() {
    const resVersionUrl = await this.getResVersionUrl();
    const { resVersion } = await fetchJson<{ resVersion: string }>(resVersionUrl);
    return resVersion;
  }

  async getResourceList(version: string) {
    const assetsBaseUrl = await this.getAssetsBaseUrl(version);
    const { abInfos, manifestName } = await fetchJson<{
      abInfos: AbInfo[];
      manifestName?: string;
    }>(`${assetsBaseUrl}/hot_update_list.json`);

    const searchStringsByBundle = manifestName
      ? await this.getSearchStringsByBundle(version, manifestName)
      : new Map<string, string[]>();

    return abInfos
      .filter(({ name }) => !name.endsWith('.idx'))
      .map(({ cid, name, hash, totalSize, abSize }) => ({
        id: name || cid,
        name,
        hash,
        size: totalSize,
        abSize,
        ...(searchStringsByBundle.has(name) && { searchStrings: searchStringsByBundle.get(name) }),
      }));
  }

  private async getSearchStringsByBundle(version: string, manifestName: string) {
    const searchStringsByBundle = new Map<string, string[]>();
    try {
      const manifest = await this.getManifest(version, manifestName);
      for (const { bundleIndex, path } of manifest.assetToBundleList) {
        const bundleName = manifest.bundles[bundleIndex]?.name;
        if (!bundleName || !path) continue;
        const paths = searchStringsByBundle.get(bundleName) ?? [];
        paths.push(path);
        searchStringsByBundle.set(bundleName, paths);
      }
    } catch (error) {
      console.error('Failed to load resource manifest', error);
    }
    return searchStringsByBundle;
  }

  private async getManifest(version: string, manifestName: string): Promise<ResourceManifest> {
    const url = `${await this.getAssetsBaseUrl(version)}/${formatDatName(manifestName)}`;
    const zip = await fetchBuffer(url);
    const bytes = await unzipSingle(new Uint8Array(zip));
    if (bytes.length <= 128) throw new Error('Invalid manifest archive');

    const manifest = await unpackManifest(bytes);
    if (!Array.isArray(manifest.assetToBundleList) || !Array.isArray(manifest.bundles)) {
      throw new Error('Invalid resource manifest');
    }

    return manifest;
  }

  getResource = getResourceHelper(async (version: string, { name }: ResourceItem) => {
    const url = await this.getResUrl(version, name);
    return { url };
  });

  hasDataHandler(info: AssetInfo) {
    return Boolean(getUnpackerName(info.container));
  }

  dataHandler(info: AssetInfo, data: unknown) {
    return unpack(info.container, data);
  }

  private async getUrlCfg() {
    if (this.urls) return this.urls;
    const { content } = await fetchJson<{ content: string }>(this.cfgUrl);
    const { funcVer, configs }: NetWorkConfig = JSON.parse(content);
    this.urls = configs[funcVer]!.network;
    return this.urls;
  }

  private async getAssetsBaseUrl(version: string) {
    const urls = await this.getUrlCfg();
    return `${urls.hu}/${this.platform}/assets/${version}`;
  }

  private async getResVersionUrl() {
    const urls = await this.getUrlCfg();
    return urls.hv.replace('{0}', this.platform);
  }

  private async getResUrl(version: string, name: string) {
    const assetsBaseUrl = await this.getAssetsBaseUrl(version);
    return `${assetsBaseUrl}/${formatDatName(name)}`;
  }
}

export default defineRepositories(
  [
    ['CN', 'ak-conf.hypergryph.com', 'Windows'],
    ['CN', 'ak-conf.hypergryph.com'],
    ['US', 'ak-conf.arknights.global'],
    ['JP', 'ak-conf.arknights.jp'],
    ['KR', 'ak-conf.arknights.kr'],
    ['TW', 'ak-conf-tw.gryphline.com'],
  ].map(
    ([server, host, platform]) =>
      new ArknightsRepository(
        `Arknights ${server}${platform ? ` ${platform}` : ''}`,
        `https://${host}/config/prod/official/network_config`,
        platform,
      ),
  ),
);
