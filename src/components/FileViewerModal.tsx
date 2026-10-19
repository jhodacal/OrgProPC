import React, { useState } from 'react';
import {
  X,
  Download,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCw,
  FileText,
  Image as ImageIcon,
  BookOpen,
  Bot,
  Bookmark,
  Sparkles,
  Maximize2,
  Minimize2,
  Share2,
  FileCode,
  PenTool,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { UniversityFile } from '../types';
import MarkdownRenderer from './MarkdownRenderer';

interface FileViewerModalProps {
  file: UniversityFile | null;
  isOpen: boolean;
  onClose: () => void;
  onRunAI?: (file: UniversityFile) => void;
  onOpenFlashcards?: (file: UniversityFile) => void;
  onAddNote?: (file: UniversityFile) => void;
}

export const FileViewerModal: React.FC<FileViewerModalProps> = ({
  file,
  isOpen,
  onClose,
  onRunAI,
  onOpenFlashcards,
  onAddNote
}) => {
  const [copied, setCopied] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(true); // Default to TRUE Fullscreen per user request
  const [activeTab, setActiveTab] = useState<'content' | 'summary'>('content');
  const [showFloatingMenu, setShowFloatingMenu] = useState(true);

  if (!isOpen || !file) return null;

  const isImage = file.type === 'image' || file.uri?.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|svg)$/i.test(file.name);
  const isPdf = file.type === 'pdf' || file.uri?.startsWith('data:application/pdf') || /\.pdf$/i.test(file.name);
  const hasTextContent = Boolean(file.textContent?.trim());
  const hasSummary = Boolean(file.aiSummary?.trim());

  const handleCopyText = () => {
    const textToCopy = file.textContent || file.aiSummary || file.name;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    try {
      const link = document.createElement('a');
      link.href = file.uri && file.uri !== 'local://note' ? file.uri : `data:text/plain;charset=utf-8,${encodeURIComponent(file.textContent || '')}`;
      link.download = file.name || 'archivo_adjunto';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      console.error('Error downloading file:', e);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#070913] flex flex-col overflow-hidden animate-fadeIn ${
        isFullscreen ? 'w-screen h-screen' : 'p-3 sm:p-6 bg-black/85 backdrop-blur-md items-center justify-center'
      }`}
    >
      <div
        className={`bg-[#0b0e1d] flex flex-col shadow-2xl overflow-hidden transition-all duration-300 relative ${
          isFullscreen
            ? 'w-full h-full rounded-none border-0'
            : 'w-full max-w-6xl h-[94vh] rounded-3xl border border-white/15'
        }`}
      >
        {/* Top Header Bar */}
        <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-white/10 flex items-center justify-between gap-3 shrink-0 bg-[#0e1226]/90 backdrop-blur-md select-none z-20">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0 shadow-inner">
              {isImage ? (
                <ImageIcon className="w-5 h-5 text-accent" />
              ) : isPdf ? (
                <FileText className="w-5 h-5 text-rose-400" />
              ) : (
                <BookOpen className="w-5 h-5 text-indigo-400" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm sm:text-base font-black text-white truncate flex items-center gap-2">
                <span>{file.name}</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                <span className="uppercase px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[10px] text-gray-300 font-bold">
                  {file.type}
                </span>
                {file.size ? <span>• {formatFileSize(file.size)}</span> : null}
                {file.addedAt ? <span>• {file.addedAt?.slice(0, 10)}</span> : null}
                <span className="hidden md:inline text-emerald-400">• Pantalla Completa</span>
              </div>
            </div>
          </div>

          {/* Action Tools */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {hasTextContent && (
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-bold text-gray-200 transition-all cursor-pointer"
                title="Copiar texto del documento"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span className="hidden sm:inline">{copied ? 'Copiado' : 'Copiar'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Descargar archivo en la PC"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Descargar</span>
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
              title={isFullscreen ? 'Vista de Ventana' : 'Pantalla Completa Total'}
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all cursor-pointer"
              title="Cerrar Visor (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation if AI summary and content exist */}
        {hasSummary && hasTextContent && (
          <div className="px-6 pt-2 border-b border-white/5 flex items-center gap-2 bg-[#080b18] shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('content')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'content'
                  ? 'border-indigo-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              Contenido Completo
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={`pb-2.5 px-4 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'summary'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              Resumen IA Guardado
            </button>
          </div>
        )}

        {/* Main Document Viewport - EXPANDED TO FULL SCREEN */}
        <div className="flex-1 w-full h-full min-h-0 bg-[#050714] relative flex flex-col overflow-hidden">
          {/* Summary Tab */}
          {activeTab === 'summary' && file.aiSummary ? (
            <div className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl mx-auto w-full space-y-4">
              <div className="p-6 rounded-3xl bg-purple-950/20 border border-purple-500/20 space-y-4 shadow-xl">
                <div className="flex items-center gap-2 text-purple-400 font-bold text-sm">
                  <Sparkles className="w-5 h-5" />
                  <span>Resumen Ejecutivo IA</span>
                </div>
                <div className="text-gray-200 leading-relaxed text-sm">
                  <MarkdownRenderer content={file.aiSummary} />
                </div>
              </div>
            </div>
          ) : isPdf && file.uri && file.uri !== 'local://note' ? (
            /* FULLSCREEN PDF VIEWER */
            <div className="flex-1 w-full h-full min-h-0 flex flex-col relative bg-slate-950">
              <iframe
                src={file.uri}
                title={file.name}
                className="w-full h-full flex-1 border-0"
              />
            </div>
          ) : isImage && file.uri && file.uri !== 'local://note' ? (
            /* FULLSCREEN IMAGE PREVIEW WITH FLOATING CONTROLS */
            <div className="flex-1 w-full h-full min-h-0 flex flex-col items-center justify-center relative overflow-hidden bg-black/60">
              {/* Floating Image Control Bar */}
              <div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#0c1024]/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15 z-30 shadow-2xl select-none">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(0.3, prev - 0.2))}
                  className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Alejar (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-gray-200 w-12 text-center">
                  {Math.round(zoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(4, prev + 0.2))}
                  className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Acercar (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => setRotation(prev => (prev + 90) % 360)}
                  className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                  title="Rotar 90°"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="px-2 py-1 text-[11px] font-bold text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                >
                  Ajustar
                </button>
              </div>

              <div className="w-full h-full flex items-center justify-center p-6 overflow-auto">
                <img
                  src={file.uri}
                  alt={file.name}
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out'
                  }}
                  className="max-h-[90vh] max-w-[95vw] object-contain rounded-xl shadow-2xl border border-white/10 select-none cursor-grab active:cursor-grabbing"
                />
              </div>

              {hasTextContent && (
                <div className="absolute bottom-6 left-6 max-w-md p-4 rounded-2xl bg-[#0e1228]/95 backdrop-blur-md border border-white/15 shadow-2xl text-xs text-gray-300">
                  <h4 className="font-bold text-indigo-300 mb-1">Notas adjuntas:</h4>
                  <MarkdownRenderer content={file.textContent || ''} />
                </div>
              )}
            </div>
          ) : (
            /* FULLSCREEN TEXT / NOTES / MARKDOWN VIEWER */
            <div className="flex-1 w-full h-full min-h-0 overflow-y-auto p-6 sm:p-12">
              <div className="max-w-4xl mx-auto w-full bg-[#0c1024]/70 border border-white/10 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-4">
                <MarkdownRenderer content={file.textContent || 'Sin contenido de texto registrado en este material.'} />
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* BOTÓN FLOTANTE (FAB) DE ACCIONES RÁPIDAS EN PANTALLA COMPLETA */}
          {/* ============================================================ */}
          <div className="absolute bottom-6 right-6 z-40 flex flex-col items-end gap-2.5 select-none">
            {showFloatingMenu && (
              <div className="flex flex-col gap-2 items-end animate-scaleIn">
                {onRunAI && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onRunAI(file);
                    }}
                    className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-black shadow-2xl shadow-indigo-500/30 border border-white/20 transition-all cursor-pointer hover:scale-105"
                    title="Analizar documento con IA"
                  >
                    <Bot className="w-4 h-4 text-white" />
                    <span>Analizar con IA (Resumen & Preguntas)</span>
                  </button>
                )}

                {onOpenFlashcards && file.flashcards && file.flashcards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenFlashcards(file);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-xl border border-amber-300 transition-all cursor-pointer hover:scale-105"
                    title="Estudiar Flashcards"
                  >
                    <Bookmark className="w-4 h-4 text-slate-950" />
                    <span>Estudiar Flashcards ({file.flashcards.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-gray-200 border border-white/15 text-xs font-bold backdrop-blur-md shadow-lg transition-all cursor-pointer hover:scale-105"
                  title="Guardar archivo local"
                >
                  <Download className="w-4 h-4 text-indigo-400" />
                  <span>Descargar Archivo</span>
                </button>
              </div>
            )}

            {/* Toggle Button for the Floating Menu */}
            <button
              type="button"
              onClick={() => setShowFloatingMenu(!showFloatingMenu)}
              className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-2xl shadow-indigo-500/40 border border-white/25 hover:scale-110 active:scale-95 transition-all cursor-pointer"
              title={showFloatingMenu ? 'Ocultar menú flotante' : 'Mostrar acciones flotantes'}
            >
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FileViewerModal;
