
import { GoogleGenAI, FunctionDeclaration, Schema, Type, Tool } from "@google/genai";
import { EditorBlock } from "../types";

// Safely retrieve API key handling both node-like and browser environments
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore reference errors
  }
  return '';
};

const API_KEY = getApiKey();

// --- Function Definitions (Schemas) ---

const createBlockParams: Schema = {
  type: Type.OBJECT,
  properties: {
    type: { type: Type.STRING, enum: ["text", "image", "columns"], description: "The type of block to create." },
    content: { type: Type.STRING, description: "HTML content for text, URL for image. Empty for columns." },
    position: { type: Type.NUMBER, description: "The index to insert the block at (0-based)." },
    columns: { type: Type.NUMBER, description: "If type is 'columns', how many columns to create (2-4)." }
  },
  required: ["type", "content"],
};

const updateBlockParams: Schema = {
  type: Type.OBJECT,
  properties: {
    blockId: { type: Type.STRING, description: "The ID of the block to update." },
    content: { type: Type.STRING, description: "The new HTML content or image URL." },
  },
  required: ["blockId", "content"],
};

const applyFormattingParams: Schema = {
  type: Type.OBJECT,
  properties: {
    blockId: { type: Type.STRING, description: "The ID of the block to style." },
    styles: { 
      type: Type.OBJECT, 
      properties: {
        backgroundColor: { type: Type.STRING },
        padding: { type: Type.STRING },
        margin: { type: Type.STRING },
        textAlign: { type: Type.STRING, enum: ["left", "center", "right"] },
        borderRadius: { type: Type.STRING },
      },
      description: "CSS style properties to apply."
    },
  },
  required: ["blockId", "styles"],
};

const moveBlockParams: Schema = {
  type: Type.OBJECT,
  properties: {
    blockId: { type: Type.STRING, description: "The ID of the block to move." },
    destinationIndex: { type: Type.NUMBER, description: "The new 0-based index for the block." },
  },
  required: ["blockId", "destinationIndex"],
};

const deleteBlockParams: Schema = {
  type: Type.OBJECT,
  properties: {
    blockId: { type: Type.STRING, description: "The ID of the block to delete." },
  },
  required: ["blockId"],
};

// --- Tool Definitions ---

const tools: Tool[] = [
  {
    functionDeclarations: [
      { name: "createBlock", description: "Create a new content block. Use type='columns' with columns=N to create layouts.", parameters: createBlockParams },
      { name: "updateBlock", description: "Update text or image content.", parameters: updateBlockParams },
      { name: "applyFormatting", description: "Apply CSS styles to a block.", parameters: applyFormattingParams },
      { name: "moveBlock", description: "Move a block to a new position.", parameters: moveBlockParams },
      { name: "deleteBlock", description: "Remove a block.", parameters: deleteBlockParams },
    ],
  },
];

// --- AI Service Class ---

export class GeminiService {
  private ai: GoogleGenAI;
  private modelId: string = 'gemini-3-pro-preview';

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: API_KEY });
  }

  async sendMessage(
    history: { role: string; parts: { text: string }[] }[],
    message: string,
    currentBlocks: EditorBlock[]
  ) {
    
    // Simplify block structure for context to avoid token limit issues with deep nesting
    const simplifiedBlocks = currentBlocks.map(b => ({
        id: b.id,
        type: b.type,
        content: b.content.substring(0, 100),
        isColumnLayout: !!b.columns,
        columnsCount: b.columns?.length
    }));

    const blockContext = `
CURRENT DOCUMENT STRUCTURE (JSON Summary):
${JSON.stringify(simplifiedBlocks, null, 2)}

INSTRUCTIONS:
You are a co-editor assistant.
1. To create a multi-column layout, call 'createBlock' with type='columns' and set 'columns' to 2 or 3.
2. Text blocks accept HTML.
3. Image blocks accept URLs.
4. If asked to move items, use 'moveBlock'.
5. Always check existing IDs before updating.
    `;

    const chat = this.ai.chats.create({
      model: this.modelId,
      config: {
        systemInstruction: "You are a helpful AI assistant for a WYSIWYG editor.",
        tools: tools,
      },
      history: [
         ...history.map(h => ({ 
             role: h.role, 
             parts: h.parts.map(p => ({ text: p.text })) 
         }))
      ]
    });

    const fullMessage = `${blockContext}\n\nUser Request: ${message}`;

    try {
      const result = await chat.sendMessage({ message: fullMessage });
      return result;
    } catch (error) {
      console.error("Gemini API Error:", error);
      throw error;
    }
  }
}

export const geminiService = new GeminiService();
