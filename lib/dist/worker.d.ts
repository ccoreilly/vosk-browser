import { KaldiRecognizer } from "vosk-wasm";
export interface Recognizer {
    id: string;
    buffAddr?: number;
    buffSize?: number;
    kaldiRecognizer: KaldiRecognizer;
}
export declare class RecognizerWorker {
    private Vosk;
    private model;
    private recognizers;
    constructor();
    private handleMessage;
    private load;
    private allocateBuffer;
    private freeBuffer;
    private processAudioChunk;
}
