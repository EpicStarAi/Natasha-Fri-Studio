import { useState, useEffect, useCallback } from 'react';
import { initialWindows, WindowData } from '@/data/windows';

const STORAGE_KEY = 'nfr_layout_v1';

export type CanvasState = {
  x: number;
  y: number;
  scale: number;
};

export function useCanvas() {
  const [windows, setWindows] = useState<WindowData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Merge saved positions with initial content
        return initialWindows.map(w => {
          const savedWindow = parsed.find((p: any) => p.id === w.id);
          if (savedWindow) {
            return {
              ...w,
              defaultX: savedWindow.x,
              defaultY: savedWindow.y,
              width: savedWindow.width,
              height: savedWindow.height,
            };
          }
          return w;
        });
      }
    } catch (e) {
      console.error('Failed to load window layout', e);
    }
    return initialWindows;
  });

  const [topWindowId, setTopWindowId] = useState<string | null>(null);

  // Save to localStorage when windows change
  useEffect(() => {
    const toSave = windows.map(w => ({
      id: w.id,
      x: w.defaultX,
      y: w.defaultY,
      width: w.width,
      height: w.height,
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  }, [windows]);

  const updateWindow = useCallback((id: string, updates: Partial<WindowData>) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
  }, []);

  const bringToFront = useCallback((id: string) => {
    setTopWindowId(id);
  }, []);

  return {
    windows,
    updateWindow,
    topWindowId,
    bringToFront,
  };
}
