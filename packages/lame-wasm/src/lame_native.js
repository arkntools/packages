'use strict';
var Module = (function () {
  var _scriptDir =
    typeof document !== 'undefined' && document.currentScript
      ? document.currentScript.src
      : undefined;
  return function (Module) {
    Module = Module || {};
    var Module = typeof Module !== 'undefined' ? Module : {};
    var moduleOverrides = {};
    var key;
    for (key in Module) {
      if (Module.hasOwnProperty(key)) {
        moduleOverrides[key] = Module[key];
      }
    }
    Module['arguments'] = [];
    Module['thisProgram'] = './this.program';
    Module['quit'] = function (status, toThrow) {
      throw toThrow;
    };
    Module['preRun'] = [];
    Module['postRun'] = [];
    var ENVIRONMENT_IS_WEB = false;
    var ENVIRONMENT_IS_WORKER = false;
    var ENVIRONMENT_IS_NODE = false;
    var ENVIRONMENT_HAS_NODE = false;
    var ENVIRONMENT_IS_SHELL = false;
    ENVIRONMENT_IS_WEB = typeof window === 'object';
    ENVIRONMENT_IS_WORKER = typeof importScripts === 'function';
    ENVIRONMENT_HAS_NODE = typeof process === 'object' && typeof require === 'function';
    ENVIRONMENT_IS_NODE = ENVIRONMENT_HAS_NODE && !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_WORKER;
    ENVIRONMENT_IS_SHELL = !ENVIRONMENT_IS_WEB && !ENVIRONMENT_IS_NODE && !ENVIRONMENT_IS_WORKER;
    var scriptDirectory = '';
    function locateFile(path) {
      if (Module['locateFile']) {
        return Module['locateFile'](path, scriptDirectory);
      } else {
        return scriptDirectory + path;
      }
    }
    if (ENVIRONMENT_IS_NODE) {
      scriptDirectory = __dirname + '/';
      var nodeFS;
      var nodePath;
      Module['read'] = function shell_read(filename, binary) {
        var ret;
        if (!nodeFS) nodeFS = require('fs');
        if (!nodePath) nodePath = require('path');
        filename = nodePath['normalize'](filename);
        ret = nodeFS['readFileSync'](filename);
        return binary ? ret : ret.toString();
      };
      Module['readBinary'] = function readBinary(filename) {
        var ret = Module['read'](filename, true);
        if (!ret.buffer) {
          ret = new Uint8Array(ret);
        }
        assert(ret.buffer);
        return ret;
      };
      if (process['argv'].length > 1) {
        Module['thisProgram'] = process['argv'][1].replace(/\\/g, '/');
      }
      Module['arguments'] = process['argv'].slice(2);
      process['on']('unhandledRejection', abort);
      Module['quit'] = function (status) {
        process['exit'](status);
      };
      Module['inspect'] = function () {
        return '[Emscripten Module object]';
      };
    } else if (ENVIRONMENT_IS_SHELL) {
      if (typeof read != 'undefined') {
        Module['read'] = function shell_read(f) {
          return read(f);
        };
      }
      Module['readBinary'] = function readBinary(f) {
        var data;
        if (typeof readbuffer === 'function') {
          return new Uint8Array(readbuffer(f));
        }
        data = read(f, 'binary');
        assert(typeof data === 'object');
        return data;
      };
      if (typeof scriptArgs != 'undefined') {
        Module['arguments'] = scriptArgs;
      } else if (typeof arguments != 'undefined') {
        Module['arguments'] = arguments;
      }
      if (typeof quit === 'function') {
        Module['quit'] = function (status) {
          quit(status);
        };
      }
    } else if (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) {
      if (ENVIRONMENT_IS_WORKER) {
        scriptDirectory = self.location.href;
      } else if (document.currentScript) {
        scriptDirectory = document.currentScript.src;
      }
      if (_scriptDir) {
        scriptDirectory = _scriptDir;
      }
      if (scriptDirectory.indexOf('blob:') !== 0) {
        scriptDirectory = scriptDirectory.substr(0, scriptDirectory.lastIndexOf('/') + 1);
      } else {
        scriptDirectory = '';
      }
      Module['read'] = function shell_read(url) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, false);
        xhr.send(null);
        return xhr.responseText;
      };
      if (ENVIRONMENT_IS_WORKER) {
        Module['readBinary'] = function readBinary(url) {
          var xhr = new XMLHttpRequest();
          xhr.open('GET', url, false);
          xhr.responseType = 'arraybuffer';
          xhr.send(null);
          return new Uint8Array(xhr.response);
        };
      }
      Module['readAsync'] = function readAsync(url, onload, onerror) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function xhr_onload() {
          if (xhr.status == 200 || (xhr.status == 0 && xhr.response)) {
            onload(xhr.response);
            return;
          }
          onerror();
        };
        xhr.onerror = onerror;
        xhr.send(null);
      };
      Module['setWindowTitle'] = function (title) {
        document.title = title;
      };
    } else {
    }
    var out =
      Module['print'] ||
      (typeof console !== 'undefined'
        ? console.log.bind(console)
        : typeof print !== 'undefined'
          ? print
          : null);
    var err =
      Module['printErr'] ||
      (typeof printErr !== 'undefined'
        ? printErr
        : (typeof console !== 'undefined' && console.warn.bind(console)) || out);
    for (key in moduleOverrides) {
      if (moduleOverrides.hasOwnProperty(key)) {
        Module[key] = moduleOverrides[key];
      }
    }
    moduleOverrides = undefined;
    var asm2wasmImports = {
      'f64-rem': function (x, y) {
        return x % y;
      },
      debugger: function () {
        debugger;
      },
    };
    var functionPointers = new Array(0);
    if (typeof WebAssembly !== 'object') {
      err('no native wasm support detected');
    }
    var wasmMemory;
    var wasmTable;
    var ABORT = false;
    var EXITSTATUS = 0;
    function assert(condition, text) {
      if (!condition) {
        abort('Assertion failed: ' + text);
      }
    }
    var UTF8Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf8') : undefined;
    function UTF8ArrayToString(u8Array, idx, maxBytesToRead) {
      var endIdx = idx + maxBytesToRead;
      var endPtr = idx;
      while (u8Array[endPtr] && !(endPtr >= endIdx)) ++endPtr;
      if (endPtr - idx > 16 && u8Array.subarray && UTF8Decoder) {
        return UTF8Decoder.decode(u8Array.subarray(idx, endPtr));
      } else {
        var str = '';
        while (idx < endPtr) {
          var u0 = u8Array[idx++];
          if (!(u0 & 128)) {
            str += String.fromCharCode(u0);
            continue;
          }
          var u1 = u8Array[idx++] & 63;
          if ((u0 & 224) == 192) {
            str += String.fromCharCode(((u0 & 31) << 6) | u1);
            continue;
          }
          var u2 = u8Array[idx++] & 63;
          if ((u0 & 240) == 224) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
          } else {
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (u8Array[idx++] & 63);
          }
          if (u0 < 65536) {
            str += String.fromCharCode(u0);
          } else {
            var ch = u0 - 65536;
            str += String.fromCharCode(55296 | (ch >> 10), 56320 | (ch & 1023));
          }
        }
      }
      return str;
    }
    function UTF8ToString(ptr, maxBytesToRead) {
      return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
    }
    var UTF16Decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-16le') : undefined;
    var WASM_PAGE_SIZE = 65536;
    var buffer, HEAP8, HEAPU8, HEAP16, HEAPU16, HEAP32, HEAPU32, HEAPF32, HEAPF64;
    function updateGlobalBufferViews() {
      Module['HEAP8'] = HEAP8 = new Int8Array(buffer);
      Module['HEAP16'] = HEAP16 = new Int16Array(buffer);
      Module['HEAP32'] = HEAP32 = new Int32Array(buffer);
      Module['HEAPU8'] = HEAPU8 = new Uint8Array(buffer);
      Module['HEAPU16'] = HEAPU16 = new Uint16Array(buffer);
      Module['HEAPU32'] = HEAPU32 = new Uint32Array(buffer);
      Module['HEAPF32'] = HEAPF32 = new Float32Array(buffer);
      Module['HEAPF64'] = HEAPF64 = new Float64Array(buffer);
    }
    var DYNAMIC_BASE = 5335840,
      DYNAMICTOP_PTR = 92928;
    var TOTAL_STACK = 5242880;
    var INITIAL_TOTAL_MEMORY = Module['TOTAL_MEMORY'] || 16777216;
    if (INITIAL_TOTAL_MEMORY < TOTAL_STACK)
      err(
        'TOTAL_MEMORY should be larger than TOTAL_STACK, was ' +
          INITIAL_TOTAL_MEMORY +
          '! (TOTAL_STACK=' +
          TOTAL_STACK +
          ')',
      );
    if (Module['buffer']) {
      buffer = Module['buffer'];
    } else {
      if (typeof WebAssembly === 'object' && typeof WebAssembly.Memory === 'function') {
        wasmMemory = new WebAssembly.Memory({
          initial: INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
          maximum: INITIAL_TOTAL_MEMORY / WASM_PAGE_SIZE,
        });
        buffer = wasmMemory.buffer;
      } else {
        buffer = new ArrayBuffer(INITIAL_TOTAL_MEMORY);
      }
    }
    updateGlobalBufferViews();
    HEAP32[DYNAMICTOP_PTR >> 2] = DYNAMIC_BASE;
    function callRuntimeCallbacks(callbacks) {
      while (callbacks.length > 0) {
        var callback = callbacks.shift();
        if (typeof callback == 'function') {
          callback();
          continue;
        }
        var func = callback.func;
        if (typeof func === 'number') {
          if (callback.arg === undefined) {
            Module['dynCall_v'](func);
          } else {
            Module['dynCall_vi'](func, callback.arg);
          }
        } else {
          func(callback.arg === undefined ? null : callback.arg);
        }
      }
    }
    var __ATPRERUN__ = [];
    var __ATINIT__ = [];
    var __ATMAIN__ = [];
    var __ATPOSTRUN__ = [];
    var runtimeInitialized = false;
    var runtimeExited = false;
    function preRun() {
      if (Module['preRun']) {
        if (typeof Module['preRun'] == 'function') Module['preRun'] = [Module['preRun']];
        while (Module['preRun'].length) {
          addOnPreRun(Module['preRun'].shift());
        }
      }
      callRuntimeCallbacks(__ATPRERUN__);
    }
    function ensureInitRuntime() {
      if (runtimeInitialized) return;
      runtimeInitialized = true;
      callRuntimeCallbacks(__ATINIT__);
    }
    function preMain() {
      callRuntimeCallbacks(__ATMAIN__);
    }
    function exitRuntime() {
      runtimeExited = true;
    }
    function postRun() {
      if (Module['postRun']) {
        if (typeof Module['postRun'] == 'function') Module['postRun'] = [Module['postRun']];
        while (Module['postRun'].length) {
          addOnPostRun(Module['postRun'].shift());
        }
      }
      callRuntimeCallbacks(__ATPOSTRUN__);
    }
    function addOnPreRun(cb) {
      __ATPRERUN__.unshift(cb);
    }
    function addOnPostRun(cb) {
      __ATPOSTRUN__.unshift(cb);
    }
    var runDependencies = 0;
    var runDependencyWatcher = null;
    var dependenciesFulfilled = null;
    function addRunDependency(id) {
      runDependencies++;
      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }
    }
    function removeRunDependency(id) {
      runDependencies--;
      if (Module['monitorRunDependencies']) {
        Module['monitorRunDependencies'](runDependencies);
      }
      if (runDependencies == 0) {
        if (runDependencyWatcher !== null) {
          clearInterval(runDependencyWatcher);
          runDependencyWatcher = null;
        }
        if (dependenciesFulfilled) {
          var callback = dependenciesFulfilled;
          dependenciesFulfilled = null;
          callback();
        }
      }
    }
    Module['preloadedImages'] = {};
    Module['preloadedAudios'] = {};
    var dataURIPrefix = 'data:application/octet-stream;base64,';
    function isDataURI(filename) {
      return String.prototype.startsWith
        ? filename.startsWith(dataURIPrefix)
        : filename.indexOf(dataURIPrefix) === 0;
    }
    var wasmBinaryFile = 'lame_native.wasm';
    if (!isDataURI(wasmBinaryFile)) {
      wasmBinaryFile = locateFile(wasmBinaryFile);
    }
    function getBinary() {
      try {
        if (Module['wasmBinary']) {
          return new Uint8Array(Module['wasmBinary']);
        }
        if (Module['readBinary']) {
          return Module['readBinary'](wasmBinaryFile);
        } else {
          throw 'both async and sync fetching of the wasm failed';
        }
      } catch (err) {
        abort(err);
      }
    }
    function getBinaryPromise() {
      if (
        !Module['wasmBinary'] &&
        (ENVIRONMENT_IS_WEB || ENVIRONMENT_IS_WORKER) &&
        typeof fetch === 'function'
      ) {
        return fetch(wasmBinaryFile, { credentials: 'same-origin' })
          .then(function (response) {
            if (!response['ok']) {
              throw "failed to load wasm binary file at '" + wasmBinaryFile + "'";
            }
            return response['arrayBuffer']();
          })
          .catch(function () {
            return getBinary();
          });
      }
      return new Promise(function (resolve, reject) {
        resolve(getBinary());
      });
    }
    function createWasm(env) {
      var info = {
        env: env,
        global: { NaN: NaN, Infinity: Infinity },
        'global.Math': Math,
        asm2wasm: asm2wasmImports,
      };
      function receiveInstance(instance, module) {
        var exports = instance.exports;
        Module['asm'] = exports;
        removeRunDependency('wasm-instantiate');
      }
      addRunDependency('wasm-instantiate');
      function receiveInstantiatedSource(output) {
        receiveInstance(output['instance']);
      }
      function instantiateArrayBuffer(receiver) {
        return getBinaryPromise()
          .then(function (binary) {
            return WebAssembly.instantiate(binary, info);
          })
          .then(receiver, function (reason) {
            err('failed to asynchronously prepare wasm: ' + reason);
            abort(reason);
          });
      }
      function instantiateAsync() {
        if (
          !ENVIRONMENT_IS_NODE && // mod: fix node loading issue
          !Module['wasmBinary'] &&
          typeof WebAssembly.instantiateStreaming === 'function' &&
          !isDataURI(wasmBinaryFile) &&
          typeof fetch === 'function'
        ) {
          fetch(wasmBinaryFile, { credentials: 'same-origin' }).then(function (response) {
            return WebAssembly.instantiateStreaming(response, info).then(
              receiveInstantiatedSource,
              function (reason) {
                err('wasm streaming compile failed: ' + reason);
                err('falling back to ArrayBuffer instantiation');
                instantiateArrayBuffer(receiveInstantiatedSource);
              },
            );
          });
        } else {
          return instantiateArrayBuffer(receiveInstantiatedSource);
        }
      }
      if (Module['instantiateWasm']) {
        try {
          return Module['instantiateWasm'](info, receiveInstance);
        } catch (e) {
          err('Module.instantiateWasm callback failed with error: ' + e);
          return false;
        }
      }
      instantiateAsync();
      return {};
    }
    Module['asm'] = function (global, env, providedBuffer) {
      env['memory'] = wasmMemory;
      env['table'] = wasmTable = new WebAssembly.Table({
        initial: 28,
        maximum: 28,
        element: 'anyfunc',
      });
      env['__memory_base'] = 1024;
      env['__table_base'] = 0;
      var exports = createWasm(env);
      return exports;
    };
    var PATH = {
      splitPath: function (filename) {
        var splitPathRe = /^(\/?|)([\s\S]*?)((?:\.{1,2}|[^\/]+?|)(\.[^.\/]*|))(?:[\/]*)$/;
        return splitPathRe.exec(filename).slice(1);
      },
      normalizeArray: function (parts, allowAboveRoot) {
        var up = 0;
        for (var i = parts.length - 1; i >= 0; i--) {
          var last = parts[i];
          if (last === '.') {
            parts.splice(i, 1);
          } else if (last === '..') {
            parts.splice(i, 1);
            up++;
          } else if (up) {
            parts.splice(i, 1);
            up--;
          }
        }
        if (allowAboveRoot) {
          for (; up; up--) {
            parts.unshift('..');
          }
        }
        return parts;
      },
      normalize: function (path) {
        var isAbsolute = path.charAt(0) === '/',
          trailingSlash = path.substr(-1) === '/';
        path = PATH.normalizeArray(
          path.split('/').filter(function (p) {
            return !!p;
          }),
          !isAbsolute,
        ).join('/');
        if (!path && !isAbsolute) {
          path = '.';
        }
        if (path && trailingSlash) {
          path += '/';
        }
        return (isAbsolute ? '/' : '') + path;
      },
      dirname: function (path) {
        var result = PATH.splitPath(path),
          root = result[0],
          dir = result[1];
        if (!root && !dir) {
          return '.';
        }
        if (dir) {
          dir = dir.substr(0, dir.length - 1);
        }
        return root + dir;
      },
      basename: function (path) {
        if (path === '/') return '/';
        var lastSlash = path.lastIndexOf('/');
        if (lastSlash === -1) return path;
        return path.substr(lastSlash + 1);
      },
      extname: function (path) {
        return PATH.splitPath(path)[3];
      },
      join: function () {
        var paths = Array.prototype.slice.call(arguments, 0);
        return PATH.normalize(paths.join('/'));
      },
      join2: function (l, r) {
        return PATH.normalize(l + '/' + r);
      },
    };
    var SYSCALLS = {
      buffers: [null, [], []],
      printChar: function (stream, curr) {
        var buffer = SYSCALLS.buffers[stream];
        if (curr === 0 || curr === 10) {
          (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
          buffer.length = 0;
        } else {
          buffer.push(curr);
        }
      },
      varargs: 0,
      get: function (varargs) {
        SYSCALLS.varargs += 4;
        var ret = HEAP32[(SYSCALLS.varargs - 4) >> 2];
        return ret;
      },
      getStr: function () {
        var ret = UTF8ToString(SYSCALLS.get());
        return ret;
      },
      get64: function () {
        var low = SYSCALLS.get(),
          high = SYSCALLS.get();
        return low;
      },
      getZero: function () {
        SYSCALLS.get();
      },
    };
    function ___syscall140(which, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD(),
          offset_high = SYSCALLS.get(),
          offset_low = SYSCALLS.get(),
          result = SYSCALLS.get(),
          whence = SYSCALLS.get();
        return 0;
      } catch (e) {
        if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno;
      }
    }
    function ___syscall146(which, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.get(),
          iov = SYSCALLS.get(),
          iovcnt = SYSCALLS.get();
        var ret = 0;
        for (var i = 0; i < iovcnt; i++) {
          var ptr = HEAP32[(iov + i * 8) >> 2];
          var len = HEAP32[(iov + (i * 8 + 4)) >> 2];
          for (var j = 0; j < len; j++) {
            SYSCALLS.printChar(stream, HEAPU8[ptr + j]);
          }
          ret += len;
        }
        return ret;
      } catch (e) {
        if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno;
      }
    }
    function ___syscall6(which, varargs) {
      SYSCALLS.varargs = varargs;
      try {
        var stream = SYSCALLS.getStreamFromFD();
        return 0;
      } catch (e) {
        if (typeof FS === 'undefined' || !(e instanceof FS.ErrnoError)) abort(e);
        return -e.errno;
      }
    }
    function _emscripten_get_heap_size() {
      return HEAP8.length;
    }
    function _exit(status) {
      exit(status);
    }
    function _llvm_exp2_f32(x) {
      return Math.pow(2, x);
    }
    function _llvm_exp2_f64(a0) {
      return _llvm_exp2_f32(a0);
    }
    function _llvm_log10_f32(x) {
      return Math.log(x) / Math.LN10;
    }
    function _llvm_log10_f64(a0) {
      return _llvm_log10_f32(a0);
    }
    function _emscripten_memcpy_big(dest, src, num) {
      HEAPU8.set(HEAPU8.subarray(src, src + num), dest);
    }
    function ___setErrNo(value) {
      if (Module['___errno_location']) HEAP32[Module['___errno_location']() >> 2] = value;
      return value;
    }
    function abortOnCannotGrowMemory(requestedSize) {
      abort('OOM');
    }
    function _emscripten_resize_heap(requestedSize) {
      abortOnCannotGrowMemory(requestedSize);
    }
    var asmGlobalArg = {};
    var asmLibraryArg = {
      b: abort,
      g: ___setErrNo,
      l: ___syscall140,
      f: ___syscall146,
      k: ___syscall6,
      j: _emscripten_get_heap_size,
      i: _emscripten_memcpy_big,
      h: _emscripten_resize_heap,
      d: _exit,
      e: _llvm_exp2_f64,
      n: _llvm_log10_f32,
      c: _llvm_log10_f64,
      m: abortOnCannotGrowMemory,
      a: DYNAMICTOP_PTR,
    };
    var asm = Module['asm'](asmGlobalArg, asmLibraryArg, buffer);
    Module['asm'] = asm;
    var ___errno_location = (Module['___errno_location'] = function () {
      return Module['asm']['o'].apply(null, arguments);
    });
    var _lamejs_encode = (Module['_lamejs_encode'] = function () {
      return Module['asm']['p'].apply(null, arguments);
    });
    var _lamejs_flush = (Module['_lamejs_flush'] = function () {
      return Module['asm']['q'].apply(null, arguments);
    });
    var _lamejs_free = (Module['_lamejs_free'] = function () {
      return Module['asm']['r'].apply(null, arguments);
    });
    var _lamejs_init = (Module['_lamejs_init'] = function () {
      return Module['asm']['s'].apply(null, arguments);
    });
    var _lamejs_max_encode_samples = (Module['_lamejs_max_encode_samples'] = function () {
      return Module['asm']['t'].apply(null, arguments);
    });
    var _lamejs_print_debug_info = (Module['_lamejs_print_debug_info'] = function () {
      return Module['asm']['u'].apply(null, arguments);
    });
    var _lamejs_tag_frame = (Module['_lamejs_tag_frame'] = function () {
      return Module['asm']['v'].apply(null, arguments);
    });
    Module['asm'] = asm;
    Module['then'] = function (func) {
      if (Module['calledRun']) {
        func(Module);
      } else {
        var old = Module['onRuntimeInitialized'];
        Module['onRuntimeInitialized'] = function () {
          if (old) old();
          func(Module);
        };
      }
      return Module;
    };
    function ExitStatus(status) {
      this.name = 'ExitStatus';
      this.message = 'Program terminated with exit(' + status + ')';
      this.status = status;
    }
    ExitStatus.prototype = new Error();
    ExitStatus.prototype.constructor = ExitStatus;
    dependenciesFulfilled = function runCaller() {
      if (!Module['calledRun']) run();
      if (!Module['calledRun']) dependenciesFulfilled = runCaller;
    };
    function run(args) {
      args = args || Module['arguments'];
      if (runDependencies > 0) {
        return;
      }
      preRun();
      if (runDependencies > 0) return;
      if (Module['calledRun']) return;
      function doRun() {
        if (Module['calledRun']) return;
        Module['calledRun'] = true;
        if (ABORT) return;
        ensureInitRuntime();
        preMain();
        if (Module['onRuntimeInitialized']) Module['onRuntimeInitialized']();
        postRun();
      }
      if (Module['setStatus']) {
        Module['setStatus']('Running...');
        setTimeout(function () {
          setTimeout(function () {
            Module['setStatus']('');
          }, 1);
          doRun();
        }, 1);
      } else {
        doRun();
      }
    }
    Module['run'] = run;
    function exit(status, implicit) {
      if (implicit && Module['noExitRuntime'] && status === 0) {
        return;
      }
      if (Module['noExitRuntime']) {
      } else {
        ABORT = true;
        EXITSTATUS = status;
        exitRuntime();
        if (Module['onExit']) Module['onExit'](status);
      }
      Module['quit'](status, new ExitStatus(status));
    }
    function abort(what) {
      if (Module['onAbort']) {
        Module['onAbort'](what);
      }
      if (what !== undefined) {
        out(what);
        err(what);
        what = '"' + what + '"';
      } else {
        what = '';
      }
      ABORT = true;
      EXITSTATUS = 1;
      throw 'abort(' + what + '). Build with -s ASSERTIONS=1 for more info.';
    }
    Module['abort'] = abort;
    if (Module['preInit']) {
      if (typeof Module['preInit'] == 'function') Module['preInit'] = [Module['preInit']];
      while (Module['preInit'].length > 0) {
        Module['preInit'].pop()();
      }
    }
    Module['noExitRuntime'] = true;
    run();
    return Module;
  };
})();
if (typeof exports === 'object' && typeof module === 'object') module.exports = Module;
else if (typeof define === 'function' && define['amd'])
  define([], function () {
    return Module;
  });
else if (typeof exports === 'object') exports['Module'] = Module;
