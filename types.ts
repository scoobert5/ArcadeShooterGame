export enum MessageRole {
  User = 'user',
  Model = 'model',
  System = 'system'
}

export enum MessageType {
  Text = 'text',
  Image = 'image',
  Error = 'error'
}

export interface Message {
  id: string;
  role: MessageRole;
  type: MessageType;
  content: string; // Text content or Base64 image data
  timestamp: number;
  isStreaming?: boolean;
}

export interface GenerationConfig {
  mode: 'text' | 'image';
}