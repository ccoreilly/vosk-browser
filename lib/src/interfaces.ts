export interface ClientMessageLoad {
  action: "load";
  modelUrl: string;
}

export interface ClientMessageTerminate {
  action: "terminate";
}

export interface ClientMessageRecognizerSetWords {
  action: "set";
  recognizerId: string;
  key: "words";
  value: boolean;
}

export interface ClientMessageRecognizerSetMaxAlternatives {
  action: "set";
  recognizerId: string;
  key: "maxAlternatives";
  value: number;
}

export interface ClientMessageGenericSet {
  action: "set";
  key: "logLevel";
  value: number;
}

export type ClientMessageSet = ClientMessageRecognizerSetWords | ClientMessageRecognizerSetMaxAlternatives | ClientMessageGenericSet;

export interface ClientMessageAudioChunk {
  action: "audioChunk";
  recognizerId: string;
  data: Float32Array;
  sampleRate: number;
}

export interface ClientMessageCreateRecognizer {
  action: "create";
  recognizerId: string;
  sampleRate: number;
  grammar?: string;
}

export interface ClientMessageRetrieveFinalResult {
  action: "retrieveFinalResult";
  recognizerId: string;
}

export interface ClientMessageRemoveRecognizer {
  action: "remove";
  recognizerId: string;
}

export type ClientMessage =
  | ClientMessageTerminate
  | ClientMessageLoad
  | ClientMessageCreateRecognizer
  | ClientMessageAudioChunk
  | ClientMessageSet
  | ClientMessageRetrieveFinalResult
  | ClientMessageRemoveRecognizer;

export namespace ClientMessage {
  export function isTerminateMessage(
    message: ClientMessage
  ): message is ClientMessageTerminate {
    return message?.action === "terminate";
  }

  export function isLoadMessage(
    message: ClientMessage
  ): message is ClientMessageLoad {
    return message?.action === "load";
  }

  export function isSetMessage(
    message: ClientMessage
  ): message is ClientMessageSet {
    return message?.action === "set";
  }

  export function isAudioChunkMessage(
    message: ClientMessage
  ): message is ClientMessageAudioChunk {
    return message?.action === "audioChunk";
  }

  export function isRecognizerCreateMessage(
    message: ClientMessage
  ): message is ClientMessageCreateRecognizer {
    return message?.action === "create";
  }

  export function isRecognizerRetrieveFinalResultMessage(
    message: ClientMessage
  ): message is ClientMessageRetrieveFinalResult {
    return message?.action === "retrieveFinalResult";
  }

  export function isRecognizerRemoveMessage(
    message: ClientMessage
  ): message is ClientMessageRemoveRecognizer {
    return message?.action === "remove";
  }
}

export interface ServerMessageLoadResult {
  event: "load";
  result: boolean;
}

export interface ServerMessageError {
  event: "error";
  recognizerId?: string;
  error: string;
}

export interface ServerMessageResult {
  event: "result";
  recognizerId: string;
  result: {
    result: Array<{
      conf: number;
      start: number;
      end: number;
      word: string;
    }>;
    text: string;
  };
}
export interface ServerMessagePartialResult {
  event: "partialresult";
  recognizerId: string;
  result: {
    partial: string;
  };
}

export type ModelMessage = ServerMessageLoadResult | ServerMessageError;

export namespace ModelMessage {
  export function isLoadResult(
    message: any
  ): message is ServerMessageLoadResult {
    return message?.event === "load";
  }
}
export type RecognizerMessage =
  | ServerMessagePartialResult
  | ServerMessageResult
  | ServerMessageError;

export type RecognizerEvent = RecognizerMessage["event"];

export type ServerMessage = ModelMessage | RecognizerMessage;

export namespace ServerMessage {
  export function isRecognizerMessage(message: ServerMessage): message is RecognizerMessage {
    return ["result", "partialresult"].includes(message.event) || Reflect.has(message, 'recognizerId');
  }

  export function isResult(message: any): message is ServerMessageResult {
    return message?.result?.text != null || message?.result?.result != null;
  }

  export function isPartialResult(
    message: any
  ): message is ServerMessagePartialResult {
    return message?.result?.partial != null;
  }
}
