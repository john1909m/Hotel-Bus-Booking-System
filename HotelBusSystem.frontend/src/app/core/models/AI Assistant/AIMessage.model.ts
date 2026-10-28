export interface AiMessageDto {
  role: 'user' | 'assistant' | 'system' | string;
  text: string;
}

