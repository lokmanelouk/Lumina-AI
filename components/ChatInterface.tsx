import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, ShoppingBag, ExternalLink, Bot } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isProcessing: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, onSendMessage, isProcessing }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isProcessing) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-xl shadow-lg border border-slate-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
        <Bot className="text-indigo-600" size={20} />
        <h3 className="font-semibold text-slate-800">Design Consultant</h3>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 mt-8">
            <Sparkles className="mx-auto mb-2 opacity-50" size={32} />
            <p>Ask me to refine the design or find products!</p>
            <p className="text-sm mt-2">"Where can I buy that rug?"</p>
            <p className="text-sm">"Make the walls sage green."</p>
          </div>
        )}
        
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white rounded-tr-sm'
                  : 'bg-slate-100 text-slate-800 rounded-tl-sm'
              }`}
            >
              {msg.text}
            </div>

            {/* Grounding/Product Links */}
            {msg.groundingUrls && msg.groundingUrls.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2 max-w-[85%]">
                {msg.groundingUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-100"
                  >
                    <ShoppingBag size={12} />
                    <span className="truncate max-w-[150px]">{url.title || 'Product Link'}</span>
                    <ExternalLink size={10} />
                  </a>
                ))}
              </div>
            )}
            
            <span className="text-[10px] text-slate-400 mt-1 px-1">
              {msg.role === 'user' ? 'You' : 'AI Consultant'}
            </span>
          </div>
        ))}
        {isProcessing && (
          <div className="flex items-start">
             <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-tl-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-100"></div>
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-200"></div>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-slate-100 bg-slate-50">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm shadow-sm"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={!input.trim() || isProcessing}
            className="absolute right-2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
};