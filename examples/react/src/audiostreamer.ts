import { Duplex, DuplexOptions } from "readable-stream";
import { KaldiRecognizer } from "vosk-browser";

// Polyfill process for browser - fixes process.nextTick errors
if (typeof globalThis.process === 'undefined') {
  globalThis.process = {
    env: {},
    nextTick: function (cb: (...args: any[]) => void, ...args: any[]) {
      return Promise.resolve().then(() => cb(...args));
    }
  } as any;
} else if (typeof globalThis.process.nextTick !== 'function') {
  globalThis.process.nextTick = function (cb: (...args: any[]) => void, ...args: any[]) {
    return Promise.resolve().then(() => cb(...args));
  };
}

export class AudioStreamer extends Duplex {
  constructor(public recognizer: KaldiRecognizer, options?: DuplexOptions) {
    super(options);
  }

  public _write(chunk: AudioBuffer, encoding: any, callback: any) {
    const buffer = chunk.getChannelData(0);
    if (this.recognizer && buffer.byteLength > 0) {
      this.recognizer.acceptWaveform(chunk);
    }
    callback();
  }
}
