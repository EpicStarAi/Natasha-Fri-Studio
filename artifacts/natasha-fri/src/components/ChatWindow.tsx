import React, { useState, useRef, useEffect } from 'react';
import { Minus, X, Bot, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from './AppStateProvider';
import { WindowData } from '@/data/windows';
import { useChat } from '@workspace/api-client-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatWindowProps {
  window: WindowData;
  scale: number;
  isTop: boolean;
  onUpdate: (id: string, updates: Partial<WindowData>) => void;
  onBringToFront: (id: string) => void;
  className?: string;
}

export function ChatWindow({
  window: w,
  scale,
  isTop,
  onUpdate,
  onBringToFront,
  className,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: 'Привет! Я AI-ассистент Наташи Фри. Задайте мне вопрос об экономике, политике или медиа.',
    },
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { mutate: sendChat, isPending } = useChat();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onBringToFront(w.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialX = w.defaultX;
    const initialY = w.defaultY;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      onUpdate(w.id, { defaultX: initialX + deltaX, defaultY: initialY + deltaY });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    onBringToFront(w.id);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = w.width;
    const initialH = w.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      onUpdate(w.id, {
        width: Math.max(320, initialW + deltaX),
        height: Math.max(300, initialH + deltaY),
      });
    };

    const handlePointerUp = () => {
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text || isPending) return;

    const updated: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');

    sendChat(
      { data: { messages: updated } },
      {
        onSuccess: (res) => {
          setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]);
        },
        onError: () => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: 'Произошла ошибка. Попробуйте снова.' },
          ]);
        },
      },
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const zIndex = isTop ? 50 : 10;

  return (
    <div
      className={cn(
        'absolute flex flex-col bg-card/90 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]',
        className,
      )}
      style={{
        transform: `translate(${w.defaultX}px, ${w.defaultY}px)`,
        width: `${w.width}px`,
        height: `${w.height}px`,
        zIndex,
        borderLeft: '1px solid hsl(var(--primary))',
      }}
      onPointerDown={() => onBringToFront(w.id)}
    >
      {/* Title bar */}
      <div
        className="h-9 bg-black/60 flex items-center px-3 justify-between cursor-move shrink-0 border-b border-white/5 select-none"
        onPointerDown={handlePointerDownDrag}
      >
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
          <Bot className="w-3 h-3 text-primary" />
          <span>{w.title}</span>
        </div>
        <div className="flex gap-2 shrink-0 ml-2">
          <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors" />
          <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors" />
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden no-scrollbar bg-[#0a0a0c] p-4 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
          >
            <div
              className={cn(
                'max-w-[85%] px-3 py-2 text-sm leading-relaxed',
                msg.role === 'user'
                  ? 'bg-primary/20 border border-primary/30 text-white'
                  : 'bg-white/5 border border-white/10 text-muted-foreground',
              )}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {isPending && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 px-3 py-2 flex items-center gap-2 text-muted-foreground">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span className="text-xs font-mono">Claude думает…</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 border-t border-white/5 bg-black/40 flex items-end gap-2 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Задайте вопрос…"
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-5 max-h-24 overflow-y-auto"
          style={{ scrollbarWidth: 'none' }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isPending}
          className="shrink-0 w-7 h-7 flex items-center justify-center text-primary hover:text-white hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize flex items-end justify-end p-1 z-20"
        onPointerDown={handlePointerDownResize}
      >
        <div className="w-2 h-2 border-r-2 border-b-2 border-muted-foreground/30 pointer-events-none" />
      </div>
    </div>
  );
}
