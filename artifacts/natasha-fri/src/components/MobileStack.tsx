import React, { useState } from 'react';
import { initialWindows } from '@/data/windows';
import { useAppState } from './AppStateProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lock, FileText, ChevronDown, Bot, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import natashaHero from '@assets/natasha-hero.jpg';
import { useChat } from '@workspace/api-client-react';

interface ChatMsg { role: 'user' | 'assistant'; content: string }

function MobileChatCard() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: 'assistant', content: 'Привет! Я AI-ассистент Наташи Фри. Задайте вопрос.' },
  ]);
  const [input, setInput] = useState('');
  const { mutate: sendChat, isPending } = useChat();

  const handleSend = () => {
    const text = input.trim();
    if (!text || isPending) return;
    const updated: ChatMsg[] = [...messages, { role: 'user', content: text }];
    setMessages(updated);
    setInput('');
    sendChat(
      { data: { messages: updated } },
      {
        onSuccess: (res) => setMessages((prev) => [...prev, { role: 'assistant', content: res.message }]),
        onError: () => setMessages((prev) => [...prev, { role: 'assistant', content: 'Ошибка. Попробуйте снова.' }]),
      },
    );
  };

  return (
    <section className="w-full min-h-[100svh] snap-start snap-always flex flex-col p-6 relative border-b border-white/5 bg-[#0a0a0c]">
      <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-6 uppercase tracking-widest pb-4 border-b border-white/5">
        <Bot className="w-4 h-4 text-primary" />
        <span>claude-assistant.md</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3 pb-4 no-scrollbar">
        {messages.map((msg, i) => (
          <div key={i} className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={cn('max-w-[85%] px-3 py-2 text-sm leading-relaxed',
              msg.role === 'user' ? 'bg-primary/20 border border-primary/30 text-white' : 'bg-white/5 border border-white/10 text-muted-foreground')}>
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
      </div>
      <div className="shrink-0 border-t border-white/5 bg-black/40 flex items-end gap-2 pt-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="Задайте вопрос…"
          rows={1}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-muted-foreground/50 resize-none focus:outline-none leading-5"
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || isPending}
          className="shrink-0 w-8 h-8 flex items-center justify-center text-primary hover:text-white hover:bg-primary/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </section>
  );
}

export function MobileStack() {
  const { isDemoSubscribed, setIsSubscriptionModalOpen } = useAppState();

  const heroWindow = initialWindows.find(w => w.id === 'hero');
  const contentWindows = initialWindows.filter(w => w.id !== 'hero');

  return (
    <div className="fixed inset-0 bg-[#050506] overflow-y-auto snap-y snap-mandatory no-scrollbar text-white pb-20 pt-12">
      {/* Hero Card */}
      {heroWindow && (
        <section className="w-full h-[100svh] snap-start snap-always flex flex-col items-center justify-center p-6 relative border-b border-white/5">
          <div className="absolute inset-0 z-0">
            <img src={natashaHero} alt="Natasha" className="w-full h-full object-cover opacity-20 grayscale-[20%]" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#050506] via-[#050506]/80 to-transparent"></div>
          </div>
          
          <div className="relative z-10 flex flex-col items-center text-center mt-12">
            <div className="w-48 h-48 rounded-full overflow-hidden mb-8 border border-white/10 shadow-[0_0_40px_rgba(255,87,34,0.15)]">
              <img src={natashaHero} alt="Natasha" className="w-full h-full object-cover grayscale-[20%] contrast-125" />
            </div>
            <h1 className="text-5xl font-serif tracking-tight mb-4 uppercase drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">Наташа Фри</h1>
            <p className="text-primary font-mono text-sm tracking-widest mb-6 px-4">Медиаблогер. Редактор. Наблюдатель.</p>
            <p className="text-muted-foreground leading-relaxed max-w-xs mb-10 text-sm">
              Независимый взгляд на события без лишних слов — только то, что важно.
            </p>
            <button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-primary text-primary-foreground w-full py-4 font-medium tracking-wide text-sm shadow-[0_0_20px_rgba(255,87,34,0.3)]"
            >
              ПОДПИСАТЬСЯ — 590 ₽/МЕС
            </button>
          </div>
          
          <div className="absolute bottom-8 animate-bounce text-muted-foreground">
            <ChevronDown className="w-6 h-6" />
          </div>
        </section>
      )}

      {/* Content Cards */}
      {contentWindows.map((w, index) => {
        if (w.type === 'chat') {
          return <MobileChatCard key={w.id} />;
        }

        const isLocked = w.access === 'private' && !isDemoSubscribed;
        
        return (
          <section key={w.id} className="w-full min-h-[100svh] snap-start snap-always flex flex-col p-6 relative border-b border-white/5 bg-[#0a0a0c]">
            <div className="flex items-center gap-3 text-xs font-mono text-muted-foreground mb-6 uppercase tracking-widest pb-4 border-b border-white/5">
              <FileText className="w-4 h-4 text-primary" />
              <span>{w.title}</span>
              <span className="ml-auto opacity-50">
                {String(index + 1).padStart(2, '0')} / {contentWindows.length}
              </span>
            </div>
            
            <div className={cn("prose prose-invert max-w-none flex-1 pb-12", isLocked && "blur-sm opacity-40 select-none pointer-events-none")}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {w.content || ''}
              </ReactMarkdown>
            </div>

            {isLocked && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm p-6 text-center mt-16">
                <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 border border-primary/30 shadow-[0_0_20px_rgba(255,87,34,0.2)]">
                  <Lock className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-2xl font-serif mb-4 text-white">Материал закрыт</h3>
                <p className="text-muted-foreground mb-8">
                  Оформите подписку, чтобы получить доступ к эксклюзивной аналитике.
                </p>
                <button 
                  onClick={() => setIsSubscriptionModalOpen(true)}
                  className="bg-primary text-primary-foreground w-full py-4 font-medium tracking-wide text-sm"
                >
                  ПОДПИСАТЬСЯ ЗА 590 ₽
                </button>
              </div>
            )}
          </section>
        );
      })}
      
      {/* End spacing */}
      <div className="h-[20svh] snap-end bg-[#050506] flex items-center justify-center">
        <p className="text-muted-foreground font-serif italic text-sm">Конец ленты</p>
      </div>
    </div>
  );
}
