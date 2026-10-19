import React, { useEffect, useState, useRef } from 'react';
import {
  Clock,
  Plus,
  Calendar as CalendarIcon,
  Trash2,
  MapPin,
  BookOpen,
  User,
  Sparkles,
  RefreshCw,
  Upload,
  Download,
  Image as ImageIcon,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Maximize2,
  ChevronRight,
  Info,
  Search,
  Check
} from 'lucide-react';
import StorageService from '../services/StorageService';
import SyncEngine, { SyncStatus } from '../services/SyncEngine';
import AudioService from '../services/AudioService';
import { Course, ScheduleBlock } from '../types';
import {
  DAYS_NAMES,
  FULL_DAYS_NAMES,
  FlatScheduleInstance,
  NextClassInfo,
  flattenScheduleBlocks,
  getNextUniversityClass,
  getTodayClasses,
  formatTime12h,
  parseTimeToMinutes,
  normalizeDayName
} from '../utils/scheduleHelper';
import ConfirmModal from '../components/ConfirmModal';

interface ScheduleViewProps {
  onNavigateCourse?: (courseId: string) => void;
}

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onNavigateCourse }) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [scheduleImage, setScheduleImage] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [viewMode, setViewMode] = useState<'grid' | 'agenda' | 'image'>('grid');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchFilter, setSearchFilter] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedInstanceDetails, setSelectedInstanceDetails] = useState<FlatScheduleInstance | null>(null);

  // Confirmation States
  const [confirmDeleteBlock, setConfirmDeleteBlock] = useState<{ id: string; name: string } | null>(null);
  const [confirmDeleteImage, setConfirmDeleteImage] = useState(false);
  const [pendingBlockUpdate, setPendingBlockUpdate] = useState<{ id: string; payload: Partial<ScheduleBlock> } | null>(null);

  // Form State
  const [courseNameInput, setCourseNameInput] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366f1');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Lun']);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [classroom, setClassroom] = useState('');
  const [location, setLocation] = useState('');
  const [professor, setProfessor] = useState('');
  const [hasCustomDays, setHasCustomDays] = useState(false);
  const [dayOverrides, setDayOverrides] = useState<Record<string, { startTime: string; endTime: string; classroom: string; location: string }>>({});

  // File Input Ref for JSON and Image upload
  const jsonFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    const [c, b, img] = await Promise.all([
      StorageService.getCourses(),
      StorageService.getScheduleBlocks(),
      StorageService.getScheduleImage()
    ]);
    setCourses(c);
    setBlocks(b);
    setScheduleImage(img);
  };

  useEffect(() => {
    loadData();
    const unsubStorage = StorageService.on('DATA_UPDATED', loadData);
    const unsubSync = SyncEngine.subscribe(setSyncStatus);

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);

    return () => {
      unsubStorage();
      unsubSync();
      clearInterval(timer);
    };
  }, []);

  const rawFlatInstances = flattenScheduleBlocks(blocks);
  const flatInstances = searchFilter.trim()
    ? rawFlatInstances.filter(inst =>
        inst.courseName.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (inst.professor && inst.professor.toLowerCase().includes(searchFilter.toLowerCase())) ||
        (inst.classroom && inst.classroom.toLowerCase().includes(searchFilter.toLowerCase()))
      )
    : rawFlatInstances;

  const nextClass = getNextUniversityClass(blocks, currentTime);
  const todayClasses = getTodayClasses(blocks, currentTime);

  // Dynamic Hour Range Calculation
  const minHour = Math.min(6, ...flatInstances.map(i => Math.floor(i.startMinutes / 60)).filter(h => !isNaN(h)));
  const maxHour = Math.max(21, ...flatInstances.map(i => Math.ceil(i.endMinutes / 60)).filter(h => !isNaN(h)));
  const displayStartHour = Math.max(5, minHour);
  const displayEndHour = Math.min(23, Math.max(displayStartHour + 10, maxHour));
  const totalHoursCount = displayEndHour - displayStartHour + 1;
  const HOUR_HEIGHT = 70; // px per hour slot

  const todayDayIndex = (currentTime.getDay() + 6) % 7; // 0=Lun ... 6=Dom
  const nowMinutes = currentTime.getHours() * 60 + currentTime.getMinutes();
  const isNowInScheduleRange = nowMinutes >= displayStartHour * 60 && nowMinutes <= (displayEndHour + 1) * 60;
  const currentTimelineTop = ((nowMinutes - displayStartHour * 60) / 60) * HOUR_HEIGHT;

  const handleOpenCreateModal = () => {
    setEditingBlockId(null);
    setCourseNameInput(courses[0]?.name || '');
    setSelectedCourseId(courses[0]?.id || '');
    setSelectedColor(courses[0]?.color || '#6366f1');
    setSelectedDays(['Lun', 'Mié']);
    setStartTime('08:00');
    setEndTime('10:00');
    setClassroom(courses[0]?.classroom || '');
    setLocation('');
    setProfessor(courses[0]?.professor || '');
    setHasCustomDays(false);
    setDayOverrides({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (instance: FlatScheduleInstance) => {
    const originalBlock = blocks.find(b =>
      (b.id && instance.blockId && String(b.id) === String(instance.blockId)) ||
      (b as any).courseName === instance.courseName ||
      (b as any).title === instance.courseName ||
      (b as any).name === instance.courseName
    );

    if (!originalBlock) {
      setEditingBlockId(instance.blockId || `sched_${Date.now()}`);
      setCourseNameInput(instance.courseName);
      setSelectedCourseId(instance.courseId || '');
      setSelectedColor(instance.color);
      setSelectedDays([instance.dayName]);
      setStartTime(instance.startTime);
      setEndTime(instance.endTime);
      setClassroom(instance.classroom || '');
      setLocation(instance.location || '');
      setProfessor(instance.professor || '');
      setHasCustomDays(false);
      setDayOverrides({});
      setIsModalOpen(true);
      return;
    }

    setEditingBlockId(originalBlock.id);
    setCourseNameInput((originalBlock as any).courseName || (originalBlock as any).title || instance.courseName);
    setSelectedCourseId(originalBlock.courseId || '');
    setSelectedColor(originalBlock.color || instance.color);

    const firstSchedule = originalBlock.schedules?.[0];
    if (firstSchedule) {
      const rawDays = Array.isArray(firstSchedule.days) ? firstSchedule.days : [instance.dayName];
      setSelectedDays(rawDays.map(d => normalizeDayName(d)));
      setStartTime(firstSchedule.startTime || instance.startTime);
      setEndTime(firstSchedule.endTime || instance.endTime);
      setClassroom(firstSchedule.classroom || instance.classroom || '');
      setLocation(firstSchedule.location || instance.location || '');
      setHasCustomDays(firstSchedule.unified === false);
      setDayOverrides(firstSchedule.dayOverrides || {});
    } else {
      const rawDays = Array.isArray((originalBlock as any).days) ? (originalBlock as any).days : [instance.dayName];
      setSelectedDays(rawDays.map(d => normalizeDayName(d)));
      setStartTime((originalBlock as any).startTime || instance.startTime);
      setEndTime((originalBlock as any).endTime || instance.endTime);
      setClassroom((originalBlock as any).classroom || instance.classroom || '');
      setLocation((originalBlock as any).location || instance.location || '');
      setHasCustomDays(false);
      setDayOverrides({});
    }

    setProfessor((originalBlock as any).professor || instance.professor || '');
    setIsModalOpen(true);
  };

  const handleSaveBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCourseName = courseNameInput.trim() || 'Materia';

    const schedules = [
      {
        days: selectedDays,
        startTime,
        endTime,
        classroom,
        location,
        unified: !hasCustomDays,
        dayOverrides: hasCustomDays ? dayOverrides : {}
      }
    ];

    const blockData = {
      id: editingBlockId || undefined,
      courseId: selectedCourseId || undefined,
      courseName: finalCourseName,
      title: finalCourseName,
      color: selectedColor,
      classroom,
      location,
      professor,
      schedules
    };

    if (editingBlockId) {
      setPendingBlockUpdate({
        id: editingBlockId,
        payload: blockData
      });
    } else {
      await StorageService.saveScheduleBlock(blockData);
      AudioService.playLevelUp();
      showToast(`✨ Clase "${finalCourseName}" guardada en el horario`);
      setIsModalOpen(false);
      await loadData();
    }
  };

  const handleConfirmBlockUpdate = async () => {
    if (!pendingBlockUpdate) return;
    const courseName = pendingBlockUpdate.payload.courseName || 'Materia';
    const updateTarget = pendingBlockUpdate;
    
    // Close modal and clear pending state immediately
    setPendingBlockUpdate(null);
    setEditingBlockId(null);
    setIsModalOpen(false);
    setSelectedInstanceDetails(null);

    try {
      const res = await StorageService.updateScheduleBlock(updateTarget.id, updateTarget.payload);
      if (!res) {
        await StorageService.saveScheduleBlock(updateTarget.payload);
      }
      AudioService.playCheck();
      showToast(`✅ Horario de "${courseName}" actualizado correctamente`);
      await loadData();
    } catch (err: any) {
      console.error('Error updating schedule block:', err);
      showToast(`⚠️ Error al actualizar: ${err?.message || 'Reintenta'}`);
      await loadData();
    }
  };

  const handleDeleteBlock = (id: string, name: string) => {
    setConfirmDeleteBlock({ id, name });
  };

  const handleConfirmDeleteBlock = async () => {
    if (!confirmDeleteBlock) return;
    const name = confirmDeleteBlock.name;
    const target = confirmDeleteBlock;
    
    // Close modal and clear confirm state immediately
    setConfirmDeleteBlock(null);
    setSelectedInstanceDetails(null);

    try {
      await StorageService.deleteScheduleBlock(target.id, target.name);
      AudioService.playTrash();
      showToast(`🗑️ Clase "${name}" eliminada del horario`);
      await loadData();
    } catch (err: any) {
      console.error('Error deleting schedule block:', err);
      showToast(`⚠️ Error al eliminar clase`);
      await loadData();
    }
  };

  const handleImportJSON = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const res = await StorageService.importScheduleFromJSON(text);
      if (res.success) {
        AudioService.playLevelUp();
        alert(res.message);
        await loadData();
      } else {
        alert(`❌ ${res.message}`);
      }
    } catch (e: any) {
      alert(`Error al leer archivo: ${e.message}`);
    } finally {
      if (jsonFileInputRef.current) jsonFileInputRef.current.value = '';
    }
  };

  const handleExportJSON = () => {
    const dataBundle = {
      _meta: {
        exportedAt: new Date().toISOString(),
        app: 'OrgPro PC',
        type: 'university_schedule'
      },
      blocks
    };
    const blob = new Blob([JSON.stringify(dataBundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `horario_uni_orgpro_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUri = e.target?.result as string;
      if (dataUri) {
        await StorageService.saveScheduleImage(dataUri);
        setScheduleImage(dataUri);
        setViewMode('image');
        AudioService.playLevelUp();
      }
    };
    reader.readAsDataURL(file);
    if (imageFileInputRef.current) imageFileInputRef.current.value = '';
  };

  const handleDeleteImage = () => {
    setConfirmDeleteImage(true);
  };

  const handleConfirmDeleteImage = async () => {
    await StorageService.saveScheduleImage(null);
    setScheduleImage(null);
    setViewMode('grid');
    AudioService.playDelete();
    setConfirmDeleteImage(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Hidden File Inputs */}
      <input type="file" ref={jsonFileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
      <input type="file" ref={imageFileInputRef} onChange={handleUploadImage} accept="image/*" className="hidden" />

      {/* Main Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-gradient-to-r from-slate-900/90 via-indigo-950/40 to-slate-900/90 p-6 rounded-3xl border border-white/10 backdrop-blur-2xl shadow-2xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-accent to-primary flex items-center justify-center shadow-lg shadow-accent/20 shrink-0">
            <Clock className="w-8 h-8 text-dark-900" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Horario Universitario de Clases 🎓</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${
                syncStatus.isOnline ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}>
                {syncStatus.isOnline ? 'Sync Celular Activo' : 'Offline'}
              </span>
            </div>
            <p className="text-xs text-gray-300 mt-1 max-w-2xl">
              Sincronizado directamente con tu celular. Consulta tus materias, aulas, profesores y horas de clase en tiempo real.
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/10">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'grid' ? 'bg-accent text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Cuadrícula
            </button>
            <button
              onClick={() => setViewMode('agenda')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'agenda' ? 'bg-accent text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Agenda
            </button>
            <button
              onClick={() => setViewMode('image')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'image' ? 'bg-accent text-dark-900 shadow-md' : 'text-gray-400 hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" /> Foto Horario
            </button>
          </div>

          <button
            onClick={() => SyncEngine.syncNow()}
            disabled={syncStatus.isSyncing}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Sincronizar ahora con celular"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin text-accent' : ''}`} />
            <span className="hidden sm:inline">Sincronizar</span>
          </button>

          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Importar horario_uni.json del celular"
          >
            <Upload className="w-4 h-4 text-purple-400" />
            <span className="hidden sm:inline">Importar JSON</span>
          </button>

          <button
            onClick={handleExportJSON}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-200 border border-white/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
            title="Exportar copia de seguridad en JSON"
          >
            <Download className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-accent via-teal-400 to-primary text-dark-900 text-xs font-black shadow-lg shadow-accent/20 hover:brightness-110 transition-all transform hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" /> Agregar Clase
          </button>
        </div>
      </div>

      {/* Next Class Live Widget Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next Class Card */}
        <div className="md:col-span-2 p-5 rounded-3xl bg-gradient-to-r from-indigo-950/60 via-purple-950/40 to-slate-900/80 border border-indigo-500/20 backdrop-blur-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-3 relative z-10">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Próxima Materia Universitaria
            </span>
            {nextClass && (
              <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                nextClass.isOngoing
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                  : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
              }`}>
                {nextClass.remainingText}
              </span>
            )}
          </div>

          {nextClass ? (
            <div className="flex items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-4 h-4 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: nextClass.color }} />
                  <h3 className="text-xl font-black text-white tracking-tight truncate">{nextClass.courseName}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300 pt-1">
                  <span className="font-mono text-amber-300 font-bold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> {nextClass.formattedTime12}
                  </span>
                  {nextClass.classroom && (
                    <span className="flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      <MapPin className="w-3 h-3" /> {nextClass.classroom}
                    </span>
                  )}
                  {nextClass.location && (
                    <span className="text-gray-400">({nextClass.location})</span>
                  )}
                  {nextClass.professor && (
                    <span className="flex items-center gap-1 text-purple-300">
                      <User className="w-3 h-3" /> Prof. {nextClass.professor}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => setSelectedInstanceDetails(nextClass)}
                className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all shrink-0 flex items-center gap-1"
              >
                Detalles <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="py-2 text-gray-400 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <span>No tienes clases registradas o pendientes. ¡Disfruta tu tiempo libre! 🎉</span>
            </div>
          )}
        </div>

        {/* Today's Summary Card */}
        <div className="p-5 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5" /> Clases de Hoy ({FULL_DAYS_NAMES[todayDayIndex]})
            </span>
            <p className="text-2xl font-black text-white mt-2">
              {todayClasses.length} {todayClasses.length === 1 ? 'materia' : 'materias'}
            </p>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            {todayClasses.length > 0 ? (
              <div className="space-y-1">
                {todayClasses.slice(0, 2).map((c, i) => (
                  <p key={i} className="truncate text-gray-300">
                    • <strong className="text-white">{c.courseName}</strong> ({c.startTime} - {c.endTime})
                  </p>
                ))}
                {todayClasses.length > 2 && (
                  <p className="text-[11px] text-accent">+{todayClasses.length - 2} clases más hoy</p>
                )}
              </div>
            ) : (
              <span>Sin clases programadas para el día de hoy.</span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Search & Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-2 flex-1 min-w-[240px] max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar materia, aula o docente en el horario..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-gray-500 focus:border-accent transition-colors"
            />
            {searchFilter && (
              <button
                type="button"
                onClick={() => setSearchFilter('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white text-xs px-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-400">
          <span className="font-mono font-bold text-accent">
            {flatInstances.length} {flatInstances.length === 1 ? 'bloque activo' : 'bloques activos'}
          </span>
          <span className="hidden sm:inline text-gray-600">|</span>
          <span className="hidden sm:inline text-[11px] text-gray-400">
            💡 Tip: Haz doble clic en cualquier materia para editarla rápidamente
          </span>
        </div>
      </div>

      {/* Main View Modes */}
      {viewMode === 'grid' && (
        <div className="rounded-3xl bg-slate-950/60 border border-white/10 p-6 backdrop-blur-2xl shadow-2xl overflow-x-auto">
          <div className="min-w-[900px]">
            {/* Days Header */}
            <div className="grid grid-cols-8 gap-3 border-b border-white/10 pb-4 text-center sticky top-0 bg-[#070913]/90 backdrop-blur-md z-20">
              <div className="text-xs font-mono text-gray-500 font-bold flex items-center justify-center">
                HORA
              </div>
              {DAYS_NAMES.map((day, idx) => {
                const isToday = todayDayIndex === idx;
                return (
                  <div
                    key={day}
                    className={`py-2 rounded-2xl text-xs font-extrabold uppercase font-mono transition-all ${
                      isToday
                        ? 'bg-accent/20 text-accent border border-accent/40 shadow-lg shadow-accent/10'
                        : 'bg-white/[0.03] text-gray-300 border border-white/5'
                    }`}
                  >
                    <span>{day}</span>
                    {isToday && <span className="block text-[9px] font-black text-accent mt-0.5">• HOY •</span>}
                  </div>
                );
              })}
            </div>

            {/* Grid Canvas with Time Slots and Absolute Positioned Blocks */}
            <div className="relative pt-3" style={{ height: `${totalHoursCount * HOUR_HEIGHT}px` }}>
              {/* Horizontal Background Hour Lines */}
              {Array.from({ length: totalHoursCount }).map((_, i) => {
                const h = displayStartHour + i;
                const timeLabel = `${String(h).padStart(2, '0')}:00`;
                const topPos = i * HOUR_HEIGHT;

                return (
                  <div
                    key={h}
                    className="absolute left-0 right-0 grid grid-cols-8 gap-3 pointer-events-none border-b border-white/[0.04]"
                    style={{ top: `${topPos}px`, height: `${HOUR_HEIGHT}px` }}
                  >
                    <div className="text-[11px] font-mono text-gray-500 font-bold flex items-start justify-center pt-1">
                      {timeLabel}
                    </div>
                    {DAYS_NAMES.map((d, dIdx) => (
                      <div
                        key={d}
                        className={`border-r border-white/[0.03] h-full ${
                          todayDayIndex === dIdx ? 'bg-accent/[0.015]' : ''
                        }`}
                      />
                    ))}
                  </div>
                );
              })}

              {/* Current Time Line across today's column */}
              {isNowInScheduleRange && (
                <div
                  className="absolute z-10 pointer-events-none flex items-center"
                  style={{
                    top: `${currentTimelineTop}px`,
                    left: `${((todayDayIndex + 1) / 8) * 100}%`,
                    width: `${(1 / 8) * 100}%`
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/80 -ml-1.5" />
                  <div className="h-[2px] w-full bg-rose-500/80 shadow-sm" />
                </div>
              )}

              {/* Render Class Blocks positioned precisely */}
              {flatInstances.map((inst) => {
                const colIdx = inst.dayIndex; // 0..6
                const startMins = inst.startMinutes;
                const endMins = inst.endMinutes;
                const topPx = ((startMins - displayStartHour * 60) / 60) * HOUR_HEIGHT;
                const heightPx = Math.max(34, ((endMins - startMins) / 60) * HOUR_HEIGHT);

                // Grid column math: 8 columns, 0 is time, 1..7 are days
                const leftPercent = ((colIdx + 1) / 8) * 100;
                const colWidthPercent = (1 / 8) * 100;

                return (
                  <div
                    key={inst.id}
                    onClick={() => setSelectedInstanceDetails(inst)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleOpenEditModal(inst);
                    }}
                    style={{
                      top: `${Math.max(0, topPx)}px`,
                      height: `${heightPx - 4}px`,
                      left: `calc(${leftPercent}% + 4px)`,
                      width: `calc(${colWidthPercent}% - 8px)`,
                      backgroundColor: `${inst.color}22`,
                      borderColor: inst.color,
                      borderLeftWidth: '4px'
                    }}
                    title={`${inst.courseName} (${inst.startTime} - ${inst.endTime})\nClic: Ver detalles | Doble clic: Editar`}
                    className="absolute z-10 rounded-xl p-2.5 border border-white/10 hover:border-white/40 cursor-pointer shadow-md transition-all hover:scale-[1.01] hover:z-20 group flex flex-col justify-between overflow-hidden select-none"
                  >
                    <div className="min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-xs font-black text-white truncate leading-tight">
                          {inst.courseName}
                        </p>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0 bg-slate-950/80 backdrop-blur-sm rounded-lg p-0.5 border border-white/10 shadow">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditModal(inst);
                            }}
                            className="text-gray-300 hover:text-white hover:bg-white/10 p-1 rounded transition-colors"
                            title="Editar horario"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteBlock(inst.blockId, inst.courseName);
                            }}
                            className="text-gray-300 hover:text-rose-400 hover:bg-rose-500/10 p-1 rounded transition-colors"
                            title="Eliminar clase"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[10px] font-mono font-bold text-gray-300 mt-0.5">
                        {inst.startTime} - {inst.endTime}
                      </p>
                    </div>

                    {inst.classroom && (
                      <div className="text-[9px] font-semibold text-emerald-300 truncate flex items-center gap-1 mt-1">
                        <MapPin className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{inst.classroom}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Agenda / List Mode */}
      {viewMode === 'agenda' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {DAYS_NAMES.map((d, dIdx) => {
            const dayClasses = flatInstances
              .filter(i => i.dayIndex === dIdx)
              .sort((a, b) => a.startMinutes - b.startMinutes);
            const isToday = todayDayIndex === dIdx;

            return (
              <div
                key={d}
                className={`p-5 rounded-3xl border backdrop-blur-xl space-y-3 transition-all ${
                  isToday
                    ? 'bg-accent/[0.08] border-accent/40 ring-2 ring-accent/20'
                    : 'bg-slate-900/60 border-white/10'
                }`}
              >
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-base font-black ${isToday ? 'text-accent' : 'text-white'}`}>
                      {FULL_DAYS_NAMES[dIdx]}
                    </h3>
                    {isToday && <span className="text-[9px] font-black bg-accent text-dark-900 px-2 py-0.5 rounded-full uppercase">Hoy</span>}
                  </div>
                  <span className="text-xs font-mono text-gray-400 font-bold">{dayClasses.length} clases</span>
                </div>

                <div className="space-y-2.5">
                  {dayClasses.map(c => (
                    <div
                      key={c.id}
                      onClick={() => setSelectedInstanceDetails(c)}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleOpenEditModal(c);
                      }}
                      className="p-3 rounded-2xl bg-white/[0.04] border border-white/10 hover:border-white/20 cursor-pointer transition-all space-y-1 group relative select-none"
                      style={{ borderLeftColor: c.color, borderLeftWidth: '4px' }}
                      title="Clic: Ver detalles | Doble clic: Editar"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-white truncate">{c.courseName}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-amber-300 font-bold">{c.startTime} - {c.endTime}</span>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-slate-950/80 rounded-md p-0.5 border border-white/10">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(c);
                              }}
                              className="text-gray-300 hover:text-white p-1 rounded hover:bg-white/10"
                              title="Editar"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBlock(c.blockId, c.courseName);
                              }}
                              className="text-gray-300 hover:text-rose-400 p-1 rounded hover:bg-rose-500/10"
                              title="Eliminar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                      {c.classroom && (
                        <p className="text-[10px] text-emerald-300 flex items-center gap-1">
                          <MapPin className="w-2.5 h-2.5" /> {c.classroom} {c.location ? `(${c.location})` : ''}
                        </p>
                      )}
                    </div>
                  ))}

                  {dayClasses.length === 0 && (
                    <div className="py-6 text-center text-gray-500 text-xs italic">
                      Día libre de universidad ✨
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Image Mode */}
      {viewMode === 'image' && (
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-white/10 backdrop-blur-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-accent" /> Foto / Imagen del Horario Físico
              </h2>
              <p className="text-xs text-gray-400">
                Sincronizada desde la app de tu celular o subida directamente en tu PC.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-accent text-dark-900 text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                <Upload className="w-3.5 h-3.5" /> Subir / Cambiar Foto
              </button>
              {scheduleImage && (
                <button
                  onClick={handleDeleteImage}
                  className="px-3 py-2 rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {scheduleImage ? (
            <div className="rounded-2xl overflow-hidden border border-white/10 bg-black/40 p-2 flex items-center justify-center max-h-[700px]">
              <img src={scheduleImage} alt="Horario Universitario" className="max-h-[680px] max-w-full object-contain rounded-xl" />
            </div>
          ) : (
            <div className="text-center py-16 border-2 border-dashed border-white/10 rounded-2xl space-y-3">
              <ImageIcon className="w-12 h-12 text-gray-500 mx-auto" />
              <p className="text-sm text-gray-300 font-semibold">Aún no tienes una foto de tu horario guardada.</p>
              <p className="text-xs text-gray-500 max-w-md mx-auto">
                Puedes tomarle foto a tu horario físico en tu celular (pestaña Universidad) y se sincronizará automáticamente aquí, o subirla desde tu PC.
              </p>
              <button
                onClick={() => imageFileInputRef.current?.click()}
                className="mt-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold"
              >
                Seleccionar Imagen
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal: Create / Edit Class Block */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1225] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-4 shadow-2xl animate-scaleIn max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h2 className="text-base font-black text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-accent" />
                {editingBlockId ? 'Editar Bloque de Clase' : 'Agregar Horario de Clase'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-4 text-xs">
              {/* Course Selection or Custom Name */}
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre de la Materia / Curso *</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cálculo Integral, Física II..."
                    value={courseNameInput}
                    onChange={(e) => setCourseNameInput(e.target.value)}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-sm focus:border-accent"
                  />
                  {courses.length > 0 && (
                    <select
                      value={selectedCourseId}
                      onChange={(e) => {
                        const cId = e.target.value;
                        setSelectedCourseId(cId);
                        const found = courses.find(c => c.id === cId);
                        if (found) {
                          setCourseNameInput(found.name);
                          setSelectedColor(found.color);
                          if (found.classroom) setClassroom(found.classroom);
                          if (found.professor) setProfessor(found.professor);
                        }
                      }}
                      className="bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-gray-300 text-xs"
                    >
                      <option value="">(Cargar de materia)</option>
                      {courses.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Color Picker */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">Color del Curso en el Horario</label>
                <div className="flex items-center gap-2">
                  {['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444'].map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setSelectedColor(color)}
                      style={{ backgroundColor: color }}
                      className={`w-7 h-7 rounded-full transition-all ${
                        selectedColor === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-900 scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                    className="w-7 h-7 rounded-lg bg-transparent border-0 cursor-pointer"
                  />
                </div>
              </div>

              {/* Days Selection */}
              <div>
                <label className="block text-gray-300 font-bold mb-1.5">Días de Clase Semanales</label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS_NAMES.map(d => {
                    const isSelected = selectedDays.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            if (selectedDays.length > 1) setSelectedDays(selectedDays.filter(day => day !== d));
                          } else {
                            setSelectedDays([...selectedDays, d]);
                          }
                        }}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          isSelected ? 'bg-primary text-white shadow-md' : 'bg-black/40 text-gray-400 hover:text-white'
                        }`}
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Start and End Times */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Hora de Inicio</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Hora de Fin</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>

              {/* Classroom, Location & Professor */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Aula / Salón (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Aula 302, Lab C..."
                    value={classroom}
                    onChange={(e) => setClassroom(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Pabellón / Sede</label>
                  <input
                    type="text"
                    placeholder="Pabellón A..."
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-300 font-bold mb-1">Docente / Profesor (Opcional)</label>
                <input
                  type="text"
                  placeholder="Nombre del docente..."
                  value={professor}
                  onChange={(e) => setProfessor(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              {/* Day Overrides Accordion for different hours on different days */}
              <div className="border border-white/10 rounded-2xl p-3 bg-white/[0.02] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-white">¿Horarios distintos por día?</p>
                    <p className="text-[10px] text-gray-400">Personaliza horas y aulas distintas para cada día asignado.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={hasCustomDays}
                    onChange={(e) => setHasCustomDays(e.target.checked)}
                    className="w-4 h-4 rounded text-accent cursor-pointer"
                  />
                </div>

                {hasCustomDays && (
                  <div className="pt-2 space-y-2 border-t border-white/5">
                    {selectedDays.map(d => {
                      const cur = dayOverrides[d] || { startTime, endTime, classroom, location };
                      return (
                        <div key={d} className="p-2.5 rounded-xl bg-black/30 border border-white/5 space-y-1.5">
                          <p className="font-bold text-accent">{FULL_DAYS_NAMES[DAYS_NAMES.indexOf(d as any)]}</p>
                          <div className="grid grid-cols-2 gap-2">
                            <input
                              type="time"
                              value={cur.startTime}
                              onChange={(e) => setDayOverrides({
                                ...dayOverrides,
                                [d]: { ...cur, startTime: e.target.value }
                              })}
                              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-[11px]"
                            />
                            <input
                              type="time"
                              value={cur.endTime}
                              onChange={(e) => setDayOverrides({
                                ...dayOverrides,
                                [d]: { ...cur, endTime: e.target.value }
                              })}
                              className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white font-mono text-[11px]"
                            />
                          </div>
                          <input
                            type="text"
                            placeholder={`Aula para ${d}...`}
                            value={cur.classroom}
                            onChange={(e) => setDayOverrides({
                              ...dayOverrides,
                              [d]: { ...cur, classroom: e.target.value }
                            })}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-white text-[11px]"
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/5 text-gray-300 font-bold hover:bg-white/10"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-accent text-dark-900 font-black shadow-lg shadow-accent/20 hover:brightness-110"
                >
                  {editingBlockId ? 'Guardar Cambios' : 'Guardar en Horario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Instance Details */}
      {selectedInstanceDetails && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F1225] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: selectedInstanceDetails.color }} />
                <h2 className="text-base font-black text-white">{selectedInstanceDetails.courseName}</h2>
              </div>
              <button onClick={() => setSelectedInstanceDetails(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-400">Día de clase:</span>
                  <strong className="text-white">{FULL_DAYS_NAMES[selectedInstanceDetails.dayIndex]}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Horario:</span>
                  <strong className="text-amber-300 font-mono">
                    {formatTime12h(selectedInstanceDetails.startTime)} - {formatTime12h(selectedInstanceDetails.endTime)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duración:</span>
                  <strong className="text-white">{selectedInstanceDetails.durationMinutes} minutos</strong>
                </div>
                {selectedInstanceDetails.classroom && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Aula / Salón:</span>
                    <strong className="text-emerald-300">{selectedInstanceDetails.classroom}</strong>
                  </div>
                )}
                {selectedInstanceDetails.location && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Pabellón / Sede:</span>
                    <strong className="text-gray-200">{selectedInstanceDetails.location}</strong>
                  </div>
                )}
                {selectedInstanceDetails.professor && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Docente:</span>
                    <strong className="text-purple-300">Prof. {selectedInstanceDetails.professor}</strong>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  const inst = selectedInstanceDetails;
                  setSelectedInstanceDetails(null);
                  handleDeleteBlock(inst.blockId, inst.courseName);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar Clase</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  const inst = selectedInstanceDetails;
                  setSelectedInstanceDetails(null);
                  handleOpenEditModal(inst);
                }}
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-light text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Editar Horario</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={Boolean(pendingBlockUpdate)}
        title="¿Actualizar horario de clase?"
        description={`¿Deseas guardar las modificaciones en el bloque de clase "${pendingBlockUpdate?.payload?.courseName}"?`}
        confirmLabel="Sí, actualizar clase"
        cancelLabel="Volver a editar"
        variant="primary"
        onConfirm={handleConfirmBlockUpdate}
        onCancel={() => setPendingBlockUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteBlock)}
        title="¿Eliminar clase del horario?"
        description={`¿Estás seguro de que deseas eliminar permanentemente la materia "${confirmDeleteBlock?.name}" de tu horario semanal?`}
        confirmLabel="Sí, eliminar clase"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteBlock}
        onCancel={() => setConfirmDeleteBlock(null)}
      />

      <ConfirmModal
        isOpen={confirmDeleteImage}
        title="¿Eliminar foto del horario?"
        description="¿Deseas borrar la imagen de tu horario físico guardada en el sistema?"
        confirmLabel="Sí, borrar imagen"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteImage}
        onCancel={() => setConfirmDeleteImage(false)}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900/95 border border-accent/40 text-white px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center gap-3 animate-slideUp font-bold text-xs ring-2 ring-accent/20">
          <Sparkles className="w-4 h-4 text-accent animate-spin" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default ScheduleView;
