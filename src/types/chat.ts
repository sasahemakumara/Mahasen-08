export interface WhatsAppMessage {
  to: string;
  message: string;
  type: string;
  useAI?: boolean;
  context?: string;
}