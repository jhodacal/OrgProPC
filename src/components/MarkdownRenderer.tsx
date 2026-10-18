import React from 'react';
import { CheckSquare, Square, Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const [copiedCodeIndex, setCopiedCodeIndex] = React.useState<number | null>(null);

  if (!content) {
    return <p className="text-gray-500 italic text-xs">Sin contenido de texto.</p>;
  }

  const handleCopyCode = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(index);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  // If content contains rich HTML tags from the WYSIWYG editor
  const isHtml = /<(p|div|h1|h2|h3|h4|ul|ol|li|blockquote|strong|b|em|i|u|mark|span|hr|br|table)/i.test(content);

  if (isHtml) {
    return (
      <div
        className={`rich-rendered-content text-xs sm:text-sm selection:bg-primary/40 ${className}`}
        dangerouslySetInnerHTML={{ __html: content }}
      />
    );
  }

  // Helper to parse inline styles: bold, italic, underline, strikethrough, highlight, inline code
  const renderInlineFormatted = (text: string): React.ReactNode => {
    const parts: React.ReactNode[] = [];
    const regex = /(`[^`]+`|\*\*[^*]+\*\*|__[^_]+__|<b>.*?<\/b>|<strong>.*?<\/strong>|\*[^*]+\*|_[^_]+_|<i>.*?<\/i>|<em>.*?<\/em>|<u>.*?<\/u>|~~[^~]+~~|==[^=]+==|<mark>.*?<\/mark>|<small>.*?<\/small>|<big>.*?<\/big>)/g;
    
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let keyIdx = 0;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      const token = match[0];
      
      if (token.startsWith('`') && token.endsWith('`')) {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 rounded-md bg-purple-950/60 text-purple-300 font-mono text-[0.85em] border border-purple-500/30">
            {token.slice(1, -1)}
          </code>
        );
      } else if ((token.startsWith('**') && token.endsWith('**')) || (token.startsWith('__') && token.endsWith('__'))) {
        parts.push(
          <strong key={keyIdx++} className="font-extrabold text-white">
            {renderInlineFormatted(token.slice(2, -2))}
          </strong>
        );
      } else if (token.startsWith('<b>') || token.startsWith('<strong>')) {
        const inner = token.replace(/<\/?(b|strong)>/g, '');
        parts.push(
          <strong key={keyIdx++} className="font-extrabold text-white">
            {renderInlineFormatted(inner)}
          </strong>
        );
      } else if (token.startsWith('<u>') && token.endsWith('</u>')) {
        const inner = token.slice(3, -4);
        parts.push(
          <u key={keyIdx++} className="underline decoration-accent decoration-2 underline-offset-4">
            {renderInlineFormatted(inner)}
          </u>
        );
      } else if (token.startsWith('~~') && token.endsWith('~~')) {
        parts.push(
          <del key={keyIdx++} className="line-through text-gray-500">
            {renderInlineFormatted(token.slice(2, -2))}
          </del>
        );
      } else if ((token.startsWith('==') && token.endsWith('==')) || token.startsWith('<mark>')) {
        const inner = token.startsWith('==') ? token.slice(2, -2) : token.replace(/<\/?mark>/g, '');
        parts.push(
          <mark key={keyIdx++} className="bg-amber-400/25 text-amber-200 px-1 py-0.5 rounded border border-amber-400/40 font-semibold mx-0.5">
            {renderInlineFormatted(inner)}
          </mark>
        );
      } else if (token.startsWith('<small>') && token.endsWith('</small>')) {
        const inner = token.slice(7, -8);
        parts.push(
          <span key={keyIdx++} className="text-[0.8em] text-gray-400">
            {renderInlineFormatted(inner)}
          </span>
        );
      } else if ((token.startsWith('*') && token.endsWith('*')) || (token.startsWith('_') && token.endsWith('_'))) {
        parts.push(
          <em key={keyIdx++} className="italic text-purple-200">
            {renderInlineFormatted(token.slice(1, -1))}
          </em>
        );
      } else {
        parts.push(token);
      }

      lastIndex = match.index + token.length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  // Process text line by line
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockBuffer: string[] = [];
  let codeBlockLang = '';
  let codeBlockIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        const codeText = codeBlockBuffer.join('\n');
        const currentIndex = codeBlockIdx++;
        elements.push(
          <div key={`code_${i}`} className="my-3 rounded-2xl overflow-hidden border border-white/10 bg-[#070913] shadow-lg">
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10 text-xs text-gray-400 font-mono">
              <span>{codeBlockLang || 'código'}</span>
              <button
                type="button"
                onClick={() => handleCopyCode(codeText, currentIndex)}
                className="flex items-center gap-1 hover:text-white transition-colors"
                title="Copiar código"
              >
                {copiedCodeIndex === currentIndex ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 text-[10px]">Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span className="text-[10px]">Copiar</span>
                  </>
                )}
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-xs font-mono text-purple-200 leading-relaxed">
              <code>{codeText}</code>
            </pre>
          </div>
        );
        codeBlockBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockBuffer.push(line);
      continue;
    }

    if (line.trim() === '---' || line.trim() === '***') {
      elements.push(<hr key={`hr_${i}`} className="my-4 border-white/10" />);
      continue;
    }

    const leadingWhitespaceMatch = line.match(/^([ \t]+)/);
    let indentLevel = 0;
    if (leadingWhitespaceMatch) {
      const whitespace = leadingWhitespaceMatch[1];
      const spacesCount = whitespace.replace(/\t/g, '    ').length;
      indentLevel = Math.min(Math.floor(spacesCount / 4) || 1, 6);
    }

    const trimmedLine = line.trim();

    if (!trimmedLine) {
      elements.push(<div key={`empty_${i}`} className="h-2" />);
      continue;
    }

    if (trimmedLine.startsWith('# ')) {
      elements.push(
        <h1 key={`h1_${i}`} className="text-xl md:text-2xl font-black text-purple-300 mt-4 mb-2 pb-1 border-b border-primary/20">
          {renderInlineFormatted(trimmedLine.slice(2))}
        </h1>
      );
      continue;
    }
    if (trimmedLine.startsWith('## ')) {
      elements.push(
        <h2 key={`h2_${i}`} className="text-lg md:text-xl font-extrabold text-accent mt-3 mb-1.5 flex items-center gap-2">
          {renderInlineFormatted(trimmedLine.slice(3))}
        </h2>
      );
      continue;
    }
    if (trimmedLine.startsWith('### ')) {
      elements.push(
        <h3 key={`h3_${i}`} className="text-base font-bold text-primary-light mt-2.5 mb-1">
          {renderInlineFormatted(trimmedLine.slice(4))}
        </h3>
      );
      continue;
    }

    if (trimmedLine.startsWith('> ')) {
      elements.push(
        <blockquote key={`quote_${i}`} className="my-2 pl-4 py-2 bg-gradient-to-r from-purple-950/30 to-transparent border-l-4 border-primary rounded-r-xl text-xs text-gray-200 italic">
          {renderInlineFormatted(trimmedLine.slice(2))}
        </blockquote>
      );
      continue;
    }

    if (trimmedLine.startsWith('- [ ] ') || trimmedLine.startsWith('- [x] ') || trimmedLine.startsWith('- [X] ')) {
      const isChecked = trimmedLine.toLowerCase().startsWith('- [x] ');
      const checkText = trimmedLine.slice(6);
      elements.push(
        <div
          key={`check_${i}`}
          className="flex items-start gap-2.5 my-1 text-xs"
          style={indentLevel > 0 ? { paddingLeft: `${indentLevel * 1.25}rem` } : undefined}
        >
          {isChecked ? (
            <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" />
          )}
          <span className={isChecked ? 'line-through text-gray-400' : 'text-gray-200'}>
            {renderInlineFormatted(checkText)}
          </span>
        </div>
      );
      continue;
    }

    if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
      const listText = trimmedLine.slice(2);
      elements.push(
        <div
          key={`ul_${i}`}
          className="flex items-start gap-2 my-1 text-xs text-gray-200"
          style={indentLevel > 0 ? { paddingLeft: `${(indentLevel + 0.5) * 1.25}rem` } : { paddingLeft: '0.75rem' }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
          <div className="flex-1 leading-relaxed">{renderInlineFormatted(listText)}</div>
        </div>
      );
      continue;
    }

    elements.push(
      <p
        key={`p_${i}`}
        className={`text-xs text-gray-200 leading-relaxed my-1 ${
          indentLevel > 0 ? 'border-l-2 border-primary/25 pl-3 bg-white/[0.01] py-0.5 rounded-r-lg' : ''
        }`}
        style={indentLevel > 0 ? { marginLeft: `${indentLevel * 1}rem` } : undefined}
      >
        {renderInlineFormatted(trimmedLine)}
      </p>
    );
  }

  return <div className={`space-y-1 font-sans selection:bg-primary/40 ${className}`}>{elements}</div>;
};

export default MarkdownRenderer;
