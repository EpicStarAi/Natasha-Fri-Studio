import React from 'react';
import { WindowData } from '@/data/windows';

interface MinimapProps {
  windows: WindowData[];
  pan: { x: number, y: number };
  scale: number;
  onNavigate: (x: number, y: number) => void;
}

export function Minimap({ windows, pan, scale, onNavigate }: MinimapProps) {
  // We'll scale the map by a factor of 0.05 (1/20)
  const MAP_SCALE = 0.05;
  const MAP_WIDTH = 160;
  const MAP_HEIGHT = 120;

  // The center of the minimap represents coordinates (0,0) of the canvas
  const centerX = MAP_WIDTH / 2;
  const centerY = MAP_HEIGHT / 2;

  // Calculate the current viewport rectangle in canvas coordinates
  // Window dimensions
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const vpX = -pan.x / scale;
  const vpY = -pan.y / scale;
  const vpW = vw / scale;
  const vpH = vh / scale;

  return (
    <div 
      className="w-40 h-30 bg-[#0a0a0c]/90 backdrop-blur-md border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] relative overflow-hidden cursor-crosshair shrink-0"
      style={{ width: MAP_WIDTH, height: MAP_HEIGHT }}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Convert click back to canvas coordinates
        const targetCanvasX = (clickX - centerX) / MAP_SCALE;
        const targetCanvasY = (clickY - centerY) / MAP_SCALE;

        // We want the clicked point to become the center of the screen
        // screenX = targetCanvasX * scale + pan.x
        // We want screenX = vw/2. So:
        // pan.x = vw/2 - targetCanvasX * scale
        
        onNavigate(
          vw / 2 - targetCanvasX * scale,
          vh / 2 - targetCanvasY * scale
        );
      }}
    >
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className="w-full h-px bg-primary absolute top-1/2 -translate-y-1/2"></div>
        <div className="h-full w-px bg-primary absolute left-1/2 -translate-x-1/2"></div>
      </div>

      {windows.map(w => {
        const isHero = w.type === 'hero';
        return (
          <div 
            key={w.id}
            className="absolute rounded-[1px] pointer-events-none border border-white/20"
            style={{
              left: centerX + w.defaultX * MAP_SCALE,
              top: centerY + w.defaultY * MAP_SCALE,
              width: w.width * MAP_SCALE,
              height: w.height * MAP_SCALE,
              backgroundColor: isHero ? 'rgba(255, 87, 34, 0.4)' : 'rgba(255, 255, 255, 0.1)',
            }}
          />
        );
      })}

      {/* Viewport indicator */}
      <div 
        className="absolute border border-primary bg-primary/10 pointer-events-none transition-all duration-100 ease-linear shadow-[0_0_10px_rgba(255,87,34,0.3)]"
        style={{
          left: centerX + vpX * MAP_SCALE,
          top: centerY + vpY * MAP_SCALE,
          width: vpW * MAP_SCALE,
          height: vpH * MAP_SCALE,
        }}
      />
    </div>
  );
}
