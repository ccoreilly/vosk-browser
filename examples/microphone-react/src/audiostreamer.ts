import { Duplex, DuplexOptions } from "readable-stream";
import { KaldiRecognizer } from "vosk-browser";

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
