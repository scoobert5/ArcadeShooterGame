import React from 'react';

interface WaveAnnouncementProps {
  wave: number;
  countdown: number;
}

export const WaveAnnouncement: React.FC<WaveAnnouncementProps> = ({ wave, countdown }) => {
  const isBossWave = wave % 10 === 0;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 bg-black/40 backdrop-blur-[1px]">
      <div className="flex flex-col items-center animate-in zoom-in-50 duration-300">
        
        {isBossWave ? (
            <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-800 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-tighter italic mb-4 animate-pulse">
            BOSS BATTLE
            </h2>
        ) : (
            <h2 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)] tracking-tighter italic mb-4">
            WAVE {wave}
            </h2>
        )}
        
        <div className="flex items-center justify-center">
            {countdown > 0 ? (
                <div key={countdown} className="text-6xl font-black text-white animate-[ping_1s_cubic-bezier(0,0,0.2,1)_infinite]">
                    {countdown}
                </div>
            ) : (
                <div className="text-4xl font-bold text-red-500 animate-pulse tracking-widest uppercase">
                    FIGHT!
                </div>
            )}
        </div>
      </div>
    </div>
  );
};