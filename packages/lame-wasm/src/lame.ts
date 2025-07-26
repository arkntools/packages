import { loadWasm, WasmContext, Ptr } from './lame_native_loader';

export interface LameInitParams {
  readonly sampleRate: number;
  readonly stereo: boolean;
  readonly debug: boolean;
  readonly vbrQuality: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
}

export const LAME_INIT_PARAMS_DEFAULTS: LameInitParams = Object.freeze({
  sampleRate: 44100,
  stereo: true,
  vbrQuality: 5,
  debug: false,
});

export class Lame {
  private readonly context: WasmContext;
  private readonly params: Readonly<LameInitParams>;
  private readonly maxEncodeSamples: number;
  private readonly structPtr: Ptr;
  private readonly memoryBuffer: ArrayBuffer;
  private readonly pcmBuffers: Float32Array[];
  private readonly outputBuffer: Uint8Array;

  public static async load(params: Partial<{ wasmBinary: ArrayBuffer } & LameInitParams> = {}) {
    const { wasmBinary, ...lameParams } = params;
    const ctx = await loadWasm(wasmBinary);
    return new Lame(ctx, lameParams);
  }

  private constructor(context: WasmContext, partialParams?: Partial<LameInitParams>) {
    const params = { ...LAME_INIT_PARAMS_DEFAULTS, ...partialParams };

    this.context = context;
    this.memoryBuffer = context.HEAP8.buffer as ArrayBuffer;
    this.params = params;
    this.maxEncodeSamples = context._lamejs_max_encode_samples();
    this.structPtr = context._lamejs_init(params.sampleRate, params.stereo, params.vbrQuality);
    if (!this.structPtr) {
      throw new Error('_vmsg_init failed');
    }

    this.pcmBuffers = [
      new Float32Array(this.memoryBuffer, this.getStructPointerAtOffset(0)),
      new Float32Array(this.memoryBuffer, this.getStructPointerAtOffset(4)),
    ];

    this.outputBuffer = new Uint8Array(this.memoryBuffer, this.getStructPointerAtOffset(8));
  }

  public numChannels() {
    return this.params.stereo ? 2 : 1;
  }

  private getStructPointerAtOffset<T>(offset: number): Ptr {
    const ptr = new Uint32Array(this.memoryBuffer, this.structPtr + offset, 1)[0];
    return ptr;
  }

  public *encode(...channels: Float32Array[]): Iterable<Uint8Array<ArrayBuffer>> {
    let elapsed = 0;
    let numChunks = 0;
    let totalEncoded = 0;

    const expectedNumChannels = this.params.stereo ? 2 : 1;
    if (channels.length !== expectedNumChannels) {
      throw new Error(
        `Invalid arguments: expected ${expectedNumChannels} channels, but received ${channels.length}`,
      );
    }

    const numSamples = channels[0].length;
    for (const [chanIdx, channel] of channels.entries()) {
      if (channel.length !== numSamples) {
        throw new Error(
          'Invalid arguments: channels should all have same length ' +
            `but channel ${chanIdx} has size ${channel.length} and channel 0 has size ${numSamples}`,
        );
      }
      for (const [sampleIdx, sample] of channel.entries()) {
        if (sample < -1 || sample > 1) {
          throw new Error(
            `Invalid arguments: sample data must be in range [-1, 1], ` +
              `but channels[${chanIdx}][${sampleIdx}] == ${sample}`,
          );
        }
      }
    }

    if (this.params.debug) {
      console.debug(
        `lame.encode: encoding ${channels.length} channels with ${numSamples} samples each`,
      );
    }

    let chunkStart = 0;
    while (chunkStart < numSamples) {
      const started = Date.now();
      const chunkEnd = Math.min(chunkStart + this.maxEncodeSamples, numSamples);
      const chunkLength = chunkEnd - chunkStart;

      for (const [i, pcm] of channels.entries()) {
        const chunk = pcm.slice(chunkStart, chunkEnd);
        this.pcmBuffers[i].set(chunk);
      }
      const nEncoded = this.context._lamejs_encode(this.structPtr, chunkLength);

      if (this.params.debug) {
        const startOfArray = (a: Float32Array) => Array.from(a.slice(0, 3)).map(round4);
        console.debug('lame.encode:', {
          chunkStart,
          chunkEnd,
          'leftChunk[0..2]': startOfArray(this.pcmBuffers[0]),
          'rightChunk[0..2]': startOfArray(this.pcmBuffers[1]),
        });
        this.context._lamejs_print_debug_info(this.structPtr);
      }

      if (nEncoded < 0) {
        throw new Error('lame.encode: _vmsg_encode failed, returned ' + nEncoded);
      }
      const outputChunk = this.outputBuffer.slice(0, nEncoded);
      elapsed += Date.now() - started;
      numChunks++;
      totalEncoded += nEncoded;

      chunkStart = chunkEnd;

      // mod: do not use Buffer
      yield outputChunk;
    }

    if (this.params.debug) {
      console.log('encoded: ', {
        totalEncoded,
        numChunks,
        elapsed,
        avgElapsed: round4(elapsed / numChunks),
      });
    }
  }

  public flush(): Uint8Array {
    const nEncoded = this.context._lamejs_flush(this.structPtr);
    if (nEncoded < 0) {
      throw new Error('_vmsg_flush failed, returning ' + nEncoded);
    }
    const outputChunk = this.outputBuffer.slice(0, nEncoded);
    return outputChunk;
  }

  public free() {
    this.context._lamejs_free(this.structPtr);
  }
}

function round4(n: number) {
  return Math.round(n * 10000) / 10000;
}
