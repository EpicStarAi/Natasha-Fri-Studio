import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppState {
  isDemoSubscribed: boolean;
  setIsDemoSubscribed: (val: boolean) => void;
  isSubscriptionModalOpen: boolean;
  setIsSubscriptionModalOpen: (val: boolean) => void;
  isSearchOpen: boolean;
  setIsSearchOpen: (val: boolean) => void;
}

const AppStateContext = createContext<AppState | undefined>(undefined);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [isDemoSubscribed, setIsDemoSubscribed] = useState(false);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <AppStateContext.Provider
      value={{
        isDemoSubscribed,
        setIsDemoSubscribed,
        isSubscriptionModalOpen,
        setIsSubscriptionModalOpen,
        isSearchOpen,
        setIsSearchOpen,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}
