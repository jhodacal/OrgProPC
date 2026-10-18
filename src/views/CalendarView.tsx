import React, { useState, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  CheckCircle2, 
  Circle, 
  Clock, 
  GraduationCap, 
  CalendarDays,
  Sparkles,
  Layers,
  Award,
  Pencil,
  Trash2
} from 'lucide-react';
import StorageService, { isItemCompleted } from '../services/StorageService';
import AudioService from '../services/AudioService';
import { DailyTask, UniversityTask, ScheduleBlock, Course, Habit } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [uniTasks, setUniTasks] = useState<UniversityTask[]>([]);
  const [schedule, setSchedule] = useState<ScheduleBlock[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month');
  const [filterType, setFilterType] = useState<'all' | 'uni' | 'daily' | 'schedule'>('all');
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskType, setNewTaskType] = useState<'daily' | 'uni'>('daily');
  const [newTaskCourse, setNewTaskCourse] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('09:00');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('high');

  // Edit & Confirmation States
  const [editingDailyTask, setEditingDailyTask] = useState<DailyTask | null>(null);
  const [editingUniTask, setEditingUniTask] = useState<UniversityTask | null>(null);
  const [confirmDeleteDaily, setConfirmDeleteDaily] = useState<DailyTask | null>(null);
  const [confirmDeleteUni, setConfirmDeleteUni] = useState<UniversityTask | null>(null);
  const [pendingDailyUpdate, setPendingDailyUpdate] = useState<{ id: string; payload: Partial<DailyTask> } | null>(null);
  const [pendingUniUpdate, setPendingUniUpdate] = useState<{ id: string; payload: Partial<UniversityTask> } | null>(null);

  const loadAll = async () => {
    const [t, u, s, c, h] = await Promise.all([
      StorageService.getDailyTasks(),
      StorageService.getUniversityTasks(),
      StorageService.getScheduleBlocks(),
      StorageService.getCourses(),
      StorageService.getHabits()
    ]);
    setTasks(t);
    setUniTasks(u);
    setSchedule(s);
    setCourses(c);
    setHabits(h);
  };

  useEffect(() => {
    loadAll();
    const unsub = StorageService.on('DATA_UPDATED', loadAll);
    return () => { unsub(); };
  }, []);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysOfWeek = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const jumpToToday = () => {
    const now = new Date();
    setCurrentDate(now);
    setSelectedDate(now);
  };

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const startDayOffset = (firstDayOfMonth + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const calendarDays: Array<{ date: Date; isCurrentMonth: boolean; dateStr: string }> = [];

  for (let i = startDayOffset - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, daysInPrevMonth - i);
    calendarDays.push({ date: d, isCurrentMonth: false, dateStr: d.toDateString() });
  }

  for (let i = 1; i <= daysInMonth; i++) {
    const d = new Date(year, month, i);
    calendarDays.push({ date: d, isCurrentMonth: true, dateStr: d.toDateString() });
  }

  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    calendarDays.push({ date: d, isCurrentMonth: false, dateStr: d.toDateString() });
  }

  const selectedDateStr = selectedDate.toDateString();
  const selectedIsoStr = selectedDate.toISOString().split('T')[0];
  const dayNameMap: Record<number, string> = { 1: 'Lun', 2: 'Mar', 3: 'Mie', 4: 'Jue', 5: 'Vie', 6: 'Sab', 0: 'Dom' };
  const selectedDayCode = dayNameMap[selectedDate.getDay()];

  const selectedDailyTasks = tasks.filter(t => {
    return t.createdAt?.startsWith(selectedIsoStr) || (t.completedDates || []).includes(selectedDateStr) || (t.recurrence?.type === 'daily');
  });

  const selectedUniTasks = uniTasks.filter(u => u.dueDate === selectedIsoStr);

  const selectedClasses = schedule.filter(b => {
    return (b.schedules || []).some(s => (s.days || []).includes(selectedDayCode));
  });

  const handleToggleDaily = async (id: string) => {
    AudioService.playCoin();
    await StorageService.toggleDailyTaskCompletion(id, selectedDateStr);
    await loadAll();
  };

  const handleToggleUni = async (id: string) => {
    AudioService.playCoin();
    await StorageService.toggleUniversityTask(id);
    await loadAll();
  };

  const handleCreateTaskForDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    if (newTaskType === 'daily') {
      const [h, m] = newTaskTime.split(':').map(Number);
      await StorageService.saveDailyTask({
        title: newTaskTitle.trim(),
        priority: newTaskPriority,
        rarity: 'common',
        estimatedMinutes: 30,
        hasTime: true,
        timeHour: h || 9,
        timeMin: m || 0,
      });
    } else {
      const course = courses.find(c => c.id === newTaskCourse) || courses[0];
      await StorageService.saveUniversityTask({
        title: newTaskTitle.trim(),
        courseId: course ? course.id : 'general',
        courseName: course ? course.name : 'General',
        type: 'task',
        priority: newTaskPriority,
        dueDate: selectedIsoStr,
        dueTime: newTaskTime
      });
    }

    AudioService.playLevelUp();
    setNewTaskTitle('');
    setShowAddTaskModal(false);
    await loadAll();
  };

  const handleSaveEditDaily = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDailyTask) return;
    setPendingDailyUpdate({
      id: editingDailyTask.id,
      payload: {
        title: editingDailyTask.title,
        priority: editingDailyTask.priority,
        hasTime: editingDailyTask.hasTime,
        timeHour: editingDailyTask.timeHour,
        timeMin: editingDailyTask.timeMin
      }
    });
  };

  const handleConfirmDailyUpdate = async () => {
    if (!pendingDailyUpdate) return;
    await StorageService.updateDailyTask(pendingDailyUpdate.id, pendingDailyUpdate.payload);
    AudioService.playCheck();
    setPendingDailyUpdate(null);
    setEditingDailyTask(null);
    await loadAll();
  };

  const handleSaveEditUni = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUniTask) return;
    const course = courses.find(c => c.id === editingUniTask.courseId);
    setPendingUniUpdate({
      id: editingUniTask.id,
      payload: {
        title: editingUniTask.title,
        courseId: editingUniTask.courseId,
        courseName: course?.name || editingUniTask.courseName || 'General',
        dueDate: editingUniTask.dueDate,
        dueTime: editingUniTask.dueTime,
        priority: editingUniTask.priority
      }
    });
  };

  const handleConfirmUniUpdate = async () => {
    if (!pendingUniUpdate) return;
    await StorageService.updateUniversityTask(pendingUniUpdate.id, pendingUniUpdate.payload);
    AudioService.playCheck();
    setPendingUniUpdate(null);
    setEditingUniTask(null);
    await loadAll();
  };

  const handleConfirmDeleteDaily = async () => {
    if (!confirmDeleteDaily) return;
    await StorageService.deleteDailyTask(confirmDeleteDaily.id);
    AudioService.playDelete();
    setConfirmDeleteDaily(null);
    await loadAll();
  };

  const handleConfirmDeleteUni = async () => {
    if (!confirmDeleteUni) return;
    await StorageService.deleteUniversityTask(confirmDeleteUni.id);
    AudioService.playDelete();
    setConfirmDeleteUni(null);
    await loadAll();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/60 p-5 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <CalendarIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Calendario y Agenda Global
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                OrgPro 2.0
              </span>
            </h1>
            <p className="text-sm text-slate-400">Visualiza tus materias, actividades y exámenes sincronizados.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={jumpToToday} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all">Hoy</button>
          <button onClick={() => setShowAddTaskModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 text-white text-xs font-bold shadow-lg transition-all transform hover:scale-105">
            <Plus className="w-4 h-4" /> Agendar en este día
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-white capitalize">{monthNames[month]} {year}</h2>
            <div className="flex items-center gap-2">
              <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-700"><ChevronLeft className="w-5 h-5" /></button>
              <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-300 border border-slate-700"><ChevronRight className="w-5 h-5" /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2 mb-2 text-center">
            {daysOfWeek.map(d => (<div key={d} className="text-xs font-bold text-slate-400 uppercase py-2">{d}</div>))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((cell, idx) => {
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === new Date().toDateString();
              const iso = cell.date.toISOString().split('T')[0];
              const cellDayCode = dayNameMap[cell.date.getDay()];
              const dayTasks = tasks.filter(t => t.createdAt?.startsWith(iso) || (t.completedDates || []).includes(cell.dateStr));
              const dayUni = uniTasks.filter(u => u.dueDate === iso);
              const dayClasses = schedule.filter(b => (b.schedules || []).some(s => (s.days || []).includes(cellDayCode)));
              return (
                <button key={idx} onClick={() => setSelectedDate(cell.date)} className={`min-h-[88px] p-2.5 rounded-2xl flex flex-col justify-between text-left transition-all border relative ${isSelected ? 'bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/40' : isToday ? 'bg-slate-800/80 border-emerald-500/50' : cell.isCurrentMonth ? 'bg-slate-950/40 hover:bg-slate-800/50 border-slate-800/60' : 'bg-slate-950/20 border-slate-800/30 opacity-40'}`}>
                  <div className="flex items-center justify-between w-full">
                    <span className={`text-xs font-bold ${isToday ? 'w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-black' : isSelected ? 'text-indigo-400 font-bold' : 'text-slate-300'}`}>{cell.date.getDate()}</span>
                    {isToday && <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1 py-0.5 rounded">Hoy</span>}
                  </div>
                  <div className="space-y-1 w-full mt-1">
                    {dayUni.length > 0 && <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 truncate">🎓 {dayUni.length} entregas</div>}
                    {dayClasses.length > 0 && <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 truncate">⏰ {dayClasses.length} clases</div>}
                    {dayTasks.length > 0 && <div className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 truncate">📝 {dayTasks.length} tareas</div>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-5 bg-slate-900/60 p-6 rounded-3xl border border-slate-800/80 backdrop-blur-xl shadow-xl">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">Agenda del Día</span>
            <h3 className="text-xl font-black text-white capitalize mt-2">{selectedDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' })}</h3>
          </div>
          <div className="space-y-3 overflow-y-auto max-h-[500px]">
            {selectedClasses.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-blue-400 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Clases ({selectedClasses.length})</div>
                {selectedClasses.map(b => (
                  <div key={b.id} className="p-3.5 rounded-2xl bg-blue-950/30 border border-blue-800/40 flex items-center justify-between">
                    <div><h4 className="text-sm font-bold text-white">{b.courseName}</h4><p className="text-xs text-blue-300">{b.schedules?.[0]?.startTime} - {b.schedules?.[0]?.endTime}</p></div>
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: b.color || '#3B82F6' }} />
                  </div>
                ))}
              </div>
            )}
            {selectedUniTasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-purple-400 flex items-center gap-1"><GraduationCap className="w-3.5 h-3.5" /> Universidad ({selectedUniTasks.length})</div>
                {selectedUniTasks.map(u => (
                  <div key={u.id} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${u.completed ? 'bg-purple-950/20 border-purple-800/30 opacity-60' : 'bg-purple-950/40 border-purple-600/40 hover:border-purple-500'}`}>
                    <div onClick={() => handleToggleUni(u.id)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                      {u.completed ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <Circle className="w-5 h-5 text-purple-400 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <h4 className={`text-sm font-bold truncate ${u.completed ? 'line-through text-slate-400' : 'text-white'}`}>{u.title}</h4>
                        <span className="text-xs text-purple-300">{u.courseName || 'General'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditUni(u)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-purple-300 hover:bg-purple-500/10 transition-colors"
                        title="Editar entrega"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDeleteUni(u)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Eliminar entrega"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {selectedDailyTasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Tareas Diarias ({selectedDailyTasks.length})</div>
                {selectedDailyTasks.map(t => {
                  const isDone = isItemCompleted(t, selectedDate);
                  return (
                    <div key={t.id} className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 ${isDone ? 'bg-emerald-950/20 border-emerald-800/30 opacity-60' : 'bg-emerald-950/30 border-emerald-600/40 hover:border-emerald-500'}`}>
                      <div onClick={() => handleToggleDaily(t.id)} className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer">
                        {isDone ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" /> : <Circle className="w-5 h-5 text-emerald-400 shrink-0" />}
                        <div className="min-w-0 flex-1">
                          <h4 className={`text-sm font-bold truncate ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>{t.title}</h4>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => handleOpenEditDaily(t)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                          title="Editar tarea"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDeleteDaily(t)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal: Agendar para este día */}
      {showAddTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-indigo-400" />
                Agendar para {selectedDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
              </h3>
              <button onClick={() => setShowAddTaskModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleCreateTaskForDay} className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setNewTaskType('daily')} className={`py-2 rounded-xl text-xs font-bold border ${newTaskType === 'daily' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>📝 Tarea Diaria</button>
                <button type="button" onClick={() => setNewTaskType('uni')} className={`py-2 rounded-xl text-xs font-bold border ${newTaskType === 'uni' ? 'bg-purple-600 text-white border-purple-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>🎓 Universidad</button>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Título</label>
                <input type="text" required placeholder="Ej: Examen Parcial o Repaso" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
              </div>
              {newTaskType === 'uni' && courses.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Curso</label>
                  <select value={newTaskCourse} onChange={e => setNewTaskCourse(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="">Selecciona un curso</option>
                    {courses.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Hora</label>
                  <input type="time" value={newTaskTime} onChange={e => setNewTaskTime(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Prioridad</label>
                  <select value={newTaskPriority} onChange={e => setNewTaskPriority(e.target.value as any)} className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500">
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta 🔥</option>
                    <option value="urgent">Urgente ⚡</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAddTaskModal(false)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-lg shadow-indigo-600/30">Guardar en Agenda</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Tarea Diaria */}
      {editingDailyTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-emerald-400" />
                Editar Tarea Diaria
              </h3>
              <button onClick={() => setEditingDailyTask(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveEditDaily} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Título *</label>
                <input
                  type="text"
                  required
                  value={editingDailyTask.title}
                  onChange={e => setEditingDailyTask({ ...editingDailyTask, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Prioridad</label>
                <select
                  value={editingDailyTask.priority}
                  onChange={e => setEditingDailyTask({ ...editingDailyTask, priority: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="low">Baja</option>
                  <option value="medium">Media</option>
                  <option value="high">Alta 🔥</option>
                  <option value="urgent">Urgente ⚡</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingDailyTask(null)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-lg shadow-emerald-600/30">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Editar Entrega Universitaria */}
      {editingUniTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-purple-400" />
                Editar Entrega Universitaria
              </h3>
              <button onClick={() => setEditingUniTask(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>
            <form onSubmit={handleSaveEditUni} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">Título *</label>
                <input
                  type="text"
                  required
                  value={editingUniTask.title}
                  onChange={e => setEditingUniTask({ ...editingUniTask, title: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              {courses.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Curso</label>
                  <select
                    value={editingUniTask.courseId}
                    onChange={e => setEditingUniTask({ ...editingUniTask, courseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {courses.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={editingUniTask.dueDate}
                    onChange={e => setEditingUniTask({ ...editingUniTask, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1.5">Prioridad</label>
                  <select
                    value={editingUniTask.priority}
                    onChange={e => setEditingUniTask({ ...editingUniTask, priority: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta 🔥</option>
                    <option value="urgent">Urgente ⚡</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditingUniTask(null)} className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300">Cancelar</button>
                <button type="submit" className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-xs font-bold text-white shadow-lg shadow-purple-600/30">Guardar Cambios</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={Boolean(pendingDailyUpdate)}
        title="¿Actualizar tarea diaria?"
        description={`¿Deseas guardar los cambios en la tarea "${pendingDailyUpdate?.payload?.title}"?`}
        confirmLabel="Sí, actualizar"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmDailyUpdate}
        onCancel={() => setPendingDailyUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteDaily)}
        title="¿Eliminar tarea diaria?"
        description={`¿Estás seguro de que deseas eliminar la tarea "${confirmDeleteDaily?.title}"?`}
        confirmLabel="Sí, eliminar tarea"
        cancelLabel="Conservar"
        variant="danger"
        onConfirm={handleConfirmDeleteDaily}
        onCancel={() => setConfirmDeleteDaily(null)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingUniUpdate)}
        title="¿Actualizar entrega universitaria?"
        description={`¿Deseas guardar las modificaciones en "${pendingUniUpdate?.payload?.title}"?`}
        confirmLabel="Sí, actualizar"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmUniUpdate}
        onCancel={() => setPendingUniUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteUni)}
        title="¿Eliminar entrega universitaria?"
        description={`¿Estás seguro de eliminar "${confirmDeleteUni?.title}" de la agenda?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteUni}
        onCancel={() => setConfirmDeleteUni(null)}
      />
    </div>
  );
};

export default CalendarView;
