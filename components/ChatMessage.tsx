import React from 'react';
import { Message, MessageRole, MessageType } from '../types';
import { User, Bot, AlertCircle } from 'lucide-react';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === MessageRole.User;
  const isError = message.type === MessageType.Error;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[70%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-indigo-600 text-white' : isError ? 'bg-red-100 text-red-600' : 'bg-emerald-600 text-white'
        }`}>
          {isUser ? <User size={16} /> : isError ? <AlertCircle size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
          <div className={`px-4 py-3 rounded-2xl shadow-sm overflow-hidden ${
            isUser 
              ? 'bg-indigo-600 text-white rounded-tr-sm' 
              : isError
                ? 'bg-red-50 text-red-800 border border-red-200 rounded-tl-sm'
                : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
          }`}>
            
            {message.type === MessageType.Image ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs opacity-70 mb-1 block">Generated Image</span>
                <img 
                  src={`data:image/png;base64,${message.content}`} 
                  alt="Gemini Generated" 
                  className="max-w-full h-auto rounded-lg border border-white/20"
                  loading="lazy"
                />
              </div>
            ) : (
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {message.content}
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 ml-1 align-middle bg-current animate-pulse"/>
                )}
              </p>
            )}
          </div>
          <span className="text-xs text-slate-400 mt-1 px-1">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </div>
  );
};