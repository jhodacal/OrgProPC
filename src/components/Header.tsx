import React, { useEffect, useState } from 'react';
import {
  CloudSun,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  Search,
  Volume2,
  VolumeX,
  Sparkles
} from 'lucide-react';
import SyncEngine, { SyncStatus } from '../services/SyncEngine';
import StorageService from '../services/StorageService';

interface HeaderProps {
  onSearch?: (query: string) => void;
  onOpenQuickTask?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onSearch, onOpenQuickTask }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [timeStr, setTimeStr] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [isAudioMuted, setIsAudioMuted] = useState(false);

  useEffect(() => {
    const unsub = SyncEngine.subscribe(setSyncStatus);

    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setDateStr(now.toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-16 px-6 bg-[#0B0D1B]/80 backdrop-blur-md border-b border-white/10 flex items-center justify-between select-none">
      {/* Date & Live Clock */}
      <div className="flex items-center gap-6">
        <div>
          <p className="text-xs text-gray-400 capitalize">{dateStr}</p>
          <p className="text-sm font-bold font-mono text-white tracking-wide">{timeStr}</p>
        </div>

        {/* Weather Widget */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/5 text-xs text-gray-300">
          <CloudSun className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white">Lima, PE</span>
          <span className="text-gray-400">|</span>
          <span className="font-mono text-accent">21°C Despejado</span>
        </div>
      </div>

      {/* Actions & Sync Badge */}
      <div className="flex items-center gap-3">
        {/* Quick Task Button */}
        {onOpenQuickTask && (
          <button
            onClick={onOpenQuickTask}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:opacity-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+ Nueva Tarea</span>
          </button>
        )}

        {/* Sync Status Pill */}
        <div
          onClick={() => SyncEngine.syncNow()}
          className={`cursor-pointer flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${
            syncStatus.isOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
          }`}
          title={syncStatus.isOnline ? 'Sincronizando materias, horario y tareas con tu celular. Clic para forzar sync.' : 'Modo Offline - Todo se guarda en tu PC y se sube al conectar'}
        >
          {syncStatus.isSyncing ? (
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-300" />
          ) : syncStatus.isOnline ? (
            <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 text-amber-400" />
          )}
          <span className="hidden sm:inline">
            {syncStatus.isSyncing ? 'Sincronizando...' : syncStatus.isOnline ? 'Sync Móvil (Uni & Horario)' : 'Offline (Guardado Local)'}
          </span>
        </div>
      </div>
    </header>
  );
};
