import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from './AppStateProvider';
import { useCanvas } from '@/hooks/use-canvas';
import { Search, X, FileText, ChevronRight } from 'lucide-react';

export function SearchOverlay() {
  const { isSearchOpen, setIsSearchOpen } = useAppState();
  const { windows, bringToFront } = useCanvas();
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearchOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isSearchOpen]);

  if (!isSearchOpen) return null;

  const results = query.trim().length > 1 
    ? windows.filter(w => {
        const q = query.toLowerCase();
        return w.title.toLowerCase().includes(q) || (w.content && w.content.toLowerCase().includes(q));
      })
    : [];

  const handleSelect = (id: string) => {
    bringToFront(id);
    setIsSearchOpen(false);
    window.dispatchEvent(new CustomEvent('centerOnWindow', { detail: { id } }));
  };

  return (
    <div className="fixed inset-0 z-[150] flex flex-col items-center bg-black/90 backdrop-blur-md pt-24 px-4 animate-in fade-in duration-200">
      <button 
        onClick={() => setIsSearchOpen(false)}
        className="absolute top-6 right-6 text-muted-foreground hover:text-white transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="w-full max-w-2xl">
        <div className="relative mb-8">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-muted-foreground" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Поиск по материалам..."
            className="w-full bg-transparent border-b-2 border-white/20 pb-4 pl-14 pr-4 text-2xl md:text-4xl font-serif text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {query.trim().length > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-mono text-muted-foreground mb-4 uppercase tracking-widest">
              Результаты ({results.length})
            </p>
            {results.length > 0 ? (
              results.map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSelect(w.id)}
                  className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/5 p-4 flex items-center justify-between group transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black/50 flex items-center justify-center border border-white/10 shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <h4 className="text-white font-medium mb-1 group-hover:text-primary transition-colors">
                        {w.title}
                      </h4>
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-md">
                        {w.content?.substring(0, 100).replace(/[#*>-]/g, '') || 'Без содержимого'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-white transition-colors opacity-0 group-hover:opacity-100 -translate-x-4 group-hover:translate-x-0" />
                </button>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground border border-white/5 border-dashed bg-white/[0.02]">
                Ничего не найдено по запросу «{query}»
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
