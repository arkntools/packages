const fs = require('fs');

const wasmBase64 = fs.readFileSync('lame_native.wasm').toString('base64');

fs.writeFileSync('wasmBase64.ts', `function base64Decode(input: string) {
  return Uint8Array.from(atob(input), m => m.codePointAt(0)!).buffer;
}

export default base64Decode('${wasmBase64}');
`);
