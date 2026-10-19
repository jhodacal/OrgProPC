import StorageService from './StorageService';
import { AIMessage, AIPreferences } from '../types';

export interface AIProviderInfo {
  id: string;
  name: string;
  badge: string;
  description: string;
  model: string;
}

export const AVAILABLE_PROVIDERS: AIProviderInfo[] = [
  { id: 'groq', name: 'Groq (Llama 3.3 70B)', badge: '🪐 Ultrarrápido', description: 'Inferencia a 300+ tok/s con Llama 3.3 70B', model: 'llama-3.3-70b-versatile' },
  { id: 'gemini', name: 'Google Gemini', badge: '⚡ 2.5 Flash', description: 'Google Gemini 2.5 Flash / 1.5 Pro', model: 'gemini-2.5-flash' },
  { id: 'github-gpt', name: 'GitHub Models (GPT-4o)', badge: '🧠 OpenAI', description: 'OpenAI GPT-4o y GPT-4o-mini con tu token GitHub', model: 'gpt-4o' },
  { id: 'openrouter', name: 'OpenRouter (Claude / DeepSeek)', badge: '🚀 Universal', description: 'Acceso a Claude 3.5 Sonnet, DeepSeek R1 y más', model: 'anthropic/claude-3.5-sonnet' },
  { id: 'cohere', name: 'Cohere (Command R+)', badge: '✍️ RAG & Razonamiento', description: 'Command R+ para síntesis académica', model: 'command-r-plus' },
  { id: 'mistral', name: 'Mistral AI', badge: '🇫🇷 Mistral Large', description: 'Mistral Large y Codestral', model: 'mistral-large-latest' },
  { id: 'cerebras', name: 'Cerebras', badge: '⚡ CS-3 Wafer', description: 'Llama 3.3 70B a velocidad extrema', model: 'llama-3.3-70b' },
  { id: 'nvidia', name: 'Nvidia NIM', badge: '🟢 GPU Cloud', description: 'Llama 3.1 70B & DeepSeek R1 NIM', model: 'meta/llama-3.1-70b-instruct' },
  { id: 'cloudflare', name: 'Cloudflare Workers AI', badge: '☁️ Edge AI', description: 'Llama 3 ejecutado en el Edge de Cloudflare', model: '@cf/meta/llama-3-8b-instruct' },
];

class AIService {
  private defaultGroqKey = (import.meta as any).env?.VITE_GROQ_API_KEY || "";
  private defaultGeminiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || "";
  private defaultGithubKey = (import.meta as any).env?.VITE_GITHUB_API_KEY || "";

  private getSystemPrompt(contextData: string): string {
    return `Eres un Asistente de Estudio Universitario experto, motivador y altamente organizado, y el copiloto personal de Jhodacal en su aplicación OrgPro PC.
Tu objetivo es ayudar al estudiante en su organización, tareas, materias, exámenes y hábitos.

REGLAS ESENCIALES DE PERSONALIDAD Y TONO:
- OBLIGATORIO: Háblale con mucha buena onda usando jerga peruana casual ("mano", "causa", "batería", "pe", "choche", "gentita", "pata", "jhoda").
- PROHIBIDO: Nunca uses modismos ni jerga mexicana (no digas "wey", "onda", "vientos", "chavos", "caña").
- El nombre del usuario es SIEMPRE "Jhodacal". NUNCA lo llames con otro nombre.
- Sé conciso, amigable, usa emojis y viñetas.

COMANDOS Y ACCIONES AUTOMÁTICAS:
Cuando el usuario te pida CREAR, MODIFICAR, ELIMINAR o agendar actividades, después de tu mensaje conversacional en español pon en una línea separada sin bloques de código markdown este formato exacto:
{"action": "TIPO_DE_ACCION", "data": { ...campos }}

Acciones válidas:
- CREATE_TASK: { title, priority ("urgent"|"high"|"medium"|"low"), estimatedMinutes, hasTime, timeHour, timeMin }
- CREATE_HABIT: { title, category, priority }
- CREATE_UNIVERSITY_TASK: { title, courseName, type ("task"|"exam"|"project"|"lab"), dueDate, priority }
- CREATE_COURSE_WITH_SCHEDULE: { name, color, teacher, classroom, days (["Lun", "Mie"]), startTime ("08:00"), endTime ("10:00") }
- BATCH_ACTIONS: { actions: [ { action: "CREATE_TASK", data: {...} }, { action: "CREATE_HABIT", data: {...} } ] }

CONTEXTO ACTUAL EN TIEMPO REAL:
${contextData}`;
  }

  async sendMessage(
    userText: string,
    chatHistory: AIMessage[] = [],
    forcedProvider?: string
  ): Promise<{ text: string; actionData?: any; providerUsed: string }> {
    const [tasks, habits, uni, courses, stats, prefs] = await Promise.all([
      StorageService.getDailyTasks(),
      StorageService.getHabits(),
      StorageService.getUniversityTasks(),
      StorageService.getCourses(),
      StorageService.getRPGStats(),
      StorageService.getAIPreferences()
    ]);

    const activeProvider = forcedProvider || prefs.selectedModel || 'groq';

    const contextSummary = `
- Jhodacal RPG: Nivel ${stats.level} | XP: ${stats.xp}/${stats.nextLevelXp} | Monedas: ${stats.coins} | Racha: ${stats.streak} días
- Tareas Diarias pendientes: ${tasks.filter(t => !(t.completedDates || []).includes(new Date().toDateString())).map(t => t.title).join(', ') || 'Ninguna'}
- Hábitos activos: ${habits.map(h => `${h.title} (racha: ${h.streak})`).join(', ') || 'Ninguno'}
- Cursos matriculados: ${courses.map(c => `${c.name} (${c.code || 'Sin código'})`).join(', ') || 'Ninguno'}
- Entregables universitarios: ${uni.filter(u => !u.completed).map(u => `${u.title} [${u.type}] (${u.courseName || 'General'})`).join(', ') || 'Ninguno'}
    `;

    const systemPrompt = this.getSystemPrompt(contextSummary);

    // Call provider with fallback cascade
    const providersToTry = [activeProvider, 'groq', 'gemini', 'github-gpt', 'openrouter'].filter((v, i, a) => a.indexOf(v) === i);

    for (const provider of providersToTry) {
      try {
        const result = await this.callProvider(provider, userText, chatHistory, systemPrompt, prefs);
        if (result && result.text) {
          // Parse JSON action
          let actionData: any = null;
          let cleanText = result.text;
          const jsonMatch = result.text.match(/\{[\s\S]*"action"[\s\S]*\}/);
          if (jsonMatch) {
            try {
              actionData = JSON.parse(jsonMatch[0]);
              cleanText = result.text.replace(jsonMatch[0], '').trim();
              await this.executeAction(actionData);
            } catch (_) {}
          }
          return { text: cleanText, actionData, providerUsed: provider };
        }
      } catch (err) {
        console.warn(`Provider ${provider} failed, trying next...`, err);
      }
    }

    return {
      text: `¡Habla mi causa Jhodacal! Hubo un problema momentáneo con las APIs de IA, pero tus tareas y hábitos están guardados localmente al 100% y se sincronizan apenas haya conexión. 🚀`,
      providerUsed: 'offline-fallback'
    };
  }

  private async callProvider(
    provider: string,
    userText: string,
    history: AIMessage[],
    systemPrompt: string,
    prefs: AIPreferences
  ): Promise<{ text: string }> {
    const messages = [
      { role: "system", content: systemPrompt },
      ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
      { role: "user", content: userText }
    ];

    // 1. GROQ
    if (provider === 'groq') {
      const apiKey = prefs.groqApiKey || prefs.groqApiKey2 || prefs.grokApiKey || this.defaultGroqKey;
      const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages,
          temperature: 0.7,
          max_tokens: 900
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Groq error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    // 2. GEMINI
    if (provider === 'gemini') {
      const apiKey = prefs.geminiApiKey || prefs.geminiApiKey2 || this.defaultGeminiKey;
      const geminiPrompt = `${systemPrompt}\n\nHistorial:\n${history.slice(-4).map(h => `${h.role}: ${h.content}`).join('\n')}\n\nUsuario: ${userText}`;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: geminiPrompt }] }]
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Gemini error ${res.status}`);
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return { text };
    }

    // 3. GITHUB MODELS (GPT-4o)
    if (provider === 'github-gpt' || provider === 'github') {
      const apiKey = prefs.githubApiKey || prefs.githubApiKey2 || prefs.githubGptApiKey || this.defaultGithubKey;
      const res = await fetch("https://models.inference.ai.azure.com/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages,
          temperature: 0.7,
          max_tokens: 900
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`GitHub Models error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    // 4. OPENROUTER
    if (provider === 'openrouter') {
      const apiKey = prefs.openrouterApiKey || prefs.openrouterApiKey2;
      if (!apiKey) throw new Error('OpenRouter API Key no configurada');
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          "HTTP-Referer": "https://orgpro.jhodacal.com",
          "X-Title": "OrgPro PC"
        },
        body: JSON.stringify({
          model: "anthropic/claude-3.5-sonnet",
          messages,
          temperature: 0.7,
          max_tokens: 900
        }),
        signal: AbortSignal.timeout(12000)
      });
      if (!res.ok) throw new Error(`OpenRouter error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    // 5. COHERE
    if (provider === 'cohere') {
      const apiKey = prefs.cohereApiKey || prefs.cohereApiKey2;
      if (!apiKey) throw new Error('Cohere API Key no configurada');
      const res = await fetch("https://api.cohere.com/v2/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "command-r-plus-08-2024",
          messages
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Cohere error ${res.status}`);
      const data = await res.json();
      return { text: data.message?.content?.[0]?.text || '' };
    }

    // 6. MISTRAL
    if (provider === 'mistral') {
      const apiKey = prefs.mistralApiKey;
      if (!apiKey) throw new Error('Mistral API Key no configurada');
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "mistral-large-latest",
          messages
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Mistral error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    // 7. CEREBRAS
    if (provider === 'cerebras') {
      const apiKey = prefs.cerebrasApiKey;
      if (!apiKey) throw new Error('Cerebras API Key no configurada');
      const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "llama3.3-70b",
          messages
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Cerebras error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    // 8. NVIDIA
    if (provider === 'nvidia') {
      const apiKey = prefs.nvidiaApiKey;
      if (!apiKey) throw new Error('Nvidia API Key no configurada');
      const res = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "meta/llama-3.1-70b-instruct",
          messages,
          temperature: 0.7,
          max_tokens: 900
        }),
        signal: AbortSignal.timeout(10000)
      });
      if (!res.ok) throw new Error(`Nvidia error ${res.status}`);
      const data = await res.json();
      return { text: data.choices?.[0]?.message?.content || '' };
    }

    throw new Error(`Provider ${provider} no soportado o sin credenciales`);
  }

  public async executeAction(action: { action: string; data: any }) {
    if (!action) return;

    if (action.action === 'BATCH_ACTIONS' && Array.isArray(action.data?.actions)) {
      for (const act of action.data.actions) {
        await this.executeAction(act);
      }
      return;
    }

    if (!action.data) return;

    if (action.action === 'CREATE_TASK') {
      await StorageService.saveDailyTask({
        title: action.data.title || 'Nueva actividad',
        priority: action.data.priority || 'medium',
        rarity: action.data.rarity || 'common',
        estimatedMinutes: action.data.estimatedMinutes || 30,
        hasTime: action.data.hasTime || Boolean(action.data.timeHour !== undefined),
        timeHour: action.data.timeHour ?? 12,
        timeMin: action.data.timeMin ?? 0,
      });
    } else if (action.action === 'CREATE_HABIT') {
      await StorageService.saveHabit({
        title: action.data.title || 'Nuevo hábito',
        category: action.data.category || 'General',
        priority: action.data.priority || 'medium',
      });
    } else if (action.action === 'CREATE_UNIVERSITY_TASK') {
      await StorageService.saveUniversityTask({
        title: action.data.title || 'Entregable universitario',
        courseId: action.data.courseId || 'general',
        courseName: action.data.courseName || 'General',
        type: action.data.type || 'task',
        priority: action.data.priority || 'medium',
        dueDate: action.data.dueDate || new Date().toISOString().split('T')[0],
      });
    } else if (action.action === 'CREATE_COURSE_WITH_SCHEDULE') {
      const course = await StorageService.saveCourse({
        name: action.data.name || 'Nuevo Curso',
        code: action.data.code || '',
        color: action.data.color || '#3B82F6',
        professor: action.data.teacher || action.data.professor || '',
        classroom: action.data.classroom || '',
      });
      if (action.data.days && action.data.startTime) {
        await StorageService.saveScheduleBlock({
          courseId: course.id,
          courseName: course.name,
          color: course.color,
          classroom: course.classroom,
          professor: course.professor,
          schedules: [{
            days: Array.isArray(action.data.days) ? action.data.days : [action.data.days],
            startTime: action.data.startTime || '08:00',
            endTime: action.data.endTime || '10:00',
            classroom: course.classroom,
            location: action.data.location || ''
          }]
        });
      }
    }
  }

  /**
   * Genera un resumen ejecutivo de un material de estudio (PDF / Texto / Notas)
   */
  async summarizeMaterial(
    title: string,
    content: string,
    courseName: string,
    unitTitle: string,
    weekNumber: number,
    provider?: string
  ): Promise<string> {
    const prompt = `Actúa como un profesor universitario experto. Genera un resumen estructurado, claro y accionable para este material de estudio en español.
Curso: ${courseName}
Unidad: ${unitTitle} - Semana ${weekNumber}
Documento: ${title}

Contenido del documento/notas:
${content || "Basado en el tema y título del material."}

Estructura de respuesta recomendada:
📌 **Idea Central & Objetivo**
🔑 **Puntos Clave & Conceptos Fundamentales**
💡 **Ejemplos / Fórmulas Importantes**
🎯 **Conclusión & Preguntas de Examen Probables**`;

    const res = await this.sendMessage(prompt, [], provider);
    return res.text;
  }

  /**
   * Genera tarjetas de estudio Flashcards (Pregunta - Respuesta) a partir de un texto o documento
   */
  async generateFlashcards(
    title: string,
    content: string,
    courseName: string,
    provider?: string
  ): Promise<Array<{ question: string; answer: string }>> {
    const prompt = `Actúa como un preparador de exámenes universitarios. Genera 5 tarjetas de estudio (flashcards) clave para repasar el siguiente material.
Curso: ${courseName}
Título: ${title}
Contenido: ${content || title}

Responde ÚNICAMENTE en formato JSON con este esquema exacto, sin bloques markdown ni texto adicional:
[
  { "question": "¿Pregunta clave 1?", "answer": "Respuesta concisa y clara." },
  { "question": "¿Pregunta clave 2?", "answer": "Respuesta concisa y clara." }
]`;

    const res = await this.sendMessage(prompt, [], provider);
    try {
      const jsonMatch = res.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (_) {}
    return [
      { question: `¿Cuál es el concepto principal de ${title}?`, answer: "Revisa las notas detalladas de la semana para dominar este concepto clave." },
      { question: `¿Cómo se aplica ${title} en ${courseName}?`, answer: "Se utiliza como base para la resolución de ejercicios y proyectos del curso." }
    ];
  }

  /**
   * Genera un examen interactivo de autoevaluación (5 preguntas de opción múltiple)
   */
  async generateEvaluationExam(
    courseName: string,
    unitTitle: string,
    materialsSummary: string,
    provider?: string
  ): Promise<Array<{ question: string; options: string[]; correctAnswer: string; justification: string }>> {
    const prompt = `Actúa como un profesor universitario estricto pero pedagógico. Genera un examen de autoevaluación de 5 preguntas de opción múltiple sobre esta unidad académica.
Curso: ${courseName}
Unidad: ${unitTitle}
Materiales y temas cubiertos: ${materialsSummary || "Temario general de la unidad"}

Responde ÚNICAMENTE en formato JSON con la siguiente estructura de array de objetos, sin markdown ni explicaciones adicionales:
[
  {
    "question": "¿Enunciado de la pregunta 1?",
    "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
    "correctAnswer": "Opción A",
    "justification": "Explicación breve de por qué es la respuesta correcta."
  }
]`;

    const res = await this.sendMessage(prompt, [], provider);
    try {
      const jsonMatch = res.text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (_) {}
    return [
      {
        question: `¿Cuál es el objetivo principal de la unidad ${unitTitle} en ${courseName}?`,
        options: ["Comprender los fundamentos y aplicarlos en la práctica", "Memorizar únicamente definiciones", "Omitir la teoría", "Ninguna de las anteriores"],
        correctAnswer: "Comprender los fundamentos y aplicarlos en la práctica",
        justification: "El dominio universitario requiere comprensión conceptual y aplicación práctica."
      }
    ];
  }
}

export default new AIService();
