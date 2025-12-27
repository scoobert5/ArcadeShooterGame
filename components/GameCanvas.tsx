import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameRenderer } from '../renderer/GameRenderer';

interface GameCanvasProps {
  engine: GameEngine;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Renderer with defaults, will resize immediately
    rendererRef.current = new GameRenderer(ctx, 800, 600);
    
    // Initialize Engine Input
    engine.init(canvas);
    
    // Handle Resizing
    const handleResize = () => {
        if (!containerRef.current) return;
        const { width, height } = containerRef.current.getBoundingClientRect();
        
        // Update Canvas DOM size
        canvas.width = width;
        canvas.height = height;
        
        // Update Renderer and Engine
        if (rendererRef.current) {
            rendererRef.current.resize(width, height);
        }
        engine.resize(width, height);
    };

    // Use ResizeObserver for robust sizing
    const resizeObserver = new ResizeObserver(() => handleResize());
    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }
    
    // Initial resize
    handleResize();

    // Create a render loop independent of the physics loop
    let renderFrameId: number;
    
    const render = () => {
      if (rendererRef.current) {
        rendererRef.current.render(engine.state);
      }
      renderFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(renderFrameId);
      resizeObserver.disconnect();
      engine.destroy(canvas);
    };
  }, [engine]);

  return (
    <div ref={containerRef} className="w-full h-full absolute inset-0 overflow-hidden">
        <canvas
        ref={canvasRef}
        className="block bg-slate-900 shadow-2xl cursor-crosshair touch-none"
        style={{ width: '100%', height: '100%' }}
        />
    </div>
  );
};