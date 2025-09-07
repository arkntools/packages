/*
From https://github.com/lisonge/vite-plugin-monkey/tree/main/packages/vite-plugin-monkey/src/client/types

MIT License

Copyright (c) 2020 二刺螈

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export interface GmAbortHandle<TReturn = void> {
  abort: () => TReturn;
}

export interface GmProgressEventBase {
  done: number;
  lengthComputable: boolean;
  loaded: number;
  position: number;
  total: number;
  totalSize: number;
}

export interface GmResponseEventListener<Event> {
  (this: Event, event: Event): void;
}

export interface GmVoidCallback {
  (error: any): void;
}

export type GmAnyFuntion = (...args: any[]) => any;

export interface GmResponseTypeMap {
  text: string;
  json: any;
  arraybuffer: ArrayBuffer;
  blob: Blob;
  document: Document;
  stream: ReadableStream<Uint8Array>;
}

export type GmResponseType = keyof GmResponseTypeMap;

export interface GmResponseEventBase<R extends GmResponseType> {
  responseHeaders: string;
  /**
   * 0 = XMLHttpRequest.UNSENT
   *
   * 1 = XMLHttpRequest.OPENED
   *
   * 2 = XMLHttpRequest.HEADERS_RECEIVED
   *
   * 3 = XMLHttpRequest.HEADERS_RECEIVED
   *
   * 4 = XMLHttpRequest.DONE
   */
  readyState: 0 | 1 | 2 | 3 | 4;
  response: GmResponseTypeMap[R];
  responseText: string;
  responseXML: Document | null;
  status: number;
  statusText: string;
}

export interface GmErrorEvent<R extends GmResponseType> extends GmResponseEventBase<R> {
  error: string;
}

export interface GmResponseEvent<R extends GmResponseType, C = undefined> extends GmResponseEventBase<R> {
  finalUrl: string;
  context: C;
}

export interface GmProgressResponseEvent<R extends GmResponseType, C = undefined>
  extends GmResponseEvent<R, C>,
    GmProgressEventBase {}

export interface GmXmlhttpRequestOption<R extends GmResponseType, C = undefined> {
  method?: string;
  url: string;
  headers?: Record<string, string>;

  data?: BodyInit;

  /**
   * @available tampermonkey
   */
  redirect?: `follow` | `error` | `manual`;

  /**
   * @available tampermonkey
   */
  cookie?: string;

  /**
   * @see https://github.com/Tampermonkey/tampermonkey/issues/2057#issuecomment-2114745447
   * @available tampermonkey
   */
  cookiePartition?: {
    topLevelSite?: string;
  };

  binary?: boolean;

  /**
   * @available tampermonkey
   */
  nocache?: boolean;

  /**
   * @available tampermonkey
   */
  revalidate?: boolean;

  timeout?: number;

  /**
   * Property which will be added to the response event object
   */
  context?: C;

  /**
   * @tampermonkey  text, json, arraybuffer, blob, document, stream
   * @violentmonkey text, json, arraybuffer, blob, document
   * @default
   * 'text'
   */
  responseType?: R;

  overrideMimeType?: string;

  anonymous?: boolean;

  /**
   * @available tampermonkey
   */
  fetch?: boolean;

  user?: string;

  password?: string;

  onabort?: () => void;

  onerror?: GmResponseEventListener<GmErrorEvent<R>>;

  /**
   * @available violentmonkey
   */
  onloadend?: GmResponseEventListener<GmResponseEvent<R, C>>;

  onloadstart?: GmResponseEventListener<GmResponseEvent<R, C>>;

  onprogress?: GmResponseEventListener<GmProgressResponseEvent<R, C>>;

  onreadystatechange?: GmResponseEventListener<GmResponseEvent<R, C>>;

  ontimeout?: () => void;

  onload?: GmResponseEventListener<GmResponseEvent<R, C>>;
}

export interface GmXmlhttpRequestExtType {
  /**
   * @see [tampermonkey#1278](https://github.com/Tampermonkey/tampermonkey/issues/1278#issuecomment-884363078)
   */
  RESPONSE_TYPE_STREAM?: 'stream';
}

export interface GmXmlhttpRequestType extends GmXmlhttpRequestExtType {
  <R extends GmResponseType = 'text', C = any>(details: GmXmlhttpRequestOption<R, C>): GmAbortHandle;
}
