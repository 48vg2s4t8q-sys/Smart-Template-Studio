
import * as React from 'react';
import { clsx } from 'clsx';
import { ChatMessage } from '../../types';
import { Bot, User, AlertCircle } from 'lucide-react';

export const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={clsx(
      "flex w-full mb-4",
      isUser ? "justify-end" : "justify-start"
    )}>
      <div className={clsx(
        "flex max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
        isUser ? "bg-indigo-600 text-white rounded-br-none" : "bg-white text-gray-800 border border-gray-200 rounded-bl-none",
        message.isError && "bg-red-50 border-red-200 text-red-700"
      )}>
        <div className="flex gap-3">
          <div className={clsx(
            "mt-0.5 min-w-[20px]", 
            isUser ? "text-indigo-200" : "text-indigo-600"
          )}>
            {isUser ? <User size={18} /> : message.isError ? <AlertCircle size={18} /> : <Bot size={18} />}
          </div>
          <div className="whitespace-pre-wrap">
            {message.text || (
                <span className="italic opacity-75">
                    {isUser ? "..." : "Performing actions..."}
                </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
