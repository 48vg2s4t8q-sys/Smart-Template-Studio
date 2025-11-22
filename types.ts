
export type BlockType = 'text' | 'image' | 'container' | 'columns';

export interface BlockStyle {
  padding?: string;
  margin?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  borderRadius?: string;
}

export interface EditorBlock {
  id: string;
  type: BlockType;
  content: string; // HTML for text, URL for image. Ignored for columns.
  styles?: BlockStyle;
  // Nested structure for column layouts
  columns?: {
    id: string;
    blocks: EditorBlock[];
  }[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model' | 'system';
  text?: string;
  isError?: boolean;
  timestamp: number;
}

export interface AIState {
  isLoading: boolean;
  messages: ChatMessage[];
}

export interface InsertTextArgs {
  blockId?: string;
  text: string;
  position?: number;
}

export interface UpdateBlockArgs {
  blockId: string;
  content: string;
}

export interface ApplyFormattingArgs {
  blockId: string;
  styles: BlockStyle;
}

export interface MoveBlockArgs {
  blockId: string;
  destinationIndex: number;
}

export interface CreateBlockArgs {
  type: BlockType;
  content: string;
  position?: number;
  columns?: number; // For AI to specify column count
}

export interface DeleteBlockArgs {
  blockId: string;
}
