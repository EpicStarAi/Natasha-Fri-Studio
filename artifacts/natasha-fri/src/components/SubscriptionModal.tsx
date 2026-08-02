import React from 'react';
import { useAppState } from './AppStateProvider';
import { X, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export function SubscriptionModal() {
  const { isSubscriptionModalOpen, setIsSubscriptionModalOpen, setIsDemoSubscribed } = useAppState();

  if (!isSubscriptionModalOpen) return null;

  const handleDemoLogin = () => {
    setIsDemoSubscribed(true);
    setIsSubscriptionModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div 
        className="absolute inset-0" 
        onClick={() => setIsSubscriptionModalOpen(false)}
      />
      
      <div className="relative w-full max-w-4xl bg-[#0a0a0c] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        <button 
          onClick={() => setIsSubscriptionModalOpen(false)}
          className="absolute right-4 top-4 text-muted-foreground hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 md:p-12 overflow-y-auto">
          <h2 className="text-3xl md:text-4xl font-serif mb-2 text-center text-white">
            Приватный доступ — НАТАША ФРИ RUS 🍟
          </h2>
          <p className="text-muted-foreground text-center mb-10 max-w-lg mx-auto">
            Независимая аналитика, эксклюзивные инсайды и прямой доступ к редакции.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-12">
            {/* Monthly Card */}
            <div className="border border-white/10 bg-white/[0.02] p-8 relative flex flex-col">
              <div className="mb-6">
                <h3 className="text-xl font-bold font-condensed tracking-wide text-white mb-2">МЕСЯЦ</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-sans">590 ₽</span>
                  <span className="text-muted-foreground">/ мес</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">Ежемесячная оплата</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {[
                  'Все материалы без ограничений',
                  'Утренние брифинги',
                  'Авторская аналитика',
                  'Q&A сессии',
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button disabled className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white py-3 transition-colors cursor-not-allowed opacity-50">
                ОФОРМИТЬ ПОДПИСКУ
              </button>
            </div>

            {/* Yearly Card */}
            <div className="border border-primary bg-primary/[0.02] p-8 relative flex flex-col shadow-[0_0_30px_rgba(255,87,34,0.1)]">
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 font-mono tracking-widest translate-x-px -translate-y-px">
                ВЫГОДНЕЕ НА 30%
              </div>
              <div className="mb-6">
                <h3 className="text-xl font-bold font-condensed tracking-wide text-primary mb-2">ГОД</h3>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold font-sans text-primary">4 990 ₽</span>
                  <span className="text-muted-foreground">/ год</span>
                </div>
                <p className="text-sm text-primary/70 mt-2">~ 416 ₽ / мес</p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {[
                  'Все материалы без ограничений',
                  'Утренние брифинги',
                  'Авторская аналитика',
                  'Q&A сессии',
                  <span key="archive" className="font-semibold text-white">Архив с 2024 года</span>,
                  <span key="chat" className="text-primary border-b border-primary/30 border-dashed pb-0.5">Закрытый чат (скоро)</span>
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-white/80">
                    <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button disabled className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 transition-colors font-medium cursor-not-allowed opacity-50 shadow-[0_0_15px_rgba(255,87,34,0.2)]">
                ОФОРМИТЬ ГОДОВУЮ
              </button>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 text-center flex flex-col items-center">
            <p className="text-sm text-primary font-mono mb-4 bg-primary/10 px-4 py-2 inline-block">
              ⚠️ Это демонстрационный прототип. Оплата не принимается.
            </p>
            <button 
              onClick={handleDemoLogin}
              className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white transition-colors"
            >
              Войти как гость (демо)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
