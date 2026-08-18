import React, { useState, useEffect } from 'react';
import { useAppState } from './AppStateProvider';
import { Moon, Search, Sun } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export function Toolbar() {
  const { isDemoSubscribed, setIsDemoSubscribed, setIsSubscriptionModalOpen, setIsSearchOpen } = useAppState();
  const [time, setTime] = useState(new Date());
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    document.documentElement.classList.contains('dark') ? 'dark' : 'light',
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formattedTime = format(time, 'HH:mm:ss', { locale: ru }) + ' МСК';

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
    localStorage.setItem('natasha-theme', nextTheme);
  };

  return (
    <>
      <div className="fixed top-0 left-0 right-0 h-12 border-b border-border bg-background/85 backdrop-blur-md z-[100] flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h1 className="font-condensed font-bold tracking-widest text-lg text-foreground flex items-center gap-2">
            НАТАША ФРИ RUS <span className="text-xl">🍟</span>
          </h1>
          <div className="hidden md:flex items-center gap-2 text-xs font-mono text-muted-foreground border-l border-border pl-4">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            {formattedTime}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
            title={theme === 'dark' ? 'Светлая тема' : 'Тёмная тема'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Открыть поиск"
          >
            <Search className="w-4 h-4" />
          </button>
          
          {isDemoSubscribed ? (
            <button 
              onClick={() => setIsDemoSubscribed(false)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground border border-border px-3 py-1.5 transition-colors"
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
