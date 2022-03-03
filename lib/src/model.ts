import { v4 as uuid } from "uuid";

import WebWorker from "web-worker:./worker.ts";
import {
  ClientMessage,
  ClientMessageSet,
  ClientMessageAudioChunk,
  ClientMessageTerminate,
  ClientMessageLoad,
  ClientMessageRemoveRecognizer,
  ModelMessage,
  RecognizerEvent,
  RecognizerMessage,
  ServerMessage,
  ServerMessageLoadResult,
  ClientMessageCreateRecognizer,
} from "./interfaces";
import { Logger } from "./utils/logging";

export class Model extends EventTarget {
  private worker: Worker;
  private _ready: boolean = false;
  private messagePort: MessagePort;
  private logger: Logger = new Logger();

  constructor(private modelUrl: string, logLevel: number = 0) {
    super();
    this.logger.setLogLevel(logLevel);
    this.worker = new WebWorker();
    this.initialize();
  }

  private initialize() {
    this.worker.addEventListener("message", (event) =>
      this.handleMessage(event)
    );

    this.postMessage<ClientMessageSet>(
      {
        action: "set",
        key: "logLevel",
        value: this.logger.getLogLevel()
      }
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
    const message = event.data;
    if (message) {
      if (ModelMessage.isLoadResult(message)) {
        this._ready = message.result;
      }

      this.dispatchEvent(new CustomEvent(message.event, { detail: message }));
    }
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

  public registerPort(port: MessagePort) {
    this.logger.debug(`Registering port ${port}`);
    this.messagePort = port;
    this.messagePort.onmessage = this.forwardMessage.bind(this);
  }

  private forwardMessage(event: MessageEvent<ClientMessage>) {
    const message = event.data;
    if (ClientMessage.isAudioChunkMessage(message)) {
      this.postMessage<ClientMessageAudioChunk>(message, {
        transfer: [message.data.buffer],
      });
    }
  }

  public get ready(): boolean {
    return this._ready;
  }

  public terminate(): void {
    this.postMessage<ClientMessageTerminate>({
      action: "terminate",
    });
    this._ready = false;
  }

  public setLogLevel(level: number) {
    this.logger.setLogLevel(level);
    this.postMessage<ClientMessageSet>(
      {
        action: "set",
        key: "logLevel",
        value: level
      }
    );
  }

  /**
   * KaldiRecognizer anonymous class
   */
  public get KaldiRecognizer() {
    const model = this;
    return class extends EventTarget {
      public id = uuid();
      constructor(sampleRate: number, grammar?: string) {
        super();
        if (!model.ready) {
          throw new Error(
            "Cannot create KaldiRecognizer. Model is either not ready or has been terminated"
          );
        }
        model.postMessage<ClientMessageCreateRecognizer>({
          action: "create",
          recognizerId: this.id,
          sampleRate,
          grammar,
        });
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

      public setWords(words: boolean): void {
        model.postMessage<ClientMessageSet>(
          {
            action: "set",
            recognizerId: this.id,
            key: "words",
            value: words
          }
        );
      }

      public acceptWaveform(buffer: AudioBuffer): void {
        if (buffer.numberOfChannels < 1) {
          throw new Error(`AudioBuffer should contain at least one channel`);
        }

        this.acceptWaveformFloat(buffer.getChannelData(0), buffer.sampleRate);
      }

      public acceptWaveformFloat(buffer: Float32Array, sampleRate: number): void {
        // AudioBuffer samples are represented as floating point numbers between -1.0 and 1.0 whilst
        // Kaldi expects them to be between -32768 and 32767 (the range of a signed int16)
        // Should this be handled by the library (better in the C codebase) or left to the end-user to decide?
        const data = buffer.map((value) => value * 0x8000);
        if (!(data instanceof Float32Array)) {
          throw new Error(
            `Channel data is not a Float32Array as expected: ${data}`
          );
        }

        model.logger.debug(`Recognizer (id: ${this.id}): Sending audioChunk 0=${data[0]} ${data.length}=${data[data.length - 1]}`);
        model.postMessage<ClientMessageAudioChunk>(
          {
            action: "audioChunk",
            data,
            recognizerId: this.id,
            sampleRate: sampleRate,
          },
          {
            transfer: [data.buffer],
          }
        );
      }

      public remove(): void {
        model.postMessage<ClientMessageRemoveRecognizer>({
          action: "remove",
          recognizerId: this.id,
        });
      }
    };
  }
}

export type KaldiRecognizer = InstanceType<Model["KaldiRecognizer"]>;

export async function createModel(modelUrl: string, logLevel: number = 0): Promise<Model> {
  const model = new Model(modelUrl, logLevel);

  return new Promise((resolve, reject) =>
    model.on("load", (message: any) => {
      if (message.result) {
        resolve(model);
      }
      reject();
    })
  );
}
