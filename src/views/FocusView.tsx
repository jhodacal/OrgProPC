import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Coins,
  Shield,
  Volume2,
  VolumeX,
  Award
} from 'lucide-react';
import StorageService from '../services/StorageService';
import AudioService from '../services/AudioService';
import confetti from 'canvas-confetti';

export const FocusView: React.FC = () => {
  const [durationMinutes, setDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  const timerRef = useRef<any>(null);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleFinishSession();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const handleFinishSession = async () => {
    setIsActive(false);
    AudioService.playTimerEnd();
    confetti({ particleCount: 80, spread: 100, origin: { y: 0.6 } });

    // Reward XP + 50 and 50 coins
    await StorageService.addXP(50);
    await StorageService.incrementAchievementProgress('focus_novice', 1);
    await StorageService.incrementAchievementProgress('focus_master', 1);

    setSessionsCompleted(prev => prev + 1);
    AudioService.speak("¡Excelente sesión de enfoque jhodacal! Ganaste 50 XP.");
  };

  const handleTogglePlay = () => {
    setIsActive(!isActive);
  };

  const handleReset = () => {
    setIsActive(false);
    setTimeLeft(durationMinutes * 60);
  };

  const handleSelectDuration = (min: number) => {
    setIsActive(false);
    setDurationMinutes(min);
    setTimeLeft(min * 60);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const progress = 1 - (timeLeft / (durationMinutes * 60));

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8 animate-fadeIn text-center">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-black text-white flex items-center justify-center gap-2">
          <Zap className="w-8 h-8 text-accent animate-pulse" /> Modo Enfoque Profundo (Pomodoro)
        </h1>
        <p className="text-xs text-gray-400">
          Aísla distracciones, mantén la concentración y gana +50 XP y monedas por cada bloque completado.
        </p>
      </div>

      {/* Mode Selector */}
      <div className="inline-flex p-1.5 rounded-2xl bg-white/[0.04] border border-white/10 gap-2">
        {[
          { label: 'Pomodoro (25m)', min: 25 },
          { label: 'Enfoque Largo (50m)', min: 50 },
          { label: 'Sprint Rápido (15m)', min: 15 },
        ].map(item => (
          <button
            key={item.min}
            onClick={() => handleSelectDuration(item.min)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              durationMinutes === item.min
                ? 'bg-gradient-to-r from-accent to-primary text-white shadow-lg shadow-accent/20'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Main Timer Circle */}
      <div className="relative w-80 h-80 mx-auto flex items-center justify-center">
        {/* Glowing background ring */}
        <div className="absolute inset-0 rounded-full bg-accent/10 blur-2xl animate-pulse" />

        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="160"
            cy="160"
            r="140"
            className="stroke-white/10"
            strokeWidth="12"
            fill="transparent"
          />
          <circle
            cx="160"
            cy="160"
            r="140"
            className="stroke-accent transition-all duration-500 ease-linear"
            strokeWidth="12"
            strokeDasharray={2 * Math.PI * 140}
            strokeDashoffset={2 * Math.PI * 140 * (1 - progress)}
            strokeLinecap="round"
            fill="transparent"
          />
        </svg>

        <div className="absolute flex flex-col items-center justify-center space-y-2">
          <span className="text-6xl font-black font-mono text-white tracking-tighter">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
          <span className="text-xs uppercase font-bold tracking-widest text-accent flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5" /> {isActive ? 'EN SESIÓN' : 'EN PAUSA'}
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 pt-4">
        <button
          onClick={handleReset}
          className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 transition-all"
          title="Reiniciar Timer"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          onClick={handleTogglePlay}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-accent to-primary text-white font-extrabold text-base shadow-xl shadow-accent/30 hover:scale-105 active:scale-95 transition-all"
        >
          {isActive ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 fill-current" />}
          <span>{isActive ? 'PAUSAR' : 'COMENZAR ENFOQUE'}</span>
        </button>
      </div>

      {/* Stats footer */}
      <div className="pt-8 border-t border-white/10 flex items-center justify-center gap-8 text-xs text-gray-400">
        <div>
          <span className="font-bold text-white text-base block font-mono">{sessionsCompleted}</span>
          <span>Sesiones hoy</span>
        </div>
        <div className="h-8 w-px bg-white/10" />
        <div>
          <span className="font-bold text-amber-400 text-base block font-mono">+{sessionsCompleted * 50} XP</span>
          <span>XP Ganada</span>
        </div>
      </div>
    </div>
  );
};
