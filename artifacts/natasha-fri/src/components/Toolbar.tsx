import React, { useState, useEffect } from 'react';
import { useAppState } from './AppStateProvider';
import { Search } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function Toolbar() {
  const { isDemoSubscribed, setIsDemoSubscribed, setIsSubscriptionModalOpen, setIsSearchOpen } = useAppState();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = format(time, 'HH:mm:ss', { locale: ru }) + ' МСК';

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-12 border-b border-white/5 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="font-condensed font-bold tracking-widest text-lg text-white flex items-center gap-2">
            НАТАША ФРИ RUS <span className="text-xl">🍟</span>
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground border-l border-white/10 pl-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {formattedTime}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white transition-colors"
          >
            <Search className="w-4 h-4" />
          </button>
          
          {isDemoSubscribed ? (
            <button 
              onClick={() => setIsDemoSubscribed(false)}
              className="text-xs font-mono text-muted-foreground hover:text-white border border-white/10 px-3 py-1.5 transition-colors"
            >
              ВЫЙТИ ИЗ ДЕМО
            </button>
          ) : (
            <button 
              onClick={() => setIsSubscriptionModalOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium px-4 py-1.5 tracking-wide transition-colors"
            >
              ПОДПИСАТЬСЯ
            </button>
          )}
        </div>
      </div>
      
      {isDemoSubscribed && (
        <div className="fixed top-12 left-0 right-0 h-8 bg-primary/10 border-b border-primary/20 z-[90] flex items-center justify-center">
          <p className="text-xs font-mono text-primary flex items-center gap-2">
            ДЕМО-РЕЖИМ АКТИВЕН — Вы видите весь контент как подписчик
          </p>
        </div>
      )}
    </>
  );
}
