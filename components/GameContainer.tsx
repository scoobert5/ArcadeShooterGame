import React, { useEffect, useState, useRef } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameCanvas } from './GameCanvas';
import { HUD } from './UI/HUD';
import { Play } from 'lucide-react';
import { GameStatus } from '../core/GameState';

export const GameContainer: React.FC = () => {
  // Use ref to keep engine instance persistent across re-renders
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;

  // React State for UI
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.Menu);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);

  useEffect(() => {
    // Subscribe to engine events
    const handleScore = (newScore: number) => setScore(newScore);
    const handleGameOver = () => setGameState(GameStatus.GameOver);
    
    engine.on('score_change', handleScore);
    engine.on('game_over', handleGameOver);

    return () => {
      engine.off('score_change', handleScore);
      engine.off('game_over', handleGameOver);
    };
  }, [engine]);

  const handleStart = () => {
    engine.startGame();
    setGameState(GameStatus.Playing);
    setScore(0);
    setWave(1);
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
      
      <div className="relative w-full max-w-4xl">
        <GameCanvas engine={engine} />
        
        {/* HUD Overlay */}
        {gameState === GameStatus.Playing && (
          <HUD score={score} wave={wave} />
        )}

        {/* Menus Overlay */}
        {gameState === GameStatus.Menu && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg backdrop-blur-sm">
            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-8 tracking-tight uppercase italic">
              Neon Blitz
            </h1>
            <button
              onClick={handleStart}
              className="group flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-indigo-500/30"
            >
              <Play className="fill-current" />
              START GAME
            </button>
          </div>
        )}
        
         {gameState === GameStatus.GameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm">
            <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
            <p className="text-slate-300 mb-8 text-xl">Final Score: <span className="text-white font-mono">{score}</span></p>
            <button
              onClick={handleStart}
              className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors"
            >
              TRY AGAIN
            </button>
          </div>
        )}
      </div>

      <div className="mt-6 text-slate-500 text-sm">
        Use <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">WASD</kbd> to move and <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">Click</kbd> to shoot
      </div>
    </div>
  );
};