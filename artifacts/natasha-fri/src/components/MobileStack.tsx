import React from 'react';
import { initialWindows } from '@/data/windows';
import { useAppState } from './AppStateProvider';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lock, FileText, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import natashaHero from '@assets/natasha-hero.jpg';

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
