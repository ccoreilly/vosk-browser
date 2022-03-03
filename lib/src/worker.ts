import LoadVosk, { Vosk, KaldiRecognizer, Model } from "./vosk-wasm";

import {
  ClientMessage,
  ClientMessageAudioChunk,
  ClientMessageSet,
  ClientMessageCreateRecognizer,
} from "./interfaces";
import { Logger } from "./utils/logging";

const ctx: Worker = self as any;

export interface Recognizer {
  id: string;
  buffAddr?: number;
  buffSize?: number;
  kaldiRecognizer: KaldiRecognizer;
  sampleRate: number;
  words?: boolean;
  grammar?: string;
}
export class RecognizerWorker {
  private Vosk: Vosk;
  private model: Model;
  private recognizers = new Map<string, Recognizer>();
  private logger = new Logger();

  constructor() {
    ctx.addEventListener("message", (event) => this.handleMessage(event));
  }

  private handleMessage(event: MessageEvent<ClientMessage>) {
    const message = event.data;

    if (!message) {
      return;
    }
    
    this.logger.debug(JSON.stringify(message));

    if (ClientMessage.isLoadMessage(message)) {
      const { modelUrl } = message;

      if (!modelUrl) {
        ctx.postMessage({
          error: "Missing modelUrl parameter",
        });
      }

      this.load(modelUrl)
        .then((result) => {
          ctx.postMessage({ event: "load", result });
        })
        .catch((error) => {
          this.logger.error(error);
          ctx.postMessage({ error: error.message });
        });

      return;
    }

    if (ClientMessage.isSetMessage(message)) {
      this.setConfiguration(message);
      return;
    }

    if (ClientMessage.isAudioChunkMessage(message)) {
      this.processAudioChunk(message)
        .then((result) => {
          ctx.postMessage(result);
        })
        .catch((error) => ctx.postMessage({ event: "error", error }));
      return;
    }

    if (ClientMessage.isRecognizerRemoveMessage(message)) {
      this.removeRecognizer(message.recognizerId)
        .then((result) => {
          ctx.postMessage(result);
        })
        .catch((error) => ctx.postMessage({ event: "error", error }));
      return;
    }

    if (ClientMessage.isRecognizerCreateMessage(message)) {
      this.createRecognizer(message)
        .then((result) => {
          ctx.postMessage(result);
        })
        .catch((error) => ctx.postMessage({ event: "error", error }));
      return;
    }

    if (ClientMessage.isTerminateMessage(message)) {
      this.terminate();
      return;
    }

    ctx.postMessage({ error: `Unknown message ${JSON.stringify(message)}` });
  }

  private async load(modelUrl: string): Promise<boolean> {
    const storagePath = "/vosk";
    const modelPath = storagePath + "/" + modelUrl.replace(/[\W]/g, "_");
    return new Promise((resolve, reject) =>
      LoadVosk()
        .then((loaded: any) => {
          this.Vosk = loaded;
          resolve(true);
        })
        .catch((e) => {
          this.logger.error(e);
        })
    )
      .then(() => {
        this.Vosk.SetLogLevel(this.logger.getLogLevel());
        this.logger.verbose("Setting up persistent storage at " + storagePath);
        this.Vosk.FS.mkdir(storagePath);
        this.Vosk.FS.mount(this.Vosk.IDBFS, {}, storagePath);
        return this.Vosk.syncFilesystem(true);
      })
      .then(() => {
        // TODO parse Url
        const fullModelUrl = new URL(
          modelUrl,
          location.href.replace(/^blob:/, "")
        );
        this.logger.verbose(`Downloading ${fullModelUrl} to ${modelPath}`);
        return this.Vosk.downloadAndExtract(fullModelUrl.toString(), modelPath);
      })
      .then(() => {
        this.logger.verbose(`Syncing filesystem`);

        return this.Vosk.syncFilesystem(false);
      })
      .then(() => {
        this.logger.verbose(`Creating model`);
        this.model = new this.Vosk.Model(modelPath);
        this.logger.verbose(`Model created`);
      })
      .then(() => {
        return true;
      });
  }

  private allocateBuffer(size: number, recognizer: Recognizer) {
    if (recognizer.buffAddr != null && recognizer.buffSize === size) {
      return;
    }
    this.freeBuffer(recognizer);
    recognizer.buffAddr = this.Vosk._malloc(size);
    recognizer.buffSize = size;
    this.logger.debug(
      `Recognizer (id: ${recognizer.id}): allocated buffer of ${recognizer.buffSize} bytes`
    );
  }

  private freeBuffer(recognizer: Recognizer) {
    if (recognizer.buffAddr == null) {
      return;
    }
    this.Vosk._free(recognizer.buffAddr);
    this.logger.debug(
      `Recognizer (id: ${recognizer.id}): freed buffer of ${recognizer.buffSize} bytes`
    );
    recognizer.buffAddr = undefined;
    recognizer.buffSize = undefined;
  }

  private async createRecognizer({
    recognizerId,
    sampleRate,
    grammar,
  }: ClientMessageCreateRecognizer) {
    this.logger.verbose(
      `Creating recognizer (id: ${recognizerId}) with sample rate ${sampleRate} and grammar ${grammar}`
    );
    try {
      let kaldiRecognizer: KaldiRecognizer;
      if (grammar) {
        kaldiRecognizer = new this.Vosk.KaldiRecognizer(
          this.model,
          sampleRate,
          grammar
        );
      } else {
        kaldiRecognizer = new this.Vosk.KaldiRecognizer(this.model, sampleRate);
      }

      this.recognizers.set(recognizerId, {
        id: recognizerId,
        kaldiRecognizer,
        sampleRate,
        grammar,
      });
    } catch (error) {
      const errorMsg = `Recognizer (id: ${recognizerId}): Could not be created due to: ${error}\n${(error as Error)?.stack}`;
      this.logger.error(errorMsg);
      return {
        error: errorMsg,
      };
    }
  }

  private async setConfiguration(message: ClientMessageSet) {
    const { key } = message;
    
    switch (key) {
      case "words":
        const { recognizerId, value } = message;
        this.logger.verbose(`Recognizer (id: ${recognizerId}): set ${key} to ${value}`);
    
        if (!this.recognizers.has(recognizerId)) {
          this.logger.warn(`Recognizer not ready, ignoring`);
          return;
        }
    
        const recognizer = this.recognizers.get(recognizerId)!;
        recognizer.words = value;
        recognizer.kaldiRecognizer.SetWords(value);
        break;
      case "logLevel":
        const level = message.value;
        this.logger.verbose(`Set ${key} to ${level}`);
        if (this.Vosk) {
          this.Vosk.SetLogLevel(level);
        }
        this.logger.setLogLevel(level);
        break;
      default:
        this.logger.warn(`Unrecognized key ${key}`);
    }
  }

  private async processAudioChunk({
    recognizerId,
    data,
    sampleRate,
  }: ClientMessageAudioChunk) {
    this.logger.debug(
      `Recognizer (id: ${recognizerId}): process audio chunk with sampleRate ${sampleRate}`
    );

    if (!this.recognizers.has(recognizerId)) {
      this.logger.warn(`Recognizer not ready, ignoring`);
      return {
        error: `Recognizer (id: ${recognizerId}): Not ready`,
      };
    }

    let recognizer = this.recognizers.get(recognizerId)!;

    if (recognizer.sampleRate !== sampleRate) {
      this.logger.warn(
        `Recognizer (id: ${recognizerId}) was created with sampleRate ${recognizer.sampleRate} but audio chunk with sampleRate ${sampleRate} was received! Recreating recognizer...`
      );

      await this.createRecognizer({
        action: "create",
        recognizerId,
        sampleRate,
        grammar: recognizer.grammar,
      });

      const newRecognizer = this.recognizers.get(recognizerId)!;
      if (recognizer.words) {
        newRecognizer.words = true;
        newRecognizer.kaldiRecognizer.SetWords(true);
      }
      recognizer = newRecognizer;
    }

    const requiredSize = data.length * data.BYTES_PER_ELEMENT;
    this.allocateBuffer(requiredSize, recognizer);
    if (recognizer.buffAddr == null) {
      const error = `Recognizer (id: ${recognizer.id}): Could not allocate buffer`;
      this.logger.error(error);
      return {
        error
      };
    }

    this.Vosk.HEAPF32.set(data, recognizer.buffAddr / data.BYTES_PER_ELEMENT);
    let json;
    if (
      recognizer.kaldiRecognizer.AcceptWaveform(
        recognizer.buffAddr,
        data.length
      )
    ) {
      json = recognizer.kaldiRecognizer.Result();

      return {
        event: "result",
        recognizerId: recognizer.id,
        result: JSON.parse(json),
      };
    } else {
      json = recognizer.kaldiRecognizer.PartialResult();
      return {
        event: "partialresult",
        recognizerId: recognizer.id,
        result: JSON.parse(json),
      };
    }
  }

  private async removeRecognizer(recognizerId: string) {
    if (!this.recognizers.has(recognizerId)) {
      throw new Error(
        `Recognizer (id: ${recognizerId}): Does not exist or has already been deleted`
      );
    }

    const recognizer = this.recognizers.get(recognizerId)!;
    const finalResult = recognizer.kaldiRecognizer.FinalResult();
    this.freeBuffer(recognizer);
    recognizer.kaldiRecognizer.delete();
    this.recognizers.delete(recognizerId);

    return {
      event: "result",
      recognizerId,
      result: JSON.parse(finalResult),
    };
  }

  private async terminate() {
    for (const recognizer of this.recognizers.values()) {
      await this.removeRecognizer(recognizer.id);
    }
    this.model.delete();
    close();
  }
}

new RecognizerWorker();
