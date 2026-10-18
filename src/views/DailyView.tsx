import React, { useEffect, useState } from 'react';
import {
  Calendar,
  Plus,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Filter,
  Sparkles,
  Bell,
  Search,
  Pencil,
  Edit3
} from 'lucide-react';
import StorageService, { isItemCompleted } from '../services/StorageService';
import AudioService from '../services/AudioService';
import { DailyTask, Priority, TaskRarity } from '../types';
import { RARITY_CONFIG, PRIORITY_CONFIG } from '../styles/theme';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal';

export const DailyView: React.FC = () => {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRarity, setSelectedRarity] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [rarity, setRarity] = useState<TaskRarity>('common');
  const [estimatedMinutes, setEstimatedMinutes] = useState(30);
  const [hasTime, setHasTime] = useState(false);
  const [timeHour, setTimeHour] = useState(14);
  const [timeMin, setTimeMin] = useState(0);

  // Confirmation Modals State
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<DailyTask | null>(null);
  const [pendingUpdateData, setPendingUpdateData] = useState<{ id: string; payload: Partial<DailyTask> } | null>(null);

  const loadTasks = async () => {
    const list = await StorageService.getDailyTasks();
    setTasks(list);
  };

  useEffect(() => {
    loadTasks();
    const unsub = StorageService.on('DATA_UPDATED', loadTasks);
    return () => unsub();
  }, []);

  const handleToggle = async (id: string) => {
    // Optimistic UI update for instant feedback
    setTasks(prev => prev.map(t => {
      if (t.id === id) {
        const currentlyDone = isItemCompleted(t);
        return {
          ...t,
          completed: !currentlyDone,
          completedDates: !currentlyDone
            ? [...(t.completedDates || []), new Date().toDateString(), new Date().toISOString().split('T')[0]]
            : (t.completedDates || []).filter(d => d !== new Date().toDateString() && d !== new Date().toISOString().split('T')[0])
        };
      }
      return t;
    }));

    const res = await StorageService.toggleDailyTaskCompletion(id);
    if (res?.isCompleted) {
      AudioService.playCheck();
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.7 } });
    }
    loadTasks();
  };

  const handleOpenCreateModal = () => {
    setEditingTaskId(null);
    setTitle('');
    setDescription('');
    setPriority('medium');
    setRarity('common');
    setEstimatedMinutes(30);
    setHasTime(false);
    setTimeHour(14);
    setTimeMin(0);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: DailyTask) => {
    setEditingTaskId(task.id);
    setTitle(task.title);
    setDescription(task.description || '');
    setPriority(task.priority || 'medium');
    setRarity(task.rarity || 'common');
    setEstimatedMinutes(task.estimatedMinutes || 30);
    setHasTime(!!task.hasTime);
    setTimeHour(task.timeHour ?? 14);
    setTimeMin(task.timeMin ?? 0);
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingTaskId) {
      // Prompt confirmation before updating
      setPendingUpdateData({
        id: editingTaskId,
        payload: {
          title: title.trim(),
          description: description.trim() || undefined,
          priority,
          rarity,
          estimatedMinutes,
          hasTime,
          timeHour: hasTime ? timeHour : undefined,
          timeMin: hasTime ? timeMin : undefined,
          hasAlarm: hasTime,
        }
      });
    } else {
      // Direct create
      await StorageService.saveDailyTask({
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        rarity,
        estimatedMinutes,
        hasTime,
        timeHour: hasTime ? timeHour : undefined,
        timeMin: hasTime ? timeMin : undefined,
        hasAlarm: hasTime,
      });

      setIsModalOpen(false);
      AudioService.playLevelUp();
      loadTasks();
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdateData) return;
    await StorageService.updateDailyTask(pendingUpdateData.id, pendingUpdateData.payload);
    AudioService.playCheck();
    setPendingUpdateData(null);
    setIsModalOpen(false);
    loadTasks();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteTask) return;
    await StorageService.deleteDailyTask(confirmDeleteTask.id);
    AudioService.playDelete();
    setConfirmDeleteTask(null);
    loadTasks();
  };

  const completedTodayCount = tasks.filter(t => isItemCompleted(t)).length;
  const totalTasksCount = tasks.length;
  const progressPercent = totalTasksCount > 0 ? Math.round((completedTodayCount / totalTasksCount) * 100) : 0;

  const filteredTasks = tasks.filter(t => {
    const isCompleted = isItemCompleted(t);
    if (filter === 'pending' && isCompleted) return false;
    if (filter === 'completed' && !isCompleted) return false;
    if (selectedRarity !== 'all' && t.rarity !== selectedRarity) return false;
    if (searchQuery.trim() && !t.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Calendar className="w-7 h-7 text-primary" /> Mi Día (Actividades Diarias)
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Organiza tus metas diarias, gana XP y mantén tus rachas activas en PC y Celular.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg shadow-primary/30 hover:brightness-110 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nueva Tarea Diaria
        </button>
      </div>

      {/* Daily Progress Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-purple-900/15 to-accent/10 border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-300">
            <span>Progreso del Día:</span>
            <span className="text-accent font-mono text-sm">{completedTodayCount} de {totalTasksCount} tareas</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-mono font-bold">{progressPercent}%</span>
          </div>
          <div className="w-full sm:w-80 h-2 bg-black/40 rounded-full overflow-hidden p-0.5 border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-primary via-purple-500 to-accent rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Quick Search */}
        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar tarea..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1">
          {(['all', 'pending', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                filter === f
                  ? 'bg-primary text-white shadow-md shadow-primary/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'Todas' : f === 'pending' ? 'Pendientes' : 'Completadas'}
            </button>
          ))}
        </div>

        {/* Filter by Rarity */}
        <div className="flex items-center gap-2 text-xs">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            value={selectedRarity}
            onChange={(e) => setSelectedRarity(e.target.value)}
            className="bg-black/40 border border-white/10 rounded-xl px-2.5 py-1.5 text-gray-200 text-xs focus:outline-none focus:border-primary"
          >
            <option value="all">Todas las Rarezas</option>
            <option value="common">Común (+20 XP)</option>
            <option value="uncommon">Poco Común (+35 XP)</option>
            <option value="rare">Rara (+60 XP)</option>
            <option value="epic">Épica (+100 XP)</option>
            <option value="legendary">Legendaria (+200 XP)</option>
          </select>
        </div>
      </div>

      {/* Tasks Grid / List */}
      <div className="space-y-3">
        {filteredTasks.map((task) => {
          const isCompleted = isItemCompleted(task);
          const rarityConfig = RARITY_CONFIG[task.rarity || 'common'];
          const priorityConfig = PRIORITY_CONFIG[task.priority || 'medium'];

          return (
            <div
              key={task.id}
              className={`group p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                isCompleted
                  ? 'bg-white/[0.02] border-white/5 opacity-60'
                  : 'bg-white/[0.04] border-white/10 hover:border-primary/50 hover:bg-white/[0.07] shadow-lg shadow-black/20'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0 flex-1">
                <button
                  onClick={() => handleToggle(task.id)}
                  className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all"
                  title={isCompleted ? "Marcar como pendiente" : "Marcar como completada"}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                  ) : (
                    <Circle className="w-6 h-6 text-gray-500 hover:text-primary transition-colors" />
                  )}
                </button>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <h3 className={`text-base font-bold truncate ${isCompleted ? 'line-through text-gray-400' : 'text-white'}`}>
                    {task.title}
                  </h3>
                  {task.description && (
                    <p className="text-xs text-gray-400 line-clamp-1">{task.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${rarityConfig.bg} border ${rarityConfig.border}`}>
                      {rarityConfig.name}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${priorityConfig.bg} border ${priorityConfig.border}`}>
                      {priorityConfig.label}
                    </span>
                    {task.hasTime && (
                      <span className="text-xs text-amber-300 flex items-center gap-1 font-mono bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                        <Bell className="w-3 h-3 text-amber-400" />
                        {String(task.timeHour).padStart(2, '0')}:{String(task.timeMin).padStart(2, '0')}
                      </span>
                    )}
                    {task.estimatedMinutes && (
                      <span className="text-xs text-gray-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3 text-gray-500" /> {task.estimatedMinutes} min
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & XP Reward */}
              <div className="flex items-center gap-3 shrink-0">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-mono font-bold text-amber-400 block">+{rarityConfig.xp} XP</span>
                  <span className="text-[10px] text-gray-500">{(task.streak || 0)} días racha</span>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditModal(task)}
                  className="opacity-80 group-hover:opacity-100 p-2 rounded-xl text-gray-400 hover:text-primary-light hover:bg-primary/10 transition-all"
                  title="Editar tarea diaria"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setConfirmDeleteTask(task)}
                  className="opacity-80 group-hover:opacity-100 p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all"
                  title="Eliminar tarea diaria"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-16 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
            <Calendar className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-gray-400 text-sm font-medium">No hay tareas en esta categoría.</p>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs text-primary-light font-bold hover:underline"
            >
              + Agregar nueva tarea diaria
            </button>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Tarea */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F1225] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h2 className="text-lg font-extrabold text-white flex items-center gap-2">
                {editingTaskId ? (
                  <>
                    <Edit3 className="w-5 h-5 text-primary-light" /> Editar Tarea Diaria
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 text-primary" /> Crear Tarea Diaria
                  </>
                )}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Título de la Actividad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Estudiar Cálculo Integral, Ir al gym..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Descripción (Opcional)</label>
                <textarea
                  rows={2}
                  placeholder="Detalles adicionales o notas..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-2 text-white text-xs focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Prioridad</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente 🔥</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Rareza RPG</label>
                  <select
                    value={rarity}
                    onChange={(e) => setRarity(e.target.value as TaskRarity)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-primary"
                  >
                    <option value="common">Común (+20 XP)</option>
                    <option value="uncommon">Poco Común (+35 XP)</option>
                    <option value="rare">Rara (+60 XP)</option>
                    <option value="epic">Épica (+100 XP)</option>
                    <option value="legendary">Legendaria (+200 XP)</option>
                  </select>
                </div>
              </div>

              {/* Time & Alarm Switch */}
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" /> Programar Hora y Alarma
                  </span>
                  <input
                    type="checkbox"
                    checked={hasTime}
                    onChange={(e) => setHasTime(e.target.checked)}
                    className="w-4 h-4 accent-primary rounded cursor-pointer"
                  />
                </div>

                {hasTime && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex-1">
                      <label className="block text-[11px] text-gray-400 mb-1">Hora (0-23)</label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={timeHour}
                        onChange={(e) => setTimeHour(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] text-gray-400 mb-1">Minuto (0-59)</label>
                      <input
                        type="number"
                        min={0}
                        max={59}
                        value={timeMin}
                        onChange={(e) => setTimeMin(Number(e.target.value))}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-white font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/30 hover:brightness-110"
                >
                  {editingTaskId ? 'Guardar Cambios' : 'Crear Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Update Modal */}
      <ConfirmModal
        isOpen={!!pendingUpdateData}
        type="primary"
        title="¿Confirmar Actualización de Tarea?"
        message={`¿Deseas guardar los cambios aplicados a "${title}"? Todos los dispositivos sincronizados recibirán la nueva información.`}
        confirmText="Guardar Cambios"
        cancelText="Revisar"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setPendingUpdateData(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteTask}
        type="danger"
        title="¿Eliminar Tarea Diaria?"
        message={`¿Estás seguro de que deseas eliminar permanentemente la tarea "${confirmDeleteTask?.title}"? Esta acción no se puede deshacer.`}
        confirmText="Eliminar Tarea"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteTask(null)}
      />
    </div>
  );
};

export default DailyView;
