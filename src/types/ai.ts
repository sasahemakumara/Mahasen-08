export type AITone = "Professional" | "Friendly" | "Empathetic" | "Playful";

export interface AISettings {
  id: number;
  tone: AITone;
  behaviour: string | null;
  created_at: string;
  updated_at: string;
}