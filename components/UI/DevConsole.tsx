
import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from 'lucide-react';

interface DevConsoleProps {
  onCommand: (command: string) => void;
  onClose: () => void;
}

export const DevConsole: React.FC<DevConsoleProps> = ({ onCommand, onClose }) => {
  const [inputValue, setInputValue] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    if (inputRef.current) {
        inputRef.current.focus();
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cmd = inputValue.trim().toLowerCase();
    
    if (!cmd) return;

    // Command: wave_X
    const waveMatch = cmd.match(/^wave_(\d+)$/);
    if (waveMatch) {
        const waveNum = parseInt(waveMatch[1], 10);
        if (!isNaN(waveNum) && waveNum > 0) {
            onCommand(cmd);
            setInputValue('');
            onClose(); // Close on success
            return;
        } else {
            setErrorMsg("Wave number must be a positive integer.");
            return;
        }
    }

    // Command: givescore_X
    const scoreMatch = cmd.match(/^givescore_(\d+)$/);
    if (scoreMatch) {
        const amount = parseInt(scoreMatch[1], 10);
        if (!isNaN(amount) && amount > 0) {
            onCommand(cmd);
            setInputValue('');
            // Optional: Don't close to allow spamming score
            // onClose(); 
            return;
        } else {
             setErrorMsg("Score amount must be a positive integer.");
             return;
        }
    }
    
    // Command: giveallupgrade_FAMILY
    const upgradeMatch = cmd.match(/^giveallupgrade_([a-z]+)$/);
    if (upgradeMatch) {
        const family = upgradeMatch[1];
        if (family === 'bullets' || family === 'defense' || family === 'mobility') {
            onCommand(cmd);
            setInputValue('');
            // onClose(); 
            return;
        } else {
            setErrorMsg("Unknown family. Use: bullets, defense, or mobility.");
            return;
        }
    }
    
    // Command: openshop
    if (cmd === 'openshop') {
        onCommand(cmd);
        setInputValue('');
        // onClose(); // openDevShop transitions state, so unmounting happens automatically
        return;
    }

    // Command: debug
    if (cmd === 'debug') {
        onCommand(cmd);
        setInputValue('');
        onClose();
        return;
    }

    // Unknown command
    setErrorMsg(`Unknown command: "${cmd}". Try "wave_10", "givescore_5000", "giveallupgrade_bullets", "openshop", or "debug"`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Tilde and Escape are now handled globally in capture phase by GameContainer.tsx
    // We do NOT need to handle them here.
    // However, if we wanted to be double-safe, we could leave empty handlers, but capture phase handles it upstream.
  };

  return (
    <div className="absolute top-0 left-0 w-full p-4 z-[9999] bg-gradient-to-b from-black/80 to-transparent">
      <form onSubmit={handleSubmit} className="relative w-full max-w-lg">
        <div className="relative flex items-center">
            <div className="absolute left-3 text-slate-500">
                <Terminal size={18} />
            </div>
            <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Developer Console (e.g. wave_10)"
                className="w-full bg-slate-900/90 border border-slate-700 text-green-400 font-mono text-sm py-2 pl-10 pr-4 rounded shadow-lg focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20"
            />
        </div>
        {errorMsg && (
            <div className="absolute top-full left-0 mt-1 text-xs text-red-400 bg-slate-900/80 px-2 py-1 rounded border border-red-900/50">
                {errorMsg}
            </div>
        )}
      </form>
    </div>
  );
};
