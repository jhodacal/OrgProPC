import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  PenTool,
  X,
  Save,
  Check,
  Calendar,
  Layers,
  Sparkles,
  BookOpen,
  FileText,
  Bold,
  Italic,
  List,
  CheckSquare,
  Quote,
  Code,
  Heading1,
  Heading2,
  Eye,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import StorageService from '../services/StorageService';
import AudioService from '../services/AudioService';
import { Course, Semester, UniversityUnit, UniversityFile } from '../types';
import {
  getAcademicWeek,
  findUnitAndWeekForAcademicWeek,
  formatDateReadableSpanish,
  generateDefaultNoteFileName
} from '../utils/academicWeekUtils';
import MarkdownRenderer from './MarkdownRenderer';

export const SmartNoteFloatingEditor: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [courses, setCourses] = useState<Course[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [units, setUnits] = useState<UniversityUnit[]>([]);
  const [selectedSemesterFilter, setSelectedSemesterFilter] = useState<string>('current');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [noteTitle, setNoteTitle] = useState('');
  const [content, setContent] = useState('');
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const currentSemester = useMemo(() => {
    return semesters.find(s => s.isCurrent) || semesters[0] || null;
  }, [semesters]);

  const activeSemester = useMemo(() => {
    if (selectedSemesterFilter === 'current') return currentSemester;
    if (selectedSemesterFilter === 'all') return null;
    return semesters.find(s => s.id === selectedSemesterFilter) || currentSemester;
  }, [semesters, selectedSemesterFilter, currentSemester]);

  const displayedCourses = useMemo(() => {
    if (!activeSemester) return courses;
    return courses.filter(c => c.semesterId === activeSemester.id);
  }, [courses, activeSemester]);

  useEffect(() => {
    if (displayedCourses.length > 0) {
      if (!displayedCourses.some(c => c.id === selectedCourseId)) {
        setSelectedCourseId(displayedCourses[0].id);
      }
    } else {
      setSelectedCourseId('');
    }
  }, [displayedCourses, selectedCourseId]);

  const loadData = async () => {
    try {
      const [cList, sList, uList] = await Promise.all([
        StorageService.getCourses(),
        StorageService.getSemesters(),
        StorageService.getCourseUnitsProgress()
      ]);
      setCourses(cList || []);
      setSemesters(sList || []);
      setUnits(uList || []);

      if (cList && cList.length > 0 && !selectedCourseId) {
        const curSem = sList?.find(s => s.isCurrent) || sList?.[0];
        const initialCourse = curSem ? cList.find(c => c.semesterId === curSem.id) || cList[0] : cList[0];
        setSelectedCourseId(initialCourse.id);
      }
    } catch (_) {}
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.on('DATA_UPDATED', loadData);
    return () => unsub();
  }, []);

  const openEditor = () => {
    loadData();
    setSelectedSemesterFilter('current');
    const today = new Date();
    const dateReadable = formatDateReadableSpanish(today);
    const defaultTitle = generateDefaultNoteFileName(today, 'Apunte');

    setNoteTitle(defaultTitle.replace('.txt', ''));
    setContent(`# ${dateReadable}\n\n- [ ] `);
    setActiveTab('edit');
    setSavedSuccess(false);
    setIsOpen(true);
    AudioService.playPop?.();
  };

  // Calculate current academic week and target unit/week destination
  const targetDestination = useMemo(() => {
    if (!selectedCourseId || courses.length === 0) return null;
    const course = courses.find(c => c.id === selectedCourseId);
    if (!course) return null;

    const courseSemester = semesters.find(s => s.id === course.semesterId) || semesters.find(s => s.isCurrent) || semesters[0];
    const startDate = courseSemester?.startDate || new Date().toISOString().split('T')[0];
    const currentAcademicWeek = getAcademicWeek(startDate, new Date());

    const courseUnits = units.filter(u => u.courseId === course.id);
    const mapping = findUnitAndWeekForAcademicWeek(courseUnits, currentAcademicWeek);

    return {
      course,
      semester: courseSemester,
      academicWeek: currentAcademicWeek,
      unit: mapping.unit,
      weekNumber: mapping.weekNumber,
      isEstimated: mapping.isEstimated
    };
  }, [selectedCourseId, courses, semesters, units]);

  // Insert markdown helpers
  const insertFormatting = (prefix: string, suffix: string = '') => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = content.substring(start, end);
    const replacement = `${prefix}${selectedText || 'texto'}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(start + prefix.length, start + replacement.length - suffix.length);
    }, 50);
  };

  const handleSaveNote = async () => {
    if (!content.trim()) return;
    if (!targetDestination) return;

    setIsSaving(true);
    try {
      const finalTitle = (noteTitle.trim() || 'Apunte') + '.txt';
      const fileId = `note_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newFile: UniversityFile = {
        id: fileId,
        name: finalTitle,
        type: 'text',
        uri: 'local://note',
        textContent: content,
        addedAt: new Date().toISOString()
      };

      let allUnits = (await StorageService.getCourseUnitsProgress()) || [];
      const courseId = targetDestination.course.id;
      let targetUnit = allUnits.find(u => u.courseId === courseId && targetDestination.unit && u.id === targetDestination.unit.id);

      if (!targetUnit) {
        targetUnit = allUnits.find(u => u.courseId === courseId);
      }

      if (!targetUnit) {
        // Create unit if none exists
        targetUnit = {
          id: `unit_${Date.now()}`,
          title: 'Unidad 1',
          courseId: courseId,
          semesterId: targetDestination.semester?.id,
          totalWeeks: 17,
          weeks: []
        };
        allUnits.push(targetUnit);
      }

      if (!targetUnit.weeks) targetUnit.weeks = [];
      const targetWeekNum = targetDestination.weekNumber || 1;
      let targetWeek = targetUnit.weeks.find(w => w.weekNumber === targetWeekNum);

      if (!targetWeek) {
        targetWeek = {
          weekNumber: targetWeekNum,
          name: `Semana ${targetWeekNum}`,
          title: `Semana ${targetWeekNum}`,
          completed: false,
          files: []
        };
        targetUnit.weeks.push(targetWeek);
      }

      if (!targetWeek.files) targetWeek.files = [];
      targetWeek.files.push(newFile);

      await StorageService.saveCourseUnitsProgress(allUnits);
      StorageService.emit('DATA_UPDATED');

      AudioService.playLevelUp?.();
      try {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
      } catch (_) {}

      setSavedSuccess(true);
      setTimeout(() => {
        setIsSaving(false);
        setIsOpen(false);
      }, 700);
    } catch (e) {
      console.error('Error saving smart note:', e);
      setIsSaving(false);
    }
  };

  const linesCount = content.split('\n').length;
  const wordsCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charsCount = content.length;

  return (
    <>
      {/* ============================================================ */}
      {/* BOTÓN FLOTANTE PERMANENTE (FAB) EN LA ESQUINA INFERIOR DERECHA */}
      {/* ============================================================ */}
      <button
        type="button"
        onClick={openEditor}
        className="fixed bottom-6 right-6 z-40 group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-black text-xs shadow-2xl shadow-purple-500/40 border border-white/20 transition-all duration-300 hover:scale-110 active:scale-95 cursor-pointer"
        title="Crear Apunte Inteligente (detecta automáticamente tu materia y semana lectiva)"
      >
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <PenTool className="w-3.5 h-3.5 text-white" />
        </div>
        <span className="hidden sm:inline">Apunte Rápido</span>
        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
      </button>

      {/* ============================================================ */}
      {/* MODAL: EDITOR DE APUNTES INTELIGENTES AUTOMATIZADO           */}
      {/* ============================================================ */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
          <div className="bg-[#0e1124] border border-white/15 rounded-3xl w-full max-w-3xl flex flex-col shadow-2xl overflow-hidden max-h-[92vh] animate-scaleIn">
            {/* Header */}
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-white/[0.02]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <span>Apunte Inteligente Universitario</span>
                    <Sparkles className="w-4 h-4 text-amber-400" />
                  </h3>
                  <p className="text-xs text-gray-400">
                    Organización automática según tu calendario lectivo
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Semester Filter Bar */}
            <div className="px-5 py-2.5 border-b border-white/5 bg-black/30 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1 shrink-0">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Semestre:
                </span>
                <select
                  value={selectedSemesterFilter}
                  onChange={e => setSelectedSemesterFilter(e.target.value)}
                  className="bg-white/10 hover:bg-white/15 border border-white/15 rounded-xl px-2.5 py-1 text-xs font-bold text-white focus:outline-none focus:border-indigo-400 cursor-pointer transition-colors"
                >
                  <option value="current" className="bg-[#121629] text-white">
                    ⭐ Semestre Actual {currentSemester ? `(${currentSemester.name})` : ''}
                  </option>
                  {semesters.map(s => (
                    <option key={s.id} value={s.id} className="bg-[#121629] text-white">
                      {s.name} {s.isCurrent ? '• Actual' : ''}
                    </option>
                  ))}
                  <option value="all" className="bg-[#121629] text-white">
                    🌐 Todos los Semestres ({courses.length} cursos)
                  </option>
                </select>
              </div>

              {activeSemester && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-bold border border-indigo-500/30">
                  {displayedCourses.length} curso{displayedCourses.length !== 1 ? 's' : ''} disponible{displayedCourses.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>

            {/* Course Selector Chips */}
            <div className="px-5 py-2.5 border-b border-white/5 bg-black/20 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0 mr-1">
                Materia:
              </span>
              {displayedCourses.length === 0 ? (
                <div className="flex items-center gap-2 py-0.5 text-xs text-gray-400 italic">
                  <span>No hay materias registradas en este semestre.</span>
                  <button
                    type="button"
                    onClick={() => setSelectedSemesterFilter('all')}
                    className="text-indigo-400 underline hover:text-indigo-300 font-bold not-italic cursor-pointer"
                  >
                    Ver todos los cursos
                  </button>
                </div>
              ) : (
                displayedCourses.map(c => {
                  const isSel = c.id === selectedCourseId;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCourseId(c.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer border ${
                        isSel
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                          : 'bg-white/5 text-gray-300 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: c.color || '#6366f1' }}
                      />
                      <span>{c.name}</span>
                    </button>
                  );
                })
              )}
            </div>

            {/* Destination Banner */}
            {targetDestination && (
              <div className="px-5 py-2.5 bg-indigo-950/30 border-b border-indigo-500/20 flex flex-wrap items-center justify-between text-xs text-indigo-300 gap-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  <span>
                    Destino:{' '}
                    <strong className="text-white">
                      Semana {targetDestination.academicWeek}
                    </strong>{' '}
                    ({targetDestination.unit?.title || 'Unidad Actual'})
                  </span>
                </div>
                <div className="text-[11px] text-gray-400 font-mono">
                  {targetDestination.semester?.name || 'Ciclo Activo'}
                </div>
              </div>
            )}

            {/* Note Title Input & Formatting Toolbar */}
            <div className="p-5 space-y-3 flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={noteTitle}
                  onChange={e => setNoteTitle(e.target.value)}
                  placeholder="Título del apunte o tema de clase..."
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500"
                />

                <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setActiveTab('edit')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'edit'
                        ? 'bg-indigo-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Editor</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('preview')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                      activeTab === 'preview'
                        ? 'bg-purple-600 text-white shadow'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Vista Previa</span>
                  </button>
                </div>
              </div>

              {/* Formatting Toolbar */}
              {activeTab === 'edit' && (
                <div className="flex items-center gap-1 p-1.5 bg-black/30 border border-white/5 rounded-xl text-gray-300 overflow-x-auto no-scrollbar">
                  <button
                    type="button"
                    onClick={() => insertFormatting('# ')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Título Principal (H1)"
                  >
                    <Heading1 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('## ')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Subtítulo (H2)"
                  >
                    <Heading2 className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('**', '**')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Negrita"
                  >
                    <Bold className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('*', '*')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Cursiva"
                  >
                    <Italic className="w-4 h-4" />
                  </button>
                  <div className="w-px h-4 bg-white/10 mx-1" />
                  <button
                    type="button"
                    onClick={() => insertFormatting('- [ ] ')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Casilla de Tarea"
                  >
                    <CheckSquare className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('- ')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Lista con viñetas"
                  >
                    <List className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('> ')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Cita"
                  >
                    <Quote className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => insertFormatting('`', '`')}
                    className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold"
                    title="Código en línea"
                  >
                    <Code className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Editor Viewport */}
              <div className="flex-1 min-h-[220px] rounded-2xl bg-black/40 border border-white/10 overflow-hidden flex flex-col">
                {activeTab === 'edit' ? (
                  <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={e => setContent(e.target.value)}
                    placeholder="Escribe tus apuntes aquí (soporta Markdown, viñetas, listas de tareas)..."
                    className="flex-1 w-full p-4 bg-transparent text-gray-200 text-sm font-mono leading-relaxed resize-none focus:outline-none"
                  />
                ) : (
                  <div className="flex-1 w-full p-5 overflow-y-auto">
                    <MarkdownRenderer content={content || 'Sin contenido para previsualizar.'} />
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer Stats & Save */}
            <div className="px-5 py-3.5 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-gray-400 select-none">
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span>📝 {linesCount} lín</span>
                <span>🔤 {wordsCount} pal</span>
                <span>🔠 {charsCount} car</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold transition-all cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleSaveNote}
                  disabled={isSaving || !content.trim()}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-black shadow-lg shadow-indigo-500/25 transition-all cursor-pointer disabled:opacity-50"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>¡Guardado con Éxito!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>{isSaving ? 'Guardando...' : 'Guardar en mi Ciclo'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SmartNoteFloatingEditor;
