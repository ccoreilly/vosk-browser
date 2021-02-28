import LoadVosk, { Vosk, KaldiRecognizer, Model } from "vosk-wasm";

import { ClientMessage, ClientMessageAudioChunk } from "./interfaces";

const ctx: Worker = self as any;

export interface Recognizer {
  id: string;
  buffAddr?: number;
  buffSize?: number;
  kaldiRecognizer: KaldiRecognizer;
}
export class RecognizerWorker {
  private Vosk: Vosk;
  private model: Model;
  private recognizers = new Map<string, Recognizer>();

  constructor() {
    ctx.addEventListener("message", (event) => this.handleMessage(event));
  }

  private handleMessage(event: MessageEvent<ClientMessage>) {
    const message = event.data;

    if (ClientMessage.isLoadMessage(message)) {
      console.debug(JSON.stringify(message));
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
        .catch((error) => ctx.postMessage({ error }));

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

    ctx.postMessage({ error: `Unknown message ${JSON.stringify(message)}` });
  }

  private async load(modelUrl: string) {
    const storagePath = "/vosk";
    const modelPath = storagePath + "/" + modelUrl.replace(/[\W]/g, "_");
    return new Promise((resolve, reject) =>
      LoadVosk().then((loaded: any) => {
        this.Vosk = loaded;
        resolve(true);
      })
    )
      .then(() => {
        console.debug("Setting up persistent storage at " + storagePath);
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
        console.debug(`Downloading ${fullModelUrl} to ${modelPath}`);
        return this.Vosk.downloadAndExtract(fullModelUrl.toString(), modelPath);
      })
      .then(() => {
        console.debug(`Syncing filesystem`);

        return this.Vosk.syncFilesystem(false);
      })
      .then(() => {
        console.debug(`Creating model`);
        this.model = new this.Vosk.Model(modelPath);
        console.debug(`RecognizerWorker: new Model()`);
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
    console.debug(
      `Recognizer (id: ${recognizer.id}): allocated buffer of ${recognizer.buffSize} bytes`
    );
  }

  private freeBuffer(recognizer: Recognizer) {
    if (recognizer.buffAddr == null) {
      return;
    }
    this.Vosk._free(recognizer.buffAddr);
    console.debug(
      `Recognizer (id: ${recognizer.id}): freed buffer of ${recognizer.buffSize} bytes`
    );
    recognizer.buffAddr = undefined;
    recognizer.buffSize = undefined;
  }

  private async processAudioChunk({
    recognizerId,
    data,
    sampleRate,
  }: ClientMessageAudioChunk) {
    if (!this.recognizers.has(recognizerId)) {
      this.recognizers.set(recognizerId, {
        id: recognizerId,
        kaldiRecognizer: new this.Vosk.KaldiRecognizer(this.model, sampleRate),
      });
    }

    const recognizer = this.recognizers.get(recognizerId)!;

    const requiredSize = data.length * data.BYTES_PER_ELEMENT;
    this.allocateBuffer(requiredSize, recognizer);
    if (recognizer.buffAddr == null) {
      return {
        error: `Recognizer (id: ${recognizer.id}): Could not allocate buffer`,
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
}

new RecognizerWorker();
