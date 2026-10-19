import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Volume2,
  Trash2,
  CheckCircle2,
  User,
  ArrowRight,
  Cpu,
  Layers,
  ChevronDown
} from 'lucide-react';
import AIService, { AVAILABLE_PROVIDERS } from '../services/AIService';
import StorageService from '../services/StorageService';
import AudioService from '../services/AudioService';
import { AIMessage } from '../types';
import ConfirmModal from '../components/ConfirmModal';

export const AIView: React.FC = () => {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Habla mi gente Jhodacal! 🇵🇪 Soy Jarvis, tu copiloto inteligente de OrgPro PC. Pídeme lo que quieras: crear tareas, registrar cursos, revisar tus exámenes o motivarte pal estudio. ¿Qué hacemos hoy causa?',
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<string>('groq');
  const [providerUsed, setProviderUsed] = useState<string>('groq');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Confirmation States
  const [confirmClearChat, setConfirmClearChat] = useState(false);
  const [confirmDeleteMessageId, setConfirmDeleteMessageId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const loadPref = async () => {
      const prefs = await StorageService.getAIPreferences();
      if (prefs.selectedModel) {
        setSelectedProvider(prefs.selectedModel);
      }
    };
    loadPref();
  }, []);

  const handleSelectProvider = async (pId: string) => {
    setSelectedProvider(pId);
    const prefs = await StorageService.getAIPreferences();
    await StorageService.saveAIPreferences({ ...prefs, selectedModel: pId });
  };

  const handleSend = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    const userMsg: AIMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInput('');
    setLoading(true);

    try {
      const res = await AIService.sendMessage(query, messages, selectedProvider);
      setProviderUsed(res.providerUsed);

      const botMsg: AIMessage = {
        id: `bot_${Date.now()}`,
        role: 'assistant',
        content: res.text,
        timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }),
        actionData: res.actionData
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (e) {
      console.error(e);
      const errMsg: AIMessage = {
        id: `bot_err_${Date.now()}`,
        role: 'assistant',
        content: 'Hubo un error de conexión con la IA causa. Revisa tu internet o la clave en Ajustes.',
        timestamp: new Date().toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmClearChat = () => {
    setMessages([messages[0]]);
    AudioService.playDelete();
    setConfirmClearChat(false);
  };

  const handleConfirmDeleteMessage = () => {
    if (!confirmDeleteMessageId) return;
    setMessages(prev => prev.filter(m => m.id !== confirmDeleteMessageId));
    AudioService.playDelete();
    setConfirmDeleteMessageId(null);
  };

  const suggestions = [
    "¿Qué tareas tengo pendientes hoy?",
    "Crea un hábito: Tomar 2L de agua",
    "Programa tarea urgente: Estudiar para Examen",
    "Dame un consejo para no procrastinar mano",
    "Agrega curso Algoritmos los Lunes y Miércoles de 8 a 10am"
  ];

  const activeProviderObj = AVAILABLE_PROVIDERS.find(p => p.id === selectedProvider) || AVAILABLE_PROVIDERS[0];

  return (
    <div className="p-8 max-w-6xl mx-auto h-[calc(100vh-4rem)] flex flex-col space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-purple-500 to-accent flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white flex items-center gap-2">
              Jarvis Copilot IA
              <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-accent/20 text-accent border border-accent/40 font-mono font-bold">
                {activeProviderObj.name}
              </span>
            </h1>
            <p className="text-xs text-gray-400">Asistente universitario personal en español con jerga peruana y ejecución de comandos</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setConfirmClearChat(true)}
            disabled={messages.length <= 1}
            className="p-2 px-3 rounded-xl text-gray-400 hover:text-rose-400 hover:bg-white/5 disabled:opacity-40 transition-all text-xs flex items-center gap-1.5 border border-white/5 font-bold"
            title="Limpiar chat con confirmación"
          >
            <Trash2 className="w-4 h-4" /> Limpiar Chat
          </button>
        </div>
      </div>

      {/* Provider Selector Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 no-scrollbar">
        <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
          <Cpu className="w-3.5 h-3.5 text-primary-light" /> Modelo:
        </span>
        {AVAILABLE_PROVIDERS.map((p) => {
          const isSelected = selectedProvider === p.id;
          return (
            <button
              key={p.id}
              onClick={() => handleSelectProvider(p.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                isSelected
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary-light shadow-md shadow-primary/20'
                  : 'bg-white/[0.03] text-gray-400 border-white/5 hover:text-white hover:bg-white/[0.08]'
              }`}
              title={p.description}
            >
              <span>{p.badge}</span>
              <span>{p.name.split(' ')[0]}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((m) => {
          const isBot = m.role === 'assistant';
          return (
            <div
              key={m.id}
              className={`flex gap-3.5 group ${isBot ? 'items-start' : 'items-end justify-end'}`}
            >
              {isBot && (
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shrink-0 shadow-md">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}

              <div className={`max-w-[80%] space-y-2 ${isBot ? '' : 'text-right'}`}>
                <div
                  className={`p-4 rounded-2xl text-sm leading-relaxed relative ${
                    isBot
                      ? 'bg-white/[0.06] border border-white/10 text-gray-100 rounded-tl-sm'
                      : 'bg-gradient-to-r from-primary to-primary-dark text-white rounded-br-sm shadow-md shadow-primary/20'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>

                  {/* Action executed pill */}
                  {m.actionData && (
                    <div className="mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-2 text-xs text-emerald-300 font-bold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>¡Acción ejecutada automáticamente y guardada en OrgPro!</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 px-1 text-[10px] text-gray-500 font-mono">
                  <span>{m.timestamp}</span>
                  {isBot && (
                    <button
                      onClick={() => AudioService.speak(m.content)}
                      className="hover:text-white transition-colors"
                      title="Escuchar mensaje"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {m.id !== 'welcome' && (
                    <button
                      onClick={() => setConfirmDeleteMessageId(m.id)}
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-rose-400 transition-all p-0.5"
                      title="Eliminar mensaje"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>

              {!isBot && (
                <div className="w-9 h-9 rounded-2xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
                  <User className="w-4 h-4 text-primary-light" />
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-purple-600/50 flex items-center justify-center animate-pulse">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.05] border border-white/10 text-xs text-gray-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-accent animate-spin" /> Jarvis está procesando con {activeProviderObj.name}...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompts */}
      <div className="flex flex-wrap gap-2 pt-1 shrink-0">
        {suggestions.map((s, idx) => (
          <button
            key={idx}
            onClick={() => handleSend(s)}
            className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 text-[11px] text-gray-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <Sparkles className="w-3 h-3 text-purple-400" /> {s}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="shrink-0 pt-2">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="relative flex items-center"
        >
          <input
            type="text"
            placeholder={`Escríbele a Jarvis con ${activeProviderObj.name} (ej: 'Crea una tarea para mañana a las 3pm', 'Ayúdame con Álgebra')...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            className="w-full bg-white/[0.06] border border-white/15 rounded-2xl px-5 py-3.5 pr-14 text-sm text-white focus:outline-none focus:border-primary placeholder:text-gray-500 shadow-xl"
          />

          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="absolute right-2 p-2.5 rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-md shadow-primary/30 hover:brightness-110 disabled:opacity-40 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={confirmClearChat}
        title="¿Limpiar historial de conversación?"
        description="¿Estás seguro de que deseas borrar todos los mensajes de esta sesión con Jarvis?"
        confirmLabel="Sí, limpiar chat"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmClearChat}
        onCancel={() => setConfirmClearChat(false)}
      />

      <ConfirmModal
        isOpen={Boolean(confirmDeleteMessageId)}
        title="¿Eliminar este mensaje?"
        description="¿Deseas remover este mensaje individual del historial?"
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={handleConfirmDeleteMessage}
        onCancel={() => setConfirmDeleteMessageId(null)}
      />
    </div>
  );
};

export default AIView;
