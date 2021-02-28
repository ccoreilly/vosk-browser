import { v4 as uuid } from "uuid";

import WebWorker from "web-worker:./worker.ts";
import {
  ClientMessage,
  ClientMessageAudioChunk,
  ClientMessageLoad,
  ModelMessage,
  RecognizerEvent,
  RecognizerMessage,
  ServerMessage,
  ServerMessageLoadResult,
} from "./interfaces";

export class Model extends EventTarget {
  private worker: Worker;
  private _ready: boolean;

  constructor(private modelUrl: string) {
    super();
    this.worker = new WebWorker();
    this.initialize();
  }

  private initialize() {
    this.worker.addEventListener("message", (event) =>
      this.handleMessage(event)
    );

    this.postMessage<ClientMessageLoad>({
      action: "load",
      modelUrl: this.modelUrl,
    });
  }

  private postMessage<T = ClientMessage>(
    message: T,
    options?: PostMessageOptions
  ) {
    this.worker.postMessage(message, options);
  }

  private handleMessage(event: MessageEvent<ServerMessage>) {
    console.debug(JSON.stringify(event.data));
    const message = event.data;

    this.dispatchEvent(new CustomEvent(message.event, { detail: message }));
  }

  public on(
    event: ModelMessage["event"],
    listener: (message: ModelMessage) => void
  ) {
    this.addEventListener(event, (event: any) => {
      if (event.detail && !ServerMessage.isRecognizerMessage(event.detail)) {
        listener(event.detail);
      }
    });
  }

  public get ready(): boolean {
    return this._ready;
  }

  /**
   * KaldiRecognizer anonymous class
   */
  public get KaldiRecognizer() {
    const model = this;
    return class extends EventTarget {
      public id = uuid();
      constructor() {
        super();
      }

      public on(
        event: RecognizerEvent,
        listener: (message: RecognizerMessage) => void
      ) {
        model.addEventListener(event, (event: any) => {
          if (event.detail && ServerMessage.isRecognizerMessage(event.detail)) {
            listener(event.detail);
          }
        });
      }

      public acceptWaveform(buffer: AudioBuffer): void {
        if (buffer.numberOfChannels < 1) {
          throw new Error(`AudioBuffer should contain at least one channel`);
        }

        // AudioBuffer samples are represented as floating point numbers between -1.0 and 1.0 whilst
        // Kaldi expects them to be between -32768 and 32767 (the range of a signed int16)
        // Should this be handled by the library (better in the C codebase) or left to the end-user to decide?
        const data = buffer.getChannelData(0).map((value) => value * 0x8000);
        if (!(data instanceof Float32Array)) {
          throw new Error(
            `Channel data is not a Float32Array as expected: ${data}`
          );
        }

        console.debug(`Recognizer (id: ${this.id}): Sending audioChunk`);
        model.postMessage<ClientMessageAudioChunk>(
          {
            action: "audioChunk",
            data,
            recognizerId: this.id,
            sampleRate: buffer.sampleRate,
          },
          {
            transfer: [data.buffer],
          }
        );
      }
    };
  }
}

export type KaldiRecognizer = InstanceType<Model["KaldiRecognizer"]>;

export async function createModel(modelUrl: string): Promise<Model> {
  const model = new Model(modelUrl);

  return new Promise((resolve, reject) =>
    model.on("load", (message: any) => {
      if (message.result) {
        resolve(model);
      }
      reject();
    })
  );
}
