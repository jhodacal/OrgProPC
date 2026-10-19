import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Sparkles,
  Clock,
  Zap,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  ArrowRight,
  Plus,
  Layers,
  MapPin,
  User,
  AlertCircle,
  TrendingUp,
  Award
} from 'lucide-react';
import StorageService from '../services/StorageService';
import AudioService from '../services/AudioService';
import { Course, UniversityTask, UniversityUnit, RPGStats, RPGCosmetics, ScheduleBlock, Semester } from '../types';
import { PRIORITY_CONFIG } from '../styles/theme';
import confetti from 'canvas-confetti';
import { getNextUniversityClass, getTodayClasses, formatTime12h } from '../utils/scheduleHelper';

interface HomeViewProps {
  onNavigate: (tab: string) => void;
  onOpenNewTask: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate, onOpenNewTask }) => {
  const [stats, setStats] = useState<RPGStats | null>(null);
  const [cosmetics, setCosmetics] = useState<RPGCosmetics | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [uniTasks, setUniTasks] = useState<UniversityTask[]>([]);
  const [units, setUnits] = useState<UniversityUnit[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);

  const loadData = async () => {
    const [s, c, crs, sems, uTasks, uUnits, sched] = await Promise.all([
      StorageService.getRPGStats(),
      StorageService.getRPGCosmetics(),
      StorageService.getCourses(),
      StorageService.getSemesters(),
      StorageService.getUniversityTasks(),
      StorageService.getCourseUnitsProgress(),
      StorageService.getScheduleBlocks()
    ]);
    setStats(s);
    setCosmetics(c);
    setCourses(crs);
    setSemesters(sems);
    setUniTasks(uTasks);
    setUnits(uUnits);
    setScheduleBlocks(sched);
  };

  useEffect(() => {
    loadData();
    const unsubStorage = StorageService.on('DATA_UPDATED', loadData);
    const unsubStats = StorageService.on('RPG_STATS_UPDATED', loadData);
    return () => {
      unsubStorage();
      unsubStats();
    };
  }, []);

  const nextClass = getNextUniversityClass(scheduleBlocks);
  const todayClasses = getTodayClasses(scheduleBlocks);

  const pendingTasks = uniTasks.filter(t => !t.completed);
  const completedTasksCount = uniTasks.filter(t => t.completed).length;
  const examCount = pendingTasks.filter(t => t.type === 'exam').length;
  const activeSemester = semesters.find(s => s.isCurrent) || semesters[0];

  const handleToggleTask = async (id: string) => {
    setUniTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    }));

    AudioService.playCheck();
    const res = await StorageService.toggleUniversityTask(id);
    if (res?.completed) {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    }
    loadData();
  };

  const getCourse = (courseId: string) => courses.find(c => c.id === courseId);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-purple-950/50 via-indigo-950/40 to-slate-900/80 border border-purple-500/20 p-8 backdrop-blur-xl shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40 font-mono">
                {activeSemester ? activeSemester.name : 'Ciclo Universitario 2026-I'}
              </span>
              <span className="text-xs text-accent flex items-center gap-1 font-mono">
                <Sparkles className="w-3.5 h-3.5" /> Sincronización Móvil Activa
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              ¡Hola Jhodacal! Tu Panel Universitario 🎓
            </h1>
            <p className="text-sm text-gray-300 max-w-2xl">
              Tienes <strong className="text-accent">{pendingTasks.length} entregables pendientes</strong>,{' '}
              <strong className="text-rose-400">{examCount} exámenes programados</strong> y{' '}
              <strong className="text-amber-300">{courses.length} materias</strong> inscritas. Todo lo que marques se sincroniza con tu celular.
            </p>
          </div>

          {/* Academic Level Badge */}
          <div className="flex items-center gap-3 bg-black/40 p-4 rounded-2xl border border-white/10 backdrop-blur-md">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-2xl font-black shadow-lg shadow-purple-500/30 border border-white/20">
              {stats?.level || 1}
            </div>
            <div className="text-xs space-y-1">
              <p className="font-bold text-white uppercase text-[11px] text-gray-400">Nivel Académico</p>
              <p className="text-purple-300 font-mono font-bold">{stats?.xp || 0} XP acumulada</p>
              <p className="text-emerald-400 font-bold">{completedTasksCount} entregas logradas</p>
            </div>
          </div>
        </div>

        {/* Quick Actions Row */}
        <div className="mt-6 pt-6 border-t border-white/10 flex flex-wrap gap-3">
          <button
            onClick={onOpenNewTask}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/30 hover:brightness-110 transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Tarea / Entregable
          </button>
          <button
            onClick={() => onNavigate('schedule')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
          >
            <Clock className="w-4 h-4 text-accent" /> Horario Semanal
          </button>
          <button
            onClick={() => onNavigate('university')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
          >
            <Layers className="w-4 h-4 text-purple-300" /> Avance de 17 Semanas
          </button>
          <button
            onClick={() => onNavigate('focus')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
          >
            <Zap className="w-4 h-4 text-amber-400" /> Modo Enfoque Pomodoro
          </button>
          <button
            onClick={() => onNavigate('ai')}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
          >
            <Sparkles className="w-4 h-4 text-indigo-300" /> Consultar Tutor IA
          </button>
        </div>
      </div>

      {/* Grid: Main Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Live Class + University Tasks */}
        <div className="lg:col-span-2 space-y-6">
          {/* Live University Class Schedule Widget */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                <h2 className="font-bold text-lg text-white">Horario Universitario de Hoy</h2>
                {nextClass && (
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full font-mono border ${
                    nextClass.isOngoing
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {nextClass.remainingText}
                  </span>
                )}
              </div>
              <button
                onClick={() => onNavigate('schedule')}
                className="text-xs text-accent hover:text-white flex items-center gap-1 font-bold"
              >
                Ver horario completo <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {nextClass ? (
              <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: nextClass.color }} />
                    <h3 className="text-base font-black text-white">{nextClass.courseName}</h3>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-0.5">
                    <span className="font-mono text-amber-300 font-bold">
                      ⏰ {nextClass.formattedTime12}
                    </span>
                    {nextClass.classroom && (
                      <span className="text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                        📍 {nextClass.classroom}
                      </span>
                    )}
                    {nextClass.professor && (
                      <span className="text-purple-300">Prof. {nextClass.professor}</span>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-mono text-gray-400">
                    {todayClasses.length} {todayClasses.length === 1 ? 'materia hoy' : 'materias hoy'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-gray-400 text-xs flex items-center justify-between">
                <span>Sin clases pendientes hoy. ¡Día libre de universidad! 🎉</span>
                <button
                  onClick={() => onNavigate('schedule')}
                  className="text-accent font-bold hover:underline"
                >
                  Configurar clases
                </button>
              </div>
            )}
          </div>

          {/* Pending University Tasks / Deliverables */}
          <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-lg text-white">Entregables & Tareas Universitarias</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-bold">
                  {pendingTasks.length} pendientes
                </span>
              </div>
              <button
                onClick={() => onNavigate('tasks')}
                className="text-xs text-purple-300 hover:text-white flex items-center gap-1 font-medium"
              >
                Ver todas <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {pendingTasks.slice(0, 5).map((task) => {
                const course = getCourse(task.courseId);
                const priority = PRIORITY_CONFIG[task.priority || 'high'];
                const isExam = task.type === 'exam';

                return (
                  <div
                    key={task.id}
                    onClick={() => handleToggleTask(task.id)}
                    className="cursor-pointer p-4 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06] transition-all flex items-center justify-between gap-4 select-none"
                    style={{ borderLeftColor: course?.color || '#a855f7', borderLeftWidth: '4px' }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Circle className="w-5 h-5 text-gray-500 shrink-0 hover:text-purple-400 transition-colors" />
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-white truncate">
                          {task.title}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                          <span className="text-[11px] font-bold text-purple-300">
                            {course?.name || task.courseName || 'Materia General'}
                          </span>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                            isExam ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-purple-500/20 text-purple-300'
                          }`}>
                            {isExam ? 'Examen' : task.type === 'project' ? 'Proyecto' : 'Tarea'}
                          </span>
                          <span className="text-[11px] font-mono text-gray-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-amber-400" />
                            {task.dueDate}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-amber-400">
                        +{isExam ? 120 : 50} XP
                      </span>
                    </div>
                  </div>
                );
              })}

              {pendingTasks.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-xs space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                  <p>¡No tienes tareas ni exámenes pendientes! Estás al día con tus materias 🎉</p>
                  <button
                    onClick={onOpenNewTask}
                    className="text-purple-300 font-bold hover:underline"
                  >
                    + Registrar nueva tarea universitaria
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Courses Summary & 17 Weeks Progress */}
        <div className="space-y-6">
          {/* Courses Summary Card */}
          <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                <h2 className="font-bold text-lg text-white">Mis Materias</h2>
              </div>
              <button
                onClick={() => onNavigate('university')}
                className="text-xs text-indigo-300 hover:text-white flex items-center gap-1 font-medium"
              >
                Gestionar <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {courses.map((course) => (
                <div
                  key={course.id}
                  onClick={() => onNavigate('university')}
                  className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 hover:border-white/20 cursor-pointer transition-all flex items-center justify-between"
                  style={{ borderLeftColor: course.color || '#6366f1', borderLeftWidth: '4px' }}
                >
                  <div className="min-w-0">
                    <h3 className="text-xs font-bold text-white truncate">{course.name}</h3>
                    <p className="text-[11px] text-gray-400 truncate">
                      {course.professor ? `Prof. ${course.professor}` : `${course.credits || 4} créditos`}
                    </p>
                  </div>
                  {course.code && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-gray-400">
                      {course.code}
                    </span>
                  )}
                </div>
              ))}

              {courses.length === 0 && (
                <div className="text-center py-6 text-gray-400 text-xs">
                  No hay materias registradas. Agrega tus cursos del ciclo.
                </div>
              )}
            </div>
          </div>

          {/* 17 Weeks Semester Progress Card */}
          <div className="p-6 rounded-3xl bg-gradient-to-b from-purple-500/10 to-transparent border border-purple-500/20 backdrop-blur-xl space-y-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-lg text-white">Progreso del Sílabo</h2>
            </div>

            <div className="space-y-3 text-xs">
              {units.slice(0, 3).map((unit) => {
                const totalW = unit.totalWeeks || unit.weeks?.length || 17;
                const completedW = (unit.weeks || []).filter(w => w.completed).length;
                const pct = Math.round((completedW / totalW) * 100);

                return (
                  <div key={unit.id} className="p-3.5 rounded-2xl bg-black/30 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white truncate">{unit.title}</span>
                      <span className="font-mono text-purple-300 font-bold">{completedW} / {totalW} sem</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}

              {units.length === 0 && (
                <p className="text-gray-400 text-xs text-center py-2">
                  Agrega las unidades y temas de tus materias en la pestaña Universidad.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
