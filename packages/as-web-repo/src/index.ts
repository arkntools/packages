import type { GmXmlhttpRequestOption } from '@arkntools/userscript-extension';
import ext from '@arkntools/userscript-extension';

export * from '@arkntools/userscript-extension';

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
   * Get resource
   * @param version Resource version
   * @param item Resource item
   * @returns Resource data
   */
  getResource: (version: string, item: ResourceItem, options?: GetResourceOptions) => Promise<Blob>;
}

export type GetResourceOptions = Pick<GmXmlhttpRequestOption<any>, 'onprogress'>;

/** Type helper to define as-web repositories */
export const defineRepositories = (repositories: RepositoryItem[]) => repositories;

export const lib = ext;
