import React, { useRef, useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Lock, Unlock, Minus, X, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAppState } from './AppStateProvider';
import { WindowData } from '@/data/windows';
import natashaHero from '@assets/natasha-hero.jpg';

export interface MarkdownWindowProps {
  window: WindowData;
  scale: number;
  isTop: boolean;
  onUpdate: (id: string, updates: Partial<WindowData>) => void;
  onBringToFront: (id: string) => void;
  className?: string;
}

export function MarkdownWindow({
  window: w,
  scale,
  isTop,
  onUpdate,
  onBringToFront,
  className,
}: MarkdownWindowProps) {
  const { isDemoSubscribed, setIsSubscriptionModalOpen } = useAppState();
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const isLocked = w.access === 'private' && !isDemoSubscribed;

  const handlePointerDownDrag = (e: React.PointerEvent) => {
    // Only drag with primary button
    if (e.button !== 0) return;
    e.stopPropagation();
    onBringToFront(w.id);
    setIsDragging(true);

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
      setIsDragging(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const handlePointerDownResize = (e: React.PointerEvent) => {
    if (e.button !== 0 || w.type === 'hero') return;
    e.stopPropagation();
    onBringToFront(w.id);
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const initialW = w.width;
    const initialH = w.height;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;
      onUpdate(w.id, {
        width: Math.max(300, initialW + deltaX),
        height: Math.max(200, initialH + deltaY),
      });
    };

    const handlePointerUp = () => {
      setIsResizing(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const zIndex = isTop ? 50 : 10;

  if (w.type === 'hero') {
    return (
      <div
        className={cn(
          "absolute flex flex-col bg-card/95 backdrop-blur-md border-l border-l-primary border-t border-t-white/5 border-r border-r-white/5 border-b border-b-black/50 shadow-2xl",
          className
        )}
        style={{
          transform: `translate(${w.defaultX}px, ${w.defaultY}px)`,
          width: `${w.width}px`,
          height: `${w.height}px`,
          zIndex,
        }}
        onPointerDown={() => onBringToFront(w.id)}
      >
        <div 
          className="h-10 bg-black/40 flex items-center px-4 justify-between cursor-move shrink-0 border-b border-white/5"
          onPointerDown={handlePointerDownDrag}
        >
          <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
            <Maximize2 className="w-3 h-3" /> {w.title}
          </div>
          <div className="flex gap-2">
            <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20" />
            <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20" />
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative group p-6 flex flex-col items-center text-center justify-center">
          <div className="w-40 h-40 rounded-full overflow-hidden mb-6 border border-white/10 shadow-[0_0_40px_rgba(255,87,34,0.15)] relative">
            <img src={natashaHero} alt="Natasha" className="w-full h-full object-cover grayscale-[20%] contrast-125" />
            <div className="absolute inset-0 bg-primary mix-blend-overlay opacity-20"></div>
          </div>
          <h1 className="text-4xl font-serif tracking-tight mb-2 uppercase text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.1)]">Наташа Фри</h1>
          <p className="text-primary font-mono text-sm tracking-widest mb-6">Медиаблогер. Редактор. Наблюдатель.</p>
          <p className="text-muted-foreground leading-relaxed max-w-sm mb-8 text-sm">
            Независимый взгляд на события без лишних слов — только то, что важно.
          </p>
          <button 
            onClick={() => setIsSubscriptionModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-none font-medium transition-colors tracking-wide text-sm shadow-[0_0_20px_rgba(255,87,34,0.3)] hover:shadow-[0_0_30px_rgba(255,87,34,0.5)]"
          >
            ПОДПИСАТЬСЯ — 590 ₽/МЕС
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "absolute flex flex-col bg-card/90 backdrop-blur-xl border border-white/5 shadow-[0_8px_32px_rgba(0,0,0,0.4)]",
        className
      )}
      style={{
        transform: `translate(${w.defaultX}px, ${w.defaultY}px)`,
        width: `${w.width}px`,
        height: `${w.height}px`,
        zIndex,
        borderLeft: '1px solid hsl(var(--primary))'
      }}
      onPointerDown={() => onBringToFront(w.id)}
    >
      {/* Title bar */}
      <div 
        className="h-9 bg-black/60 flex items-center px-3 justify-between cursor-move shrink-0 border-b border-white/5 select-none"
        onPointerDown={handlePointerDownDrag}
      >
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground truncate flex-1">
          {w.access === 'private' ? <Lock className="w-3 h-3 text-primary" /> : <Unlock className="w-3 h-3 opacity-50" />}
          <span className="truncate">{w.title}</span>
        </div>
        <div className="flex gap-2 shrink-0 ml-2">
          <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-[8px] text-white/50 opacity-0 group-hover:opacity-100" />
          <button className="w-3 h-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-[8px] text-white/50 opacity-0 group-hover:opacity-100" />
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative no-scrollbar bg-[#0a0a0c]">
        <div className={cn("p-6 prose prose-invert", isLocked && "blur-[6px] select-none pointer-events-none opacity-40 transition-all duration-500")}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {w.content || ''}
          </ReactMarkdown>
        </div>

        {isLocked && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px] p-6 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mb-4 border border-primary/30 shadow-[0_0_15px_rgba(255,87,34,0.2)]">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            <h3 className="text-lg font-serif mb-2 text-white">Материал закрыт</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-[240px]">
              Оформите подписку, чтобы получить полный доступ к аналитике и архиву.
            </p>
            <button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/50 px-6 py-2 rounded-none font-medium transition-colors text-sm"
            >
              ПОДПИСАТЬСЯ
            </button>
          </div>
        )}
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
