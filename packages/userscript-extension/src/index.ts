import type { GmXmlhttpRequestType } from './gm';

export type * from './gm';

let ready = false;
let readyResolver: PromiseWithResolvers<void> | undefined;
let extensions = (window as any).__arkntools_extensions__;

const exports = {
  /** Whether the extensions is available */
  available: () => ready,
  /** Wait for the extensions to be available */
  waitAvailable: async () => {
    if (ready) return;
    return readyResolver?.promise;
  },
  /** Same as `GM_xmlhttpRequest` */
  request: null as any as GmXmlhttpRequestType,
};

const init = () => {
  ready = true;
  exports.request = extensions.GM_xmlhttpRequest;
  readyResolver?.resolve();
  readyResolver = undefined;
};

if (extensions) {
  init();
} else {
  readyResolver = Promise.withResolvers();
  (window as any).__arkntools_extensions_ready_callback__ = (m: any) => {
    extensions = m;
    init();
  };
}

export default exports;
