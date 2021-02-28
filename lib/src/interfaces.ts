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

export type ClientMessage = ClientMessageLoad | ClientMessageAudioChunk;

export namespace ClientMessage {
  export function isLoadMessage(
    message: ClientMessage
  ): message is ClientMessageLoad {
    return message.action === "load";
  }

  export function isAudioChunkMessage(
    message: ClientMessage
  ): message is ClientMessageAudioChunk {
    return message.action === "audioChunk";
  }
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

export type ModelMessage = ServerMessageLoadResult | ServerMessageError;

export type RecognizerMessage =
  | ServerMessagePartialResult
  | ServerMessageResult;

export type RecognizerEvent = RecognizerMessage["event"];

export type ServerMessage =
  | ServerMessageLoadResult
  | ServerMessageError
  | ServerMessageResult
  | ServerMessagePartialResult;

export namespace ServerMessage {
  export function isRecognizerMessage(message: ServerMessage): boolean {
    return ["result", "partialresult"].includes(message.event);
  }

  export function isResult(message: any): message is ServerMessageResult {
    return message?.result?.text != null;
  }

  export function isPartialResult(
    message: any
  ): message is ServerMessagePartialResult {
    return message?.result?.partial != null;
  }
}
