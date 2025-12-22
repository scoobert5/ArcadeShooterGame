import React, { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, MessageSquare, Loader2 } from 'lucide-react';

interface InputAreaProps {
  onSend: (text: string, mode: 'text' | 'image') => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onSend, isLoading }) => {
  const [text, setText] = useState('');
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!text.trim() || isLoading) return;
    onSend(text.trim(), mode);
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-200 bg-white p-4">
      <div className="max-w-3xl mx-auto space-y-3">
        
        {/* Mode Toggles */}
        <div className="flex gap-2">
          <button
            onClick={() => setMode('text')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mode === 'text' 
                ? 'bg-indigo-100 text-indigo-700 ring-1 ring-indigo-500/20' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <MessageSquare size={14} />
            Text Chat
          </button>
          <button
            onClick={() => setMode('image')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              mode === 'image' 
                ? 'bg-purple-100 text-purple-700 ring-1 ring-purple-500/20' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            <ImageIcon size={14} />
            Generate Image
          </button>
        </div>

        {/* Input Field */}
        <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-200 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100 transition-all shadow-sm">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={mode === 'text' ? "Ask Gemini something..." : "Describe an image to generate..."}
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[24px] py-3 px-3 text-slate-800 placeholder-slate-400 text-sm leading-relaxed scrollbar-hide"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!text.trim() || isLoading}
            className={`flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl transition-all ${
              !text.trim() || isLoading
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg active:scale-95'
            }`}
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
        
        <div className="text-center">
          <p className="text-[10px] text-slate-400">
            Gemini may display inaccurate info, including about people, so double-check its responses.
          </p>
        </div>
      </div>
    </div>
  );
};