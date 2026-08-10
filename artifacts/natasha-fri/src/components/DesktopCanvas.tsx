import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useCanvas } from '@/hooks/use-canvas';
import { MarkdownWindow } from './MarkdownWindow';
import { Minus, Plus, Maximize, Search } from 'lucide-react';
import { useAppState } from './AppStateProvider';

import { Minimap } from './Minimap';

export function DesktopCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pan, setPan] = useState({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const [scale, setScale] = useState(1);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const { windows, updateWindow, topWindowId, bringToFront } = useCanvas();
  const { setIsSearchOpen } = useAppState();

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const zoomSensitivity = 0.005;
      const delta = -e.deltaY * zoomSensitivity;
      const newScale = Math.min(Math.max(0.2, scale + delta), 2);
      
      // Zoom to mouse cursor
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) {
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const scaleChange = newScale - scale;
        const dx = (mouseX - pan.x) * (scaleChange / scale);
        const dy = (mouseY - pan.y) * (scaleChange / scale);
        
        setPan(prev => ({ x: prev.x - dx, y: prev.y - dy }));
      }
      setScale(newScale);
    } else {
      // Pan
      setPan(prev => ({
        x: prev.x - e.deltaX,
        y: prev.y - e.deltaY
      }));
    }
  }, [pan, scale]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only drag canvas if middle mouse or background clicked
    if (e.button !== 0 && e.button !== 1) return;
    if ((e.target as HTMLElement).closest('.markdown-window')) return;
    
    setIsDraggingCanvas(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const initialPanX = pan.x;
    const initialPanY = pan.y;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      setPan({
        x: initialPanX + (moveEvent.clientX - startX),
        y: initialPanY + (moveEvent.clientY - startY)
      });
    };

    const handlePointerUp = () => {
      setIsDraggingCanvas(false);
      document.removeEventListener('pointermove', handlePointerMove);
      document.removeEventListener('pointerup', handlePointerUp);
    };

    document.addEventListener('pointermove', handlePointerMove);
    document.addEventListener('pointerup', handlePointerUp);
  };

  const centerCanvas = () => {
    setPan({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
    setScale(1);
  };

  useEffect(() => {
    const handleCenterOnWindow = (e: CustomEvent<{ id: string }>) => {
      const w = windows.find(win => win.id === e.detail.id);
      if (w) {
        setPan({
          x: window.innerWidth / 2 - (w.defaultX + w.width / 2) * scale,
          y: window.innerHeight / 2 - (w.defaultY + w.height / 2) * scale,
        });
      }
    };
    
    window.addEventListener('centerOnWindow', handleCenterOnWindow as EventListener);
    return () => window.removeEventListener('centerOnWindow', handleCenterOnWindow as EventListener);
  }, [windows, scale]);

  return (
    <div 
      className="fixed inset-0 overflow-hidden bg-[#050506] canvas-bg touch-none"
      ref={containerRef}
      onPointerDown={handlePointerDown}
      style={{ cursor: isDraggingCanvas ? 'grabbing' : 'grab' }}
    >
      <div 
        className="absolute inset-0 origin-top-left transition-transform duration-0 ease-linear"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})`,
        }}
      >
        {windows.map(w => (
          <div key={w.id} className="markdown-window">
            <MarkdownWindow 
              window={w} 
              scale={scale}
              isTop={topWindowId === w.id}
              onUpdate={updateWindow}
              onBringToFront={bringToFront}
            />
          </div>
        ))}
      </div>

      {/* Controls HUD */}
      <div className="absolute bottom-6 right-6 flex flex-col gap-4 z-50">
        <div className="flex flex-col bg-card/80 backdrop-blur-md border border-white/10 rounded-sm shadow-xl p-1 gap-1">
          <button 
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-white/10 w-full" />
          <div className="w-8 h-8 flex items-center justify-center text-[10px] font-mono text-primary font-medium">
            {Math.round(scale * 100)}%
          </div>
          <div className="h-[1px] bg-white/10 w-full" />
          <button 
            onClick={() => setScale(s => Math.max(0.2, s - 0.1))}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex flex-col bg-card/80 backdrop-blur-md border border-white/10 rounded-sm shadow-xl p-1 gap-1">
          <button 
            onClick={centerCanvas}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            title="Center Canvas"
          >
            <Maximize className="w-4 h-4" />
          </button>
          <div className="h-[1px] bg-white/10 w-full" />
          <button 
            onClick={() => setIsSearchOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/10 transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>

        {/* Minimap */}
        <Minimap 
          windows={windows} 
          pan={pan} 
          scale={scale} 
          onNavigate={(x, y) => setPan({ x, y })} 
        />
      </div>
    </div>
  );
}
