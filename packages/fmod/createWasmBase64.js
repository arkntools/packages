const fs = require('fs');

const wasmBase64 = fs.readFileSync('fmod_reduced.wasm').toString('base64');

fs.writeFileSync('wasmBase64.js', `function base64Decode(input) {
  return Uint8Array.from(atob(input), m => m.codePointAt(0)).buffer;
}

module.exports = base64Decode('${wasmBase64}');
`);
