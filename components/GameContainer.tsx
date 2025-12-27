import React, { useEffect, useState, useRef } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameCanvas } from './GameCanvas';
import { HUD } from './UI/HUD';
import { LevelUpMenu } from './UI/LevelUpMenu';
import { PauseMenu } from './UI/PauseMenu';
import { PlayerHealthBar } from './UI/PlayerHealthBar';
import { WaveAnnouncement } from './UI/WaveAnnouncement';
import { UpgradeShop } from './UI/UpgradeShop';
import { Play } from 'lucide-react';
import { GameStatus } from '../core/GameState';
import { UpgradeDefinition } from '../systems/UpgradeSystem';

// Enhanced HUD to accept Ammo
interface EnhancedHUDProps {
    score: number;
    wave: number;
    enemiesRemaining: number;
    ammo: number;
    maxAmmo: number;
    isReloading: boolean;
    canShop: boolean;
}

const EnhancedHUD: React.FC<EnhancedHUDProps> = ({ score, wave, enemiesRemaining, ammo, maxAmmo, isReloading, canShop }) => {
    return (
      <div className="absolute top-4 left-4 right-4 flex justify-between pointer-events-none text-white font-mono z-10">
        <div className="bg-black/50 px-4 py-2 rounded">
          <span className="text-slate-400 text-sm block leading-none mb-1">SCORE</span>
          <div className="text-2xl font-bold leading-none">{score.toLocaleString()}</div>
        </div>
        
        {/* Enemies Center */}
        {enemiesRemaining > 0 && (
            <div className="absolute left-1/2 transform -translate-x-1/2 bg-black/50 px-6 py-2 rounded flex items-center gap-3">
               <div>
                  <span className="text-slate-400 text-xs block leading-none uppercase tracking-wider mb-1">Enemies</span>
                  <div className="text-xl font-bold leading-none text-center">{enemiesRemaining}</div>
               </div>
            </div>
        )}

        {/* Shop Hint */}
        {canShop && (
             <div className="absolute top-16 left-1/2 transform -translate-x-1/2 animate-bounce">
                <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg border border-indigo-400">
                    PRESS [U] FOR SHOP
                </span>
             </div>
        )}
  
        <div className="flex gap-4">
            {/* Ammo Display */}
            <div className="bg-black/50 px-4 py-2 rounded text-right min-w-[100px]">
                 <span className="text-slate-400 text-sm block leading-none mb-1">AMMO</span>
                 <div className={`text-2xl font-bold leading-none ${isReloading ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                    {isReloading ? 'RELOAD' : `${ammo}/${maxAmmo}`}
                 </div>
            </div>

            <div className="bg-black/50 px-4 py-2 rounded text-right">
                <span className="text-slate-400 text-sm block leading-none mb-1">WAVE</span>
                <div className="text-2xl font-bold text-yellow-400 leading-none">{wave}</div>
            </div>
        </div>
      </div>
    );
};


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
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeDefinition[]>([]);
  const [playerHealth, setPlayerHealth] = useState({ current: 100, max: 100 });
  const [ammoState, setAmmoState] = useState({ current: 10, max: 10, isReloading: false });
  // Check if shop is available (not active wave or during intro)
  const [canShop, setCanShop] = useState(false);

  useEffect(() => {
    // Subscribe to engine events
    const handleScore = (newScore: number) => setScore(newScore);
    const handleStatusChange = (status: GameStatus) => {
        setGameState(status);
        // Check availability logic
        setCanShop(!engine.state.waveActive || status === GameStatus.WaveIntro);
    };
    
    const handleWaveChange = (newWave: number) => {
        setWave(newWave);
    };

    const handleWaveProgress = (remaining: number) => {
        setEnemiesRemaining(remaining);
        // If remaining is 0, wave cleared, shop might be openable if waveActive flips
        // But waveActive updates in system loop. We rely on the interval below for precise UI sync.
    };
    
    const handleWaveTimer = (time: number) => {
        setWaveCountdown(time);
    };

    // Handle the level up event coming from the UpgradeSystem
    const handleLevelUp = (options: UpgradeDefinition[]) => {
      setUpgradeOptions(options);
      setGameState(GameStatus.LevelUp);
    };

    const handleHealthChange = (health: { current: number, max: number }) => {
        setPlayerHealth(health);
    };
    
    // Poll for ammo state roughly every frame via an event or just hijack existing update loops
    const syncInterval = setInterval(() => {
        if (engine.state.player) {
            setAmmoState({
                current: engine.state.player.currentAmmo,
                max: engine.state.player.maxAmmo,
                isReloading: engine.state.player.isReloading
            });
        }
        // Update Shop visibility hint frequently
        setCanShop((!engine.state.waveActive || engine.state.status === GameStatus.WaveIntro) && engine.state.status !== GameStatus.Menu && engine.state.status !== GameStatus.GameOver);
    }, 100);

    engine.on('score_change', handleScore);
    engine.on('status_change', handleStatusChange);
    engine.on('level_up', handleLevelUp);
    engine.on('player_health_change', handleHealthChange);
    engine.on('wave_change', handleWaveChange);
    engine.on('wave_progress', handleWaveProgress);
    engine.on('wave_intro_timer', handleWaveTimer);

    return () => {
      clearInterval(syncInterval);
      engine.off('score_change', handleScore);
      engine.off('status_change', handleStatusChange);
      engine.off('level_up', handleLevelUp);
      engine.off('player_health_change', handleHealthChange);
      engine.off('wave_change', handleWaveChange);
      engine.off('wave_progress', handleWaveProgress);
      engine.off('wave_intro_timer', handleWaveTimer);
    };
  }, [engine]);

  const handleStart = () => {
    engine.startGame();
  };

  const handleSelectUpgrade = (upgradeId: string) => {
    engine.selectUpgrade(upgradeId);
  };
  
  const handleResume = () => {
    engine.resumeGame();
  };

  const handleQuit = () => {
    engine.quitGame();
  };

  const handleShopBuy = (upgradeId: string) => {
      engine.buyUpgrade(upgradeId);
      // Force UI refresh (score) happens via events
  };

  const handleShopClose = () => {
      engine.toggleShop();
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-slate-950 p-4">
      
      <div className="relative w-full max-w-4xl">
        <GameCanvas engine={engine} />
        
        {/* HUD Overlay */}
        {(gameState === GameStatus.Playing || gameState === GameStatus.Paused || gameState === GameStatus.LevelUp || gameState === GameStatus.WaveIntro || gameState === GameStatus.Shop) && (
          <>
            <EnhancedHUD 
                score={score} 
                wave={wave} 
                enemiesRemaining={enemiesRemaining}
                ammo={ammoState.current}
                maxAmmo={ammoState.max}
                isReloading={ammoState.isReloading}
                canShop={canShop && gameState !== GameStatus.Shop}
            />
            <PlayerHealthBar current={playerHealth.current} max={playerHealth.max} />
          </>
        )}
        
        {/* Wave Announcement & Countdown */}
        {gameState === GameStatus.WaveIntro && (
            <WaveAnnouncement wave={wave} countdown={waveCountdown} />
        )}

        {/* Level Up Overlay */}
        {gameState === GameStatus.LevelUp && (
          <LevelUpMenu 
            options={upgradeOptions} 
            onSelect={handleSelectUpgrade} 
          />
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

      <div className="mt-6 text-slate-500 text-sm">
        Use <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">WASD</kbd> to move, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">Click</kbd> to shoot, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">U</kbd> for Shop, <kbd className="bg-slate-800 px-2 py-1 rounded text-slate-300">ESC</kbd> to pause
      </div>
    </div>
  );
};