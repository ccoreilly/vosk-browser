export interface ClientMessageLoad {
    action: "load";
    modelUrl: string;
}
export interface ClientMessageAudioChunk {
    action: "audioChunk";
    recognizerId: string;
    data: Float32Array;
    sampleRate: number;
}
export declare type ClientMessage = ClientMessageLoad | ClientMessageAudioChunk;
export declare namespace ClientMessage {
    function isLoadMessage(message: ClientMessage): message is ClientMessageLoad;
    function isAudioChunkMessage(message: ClientMessage): message is ClientMessageAudioChunk;
}
export interface ServerMessageLoadResult {
    event: "load";
    result: boolean;
}
export interface ServerMessageError {
    event: "error";
    error: string;
}
export interface ServerMessageResult {
    event: "result";
    result: {
        text: string;
    };
}
export interface ServerMessagePartialResult {
    event: "partialresult";
    result: {
        partial: string;
    };
}
export declare type ModelMessage = ServerMessageLoadResult | ServerMessageError;
export declare type RecognizerMessage = ServerMessagePartialResult | ServerMessageResult;
export declare type RecognizerEvent = RecognizerMessage["event"];
export declare type ServerMessage = ServerMessageLoadResult | ServerMessageError | ServerMessageResult | ServerMessagePartialResult;
export declare namespace ServerMessage {
    function isRecognizerMessage(message: ServerMessage): boolean;
    function isResult(message: any): message is ServerMessageResult;
    function isPartialResult(message: any): message is ServerMessagePartialResult;
}
