import React, { useEffect, useState, useRef } from 'react';
import { GameEngine } from '../core/GameEngine';
import { GameCanvas } from './GameCanvas';
import { HUD } from './UI/HUD';
import { PauseMenu } from './UI/PauseMenu';
import { PlayerHealthBar } from './UI/PlayerHealthBar';
import { WaveAnnouncement } from './UI/WaveAnnouncement';
import { UpgradeShop } from './UI/UpgradeShop';
import { DevConsole } from './UI/DevConsole';
import { BossHealthBar } from './UI/BossHealthBar';
import { ExtractionMenu } from './UI/ExtractionMenu';
import { GameOver } from './UI/GameOver';
import { Play } from 'lucide-react';
import { GameStatus } from '../core/GameState';

export const GameContainer: React.FC = () => {
  // Use ref to keep engine instance persistent across re-renders
  const engineRef = useRef<GameEngine>(new GameEngine());
  const engine = engineRef.current;
  const canvasRef = useRef<HTMLDivElement>(null);

  // React State for UI
  const [gameState, setGameState] = useState<GameStatus>(GameStatus.Menu);
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [enemiesRemaining, setEnemiesRemaining] = useState(0);
  const [waveCountdown, setWaveCountdown] = useState(3);
  const [playerHealth, setPlayerHealth] = useState({ current: 100, max: 100, shields: 0, maxShields: 0 });
  const [ammoState, setAmmoState] = useState({ current: 10, max: 10, isReloading: false });
  const [bossHealth, setBossHealth] = useState({ current: 0, max: 100, active: false });
  
  // Meta State for UI
  const [runMeta, setRunMeta] = useState({ currency: 0, xp: 0 });

  useEffect(() => {
    // Subscribe to engine events
    const handleScore = (newScore: number) => setScore(newScore);
    const handleStatusChange = (status: GameStatus) => {
        setGameState(status);
        
        // Sync Meta on status change (e.g. hitting extraction)
        setRunMeta({
            currency: engine.state.runMetaCurrency,
            xp: engine.state.runMetaXP
        });

        // Refocus canvas when closing DevConsole
        if (status !== GameStatus.DevConsole && document.activeElement instanceof HTMLElement) {
            // If the focused element was the input or something else, blur it
            document.activeElement.blur();
            // Try to find canvas to focus if needed, or just let body take it
        }
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

    const handleHealthChange = (health: { current: number, max: number, shields: number, maxShields: number }) => {
        setPlayerHealth(health);
    };

    const handleBossHealthChange = (health: { current: number, max: number, active: boolean }) => {
        setBossHealth(health);
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
    engine.on('boss_health_change', handleBossHealthChange);

    // Global Key Listener for Dev Console (Capture Phase)
    // This runs BEFORE inputs receive key events, ensuring Tilde always works.
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
        // Universal Console Toggle: ` or ~
        if (e.code === 'Backquote' || e.key === '`' || e.key === '~') {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            engine.toggleConsole();
            return;
        }

        // Escape handling when console is open
        if (e.code === 'Escape' && engine.state.status === GameStatus.DevConsole) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            engine.toggleConsole();
            return;
        }
    };

    // Attach with useCapture = true
    window.addEventListener('keydown', handleGlobalKeyDown, true);

    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('keydown', handleGlobalKeyDown, true);
      engine.off('score_change', handleScore);
      engine.off('status_change', handleStatusChange);
      engine.off('player_health_change', handleHealthChange);
      engine.off('wave_change', handleWaveChange);
      engine.off('wave_progress', handleWaveProgress);
      engine.off('wave_intro_timer', handleWaveTimer);
      engine.off('boss_health_change', handleBossHealthChange);
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
  
  const handleExtract = () => {
      engine.extract();
  };
  
  const handleContinueRun = () => {
      engine.continueRun();
  };

  const handleConsoleCommand = (cmd: string) => {
      const lowerCmd = cmd.toLowerCase();
      if (lowerCmd.startsWith('wave_')) {
          const waveNum = parseInt(lowerCmd.split('_')[1], 10);
          engine.jumpToWave(waveNum);
      }
      else if (lowerCmd.startsWith('givescore_')) {
          const amount = parseInt(lowerCmd.split('_')[1], 10);
          engine.giveScore(amount);
      }
      else if (lowerCmd === 'openshop') {
          engine.openDevShop();
      }
  };

  const handleConsoleClose = () => {
      engine.toggleConsole();
  };

  return (
    <div ref={canvasRef} className="relative w-full h-full min-h-screen bg-slate-950 overflow-hidden outline-none">
      
      <GameCanvas engine={engine} />
      
      {/* HUD Overlay */}
      {(gameState === GameStatus.Playing || gameState === GameStatus.Paused || gameState === GameStatus.WaveIntro || gameState === GameStatus.Shop || gameState === GameStatus.DevConsole || gameState === GameStatus.Extraction) && (
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
          <PlayerHealthBar 
              current={playerHealth.current} 
              max={playerHealth.max} 
              shields={playerHealth.shields} 
              maxShields={playerHealth.maxShields} 
          />
          {/* Add Boss Health Bar here */}
          <BossHealthBar current={bossHealth.current} max={bossHealth.max} active={bossHealth.active} />
        </>
      )}
      
      {/* Wave Announcement & Countdown */}
      {gameState === GameStatus.WaveIntro && (
          <WaveAnnouncement wave={wave} countdown={waveCountdown} />
      )}
      
      {/* Extraction Menu */}
      {gameState === GameStatus.Extraction && (
          <ExtractionMenu 
              runCurrency={runMeta.currency} 
              runXP={runMeta.xp} 
              onExtract={handleExtract} 
              onContinue={handleContinueRun} 
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

      {/* Dev Console Overlay */}
      {gameState === GameStatus.DevConsole && (
        <DevConsole onCommand={handleConsoleCommand} onClose={handleConsoleClose} />
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
        <GameOver 
            score={score} 
            state={engine.state}
            onRestart={handleStart} 
            onQuit={handleQuit} 
        />
      )}
    </div>
  );
};