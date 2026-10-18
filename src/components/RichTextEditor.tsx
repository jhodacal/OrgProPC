import React, { useRef, useState, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  Indent,
  Outdent,
  List,
  ListOrdered,
  Quote,
  Minus,
  Eye,
  Edit3,
  Sparkles,
  HelpCircle,
  Type,
  Code,
  Check,
  Undo,
  Redo,
  Palette
} from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minHeight?: string;
  showPreviewTabs?: boolean;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Escribe tus apuntes, notas o contenido con formato visual...',
  minHeight = '180px',
  showPreviewTabs = true
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<'visual' | 'preview' | 'raw'>('visual');
  const [capsLockIndentActive, setCapsLockIndentActive] = useState<boolean>(true);
  const [showHelper, setShowHelper] = useState<boolean>(false);
  const isInternalChange = useRef<boolean>(false);

  // Sync value to contentEditable when value changes externally
  useEffect(() => {
    if (editorRef.current && !isInternalChange.current) {
      if (editorRef.current.innerHTML !== (value || '')) {
        editorRef.current.innerHTML = value || '';
      }
    }
    isInternalChange.current = false;
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      isInternalChange.current = true;
      const html = editorRef.current.innerHTML;
      onChange(html);
    }
  };

  // Execute standard formatting commands
  const execCmd = (command: string, valueArg: string | undefined = undefined) => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(command, false, valueArg);
    handleInput();
  };

  // Apply custom formatting block / font size
  const applyHeading = (tag: 'h1' | 'h2' | 'h3' | 'p' | 'small') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    if (tag === 'small') {
      execCmd('fontSize', '1');
    } else {
      execCmd('formatBlock', tag);
    }
  };

  // Indent visual handler
  const handleIndent = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    execCmd('indent');
  };

  // Outdent visual handler
  const handleOutdent = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    execCmd('outdent');
  };

  // Highlight visual handler
  const handleHighlight = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    execCmd('hiliteColor', 'rgba(251, 191, 36, 0.35)');
  };

  // Insert custom visual study callout badge
  const insertBadge = (badgeType: 'nota' | 'idea' | 'importante' | 'examen') => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
    let html = '';
    if (badgeType === 'nota') {
      html = '<div style="background: rgba(108, 99, 255, 0.15); border-left: 4px solid #6C63FF; padding: 8px 12px; border-radius: 8px; margin: 8px 0; color: #E0E7FF;"><strong>📌 NOTA:</strong> Escribe tu apunte aquí...</div><p><br></p>';
    } else if (badgeType === 'idea') {
      html = '<div style="background: rgba(78, 205, 196, 0.15); border-left: 4px solid #4ECDC4; padding: 8px 12px; border-radius: 8px; margin: 8px 0; color: #CCFBF1;"><strong>💡 IDEA CLAVE:</strong> Concepto o fórmula principal...</div><p><br></p>';
    } else if (badgeType === 'importante') {
      html = '<div style="background: rgba(239, 68, 68, 0.15); border-left: 4px solid #EF4444; padding: 8px 12px; border-radius: 8px; margin: 8px 0; color: #FEE2E2;"><strong>⚠️ IMPORTANTE:</strong> Información crítica para recordar...</div><p><br></p>';
    } else if (badgeType === 'examen') {
      html = '<div style="background: rgba(16, 185, 129, 0.15); border-left: 4px solid #10B981; padding: 8px 12px; border-radius: 8px; margin: 8px 0; color: #D1FAE5;"><strong>🎯 FIJA DE EXAMEN:</strong> Pregunta típica o teorema...</div><p><br></p>';
    }
    execCmd('insertHTML', html);
  };

  // Key Down Handler: Tab, CapsLock, Enter, shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    // CapsLock key detection for quick indentation
    if (e.key === 'CapsLock' && capsLockIndentActive) {
      e.preventDefault();
      handleIndent();
      return;
    }

    // Tab key for Indent / Outdent
    if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        handleOutdent();
      } else {
        handleIndent();
      }
      return;
    }
  };

  // Word & character stats
  const getPlainText = () => {
    if (!value) return '';
    const temp = document.createElement('div');
    temp.innerHTML = value;
    return temp.textContent || temp.innerText || '';
  };

  const plainText = getPlainText();
  const wordCount = plainText.trim() ? plainText.trim().split(/\s+/).length : 0;
  const charCount = plainText.length;

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-black/40 overflow-hidden flex flex-col shadow-inner transition-all focus-within:border-primary/60">
      {/* Visual Toolbar */}
      <div className="p-2 border-b border-white/10 bg-white/[0.03] flex flex-wrap items-center justify-between gap-1.5 select-none">
        {/* Actions Toolset */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Text Style: Bold, Italic, Underline, Strikethrough, Highlight */}
          <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => execCmd('bold')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all font-bold"
              title="Negrita (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('italic')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all italic"
              title="Cursiva (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('underline')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all underline"
              title="Subrayado (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('strikeThrough')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title="Tachado"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={handleHighlight}
              className="p-1.5 rounded-lg text-amber-300 hover:text-amber-200 hover:bg-amber-500/20 transition-all"
              title="Resaltar Texto con Color"
            >
              <Highlighter className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Hierarchy & Headings: H1, H2, H3, Párrafo */}
          <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => applyHeading('h1')}
              className="px-2 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-xs font-black flex items-center gap-0.5"
              title="Título Grande (H1)"
            >
              <Heading1 className="w-3.5 h-3.5 text-primary-light" />
              <span className="text-[10px]">H1</span>
            </button>
            <button
              type="button"
              onClick={() => applyHeading('h2')}
              className="px-2 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-xs font-bold flex items-center gap-0.5"
              title="Subtítulo Mediano (H2)"
            >
              <Heading2 className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px]">H2</span>
            </button>
            <button
              type="button"
              onClick={() => applyHeading('h3')}
              className="px-2 py-1 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 text-xs font-semibold flex items-center gap-0.5"
              title="Encabezado 3 (H3)"
            >
              <Heading3 className="w-3.5 h-3.5 text-purple-300" />
              <span className="text-[10px]">H3</span>
            </button>
            <button
              type="button"
              onClick={() => applyHeading('p')}
              className="px-1.5 py-1 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 text-[10px] font-mono"
              title="Texto Normal / Párrafo"
            >
              Normal
            </button>
          </div>

          {/* Indent & Outdent / Sangría (con CapsLock & Tab) */}
          <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={handleIndent}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-200 hover:text-white hover:bg-primary/20 border border-transparent hover:border-primary/40 transition-all"
              title="Indentar / Agregar sangría visual (Tecla Tab o CapsLock)"
            >
              <Indent className="w-3.5 h-3.5 text-primary-light" />
              <span className="text-[10px] font-bold">Indentar</span>
            </button>
            <button
              type="button"
              onClick={handleOutdent}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-gray-200 hover:text-white hover:bg-white/10 transition-all"
              title="Desindentar / Reducir sangría (Shift+Tab)"
            >
              <Outdent className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[10px] font-bold">Desindentar</span>
            </button>

            {/* CapsLock Indent Switch Toggle */}
            <button
              type="button"
              onClick={() => setCapsLockIndentActive(!capsLockIndentActive)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 transition-all border ${
                capsLockIndentActive
                  ? 'bg-purple-600/30 text-purple-200 border-purple-500/40 shadow-sm'
                  : 'bg-white/5 text-gray-500 border-white/5 hover:text-gray-300'
              }`}
              title="Cuando está activo, pulsar Caps Lock / Bloq Mayús aplica sangría visual en el texto"
            >
              <span className="font-mono text-[9px]">🔠 CapsLock Indent</span>
              <span className={`w-1.5 h-1.5 rounded-full ${capsLockIndentActive ? 'bg-emerald-400' : 'bg-gray-600'}`} />
            </button>
          </div>

          {/* Lists & Quotes & Divider */}
          <div className="flex items-center gap-0.5 bg-black/30 p-0.5 rounded-xl border border-white/5">
            <button
              type="button"
              onClick={() => execCmd('insertUnorderedList')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title="Lista con viñetas"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertOrderedList')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title="Lista numerada"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('formatBlock', 'blockquote')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title="Bloque de Cita Destacada"
            >
              <Quote className="w-3.5 h-3.5 text-accent" />
            </button>
            <button
              type="button"
              onClick={() => execCmd('insertHorizontalRule')}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all"
              title="Línea divisoria"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Study Callouts */}
          <div className="hidden sm:flex items-center gap-1 bg-black/30 px-2 py-0.5 rounded-xl border border-white/5">
            <span className="text-[10px] text-gray-500 font-bold uppercase">Insignias:</span>
            <button
              type="button"
              onClick={() => insertBadge('nota')}
              className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/10 text-amber-300"
              title="Insertar Bloque de Nota"
            >
              📌
            </button>
            <button
              type="button"
              onClick={() => insertBadge('idea')}
              className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/10 text-cyan-300"
              title="Insertar Bloque de Idea"
            >
              💡
            </button>
            <button
              type="button"
              onClick={() => insertBadge('importante')}
              className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/10 text-rose-300"
              title="Insertar Bloque Importante"
            >
              ⚠️
            </button>
            <button
              type="button"
              onClick={() => insertBadge('examen')}
              className="text-[11px] px-1.5 py-0.5 rounded hover:bg-white/10 text-emerald-300"
              title="Insertar Bloque de Examen"
            >
              🎯
            </button>
          </div>
        </div>

        {/* View Mode Tabs */}
        {showPreviewTabs && (
          <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setViewMode('visual')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'visual'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editor Visual</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('preview')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'preview'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Vista Previa</span>
            </button>
          </div>
        )}
      </div>

      {/* Editor Body */}
      <div className="relative flex-1 flex flex-col min-h-[160px]">
        {/* Visual WYSIWYG ContentEditable Area */}
        {viewMode === 'visual' && (
          <div
            ref={editorRef}
            contentEditable
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            style={{ minHeight }}
            data-placeholder={placeholder}
            className="w-full flex-1 p-4 text-xs sm:text-sm text-gray-100 focus:outline-none overflow-y-auto leading-relaxed selection:bg-primary/40 rich-editor-content"
          />
        )}

        {/* Live Preview Area */}
        {viewMode === 'preview' && (
          <div
            className="w-full flex-1 p-4 overflow-y-auto bg-black/20 text-xs sm:text-sm leading-relaxed"
            style={{ minHeight }}
          >
            {value && value.trim() ? (
              <MarkdownRenderer content={value} />
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-600 py-8 text-center">
                <Sparkles className="w-6 h-6 mb-2 opacity-40 text-primary-light" />
                <p className="text-xs">Escribe en el editor visual para previsualizar tus apuntes formateados.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Info Bar */}
      <div className="px-3 py-1.5 border-t border-white/5 bg-white/[0.02] flex items-center justify-between text-[11px] text-gray-400 font-mono">
        <div className="flex items-center gap-3">
          <span>{wordCount} palabras</span>
          <span>{charCount} caracteres</span>
          <span className="hidden sm:inline text-gray-500">| Atajos: <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-300">Tab</kbd> / <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-300">CapsLock</kbd> = Indentar, <kbd className="bg-white/10 px-1 py-0.5 rounded text-gray-300">Ctrl+B</kbd> = Negrita</span>
        </div>

        <button
          type="button"
          onClick={() => setShowHelper(!showHelper)}
          className="text-gray-400 hover:text-primary-light flex items-center gap-1 font-sans text-[11px]"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>Ayuda visual</span>
        </button>
      </div>

      {/* Collapsible Format Helper Sheet */}
      {showHelper && (
        <div className="p-3 border-t border-white/10 bg-[#070913]/90 text-[11px] grid grid-cols-2 sm:grid-cols-4 gap-3 text-gray-300 animate-fadeIn font-sans">
          <div>
            <span className="font-bold text-white block mb-1">Editor Visual en Vivo:</span>
            <p className="text-gray-400">Todo lo que formatees (negrita, colores, tamaños) se aplica directamente en pantalla sin códigos extraños.</p>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">Tamaños & Títulos:</span>
            <p className="text-primary-light font-bold">H1: Título Grande</p>
            <p className="text-accent font-bold">H2: Subtítulo</p>
            <p className="text-purple-300 font-semibold">H3: Encabezado</p>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">Indentación & Sangría:</span>
            <p className="text-gray-300"><kbd className="bg-white/10 px-1 rounded">Tab</kbd> o <kbd className="bg-white/10 px-1 rounded">CapsLock</kbd> : Sangría</p>
            <p className="text-gray-300"><kbd className="bg-white/10 px-1 rounded">Shift+Tab</kbd> : Desindentar</p>
          </div>
          <div>
            <span className="font-bold text-white block mb-1">Insignias & Citas:</span>
            <p className="text-amber-300">📌 Bloques destacados</p>
            <p className="text-accent">💡 Ideas y conceptos</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default RichTextEditor;
