import React, { useEffect, useState, useRef } from 'react';
import {
  GraduationCap,
  Plus,
  BookOpen,
  Calendar,
  CheckCircle2,
  Circle,
  FileText,
  Trash2,
  Award,
  Layers,
  Sparkles,
  Calculator,
  ChevronDown,
  ChevronUp,
  FolderOpen,
  Clock,
  TrendingUp,
  Percent,
  Bot,
  FileUp,
  Volume2,
  HelpCircle,
  Copy,
  Eye,
  RefreshCw,
  Cpu,
  Bookmark,
  Zap,
  Edit3,
  Check,
  UploadCloud,
  Paperclip,
  Image as ImageIcon,
  FileCode,
  File,
  Pencil,
  X
} from 'lucide-react';
import StorageService, { isItemCompleted } from '../services/StorageService';
import AudioService from '../services/AudioService';
import AIService, { AVAILABLE_PROVIDERS } from '../services/AIService';
import {
  Course,
  UniversityTask,
  Priority,
  Semester,
  UniversityUnit,
  UniversityUnitWeek,
  UniversityFile,
  EvaluationQuestion
} from '../types';
import confetti from 'canvas-confetti';
import RichTextEditor from '../components/RichTextEditor';
import MarkdownRenderer from '../components/MarkdownRenderer';
import FileViewerModal from '../components/FileViewerModal';
import { ScheduleView } from './ScheduleView';
import ConfirmModal from '../components/ConfirmModal';
import UnajSyncModal from '../components/UnajSyncModal';

export const UniversityView: React.FC = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<UniversityTask[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string>('all');
  const [units, setUnits] = useState<UniversityUnit[]>([]);
  const [activeTab, setActiveTab] = useState<'tasks' | 'courses' | 'units' | 'grades' | 'schedule'>('units');
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [expandedUnits, setExpandedUnits] = useState<Record<string, boolean>>({});
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({});

  const toggleUnit = (unitId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const toggleWeek = (weekKey: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedWeeks(prev => ({
      ...prev,
      [weekKey]: !prev[weekKey]
    }));
  };

  // Modals
  const [isCourseModalOpen, setIsCourseModalOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSemesterModalOpen, setIsSemesterModalOpen] = useState(false);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [isFlashcardsModalOpen, setIsFlashcardsModalOpen] = useState(false);
  const [isUnajModalOpen, setIsUnajModalOpen] = useState(false);

  // Confirmations
  const [confirmDeleteSemester, setConfirmDeleteSemester] = useState<Semester | null>(null);
  const [confirmDeleteCourse, setConfirmDeleteCourse] = useState<Course | null>(null);
  const [confirmDeleteTask, setConfirmDeleteTask] = useState<UniversityTask | null>(null);
  const [confirmDeleteUnit, setConfirmDeleteUnit] = useState<UniversityUnit | null>(null);
  const [confirmDeleteWeek, setConfirmDeleteWeek] = useState<{ unitId: string; weekNumber: number } | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<{ unitId: string; weekNumber: number; fileId: string; fileName: string } | null>(null);

  // Edit states for updates
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);

  const [pendingCourseUpdate, setPendingCourseUpdate] = useState<{ id: string; payload: Partial<Course> } | null>(null);
  const [pendingTaskUpdate, setPendingTaskUpdate] = useState<{ id: string; payload: Partial<UniversityTask> } | null>(null);
  const [pendingSemesterUpdate, setPendingSemesterUpdate] = useState<{ id: string; name: string } | null>(null);
  const [pendingUnitUpdate, setPendingUnitUpdate] = useState<{ id: string; payload: any } | null>(null);

  // Target context for attachments / AI
  const [targetUnitId, setTargetUnitId] = useState<string | null>(null);
  const [targetWeekNum, setTargetWeekNum] = useState<number | null>(null);
  const [targetFile, setTargetFile] = useState<UniversityFile | null>(null);
  const [targetUnitForExam, setTargetUnitForExam] = useState<UniversityUnit | null>(null);

  // AI & Exam states
  const [selectedAIProvider, setSelectedAIProvider] = useState<string>('groq');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [aiResultTitle, setAiResultTitle] = useState<string>('');
  const [generatedExam, setGeneratedExam] = useState<EvaluationQuestion[]>([]);
  const [examAnswers, setExamAnswers] = useState<Record<number, string>>({});
  const [examScore, setExamScore] = useState<number | null>(null);
  const [examSubmitted, setExamSubmitted] = useState(false);
  const [currentFlashcardIndex, setCurrentFlashcardIndex] = useState(0);
  const [flashcardFlipped, setFlashcardFlipped] = useState(false);

  // Form States
  const [newSemesterName, setNewSemesterName] = useState('');
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseProf, setCourseProf] = useState('');
  const [courseRoom, setCourseRoom] = useState('');
  const [courseCredits, setCourseCredits] = useState('4');
  const [courseColor, setCourseColor] = useState('#6C63FF');

  const [taskTitle, setTaskTitle] = useState('');
  const [taskCourseId, setTaskCourseId] = useState('');
  const [taskType, setTaskType] = useState<'task' | 'exam' | 'project' | 'lab'>('task');
  const [taskDueDate, setTaskDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [taskPriority, setTaskPriority] = useState<Priority>('high');
  const [taskWeight, setTaskWeight] = useState('20');

  const [unitTitle, setUnitTitle] = useState('');
  const [unitCourseId, setUnitCourseId] = useState('');
  const [unitTotalWeeks, setUnitTotalWeeks] = useState('17');
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);

  // Attachment Form
  const [attachFileName, setAttachFileName] = useState('');
  const [attachFileType, setAttachFileType] = useState<'pdf' | 'office' | 'image' | 'text' | 'video'>('pdf');
  const [attachTextContent, setAttachTextContent] = useState('');
  const [attachFileUrl, setAttachFileUrl] = useState('');
  const [attachFileSize, setAttachFileSize] = useState<number>(0);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [selectedFileObj, setSelectedFileObj] = useState<File | null>(null);
  const [editingWeekNotesKey, setEditingWeekNotesKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Grade Calculator States
  const [gradeCourseId, setGradeCourseId] = useState<string>('');
  const [gradeEvaluations, setGradeEvaluations] = useState<Array<{ id: string; name: string; weight: number; score: number }>>([
    { id: 'ep', name: 'Examen Parcial (EP)', weight: 30, score: 14 },
    { id: 'ef', name: 'Examen Final (EF)', weight: 35, score: 15 },
    { id: 'pp', name: 'Promedio de Prácticas (PP)', weight: 35, score: 16 }
  ]);
  const [newEvalName, setNewEvalName] = useState('');
  const [newEvalWeight, setNewEvalWeight] = useState('20');
  const [newEvalScore, setNewEvalScore] = useState('14');
  const [isAddEvalModalOpen, setIsAddEvalModalOpen] = useState(false);
  const [confirmDeleteEvalId, setConfirmDeleteEvalId] = useState<string | null>(null);

  const loadData = async () => {
    const [c, t, s, u, prefs] = await Promise.all([
      StorageService.getCourses(),
      StorageService.getUniversityTasks(),
      StorageService.getSemesters(),
      StorageService.getCourseUnitsProgress(),
      StorageService.getAIPreferences()
    ]);
    setCourses(c);
    setTasks(t);
    setSemesters(s);
    setUnits(u);

    if (prefs.selectedModel) {
      setSelectedAIProvider(prefs.selectedModel);
    }

    if (s.length > 0 && activeSemesterId === 'all') {
      const current = s.find(sem => sem.isCurrent);
      if (current) setActiveSemesterId(current.id);
    }
    if (c.length > 0 && !taskCourseId) {
      setTaskCourseId(c[0].id);
      setUnitCourseId(c[0].id);
      setGradeCourseId(c[0].id);
    }
    if (u.length > 0) {
      setExpandedUnits(prev => {
        if (Object.keys(prev).length > 0) return prev;
        return { [u[0].id]: true };
      });
    }
  };

  useEffect(() => {
    loadData();
    const unsub = StorageService.on('DATA_UPDATED', loadData);
    return () => unsub();
  }, []);

  const getCourseName = (id: string) => courses.find(c => c.id === id)?.name || 'Materia General';
  const getCourseColor = (id: string) => courses.find(c => c.id === id)?.color || '#6C63FF';

  // ===== SEMESTER CRUD =====
  const handleCreateSemester = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSemesterName.trim()) return;
    if (editingSemesterId) {
      setPendingSemesterUpdate({ id: editingSemesterId, name: newSemesterName.trim() });
    } else {
      const sem = await StorageService.saveSemester(newSemesterName.trim());
      setActiveSemesterId(sem.id);
      setNewSemesterName('');
      setIsSemesterModalOpen(false);
      AudioService.playLevelUp();
      loadData();
    }
  };

  const handleConfirmSemesterUpdate = async () => {
    if (!pendingSemesterUpdate) return;
    await StorageService.updateSemester(pendingSemesterUpdate.id, { name: pendingSemesterUpdate.name });
    AudioService.playCheck();
    setPendingSemesterUpdate(null);
    setEditingSemesterId(null);
    setNewSemesterName('');
    setIsSemesterModalOpen(false);
    loadData();
  };

  const handleConfirmDeleteSemester = async () => {
    if (!confirmDeleteSemester) return;
    const deletedId = confirmDeleteSemester.id;
    await StorageService.deleteSemester(deletedId);
    setConfirmDeleteSemester(null);
    if (activeSemesterId === deletedId) {
      setActiveSemesterId('all');
    }
    AudioService.playDelete();
    await loadData();
  };

  // ===== COURSE CRUD =====
  const handleOpenCreateCourse = () => {
    setEditingCourseId(null);
    setCourseName('');
    setCourseCode('');
    setCourseProf('');
    setCourseRoom('');
    setCourseCredits('4');
    setCourseColor('#6C63FF');
    setIsCourseModalOpen(true);
  };

  const handleOpenEditCourse = (course: Course) => {
    setEditingCourseId(course.id);
    setCourseName(course.name);
    setCourseCode(course.code || '');
    setCourseProf(course.professor || '');
    setCourseRoom(course.classroom || '');
    setCourseCredits(String(course.credits || 4));
    setCourseColor(course.color || '#6C63FF');
    setIsCourseModalOpen(true);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseName.trim()) return;

    let semId = activeSemesterId;
    if (semId === 'all' && !editingCourseId) {
      if (semesters.length > 0) {
        const currentSem = semesters.find(s => s.isCurrent) || semesters[0];
        semId = currentSem.id;
        setActiveSemesterId(currentSem.id);
      } else {
        const newSem = await StorageService.saveSemester('2026-I');
        semId = newSem.id;
        setActiveSemesterId(newSem.id);
      }
    }

    if (editingCourseId) {
      setPendingCourseUpdate({
        id: editingCourseId,
        payload: {
          name: courseName.trim(),
          code: courseCode.trim() || undefined,
          professor: courseProf.trim() || undefined,
          classroom: courseRoom.trim() || undefined,
          credits: Number(courseCredits) || 4,
          color: courseColor,
        }
      });
    } else {
      const savedCourse = await StorageService.saveCourse({
        name: courseName.trim(),
        code: courseCode.trim() || undefined,
        professor: courseProf.trim() || undefined,
        classroom: courseRoom.trim() || undefined,
        credits: Number(courseCredits) || 4,
        color: courseColor,
        semesterId: semId,
        evaluations: [
          { id: 'ep', name: 'Examen Parcial (EP)', weight: 30 },
          { id: 'ef', name: 'Examen Final (EF)', weight: 35 },
          { id: 'pp', name: 'Promedio de Prácticas (PP)', weight: 35 }
        ]
      });

      setCourseName('');
      setCourseCode('');
      setCourseProf('');
      setCourseRoom('');
      setIsCourseModalOpen(false);
      setSelectedCourseId(savedCourse.id);
      setUnitCourseId(savedCourse.id);
      AudioService.playLevelUp();
      loadData();
    }
  };

  const handleAssignCourseToSemester = async (courseId: string, targetSemesterId: string) => {
    if (!courseId || !targetSemesterId || targetSemesterId === 'all') return;
    await StorageService.updateCourse(courseId, { semesterId: targetSemesterId });
    AudioService.playCheck();
    setSelectedCourseId(courseId);
    setUnitCourseId(courseId);
    await loadData();
  };

  const handleConfirmCourseUpdate = async () => {
    if (!pendingCourseUpdate) return;
    await StorageService.updateCourse(pendingCourseUpdate.id, pendingCourseUpdate.payload);
    AudioService.playCheck();
    setPendingCourseUpdate(null);
    setEditingCourseId(null);
    setIsCourseModalOpen(false);
    loadData();
  };

  const handleConfirmDeleteCourse = async () => {
    if (!confirmDeleteCourse) return;
    await StorageService.deleteCourse(confirmDeleteCourse.id);
    AudioService.playDelete();
    setConfirmDeleteCourse(null);
    loadData();
  };

  // ===== TASK CRUD =====
  const handleOpenCreateTask = () => {
    setEditingTaskId(null);
    setTaskTitle('');
    setTaskCourseId(courses[0]?.id || 'general');
    setTaskType('task');
    setTaskDueDate(new Date().toISOString().split('T')[0]);
    setTaskPriority('high');
    setTaskWeight('20');
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: UniversityTask) => {
    setEditingTaskId(task.id);
    setTaskTitle(task.title);
    setTaskCourseId(task.courseId);
    setTaskType(task.type);
    setTaskDueDate(task.dueDate);
    setTaskPriority(task.priority);
    setTaskWeight(String(task.weightPercentage || 20));
    setIsTaskModalOpen(true);
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    const course = courses.find(c => c.id === taskCourseId);

    if (editingTaskId) {
      setPendingTaskUpdate({
        id: editingTaskId,
        payload: {
          title: taskTitle.trim(),
          courseId: taskCourseId || 'general',
          courseName: course?.name || 'General',
          type: taskType,
          dueDate: taskDueDate,
          priority: taskPriority,
          weightPercentage: Number(taskWeight) || 20,
          rarity: taskType === 'exam' ? 'legendary' : taskType === 'project' ? 'epic' : 'rare',
        }
      });
    } else {
      await StorageService.saveUniversityTask({
        title: taskTitle.trim(),
        courseId: taskCourseId || 'general',
        courseName: course?.name || 'General',
        type: taskType,
        dueDate: taskDueDate,
        priority: taskPriority,
        weightPercentage: Number(taskWeight) || 20,
        rarity: taskType === 'exam' ? 'legendary' : taskType === 'project' ? 'epic' : 'rare',
      });

      setTaskTitle('');
      setIsTaskModalOpen(false);
      AudioService.playLevelUp();
      loadData();
    }
  };

  const handleConfirmTaskUpdate = async () => {
    if (!pendingTaskUpdate) return;
    await StorageService.updateUniversityTask(pendingTaskUpdate.id, pendingTaskUpdate.payload);
    AudioService.playCheck();
    setPendingTaskUpdate(null);
    setEditingTaskId(null);
    setIsTaskModalOpen(false);
    loadData();
  };

  const handleConfirmDeleteTask = async () => {
    if (!confirmDeleteTask) return;
    await StorageService.deleteUniversityTask(confirmDeleteTask.id);
    AudioService.playDelete();
    setConfirmDeleteTask(null);
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

  // ===== UNIT & WEEKS CRUD =====
  const openCreateUnitModal = () => {
    const semCourses = activeSemesterId === 'all' ? courses : courses.filter(c => c.semesterId === activeSemesterId);
    if (semCourses.length === 0) {
      handleOpenCreateCourse();
      return;
    }
    const defaultCourseId = (selectedCourseId !== 'all' && semCourses.some(c => c.id === selectedCourseId))
      ? selectedCourseId
      : semCourses[0]?.id || '';
    setEditingUnitId(null);
    setUnitTitle('');
    setUnitCourseId(defaultCourseId);
    setUnitTotalWeeks('17');
    setIsUnitModalOpen(true);
  };

  const handleEditUnit = (unit: UniversityUnit) => {
    setEditingUnitId(unit.id);
    setUnitTitle(unit.title);
    setUnitCourseId(unit.courseId);
    setUnitTotalWeeks(String(unit.totalWeeks || unit.weeks.length || 17));
    setIsUnitModalOpen(true);
  };

  const handleSaveUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim() || !unitCourseId || unitCourseId === 'all') return;

    let semId = activeSemesterId;
    if (!editingUnitId && semId === 'all') {
      const selectedCourse = courses.find(c => c.id === unitCourseId);
      if (selectedCourse?.semesterId) {
        semId = selectedCourse.semesterId;
      } else if (semesters.length > 0) {
        semId = semesters[0].id;
      } else {
        const newSem = await StorageService.saveSemester('2026-I');
        semId = newSem.id;
      }
    }

    const total = Math.max(1, Math.min(17, Number(unitTotalWeeks) || 17));

    if (editingUnitId) {
      setPendingUnitUpdate({
        id: editingUnitId,
        title: unitTitle.trim(),
        courseId: unitCourseId,
        totalWeeks: total
      });
    } else {
      const weeks: UniversityUnitWeek[] = Array.from({ length: total }, (_, i) => ({
        weekNumber: i + 1,
        completed: false,
        title: `Semana ${i + 1}`,
        notes: '',
        files: []
      }));

      const newUnit: UniversityUnit = {
        id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: unitTitle.trim(),
        courseId: unitCourseId,
        semesterId: semId,
        totalWeeks: total,
        weeks
      };

      const updatedUnits = [...units, newUnit];
      await StorageService.saveCourseUnitsProgress(updatedUnits);
      setUnits(updatedUnits);
      setExpandedUnits(prev => ({ ...prev, [newUnit.id]: true }));
      setUnitTitle('');
      setIsUnitModalOpen(false);
      AudioService.playLevelUp();
    }
  };

  const handleConfirmUnitUpdate = async () => {
    if (!pendingUnitUpdate) return;
    const { id, title: uTitle, courseId: cId, totalWeeks: total } = pendingUnitUpdate;
    const updatedUnits = units.map(u => {
      if (u.id !== id) return u;
      let updatedWeeks = [...(u.weeks || [])];
      if (total > updatedWeeks.length) {
        const diff = total - updatedWeeks.length;
        const added: UniversityUnitWeek[] = Array.from({ length: diff }, (_, i) => ({
          weekNumber: updatedWeeks.length + i + 1,
          completed: false,
          title: `Semana ${updatedWeeks.length + i + 1}`,
          notes: '',
          files: []
        }));
        updatedWeeks = [...updatedWeeks, ...added];
      } else if (total < updatedWeeks.length) {
        updatedWeeks = updatedWeeks.slice(0, total);
      }
      return {
        ...u,
        title: uTitle,
        courseId: cId,
        totalWeeks: total,
        weeks: updatedWeeks
      };
    });
    await StorageService.saveCourseUnitsProgress(updatedUnits);
    setUnits(updatedUnits);
    setEditingUnitId(null);
    setPendingUnitUpdate(null);
    setUnitTitle('');
    setIsUnitModalOpen(false);
    AudioService.playCheck();
  };

  const handleConfirmDeleteUnit = async () => {
    if (!confirmDeleteUnit) return;
    const updated = units.filter(u => u.id !== confirmDeleteUnit.id);
    setUnits(updated);
    await StorageService.deleteCourseUnitProgress(confirmDeleteUnit.id);
    AudioService.playDelete();
    setConfirmDeleteUnit(null);
  };

  const handleAddWeek = async (unitId: string) => {
    const updated = units.map(u => {
      if (u.id !== unitId) return u;
      const currentWeeks = u.weeks || [];
      const nextWeekNumber = currentWeeks.length + 1;
      const newWeek: UniversityUnitWeek = {
        weekNumber: nextWeekNumber,
        completed: false,
        title: `Semana ${nextWeekNumber}`,
        notes: '',
        files: []
      };
      const updatedWeeks = [...currentWeeks, newWeek];
      return {
        ...u,
        weeks: updatedWeeks,
        totalWeeks: updatedWeeks.length
      };
    });
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
    AudioService.playLevelUp();
  };

  const handleConfirmDeleteWeek = async () => {
    if (!confirmDeleteWeek) return;
    const { unitId, weekNumber } = confirmDeleteWeek;
    const updated = units.map(u => {
      if (u.id !== unitId) return u;
      const filteredWeeks = (u.weeks || []).filter(w => w.weekNumber !== weekNumber);
      const renumberedWeeks = filteredWeeks.map((w, idx) => ({
        ...w,
        weekNumber: idx + 1
      }));
      return {
        ...u,
        weeks: renumberedWeeks,
        totalWeeks: renumberedWeeks.length
      };
    });
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
    AudioService.playDelete();
    setConfirmDeleteWeek(null);
  };

  const handleUpdateWeekTitle = async (unitId: string, weekNumber: number, title: string) => {
    const updated = units.map(u => {
      if (u.id !== unitId) return u;
      const newWeeks = (u.weeks || []).map(w => {
        if (w.weekNumber === weekNumber) {
          return { ...w, title, name: title };
        }
        return w;
      });
      return { ...u, weeks: newWeeks };
    });
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
    AudioService.playCheck();
  };

  const handleToggleWeek = async (unitId: string, weekNumber: number) => {
    let completedJustNow = false;
    let unitObj: UniversityUnit | null = null;

    const updated = units.map(u => {
      if (u.id !== unitId) return u;
      const newWeeks = u.weeks.map(w => {
        if (w.weekNumber === weekNumber) {
          return { ...w, completed: !w.completed };
        }
        return w;
      });
      const isComplete = newWeeks.every(w => w.completed);
      if (isComplete && !u.completed) {
        completedJustNow = true;
        unitObj = { ...u, weeks: newWeeks, completed: true };
      }
      return { ...u, weeks: newWeeks, completed: isComplete };
    });

    setUnits(updated);
    AudioService.playCheck();
    await StorageService.saveCourseUnitsProgress(updated);

    if (completedJustNow && unitObj) {
      confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 } });
      AudioService.playLevelUp();
    }
  };

  const handleUpdateWeekNotes = async (unitId: string, weekNumber: number, notes: string) => {
    const updated = units.map(u => {
      if (u.id !== unitId) return u;
      const newWeeks = u.weeks.map(w => {
        if (w.weekNumber === weekNumber) {
          return { ...w, notes };
        }
        return w;
      });
      return { ...u, weeks: newWeeks };
    });
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
  };

  // ===== FILE ATTACHMENTS & RICH NOTES =====
  const handleOpenAttachModal = (unitId: string, weekNumber: number) => {
    setTargetUnitId(unitId);
    setTargetWeekNum(weekNumber);
    setAttachFileName('');
    setAttachTextContent('');
    setAttachFileUrl('');
    setAttachFileSize(0);
    setSelectedFileObj(null);
    setIsDraggingFile(false);
    setIsAttachModalOpen(true);
  };

  const handleProcessFile = (file: File) => {
    setSelectedFileObj(file);
    setAttachFileSize(file.size);
    if (!attachFileName.trim()) {
      setAttachFileName(file.name);
    }

    const isImg = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
    const isPdfDoc = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    const isTxtDoc = file.type.startsWith('text/') || /\.(txt|md|markdown|json|csv|py|js|ts|tsx|jsx|html|css|cpp|c|java)$/i.test(file.name);
    const isOffice = /\.(docx?|pptx?|xlsx?|rtf)$/i.test(file.name);

    if (isImg) {
      setAttachFileType('image');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAttachFileUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else if (isPdfDoc) {
      setAttachFileType('pdf');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAttachFileUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else if (isTxtDoc) {
      setAttachFileType('text');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          const text = e.target.result as string;
          setAttachTextContent(prev => prev ? `${prev}\n\n${text}` : text);
        }
      };
      reader.readAsText(file);
    } else if (isOffice) {
      setAttachFileType('office');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAttachFileUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    } else {
      setAttachFileType('pdf');
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          setAttachFileUrl(e.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveSelectedFile = () => {
    setSelectedFileObj(null);
    setAttachFileUrl('');
    setAttachFileSize(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveAttachment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetUnitId || targetWeekNum === null || !attachFileName.trim()) return;

    const newFile: UniversityFile = {
      id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: attachFileName.trim(),
      type: attachFileType,
      uri: attachFileUrl.trim() || 'local://note',
      textContent: attachTextContent.trim() || undefined,
      size: attachFileSize || (attachTextContent.length ? attachTextContent.length * 2 : 1024 * 50),
      addedAt: new Date().toISOString()
    };

    const updated = units.map(u => {
      if (u.id === targetUnitId) {
        const newWeeks = u.weeks.map(w => {
          if (w.weekNumber === targetWeekNum) {
            return { ...w, files: [...(w.files || []), newFile] };
          }
          return w;
        });
        return { ...u, weeks: newWeeks };
      }
      return u;
    });

    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
    setIsAttachModalOpen(false);
    AudioService.playCoin();
  };

  const handleDeleteSemester = (sem: Semester) => {
    setConfirmDeleteSemester(sem);
  };

  const handleDeleteCourse = (course: Course) => {
    setConfirmDeleteCourse(course);
  };

  const handleDeleteTask = (task: UniversityTask) => {
    setConfirmDeleteTask(task);
  };

  const handleDeleteUnit = (unit: UniversityUnit) => {
    setConfirmDeleteUnit(unit);
  };

  const handleDeleteWeek = (unitId: string, weekNumber: number) => {
    setConfirmDeleteWeek({ unitId, weekNumber });
  };

  const handleDeleteFile = (unitId: string, weekNumber: number, fileId: string, fileName: string) => {
    setConfirmDeleteFile({ unitId, weekNumber, fileId, fileName });
  };

  const handleConfirmDeleteFile = async () => {
    if (!confirmDeleteFile) return;
    const { unitId, weekNumber, fileId } = confirmDeleteFile;
    const updated = units.map(u => {
      if (u.id === unitId) {
        const newWeeks = u.weeks.map(w => {
          if (w.weekNumber === weekNumber) {
            return { ...w, files: (w.files || []).filter(f => f.id !== fileId) };
          }
          return w;
        });
        return { ...u, weeks: newWeeks };
      }
      return u;
    });
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);
    AudioService.playDelete();
    setConfirmDeleteFile(null);
  };

  const handleAddEvaluation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvalName.trim()) return;
    const newEval = {
      id: `eval_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      name: newEvalName.trim(),
      weight: Number(newEvalWeight) || 20,
      score: Number(newEvalScore) || 14
    };
    setGradeEvaluations(prev => [...prev, newEval]);
    setNewEvalName('');
    setIsAddEvalModalOpen(false);
    AudioService.playCheck();
  };

  const handleConfirmDeleteEval = () => {
    if (!confirmDeleteEvalId) return;
    setGradeEvaluations(prev => prev.filter(e => e.id !== confirmDeleteEvalId));
    setConfirmDeleteEvalId(null);
    AudioService.playDelete();
  };

  // ===== AI MATERIAL ANALYSIS =====
  const handleOpenAIModal = (unitId: string, weekNum: number, file: UniversityFile) => {
    setTargetUnitId(unitId);
    setTargetWeekNum(weekNum);
    setTargetFile(file);
    setAiResultText(null);
    setIsAIModalOpen(true);
  };

  const handleRunAISummary = async () => {
    if (!targetUnitId || targetWeekNum === null || !targetFile) return;
    const unit = units.find(u => u.id === targetUnitId);
    const courseName = unit ? getCourseName(unit.courseId) : 'Universidad';

    setAiLoading(true);
    setAiResultTitle(`Resumen Ejecutivo (${targetFile.name})`);

    try {
      const summary = await AIService.summarizeMaterial(
        targetFile.name,
        targetFile.textContent || targetFile.name,
        courseName,
        unit?.title || 'Unidad',
        targetWeekNum,
        selectedAIProvider
      );
      setAiResultText(summary);

      // Save summary in file object
      const updated = units.map(u => {
        if (u.id === targetUnitId) {
          const newWeeks = u.weeks.map(w => {
            if (w.weekNumber === targetWeekNum) {
              const newFiles = (w.files || []).map(f => f.id === targetFile.id ? { ...f, aiSummary: summary } : f);
              return { ...w, files: newFiles };
            }
            return w;
          });
          return { ...u, weeks: newWeeks };
        }
        return u;
      });
      setUnits(updated);
      await StorageService.saveCourseUnitsProgress(updated);
      AudioService.playLevelUp();
    } catch (e) {
      setAiResultText('Error al procesar con IA. Revisa tu conexión a internet.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleRunAIFlashcards = async () => {
    if (!targetUnitId || targetWeekNum === null || !targetFile) return;
    const unit = units.find(u => u.id === targetUnitId);
    const courseName = unit ? getCourseName(unit.courseId) : 'Universidad';

    setAiLoading(true);
    setAiResultTitle(`Flashcards de Repaso (${targetFile.name})`);

    try {
      const flashcards = await AIService.generateFlashcards(
        targetFile.name,
        targetFile.textContent || targetFile.name,
        courseName,
        selectedAIProvider
      );

      // Save flashcards in file object
      const updated = units.map(u => {
        if (u.id === targetUnitId) {
          const newWeeks = u.weeks.map(w => {
            if (w.weekNumber === targetWeekNum) {
              const newFiles = (w.files || []).map(f => f.id === targetFile.id ? { ...f, flashcards } : f);
              return { ...w, files: newFiles };
            }
            return w;
          });
          return { ...u, weeks: newWeeks };
        }
        return u;
      });
      setUnits(updated);
      await StorageService.saveCourseUnitsProgress(updated);

      const formatted = flashcards.map((fc, i) => `📇 **Tarjeta ${i + 1}**\n**P:** ${fc.question}\n**R:** ${fc.answer}`).join('\n\n');
      setAiResultText(formatted);
      AudioService.playLevelUp();
    } catch (e) {
      setAiResultText('Error generando flashcards.');
    } finally {
      setAiLoading(false);
    }
  };

  // ===== EVALUATION EXAM =====
  const handleOpenExam = async (unit: UniversityUnit) => {
    setTargetUnitForExam(unit);
    setExamSubmitted(false);
    setExamScore(null);
    setExamAnswers({});

    if (unit.evaluationExam && unit.evaluationExam.length > 0) {
      setGeneratedExam(unit.evaluationExam);
      setIsExamModalOpen(true);
      return;
    }

    // Generate new exam
    setAiLoading(true);
    setIsExamModalOpen(true);

    try {
      const allFiles = unit.weeks.flatMap(w => (w.files || []).map(f => `${f.name}: ${f.textContent || ''}`)).join('\n');
      const courseName = getCourseName(unit.courseId);

      const exam = await AIService.generateEvaluationExam(
        courseName,
        unit.title,
        allFiles || unit.title,
        selectedAIProvider
      );

      setGeneratedExam(exam);

      // Save exam in unit
      const updated = units.map(u => u.id === unit.id ? { ...u, evaluationExam: exam } : u);
      setUnits(updated);
      await StorageService.saveCourseUnitsProgress(updated);
      AudioService.playLevelUp();
    } catch (e) {
      console.error(e);
    } finally {
      setAiLoading(false);
    }
  };

  const handleGradeExam = async () => {
    if (generatedExam.length === 0 || !targetUnitForExam) return;

    let correct = 0;
    generatedExam.forEach((q, idx) => {
      if (examAnswers[idx] === q.correctAnswer) {
        correct += 1;
      }
    });

    const score = Math.round((correct / generatedExam.length) * 100);
    setExamScore(score);
    setExamSubmitted(true);

    // Save score in unit
    const updated = units.map(u => u.id === targetUnitForExam.id ? { ...u, examScore: score } : u);
    setUnits(updated);
    await StorageService.saveCourseUnitsProgress(updated);

    if (score >= 60) {
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
      AudioService.playLevelUp();
      await StorageService.addXP(100);
    } else {
      AudioService.playCoin();
    }
  };

  // Filtered lists
  const filteredCourses = activeSemesterId === 'all'
    ? courses
    : courses.filter(c => c.semesterId === activeSemesterId);

  const unassignedCourses = courses.filter(c => !c.semesterId || c.semesterId === '');

  const filteredUnits = units.filter(u => {
    if (selectedCourseId !== 'all' && u.courseId !== selectedCourseId) return false;
    if (activeSemesterId !== 'all' && u.semesterId && u.semesterId !== activeSemesterId) return false;
    return true;
  });

  const filteredTasks = tasks.filter(t => {
    if (selectedCourseId !== 'all' && t.courseId !== selectedCourseId) return false;
    return true;
  });

  // Calculate Weighted Average
  const totalWeight = gradeEvaluations.reduce((acc, ev) => acc + (Number(ev.weight) || 0), 0);
  const weightedSum = gradeEvaluations.reduce((acc, ev) => acc + (Number(ev.score) || 0) * ((Number(ev.weight) || 0) / 100), 0);
  const finalAverage = totalWeight > 0 ? (weightedSum / (totalWeight / 100)).toFixed(2) : '0.00';
  const isApproved = Number(finalAverage) >= 10.5;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn">
      {/* Header with Semester & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GraduationCap className="w-7 h-7 text-primary" />
            <h1 className="text-2xl font-black text-white">Centro Universitario & Sílabos</h1>
          </div>
          <p className="text-xs text-gray-400">
            Malla curricular, control de 17 semanas con PDFs/notas, análisis multi-IA y simulador de promedios.
          </p>
        </div>

        {/* Semester Selector & Add */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-2xl border border-white/10 text-xs">
            <Calendar className="w-4 h-4 text-purple-400" />
            <span className="text-gray-400 font-bold">Ciclo:</span>
            <select
              value={activeSemesterId}
              onChange={(e) => setActiveSemesterId(e.target.value)}
              className="bg-transparent text-white font-bold focus:outline-none cursor-pointer"
            >
              <option value="all">Todos los Semestres</option>
              {semesters.map(s => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">{s.name}</option>
              ))}
            </select>
            {activeSemesterId !== 'all' && (
              <div className="flex items-center gap-1 border-l border-white/10 pl-1.5 ml-1">
                <button
                  type="button"
                  onClick={() => {
                    const current = semesters.find(s => s.id === activeSemesterId);
                    if (current) {
                      setEditingSemesterId(current.id);
                      setNewSemesterName(current.name);
                      setIsSemesterModalOpen(true);
                    }
                  }}
                  className="p-1 rounded-lg text-gray-400 hover:text-purple-300 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Editar ciclo seleccionado"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = semesters.find(s => s.id === activeSemesterId);
                    if (current) {
                      setConfirmDeleteSemester(current);
                    }
                  }}
                  className="p-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-white/5 transition-colors cursor-pointer"
                  title="Eliminar ciclo seleccionado"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setEditingSemesterId(null);
              setNewSemesterName('');
              setIsSemesterModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
            title="Administrar o Añadir Semestre"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Gestionar Ciclos</span>
          </button>

          <button
            onClick={() => setIsUnajModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer shadow-lg hover:shadow-indigo-500/20"
            title="Sincronizar con Aula Virtual UNAJ"
          >
            <img src="/assets/unaj_logo.png" alt="UNAJ" className="w-4 h-4 object-contain" />
            <span className="hidden sm:inline">Sincronizar UNAJ</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-2xl bg-white/[0.03] border border-white/10 backdrop-blur-md">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {[
            { id: 'units', label: 'Sílabo & Unidades (17 Semanas)', icon: FolderOpen, count: filteredUnits.length },
            { id: 'tasks', label: 'Entregables & Exámenes', icon: BookOpen, count: filteredTasks.filter(t => !t.completed).length },
            { id: 'schedule', label: 'Horario Semanal', icon: Clock },
            { id: 'courses', label: 'Malla & Cursos', icon: Layers, count: filteredCourses.length },
            { id: 'grades', label: 'Calculadora de Promedios', icon: Calculator },
          ].map((tab) => {
            const Icon = tab.icon;
            const isSel = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                  isSel
                    ? 'bg-gradient-to-r from-primary to-primary-dark text-white shadow-md shadow-primary/30 font-extrabold'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSel ? 'bg-white text-primary' : 'bg-white/10 text-gray-300'}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Action Button for Active Tab */}
        <div>
          {activeTab === 'units' && activeSemesterId !== 'all' && selectedCourseId !== 'all' && (
            <button
              onClick={openCreateUnitModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> Nueva Unidad
            </button>
          )}
          {activeTab === 'tasks' && (
            <button
              onClick={() => setIsTaskModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-md shadow-primary/20 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> Nuevo Entregable
            </button>
          )}
          {activeTab === 'courses' && activeSemesterId !== 'all' && (
            <button
              onClick={() => setIsCourseModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-600/20 hover:brightness-110 transition-all"
            >
              <Plus className="w-4 h-4" /> Agregar Curso
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* TAB: HORARIO SEMANAL UNIVERSITARIO                            */}
      {/* ============================================================ */}
      {activeTab === 'schedule' && (
        <div className="animate-fadeIn">
          <ScheduleView onNavigateCourse={(cId) => { setSelectedCourseId(cId); setActiveTab('units'); }} />
        </div>
      )}

      {/* Course Filter Pills for Tasks */}
      {activeTab === 'tasks' && courses.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-gray-400 font-bold shrink-0">Filtrar Curso:</span>
          <button
            onClick={() => setSelectedCourseId('all')}
            className={`px-3 py-1 rounded-xl transition-all font-bold ${
              selectedCourseId === 'all'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/[0.03] text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {courses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              className={`px-3 py-1 rounded-xl transition-all font-bold flex items-center gap-1.5 border ${
                selectedCourseId === c.id
                  ? 'text-white shadow-md'
                  : 'bg-white/[0.03] text-gray-400 hover:text-white border-white/5'
              }`}
              style={{
                backgroundColor: selectedCourseId === c.id ? `${c.color}30` : undefined,
                borderColor: selectedCourseId === c.id ? c.color : undefined
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      )}

      {/* Course Filter Pills for Units (only inside a specific semester) */}
      {activeTab === 'units' && activeSemesterId !== 'all' && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
          <span className="text-gray-400 font-bold shrink-0">Filtrar Curso:</span>
          <button
            onClick={() => setSelectedCourseId('all')}
            className={`px-3 py-1 rounded-xl transition-all font-bold ${
              selectedCourseId === 'all'
                ? 'bg-white/20 text-white border border-white/30'
                : 'bg-white/[0.03] text-gray-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {filteredCourses.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCourseId(c.id)}
              className={`px-3 py-1 rounded-xl transition-all font-bold flex items-center gap-1.5 border ${
                selectedCourseId === c.id
                  ? 'text-white shadow-md'
                  : 'bg-white/[0.03] text-gray-400 hover:text-white border-white/5'
              }`}
              style={{
                backgroundColor: selectedCourseId === c.id ? `${c.color}30` : undefined,
                borderColor: selectedCourseId === c.id ? c.color : undefined
              }}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              <span>{c.name}</span>
            </button>
          ))}
          <button
            onClick={handleOpenCreateCourse}
            className="px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white border border-purple-500/40 font-bold flex items-center gap-1 transition-all ml-1 shrink-0"
            title="Crear Curso para este Ciclo"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Curso</span>
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 1: SÍLABO & UNIDADES (17 SEMANAS) CON DOCUMENTOS E IA     */}
      {/* ============================================================ */}

      {/* Level 1: Semesters Grid (activeSemesterId === 'all') */}
      {activeTab === 'units' && activeSemesterId === 'all' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Ciclos Académicos & Sílabos
              </h2>
              <p className="text-xs text-gray-400">
                Selecciona un ciclo académico para gestionar sus cursos, unidades de estudio (17 semanas) y sílabos.
              </p>
            </div>
            <button
              onClick={() => setIsSemesterModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Nuevo Ciclo
            </button>
          </div>

          {semesters.length === 0 ? (
            <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-3">
              <Layers className="w-12 h-12 text-primary/40 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes ciclos académicos creados</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Crea tu primer ciclo académico (ej. 2026-I) para comenzar a organizar tus cursos y sílabos.
              </p>
              <button
                onClick={() => setIsSemesterModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
              >
                + Crear Primer Ciclo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {semesters.map((sem) => {
                const semCourses = courses.filter(c => c.semesterId === sem.id);
                const semCourseIds = semCourses.map(c => c.id);
                const semUnits = units.filter(u => semCourseIds.includes(u.courseId));
                const totalWeeks = semUnits.reduce((acc, u) => acc + (u.totalWeeks || 17), 0);
                const completedWeeks = semUnits.reduce((acc, u) => acc + u.weeks.filter(w => w.completed).length, 0);
                const progress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

                return (
                  <div
                    key={sem.id}
                    onClick={() => {
                      setActiveSemesterId(sem.id);
                      setSelectedCourseId('all');
                    }}
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-purple-500/50 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] group"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300">
                          {sem.isCurrent ? '⭐ Ciclo Actual' : 'Ciclo Académico'}
                        </span>
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => {
                              setEditingSemesterId(sem.id);
                              setNewSemesterName(sem.name);
                              setIsSemesterModalOpen(true);
                            }}
                            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteSemester(sem)}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-gray-400 hover:text-rose-400"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h3 className="text-xl font-black text-white group-hover:text-purple-400 transition-colors">
                        {sem.name}
                      </h3>

                      <p className="text-xs text-gray-400 font-medium">
                        📚 {semCourses.length} {semCourses.length === 1 ? 'curso registrado' : 'cursos registrados'}
                      </p>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span>Progreso del Ciclo</span>
                        <span className="font-bold text-white">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 group-hover:text-white transition-colors">
                        <span>Ver Cursos & Sílabos</span>
                        <span className="font-bold text-purple-400">Abrir Ciclo →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Level 2: Courses in Selected Semester (activeSemesterId !== 'all' && selectedCourseId === 'all') */}
      {activeTab === 'units' && activeSemesterId !== 'all' && selectedCourseId === 'all' && (
        <div className="space-y-6 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <button
                  onClick={() => setActiveSemesterId('all')}
                  className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                >
                  ← Todos los Semestres
                </button>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300">
                  {semesters.find(s => s.id === activeSemesterId)?.name || 'Ciclo'}
                </span>
              </div>
              <h2 className="text-lg font-black text-white flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-primary" />
                Cursos & Sílabos de este Ciclo
              </h2>
              <p className="text-xs text-gray-400">
                Selecciona un curso para ver y gestionar sus unidades de estudio, avance semana a semana (1 a 17) y archivos.
              </p>
            </div>
            <button
              onClick={handleOpenCreateCourse}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-600/20 hover:brightness-110 transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" /> Agregar Curso
            </button>
          </div>

          {filteredCourses.length === 0 ? (
            <div className="text-center py-10 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-4">
              <BookOpen className="w-12 h-12 text-primary/40 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-white">Sin cursos registrados en este ciclo</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Agrega los cursos correspondientes a este semestre para comenzar a registrar tus unidades y sílabos.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  onClick={handleOpenCreateCourse}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Crear Nuevo Curso
                </button>
              </div>
              {unassignedCourses.length > 0 && (
                <div className="pt-4 border-t border-white/5 max-w-md mx-auto">
                  <p className="text-xs font-bold text-gray-300 mb-2">O vincular cursos creados desde el horario:</p>
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {unassignedCourses.map(uc => (
                      <button
                        key={uc.id}
                        onClick={() => handleAssignCourseToSemester(uc.id, activeSemesterId)}
                        className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500 text-xs font-bold text-white flex items-center gap-1.5 transition-all"
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: uc.color }} />
                        <span>{uc.name}</span>
                        <span className="text-purple-400 text-[11px]">+ Asignar</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCourses.map((course) => {
                const courseUnits = units.filter(u => u.courseId === course.id);
                const totalWeeks = courseUnits.reduce((acc, u) => acc + (u.totalWeeks || 17), 0);
                const completedWeeks = courseUnits.reduce((acc, u) => acc + u.weeks.filter(w => w.completed).length, 0);
                const progress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

                return (
                  <div
                    key={course.id}
                    onClick={() => {
                      setSelectedCourseId(course.id);
                      setUnitCourseId(course.id);
                    }}
                    className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-white/20 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] group"
                    style={{ borderLeftWidth: '6px', borderLeftColor: course.color }}
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold"
                          style={{ backgroundColor: `${course.color}20`, color: course.color }}
                        >
                          {course.code || 'CURSO'}
                        </span>
                        <span className="text-xs text-gray-400 font-mono font-bold">
                          {courseUnits.length} {courseUnits.length === 1 ? 'unidad' : 'unidades'}
                        </span>
                      </div>

                      <h3 className="text-lg font-black text-white group-hover:text-primary transition-colors">
                        {course.name}
                      </h3>

                      <div className="space-y-1 text-xs text-gray-400 font-medium">
                        {course.professor && <p>👨‍🏫 Prof: {course.professor}</p>}
                        {course.classroom && <p>🏛️ Aula: {course.classroom}</p>}
                        <p>🎓 Créditos: {course.credits || 4}</p>
                      </div>
                    </div>

                    <div className="space-y-2 pt-3 border-t border-white/5">
                      <div className="flex justify-between text-xs text-gray-400 font-mono">
                        <span>Avance del Sílabo</span>
                        <span className="font-bold text-white">{progress}%</span>
                      </div>
                      <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, backgroundColor: course.color }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 group-hover:text-white transition-colors">
                        <span>Gestionar Unidades & Semanas</span>
                        <span className="font-bold text-primary">Ver Sílabo →</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* When a specific course is selected in units */}
      {activeTab === 'units' && selectedCourseId !== 'all' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Header for the selected course with back button & quick add */}
          {(() => {
            const currentCourse = courses.find(c => c.id === selectedCourseId);
            const courseUnits = units.filter(u => u.courseId === selectedCourseId);
            const totalWeeks = courseUnits.reduce((acc, u) => acc + (u.totalWeeks || 17), 0);
            const completedWeeks = courseUnits.reduce((acc, u) => acc + u.weeks.filter(w => w.completed).length, 0);
            const progress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

            return (
              <div
                className="p-5 rounded-3xl bg-white/[0.04] border border-white/10 backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{ borderLeftWidth: '6px', borderLeftColor: currentCourse?.color || '#6C63FF' }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedCourseId('all')}
                      className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                    >
                      ← Todos los Cursos
                    </button>
                    <span
                      className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold"
                      style={{ backgroundColor: `${currentCourse?.color || '#6C63FF'}20`, color: currentCourse?.color || '#6C63FF' }}
                    >
                      {currentCourse?.code || 'CURSO'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-white">{currentCourse?.name || 'Materia'}</h2>
                  <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                    <span>{courseUnits.length} {courseUnits.length === 1 ? 'unidad' : 'unidades'} registradas</span>
                    <span>•</span>
                    <span className="font-bold text-white">Progreso total: {progress}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={openCreateUnitModal}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-white text-xs font-bold shadow-md shadow-indigo-500/20 hover:brightness-110 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Nueva Unidad
                  </button>
                </div>
              </div>
            );
          })()}

          {filteredUnits.map((unit) => {
            const course = courses.find(c => c.id === unit.courseId);
            const courseColor = course?.color || '#6C63FF';
            const completedWeeks = unit.weeks.filter(w => w.completed).length;
            const unitPercent = Math.round((completedWeeks / (unit.totalWeeks || 17)) * 100);
            const isExpanded = Boolean(expandedUnits[unit.id]);

            return (
              <div
                key={unit.id}
                className="rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl overflow-hidden shadow-xl transition-all"
                style={{ borderLeftWidth: '6px', borderLeftColor: courseColor }}
              >
                {/* Unit Header Banner */}
                <div
                  onClick={(e) => toggleUnit(unit.id, e)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-white/[0.02] transition-all"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold px-2.5 py-0.5 rounded-full"
                        style={{ backgroundColor: `${courseColor}20`, color: courseColor }}
                      >
                        {course?.name || 'Materia General'}
                      </span>
                      {unit.examScore !== undefined && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold font-mono">
                          🏆 Examen: {unit.examScore}%
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-black text-white truncate">{unit.title}</h3>
                    <div className="flex items-center gap-3 text-xs text-gray-400 font-mono">
                      <span>{completedWeeks} de {unit.totalWeeks || 17} semanas completadas</span>
                      <span className="font-bold" style={{ color: courseColor }}>{unitPercent}%</span>
                    </div>
                  </div>

                  {/* Actions & Progress Bar */}
                  <div className="flex items-center gap-2 shrink-0" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenExam(unit)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all"
                      title="Generar o rendir examen con IA"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      <span>{unit.evaluationExam ? 'Rendir Examen IA' : 'Generar Examen IA'}</span>
                    </button>

                    <button
                      onClick={() => handleEditUnit(unit)}
                      className="p-2 rounded-xl text-gray-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                      title="Editar unidad (Nombre, curso, total de semanas)"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDeleteUnit(unit)}
                      className="p-2 rounded-xl text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar unidad"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => toggleUnit(unit.id, e)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Progress bar line */}
                <div className="h-1.5 w-full bg-black/40">
                  <div
                    className="h-full transition-all duration-500"
                    style={{ width: `${unitPercent}%`, backgroundColor: courseColor }}
                  />
                </div>

                {/* Expanded Weeks List */}
                {isExpanded && (
                  <div className="p-6 border-t border-white/5 space-y-4 bg-black/20" onClick={e => e.stopPropagation()}>
                    <div className="space-y-3">
                      {unit.weeks.map((week) => {
                        const weekKey = `${unit.id}_w_${week.weekNumber}`;
                        const isWeekOpen = Boolean(expandedWeeks[weekKey]);
                        const filesCount = (week.files || []).length;
                        const hasNotes = Boolean(week.notes?.trim());

                        return (
                          <div
                            key={week.weekNumber}
                            className={`rounded-2xl border transition-all ${
                              week.completed
                                ? 'bg-emerald-950/15 border-emerald-500/30'
                                : 'bg-white/[0.02] border-white/10 hover:border-white/20'
                            }`}
                            onClick={e => e.stopPropagation()}
                          >
                            {/* Week Header Row */}
                            <div className="p-4 flex items-center justify-between gap-3">
                              <div className="flex items-center gap-3 min-w-0 flex-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleToggleWeek(unit.id, week.weekNumber);
                                  }}
                                  className="shrink-0 p-1 rounded-lg hover:bg-white/10 transition-all"
                                >
                                  {week.completed ? (
                                    <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                                  ) : (
                                    <Circle className="w-6 h-6 text-gray-500 hover:text-emerald-400" />
                                  )}
                                </button>

                                <div
                                  onClick={(e) => toggleWeek(weekKey, e)}
                                  className="cursor-pointer min-w-0 flex-1"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-black text-white">
                                      {week.name && week.name.trim()
                                        ? (week.name.trim().toLowerCase().startsWith('semana') ? week.name.trim() : `Semana ${week.weekNumber} - ${week.name.trim()}`)
                                        : (week.title || `Semana ${week.weekNumber}`)}
                                    </span>
                                    {filesCount > 0 && (
                                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-primary/20 text-primary-light font-bold font-mono">
                                        📎 {filesCount} archivo{filesCount > 1 ? 's' : ''}
                                      </span>
                                    )}
                                    {hasNotes && (
                                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                                        📝 Notas
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-400 truncate">
                                    {week.notes?.slice(0, 70) || (week.completed ? 'Semana completada' : 'Haz clic para ver notas y adjuntar materiales')}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => handleOpenAttachModal(unit.id, week.weekNumber)}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
                                  title="Adjuntar PDF / Documento / Texto"
                                >
                                  <FileUp className="w-3.5 h-3.5 text-accent" />
                                  <span>Adjuntar</span>
                                </button>

                                <button
                                  onClick={() => handleDeleteWeek(unit.id, week.weekNumber)}
                                  className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                                  title={`Eliminar Semana ${week.weekNumber}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                <button
                                  onClick={(e) => toggleWeek(weekKey, e)}
                                  className="p-2 rounded-xl text-gray-400 hover:text-white"
                                >
                                  {isWeekOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Week Content (Notes & Attached Files) */}
                            {isWeekOpen && (
                              <div className="p-4 pt-0 border-t border-white/5 space-y-4" onClick={e => e.stopPropagation()}>
                                {/* Week Topic / Title Field */}
                                <div className="flex items-center gap-2 pt-3" onClick={e => e.stopPropagation()}>
                                  <label className="text-xs font-bold text-gray-400 shrink-0">Tema / Título:</label>
                                  <input
                                    type="text"
                                    value={week.name || week.title || ''}
                                    placeholder={`Ej: Semana ${week.weekNumber} - Conceptos Clave`}
                                    onChange={(e) => handleUpdateWeekTitle(unit.id, week.weekNumber, e.target.value)}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:border-primary focus:outline-none placeholder:text-gray-600"
                                  />
                                </div>
                                {/* Week Notes Section with Rich Editor Toggle */}
                                <div className="space-y-2 pt-3" onClick={e => e.stopPropagation()}>
                                  <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                                      <Edit3 className="w-3.5 h-3.5 text-primary-light" />
                                      Notas y Resumen de la Clase:
                                    </label>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const key = `${unit.id}_${week.weekNumber}`;
                                        setEditingWeekNotesKey(editingWeekNotesKey === key ? null : key);
                                      }}
                                      className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white transition-all font-bold"
                                    >
                                      {editingWeekNotesKey === `${unit.id}_${week.weekNumber}` ? (
                                        <>
                                          <Check className="w-3 h-3 text-emerald-400" />
                                          <span>Listo</span>
                                        </>
                                      ) : (
                                        <>
                                          <Edit3 className="w-3 h-3 text-accent" />
                                          <span>{week.notes ? 'Editar Apuntes' : '+ Escribir Apuntes'}</span>
                                        </>
                                      )}
                                    </button>
                                  </div>

                                  {editingWeekNotesKey === `${unit.id}_${week.weekNumber}` ? (
                                    <div className="space-y-1 animate-fadeIn" onClick={e => e.stopPropagation()}>
                                      <RichTextEditor
                                        value={week.notes || ''}
                                        onChange={(newNotes) => handleUpdateWeekNotes(unit.id, week.weekNumber, newNotes)}
                                        placeholder="Escribe tus apuntes, temas vistos en clase, fórmulas o definiciones..."
                                        minHeight="140px"
                                        showPreviewTabs={true}
                                      />
                                    </div>
                                  ) : week.notes?.trim() ? (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingWeekNotesKey(`${unit.id}_${week.weekNumber}`);
                                      }}
                                      className="p-3.5 rounded-2xl bg-black/40 border border-white/10 hover:border-primary/40 transition-all cursor-pointer shadow-inner"
                                      title="Haz clic para editar notas"
                                    >
                                      <MarkdownRenderer content={week.notes} />
                                    </div>
                                  ) : (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingWeekNotesKey(`${unit.id}_${week.weekNumber}`);
                                      }}
                                      className="p-3 rounded-2xl bg-white/[0.01] border border-dashed border-white/10 hover:border-primary/40 text-center cursor-pointer transition-all text-xs text-gray-500 hover:text-gray-300"
                                    >
                                      <span>📝 Sin notas registradas esta semana. Haz clic para redactar con formato.</span>
                                    </div>
                                  )}
                                </div>

                                {/* Attached Files Grid */}
                                {(week.files || []).length > 0 && (
                                  <div className="space-y-2 pt-2">
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-gray-400 block">
                                        Materiales Adjuntos & Análisis IA ({week.files?.length}):
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleOpenAttachModal(unit.id, week.weekNumber)}
                                        className="text-[11px] text-accent hover:underline font-bold flex items-center gap-1"
                                      >
                                        <Plus className="w-3 h-3" />
                                        <span>Adjuntar otro</span>
                                      </button>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {week.files?.map((file) => {
                                        const isImg = file.type === 'image' || file.uri?.startsWith('data:image/');
                                        const isPdfDoc = file.type === 'pdf' || file.uri?.startsWith('data:application/pdf');

                                        return (
                                          <div
                                            key={file.id}
                                            className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-primary/40 flex flex-col justify-between gap-3 shadow-md transition-all group"
                                          >
                                            <div className="flex items-start justify-between gap-2">
                                              <div
                                                onClick={() => {
                                                  setTargetFile(file);
                                                  setIsPreviewModalOpen(true);
                                                }}
                                                className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1"
                                              >
                                                {isImg && file.uri && file.uri !== 'local://note' ? (
                                                  <img
                                                    src={file.uri}
                                                    alt={file.name}
                                                    className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0 shadow-sm"
                                                  />
                                                ) : (
                                                  <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                                                    {isPdfDoc ? <FileText className="w-5 h-5 text-rose-400" /> : <BookOpen className="w-5 h-5 text-primary-light" />}
                                                  </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                  <h5 className="text-xs font-bold text-white truncate group-hover:text-primary-light transition-colors">
                                                    {file.name}
                                                  </h5>
                                                  <span className="text-[10px] text-gray-500 font-mono uppercase">
                                                    {file.type} {file.size ? `• ${(file.size / 1024).toFixed(0)} KB` : ''} • {file.addedAt?.slice(0, 10)}
                                                  </span>
                                                </div>
                                              </div>

                                              <button
                                                onClick={() => handleDeleteFile(unit.id, week.weekNumber, file.id, file.name)}
                                                className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                                                title="Eliminar archivo"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                            </div>

                                            {/* Preview snippet if has textContent */}
                                            {file.textContent && (
                                              <p
                                                onClick={() => {
                                                  setTargetFile(file);
                                                  setIsPreviewModalOpen(true);
                                                }}
                                                className="text-[11px] text-gray-400 line-clamp-2 cursor-pointer hover:text-gray-200 italic bg-black/30 p-2 rounded-xl border border-white/5"
                                              >
                                                {file.textContent.slice(0, 140)}...
                                              </p>
                                            )}

                                            {/* AI Actions Row */}
                                            <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-white/5">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setTargetFile(file);
                                                  setIsPreviewModalOpen(true);
                                                }}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-gray-200 text-[11px] font-bold transition-all"
                                                title="Visualizar en pantalla completa"
                                              >
                                                <Eye className="w-3.5 h-3.5 text-accent" />
                                                <span>Visualizar</span>
                                              </button>

                                              <button
                                                onClick={() => handleOpenAIModal(unit.id, week.weekNumber, file)}
                                                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gradient-to-r from-primary to-accent text-white text-[11px] font-bold shadow-sm shadow-primary/30 hover:brightness-110 transition-all"
                                              >
                                                <Bot className="w-3.5 h-3.5" />
                                                <span>Analizar IA</span>
                                              </button>

                                              {file.flashcards && file.flashcards.length > 0 && (
                                                <button
                                                  onClick={() => {
                                                    setTargetFile(file);
                                                    setCurrentFlashcardIndex(0);
                                                    setFlashcardFlipped(false);
                                                    setIsFlashcardsModalOpen(true);
                                                  }}
                                                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold hover:bg-amber-500/30 transition-all"
                                                >
                                                  <Bookmark className="w-3.5 h-3.5" />
                                                  <span>Flashcards ({file.flashcards.length})</span>
                                                </button>
                                              )}
                                            </div>

                                            {/* Cached AI Summary Snippet */}
                                            {file.aiSummary && (
                                              <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-[11px] text-purple-200">
                                                <p className="font-bold flex items-center gap-1 text-accent mb-1">
                                                  <Sparkles className="w-3 h-3" /> Resumen IA guardado:
                                                </p>
                                                <p className="line-clamp-2 text-gray-300">{file.aiSummary}</p>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Week Button */}
                    <div className="pt-2 flex justify-center">
                      <button
                        onClick={() => handleAddWeek(unit.id)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 text-primary-light hover:text-white border border-dashed border-white/20 hover:border-primary text-xs font-bold transition-all shadow-sm group"
                      >
                        <Plus className="w-4 h-4 text-accent group-hover:scale-110 transition-transform" />
                        <span>+ Añadir Semana a esta Unidad</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredUnits.length === 0 && (
            <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-3">
              <FolderOpen className="w-12 h-12 text-primary/40 mx-auto" />
              <p className="text-sm font-bold text-white">No tienes unidades registradas para este curso.</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Crea una unidad temática y organízala semana a semana con notas, PDFs y cuestionarios automáticos de IA.
              </p>
              <button
                onClick={openCreateUnitModal}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg shadow-primary/30 hover:brightness-110 transition-all"
              >
                + Crear Unidad (17 Semanas)
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 2: ENTREGABLES & EXÁMENES                                */}
      {/* ============================================================ */}
      {activeTab === 'tasks' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTasks.map((t) => (
              <div
                key={t.id}
                onClick={() => handleToggleTask(t.id)}
                className={`cursor-pointer p-5 rounded-3xl border transition-all flex flex-col justify-between gap-4 ${
                  t.completed
                    ? 'bg-white/[0.02] border-white/5 opacity-60'
                    : 'bg-white/[0.04] border-white/10 hover:border-primary/40 shadow-lg'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                      t.type === 'exam' ? 'bg-rose-500/20 text-rose-300' :
                      t.type === 'project' ? 'bg-purple-500/20 text-purple-300' :
                      'bg-primary/20 text-primary-light'
                    }`}>
                      {t.type === 'exam' ? 'Examen' : t.type === 'project' ? 'Proyecto' : 'Tarea'}
                    </span>
                    <span className="text-xs font-mono text-gray-400">{t.dueDate}</span>
                  </div>
                  <h3 className={`text-base font-bold ${t.completed ? 'line-through text-gray-400' : 'text-white'}`}>
                    {t.title}
                  </h3>
                  <p className="text-xs text-gray-400">{t.courseName || 'General'}</p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    {t.completed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-500 hover:text-primary" />
                    )}
                    <span className="text-gray-300 font-bold">{t.completed ? 'Completado' : 'Pendiente'}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenEditTask(t); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-primary-light hover:bg-primary/10 transition-colors"
                      title="Editar entregable"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteTask(t); }}
                      className="p-1.5 rounded-lg text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Eliminar entregable"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredTasks.length === 0 && (
            <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400">
              <p className="text-sm font-bold">No hay entregables registrados.</p>
              <button
                onClick={() => setIsTaskModalOpen(true)}
                className="mt-2 text-xs text-primary-light font-bold hover:underline"
              >
                + Crear primer entregable
              </button>
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* ============================================================ */}
      {/* TAB 3: MALLA & CURSOS                                         */}
      {/* ============================================================ */}
      {activeTab === 'courses' && (
        <div className="space-y-5 animate-fadeIn">
          {activeSemesterId === 'all' ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-black text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-400" />
                    Malla Curricular - Todos los Semestres
                  </h2>
                  <p className="text-xs text-gray-400">
                    Selecciona un ciclo académico para gestionar sus cursos, asignaturas y créditos o crea uno nuevo.
                  </p>
                </div>
                <button
                  onClick={() => setIsSemesterModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Nuevo Ciclo
                </button>
              </div>

              {semesters.length === 0 ? (
                <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-3">
                  <Layers className="w-12 h-12 text-purple-400/40 mx-auto" />
                  <p className="text-sm font-bold text-white">No tienes ciclos académicos creados</p>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto">
                    Crea tu primer ciclo académico (ej. 2026-I) para comenzar a registrar tu malla curricular.
                  </p>
                  <button
                    onClick={() => setIsSemesterModalOpen(true)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
                  >
                    + Crear Primer Ciclo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {semesters.map((sem) => {
                    const semCourses = courses.filter(c => c.semesterId === sem.id);
                    const totalCredits = semCourses.reduce((acc, c) => acc + (c.credits || 4), 0);
                    const semCourseIds = semCourses.map(c => c.id);
                    const semUnits = units.filter(u => semCourseIds.includes(u.courseId));
                    const totalWeeks = semUnits.reduce((acc, u) => acc + (u.totalWeeks || 17), 0);
                    const completedWeeks = semUnits.reduce((acc, u) => acc + u.weeks.filter(w => w.completed).length, 0);
                    const progress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;

                    return (
                      <div
                        key={sem.id}
                        onClick={() => setActiveSemesterId(sem.id)}
                        className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 hover:border-purple-500/40 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden cursor-pointer transition-all duration-300 hover:scale-[1.01] group border-l-4 border-l-purple-500"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300">
                                {sem.name}
                              </span>
                              {sem.isCurrent && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                                  Ciclo Actual
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1 z-10" onClick={(e) => e.stopPropagation()}>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingSemesterId(sem.id);
                                  setNewSemesterName(sem.name);
                                  setIsSemesterModalOpen(true);
                                }}
                                className="p-1.5 rounded-xl bg-white/5 hover:bg-purple-500/20 text-gray-400 hover:text-purple-300 transition-colors"
                                title="Editar nombre del ciclo"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteSemester(sem)}
                                className="p-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 transition-colors"
                                title="Eliminar ciclo académico"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-lg font-black text-white group-hover:text-purple-300 transition-colors">
                            {sem.name}
                          </h3>

                          <div className="space-y-1 text-xs text-gray-400 font-medium">
                            <p>📚 {semCourses.length} {semCourses.length === 1 ? 'curso' : 'cursos'} registrados</p>
                            <p>🎓 {totalCredits} créditos totales</p>
                            {sem.startDate && sem.endDate && (
                              <p className="text-[11px] text-gray-500 font-mono">📅 {sem.startDate} - {sem.endDate}</p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2 pt-3 border-t border-white/5">
                          <div className="flex justify-between text-xs text-gray-400 font-mono">
                            <span>Avance de Malla</span>
                            <span className="font-bold text-white">{progress}%</span>
                          </div>
                          <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                            <div
                              className="h-full rounded-full transition-all duration-500 bg-purple-500"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between text-[11px] text-gray-400 pt-1 group-hover:text-white transition-colors">
                            <span>Gestionar Cursos</span>
                            <span className="font-bold text-purple-400">Ver Asignaturas →</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-between pb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <button
                    onClick={() => setActiveSemesterId('all')}
                    className="px-3 py-1 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all flex items-center gap-1"
                  >
                    ← Todos los Semestres
                  </button>
                  <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-purple-500/20 text-purple-300">
                    {semesters.find(s => s.id === activeSemesterId)?.name || 'Ciclo'}
                  </span>
                </div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Cursos de {semesters.find(s => s.id === activeSemesterId)?.name || 'este Ciclo'}
                </h2>
                <p className="text-xs text-gray-400">
                  {filteredCourses.length} {filteredCourses.length === 1 ? 'curso registrado' : 'cursos registrados'} en este ciclo.
                </p>
              </div>
              <button
                onClick={() => setIsCourseModalOpen(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-xs font-bold shadow-md shadow-purple-600/20 hover:brightness-110 transition-all"
              >
                <Plus className="w-4 h-4" /> Agregar Curso
              </button>
            </div>
          )}

          {activeSemesterId !== 'all' && (
            filteredCourses.length === 0 ? (
              <div className="text-center py-12 rounded-3xl bg-white/[0.02] border border-white/10 text-gray-400 space-y-3">
                <BookOpen className="w-12 h-12 text-purple-400/40 mx-auto" />
                <p className="text-sm font-bold text-white">Sin cursos registrados para este semestre</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Registra los cursos de este ciclo para gestionar sus sílabos y entregables.
                </p>
                <button
                  onClick={() => setIsCourseModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20"
                >
                  + Agregar Curso a este Ciclo
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredCourses.map((course) => {
                  const courseUnits = units.filter(u => u.courseId === course.id);
                  const totalWeeks = courseUnits.reduce((acc, u) => acc + (u.totalWeeks || 17), 0);
                  const completedWeeks = courseUnits.reduce((acc, u) => acc + u.weeks.filter(w => w.completed).length, 0);
                  const progress = totalWeeks > 0 ? Math.round((completedWeeks / totalWeeks) * 100) : 0;
                  const courseSem = semesters.find(s => s.id === course.semesterId);

                  return (
                    <div
                      key={course.id}
                      className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl shadow-xl flex flex-col justify-between gap-5 relative overflow-hidden"
                      style={{ borderLeftWidth: '6px', borderLeftColor: course.color }}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold" style={{ backgroundColor: `${course.color}20`, color: course.color }}>
                              {course.code || 'CURSO'}
                            </span>
                            {courseSem && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-gray-300 font-bold">
                                {courseSem.name}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOpenEditCourse(course)}
                              className="text-gray-400 hover:text-purple-300 p-1 rounded-lg hover:bg-purple-500/10 transition-colors"
                              title="Editar curso"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCourse(course)}
                              className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                              title="Eliminar curso"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-white">{course.name}</h3>

                        <div className="space-y-1 text-xs text-gray-400 font-medium">
                          {course.professor && <p>👨‍🏫 Prof: {course.professor}</p>}
                          {course.classroom && <p>🏛️ Aula: {course.classroom}</p>}
                          <p>🎓 Créditos: {course.credits || 4}</p>
                        </div>
                      </div>

                      <div className="space-y-2 pt-3 border-t border-white/5">
                        <div className="flex justify-between text-xs text-gray-400 font-mono">
                          <span>Avance en Sílabo</span>
                          <span className="font-bold text-white">{progress}%</span>
                        </div>
                        <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, backgroundColor: course.color }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* TAB 4: CALCULADORA DE PROMEDIOS PONDERADOS                   */}
      {/* ============================================================ */}
      {activeTab === 'grades' && (
        <div className="p-8 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-6 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-xl font-black text-white flex items-center gap-2">
                <Calculator className="w-6 h-6 text-purple-400" /> Simulador de Promedios Ponderados
              </h2>
              <p className="text-xs text-gray-400">
                Calcula tu promedio ponderado en base al peso (%) de tus exámenes y prácticas.
              </p>
            </div>

            {/* Final Grade Badge */}
            <div className={`px-5 py-3 rounded-2xl border flex items-center gap-3 ${
              isApproved ? 'bg-emerald-500/20 border-emerald-500/40' : 'bg-rose-500/20 border-rose-500/40'
            }`}>
              <div>
                <span className="text-[10px] uppercase font-bold text-gray-400 block">Promedio Final Estimado</span>
                <span className={`text-2xl font-black font-mono ${isApproved ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {finalAverage} / 20
                </span>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-bold ${
                isApproved ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
              }`}>
                {isApproved ? 'APROBADO 🎉' : 'DESAPROBADO ⚠️'}
              </span>
            </div>
          </div>

          {/* Evaluations Inputs Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 block">Evaluaciones & Pesos:</span>
              <button
                type="button"
                onClick={() => setIsAddEvalModalOpen(true)}
                className="flex items-center gap-1 text-xs text-purple-300 hover:text-purple-200 bg-purple-600/20 hover:bg-purple-600/30 px-3 py-1.5 rounded-xl border border-purple-500/30 font-bold transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Evaluación</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {gradeEvaluations.map((ev, idx) => (
                <div key={ev.id} className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 relative group">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white truncate">{ev.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-purple-300 font-mono font-bold">{ev.weight}%</span>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteEvalId(ev.id)}
                        className="text-gray-500 hover:text-rose-400 p-1 rounded-lg hover:bg-rose-500/10 transition-colors"
                        title="Eliminar evaluación"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-400 uppercase font-bold block mb-1">Nota (0 - 20)</label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={ev.score}
                      onChange={(e) => {
                        const val = Math.min(20, Math.max(0, Number(e.target.value) || 0));
                        const next = [...gradeEvaluations];
                        next[idx].score = val;
                        setGradeEvaluations(next);
                      }}
                      className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white font-mono text-lg font-bold focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: AI MATERIAL ANALYSIS WITH MODEL SELECTOR              */}
      {/* ============================================================ */}
      {isAIModalOpen && targetFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-500 to-accent flex items-center justify-center text-white shadow-md">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Análisis con Inteligencia Artificial</h3>
                  <p className="text-xs text-gray-400 truncate max-w-md">Material: {targetFile.name}</p>
                </div>
              </div>
              <button onClick={() => setIsAIModalOpen(false)} className="text-gray-400 hover:text-white p-2 text-sm">✕</button>
            </div>

            {/* Model Selector Bar */}
            <div className="p-4 bg-black/30 border-b border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
              <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                <Cpu className="w-3.5 h-3.5 text-primary-light" /> Modelo:
              </span>
              {AVAILABLE_PROVIDERS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedAIProvider(p.id)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                    selectedAIProvider === p.id
                      ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary-light shadow-md'
                      : 'bg-white/[0.03] text-gray-400 border-white/5 hover:text-white'
                  }`}
                >
                  {p.badge} {p.name.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* AI Action Triggers */}
            <div className="p-4 flex flex-wrap gap-2 border-b border-white/5 shrink-0 bg-white/[0.01]">
              <button
                onClick={handleRunAISummary}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-primary to-primary-dark text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-primary/20"
              >
                <Sparkles className="w-4 h-4 text-accent" />
                <span>Resumen Ejecutivo</span>
              </button>

              <button
                onClick={handleRunAIFlashcards}
                disabled={aiLoading}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 text-white text-xs font-bold hover:brightness-110 disabled:opacity-50 transition-all shadow-md shadow-amber-500/20"
              >
                <Bookmark className="w-4 h-4" />
                <span>Generar Flashcards</span>
              </button>
            </div>

            {/* AI Result Content Area */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {aiLoading && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <Sparkles className="w-8 h-8 text-accent animate-spin" />
                  <p className="text-xs text-gray-300 font-bold">Procesando material con {selectedAIProvider}...</p>
                </div>
              )}

              {!aiLoading && aiResultText && (
                <div className="space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-extrabold text-accent">{aiResultTitle}</h4>
                    <button
                      onClick={() => AudioService.speak(aiResultText)}
                      className="flex items-center gap-1 text-xs text-gray-300 hover:text-white bg-white/5 px-2.5 py-1 rounded-lg"
                      title="Escuchar por voz"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-primary-light" /> Escuchar
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-black/40 border border-white/10 text-xs text-gray-200 leading-relaxed whitespace-pre-wrap">
                    {aiResultText}
                  </div>
                </div>
              )}

              {!aiLoading && !aiResultText && (
                <div className="py-12 text-center text-gray-400 text-xs space-y-2">
                  <Bot className="w-10 h-10 text-gray-600 mx-auto" />
                  <p>Selecciona una acción arriba para analizar este material con la IA.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INTERACTIVE EVALUATION EXAM QUIZ                      */}
      {/* ============================================================ */}
      {isExamModalOpen && targetUnitForExam && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-400" />
                  Examen de Evaluación: {targetUnitForExam.title}
                </h3>
                <p className="text-xs text-gray-400">Responde las preguntas para medir tu dominio de la unidad.</p>
              </div>
              <button onClick={() => setIsExamModalOpen(false)} className="text-gray-400 hover:text-white p-2 text-sm">✕</button>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {aiLoading && (
                <div className="py-16 text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-accent animate-spin mx-auto" />
                  <p className="text-xs text-gray-300 font-bold">Generando preguntas de evaluación con IA...</p>
                </div>
              )}

              {!aiLoading && generatedExam.map((q, qIdx) => {
                const selectedOpt = examAnswers[qIdx];
                const isCorrect = selectedOpt === q.correctAnswer;

                return (
                  <div key={qIdx} className="p-5 rounded-2xl bg-black/40 border border-white/10 space-y-3">
                    <h4 className="text-sm font-bold text-white leading-relaxed">
                      {qIdx + 1}. {q.question}
                    </h4>

                    <div className="space-y-2">
                      {q.options.map((opt, optIdx) => {
                        const isChosen = selectedOpt === opt;
                        let optStyle = 'bg-white/[0.04] border-white/5 text-gray-300 hover:bg-white/[0.08]';
                        if (isChosen) optStyle = 'bg-primary/30 border-primary text-white font-bold';
                        if (examSubmitted) {
                          if (opt === q.correctAnswer) optStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-bold';
                          else if (isChosen) optStyle = 'bg-rose-500/20 border-rose-500 text-rose-200';
                        }

                        return (
                          <button
                            key={optIdx}
                            disabled={examSubmitted}
                            onClick={() => setExamAnswers(prev => ({ ...prev, [qIdx]: opt }))}
                            className={`w-full p-3 rounded-xl border text-xs text-left transition-all flex items-center gap-2.5 ${optStyle}`}
                          >
                            <span className="w-5 h-5 rounded-full border border-white/20 flex items-center justify-center text-[10px] font-mono shrink-0">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <span className="flex-1">{opt}</span>
                          </button>
                        );
                      })}
                    </div>

                    {examSubmitted && (
                      <div className={`p-3 rounded-xl border text-xs leading-relaxed ${
                        isCorrect ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200' : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                      }`}>
                        <p className="font-bold mb-1">{isCorrect ? '✅ ¡Correcto!' : '❌ Incorrecto'}</p>
                        <p className="text-gray-300">{q.justification}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Exam Footer */}
            <div className="p-5 border-t border-white/10 flex items-center justify-between shrink-0 bg-black/40">
              {examScore !== null && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-300">Puntaje Final:</span>
                  <span className={`text-xl font-black font-mono ${examScore >= 60 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {examScore}%
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-300"
                >
                  Cerrar
                </button>
                {!examSubmitted && (
                  <button
                    type="button"
                    onClick={handleGradeExam}
                    disabled={Object.keys(examAnswers).length < generatedExam.length}
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-primary text-white text-xs font-bold shadow-lg shadow-emerald-500/20 disabled:opacity-40 hover:brightness-110"
                  >
                    Calificar Examen
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: INTERACTIVE FLASHCARDS DECK                           */}
      {/* ============================================================ */}
      {isFlashcardsModalOpen && targetFile && targetFile.flashcards && targetFile.flashcards.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-amber-400" />
                Flashcards ({currentFlashcardIndex + 1} / {targetFile.flashcards.length})
              </h3>
              <button onClick={() => setIsFlashcardsModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>

            {/* Flashcard Card */}
            <div
              onClick={() => setFlashcardFlipped(!flashcardFlipped)}
              className="min-h-[220px] p-8 rounded-3xl bg-gradient-to-b from-purple-950/40 to-black/60 border border-purple-500/30 flex flex-col items-center justify-center text-center cursor-pointer select-none hover:border-purple-400 transition-all shadow-xl"
            >
              <span className="text-[10px] uppercase font-bold text-accent tracking-widest mb-3">
                {flashcardFlipped ? '💡 Respuesta' : '❓ Pregunta (Haz clic para voltear)'}
              </span>
              <p className="text-base font-bold text-white leading-relaxed">
                {flashcardFlipped
                  ? targetFile.flashcards[currentFlashcardIndex].answer
                  : targetFile.flashcards[currentFlashcardIndex].question}
              </p>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <button
                disabled={currentFlashcardIndex === 0}
                onClick={() => {
                  setCurrentFlashcardIndex(prev => Math.max(0, prev - 1));
                  setFlashcardFlipped(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold disabled:opacity-30"
              >
                ← Anterior
              </button>

              <button
                onClick={() => setFlashcardFlipped(!flashcardFlipped)}
                className="px-4 py-2 rounded-xl bg-purple-600/30 text-purple-300 border border-purple-500/40 text-xs font-bold"
              >
                Voltear Tarjeta
              </button>

              <button
                disabled={currentFlashcardIndex === targetFile.flashcards.length - 1}
                onClick={() => {
                  setCurrentFlashcardIndex(prev => Math.min(targetFile.flashcards!.length - 1, prev + 1));
                  setFlashcardFlipped(false);
                }}
                className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold disabled:opacity-30"
              >
                Siguiente →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: ADJUNTAR ARCHIVO / MATERIAL & APUNTES ENRIQUECIDOS    */}
      {/* ============================================================ */}
      {isAttachModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col p-6 space-y-4 shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-md shadow-primary/25">
                  <FileUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">Adjuntar Material & Apuntes de Estudio</h3>
                  <p className="text-[11px] text-gray-400">Agrega archivos de tu PC (PDF, imágenes, documentos) o escribe apuntes con formato.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAttachModalOpen(false)}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAttachment} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1">
              {/* File Upload Drag & Drop Zone */}
              <div>
                <label className="block text-gray-300 font-bold mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-accent" />
                    Adjuntar Archivo del PC (Opcional):
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">PDF, Imágenes, Word, Excel, TXT, Código...</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileChange}
                  className="hidden"
                />

                {!selectedFileObj && !attachFileUrl ? (
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
                      isDraggingFile
                        ? 'border-accent bg-accent/10 scale-[1.01]'
                        : 'border-white/15 bg-black/30 hover:border-primary/50 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-primary-light">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-200">
                        Arrastra y suelta tu archivo aquí o <span className="text-primary-light underline">haz clic para examinar</span>
                      </p>
                      <p className="text-[10px] text-gray-500 mt-0.5">Soporta PDF, imágenes (PNG, JPG), documentos de texto, código, etc.</p>
                    </div>
                  </div>
                ) : (
                  <div className="p-3.5 rounded-2xl bg-black/50 border border-primary/30 flex items-center justify-between gap-3 shadow-md">
                    <div className="flex items-center gap-3 min-w-0">
                      {attachFileType === 'image' && attachFileUrl ? (
                        <img
                          src={attachFileUrl}
                          alt="preview"
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 flex items-center justify-center shrink-0">
                          {attachFileType === 'pdf' ? <FileText className="w-5 h-5 text-rose-400" /> : <File className="w-5 h-5" />}
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-white truncate">{selectedFileObj?.name || attachFileName}</p>
                        <span className="text-[10px] text-gray-400 font-mono uppercase">
                          {attachFileType} {attachFileSize > 0 ? `• ${(attachFileSize / 1024).toFixed(1)} KB` : ''} • Listo para guardar
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-bold text-gray-200"
                      >
                        Cambiar
                      </button>
                      <button
                        type="button"
                        onClick={handleRemoveSelectedFile}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-400 hover:bg-rose-500/10"
                        title="Quitar archivo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Material Type Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-gray-300 font-bold mb-1">Título del Material / Apunte *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Diapositivas Clase 1, Guía de Ejercicios, Fórmulas Clave..."
                    value={attachFileName}
                    onChange={(e) => setAttachFileName(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs sm:text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-gray-300 font-bold mb-1">Tipo de Material</label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['pdf', 'text', 'image'] as const).map(t => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setAttachFileType(t)}
                        className={`py-2 rounded-xl text-[11px] font-bold uppercase transition-all border ${
                          attachFileType === t
                            ? 'bg-primary text-white border-primary-light shadow-md'
                            : 'bg-black/40 text-gray-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Rich Text Editor Section */}
              <div className="space-y-1.5">
                <label className="block text-gray-300 font-bold flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5 text-primary-light" />
                    Contenido, Apuntes & Resumen con Formato:
                  </span>
                  <span className="text-[10px] text-gray-400 font-normal">
                    Negrita, Tamaños, Indentación (Tab / CapsLock), Citas, Tareas...
                  </span>
                </label>

                <RichTextEditor
                  value={attachTextContent}
                  onChange={setAttachTextContent}
                  placeholder="Escribe tus apuntes de clase, fórmulas, definiciones o pega el texto del documento para análisis de IA..."
                  minHeight="170px"
                  showPreviewTabs={true}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-white/10 shrink-0">
                <span className="text-[11px] text-gray-400">
                  {attachFileUrl ? '📎 Archivo listo para adjuntar' : '📝 Nota de texto con formato'}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAttachModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-gradient-to-r from-primary via-purple-600 to-accent text-white font-bold shadow-lg shadow-primary/25 hover:brightness-110 transition-all"
                  >
                    Guardar Material
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: VISOR DE ARCHIVOS Y APUNTES FORMATEADOS               */}
      {/* ============================================================ */}
      <FileViewerModal
        file={targetFile}
        isOpen={isPreviewModalOpen}
        onClose={() => setIsPreviewModalOpen(false)}
        onRunAI={(file) => {
          if (targetUnitId && targetWeekNum !== null) {
            handleOpenAIModal(targetUnitId, targetWeekNum, file);
          }
        }}
        onOpenFlashcards={(file) => {
          setTargetFile(file);
          setCurrentFlashcardIndex(0);
          setFlashcardFlipped(false);
          setIsFlashcardsModalOpen(true);
        }}
      />

      {/* ============================================================ */}
      {/* MODAL: CREAR CICLO / SEMESTRE                                */}
      {/* ============================================================ */}
      {isSemesterModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <span>Gestión de Ciclos Académicos</span>
              </h3>
              <button
                onClick={() => {
                  setIsSemesterModalOpen(false);
                  setEditingSemesterId(null);
                  setNewSemesterName('');
                }}
                className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                ✕
              </button>
            </div>

            {/* List of Registered Semesters */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-gray-300 block">Ciclos Académicos Registrados ({semesters.length}):</span>
              {semesters.length === 0 ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-center text-xs text-gray-400">
                  No hay ciclos registrados. Crea uno nuevo abajo.
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {semesters.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 rounded-2xl bg-black/50 border border-white/10 hover:border-purple-500/30 transition-all">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-white font-bold">{s.name}</span>
                        {s.isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">
                            Actual
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingSemesterId(s.id);
                            setNewSemesterName(s.name);
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/5 hover:bg-purple-500/20 text-gray-300 hover:text-purple-300 text-xs font-bold transition-all"
                          title="Editar nombre"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                          <span>Editar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSemester(s)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-rose-500/10 hover:bg-rose-500/30 text-rose-400 hover:text-rose-200 border border-rose-500/30 text-xs font-bold transition-all"
                          title="Eliminar ciclo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Form to Add / Edit */}
            <form onSubmit={handleCreateSemester} className="space-y-3 pt-3 border-t border-white/10 text-xs">
              <span className="text-xs font-bold text-gray-300 block">
                {editingSemesterId ? '✏️ Renombrar Ciclo Académico:' : '➕ Agregar Nuevo Ciclo:'}
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="Ej: Ciclo 2026-I, Semestre 2026-II..."
                  value={newSemesterName}
                  onChange={(e) => setNewSemesterName(e.target.value)}
                  className="flex-1 bg-black/50 border border-white/10 rounded-xl px-3.5 py-2.5 text-white text-xs focus:outline-none focus:border-purple-500 placeholder:text-gray-600"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md shadow-purple-600/20 whitespace-nowrap transition-all"
                >
                  {editingSemesterId ? 'Actualizar' : 'Guardar'}
                </button>
                {editingSemesterId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSemesterId(null);
                      setNewSemesterName('');
                    }}
                    className="px-3 py-2.5 rounded-xl bg-white/10 text-gray-300 font-bold hover:bg-white/15"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREAR CURSO                                           */}
      {/* ============================================================ */}
      {isCourseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-base font-black text-white">Agregar Curso a la Malla</h3>
                <p className="text-[11px] text-purple-400 font-bold">
                  Ciclo: {semesters.find(s => s.id === activeSemesterId)?.name || 'Ciclo Académico'}
                </p>
              </div>
              <button onClick={() => setIsCourseModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateCourse} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre del Curso *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Cálculo Avanzado, Algoritmos..."
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Código</label>
                  <input
                    type="text"
                    placeholder="MAT-201"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Créditos</label>
                  <input
                    type="number"
                    value={courseCredits}
                    onChange={(e) => setCourseCredits(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Profesor</label>
                  <input
                    type="text"
                    placeholder="Ing. Ramírez"
                    value={courseProf}
                    onChange={(e) => setCourseProf(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Aula</label>
                  <input
                    type="text"
                    placeholder="Pabellón B - 204"
                    value={courseRoom}
                    onChange={(e) => setCourseRoom(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-gray-300 font-bold mb-1">Color Identificador</label>
                <div className="flex gap-2">
                  {['#6C63FF', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#06B6D4'].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setCourseColor(col)}
                      className={`w-7 h-7 rounded-full transition-transform ${courseColor === col ? 'scale-125 ring-2 ring-white' : ''}`}
                      style={{ backgroundColor: col }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsCourseModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold">Guardar Curso</button>
              </div>
            </form>

            {/* Lista de cursos sin ciclo asignado para vincular con 1 clic */}
            {activeSemesterId !== 'all' && unassignedCourses.length > 0 && (
              <div className="pt-3 border-t border-white/10 space-y-2">
                <p className="text-[11px] font-bold text-gray-300">O asignar cursos existentes sin ciclo:</p>
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {unassignedCourses.map(uc => (
                    <div
                      key={uc.id}
                      className="p-2 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: uc.color }} />
                        <span className="text-xs font-bold text-white">{uc.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleAssignCourseToSemester(uc.id, activeSemesterId);
                          setIsCourseModalOpen(false);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600 text-purple-200 hover:text-white text-[11px] font-bold transition-all"
                      >
                        + Asignar a este Ciclo
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREAR ENTREGABLE / EXAMEN                             */}
      {/* ============================================================ */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white">Nuevo Entregable / Examen</h3>
              <button onClick={() => setIsTaskModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Examen Parcial, Informe Final..."
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-bold mb-1">Curso</label>
                <select
                  value={taskCourseId}
                  onChange={(e) => setTaskCourseId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                >
                  {courses.map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                  ))}
                  {courses.length === 0 && <option value="general">Materia General</option>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Tipo</label>
                  <select
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as any)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="task" className="bg-slate-900">Tarea / Práctica</option>
                    <option value="exam" className="bg-slate-900">Examen Parcial / Final</option>
                    <option value="project" className="bg-slate-900">Proyecto</option>
                    <option value="lab" className="bg-slate-900">Laboratorio</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Fecha de Entrega</label>
                  <input
                    type="date"
                    value={taskDueDate}
                    onChange={(e) => setTaskDueDate(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsTaskModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-primary text-white font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: CREAR UNIDAD (17 SEMANAS)                             */}
      {/* ============================================================ */}
      {isUnitModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white">
                {editingUnitId ? '✏️ Editar Unidad de Sílabo' : '✨ Nueva Unidad de Sílabo'}
              </h3>
              <button onClick={() => setIsUnitModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSaveUnit} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Título de la Unidad *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Unidad I: Fundamentos y Lógica"
                  value={unitTitle}
                  onChange={(e) => setUnitTitle(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-bold mb-1">Total de Semanas (1 - 17)</label>
                <input
                  type="number"
                  min={1}
                  max={17}
                  required
                  value={unitTotalWeeks}
                  onChange={(e) => setUnitTotalWeeks(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-indigo-500 focus:outline-none font-mono"
                />
              </div>
              <div>
                <label className="block text-gray-300 font-bold mb-1">Curso</label>
                <select
                  value={unitCourseId}
                  onChange={(e) => setUnitCourseId(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-white focus:border-indigo-500 focus:outline-none"
                >
                  {(activeSemesterId === 'all' 
                    ? courses 
                    : courses.filter(c => !c.semesterId || c.semesterId === activeSemesterId)
                  ).map(c => (
                    <option key={c.id} value={c.id} className="bg-slate-900">{c.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button type="button" onClick={() => setIsUnitModalOpen(false)} className="px-3 py-1.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15 transition-all">Cancelar</button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-md shadow-indigo-600/30">
                  {editingUnitId ? 'Actualizar Unidad' : 'Crear Unidad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* MODAL: AGREGAR EVALUACIÓN (CALCULADORA DE PROMEDIOS)         */}
      {/* ============================================================ */}
      {isAddEvalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0f1326] border border-white/15 rounded-3xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-black text-white">✨ Agregar Criterio de Evaluación</h3>
              <button onClick={() => setIsAddEvalModalOpen(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddEvaluation} className="space-y-3 text-xs">
              <div>
                <label className="block text-gray-300 font-bold mb-1">Nombre de la Evaluación *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Proyecto Final, Práctica Calificada 3..."
                  value={newEvalName}
                  onChange={(e) => setNewEvalName(e.target.value)}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white text-sm focus:border-purple-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Peso / Porcentaje (%) *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={newEvalWeight}
                    onChange={(e) => setNewEvalWeight(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 font-bold mb-1">Nota Inicial (0 - 20)</label>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    value={newEvalScore}
                    onChange={(e) => setNewEvalScore(e.target.value)}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddEvalModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-white/10 text-gray-300 hover:bg-white/15 transition-all font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold transition-all shadow-md shadow-purple-600/30"
                >
                  Agregar Evaluación
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIRM MODALS FOR UPDATES AND DELETES                       */}
      {/* ============================================================ */}
      <ConfirmModal
        isOpen={Boolean(pendingSemesterUpdate)}
        title="¿Confirmar actualización de ciclo?"
        description={`¿Deseas guardar los cambios para el ciclo académico "${pendingSemesterUpdate?.name}"?`}
        confirmLabel="Sí, guardar cambios"
        cancelLabel="Volver a editar"
        variant="primary"
        onConfirm={handleConfirmSemesterUpdate}
        onCancel={() => setPendingSemesterUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteSemester)}
        title="¿Eliminar este ciclo académico?"
        description={`¿Estás seguro de que deseas eliminar permanentemente el ciclo "${confirmDeleteSemester?.name}"?`}
        confirmLabel="Sí, eliminar ciclo"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteSemester}
        onCancel={() => setConfirmDeleteSemester(null)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingCourseUpdate)}
        title="¿Confirmar cambios del curso?"
        description={`¿Deseas actualizar la información del curso "${pendingCourseUpdate?.payload?.name}"?`}
        confirmLabel="Sí, actualizar"
        cancelLabel="Seguir editando"
        variant="primary"
        onConfirm={handleConfirmCourseUpdate}
        onCancel={() => setPendingCourseUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteCourse)}
        title="¿Eliminar curso de la malla?"
        description={`¿Estás seguro de eliminar el curso "${confirmDeleteCourse?.name}"? Esta acción no se puede deshacer.`}
        confirmLabel="Sí, eliminar curso"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteCourse}
        onCancel={() => setConfirmDeleteCourse(null)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingTaskUpdate)}
        title="¿Actualizar entregable / examen?"
        description={`¿Deseas guardar los cambios realizados en "${pendingTaskUpdate?.payload?.title}"?`}
        confirmLabel="Sí, actualizar"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmTaskUpdate}
        onCancel={() => setPendingTaskUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteTask)}
        title="¿Eliminar entregable?"
        description={`¿Deseas eliminar la tarea o examen "${confirmDeleteTask?.title}"?`}
        confirmLabel="Sí, eliminar"
        cancelLabel="Conservar"
        variant="danger"
        onConfirm={handleConfirmDeleteTask}
        onCancel={() => setConfirmDeleteTask(null)}
      />

      <ConfirmModal
        isOpen={Boolean(pendingUnitUpdate)}
        title="¿Confirmar actualización de unidad?"
        description={`¿Deseas actualizar la unidad "${pendingUnitUpdate?.title}" y su distribución de semanas?`}
        confirmLabel="Sí, guardar unidad"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmUnitUpdate}
        onCancel={() => setPendingUnitUpdate(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteUnit)}
        title="¿Eliminar unidad de sílabo?"
        description={`¿Estás seguro de eliminar la unidad "${confirmDeleteUnit?.title}" junto con todas sus semanas y materiales adjuntos?`}
        confirmLabel="Sí, eliminar unidad"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteUnit}
        onCancel={() => setConfirmDeleteUnit(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteWeek)}
        title="¿Eliminar semana del sílabo?"
        description={`¿Deseas eliminar la Semana ${confirmDeleteWeek?.weekNumber} y todos sus apuntes y materiales?`}
        confirmLabel="Sí, eliminar semana"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteWeek}
        onCancel={() => setConfirmDeleteWeek(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteFile)}
        title="¿Eliminar material adjunto?"
        description={`¿Deseas eliminar el archivo "${confirmDeleteFile?.fileName}" de la Semana ${confirmDeleteFile?.weekNumber}?`}
        confirmLabel="Sí, eliminar archivo"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteFile}
        onCancel={() => setConfirmDeleteFile(null)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteEvalId)}
        title="¿Eliminar criterio de evaluación?"
        description="¿Deseas remover este criterio de evaluación del cálculo del promedio?"
        confirmLabel="Sí, eliminar criterio"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteEval}
        onCancel={() => setConfirmDeleteEvalId(null)}
      />

      <UnajSyncModal
        isOpen={isUnajModalOpen}
        onClose={() => setIsUnajModalOpen(false)}
        onSyncSuccess={() => loadData()}
      />
    </div>
  );
};

export default UniversityView;
