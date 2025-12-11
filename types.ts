export interface RoomImage {
  id: string;
  url: string; // Base64 data URL
  styleName: string; // e.g., "Original", "Mid-Century", "User Edit"
  description?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  groundingUrls?: Array<{uri: string, title: string}>;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  GENERATING = 'GENERATING',
  EDITING = 'EDITING',
  ERROR = 'ERROR'
}

export interface StylePreset {
  id: string;
  name: string;
  prompt: string;
  thumbnailColor: string;
}