import { Lame } from './lame';
import wasmBinary from './wasmBase64';

const rawLoad = Lame.load;

Lame.load = (params: any = {}) => rawLoad({ wasmBinary, ...params });

export * from './lame';
