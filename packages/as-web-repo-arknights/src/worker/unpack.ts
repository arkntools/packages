import { expose } from 'comlink';
import { isFunction } from 'es-toolkit';

const START_OFFSET = 128;

const jsonStringify = (data: unknown) =>
  JSON.stringify(
    data,
    (key, value) => (typeof value === 'bigint' ? (JSON as any).rawJSON?.(value.toString()) ?? Number(value) : value),
    2
  );

const unpack = async (name: string, data: Uint8Array) => {
  if (name === '__decrypt_text_asset__') return decryptTextAsset(data);
  const fbsJs = await import(
    // @ts-ignore
    'https://unpkg.com/@arkntools/arknights-fbs-js@0'
  );
  const obj = await fbsJs[name](data.slice(START_OFFSET));
  if (Object.values(obj).every(value => !value || isFunction(value))) {
    console.error(name, obj);
    throw new Error('unpack failed');
  }
  return jsonStringify(obj);
};

const AES_KEY = new TextEncoder().encode('UITpAi82pHAWwnzq');
const AES_IV_MASK = new TextEncoder().encode('HRMCwPonJLIB3WCl');
const AES_IV_LENGTH = 16;

const xorUint8Array = (a: Uint8Array, b: Uint8Array) => {
  const length = Math.min(a.length, b.length);
  const result = new Uint8Array(length);
  for (let i = 0; i < length; i++) {
    result[i] = a[i]! ^ b[i]!;
  }
  return result;
};

const aesDecrypt = async (data: Uint8Array<ArrayBuffer>, key: Uint8Array<ArrayBuffer>, iv: Uint8Array<ArrayBuffer>) => {
  const cryptoKey = await crypto.subtle.importKey('raw', key, 'AES-CBC', false, ['decrypt']);
  const decryptedData = await crypto.subtle.decrypt({ name: 'AES-CBC', iv }, cryptoKey, data);
  return decryptedData;
};

const decryptTextAsset = async (data: Uint8Array) => {
  const buf = data.slice(START_OFFSET, START_OFFSET + AES_IV_LENGTH);
  const aesIv = xorUint8Array(buf, AES_IV_MASK);
  const decryptedData = await aesDecrypt(data.slice(START_OFFSET + AES_IV_LENGTH), AES_KEY, aesIv);
  const text = new TextDecoder().decode(decryptedData);
  if (text.startsWith('{')) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {}
  }
  return text;
};

const exposeObj = {
  unpack,
};

export type UnpackWorker = typeof exposeObj;

expose(exposeObj);
