import React, { useEffect, useState } from 'react';
import {
  GraduationCap,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Calendar,
  Filter,
  Search,
  BookOpen,
  AlertCircle,
  Sparkles,
  Edit2,
  Trash2,
  Check
} from 'lucide-react';
import StorageService from '../services/StorageService';
import AudioService from '../services/AudioService';
import { Course, UniversityTask, Priority } from '../types';
import { PRIORITY_CONFIG } from '../styles/theme';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal';

interface TasksViewProps {
  onNavigateCourse?: (courseId: string) => void;
}

export const TasksView: React.FC<TasksViewProps> = ({ onNavigateCourse }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<UniversityTask[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourseFilter, setSelectedCourseFilter] = useState('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'all' | 'task' | 'exam' | 'project' | 'lab'>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'pending' | 'completed' | 'all'>('pending');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<UniversityTask | null>(null);

  // Form State
  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskType, setTaskType] = useState<'task' | 'exam' | 'project' | 'lab'>('task');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState<Priority>('high');
  const [taskWeight, setTaskWeight] = useState('20');
  const [taskNotes, setTaskNotes] = useState('');

  const loadData = async () => {
    const [c, t] = await Promise.all([
      StorageService.getCourses(),
      StorageService.getUniversityTasks()
    ]);
    setCourses(c);
    setTasks(t);
    if (c.length > 0 && !taskCourseId) {
      setTaskCourseId(c[0].id);
    }
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.on('DATA_UPDATED', loadData);
    return () => unsub();
  }, []);

  const getCourse = (courseId: string) => courses.find(c => c.id === courseId);

  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskCourseId(courses[0]?.id || 'general');
    setTaskType('task');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
    setTaskPriority('high');
    setTaskWeight('20');
    setTaskNotes('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: UniversityTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskCourseId(task.courseId);
    setTaskType(task.type);
    setTaskDueDate(task.dueDate);
    setTaskPriority(task.priority);
    setTaskWeight(String(task.weightPercentage || 20));
    setTaskNotes(task.notes?.[0]?.content || '');
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const course = getCourse(taskCourseId);
    const courseName = course?.name || 'Materia General';

    const payload = {
      title: taskTitle.trim(),
      courseId: taskCourseId || 'general',
      courseName,
      type: taskType,
      dueDate: taskDueDate,
      priority: taskPriority,
      weightPercentage: Number(taskWeight) || 20,
      rarity: taskType === 'exam' ? 'legendary' : taskType === 'project' ? 'epic' : 'rare',
      notes: taskNotes.trim() ? [{ id: `note_${Date.now()}`, title: 'Apuntes', content: taskNotes.trim() }] : undefined
    };

    if (editingTaskId) {
      await StorageService.updateUniversityTask(editingTaskId, payload as any);
      AudioService.playCheck();
    } else {
      await StorageService.saveUniversityTask(payload as any);
      AudioService.playLevelUp();
    }

    setIsModalOpen(false);
    loadData();
  };

  const handleToggleTask = async (id: string) => {
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        return { ...t, completed: !t.completed };
      }
      return t;
    }));

    AudioService.playCheck();
    const res = await StorageService.toggleUniversityTask(id);
    if (res?.completed) {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.7 } });
    }
    loadData();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTask) return;
    await StorageService.deleteUniversityTask(confirmDeleteTask.id);
    AudioService.playDelete();
    setConfirmDeleteTask(null);
    loadData();
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchCourse = (task.courseName || '').toLowerCase().includes(q);
      if (!matchTitle && !matchCourse) return false;
    }
    // Course filter
    if (selectedCourseFilter !== 'all' && task.courseId !== selectedCourseFilter) {
      return false;
    }
    // Type filter
    if (selectedTypeFilter !== 'all' && task.type !== selectedTypeFilter) {
      return false;
    }
    // Status filter
    if (selectedStatusFilter === 'pending' && task.completed) return false;
    if (selectedStatusFilter === 'completed' && !task.completed) return false;

    return true;
  }).sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const pendingCount = tasks.filter(t => !t.completed).length;
  const completedCount = tasks.filter(t => t.completed).length;
  const examCount = tasks.filter(t => !t.completed && t.type === 'exam').length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/40 via-slate-900/60 to-indigo-950/40 p-6 rounded-3xl border border-purple-500/20 backdrop-blur-2xl shadow-xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Tareas & Entregables Universitarios 📝</h1>
            <p className="text-xs text-gray-300 mt-0.5">
              Gestiona todas tus entregas, proyectos, prácticas y exámenes sincronizados con tu celular.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-black shadow-lg shadow-purple-500/30 hover:brightness-110 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" /> Nuevo Entregable
        </button>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Tareas Pendientes</span>
            <p className="text-2xl font-black text-white font-mono">{pendingCount}</p>
          </div>
          <Clock className="w-8 h-8 text-amber-400/80" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Próximos Exámenes</span>
            <p className="text-2xl font-black text-rose-400 font-mono">{examCount}</p>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-400/80" />
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex items-center justify-between">
          <div>
            <span className="text-xs text-gray-400">Entregables Completados</span>
            <p className="text-2xl font-black text-emerald-400 font-mono">{completedCount}</p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-400/80" />
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por título o materia..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:border-purple-400 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Status filter */}
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setSelectedStatusFilter('pending')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'pending' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Pendientes
            </button>
            <button
              onClick={() => setSelectedStatusFilter('completed')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'completed' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Completadas
            </button>
            <button
              onClick={() => setSelectedStatusFilter('all')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                selectedStatusFilter === 'all' ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              Todas
            </button>
          </div>

          {/* Course filter select */}
          <select
            value={selectedCourseFilter}
            onChange={(e) => setSelectedCourseFilter(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-purple-400"
          >
            <option value="all">Todas las materias</option>
            {courses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Type filter select */}
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
            className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-medium focus:border-purple-400"
          >
            <option value="all">Todos los tipos</option>
            <option value="task">Tareas</option>
            <option value="exam">Exámenes</option>
            <option value="project">Proyectos</option>
            <option value="lab">Laboratorios</option>
          </select>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const course = getCourse(task.courseId);
          const priority = PRIORITY_CONFIG[task.priority || 'high'];
          const isExam = task.type === 'exam';
          const isProject = task.type === 'project';
          const isLab = task.type === 'lab';

          return (
            <div
              key={task.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none ${
                task.completed
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : 'bg-white/[0.04] border-white/10 hover:border-purple-500/40 hover:bg-white/[0.06]'
              }`}
              style={{ borderLeftColor: course?.color || '#a855f7', borderLeftWidth: '4px' }}
            >
              <div className="flex items-start sm:items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => handleToggleTask(task.id)}
                  className="mt-0.5 sm:mt-0 shrink-0 text-gray-500 hover:text-purple-400 transition-colors"
                >
                  {task.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5" />
                  )}
                </button>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-sm font-bold truncate ${task.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                      {task.title}
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                    <span
                      className="text-[11px] font-bold px-2 py-0.5 rounded-md"
                      style={{ backgroundColor: `${course?.color || '#a855f7'}20`, color: course?.color || '#c084fc' }}
                    >
                      {course?.name || task.courseName || 'Materia General'}
                    </span>

                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded ${
                      isExam
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : isProject
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : isLab
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                    }`}>
                      {isExam ? 'Examen' : isProject ? 'Proyecto' : isLab ? 'Laboratorio' : 'Tarea'}
                    </span>

                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase ${priority.bg} border ${priority.border}`}>
                      {priority.label}
                    </span>

                    <span className="text-[11px] font-mono text-gray-300 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      {task.dueDate}
                    </span>

                    {task.weightPercentage && (
                      <span className="text-[10px] font-mono font-bold text-accent">
                        {task.weightPercentage}% de nota
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions Button Group */}
              <div className="flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenEditModal(task)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all text-xs"
                  title="Editar tarea"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTask(task)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 text-gray-300 hover:text-rose-400 transition-all text-xs"
                  title="Eliminar tarea"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
            <GraduationCap className="w-12 h-12 text-gray-600 mx-auto" />
            <p className="text-gray-400 text-sm">No se encontraron entregables con los filtros seleccionados.</p>
            <button
              onClick={handleOpenCreateModal}
              className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Crear Nuevo Entregable
            </button>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181824] border border-purple-500/30 rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-2xl animate-scaleIn">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-purple-400" />
              {editingTaskId ? 'Editar Entregable Universitario' : 'Nuevo Entregable Universitario'}
            </h2>

            <form onSubmit={handleSaveTask} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Título de la Tarea / Examen</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Informe de Laboratorio 3, Parcial de Cálculo..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Materia / Curso</label>
                  <select
                    value={taskCourseId}
                    onChange={(e) => setTaskCourseId(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                  >
                    {courses.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Tipo de Entregable</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                  >
                    <option value="task">Tarea / Práctica</option>
                    <option value="exam">Examen / Evaluación</option>
                    <option value="project">Proyecto / Trabajo Final</option>
                    <option value="lab">Laboratorio</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    required
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">Prioridad</label>
                  <select
                    value={taskPriority}
                    onChange={(e) => setTaskPriority(e.target.value as any)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                  >
                    <option value="high">Alta</option>
                    <option value="medium">Media</option>
                    <option value="low">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-300 block mb-1">% del Curso</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={taskWeight}
                    onChange={(e) => setTaskWeight(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:border-purple-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-300 block mb-1">Instrucciones o Apuntes (Opcional)</label>
                <textarea
                  rows={3}
                  placeholder="Detalles de la entrega, rúbrica o enlaces..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white focus:border-purple-400 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-500/20 hover:brightness-110 transition-all"
                >
                  {editingTaskId ? 'Guardar Cambios' : 'Crear Entregable'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDeleteTask && (
        <ConfirmModal
          isOpen={true}
          title="Eliminar Entregable Universitario"
          message={`¿Estás seguro de eliminar "${confirmDeleteTask.title}"? Esta acción se sincronizará con tu celular.`}
          confirmText="Eliminar"
          onConfirm={handleConfirmDelete}
          onCancel={() => setConfirmDeleteTask(null)}
        />
      )}
    </div>
  );
};
