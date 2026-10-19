import React, { useEffect, useState } from 'react';
import {
  Sparkles,
  Flame,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  TrendingUp,
  Activity,
  Award,
  Search,
  Filter,
  Pencil,
  Edit3
} from 'lucide-react';
import StorageService, { isItemCompleted } from '../services/StorageService';
import AudioService from '../services/AudioService';
import { Habit, Priority } from '../types';
import confetti from 'canvas-confetti';
import ConfirmModal from '../components/ConfirmModal';

export const HabitsView: React.FC = () => {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabitId, setEditingHabitId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Salud & Fitness');
  const [description, setDescription] = useState('');

  // Confirmation modals state
  const [confirmDeleteHabit, setConfirmDeleteHabit] = useState<Habit | null>(null);
  const [pendingUpdateData, setPendingUpdateData] = useState<{ id: string; payload: Partial<Habit> } | null>(null);

  const loadHabits = async () => {
    const list = await StorageService.getHabits();
    setHabits(list);
  };

  useEffect(() => {
    loadHabits();
    const unsub = StorageService.on('DATA_UPDATED', loadHabits);
    return () => unsub();
  }, []);

  const handleToggle = async (id: string, targetDate = new Date()) => {
    // Optimistic UI update
    setHabits(prev => prev.map(h => {
      if (h.id === id) {
        const currentlyDone = isItemCompleted(h, targetDate);
        const dStr = targetDate.toDateString();
        const isoStr = targetDate.toISOString().split('T')[0];
        return {
          ...h,
          completedDates: !currentlyDone
            ? [...(h.completedDates || []), dStr, isoStr]
            : (h.completedDates || []).filter(d => d !== dStr && d !== isoStr)
        };
      }
      return h;
    }));

    const res = await StorageService.toggleHabit(id, targetDate);
    if (res?.isCompleted) {
      AudioService.playCheck();
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.7 } });
    }
    loadHabits();
  };

  const handleOpenCreateModal = () => {
    setEditingHabitId(null);
    setTitle('');
    setDescription('');
    setCategory('Salud & Fitness');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (habit: Habit) => {
    setEditingHabitId(habit.id);
    setTitle(habit.title);
    setDescription(habit.description || '');
    setCategory(habit.category || 'Salud & Fitness');
    setIsModalOpen(true);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (editingHabitId) {
      // Prompt confirmation before update
      setPendingUpdateData({
        id: editingHabitId,
        payload: {
          title: title.trim(),
          category,
          description: description.trim() || undefined,
        }
      });
    } else {
      // Create new habit
      await StorageService.saveHabit({
        title: title.trim(),
        category,
        description: description.trim() || undefined,
        priority: 'medium',
      });

      setTitle('');
      setDescription('');
      setIsModalOpen(false);
      AudioService.playLevelUp();
      loadHabits();
    }
  };

  const handleConfirmUpdate = async () => {
    if (!pendingUpdateData) return;
    await StorageService.updateHabit(pendingUpdateData.id, pendingUpdateData.payload);
    AudioService.playCheck();
    setPendingUpdateData(null);
    setIsModalOpen(false);
    loadHabits();
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteHabit) return;
    await StorageService.deleteHabit(confirmDeleteHabit.id);
    AudioService.playDelete();
    setConfirmDeleteHabit(null);
    loadHabits();
  };

  // Generate last 7 days strings
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return {
      dateObj: d,
      dateStr: d.toDateString(),
      dayLabel: d.toLocaleDateString('es-PE', { weekday: 'narrow' }),
      isToday: i === 6,
    };
  });

  const categories = ['all', 'Salud & Fitness', 'Estudio & Lectura', 'Productividad', 'Descanso & Sueño', 'Mentalidad & Disciplina'];

  const filteredHabits = habits.filter(h => {
    if (selectedCategory !== 'all' && h.category !== selectedCategory) return false;
    if (searchQuery.trim() && !h.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const completedTodayCount = habits.filter(h => isItemCompleted(h)).length;
  const totalHabitsCount = habits.length;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Flame className="w-7 h-7 text-rose-500" /> Hábitos & Disciplina
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Construye hábitos inquebrantables. Cada día cumplido suma XP y mantiene tus rachas de fuego.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-500/30 hover:brightness-110 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" /> Nuevo Hábito
        </button>
      </div>

      {/* Progress & Search Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 via-purple-950/20 to-amber-950/20 border border-rose-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
            <Flame className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <p className="text-xs text-gray-300 font-bold">Hábitos Cumplidos Hoy</p>
            <p className="text-base font-black text-rose-300 font-mono">
              {completedTodayCount} de {totalHabitsCount} activos
            </p>
          </div>
        </div>

        <div className="relative flex items-center w-full sm:w-64">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar hábito..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-gray-500 focus:outline-none focus:border-rose-500"
          />
        </div>
      </div>

      {/* Category Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {categories.map((cat) => {
          const isSel = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                isSel
                  ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white border-rose-400 shadow-md shadow-rose-500/20'
                  : 'bg-white/[0.03] text-gray-400 border-white/5 hover:text-white hover:bg-white/[0.08]'
              }`}
            >
              {cat === 'all' ? 'Todos los Hábitos' : cat}
            </button>
          );
        })}
      </div>

      {/* Habits List */}
      <div className="space-y-3">
        {filteredHabits.map((habit) => {
          const isCompletedToday = isItemCompleted(habit);

          return (
            <div
              key={habit.id}
              className={`group p-5 rounded-3xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                isCompletedToday
                  ? 'bg-rose-950/20 border-rose-500/30 shadow-lg shadow-rose-950/20'
                  : 'bg-white/[0.04] border-white/10 hover:border-rose-500/30'
              }`}
            >
              {/* Left Title & Status */}
              <div className="flex items-center gap-4 min-w-0">
                <button
                  onClick={() => handleToggle(habit.id)}
                  className="p-1 rounded-xl hover:bg-white/10 transition-all shrink-0"
                  title={isCompletedToday ? "Desmarcar hábito hoy" : "Marcar hábito hoy"}
                >
                  {isCompletedToday ? (
                    <CheckCircle2 className="w-7 h-7 text-rose-400" />
                  ) : (
                    <Circle className="w-7 h-7 text-gray-500 hover:text-rose-400 transition-colors" />
                  )}
                </button>

                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-extrabold truncate ${isCompletedToday ? 'text-rose-200' : 'text-white'}`}>
                      {habit.title}
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                      {habit.category || 'General'}
                    </span>
                  </div>
                  {habit.description && (
                    <p className="text-xs text-gray-400 line-clamp-1">{habit.description}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {isCompletedToday ? '✅ Cumplido hoy (+25 XP)' : 'Pendiente de marcar hoy'}
                  </p>
                </div>
              </div>

              {/* 7 Days Matrix & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-5 pt-3 md:pt-0 border-t md:border-t-0 border-white/5">
                {/* 7 Days Interactive Dots */}
                <div className="flex items-center gap-1.5">
                  {last7Days.map((day, idx) => {
                    const done = isItemCompleted(habit, day.dateObj);
                    return (
                      <button
                        key={idx}
                        onClick={() => handleToggle(habit.id, day.dateObj)}
                        className="flex flex-col items-center gap-1 group/dot cursor-pointer"
                        title={`Marcar/Desmarcar ${day.dateStr}`}
                      >
                        <span className="text-[10px] font-mono uppercase text-gray-400 group-hover/dot:text-white transition-colors">{day.dayLabel}</span>
                        <div
                          className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold transition-all ${
                            done
                              ? 'bg-rose-500 text-white shadow-sm shadow-rose-500/50'
                              : day.isToday
                              ? 'bg-white/10 border border-white/20 text-gray-400 group-hover/dot:border-rose-400'
                              : 'bg-black/30 text-gray-600 group-hover/dot:bg-white/10'
                          }`}
                        >
                          {done ? '✓' : '•'}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Streak Badge */}
                <div className="flex items-center gap-2 bg-black/40 px-3 py-2 rounded-2xl border border-rose-500/20">
                  <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                  <div>
                    <span className="text-sm font-black text-rose-300 font-mono leading-none block">
                      {habit.streak || 0}
                    </span>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">días</span>
                  </div>
                </div>

                {/* Edit Button */}
                <button
                  onClick={() => handleOpenEditModal(habit)}
                  className="opacity-80 group-hover:opacity-100 p-2 rounded-xl text-gray-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
                  title="Editar hábito"
                >
                  <Pencil className="w-4 h-4" />
                </button>

                {/* Delete Button */}
                <button
                  onClick={() => setConfirmDeleteHabit(habit)}
                  className="opacity-80 group-hover:opacity-100 p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                  title="Eliminar hábito"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}

        {habits.length === 0 && (
          <div className="text-center py-16 rounded-3xl bg-white/[0.02] border border-white/5 space-y-3">
            <Flame className="w-10 h-10 text-gray-600 mx-auto" />
            <p className="text-gray-400 text-sm font-medium">No tienes hábitos activos en tu rutina.</p>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs text-rose-400 font-bold hover:underline"
            >
              + Crear mi primer hábito diario
            </button>
          </div>
        )}
      </div>

      {/* Modal Crear / Editar Hábito */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0F1225] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                {editingHabitId ? (
                  <>
                    <Edit3 className="w-5 h-5 text-amber-400" /> Editar Hábito
                  </>
                ) : (
                  <>
                    <Flame className="w-5 h-5 text-rose-500" /> Crear Nuevo Hábito
                  </>
                )}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSubmitForm} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre del Hábito *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Tomar 2L de agua, Leer 20 min, Dormir a las 11 PM..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Descripción / Motivo (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ej: Para mantener energía todo el día..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="Salud & Fitness">Salud & Fitness 🏃</option>
                  <option value="Estudio & Lectura">Estudio & Lectura 📚</option>
                  <option value="Productividad">Productividad ⚡</option>
                  <option value="Descanso & Sueño">Descanso & Sueño 🌙</option>
                  <option value="Mentalidad & Disciplina">Mentalidad & Disciplina 🧘</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold shadow-md shadow-rose-500/30 hover:brightness-110"
                >
                  {editingHabitId ? 'Guardar Cambios' : 'Guardar Hábito'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Update Modal */}
      <ConfirmModal
        isOpen={!!pendingUpdateData}
        type="warning"
        title="¿Confirmar Actualización de Hábito?"
        message={`¿Deseas guardar los cambios en el hábito "${title}"? Tu racha y avance se mantendrán intactos.`}
        confirmText="Guardar Cambios"
        cancelText="Revisar"
        onConfirm={handleConfirmUpdate}
        onCancel={() => setPendingUpdateData(null)}
      />

      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!confirmDeleteHabit}
        type="danger"
        title="¿Eliminar Hábito?"
        message={`¿Estás seguro de que deseas eliminar el hábito "${confirmDeleteHabit?.title}"? Se perderá el conteo de ${confirmDeleteHabit?.streak || 0} días de racha acumulada.`}
        confirmText="Eliminar Hábito"
        cancelText="Cancelar"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteHabit(null)}
      />
    </div>
  );
};

export default HabitsView;
