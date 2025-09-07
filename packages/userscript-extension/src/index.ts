import type { GmXmlhttpRequestType } from './gm';

export type * from './gm';

const extensions = (window as any).__arkntools_extensions__;

/** Whether the extensions is available */
export const available = Boolean(extensions);

/** Same as `GM_xmlhttpRequest` */
export const request: GmXmlhttpRequestType = extensions?.GM_xmlhttpRequest;
