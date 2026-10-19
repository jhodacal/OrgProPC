import React, { useEffect, useState } from 'react';
import {
  Settings,
  Wifi,
  WifiOff,
  RefreshCw,
  Download,
  Upload,
  Key,
  Shield,
  Smartphone,
  CheckCircle2,
  Copy,
  Sparkles,
  X,
  CheckSquare,
  Square,
  GitMerge,
  AlertTriangle,
  Info,
  Calendar,
  CheckCircle,
  GraduationCap,
  Folder,
  Flame,
  Trash2,
  Save
} from 'lucide-react';
import StorageService, { STORAGE_KEYS } from '../services/StorageService';
import SyncEngine, { SyncStatus } from '../services/SyncEngine';
import AudioService from '../services/AudioService';
import { AppSettings, AIPreferences } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [aiPrefs, setAiPrefs] = useState<AIPreferences | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(SyncEngine.getStatus());
  const [copied, setCopied] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  // AI Keys Form State
  const [groqKey, setGroqKey] = useState('');
  const [geminiKey, setGeminiKey] = useState('');
  const [githubKey, setGithubKey] = useState('');
  const [openrouterKey, setOpenrouterKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [mistralKey, setMistralKey] = useState('');
  const [cerebrasKey, setCerebrasKey] = useState('');
  const [nvidiaKey, setNvidiaKey] = useState('');

  // Confirmation Modals State
  const [pendingAIKeysUpdate, setPendingAIKeysUpdate] = useState(false);
  const [confirmClearDocCache, setConfirmClearDocCache] = useState(false);
  const [confirmResetAllData, setConfirmResetAllData] = useState(false);
  const [confirmOverwriteImport, setConfirmOverwriteImport] = useState(false);

  // Modals de exportación e importación
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [exportSelections, setExportSelections] = useState({
    schedule: true,
    universityTasks: true,
    coursesAndSemesters: true,
    universityUnits: true,
    filesAndNotes: true,
    settings: true,
  });
  const [importSelections, setImportSelections] = useState({
    schedule: true,
    universityTasks: true,
    coursesAndSemesters: true,
    universityUnits: true,
    filesAndNotes: true,
    settings: true,
  });
  const [importMergeMode, setImportMergeMode] = useState<'merge' | 'overwrite'>('merge');
  const [parsedDataBundle, setParsedDataBundle] = useState<Record<string, any> | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadData = async () => {
    const [s, a] = await Promise.all([
      StorageService.getSettings(),
      StorageService.getAIPreferences()
    ]);
    setSettings(s);
    setAiPrefs(a);
    if (a) {
      setGroqKey(a.groqApiKey || '');
      setGeminiKey(a.geminiApiKey || '');
      setGithubKey(a.githubApiKey || '');
      setOpenrouterKey(a.openrouterApiKey || '');
      setCohereKey(a.cohereApiKey || '');
      setMistralKey(a.mistralApiKey || '');
      setCerebrasKey(a.cerebrasApiKey || '');
      setNvidiaKey(a.nvidiaApiKey || '');
    }
  };

  useEffect(() => {
    loadData();
    const unsub = SyncEngine.subscribe(setSyncStatus);
    return () => unsub();
  }, []);

  const handleManualSync = async () => {
    setSyncFeedback('Sincronizando Universidad con Celular...');
    const res = await SyncEngine.syncNow();
    setSyncFeedback(res.message);
    setTimeout(() => setSyncFeedback(null), 4000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(syncStatus.pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCategoryAvailable = (category: string, dataBundle: Record<string, any> | null): boolean => {
    if (!dataBundle || typeof dataBundle !== 'object') return false;
    const hasData = (keys: string[]) => {
      return keys.some(k => {
        const val = dataBundle[k];
        if (val === undefined || val === null) return false;
        if (Array.isArray(val)) return val.length > 0;
        if (typeof val === 'object') return Object.keys(val).length > 0;
        if (typeof val === 'string') return val.trim().length > 0;
        return true;
      });
    };

    switch (category) {
      case 'schedule':
        return hasData([
          STORAGE_KEYS.SCHEDULE, STORAGE_KEYS.COURSES,
          '@life_study_schedule', 'life_study_schedule.json', 'life_study_schedule', 'schedule', 'blocks',
          '@life_study_schedule_image', 'life_study_schedule_image', 'scheduleImage',
          '@life_study_schedule_day_overrides', 'life_study_schedule_day_overrides', 'dayOverrides'
        ]);
      case 'universityTasks':
        return hasData([
          STORAGE_KEYS.UNIVERSITY_TASKS,
          'life_study_university_tasks.json', 'life_study_university_tasks', 'universityTasks'
        ]);
      case 'coursesAndSemesters':
        return hasData([
          STORAGE_KEYS.COURSES, 'life_study_courses.json', 'life_study_courses', 'courses',
          STORAGE_KEYS.SEMESTERS, 'life_study_semesters.json', 'life_study_semesters', 'semesters'
        ]);
      case 'universityUnits':
        return hasData([
          STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS,
          'life_study_university_units_progress.json', 'life_study_university_units_progress', 'universityUnitsProgress'
        ]);
      case 'filesAndNotes':
        return hasData([
          STORAGE_KEYS.FILES, 'life_study_files.json', 'life_study_files', 'files',
          STORAGE_KEYS.NOTES, 'life_study_notes.json', 'life_study_notes', 'notes',
          STORAGE_KEYS.RECORDINGS, 'life_study_recordings.json', 'life_study_recordings', 'recordings',
          STORAGE_KEYS.DOCUMENT_AI_CACHE, 'life_study_doc_ai_cache.json', 'life_study_document_ai_cache.json', 'docAiCache'
        ]);
      case 'settings':
        return hasData([
          STORAGE_KEYS.SETTINGS, 'life_study_settings.json', 'settings',
          STORAGE_KEYS.AI_PREFERENCES, 'life_study_ai_preferences.json', 'aiPreferences'
        ]);
      default:
        return false;
    }
  };

  const handleExportJSON = async () => {
    setIsProcessing(true);
    try {
      const bundle = await StorageService.exportFullBundle();
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `orgpro_backup_completo_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmSelectedExport = async () => {
    setIsProcessing(true);
    try {
      const bundle = await StorageService.exportSelectedData(exportSelections);
      const enabledParts = Object.keys(exportSelections).filter(k => (exportSelections as any)[k]);
      const fileName = `orgpro_export_${enabledParts.join('_')}_${new Date().toISOString().slice(0, 10)}.json`;
      const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (typeof json !== 'object' || Array.isArray(json)) {
          alert('❌ El archivo no tiene un formato JSON válido.');
          return;
        }

        const detected: Record<string, boolean> = {
          schedule: isCategoryAvailable('schedule', json),
          dailyTasks: isCategoryAvailable('dailyTasks', json),
          universityTasks: isCategoryAvailable('universityTasks', json),
          filesAndNotes: isCategoryAvailable('filesAndNotes', json),
          habits: isCategoryAvailable('habits', json),
          settings: isCategoryAvailable('settings', json),
        };

        const hasAny = Object.values(detected).some(Boolean);
        if (!hasAny) {
          Object.keys(detected).forEach(k => { detected[k] = true; });
        }

        setParsedDataBundle(json);
        setImportSelections(detected as any);
        setImportMergeMode('merge');
        setShowImportModal(true);
      } catch (_) {
        alert('❌ Error al procesar o parsear el archivo JSON.');
      }
    };
    reader.readAsText(file);
    // Reset input value to allow re-selection
    e.target.value = '';
  };

  const executeImport = async () => {
    setConfirmOverwriteImport(false);
    if (!parsedDataBundle) return;
    const selectedCount = Object.values(importSelections).filter(Boolean).length;
    if (selectedCount === 0) {
      alert('⚠️ Debes seleccionar al menos una categoría para importar.');
      return;
    }

    setIsProcessing(true);
    try {
      const ok = await StorageService.importSelectedData(parsedDataBundle, importSelections, importMergeMode);
      if (ok) {
        alert('✅ ¡Importación completada con éxito! Todos los datos seleccionados se han sincronizado.');
        setShowImportModal(false);
        setParsedDataBundle(null);
        await loadData();
      } else {
        alert('❌ Ocurrió un error al importar los datos.');
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTriggerImport = () => {
    if (importMergeMode === 'overwrite') {
      setConfirmOverwriteImport(true);
    } else {
      executeImport();
    }
  };

  const handleConfirmAIKeysUpdate = async () => {
    setPendingAIKeysUpdate(false);
    const basePrefs: AIPreferences = aiPrefs || {
      provider: 'groq',
      model: 'llama-3.3-70b-versatile',
      customPrompt: '',
      temperature: 0.7,
      maxTokens: 2048,
      activePersonality: 'estudiante_pro',
      studyGoals: '',
      weaknesses: '',
      strengths: '',
      semesterTargetGPA: '',
      enableNotifications: true,
      enableDailyQuote: true,
      autoExamReminders: true,
      notificationSound: 'default',
      preferredStudyHours: 'afternoon',
      difficultyLevel: 'balanced',
      studyMode: 'focus'
    };

    const updated: AIPreferences = {
      ...basePrefs,
      groqApiKey: groqKey.trim(),
      geminiApiKey: geminiKey.trim(),
      githubApiKey: githubKey.trim(),
      openrouterApiKey: openrouterKey.trim(),
      cohereApiKey: cohereKey.trim(),
      mistralApiKey: mistralKey.trim(),
      cerebrasApiKey: cerebrasKey.trim(),
      nvidiaApiKey: nvidiaKey.trim(),
    };
    await StorageService.saveAIPreferences(updated);
    setAiPrefs(updated);
    alert('✅ Claves de Inteligencia Artificial guardadas y actualizadas correctamente.');
  };

  const handleConfirmClearDocCache = async () => {
    setConfirmClearDocCache(false);
    await StorageService.clearAllDocCache();
    alert('✅ Caché de documentos de IA limpiada con éxito.');
  };

  const handleConfirmResetAllData = async () => {
    setConfirmResetAllData(false);
    await StorageService.clearAllData();
    alert('✅ Se ha restablecido la base de datos local por completo.');
    await loadData();
    window.location.reload();
  };

  const selectAllExport = (enableAll = true) => {
    setExportSelections({
      schedule: enableAll,
      universityTasks: enableAll,
      coursesAndSemesters: enableAll,
      universityUnits: enableAll,
      filesAndNotes: enableAll,
      settings: enableAll,
    });
  };

  const selectAllImport = (enableAll = true) => {
    if (!enableAll) {
      setImportSelections({
        schedule: false,
        universityTasks: false,
        coursesAndSemesters: false,
        universityUnits: false,
        filesAndNotes: false,
        settings: false,
      });
      return;
    }
    if (parsedDataBundle) {
      const anyAvail = ['schedule', 'universityTasks', 'coursesAndSemesters', 'universityUnits', 'filesAndNotes', 'settings'].some(
        cat => isCategoryAvailable(cat, parsedDataBundle)
      );
      setImportSelections({
        schedule: anyAvail ? isCategoryAvailable('schedule', parsedDataBundle) : true,
        universityTasks: anyAvail ? isCategoryAvailable('universityTasks', parsedDataBundle) : true,
        coursesAndSemesters: anyAvail ? isCategoryAvailable('coursesAndSemesters', parsedDataBundle) : true,
        universityUnits: anyAvail ? isCategoryAvailable('universityUnits', parsedDataBundle) : true,
        filesAndNotes: anyAvail ? isCategoryAvailable('filesAndNotes', parsedDataBundle) : true,
        settings: anyAvail ? isCategoryAvailable('settings', parsedDataBundle) : true,
      });
    } else {
      setImportSelections({
        schedule: true,
        universityTasks: true,
        coursesAndSemesters: true,
        universityUnits: true,
        filesAndNotes: true,
        settings: true,
      });
    }
  };

  const handleSaveAIKey = async (key: string) => {
    if (!aiPrefs) return;
    const updated = { ...aiPrefs, groqApiKey: key };
    await StorageService.saveAIPreferences(updated);
    setAiPrefs(updated);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" /> Ajustes & Centro de Sincronización Universitaria
        </h1>
        <p className="text-xs text-gray-400 mt-1">
          Gestiona el enlace directo en tiempo real con tu celular Android (Universidad & Horario), claves de Inteligencia Artificial y respaldos.
        </p>
      </div>

      {/* SYNC HUB CARD */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-500/10 via-white/[0.03] to-primary/10 border border-emerald-500/30 backdrop-blur-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${syncStatus.isOnline ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h2 className="font-extrabold text-base text-white flex items-center gap-2">
                Enlace Universitario Celular ⟷ PC
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${syncStatus.isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                  {syncStatus.isOnline ? 'ONLINE' : 'OFFLINE (Local)'}
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                {syncStatus.isOnline
                  ? 'Cualquier materia, horario, tarea o avance universitario en tu celular se actualiza al instante aquí.'
                  : 'Sin internet en tu PC: puedes seguir trabajando normalmente, los datos se subirán al reconectarse.'}
              </p>
            </div>
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncStatus.isSyncing}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-primary text-white text-xs font-bold shadow-lg shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50 transition-all self-start sm:self-auto"
          >
            <RefreshCw className={`w-4 h-4 ${syncStatus.isSyncing ? 'animate-spin' : ''}`} />
            <span>{syncStatus.isSyncing ? 'Sincronizando...' : 'Sincronizar Ahora'}</span>
          </button>
        </div>

        {syncFeedback && (
          <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-xs font-bold text-emerald-200 text-center animate-scaleIn">
            {syncFeedback}
          </div>
        )}

        {/* Pairing Code Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/10 text-xs">
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-gray-400 font-bold block">Tu Código de Emparejamiento (PIN)</span>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-black text-accent font-mono tracking-widest">
                {syncStatus.pairingCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold"
              >
                {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar'}</span>
              </button>
            </div>
            <p className="text-[11px] text-gray-500">
              Ingresa este código en tu teléfono OrgPro en <strong>Ajustes &gt; Sincronización</strong> para conectar ambos dispositivos.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-2">
            <span className="text-gray-400 font-bold block">Servidor Local LAN Bridge</span>
            <span className="text-sm font-mono text-primary-light block truncate">
              http://localhost:48920/api/sync
            </span>
            <p className="text-[11px] text-gray-500">
              Permite sincronización directa ultrarrápida cuando tu celular y tu PC están en la misma red Wi-Fi.
            </p>
          </div>
        </div>
      </div>

      {/* BACKUP EXPORT & IMPORT */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-4">
        <h2 className="font-extrabold text-base text-white flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" /> Respaldo & Transferencia JSON Universitaria
        </h2>
        <p className="text-xs text-gray-400">
          Exporta o importa exactamente lo que necesites: materias, horario de clases, tareas universitarias, apuntes, progreso de 17 semanas o configuración.
        </p>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            onClick={() => setShowExportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-md shadow-primary/20 transition-all"
          >
            <Download className="w-4 h-4" /> Exportar por Partes (Seleccionar)
          </button>

          <button
            onClick={handleExportJSON}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold border border-white/10 transition-all"
          >
            <Download className="w-4 h-4 text-accent" /> Backup Universitario (.JSON)
          </button>

          <label className="cursor-pointer flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold shadow-md shadow-emerald-600/20 hover:brightness-110 transition-all">
            <Upload className="w-4 h-4" />
            <span>Importar JSON de Celular / PC</span>
            <input
              type="file"
              accept=".json"
              onChange={handleFilePicked}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* MODAL EXPORTAR POR PARTES */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181824] border border-primary/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl shadow-primary/10 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Download className="w-5 h-5 text-primary" /> 📤 Exportar Datos Universitarios
              </h3>
              <button
                onClick={() => setShowExportModal(false)}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-gray-400">
              Selecciona qué partes de tus datos universitarios deseas exportar a tu archivo JSON:
            </p>

            <div className="flex justify-end gap-3 text-xs">
              <button
                onClick={() => selectAllExport(true)}
                className="text-primary-light font-bold hover:underline"
              >
                ✓ Marcar Todo
              </button>
              <button
                onClick={() => selectAllExport(false)}
                className="text-gray-400 font-semibold hover:underline"
              >
                ✗ Desmarcar
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {[
                {
                  key: 'schedule',
                  label: '📅 Horario de Clases & Materias',
                  desc: 'Bloques de horario semanal, aulas, profesores y foto del horario.',
                  icon: Calendar
                },
                {
                  key: 'universityTasks',
                  label: '📝 Tareas & Entregables Universitarios',
                  desc: 'Entregas, exámenes, proyectos y laboratorios con fechas.',
                  icon: GraduationCap
                },
                {
                  key: 'coursesAndSemesters',
                  label: '🎓 Cursos, Créditos y Semestres',
                  desc: 'Materias registradas, créditos, profesores y semestres.',
                  icon: BookOpen
                },
                {
                  key: 'universityUnits',
                  label: '📊 Unidades & 17 Semanas de Avance',
                  desc: 'Temas por semana del sílabo, exámenes por unidad y notas.',
                  icon: Layers
                },
                {
                  key: 'filesAndNotes',
                  label: '📁 Archivos, Notas y Apuntes de Estudio',
                  desc: 'Apuntes, archivos adjuntos de temas y grabaciones de clases.',
                  icon: Folder
                },
                {
                  key: 'settings',
                  label: '⚙️ Configuración & Claves IA',
                  desc: 'Preferencias de tutoría y claves de API de IA.',
                  icon: Settings
                },
              ].map((item) => {
                const Icon = item.icon;
                const isChecked = (exportSelections as any)[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => setExportSelections(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }))}
                    className={`flex items-start gap-3 p-3 rounded-2xl cursor-pointer border transition-all ${
                      isChecked
                        ? 'bg-primary/15 border-primary/50 text-white'
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05]'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mt-0.5 flex-shrink-0 ${isChecked ? 'text-primary-light' : 'text-gray-500'}`} />
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{item.label}</div>
                      <div className="text-[11px] text-gray-400">{item.desc}</div>
                    </div>
                    {isChecked ? (
                      <CheckSquare className="w-5 h-5 text-primary flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handleConfirmSelectedExport}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-primary to-indigo-600 text-white text-xs font-bold shadow-md shadow-primary/20 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isProcessing ? 'Generando...' : '¡Generar Backup Seleccionado! 🚀'}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTAR SELECCION */}
      {showImportModal && parsedDataBundle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#181824] border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl shadow-emerald-500/10 animate-scaleIn">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                <Upload className="w-5 h-5 text-emerald-400" /> 📥 Importación de Datos Universitarios
              </h3>
              <button
                onClick={() => { setShowImportModal(false); setParsedDataBundle(null); }}
                className="p-1 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {parsedDataBundle._meta && (
              <div className="p-3 rounded-2xl bg-black/40 border border-white/10 text-xs space-y-1">
                <div className="font-bold text-gray-300">📦 Información del Archivo:</div>
                <div className="text-[11px] text-gray-400">
                  📅 Exportado: <span className="text-white font-mono">{new Date(parsedDataBundle._meta.exportedAt).toLocaleString()}</span>
                </div>
                <div className="text-[11px] text-gray-400">
                  🏷️ Tipo: <span className="text-emerald-300 font-bold">{parsedDataBundle._meta.partial ? 'Backup Parcial' : 'Backup Universitario'}</span>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-gray-200">1. Categorías a importar:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => selectAllImport(true)}
                  className="text-emerald-400 font-bold hover:underline"
                >
                  ✓ Todo
                </button>
                <button
                  onClick={() => selectAllImport(false)}
                  className="text-gray-400 font-semibold hover:underline"
                >
                  ✗ Nada
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {[
                {
                  key: 'schedule',
                  label: '📅 Horario de Clases & Materias',
                  available: isCategoryAvailable('schedule', parsedDataBundle),
                },
                {
                  key: 'universityTasks',
                  label: '📝 Tareas & Entregables Universitarios',
                  available: isCategoryAvailable('universityTasks', parsedDataBundle),
                },
                {
                  key: 'coursesAndSemesters',
                  label: '🎓 Cursos, Créditos y Semestres',
                  available: isCategoryAvailable('coursesAndSemesters', parsedDataBundle),
                },
                {
                  key: 'universityUnits',
                  label: '📊 Unidades & 17 Semanas de Avance',
                  available: isCategoryAvailable('universityUnits', parsedDataBundle),
                },
                {
                  key: 'filesAndNotes',
                  label: '📁 Archivos, Notas y Apuntes de Estudio',
                  available: isCategoryAvailable('filesAndNotes', parsedDataBundle),
                },
                {
                  key: 'settings',
                  label: '⚙️ Configuración & Claves IA',
                  available: isCategoryAvailable('settings', parsedDataBundle),
                },
              ].map((item) => {
                const isChecked = (importSelections as any)[item.key];
                return (
                  <div
                    key={item.key}
                    onClick={() => {
                      if (item.available) {
                        setImportSelections(prev => ({ ...prev, [item.key]: !(prev as any)[item.key] }));
                      }
                    }}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all ${
                      !item.available
                        ? 'opacity-40 bg-white/[0.01] border-white/5 cursor-not-allowed'
                        : isChecked
                        ? 'bg-emerald-500/15 border-emerald-500/50 text-white cursor-pointer'
                        : 'bg-white/[0.02] border-white/5 text-gray-400 hover:bg-white/[0.05] cursor-pointer'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs">{item.label}</div>
                      {!item.available && (
                        <div className="text-[10px] text-amber-400/80">No disponible en este archivo</div>
                      )}
                    </div>
                    {isChecked && item.available ? (
                      <CheckSquare className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-600 flex-shrink-0" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Estrategia */}
            <div className="space-y-2 pt-1 border-t border-white/10 text-xs">
              <span className="font-bold text-gray-200">2. Estrategia de Importación:</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMergeMode('merge')}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                    importMergeMode === 'merge'
                      ? 'bg-emerald-500 text-white border-emerald-400 shadow-md shadow-emerald-500/20'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <GitMerge className="w-4 h-4" /> Fusionar / Añadir ➕
                </button>
                <button
                  type="button"
                  onClick={() => setImportMergeMode('overwrite')}
                  className={`flex items-center justify-center gap-1.5 p-2.5 rounded-xl border font-bold text-xs transition-all ${
                    importMergeMode === 'overwrite'
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                  }`}
                >
                  <RefreshCw className="w-4 h-4" /> Reemplazar actual 🔄
                </button>
              </div>

              <div className={`p-2.5 rounded-xl text-[11px] flex items-start gap-2 border ${
                importMergeMode === 'overwrite'
                  ? 'bg-rose-500/15 border-rose-500/30 text-rose-200'
                  : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200'
              }`}>
                {importMergeMode === 'overwrite' ? (
                  <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <Info className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                )}
                <span>
                  {importMergeMode === 'overwrite'
                    ? '⚠️ Reemplazará completamente los datos actuales de las categorías seleccionadas.'
                    : '💡 Conservará tus datos existentes y añadirá los elementos nuevos del archivo.'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/10">
              <button
                onClick={handleTriggerImport}
                disabled={isProcessing}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-xs font-bold shadow-md shadow-emerald-500/20 hover:brightness-110 disabled:opacity-50 transition-all"
              >
                {isProcessing ? 'Importando...' : '¡Sincronizar e Importar! ⚡'}
              </button>
              <button
                onClick={() => { setShowImportModal(false); setParsedDataBundle(null); }}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI KEYS CONFIGURATION */}
      <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="font-extrabold text-base text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-amber-400" /> Claves de Inteligencia Artificial (Copiloto Jarvis)
            </h2>
            <p className="text-xs text-gray-400">
              Configura tus claves de API para los diferentes proveedores de IA. Si dejas en blanco, se usan las claves gratuitas por defecto.
            </p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary/20 border border-primary/40 text-primary-light text-xs font-bold font-mono">
            <Sparkles className="w-3.5 h-3.5" /> 9 Proveedores Soportados
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-xs">
          {/* Groq */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Groq API Key (Llama 3.3 70B)</label>
              <span className="text-[10px] text-emerald-400 font-mono">🪐 Ultrarrápido</span>
            </div>
            <input
              type="password"
              placeholder="gsk_..."
              value={groqKey}
              onChange={(e) => setGroqKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* Gemini */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Google Gemini API Key (2.5 Flash)</label>
              <span className="text-[10px] text-blue-400 font-mono">⚡ Gemini 2.5</span>
            </div>
            <input
              type="password"
              placeholder="AIzaSy..."
              value={geminiKey}
              onChange={(e) => setGeminiKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* GitHub Models (GPT-4o) */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">GitHub Token (GPT-4o Models)</label>
              <span className="text-[10px] text-purple-400 font-mono">🧠 OpenAI GPT-4o</span>
            </div>
            <input
              type="password"
              placeholder="ghp_..."
              value={githubKey}
              onChange={(e) => setGithubKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* OpenRouter */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">OpenRouter API Key (Claude / DeepSeek)</label>
              <span className="text-[10px] text-amber-400 font-mono">🚀 Universal</span>
            </div>
            <input
              type="password"
              placeholder="sk-or-v1-..."
              value={openrouterKey}
              onChange={(e) => setOpenrouterKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* Cohere */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Cohere API Key (Command R+)</label>
              <span className="text-[10px] text-rose-400 font-mono">✍️ Síntesis</span>
            </div>
            <input
              type="password"
              placeholder="cohere_api_key..."
              value={cohereKey}
              onChange={(e) => setCohereKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* Mistral */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Mistral API Key (Mistral Large)</label>
              <span className="text-[10px] text-indigo-400 font-mono">🇫🇷 Mistral</span>
            </div>
            <input
              type="password"
              placeholder="mistral_api_key..."
              value={mistralKey}
              onChange={(e) => setMistralKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* Cerebras */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Cerebras API Key</label>
              <span className="text-[10px] text-cyan-400 font-mono">⚡ CS-3 Wafer</span>
            </div>
            <input
              type="password"
              placeholder="csk-..."
              value={cerebrasKey}
              onChange={(e) => setCerebrasKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>

          {/* Nvidia NIM */}
          <div className="p-3.5 rounded-2xl bg-black/30 border border-white/10 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-gray-200 font-bold">Nvidia NIM API Key</label>
              <span className="text-[10px] text-emerald-400 font-mono">🟢 GPU Cloud</span>
            </div>
            <input
              type="password"
              placeholder="nvapi-..."
              value={nvidiaKey}
              onChange={(e) => setNvidiaKey(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3.5 py-2 text-white font-mono text-xs focus:outline-none focus:border-primary placeholder:text-gray-600"
            />
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-white/10">
          <button
            onClick={() => setPendingAIKeysUpdate(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white text-xs font-bold shadow-lg shadow-primary/20 hover:brightness-110 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Guardar Claves IA</span>
          </button>
        </div>
      </div>

      {/* DANGER / MAINTENANCE ZONE */}
      <div className="p-6 rounded-3xl bg-rose-950/20 border border-rose-500/30 backdrop-blur-xl space-y-4">
        <div>
          <h2 className="font-extrabold text-base text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-rose-400" /> Mantenimiento y Gestión de Almacenamiento
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Opciones avanzadas para liberar espacio en caché o restablecer la base de datos local.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button
            onClick={() => setConfirmClearDocCache(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Limpiar Caché de Documentos IA</span>
          </button>

          <button
            onClick={() => setConfirmResetAllData(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/50 text-xs font-bold transition-all"
          >
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Restablecer Datos Locales</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={pendingAIKeysUpdate}
        title="¿Guardar configuración de claves IA?"
        description="¿Deseas actualizar y guardar de forma segura las claves de API configuradas?"
        confirmLabel="Sí, guardar claves"
        cancelLabel="Cancelar"
        variant="primary"
        onConfirm={handleConfirmAIKeysUpdate}
        onCancel={() => setPendingAIKeysUpdate(false)}
      />

      <ConfirmModal
        isOpen={confirmClearDocCache}
        title="¿Limpiar caché de IA?"
        description="Esta acción eliminará los resúmenes y preguntas en caché generados para tus documentos. ¿Deseas continuar?"
        confirmLabel="Sí, limpiar caché"
        cancelLabel="Cancelar"
        variant="warning"
        onConfirm={handleConfirmClearDocCache}
        onCancel={() => setConfirmClearDocCache(false)}
      />

      <ConfirmModal
        isOpen={confirmResetAllData}
        title="⚠️ ¿Restablecer toda la base de datos local?"
        description="Esta acción borrará PERMANENTEMENTE todas las tareas, materias, horarios y configuraciones de este equipo. Asegúrate de tener una copia de seguridad en JSON."
        confirmLabel="Sí, restablecer todo"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmResetAllData}
        onCancel={() => setConfirmResetAllData(false)}
      />

      <ConfirmModal
        isOpen={confirmOverwriteImport}
        title="¿Reemplazar datos actuales al importar?"
        description="Has seleccionado la estrategia de REEMPLAZAR. Los datos actuales de las categorías marcadas serán sobreescritos por los del archivo. ¿Continuar?"
        confirmLabel="Sí, sobreescribir e importar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={executeImport}
        onCancel={() => setConfirmOverwriteImport(false)}
      />
    </div>
  );
};

export default SettingsView;
