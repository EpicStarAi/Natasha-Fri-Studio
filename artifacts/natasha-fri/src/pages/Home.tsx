import React, { useEffect, useState } from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';
import { DesktopCanvas } from '@/components/DesktopCanvas';
import { MobileStack } from '@/components/MobileStack';
import { Toolbar } from '@/components/Toolbar';
import { SubscriptionModal } from '@/components/SubscriptionModal';
import { SearchOverlay } from '@/components/SearchOverlay';
import { AppStateProvider } from '@/components/AppStateProvider';

export default function Home() {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <AppStateProvider>
      <div className="w-full h-[100dvh] overflow-hidden bg-[#050506] text-white">
        <Toolbar />
        {isMobile ? <MobileStack /> : <DesktopCanvas />}
        <SubscriptionModal />
        <SearchOverlay />
      </div>
    </AppStateProvider>
  );
}
