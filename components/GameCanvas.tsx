import React, { useRef, useEffect } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameRenderer } from '../renderer/GameRenderer';
import { GAME_WIDTH, GAME_HEIGHT } from '../utils/constants';

interface GameCanvasProps {
  engine: GameEngine;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ engine }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<GameRenderer | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Initialize Renderer
    rendererRef.current = new GameRenderer(ctx, GAME_WIDTH, GAME_HEIGHT);
    
    // Initialize Engine Input
    engine.init(canvas);

    // Create a render loop independent of the physics loop
    // This allows interpolation later if needed, but for now just draws latest state
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
      engine.destroy(canvas);
    };
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      className="bg-slate-900 rounded-lg shadow-2xl cursor-crosshair touch-none"
      style={{
          width: '100%',
          maxWidth: `${GAME_WIDTH}px`,
          aspectRatio: `${GAME_WIDTH}/${GAME_HEIGHT}`
      }}
    />
  );
};