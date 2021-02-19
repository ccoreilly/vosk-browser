import { v4 as uuid } from "uuid";

import WebWorker from "web-worker:./worker.ts";
import { ServerMessage } from "./interfaces";

export class Model {
  private worker: Worker;
  private inflightMessages = new Map();

  constructor(private modelUrl: string) {
    this.worker = new WebWorker();
    this.initialize();
    this.worker.postMessage({ method: "load", params: [this.modelUrl] });
  }

  private initialize() {
    this.worker.addEventListener("message", (event) =>
      this.handleMessage(event)
    );
  }

  private handleMessage(event: MessageEvent<ServerMessage>) {
    console.debug(JSON.stringify(event.data));
    const { messageId, result, error } = event.data;
  }

  public async createRecognizer(sampleRate: number): Promise<string> {
    const messageId = uuid();
    this.worker.postMessage({
      messageId,
      method: "createRecognizer",
      params: [sampleRate],
    });
    return new Promise((resolve, reject) =>
      this.inflightMessages.set(messageId, [resolve, reject])
    );
  }
}
