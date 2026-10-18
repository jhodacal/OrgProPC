import React, { useEffect, useState } from 'react';
import {
  Home,
  GraduationCap,
  Clock,
  CheckSquare,
  Zap,
  Bot,
  Settings,
  Flame,
  Coins,
  RefreshCw,
  BookOpen
} from 'lucide-react';
import StorageService from '../services/StorageService';
import SyncEngine, { SyncStatus } from '../services/SyncEngine';
import { RPGStats, RPGCosmetics } from '../types';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  pendingTasksCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, pendingTasksCount }) => {
  const [stats, setStats] = useState<RPGStats>({
    level: 1,
    xp: 0,
    nextLevelXp: 100,
    coins: 50,
    totalCompletedTasks: 0,
    totalCompletedHabits: 0,
    streak: 0,
    longestStreak: 0
  });
  const [cosmetics, setCosmetics] = useState<RPGCosmetics | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());

  const loadData = async () => {
    const [s, c] = await Promise.all([
      StorageService.getRPGStats(),
      StorageService.getRPGCosmetics()
    ]);
    setStats(s);
    setCosmetics(c);
  };

  useEffect(() => {
    loadData();
    const unsubStorage = StorageService.on('RPG_STATS_UPDATED', () => loadData());
    const unsubCosmetics = StorageService.on('COSMETICS_UPDATED', () => loadData());
    const unsubSync = SyncEngine.subscribe(setSyncStatus);
    return () => {
      unsubStorage();
      unsubCosmetics();
      unsubSync();
    };
  }, []);

  const getRank = (level: number) => {
    if (level < 5) return { title: "Estudiante Universitario 🎓", color: "text-purple-400" };
    if (level < 10) return { title: "Investigador Académico 📚", color: "text-blue-400" };
    if (level < 15) return { title: "Líder de Proyectos 🏹", color: "text-emerald-400" };
    if (level < 20) return { title: "Maestro de Sílabo 🛡️", color: "text-amber-400" };
    if (level < 30) return { title: "Graduado con Honores 🔮", color: "text-pink-400" };
    return { title: "Catedrático de Honor 🧙‍♂️", color: "text-yellow-400" };
  };

  const rank = getRank(stats.level);
  const xpPercent = Math.min(100, Math.max(0, Math.round((stats.xp / stats.nextLevelXp) * 100)));

  const menuItems = [
    { id: 'home', label: 'Inicio', icon: Home },
    { id: 'university', label: 'Universidad & Cursos', icon: GraduationCap },
    { id: 'schedule', label: 'Horario Universitario', icon: Clock },
    { id: 'tasks', label: 'Tareas & Entregables', icon: CheckSquare, badge: pendingTasksCount },
    { id: 'focus', label: 'Modo Enfoque', icon: Zap },
    { id: 'ai', label: 'Tutor IA Académico', icon: Bot, isSpecial: true },
    { id: 'settings', label: 'Ajustes & Sync Celular', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-[#0B0D1B]/95 backdrop-blur-xl border-r border-white/10 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="p-5 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-white via-purple-300 to-indigo-400">
              ORGPRO <span className="text-xs px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono ml-1">UNI</span>
            </h1>
            <p className="text-[11px] text-gray-400">Universidad & Horario PC</p>
          </div>
        </div>
      </div>

      {/* Student Academic Card */}
      <div className="mx-4 my-4 p-4 rounded-2xl bg-gradient-to-b from-white/[0.08] to-white/[0.02] border border-white/10 relative overflow-hidden">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xl font-bold shadow-md border border-white/20">
            {cosmetics?.equippedAvatar?.[0] || 'J'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-white text-sm truncate">Jhodacal</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                Nv. {stats.level}
              </span>
            </div>
            <p className={`text-xs font-semibold ${rank.color} truncate`}>{rank.title}</p>
          </div>
        </div>

        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-[11px] text-gray-400 font-mono">
            <span>XP Académico</span>
            <span className="text-purple-300">{stats.xp} / {stats.nextLevelXp}</span>
          </div>
          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Summary Badge */}
        <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between text-xs text-gray-300">
          <span className="text-[11px] text-gray-400">Entregas Completadas</span>
          <span className="font-bold font-mono text-emerald-400">{stats.totalCompletedTasks || 0}</span>
        </div>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/25 translate-x-1 font-semibold'
                  : 'text-gray-300 hover:text-white hover:bg-white/[0.06]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : item.isSpecial ? 'text-accent' : 'text-gray-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge !== undefined && item.badge > 0 && (
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold font-mono ${
                  isActive ? 'bg-white text-purple-700' : 'bg-purple-500/20 text-purple-300'
                }`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Sync Footer Banner */}
      <div className="p-4 border-t border-white/10 bg-black/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${syncStatus.isOnline ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-amber-400'}`} />
            <div>
              <p className="text-xs font-semibold text-white">
                {syncStatus.isOnline ? 'Sync Móvil Activo' : 'Modo Offline'}
              </p>
              <p className="text-[10px] text-gray-400">
                {syncStatus.isOnline ? 'Sincronizando Universidad & Horario' : 'Guardando localmente en PC'}
              </p>
            </div>
          </div>
          <button
            onClick={() => SyncEngine.syncNow()}
            disabled={syncStatus.isSyncing}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all disabled:opacity-50"
            title="Sincronizar ahora con Celular"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin text-purple-300' : ''}`} />
          </button>
        </div>
      </div>
    </aside>
  );
};

