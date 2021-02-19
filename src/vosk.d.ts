declare module "vosk-wasm" {
  export class Model {
    constructor(path: string);
  }

  export class KaldiRecognizer {
    constructor(model: Model, sampleRate: number);
    public AcceptWaveform(address: number, length: number): void;
  }
  export interface Vosk {
    FS: {
      mkdir: (dirName: string) => void;
      mount: (fs: any, opts: any, path: string) => void;
    };
    MEMFS: Record<string, any>;
    IDBFS: Record<string, any>;
    WORKERFS: Record<string, any>;
    downloadAndExtract: (url: string, localPath: string) => void;
    syncFilesystem: (fromPersistent: boolean) => void;
    Model;
  }
  export default function LoadVosk(): Promise<Vosk>;
}
