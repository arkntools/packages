const FMOD = require('./fmod_reduced.js');
const wasmBinary = require('./wasmBase64.js');

module.exports = (args = {}) => FMOD({ wasmBinary, ...args });
