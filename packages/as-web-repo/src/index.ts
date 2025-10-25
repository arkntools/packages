import type { GmXmlhttpRequestOption } from '@arkntools/userscript-extension';
import ext from '@arkntools/userscript-extension';

export * from '@arkntools/userscript-extension';

export type MaybePromise<T> = T | Promise<T>;

export interface ResourceItem {
  /** Unique ID, and shouldn't be changed for the same resource even if the version is changed */
  id: string | number;
  /** Resource name */
  name: string;
  /** Resource hash */
  hash: string;
  /** File size */
  size?: number;
  /** Asset bundle size  */
  abSize?: number;
}

export interface RepositoryItem {
  /** Unique ID */
  id: string;
  /** Repository name */
  name: string;
  /**
   * Get resource version
   *
   * `getResourceList()` will be called when the resource version is changed
   * @returns Resource version
   */
  getResourceVersion: () => Promise<string>;
  /**
   * Get resource list
   * @param version Resource version
   * @returns Resource list
   */
  getResourceList: (version: string) => Promise<ResourceItem[]>;
  /**
   * Use `getResourceHelper` to define this function
   */
  getResource: (params: GetResourceParams) => Promise<Blob>;
  /**
   * **Advanced:** If return true, `dataHandler` will be called when load asset data
   */
  hasDataHandler?: (info: AssetInfo) => MaybePromise<boolean>;
  /**
   * **Advanced:** Process data and use the return value as the final result
   */
  dataHandler?: (info: AssetInfo, data: unknown) => MaybePromise<unknown>;
}

export interface AssetInfo {
  fileName: string;
  name: string;
  container: string;
  type: string;
}

export interface GetResourceParams {
  version: string;
  item: ResourceItem;
  options?: GetResourceRequestOptions;
  signal?: AbortSignal;
}

export type GetResourceRequestOptions = Pick<GmXmlhttpRequestOption<any>, 'onprogress'>;

/** Type helper to define as-web repositories */
export const defineRepositories = (repositories: RepositoryItem[]) => repositories;

export const lib = ext;

/**
 * @param handler Handler to get `GM_xmlhttpRequest` request options
 * @returns `RepositoryItem.getResource` function
 */
export const getResourceHelper =
  (
    handler: (
      version: string,
      item: ResourceItem
    ) => MaybePromise<
      Omit<GmXmlhttpRequestOption<any>, 'responseType' | 'onload' | 'onerror' | 'onabort' | 'onprogress' | 'fetch'>
    >
  ): RepositoryItem['getResource'] =>
  async ({ version, item, options, signal }) => {
    const basicOptions = await handler(version, item);

    return new Promise<Blob>((resolve, reject) => {
      const { abort } = lib.request({
        ...basicOptions,
        ...options,
        responseType: 'blob',
        onload: res => {
          signal?.removeEventListener('abort', abort);
          resolve(res.response);
        },
        onerror: res => {
          signal?.removeEventListener('abort', abort);
          reject(res.error);
        },
        onabort: () => {
          reject(signal?.reason);
        },
      });

      signal?.addEventListener('abort', abort);
    });
  };
