export interface ClientMessage {
  method: string;
  params: string[];
  messageId: string;
}
export interface ServerMessage {
  result: string;
  error: string[];
  messageId: string;
}
