import LoadVosk, { Vosk } from "vosk-wasm";

import { ClientMessage } from "./interfaces";

const ctx: Worker = self as any;

export class RecognizerWorker {
  private Vosk!: Vosk;

  constructor() {
    this.initialize();
  }

  private initialize() {
    console.log("initializing");
    ctx.addEventListener("message", (event) => this.handleMessage(event));
    ctx.postMessage("ready");
    console.log("initialized");
  }

  private handleMessage(event: MessageEvent<ClientMessage>) {
    console.log(JSON.stringify(event.data));
    let { method, params, messageId } = event.data;
    try {
      switch (method) {
        case "load": {
          if (params.length === 1 && typeof params[0] === "string") {
            this.load(params[0])
              .then((result) => {
                ctx.postMessage({ messageId, result });
              })
              .catch((error) => ctx.postMessage({ messageId, error }));
          } else {
            ctx.postMessage({
              error: "Missing 1 positional parameter: model URL",
            });
          }
        }
      }
    } catch (error) {
      ctx.postMessage({ error, messageId });
    }
  }

  private async load(modelUrl: string) {
    console.log("here");
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
        console.log(location.href);
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
        const model = new this.Vosk.Model(modelPath);
        console.debug(`RecognizerWorker: new Model()`);
      })
      .then(() => {
        return true;
      })
      .catch(console.error);
  }
}

new RecognizerWorker();
