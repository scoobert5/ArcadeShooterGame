import React, { useEffect, useState, useRef } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameCanvas } from './GameCanvas';
import { HUD } from './UI/HUD';
import { PauseMenu } from './UI/PauseMenu';
import { PlayerHealthBar } from './UI/PlayerHealthBar';
import { WaveAnnouncement } from './UI/WaveAnnouncement';
import { UpgradeShop } from './UI/UpgradeShop';
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
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [waveCountdown, setWaveCountdown] = useState(3);
  const [playerHealth, setPlayerHealth] = useState({ current: 100, max: 100 });
  const [ammoState, setAmmoState] = useState({ current: 10, max: 10, isReloading: false });

  useEffect(() => {
    // Subscribe to engine events
    const handleScore = (newScore: number) => setScore(newScore);
    const handleStatusChange = (status: GameStatus) => {
        setGameState(status);
    };
    
    const handleWaveChange = (newWave: number) => {
        setWave(newWave);
    };

    const handleWaveProgress = (remaining: number) => {
        setEnemiesRemaining(remaining);
    };
    
    const handleWaveTimer = (time: number) => {
        setWaveCountdown(time);
    };

    const handleHealthChange = (health: { current: number, max: number }) => {
        setPlayerHealth(health);
    };
    
    // Poll for ammo state
    const syncInterval = setInterval(() => {
        if (engine.state.player) {
            setAmmoState({
                current: engine.state.player.currentAmmo,
                max: engine.state.player.maxAmmo,
                isReloading: engine.state.player.isReloading
            });
        }
    }, 100);

    engine.on('score_change', handleScore);
    engine.on('status_change', handleStatusChange);
    engine.on('player_health_change', handleHealthChange);
    engine.on('wave_change', handleWaveChange);
    engine.on('wave_progress', handleWaveProgress);
    engine.on('wave_intro_timer', handleWaveTimer);

    return () => {
      clearInterval(syncInterval);
      engine.off('score_change', handleScore);
      engine.off('status_change', handleStatusChange);
      engine.off('player_health_change', handleHealthChange);
      engine.off('wave_change', handleWaveChange);
      engine.off('wave_progress', handleWaveProgress);
      engine.off('wave_intro_timer', handleWaveTimer);
    };
  }, [engine]);

  const handleStart = () => {
    engine.startGame();
  };
  
  const handleResume = () => {
    engine.resumeGame();
  };

  const handleQuit = () => {
    engine.quitGame();
  };

  const handleShopBuy = (upgradeId: string) => {
      engine.buyUpgrade(upgradeId);
  };

  const handleShopClose = () => {
      engine.closeShop();
  };

  return (
    <div className="relative w-full h-full min-h-screen bg-slate-950 overflow-hidden">
      
      <GameCanvas engine={engine} />
      
      {/* HUD Overlay */}
      {(gameState === GameStatus.Playing || gameState === GameStatus.Paused || gameState === GameStatus.WaveIntro || gameState === GameStatus.Shop) && (
        <>
          <HUD 
              score={score} 
              wave={wave} 
              enemiesRemaining={enemiesRemaining}
              ammo={ammoState.current}
              maxAmmo={ammoState.max}
              isReloading={ammoState.isReloading}
              canShop={false} // Disabled manual shop hint/access
          />
          <PlayerHealthBar current={playerHealth.current} max={playerHealth.max} />
        </>
      )}
      
      {/* Wave Announcement & Countdown */}
      {gameState === GameStatus.WaveIntro && (
          <WaveAnnouncement wave={wave} countdown={waveCountdown} />
      )}
      
      {/* Upgrade Shop Overlay */}
      {gameState === GameStatus.Shop && (
          <UpgradeShop 
              state={engine.state} 
              onBuy={handleShopBuy} 
              onClose={handleShopClose} 
          />
      )}
      
      {/* Pause Menu Overlay */}
      {gameState === GameStatus.Paused && (
        <PauseMenu onResume={handleResume} onQuit={handleQuit} />
      )}

      {/* Menus Overlay */}
      {gameState === GameStatus.Menu && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-lg backdrop-blur-sm z-50">
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
          
          <div className="mt-8 text-slate-500 text-sm">
            Use <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">WASD</kbd> to move, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">Click</kbd> to shoot, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">R</kbd> to reload, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">ESC</kbd> to pause
          </div>
        </div>
      )}
      
        {gameState === GameStatus.GameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-lg backdrop-blur-sm z-50">
          <h2 className="text-4xl font-bold text-red-500 mb-4">GAME OVER</h2>
          <p className="text-slate-300 mb-8 text-xl">Final Score: <span className="text-white font-mono">{score}</span></p>
          <div className="flex gap-4">
              <button
              onClick={handleQuit}
              className="px-6 py-3 bg-slate-800 text-slate-300 rounded-full font-bold hover:bg-slate-700 transition-colors"
              >
              MAIN MENU
              </button>
              <button
              onClick={handleStart}
              className="px-6 py-3 bg-white text-slate-900 rounded-full font-bold hover:bg-slate-200 transition-colors"
              >
              TRY AGAIN
              </button>
          </div>
        </div>
      )}
    </div>
  );
};