
import * as React from 'react';
import { Send, Sparkles, Loader2 } from 'lucide-react';
import { EditorBlock, ChatMessage, CreateBlockArgs, UpdateBlockArgs, ApplyFormattingArgs, MoveBlockArgs, DeleteBlockArgs } from '../../types';
import { ChatBubble } from './ChatBubble';
import { geminiService } from '../../services/geminiService';
import { generateId } from '../../utils';
import { GenerateContentResponse, FunctionCall } from '@google/genai';

const { useState, useRef, useEffect } = React;

interface AssistantPaneProps {
  blocks: EditorBlock[];
  setBlocks: React.Dispatch<React.SetStateAction<EditorBlock[]>>;
}

export const AssistantPane: React.FC<AssistantPaneProps> = ({ blocks, setBlocks }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: 'Hello! I am your creative assistant. I can write text, find images, layout your document, or fix styles. How can I help you today?',
      timestamp: Date.now()
    }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFunctionCall = (fc: FunctionCall) => {
    console.log("Executing Function:", fc.name, fc.args);
    
    switch (fc.name) {
      case 'createBlock': {
        const args = fc.args as unknown as CreateBlockArgs;
        const newBlock: EditorBlock = {
          id: generateId(),
          type: args.type,
          content: args.content,
          styles: { padding: '1rem' } // default style
        };
        setBlocks(prev => {
           const next = [...prev];
           if (args.position !== undefined && args.position >= 0) {
             next.splice(args.position, 0, newBlock);
             return next;
           }
           return [...prev, newBlock];
        });
        break;
      }
      case 'updateBlock': {
        const args = fc.args as unknown as UpdateBlockArgs;
        setBlocks(prev => prev.map(b => b.id === args.blockId ? { ...b, content: args.content } : b));
        break;
      }
      case 'applyFormatting': {
        const args = fc.args as unknown as ApplyFormattingArgs;
        setBlocks(prev => prev.map(b => b.id === args.blockId ? { ...b, styles: { ...b.styles, ...args.styles } } : b));
        break;
      }
      case 'moveBlock': {
        const args = fc.args as unknown as MoveBlockArgs;
        setBlocks(prev => {
          const index = prev.findIndex(b => b.id === args.blockId);
          if (index === -1) return prev;
          const newBlocks = [...prev];
          const [movedBlock] = newBlocks.splice(index, 1);
          newBlocks.splice(args.destinationIndex, 0, movedBlock);
          return newBlocks;
        });
        break;
      }
      case 'deleteBlock': {
        const args = fc.args as unknown as DeleteBlockArgs;
        setBlocks(prev => prev.filter(b => b.id !== args.blockId));
        break;
      }
    }
    return { result: "Action completed successfully" };
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: generateId(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Convert chat history to Gemini format
      const historyForApi = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text || '' }]
      }));

      // In @google/genai, sendMessage returns Promise<GenerateContentResponse> directly
      const response = await geminiService.sendMessage(historyForApi, userMsg.text || '', blocks);

      // Handle Text Response
      const text = response.text;
      
      // Handle Function Calls
      const functionCalls = response.functionCalls;
      
      if (functionCalls && functionCalls.length > 0) {
        for (const fc of functionCalls) {
          handleFunctionCall(fc);
        }
      }

      const aiMsg: ChatMessage = {
        id: generateId(),
        role: 'model',
        text: text || (functionCalls?.length ? "I've updated the document as requested." : "I'm not sure how to do that."),
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, {
        id: generateId(),
        role: 'model',
        text: "I encountered an error processing your request. Please check your API key or try again.",
        isError: true,
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200 shadow-xl z-20">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex items-center gap-2">
        <Sparkles className="text-indigo-600" size={20} />
        <h2 className="font-semibold text-gray-800">AI Assistant</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4 bg-gray-50/50">
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} />
        ))}
        {isLoading && (
           <div className="flex justify-start mb-4">
              <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-none p-4 shadow-sm">
                 <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Loader2 className="animate-spin" size={16} />
                    <span>Thinking...</span>
                 </div>
              </div>
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-200">
        <div className="relative">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask to create content, fix layout, or style..."
            className="w-full pr-12 pl-4 py-3 bg-gray-100 border-0 rounded-xl resize-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm min-h-[50px] max-h-[150px]"
            rows={1}
            style={{ height: '50px' }}
          />
          <button
            onClick={sendMessage}
            disabled={isLoading || !input.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="text-xs text-center mt-2 text-gray-400">
          Powered by Gemini 3 Pro Preview
        </div>
      </div>
    </div>
  );
};
