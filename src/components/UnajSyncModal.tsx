import React, { useState, useEffect } from 'react';
import {
  X,
  Lock,
  User,
  Eye,
  EyeOff,
  CloudDownload,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  BookOpen,
  FolderPlus,
  Calendar,
  FileText,
  Loader2,
  RotateCw
} from 'lucide-react';
import confetti from 'canvas-confetti';
import StorageService from '../services/StorageService';
import UnajScraperService, { SyncMetrics } from '../services/UnajScraperService';
import AudioService from '../services/AudioService';

export interface UnajSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncSuccess?: (metrics: SyncMetrics) => void;
}

export const UnajSyncModal: React.FC<UnajSyncModalProps> = ({
  isOpen,
  onClose,
  onSyncSuccess
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(true);

  const [isSyncing, setIsSyncing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SyncMetrics | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadSavedCredentials();
      setErrorMsg(null);
      setMetrics(null);
      setProgressMsg('');
      setProgressPct(0);
    }
  }, [isOpen]);

  const loadSavedCredentials = async () => {
    try {
      const creds = await StorageService.getUnajCredentials();
      if (creds && creds.username) {
        setUsername(creds.username);
        setPassword(creds.password || '');
        setRememberCredentials(creds.remember !== false);
      }
    } catch (_) {}
  };

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Por favor, ingresa tu usuario y contraseña de la UNAJ.');
      AudioService.playError?.();
      return;
    }

    setIsSyncing(true);
    setErrorMsg(null);
    setMetrics(null);
    setProgressMsg('Conectando con el servidor de la UNAJ...');
    setProgressPct(0.05);

    try {
      if (rememberCredentials) {
        await StorageService.saveUnajCredentials({
          username: username.trim(),
          password: password.trim(),
          remember: true
        });
      } else {
        await StorageService.clearUnajCredentials();
      }

      const res = await UnajScraperService.syncAll({
        username: username.trim(),
        password: password.trim(),
        onProgress: (msg, pct) => {
          setProgressMsg(msg);
          setProgressPct(pct);
        }
      });

      if (res && res.success) {
        setMetrics(res.metrics);
        AudioService.playLevelUp();
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch (_) {}
        if (onSyncSuccess) onSyncSuccess(res.metrics);
      }
    } catch (err: any) {
      console.error('[UnajSyncModal PC] Error:', err);
      const friendlyMsg =
        err.message || 'Error al comunicarse con el Aula Virtual. Verifica tu conexión y credenciales.';
      setErrorMsg(friendlyMsg);
      AudioService.playError?.();
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div
        className="bg-[#0e1124] border border-white/15 rounded-3xl p-6 max-w-lg w-full space-y-5 shadow-2xl animate-scaleIn relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Glow bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center justify-center shrink-0 shadow-inner">
              <img
                src="/assets/unaj_logo.png"
                alt="UNAJ"
                className="w-full h-full object-contain"
                onError={(e) => {
                  // Fallback icon si la ruta relativa varía
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                Aula Virtual UNAJ
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                  Sincronizador
                </span>
              </h2>
              <p className="text-xs text-gray-400">
                Sincronización Inteligente de materias, 17 semanas y sílabos
              </p>
            </div>
          </div>

          {!isSyncing && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-xl hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Contenido según estado: Métricas o Formulario/Progreso */}
        {metrics ? (
          <div className="space-y-5 py-2">
            <div className="text-center space-y-2 py-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-base font-bold text-white">¡Sincronización Exitosa!</h3>
              <p className="text-xs text-gray-300 max-w-sm mx-auto">
                Tus cursos y materiales se integraron de forma inteligente sin sobrescribir ni duplicar información local.
              </p>
            </div>

            {/* Periodo Académico Detectado */}
            {metrics.detectedSemester && (
              <div className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>
                  Periodo Académico Activo: <strong className="text-white ml-1 font-bold">{metrics.detectedSemester}</strong>
                </span>
              </div>
            )}

            {/* Lista de Periodos Disponibles Detectados */}
            {metrics.availablePeriods && metrics.availablePeriods.length > 1 && (
              <div className="space-y-1.5 text-center">
                <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                  Periodos detectados en UNAJ
                </span>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {metrics.availablePeriods.map((pName, pIdx) => {
                    const isActive = pName === metrics.detectedSemester;
                    return (
                      <div
                        key={pIdx}
                        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold border ${
                          isActive
                            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                            : 'bg-white/5 border-white/10 text-gray-400'
                        }`}
                      >
                        {isActive ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        )}
                        <span>{pName} {isActive ? '(Actual)' : ''}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Grid de Métricas */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                <div className="text-2xl font-black text-white flex items-center justify-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                  {metrics.evaluatedCourses}
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Cursos Evaluados
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                <div className="text-2xl font-black text-emerald-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-5 h-5" />
                  +{metrics.newCoursesCount}
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Nuevos Cursos
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                <div className="text-2xl font-black text-blue-400 flex items-center justify-center gap-1.5">
                  <FolderPlus className="w-5 h-5" />
                  +{metrics.newUnitsCount}
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Nuevas Unidades
                </div>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                <div className="text-2xl font-black text-purple-400 flex items-center justify-center gap-1.5">
                  <Calendar className="w-5 h-5" />
                  +{metrics.newWeeksCount}
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Semanas Generadas
                </div>
              </div>

              <div className="col-span-2 bg-white/5 border border-white/10 rounded-2xl p-3.5 text-center space-y-1">
                <div className="text-2xl font-black text-teal-300 flex items-center justify-center gap-1.5">
                  <FileText className="w-5 h-5" />
                  +{metrics.newFilesCount}
                </div>
                <div className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">
                  Nuevos Archivos / Enlaces de Estudio
                </div>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Completado, ver mis materias
            </button>
          </div>
        ) : isSyncing ? (
          <div className="py-8 space-y-5 text-center">
            <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              <img
                src="/assets/unaj_logo.png"
                alt="UNAJ"
                className="w-6 h-6 object-contain absolute opacity-80"
              />
            </div>

            <div className="space-y-1">
              <h3 className="text-base font-bold text-white">Sincronizando con la UNAJ</h3>
              <p className="text-xs text-indigo-200/80 animate-pulse">
                {progressMsg || 'Consultando aula virtual...'}
              </p>
            </div>

            {/* Barra de progreso */}
            <div className="max-w-xs mx-auto space-y-2">
              <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.round(progressPct * 100)}%` }}
                />
              </div>
              <div className="text-right text-[11px] font-bold text-gray-400">
                {Math.round(progressPct * 100)}%
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSync} className="space-y-4">
            {errorMsg && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs space-y-3 shadow-lg shadow-rose-950/20">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="font-bold text-sm text-white flex items-center justify-between">
                      <span>
                        {errorMsg.toLowerCase().includes('incorrect') || errorMsg.toLowerCase().includes('contrase')
                          ? 'Credenciales Incorrectas'
                          : 'Aviso de Conexión UNAJ'}
                      </span>
                    </div>
                    <p className="text-xs text-rose-200/90 leading-relaxed">
                      {errorMsg.toLowerCase().includes('incorrect')
                        ? 'El Aula Virtual de la UNAJ indicó que los datos son incorrectos. Por favor, verifica tu código de estudiante y contraseña.'
                        : errorMsg}
                    </p>
                  </div>
                </div>

                {/* Acciones Rápidas Interactivas */}
                <div className="flex items-center gap-2 pt-1 border-t border-rose-500/20">
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-xs font-semibold text-white transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPassword ? 'Ocultar Contraseña' : 'Ver Contraseña'}</span>
                  </button>

                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white transition-colors cursor-pointer shadow-md shadow-rose-600/30"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reintentar</span>
                  </button>
                </div>
              </div>
            )}

            <p className="text-xs text-gray-300 leading-relaxed">
              Ingresa tus credenciales del Sistema de Campus Virtual UNAJ (siscampusv.unaj.edu.pe) para importar tus materias matriculadas, sílabos y tareas.
            </p>

            {/* Input Usuario */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Usuario / Código de Estudiante:</label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-black/40 border transition-colors ${
                  errorMsg ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/10 focus-within:border-indigo-500/60'
                }`}
              >
                <User className={`w-4 h-4 shrink-0 ${errorMsg ? 'text-rose-400' : 'text-gray-400'}`} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="Ej: 21102930 o tu usuario"
                  className="w-full bg-transparent text-white text-xs placeholder:text-gray-500 focus:outline-none"
                  disabled={isSyncing}
                  autoComplete="username"
                />
              </div>
            </div>

            {/* Input Contraseña */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-300">Contraseña del Campus:</label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl bg-black/40 border transition-colors ${
                  errorMsg ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/10 focus-within:border-indigo-500/60'
                }`}
              >
                <Lock className={`w-4 h-4 shrink-0 ${errorMsg ? 'text-rose-400' : 'text-gray-400'}`} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-transparent text-white text-xs placeholder:text-gray-500 focus:outline-none"
                  disabled={isSyncing}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-gray-400 hover:text-white p-0.5 rounded cursor-pointer"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Switch Recordar credenciales */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white">Recordar credenciales</div>
                <div className="text-[11px] text-gray-400">
                  Guardar tus datos de forma segura para futuras sincronizaciones.
                </div>
              </div>
              <input
                type="checkbox"
                checked={rememberCredentials}
                onChange={(e) => setRememberCredentials(e.target.checked)}
                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500/30 bg-black/40 border-white/20 cursor-pointer"
              />
            </div>

            {/* Botón Sincronizar */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSyncing}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSyncing}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:brightness-110 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4" />
                <span>Iniciar Sincronización</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default UnajSyncModal;
