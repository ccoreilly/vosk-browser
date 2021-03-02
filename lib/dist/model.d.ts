import { ModelMessage, RecognizerEvent, RecognizerMessage } from "./interfaces";
export declare class Model extends EventTarget {
    private modelUrl;
    private worker;
    private _ready;
    constructor(modelUrl: string);
    private initialize;
    private postMessage;
    private handleMessage;
    on(event: ModelMessage["event"], listener: (message: ModelMessage) => void): void;
    get ready(): boolean;
    /**
     * KaldiRecognizer anonymous class
     */
    get KaldiRecognizer(): {
        new (): {
            id: string;
            on(event: RecognizerEvent, listener: (message: RecognizerMessage) => void): void;
            acceptWaveform(buffer: AudioBuffer): void;
            addEventListener(type: string, listener: EventListener | EventListenerObject | null, options?: boolean | AddEventListenerOptions | undefined): void;
            dispatchEvent(event: Event): boolean;
            removeEventListener(type: string, callback: EventListener | EventListenerObject | null, options?: boolean | EventListenerOptions | undefined): void;
        };
    };
}
export declare type KaldiRecognizer = InstanceType<Model["KaldiRecognizer"]>;
export declare function createModel(modelUrl: string): Promise<Model>;
