export declare class Model {
  constructor(path: string);
  public delete(): void;
}

export declare class KaldiRecognizer {
  constructor(model: Model, sampleRate: number);
  constructor(model: Model, sampleRate: number, grammar: string);
  public SetWords(words: boolean): void;
  public AcceptWaveform(address: number, length: number): boolean;
  public Result(): string;
  public PartialResult(): string;
  public FinalResult(): string;
  public delete(): void;
}
export declare interface Vosk {
  FS: {
    mkdir: (dirName: string) => void;
    mount: (fs: any, opts: any, path: string) => void;
  };
  MEMFS: Record<string, any>;
  IDBFS: Record<string, any>;
  WORKERFS: Record<string, any>;
  HEAPF32: any;
  downloadAndExtract: (url: string, localPath: string) => void;
  syncFilesystem: (fromPersistent: boolean) => void;
  Model;
  KaldiRecognizer;
  _malloc: (size: number) => number;
  _free: (buffer: number) => void;
}
export default function LoadVosk(): Promise<Vosk>;
