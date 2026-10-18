import {
  DailyTask,
  Habit,
  UniversityTask,
  Course,
  ScheduleBlock,
  RPGStats,
  RPGCosmetics,
  RPGRecord,
  RPGInventory,
  Achievement,
  ShopItem,
  AppSettings,
  WeatherConfig,
  BedtimeSettings,
  AIPreferences,
  AIMessage,
  Semester,
  UniversityUnit,
  CustomReward
} from '../types';
import AudioService from './AudioService';
import { ensureCompleteCourseWeeks } from '../utils/academicWeekUtils';

export const STORAGE_KEYS = {
  DAILY_TASKS: 'life_study_daily_tasks.json',
  UNIVERSITY_TASKS: 'life_study_university_tasks.json',
  HABITS: 'life_study_habits.json',
  ROUTINES: 'life_study_routines.json',
  FILES: 'life_study_files.json',
  NOTES: 'life_study_notes.json',
  RECORDINGS: 'life_study_recordings.json',
  SETTINGS: 'life_study_settings.json',
  STATS: 'life_study_stats.json',
  COURSES: 'life_study_courses.json',
  SEMESTERS: 'life_study_semesters.json',
  SCHEDULE: '@life_study_schedule',
  SCHEDULE_IMAGE: '@life_study_schedule_image',
  TASK_TYPES_CONFIG: '@life_study_task_types_config',
  UNIVERSITY_UNITS_PROGRESS: 'life_study_university_units_progress.json',
  DOCUMENT_AI_CACHE: 'life_study_document_ai_cache.json',
  AUDIT_LOGS: 'life_study_audit_logs.json',
  AI_PREFERENCES: 'life_study_ai_preferences.json',
  AI_MESSAGES: 'life_study_ai_messages.json',
  BEDTIME: 'life_study_bedtime.json',
  WEATHER_CONFIG: 'life_study_weather_config.json',
  RPG_STATS: 'life_study_rpg_stats.json',
  RPG_ACHIEVEMENTS: 'life_study_rpg_achievements.json',
  RPG_RECORDS: 'life_study_rpg_records.json',
  RPG_COSMETICS: 'life_study_rpg_cosmetics.json',
  RPG_INVENTORY: 'life_study_rpg_inventory.json',
  CUSTOM_REWARDS: 'life_study_custom_rewards.json',
  TASK_RARITY_CONFIG: 'life_study_task_rarity_config.json',
  PROACTIVE_COACH_STATE: 'proactive_coach_state.json',
  WISHLIST: 'life_study_wishlist.json',
  SHOPPING_LIST: 'life_study_shopping_list.json',
  EMAILS: 'life_study_emails.json',
  LOCATION_HISTORY: 'life_study_location_history.json',
  LOCATION_SETTINGS: 'life_study_location_settings.json',
  RAG_AUDIT_LOGS: 'life_study_rag_audit_logs.json',
  SLEEP_HISTORY: 'life_study_sleep_history.json',
  MARKET_ATTENDANCE: 'life_study_market_attendance.json',
  DELETED_ENTITIES: 'life_study_deleted_entities.json',
  OFFLINE_QUEUE: 'life_study_offline_sync_queue',
  UNAJ_CREDENTIALS: 'life_study_unaj_credentials.json',
};

export const isItemCompleted = (item: any, targetDate = new Date()): boolean => {
  if (!item) return false;
  if (item.completed === true) return true;
  const dates = Array.isArray(item.completedDates) ? item.completedDates : [];
  if (dates.length === 0) return false;
  const dStr = targetDate.toDateString();
  const isoStr = targetDate.toISOString().split('T')[0];
  const locStr = targetDate.toLocaleDateString();
  return dates.some((d: string) => d === dStr || d === isoStr || d === locStr);
};

export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  { id: "started_habit", title: "Iniciado", description: "Cumplir el mismo hábito durante 3 días consecutivos", progress: 0, maxProgress: 3, unlocked: false, xpReward: 50, icon: "flame" },
  { id: "master_habit", title: "Maestro", description: "Cumplir el mismo hábito durante 30 días consecutivos", progress: 0, maxProgress: 30, unlocked: false, xpReward: 500, icon: "trophy" },
  { id: "task_slayer", title: "Cazador de Tareas", description: "Completar 10 tareas diarias o universitarias", progress: 0, maxProgress: 10, unlocked: false, xpReward: 100, icon: "check-circle" },
  { id: "legendary_slayer", title: "Héroe Legendario", description: "Completar una tarea de rareza Legendaria", progress: 0, maxProgress: 1, unlocked: false, xpReward: 200, icon: "sparkles" },
  { id: "early_bird", title: "Madrugador", description: "Despertarse a tiempo 3 veces", progress: 0, maxProgress: 3, unlocked: false, xpReward: 100, icon: "sun" },
  { id: "shopper", title: "Comprador Frecuente", description: "Comprar tu primer ítem en la tienda RPG", progress: 0, maxProgress: 1, unlocked: false, xpReward: 50, icon: "shopping-cart" },
  { id: "first_step", title: "Primer Paso", description: "Completa tu primera tarea diaria", progress: 0, maxProgress: 1, unlocked: false, xpReward: 25, icon: "footprints" },
  { id: "habit_streak_5", title: "Constancia de Bronce", description: "Consigue una racha de 5 días en cualquier hábito", progress: 0, maxProgress: 5, unlocked: false, xpReward: 80, icon: "trending-up" },
  { id: "habit_streak_15", title: "Constancia de Plata", description: "Consigue una racha de 15 días en cualquier hábito", progress: 0, maxProgress: 15, unlocked: false, xpReward: 250, icon: "activity" },
  { id: "task_machine", title: "Máquina de Tareas", description: "Completar 50 tareas diarias o universitarias", progress: 0, maxProgress: 50, unlocked: false, xpReward: 300, icon: "zap" },
  { id: "level_10", title: "Ascenso Rápido", description: "Alcanza el nivel 10", progress: 0, maxProgress: 10, unlocked: false, xpReward: 100, icon: "arrow-up-circle" },
  { id: "level_20", title: "Veterano del Deber", description: "Alcanza el nivel 20", progress: 0, maxProgress: 20, unlocked: false, xpReward: 200, icon: "shield" },
  { id: "level_50", title: "Gran Conquistador", description: "Alcanza el nivel 50", progress: 0, maxProgress: 50, unlocked: false, xpReward: 500, icon: "award" },
  { id: "gold_gatherer", title: "Avaricia Sana", description: "Acumula 1000 monedas RPG en tu saldo", progress: 0, maxProgress: 1000, unlocked: false, xpReward: 150, icon: "coins" },
  { id: "exam_crusher", title: "Destructor de Exámenes", description: "Completa tu primer examen universitario", progress: 0, maxProgress: 1, unlocked: false, xpReward: 100, icon: "book-open" },
  { id: "uni_conqueror", title: "Académico Consagrado", description: "Completa 5 tareas o exámenes universitarios", progress: 0, maxProgress: 5, unlocked: false, xpReward: 200, icon: "graduation-cap" },
  { id: "focus_novice", title: "Aprendiz de Enfoque", description: "Realiza tu primera sesión de enfoque (Focus Timer)", progress: 0, maxProgress: 1, unlocked: false, xpReward: 50, icon: "clock" },
  { id: "focus_master", title: "Monje de la Concentración", description: "Completa 15 sesiones de enfoque", progress: 0, maxProgress: 15, unlocked: false, xpReward: 450, icon: "target" },
];

export const SHOP_ITEMS: ShopItem[] = [
  { id: "focus_blocker", title: "Bloqueador de Enfoque", description: "Impide el acceso a distracciones externas durante sesiones de enfoque.", cost: 150, icon: "lock", type: "consumable" },
  { id: "notif_silencer", title: "Silenciador de Notificaciones", description: "Silencia las notificaciones no esenciales por 24 horas.", cost: 200, icon: "bell-off", type: "consumable" },
  { id: "xp_booster", title: "Potenciador de XP Doble", description: "Gana el doble de XP por todas las tareas durante 48 horas.", cost: 300, icon: "zap", type: "consumable", multiplier: 2 },
  { id: "sword_wood", title: "Espada de Madera", description: "Una espada simple tallada a mano. Otorga +5% XP extra.", cost: 100, icon: "sword", type: "sword", multiplier: 0.05 },
  { id: "sword_steel", title: "Espada de Acero", description: "Forjada con acero templado de alta calidad. Otorga +10% XP extra.", cost: 250, icon: "sword", type: "sword", multiplier: 0.10 },
  { id: "sword_epic", title: "Sable de Luz Rúnico", description: "Arma mística imbuida de energía cósmica. Otorga +15% XP extra.", cost: 500, icon: "sword", type: "sword", multiplier: 0.15 },
  { id: "shield_wood", title: "Escudo de Madera", description: "Un escudo ligero de roble. Otorga +5% XP extra.", cost: 100, icon: "shield", type: "shield", multiplier: 0.05 },
  { id: "shield_steel", title: "Escudo de Hierro", description: "Protección sólida contra la procrastinación. Otorga +10% XP extra.", cost: 250, icon: "shield", type: "shield", multiplier: 0.10 },
  { id: "shield_epic", title: "Aegis de Plasma", description: "Generador de escudo de plasma. Otorga +15% XP extra.", cost: 500, icon: "shield", type: "shield", multiplier: 0.15 },
  { id: "helmet_cap", title: "Sombrero de Viajero", description: "Te protege en tu camino. Otorga +5% XP extra.", cost: 100, icon: "crown", type: "helmet", multiplier: 0.05 },
  { id: "helmet_iron", title: "Casco de Hierro", description: "Un casco de soldado resistente. Otorga +10% XP extra.", cost: 250, icon: "crown", type: "helmet", multiplier: 0.10 },
  { id: "helmet_epic", title: "Corona Rúnica de Sabiduría", description: "Canaliza tu enfoque mental al máximo. Otorga +15% XP extra.", cost: 500, icon: "crown", type: "helmet", multiplier: 0.15 },
];

export const AVATARS = ["Novato", "Guerrero", "Mago", "Cyberpunk", "Héroe", "Titán"];

declare global {
  interface Window {
    electronAPI?: {
      storageGet: (key: string) => Promise<any>;
      storageSet: (key: string, data: any) => Promise<boolean>;
      storageGetAll: () => Promise<Record<string, any>>;
      notify: (title: string, body: string) => Promise<boolean>;
      onRemoteUpdated: (callback: (data: any) => void) => () => void;
    };
  }
}

type Listener = (data?: any) => void;

class StorageService {
  private cache: Map<string, any> = new Map();
  private listeners: Map<string, Set<Listener>> = new Map();
  private isInitialized = false;

  constructor() {
    this.init();
  }

  async init() {
    if (this.isInitialized) return;
    
    // Listen for remote updates via Electron Sync Bridge
    if (typeof window !== 'undefined' && window.electronAPI) {
      window.electronAPI.onRemoteUpdated((payload) => {
        console.log('🔄 Remote Sync Event received:', payload);
        this.cache.clear();
        this.emit('DATA_UPDATED');
        this.emit('RPG_STATS_UPDATED');
      });
    }

    this.isInitialized = true;
  }

  on(event: string, listener: Listener) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => {
      this.listeners.get(event)?.delete(listener);
    };
  }

  emit(event: string, data?: any) {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(data); } catch (e) { console.error('Listener error:', e); }
    });
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T;
    }

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        const data = await window.electronAPI.storageGet(key);
        if (data !== null && data !== undefined) {
          this.cache.set(key, data);
          return data as T;
        }
      }

      if (typeof localStorage !== 'undefined') {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          this.cache.set(key, parsed);
          return parsed as T;
        }
      }
    } catch (err) {
      console.error(`Error reading storage key ${key}:`, err);
    }
    return null;
  }

  async save<T>(key: string, data: T): Promise<boolean> {
    this.cache.set(key, data);

    try {
      if (typeof window !== 'undefined' && window.electronAPI) {
        await window.electronAPI.storageSet(key, data);
      }

      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(key, JSON.stringify(data));
      }

      this.emit('DATA_UPDATED', { key, data });
      return true;
    } catch (err) {
      console.error(`Error saving storage key ${key}:`, err);
      return false;
    }
  }

  // ===== RPG STATS =====
  async getRPGStats(): Promise<RPGStats> {
    let stats = await this.get<RPGStats>(STORAGE_KEYS.RPG_STATS);
    if (!stats) {
      stats = {
        level: 1,
        xp: 0,
        nextLevelXp: 100,
        coins: 50,
        totalCompletedTasks: 0,
        totalCompletedHabits: 0,
        streak: 0,
        longestStreak: 0,
        xpBoosterUntil: null
      };
      await this.save(STORAGE_KEYS.RPG_STATS, stats);
    }
    return stats;
  }

  async addXP(amount: number, isTaskComplete = false, taskObj: any = null): Promise<{ stats: RPGStats; leveledUp: boolean }> {
    const stats = await this.getRPGStats();
    let actualAmount = amount;

    // Gear XP Multipliers
    const cosmetics = await this.getRPGCosmetics();
    let gearBonus = 0;
    const checkItemBonus = (id?: string | null) => {
      if (!id) return 0;
      if (id.endsWith('_wood') || id === 'helmet_cap') return 0.05;
      if (id.endsWith('_steel') || id === 'helmet_iron') return 0.10;
      if (id.endsWith('_epic')) return 0.15;
      return 0;
    };
    gearBonus += checkItemBonus(cosmetics.equippedSword);
    gearBonus += checkItemBonus(cosmetics.equippedShield);
    gearBonus += checkItemBonus(cosmetics.equippedHelmet);

    // XP Booster Consumable
    const inv = await this.getRPGInventory();
    if (inv.xpBoosterActiveUntil && new Date(inv.xpBoosterActiveUntil).getTime() > Date.now()) {
      gearBonus += 1.0; // 2x XP
    }

    if (gearBonus > 0) {
      actualAmount = Math.round(actualAmount * (1 + gearBonus));
    }

    stats.xp += actualAmount;
    stats.coins = (stats.coins || 0) + actualAmount;

    // Loot Drop (15% chance)
    if (isTaskComplete && Math.random() < 0.15) {
      this.triggerRandomLootDrop(cosmetics);
    }

    let leveledUp = false;
    const getNextLevelXp = (lvl: number) => Math.round(100 * Math.pow(lvl, 1.3));

    while (stats.xp >= stats.nextLevelXp) {
      stats.xp -= stats.nextLevelXp;
      stats.level += 1;
      stats.nextLevelXp = getNextLevelXp(stats.level);
      leveledUp = true;
    }

    await this.save(STORAGE_KEYS.RPG_STATS, stats);
    this.emit('RPG_STATS_UPDATED', { stats, leveledUp });

    if (leveledUp) {
      AudioService.playLevelUp();
      AudioService.speak(`¡Felicidades jhodacal! Has subido al nivel ${stats.level}.`);
    } else {
      AudioService.playCoin();
    }

    await this.checkAndUnlockAchievements();
    return { stats, leveledUp };
  }

  private async triggerRandomLootDrop(cosmetics: RPGCosmetics) {
    const allGear = [
      "sword_wood", "sword_steel", "sword_epic",
      "shield_wood", "shield_steel", "shield_epic",
      "helmet_cap", "helmet_iron", "helmet_epic"
    ];
    const unlocked = new Set([
      ...(cosmetics.unlockedSwords || []),
      ...(cosmetics.unlockedShields || []),
      ...(cosmetics.unlockedHelmets || [])
    ]);
    const available = allGear.filter(id => !unlocked.has(id));
    if (available.length > 0) {
      const dropId = available[Math.floor(Math.random() * available.length)];
      if (dropId.startsWith('sword_')) cosmetics.unlockedSwords = [...(cosmetics.unlockedSwords || []), dropId];
      if (dropId.startsWith('shield_')) cosmetics.unlockedShields = [...(cosmetics.unlockedShields || []), dropId];
      if (dropId.startsWith('helmet_')) cosmetics.unlockedHelmets = [...(cosmetics.unlockedHelmets || []), dropId];
      await this.save(STORAGE_KEYS.RPG_COSMETICS, cosmetics);
      this.emit('LOOT_DROPPED', dropId);
    }
  }

  // ===== COSMETICS =====
  async getRPGCosmetics(): Promise<RPGCosmetics> {
    let cos = await this.get<RPGCosmetics>(STORAGE_KEYS.RPG_COSMETICS);
    if (!cos) {
      cos = {
        equippedAvatar: "Novato",
        equippedTheme: "Default",
        equippedSword: null,
        equippedShield: null,
        equippedHelmet: null,
        unlockedAvatars: ["Novato", "Guerrero"],
        unlockedThemes: ["Default", "Cyberpunk", "Espacio Profundo"],
        unlockedSwords: [],
        unlockedShields: [],
        unlockedHelmets: [],
      };
      await this.save(STORAGE_KEYS.RPG_COSMETICS, cos);
    }
    return cos;
  }

  async saveRPGCosmetics(cos: RPGCosmetics) {
    await this.save(STORAGE_KEYS.RPG_COSMETICS, cos);
    this.emit('COSMETICS_UPDATED', cos);
  }

  // ===== INVENTORY & SHOP =====
  async getRPGInventory(): Promise<RPGInventory> {
    let inv = await this.get<RPGInventory>(STORAGE_KEYS.RPG_INVENTORY);
    if (!inv) {
      inv = {
        focus_blocker: 0,
        notif_silencer: 0,
        xp_booster: 0,
        xpBoosterActiveUntil: null,
        focusBlockerActiveUntil: null,
        notifSilencerActiveUntil: null
      };
      await this.save(STORAGE_KEYS.RPG_INVENTORY, inv);
    }
    return inv;
  }

  async buyShopItem(item: ShopItem): Promise<{ success: boolean; message: string }> {
    const stats = await this.getRPGStats();
    if (stats.coins < item.cost) {
      return { success: false, message: 'Monedas insuficientes mano.' };
    }

    stats.coins -= item.cost;
    await this.save(STORAGE_KEYS.RPG_STATS, stats);

    const cos = await this.getRPGCosmetics();
    const inv = await this.getRPGInventory();

    if (item.type === 'sword') {
      cos.unlockedSwords = Array.from(new Set([...(cos.unlockedSwords || []), item.id]));
      cos.equippedSword = item.id;
    } else if (item.type === 'shield') {
      cos.unlockedShields = Array.from(new Set([...(cos.unlockedShields || []), item.id]));
      cos.equippedShield = item.id;
    } else if (item.type === 'helmet') {
      cos.unlockedHelmets = Array.from(new Set([...(cos.unlockedHelmets || []), item.id]));
      cos.equippedHelmet = item.id;
    } else if (item.type === 'consumable') {
      if (item.id === 'xp_booster') {
        inv.xp_booster += 1;
        inv.xpBoosterActiveUntil = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
      } else if (item.id === 'focus_blocker') {
        inv.focus_blocker += 1;
      } else if (item.id === 'notif_silencer') {
        inv.notif_silencer += 1;
      }
    }

    await this.save(STORAGE_KEYS.RPG_COSMETICS, cos);
    await this.save(STORAGE_KEYS.RPG_INVENTORY, inv);
    this.emit('RPG_STATS_UPDATED', { stats });
    this.emit('COSMETICS_UPDATED', cos);

    await this.incrementAchievementProgress('shopper', 1);
    AudioService.playCoin();
    return { success: true, message: `¡Compraste ${item.title} con éxito!` };
  }

  // ===== CUSTOM REWARDS (CRUD) =====
  async getCustomRewards(): Promise<CustomReward[]> {
    return (await this.get<CustomReward[]>(STORAGE_KEYS.CUSTOM_REWARDS)) || [
      {
        id: 'reward_game_1h',
        title: '1 Hora de Videojuegos / Gaming',
        description: 'Premio por cumplir tus tareas del día.',
        cost: 60,
        category: 'Ocio',
        timesClaimed: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'reward_snack',
        title: 'Snack / Postre Especial',
        description: 'Disfruta de tu comida o dulce favorito.',
        cost: 100,
        category: 'Comida',
        timesClaimed: 0,
        createdAt: new Date().toISOString()
      },
      {
        id: 'reward_movie',
        title: 'Ver una Película o Serie',
        description: 'Tarde de descanso sin culpa tras un día productivo.',
        cost: 150,
        category: 'Descanso',
        timesClaimed: 0,
        createdAt: new Date().toISOString()
      }
    ];
  }

  async saveCustomReward(reward: Omit<CustomReward, 'id' | 'createdAt' | 'timesClaimed'>): Promise<CustomReward> {
    const list = await this.getCustomRewards();
    const newReward: CustomReward = {
      id: `reward_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      timesClaimed: 0,
      ...reward
    };
    list.unshift(newReward);
    await this.save(STORAGE_KEYS.CUSTOM_REWARDS, list);
    this.emit('DATA_UPDATED');
    return newReward;
  }

  async updateCustomReward(id: string, updates: Partial<CustomReward>): Promise<CustomReward | null> {
    const list = await this.getCustomRewards();
    const index = list.findIndex(r => r.id === id);
    if (index !== -1) {
      list[index] = { ...list[index], ...updates, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.CUSTOM_REWARDS, list);
      this.emit('DATA_UPDATED');
      return list[index];
    }
    return null;
  }

  async deleteCustomReward(id: string): Promise<boolean> {
    const list = await this.getCustomRewards();
    const filtered = list.filter(r => r.id !== id);
    await this.save(STORAGE_KEYS.CUSTOM_REWARDS, filtered);
    this.emit('DATA_UPDATED');
    return true;
  }

  async claimCustomReward(id: string): Promise<{ success: boolean; message: string }> {
    const list = await this.getCustomRewards();
    const index = list.findIndex(r => r.id === id);
    if (index === -1) return { success: false, message: 'Recompensa no encontrada.' };

    const reward = list[index];
    const stats = await this.getRPGStats();
    if (stats.coins < reward.cost) {
      return { success: false, message: `Monedas insuficientes. Necesitas ${reward.cost} monedas de oro.` };
    }

    stats.coins -= reward.cost;
    await this.save(STORAGE_KEYS.RPG_STATS, stats);

    reward.timesClaimed = (reward.timesClaimed || 0) + 1;
    reward.updatedAt = new Date().toISOString();
    await this.save(STORAGE_KEYS.CUSTOM_REWARDS, list);

    this.emit('RPG_STATS_UPDATED', { stats });
    this.emit('DATA_UPDATED');
    AudioService.playCoin();
    return { success: true, message: `¡Reclamaste "${reward.title}"! ¡Disfruta tu recompensa merecida!` };
  }

  // ===== ACHIEVEMENTS =====
  async getAchievements(): Promise<Achievement[]> {
    let list = await this.get<Achievement[]>(STORAGE_KEYS.RPG_ACHIEVEMENTS);
    if (!list || list.length === 0) {
      list = DEFAULT_ACHIEVEMENTS;
      await this.save(STORAGE_KEYS.RPG_ACHIEVEMENTS, list);
    }
    return list;
  }

  async incrementAchievementProgress(achId: string, amount = 1) {
    const list = await this.getAchievements();
    const item = list.find(a => a.id === achId);
    if (item && !item.unlocked) {
      item.progress += amount;
      if (item.progress >= item.maxProgress) {
        item.progress = item.maxProgress;
        item.unlocked = true;
        await this.addXP(item.xpReward);
        if (window.electronAPI) {
          window.electronAPI.notify(`🏆 Logro Desbloqueado: ${item.title}`, item.description);
        }
      }
      await this.save(STORAGE_KEYS.RPG_ACHIEVEMENTS, list);
      this.emit('ACHIEVEMENTS_UPDATED', list);
    }
  }

  async checkAndUnlockAchievements() {
    const [stats, habits, daily, uni] = await Promise.all([
      this.getRPGStats(),
      this.getHabits(),
      this.getDailyTasks(),
      this.getUniversityTasks()
    ]);

    const totalDone = (daily.filter(d => (d.completedDates || []).includes(new Date().toDateString())).length) +
      (uni.filter(u => u.completed).length);

    if (totalDone >= 10) await this.incrementAchievementProgress('task_slayer', 10);
    if (totalDone >= 50) await this.incrementAchievementProgress('task_machine', 50);
    if (stats.level >= 10) await this.incrementAchievementProgress('level_10', 10);
    if (stats.level >= 20) await this.incrementAchievementProgress('level_20', 20);
    if (stats.level >= 50) await this.incrementAchievementProgress('level_50', 50);
    if (stats.coins >= 1000) await this.incrementAchievementProgress('gold_gatherer', 1000);

    const maxHabitStreak = Math.max(0, ...habits.map(h => h.streak || 0));
    if (maxHabitStreak >= 3) await this.incrementAchievementProgress('started_habit', 3);
    if (maxHabitStreak >= 5) await this.incrementAchievementProgress('habit_streak_5', 5);
    if (maxHabitStreak >= 15) await this.incrementAchievementProgress('habit_streak_15', 15);
    if (maxHabitStreak >= 30) await this.incrementAchievementProgress('master_habit', 30);
  }

  // ===== DAILY TASKS =====
  async getDailyTasks(): Promise<DailyTask[]> {
    return (await this.get<DailyTask[]>(STORAGE_KEYS.DAILY_TASKS)) || [];
  }

  async saveDailyTask(task: Omit<DailyTask, 'id' | 'createdAt'>): Promise<DailyTask> {
    const tasks = await this.getDailyTasks();
    const newTask: DailyTask = {
      id: `daily_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      completedDates: [],
      completed: false,
      streak: 0,
      ...task,
    };
    tasks.unshift(newTask);
    await this.save(STORAGE_KEYS.DAILY_TASKS, tasks);
    return newTask;
  }

  async updateDailyTask(id: string, updates: Partial<DailyTask>): Promise<DailyTask | null> {
    const tasks = await this.getDailyTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.DAILY_TASKS, tasks);
      return tasks[index];
    }
    return null;
  }

  async toggleDailyTaskCompletion(id: string, targetDate = new Date()): Promise<{ task: DailyTask; isCompleted: boolean } | null> {
    const tasks = await this.getDailyTasks();
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
      const task = tasks[index];
      const dates = Array.isArray(task.completedDates) ? task.completedDates : [];
      const dStr = targetDate.toDateString();
      const isoStr = targetDate.toISOString().split('T')[0];
      const locStr = targetDate.toLocaleDateString();
      const dateVariants = [dStr, isoStr, locStr];

      const isCompleted = dates.some(d => dateVariants.includes(d)) || task.completed === true;
      let isCompletedNow = false;

      if (isCompleted) {
        task.completedDates = dates.filter(d => !dateVariants.includes(d));
        task.completed = false;
        task.streak = Math.max(0, (task.streak || 1) - 1);
        isCompletedNow = false;
      } else {
        task.completedDates = Array.from(new Set([...dates, dStr, isoStr]));
        task.completed = true;
        task.streak = (task.streak || 0) + 1;
        isCompletedNow = true;

        const stats = await this.getRPGStats();
        stats.totalCompletedTasks = (stats.totalCompletedTasks || 0) + 1;
        await this.save(STORAGE_KEYS.RPG_STATS, stats);

        const xpAmount = task.rarity === 'legendary' ? 200 :
          task.rarity === 'epic' ? 100 :
          task.rarity === 'rare' ? 60 :
          task.rarity === 'uncommon' ? 35 : 20;

        await this.addXP(xpAmount, true, task);
        await this.incrementAchievementProgress('first_step', 1);
        if (task.rarity === 'legendary') {
          await this.incrementAchievementProgress('legendary_slayer', 1);
        }
      }

      tasks[index] = { ...task, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.DAILY_TASKS, tasks);
      return { task: tasks[index], isCompleted: isCompletedNow };
    }
    return null;
  }

  // ===== TOMBSTONING / DELETION TRACKING =====
  async getDeletedEntities(): Promise<Record<string, Record<string, string>>> {
    return (await this.get<Record<string, Record<string, string>>>(STORAGE_KEYS.DELETED_ENTITIES)) || {};
  }

  async trackDeletedEntity(entityType: string, id: string): Promise<void> {
    if (!entityType || !id) return;
    const deleted = await this.getDeletedEntities();
    if (!deleted[entityType]) deleted[entityType] = {};
    deleted[entityType][id] = new Date().toISOString();
    await this.save(STORAGE_KEYS.DELETED_ENTITIES, deleted);
  }

  async removeDeletedEntityTracking(entityType: string, id: string): Promise<void> {
    if (!entityType || !id) return;
    const deleted = await this.getDeletedEntities();
    if (deleted[entityType] && deleted[entityType][id]) {
      delete deleted[entityType][id];
      await this.save(STORAGE_KEYS.DELETED_ENTITIES, deleted);
    }
  }

  async deleteDailyTask(id: string): Promise<boolean> {
    await this.trackDeletedEntity('dailyTasks', id);
    const tasks = await this.getDailyTasks();
    const filtered = tasks.filter(t => String(t.id) !== String(id));
    await this.save(STORAGE_KEYS.DAILY_TASKS, filtered);
    return true;
  }

  // ===== HABITS =====
  async getHabits(): Promise<Habit[]> {
    return (await this.get<Habit[]>(STORAGE_KEYS.HABITS)) || [];
  }

  async saveHabit(habit: Omit<Habit, 'id' | 'createdAt' | 'completedDates' | 'streak'>): Promise<Habit> {
    const habits = await this.getHabits();
    const newHabit: Habit = {
      id: `habit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedDates: [],
      streak: 0,
      ...habit,
    };
    await this.removeDeletedEntityTracking('habits', newHabit.id);
    habits.unshift(newHabit);
    await this.save(STORAGE_KEYS.HABITS, habits);
    return newHabit;
  }

  async toggleHabit(id: string, targetDate = new Date()): Promise<{ habit: Habit; isCompleted: boolean } | null> {
    const habits = await this.getHabits();
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
      const habit = habits[index];
      const dates = Array.isArray(habit.completedDates) ? habit.completedDates : [];
      const dStr = targetDate.toDateString();
      const isoStr = targetDate.toISOString().split('T')[0];
      const locStr = targetDate.toLocaleDateString();
      const dateVariants = [dStr, isoStr, locStr];

      const isCompleted = dates.some(d => dateVariants.includes(d));
      let isCompletedNow = false;

      if (isCompleted) {
        habit.completedDates = dates.filter(d => !dateVariants.includes(d));
        habit.streak = Math.max(0, (habit.streak || 1) - 1);
        isCompletedNow = false;
      } else {
        habit.completedDates = Array.from(new Set([...dates, dStr, isoStr]));
        habit.streak = (habit.streak || 0) + 1;
        isCompletedNow = true;

        const stats = await this.getRPGStats();
        stats.totalCompletedHabits = (stats.totalCompletedHabits || 0) + 1;
        await this.save(STORAGE_KEYS.RPG_STATS, stats);

        await this.addXP(25, true, habit);
      }

      habit.updatedAt = new Date().toISOString();
      await this.save(STORAGE_KEYS.HABITS, habits);
      return { habit: habits[index], isCompleted: isCompletedNow };
    }
    return null;
  }

  async updateHabit(id: string, updates: Partial<Habit>): Promise<Habit | null> {
    const habits = await this.getHabits();
    const index = habits.findIndex(h => h.id === id);
    if (index !== -1) {
      habits[index] = { ...habits[index], ...updates, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.HABITS, habits);
      return habits[index];
    }
    return null;
  }

  async deleteHabit(id: string): Promise<boolean> {
    await this.trackDeletedEntity('habits', id);
    const habits = await this.getHabits();
    const filtered = habits.filter(h => String(h.id) !== String(id));
    await this.save(STORAGE_KEYS.HABITS, filtered);
    return true;
  }

  // ===== SEMESTERS =====
  async getSemesters(): Promise<Semester[]> {
    const list = await this.get<Semester[]>(STORAGE_KEYS.SEMESTERS);
    if (list === null || list === undefined) {
      const defaultSem: Semester = {
        id: 'sem_2026_1',
        name: 'Ciclo 2026-I',
        isCurrent: true,
        createdAt: new Date().toISOString(),
      };
      await this.save(STORAGE_KEYS.SEMESTERS, [defaultSem]);
      return [defaultSem];
    }
    
    // Deduplicación por ID y nombre
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const clean: Semester[] = [];
    let hadDuplicates = false;

    for (const sem of list) {
      if (!sem || !sem.id) {
        hadDuplicates = true;
        continue;
      }
      const idKey = String(sem.id);
      const nameKey = (sem.name || '').trim().toLowerCase();
      if (seenIds.has(idKey) || (nameKey && seenNames.has(nameKey))) {
        hadDuplicates = true;
        continue;
      }
      seenIds.add(idKey);
      if (nameKey) seenNames.add(nameKey);
      clean.push(sem);
    }

    if (hadDuplicates) {
      await this.save(STORAGE_KEYS.SEMESTERS, clean);
    }
    return clean;
  }

  async saveSemesters(semesters: Semester[]): Promise<boolean> {
    if (!Array.isArray(semesters)) return false;
    const seenIds = new Set<string>();
    const seenNames = new Set<string>();
    const clean: Semester[] = [];

    for (const sem of semesters) {
      if (!sem || !sem.id) continue;
      const idKey = String(sem.id);
      const nameKey = (sem.name || '').trim().toLowerCase();
      if (seenIds.has(idKey) || (nameKey && seenNames.has(nameKey))) continue;
      seenIds.add(idKey);
      if (nameKey) seenNames.add(nameKey);
      clean.push(sem);
    }

    const res = await this.save(STORAGE_KEYS.SEMESTERS, clean);
    this.emit('DATA_UPDATED');
    return res;
  }

  async saveSemester(name: string, startDate?: string, endDate?: string): Promise<Semester> {
    const semesters = await this.getSemesters();
    const semName = (name || '').trim() || 'Ciclo Académico';
    const normName = semName.toLowerCase();

    const existingIndex = semesters.findIndex(s => 
      s.name && s.name.trim().toLowerCase() === normName
    );

    if (existingIndex !== -1) {
      semesters[existingIndex] = {
        ...semesters[existingIndex],
        startDate: startDate || semesters[existingIndex].startDate,
        endDate: endDate || semesters[existingIndex].endDate,
      };
      await this.save(STORAGE_KEYS.SEMESTERS, semesters);
      this.emit('DATA_UPDATED');
      return semesters[existingIndex];
    }

    const newSem: Semester = {
      id: `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      name: semName,
      startDate,
      endDate,
      isCurrent: semesters.length === 0,
      createdAt: new Date().toISOString(),
    };
    await this.removeDeletedEntityTracking('semesters', newSem.id);
    semesters.push(newSem);
    await this.save(STORAGE_KEYS.SEMESTERS, semesters);
    this.emit('DATA_UPDATED');
    return newSem;
  }

  async updateSemester(id: string, updates: Partial<Semester>): Promise<Semester | null> {
    const semesters = await this.getSemesters();
    const index = semesters.findIndex(s => s.id === id);
    if (index !== -1) {
      semesters[index] = { ...semesters[index], ...updates };
      await this.save(STORAGE_KEYS.SEMESTERS, semesters);
      this.emit('DATA_UPDATED');
      return semesters[index];
    }
    return null;
  }

  async deleteSemester(id: string): Promise<boolean> {
    const semesters = await this.getSemesters();
    const filtered = semesters.filter(s => String(s.id) !== String(id));
    if (filtered.length > 0 && !filtered.some(s => s.isCurrent)) {
      filtered[0].isCurrent = true;
    }
    await this.save(STORAGE_KEYS.SEMESTERS, filtered);
    await this.trackDeletedEntity('semesters', id);

    // Unlink courses from deleted semester
    const courses = await this.getCourses();
    let coursesModified = false;
    const updatedCourses = courses.map(c => {
      if (String(c.semesterId) === String(id)) {
        coursesModified = true;
        const { semesterId, ...rest } = c;
        return rest as Course;
      }
      return c;
    });
    if (coursesModified) {
      await this.save(STORAGE_KEYS.COURSES, updatedCourses);
    }

    this.emit('DATA_UPDATED');
    return true;
  }

  async setCurrentSemester(id: string): Promise<Semester[]> {
    const semesters = await this.getSemesters();
    const updated = semesters.map(s => ({ ...s, isCurrent: s.id === id }));
    await this.save(STORAGE_KEYS.SEMESTERS, updated);
    return updated;
  }

  // ===== UNIVERSITY UNITS =====
  async getCourseUnitsProgress(): Promise<UniversityUnit[]> {
    const raw = (await this.get<UniversityUnit[]>(STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS)) || [];
    return ensureCompleteCourseWeeks(raw);
  }

  async saveCourseUnitsProgress(units: UniversityUnit[]) {
    const completeUnits = ensureCompleteCourseWeeks(units);
    const stamped = completeUnits.map(u => ({ ...u, updatedAt: new Date().toISOString() }));
    await this.save(STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS, stamped);
  }

  async updateUnit(unitId: string, updates: Partial<UniversityUnit>): Promise<UniversityUnit | null> {
    const units = await this.getCourseUnitsProgress();
    const index = units.findIndex(u => u.id === unitId);
    if (index !== -1) {
      units[index] = { ...units[index], ...updates, updatedAt: new Date().toISOString() };
      await this.saveCourseUnitsProgress(units);
      return units[index];
    }
    return null;
  }

  async deleteCourseUnitProgress(unitId: string): Promise<boolean> {
    await this.trackDeletedEntity('units', unitId);
    const units = await this.getCourseUnitsProgress();
    const filtered = units.filter(u => String(u.id) !== String(unitId));
    await this.saveCourseUnitsProgress(filtered);
    return true;
  }

  async updateUnitWeek(unitId: string, weekNumber: number, updates: Partial<UniversityUnitWeek>): Promise<UniversityUnitWeek | null> {
    const units = await this.getCourseUnitsProgress();
    const unit = units.find(u => String(u.id) === String(unitId));
    if (unit && Array.isArray(unit.weeks)) {
      const weekIndex = unit.weeks.findIndex(w => Number(w.weekNumber) === Number(weekNumber));
      if (weekIndex !== -1) {
        unit.weeks[weekIndex] = {
          ...unit.weeks[weekIndex],
          ...updates
        };
        await this.saveCourseUnitsProgress(units);
        this.emit('DATA_UPDATED');
        return unit.weeks[weekIndex];
      }
    }
    return null;
  }

  // ===== UNIVERSITY =====
  async getCourses(): Promise<Course[]> {
    return (await this.get<Course[]>(STORAGE_KEYS.COURSES)) || [];
  }

  async saveCourse(course: Omit<Course, 'id' | 'createdAt'>): Promise<Course> {
    const courses = await this.getCourses();
    const newCourse: Course = {
      id: `course_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...course,
    };
    await this.removeDeletedEntityTracking('courses', newCourse.id);
    courses.push(newCourse);
    await this.save(STORAGE_KEYS.COURSES, courses);
    return newCourse;
  }

  async updateCourse(id: string, updates: Partial<Course>): Promise<Course | null> {
    const courses = await this.getCourses();
    const index = courses.findIndex(c => String(c.id) === String(id));
    if (index !== -1) {
      courses[index] = { ...courses[index], ...updates, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.COURSES, courses);
      return courses[index];
    }
    return null;
  }

  async deleteCourse(id: string): Promise<boolean> {
    await this.trackDeletedEntity('courses', id);

    // Cascade delete/track associated units
    try {
      const units = await this.getCourseUnitsProgress();
      const remainingUnits = units.filter(u => String(u.courseId) !== String(id));
      const deletedUnits = units.filter(u => String(u.courseId) === String(id));
      if (deletedUnits.length > 0) {
        for (const du of deletedUnits) {
          await this.trackDeletedEntity('units', du.id);
        }
        await this.saveCourseUnitsProgress(remainingUnits);
      }
    } catch (_) {}

    // Cascade delete/track associated university tasks
    try {
      const uniTasks = await this.getUniversityTasks();
      const remainingTasks = uniTasks.filter(t => String(t.courseId) !== String(id));
      const deletedTasks = uniTasks.filter(t => String(t.courseId) === String(id));
      if (deletedTasks.length > 0) {
        for (const dt of deletedTasks) {
          await this.trackDeletedEntity('universityTasks', dt.id);
        }
        await this.save(STORAGE_KEYS.UNIVERSITY_TASKS, remainingTasks);
      }
    } catch (_) {}

    // Cascade delete schedule blocks for this course
    try {
      const schedule = await this.getScheduleBlocks();
      const remainingSchedule = schedule.filter(s => String(s.courseId) !== String(id) && String((s as any).courseName) !== String(id) && String((s as any).title) !== String(id));
      if (remainingSchedule.length !== schedule.length) {
        await this.saveAllScheduleBlocks(remainingSchedule);
      }
    } catch (_) {}

    const courses = await this.getCourses();
    await this.save(STORAGE_KEYS.COURSES, courses.filter(c => String(c.id) !== String(id)));
    return true;
  }

  async getUniversityTasks(): Promise<UniversityTask[]> {
    return (await this.get<UniversityTask[]>(STORAGE_KEYS.UNIVERSITY_TASKS)) || [];
  }

  async saveUniversityTask(task: Omit<UniversityTask, 'id' | 'createdAt' | 'completed'>): Promise<UniversityTask> {
    const tasks = await this.getUniversityTasks();
    const newTask: UniversityTask = {
      id: `unitask_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completed: false,
      ...task,
    };
    await this.removeDeletedEntityTracking('universityTasks', newTask.id);
    tasks.unshift(newTask);
    await this.save(STORAGE_KEYS.UNIVERSITY_TASKS, tasks);
    return newTask;
  }

  async updateUniversityTask(id: string, updates: Partial<UniversityTask>): Promise<UniversityTask | null> {
    const tasks = await this.getUniversityTasks();
    const index = tasks.findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
      tasks[index] = { ...tasks[index], ...updates, updatedAt: new Date().toISOString() };
      await this.save(STORAGE_KEYS.UNIVERSITY_TASKS, tasks);
      return tasks[index];
    }
    return null;
  }

  async toggleUniversityTask(id: string): Promise<UniversityTask | null> {
    const tasks = await this.getUniversityTasks();
    const index = tasks.findIndex(t => String(t.id) === String(id));
    if (index !== -1) {
      tasks[index].completed = !tasks[index].completed;
      tasks[index].completedAt = tasks[index].completed ? new Date().toISOString() : null;
      tasks[index].updatedAt = new Date().toISOString();

      if (tasks[index].completed) {
        const xp = tasks[index].type === 'exam' ? 120 :
          tasks[index].type === 'project' ? 100 : 50;
        await this.addXP(xp, true, tasks[index]);
        if (tasks[index].type === 'exam') {
          await this.incrementAchievementProgress('exam_crusher', 1);
        }
        await this.incrementAchievementProgress('uni_conqueror', 1);
      }

      await this.save(STORAGE_KEYS.UNIVERSITY_TASKS, tasks);
      return tasks[index];
    }
    return null;
  }

  async deleteUniversityTask(id: string): Promise<boolean> {
    await this.trackDeletedEntity('universityTasks', id);
    const tasks = await this.getUniversityTasks();
    await this.save(STORAGE_KEYS.UNIVERSITY_TASKS, tasks.filter(t => String(t.id) !== String(id)));
    return true;
  }

  // ===== SCHEDULE =====
  async getScheduleBlocks(): Promise<ScheduleBlock[]> {
    let list: ScheduleBlock[] = [];
    const direct = await this.get<ScheduleBlock[]>(STORAGE_KEYS.SCHEDULE);
    if (direct !== null && direct !== undefined && Array.isArray(direct)) {
      list = direct;
    } else {
      // Fallbacks para llaves alternativas de sync
      const alt1 = await this.get<ScheduleBlock[]>('life_study_schedule.json');
      if (alt1 && Array.isArray(alt1) && alt1.length > 0) {
        list = alt1;
      } else {
        const alt2 = await this.get<ScheduleBlock[]>('schedule');
        if (alt2 && Array.isArray(alt2) && alt2.length > 0) list = alt2;
      }
    }

    // Asegurar que cada bloque tenga ID único y estable
    let needsSave = false;
    list = list.map((b, idx) => {
      if (!b.id) {
        needsSave = true;
        return {
          ...b,
          id: `sched_gen_${Date.now()}_${idx}_${Math.random().toString(36).slice(2, 6)}`
        };
      }
      return b;
    });

    if (needsSave) {
      await this.save(STORAGE_KEYS.SCHEDULE, list);
    }

    return list;
  }

  async saveScheduleBlock(block: Partial<ScheduleBlock>): Promise<ScheduleBlock> {
    const list = await this.getScheduleBlocks();
    
    // Si ya existe un bloque con ese ID o con el mismo nombre de materia, actualizarlo
    if (block.id) {
      const existingIdx = list.findIndex(b => String(b.id) === String(block.id));
      if (existingIdx !== -1) {
        list[existingIdx] = {
          ...list[existingIdx],
          ...block,
          updatedAt: new Date().toISOString(),
        } as ScheduleBlock;
        await this.save(STORAGE_KEYS.SCHEDULE, list);
        this.emit('DATA_UPDATED');
        return list[existingIdx];
      }
    }

    // Auto-link/create course if needed
    const cName = (block as any).courseName || (block as any).title || 'Materia';
    let cId = block.courseId;
    if (!cId && cName && cName.trim()) {
      const courses = await this.getCourses();
      const existingCourse = courses.find(c => c.name.toLowerCase() === cName.trim().toLowerCase());
      if (existingCourse) {
        cId = existingCourse.id;
      } else {
        const semesters = await this.getSemesters();
        const activeSem = semesters.find(s => s.isCurrent) || semesters[0];
        let semId = activeSem?.id;
        if (!semId) {
          const newSem = await this.saveSemester('2026-I');
          semId = newSem.id;
        }
        const createdCourse = await this.saveCourse({
          name: cName.trim(),
          color: block.color || '#6366f1',
          classroom: block.classroom || '',
          professor: (block as any).professor || '',
          semesterId: semId,
          credits: 4,
          evaluations: [
            { id: 'ep', name: 'Examen Parcial (EP)', weight: 30 },
            { id: 'ef', name: 'Examen Final (EF)', weight: 35 },
            { id: 'pp', name: 'Promedio de Prácticas (PP)', weight: 35 }
          ]
        });
        cId = createdCourse.id;
      }
    }

    const newBlock: ScheduleBlock = {
      id: block.id || `sched_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      courseId: cId || '',
      courseName: cName,
      title: cName,
      color: block.color || '#6366f1',
      classroom: block.classroom || '',
      location: (block as any).location || '',
      professor: (block as any).professor || '',
      schedules: block.schedules || [],
      createdAt: (block as any).createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...block,
    } as ScheduleBlock;

    await this.removeDeletedEntityTracking('schedule', newBlock.id);
    list.push(newBlock);
    await this.save(STORAGE_KEYS.SCHEDULE, list);
    this.emit('DATA_UPDATED');
    return newBlock;
  }

  async updateScheduleBlock(id: string, updates: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> {
    const list = await this.getScheduleBlocks();
    let index = list.findIndex(b => String(b.id) === String(id));
    
    // Fallback: si no coincide por ID, buscar por nombre de curso o título
    if (index === -1) {
      const searchName = updates.courseName || (updates as any).title;
      if (searchName) {
        index = list.findIndex(b => (b as any).courseName === searchName || (b as any).title === searchName);
      }
    }

    // Fallback: buscar por courseId si existe
    if (index === -1 && updates.courseId) {
      index = list.findIndex(b => b.courseId && String(b.courseId) === String(updates.courseId));
    }

    if (index !== -1) {
      list[index] = {
        ...list[index],
        ...updates,
        id: list[index].id || id,
        updatedAt: new Date().toISOString(),
      };
      await this.save(STORAGE_KEYS.SCHEDULE, list);
      this.emit('DATA_UPDATED');
      return list[index];
    }

    // Si de plano no existía, crearlo
    return await this.saveScheduleBlock({ ...updates, id: id || undefined });
  }

  async saveAllScheduleBlocks(blocks: ScheduleBlock[]): Promise<boolean> {
    await this.save(STORAGE_KEYS.SCHEDULE, blocks);
    this.emit('DATA_UPDATED');
    return true;
  }

  async deleteScheduleBlock(id: string, fallbackName?: string): Promise<boolean> {
    if (id) {
      await this.trackDeletedEntity('schedule', id);
    }
    const list = await this.getScheduleBlocks();
    const filtered = list.filter(b => {
      if (id && String(b.id) === String(id)) return false;
      if (fallbackName && ((b as any).courseName === fallbackName || (b as any).title === fallbackName)) {
        if (b.id) this.trackDeletedEntity('schedule', b.id);
        return false;
      }
      return true;
    });
    await this.save(STORAGE_KEYS.SCHEDULE, filtered);
    this.emit('DATA_UPDATED');
    return true;
  }

  async getScheduleImage(): Promise<string | null> {
    return (await this.get<string>(STORAGE_KEYS.SCHEDULE_IMAGE)) || (await this.get<string>('schedule_image')) || null;
  }

  async saveScheduleImage(uri: string | null): Promise<boolean> {
    if (uri) {
      await this.save(STORAGE_KEYS.SCHEDULE_IMAGE, uri);
    } else {
      await this.save(STORAGE_KEYS.SCHEDULE_IMAGE, null);
    }
    this.emit('DATA_UPDATED');
    return true;
  }

  async importScheduleFromJSON(jsonString: string): Promise<{ success: boolean; count: number; message: string }> {
    try {
      const parsed = JSON.parse(jsonString);
      let incomingBlocks: any[] = [];

      if (Array.isArray(parsed)) {
        incomingBlocks = parsed;
      } else if (parsed && Array.isArray(parsed.blocks)) {
        incomingBlocks = parsed.blocks;
      } else if (parsed && Array.isArray(parsed[STORAGE_KEYS.SCHEDULE])) {
        incomingBlocks = parsed[STORAGE_KEYS.SCHEDULE];
      } else if (parsed && Array.isArray(parsed.schedule)) {
        incomingBlocks = parsed.schedule;
      }

      if (incomingBlocks.length === 0) {
        return { success: false, count: 0, message: 'No se encontraron bloques de horario válidos en el archivo JSON.' };
      }

      const existing = await this.getScheduleBlocks();
      const map = new Map<string, any>();
      existing.forEach(b => map.set(b.id || (b as any).title || (b as any).courseName, b));

      incomingBlocks.forEach((b: any, idx: number) => {
        if (!b) return;
        const key = b.id || b.courseName || b.title || `sched_${idx}`;
        map.set(key, {
          ...b,
          id: b.id || `sched_${Date.now()}_${idx}`,
          updatedAt: new Date().toISOString()
        });
      });

      const updated = Array.from(map.values());
      await this.saveAllScheduleBlocks(updated);
      return { success: true, count: incomingBlocks.length, message: `Se importaron ${incomingBlocks.length} cursos/bloques de horario.` };
    } catch (e: any) {
      return { success: false, count: 0, message: `Error al procesar JSON: ${e.message}` };
    }
  }

  // ===== AUDIT & LOGS =====
  async getAuditLogs(): Promise<any[]> {
    return (await this.get<any[]>(STORAGE_KEYS.AUDIT_LOGS)) || [];
  }

  async addAuditLog(entry: { action: string; details?: any }): Promise<void> {
    const logs = await this.getAuditLogs();
    logs.unshift({
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      ...entry,
    });
    if (logs.length > 500) logs.pop();
    await this.save(STORAGE_KEYS.AUDIT_LOGS, logs);
  }

  // ===== SETTINGS & AI =====
  async getSettings(): Promise<AppSettings> {
    const settings = (await this.get<AppSettings>(STORAGE_KEYS.SETTINGS)) || {
      aiVoiceEnabled: true,
      assistantName: "Jarvis",
      voiceActivationEnabled: true,
      proactiveCoachEnabled: true,
      extremePrivacy: false,
      localAiMode: false,
      speechEnabled: true,
      speechSilenceMode: "silence_only",
      cloudSyncEnabled: true,
      syncServerUrl: "http://localhost:48920",
    };
    return settings;
  }

  async saveSettings(settings: AppSettings) {
    await this.save(STORAGE_KEYS.SETTINGS, settings);
    this.emit('SETTINGS_UPDATED', settings);
  }

  // ===== AI PREFERENCES & COACH =====
  async getAIPreferences(): Promise<AIPreferences> {
    const p = await this.get<AIPreferences>(STORAGE_KEYS.AI_PREFERENCES);
    return p || {
      tone: 'friendly',
      autoAnalyzeTasks: true,
      proactiveCoachEnabled: true,
      lastCheckinDate: null,
    };
  }

  async saveAIPreferences(prefs: AIPreferences) {
    await this.save(STORAGE_KEYS.AI_PREFERENCES, prefs);
  }

  // ===== UNIVERSITY ONLY BUNDLE EXPORT / IMPORT =====
  async exportUniversityBundle(): Promise<Record<string, any>> {
    const rawDeleted = await this.getDeletedEntities();
    const uniDeleted: Record<string, any> = {};
    const uniCategories = ['courses', 'semesters', 'units', 'universityTasks', 'schedule'];
    for (const cat of uniCategories) {
      if (rawDeleted[cat]) {
        uniDeleted[cat] = rawDeleted[cat];
      }
    }

    const courses = await this.getCourses();
    const semesters = await this.getSemesters();
    const universityUnitsProgress = await this.getCourseUnitsProgress();
    const universityTasks = await this.getUniversityTasks();
    const schedule = await this.getScheduleBlocks();
    const scheduleImage = await this.getScheduleImage();
    const dayOverrides = await this.get('@life_study_schedule_day_overrides');
    const files = await this.get<any[]>(STORAGE_KEYS.FILES) || [];
    const notes = await this.get<any[]>(STORAGE_KEYS.NOTES) || [];

    const bundle: Record<string, any> = {
      _meta: {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        app: 'OrgPro PC',
        scope: 'university_only'
      },
      // Canonical keys
      [STORAGE_KEYS.COURSES]: courses,
      [STORAGE_KEYS.SEMESTERS]: semesters,
      [STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS]: universityUnitsProgress,
      [STORAGE_KEYS.UNIVERSITY_TASKS]: universityTasks,
      [STORAGE_KEYS.SCHEDULE]: schedule,
      [STORAGE_KEYS.SCHEDULE_IMAGE]: scheduleImage,
      '@life_study_schedule_day_overrides': dayOverrides,
      [STORAGE_KEYS.FILES]: files,
      [STORAGE_KEYS.NOTES]: notes,
      [STORAGE_KEYS.DELETED_ENTITIES]: uniDeleted,
      // Cross-platform mobile fallback aliases
      'courses': courses,
      'life_study_courses.json': courses,
      'life_study_courses': courses,
      'semesters': semesters,
      'life_study_semesters.json': semesters,
      'life_study_semesters': semesters,
      'universityUnitsProgress': universityUnitsProgress,
      'life_study_university_units_progress.json': universityUnitsProgress,
      'life_study_university_units_progress': universityUnitsProgress,
      'universityTasks': universityTasks,
      'life_study_university_tasks.json': universityTasks,
      'life_study_university_tasks': universityTasks,
      'schedule': schedule,
      'blocks': schedule,
      'life_study_schedule.json': schedule,
      'life_study_schedule': schedule,
      'scheduleImage': scheduleImage,
      'life_study_schedule_image': scheduleImage,
      'dayOverrides': dayOverrides,
      'life_study_schedule_day_overrides': dayOverrides
    };

    return bundle;
  }

  // ===== FULL & SELECTIVE BUNDLE EXPORT / IMPORT =====
  async exportFullBundle(): Promise<Record<string, any>> {
    const uniBundle = await this.exportUniversityBundle();
    const [
      dailyTasks,
      habits,
      routines,
      rpgStats,
      rpgCosmetics,
      rpgInventory,
      rpgAchievements,
      bedtime,
      settings,
      aiPreferences,
      allDeleted
    ] = await Promise.all([
      this.getDailyTasks(),
      this.getHabits(),
      this.get<any[]>(STORAGE_KEYS.ROUTINES) || [],
      this.getRPGStats(),
      this.getRPGCosmetics(),
      this.getRPGInventory(),
      this.getAchievements(),
      this.getBedtime(),
      this.getSettings(),
      this.getAIPreferences(),
      this.getDeletedEntities()
    ]);

    const fullBundle: Record<string, any> = {
      ...uniBundle,
      _meta: {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        app: 'OrgPro PC',
        scope: 'full_sync'
      },
      // Tasks & Habits
      [STORAGE_KEYS.DAILY_TASKS]: dailyTasks,
      'dailyTasks': dailyTasks,
      'life_study_daily_tasks.json': dailyTasks,
      'life_study_daily_tasks': dailyTasks,
      'tasks': dailyTasks,
      [STORAGE_KEYS.HABITS]: habits,
      'habits': habits,
      'life_study_habits.json': habits,
      'life_study_habits': habits,
      [STORAGE_KEYS.ROUTINES]: routines,
      'routines': routines,
      'life_study_routines.json': routines,
      'life_study_routines': routines,

      // RPG System
      [STORAGE_KEYS.RPG_STATS]: rpgStats,
      'rpgStats': rpgStats,
      'life_study_rpg_stats.json': rpgStats,
      'life_study_rpg_stats': rpgStats,
      [STORAGE_KEYS.RPG_COSMETICS]: rpgCosmetics,
      'rpgCosmetics': rpgCosmetics,
      'life_study_rpg_cosmetics.json': rpgCosmetics,
      'life_study_rpg_cosmetics': rpgCosmetics,
      [STORAGE_KEYS.RPG_INVENTORY]: rpgInventory,
      'rpgInventory': rpgInventory,
      'life_study_rpg_inventory.json': rpgInventory,
      'life_study_rpg_inventory': rpgInventory,
      [STORAGE_KEYS.RPG_ACHIEVEMENTS]: rpgAchievements,
      'rpgAchievements': rpgAchievements,
      'life_study_rpg_achievements.json': rpgAchievements,
      'life_study_rpg_achievements': rpgAchievements,

      // Sleep & Settings
      [STORAGE_KEYS.BEDTIME]: bedtime,
      'bedtime': bedtime,
      'life_study_bedtime.json': bedtime,
      'life_study_bedtime': bedtime,
      [STORAGE_KEYS.SETTINGS]: settings,
      'settings': settings,
      'life_study_settings.json': settings,
      'life_study_settings': settings,
      [STORAGE_KEYS.AI_PREFERENCES]: aiPreferences,
      'aiPreferences': aiPreferences,
      'life_study_ai_preferences.json': aiPreferences,

      // Full Deleted Entities Tombstones
      [STORAGE_KEYS.DELETED_ENTITIES]: allDeleted,
      'deletedEntities': allDeleted,
      'life_study_deleted_entities.json': allDeleted,
      'life_study_deleted_entities': allDeleted
    };

    return fullBundle;
  }

  async exportSelectedData(selections: Record<string, boolean>): Promise<Record<string, any>> {
    const bundle: Record<string, any> = {
      _meta: {
        version: '2.0.0',
        exportedAt: new Date().toISOString(),
        app: 'OrgPro PC',
        partial: true,
        scope: 'university_only',
        selections,
      }
    };

    const keyMapping: Record<string, string[]> = {
      schedule: [
        STORAGE_KEYS.SCHEDULE,
        STORAGE_KEYS.COURSES,
        STORAGE_KEYS.SEMESTERS,
        STORAGE_KEYS.SCHEDULE_IMAGE,
        "@life_study_schedule_day_overrides",
        STORAGE_KEYS.DELETED_ENTITIES
      ],
      coursesAndSemesters: [
        STORAGE_KEYS.COURSES,
        STORAGE_KEYS.SEMESTERS,
        STORAGE_KEYS.DELETED_ENTITIES
      ],
      universityUnits: [
        STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS,
        STORAGE_KEYS.COURSES,
        STORAGE_KEYS.DELETED_ENTITIES
      ],
      universityTasks: [
        STORAGE_KEYS.UNIVERSITY_TASKS,
        STORAGE_KEYS.COURSES,
        STORAGE_KEYS.SEMESTERS,
        STORAGE_KEYS.DELETED_ENTITIES
      ],
      filesAndNotes: [
        STORAGE_KEYS.FILES,
        STORAGE_KEYS.NOTES,
        STORAGE_KEYS.RECORDINGS,
        STORAGE_KEYS.DOCUMENT_AI_CACHE
      ],
      settings: [
        STORAGE_KEYS.SETTINGS,
        STORAGE_KEYS.AI_PREFERENCES,
        STORAGE_KEYS.AI_MESSAGES
      ],
    };

    for (const option in selections) {
      if (selections[option] && keyMapping[option]) {
        for (const key of keyMapping[option]) {
          bundle[key] = await this.get(key) || null;
        }
      }
    }

    return bundle;
  }

  async importFullBundle(bundle: Record<string, any>): Promise<boolean> {
    try {
      for (const [key, val] of Object.entries(bundle)) {
        if (key !== '_meta' && val !== null && val !== undefined) {
          await this.save(key, val);
        }
      }
      this.emit('DATA_UPDATED');
      this.emit('RPG_STATS_UPDATED');
      return true;
    } catch (e) {
      console.error('Import bundle error:', e);
      return false;
    }
  }

  async importSelectedData(bundle: Record<string, any>, selections: Record<string, boolean>, mergeMode: 'merge' | 'overwrite' = 'merge'): Promise<boolean> {
    try {
      const keyMapping: Record<string, string[]> = {
        schedule: [
          STORAGE_KEYS.SCHEDULE,
          STORAGE_KEYS.COURSES,
          STORAGE_KEYS.SEMESTERS,
          STORAGE_KEYS.SCHEDULE_IMAGE,
          "@life_study_schedule_day_overrides"
        ],
        coursesAndSemesters: [
          STORAGE_KEYS.COURSES,
          STORAGE_KEYS.SEMESTERS
        ],
        universityUnits: [
          STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS,
          STORAGE_KEYS.COURSES
        ],
        universityTasks: [
          STORAGE_KEYS.UNIVERSITY_TASKS,
          STORAGE_KEYS.COURSES,
          STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS,
          STORAGE_KEYS.SEMESTERS
        ],
        filesAndNotes: [
          STORAGE_KEYS.FILES,
          STORAGE_KEYS.NOTES,
          STORAGE_KEYS.RECORDINGS,
          STORAGE_KEYS.DOCUMENT_AI_CACHE
        ],
        settings: [
          STORAGE_KEYS.SETTINGS,
          STORAGE_KEYS.AI_PREFERENCES,
          STORAGE_KEYS.AI_MESSAGES
        ],
      };

      const resolveDataForKey = (key: string) => {
        if (bundle[key] !== undefined && bundle[key] !== null) return bundle[key];

        if (key === STORAGE_KEYS.COURSES) {
          return bundle['life_study_courses.json'] || bundle['life_study_courses'] || bundle['courses'] || null;
        }
        if (key === STORAGE_KEYS.SCHEDULE) {
          return bundle['@life_study_schedule'] || bundle['life_study_schedule.json'] || bundle['life_study_schedule'] || bundle['schedule'] || bundle['blocks'] || null;
        }
        if (key === STORAGE_KEYS.SCHEDULE_IMAGE || key === "@life_study_schedule_image") {
          return bundle['@life_study_schedule_image'] || bundle['life_study_schedule_image'] || bundle['scheduleImage'] || null;
        }
        if (key === "@life_study_schedule_day_overrides") {
          return bundle['@life_study_schedule_day_overrides'] || bundle['life_study_schedule_day_overrides'] || bundle['dayOverrides'] || null;
        }
        if (key === STORAGE_KEYS.SEMESTERS) {
          return bundle['life_study_semesters.json'] || bundle['life_study_semesters'] || bundle['semesters'] || null;
        }
        if (key === STORAGE_KEYS.DAILY_TASKS) {
          return bundle['life_study_daily_tasks.json'] || bundle['life_study_daily_tasks'] || bundle['dailyTasks'] || null;
        }
        if (key === STORAGE_KEYS.UNIVERSITY_TASKS) {
          return bundle['life_study_university_tasks.json'] || bundle['life_study_university_tasks'] || bundle['universityTasks'] || null;
        }
        if (key === STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS) {
          return bundle['life_study_university_units_progress.json'] || bundle['life_study_university_units_progress'] || bundle['universityUnitsProgress'] || null;
        }
        if (key === STORAGE_KEYS.FILES) {
          return bundle['life_study_files.json'] || bundle['life_study_files'] || bundle['files'] || null;
        }
        if (key === STORAGE_KEYS.NOTES) {
          return bundle['life_study_notes.json'] || bundle['life_study_notes'] || bundle['notes'] || null;
        }
        if (key === STORAGE_KEYS.RECORDINGS) {
          return bundle['life_study_recordings.json'] || bundle['life_study_recordings'] || bundle['recordings'] || null;
        }
        if (key === STORAGE_KEYS.DOCUMENT_AI_CACHE) {
          return bundle['life_study_document_ai_cache.json'] || bundle['life_study_document_ai_cache'] || bundle['life_study_doc_ai_cache.json'] || bundle['documentAiCache'] || bundle['docAiCache'] || null;
        }
        if (key === STORAGE_KEYS.RAG_AUDIT_LOGS) {
          return bundle['life_study_rag_audit_logs.json'] || bundle['life_study_rag_audit_logs'] || bundle['ragAuditLogs'] || null;
        }
        if (key === STORAGE_KEYS.HABITS) {
          return bundle['life_study_habits.json'] || bundle['life_study_habits'] || bundle['habits'] || null;
        }
        if (key === STORAGE_KEYS.ROUTINES) {
          return bundle['life_study_routines.json'] || bundle['life_study_routines'] || bundle['routines'] || null;
        }
        if (key === STORAGE_KEYS.RPG_STATS) {
          return bundle['life_study_rpg_stats.json'] || bundle['life_study_rpg_stats'] || bundle['rpgStats'] || null;
        }
        if (key === STORAGE_KEYS.SETTINGS) {
          return bundle['life_study_settings.json'] || bundle['life_study_settings'] || bundle['settings'] || null;
        }
        if (key === STORAGE_KEYS.BEDTIME) {
          return bundle['life_study_bedtime.json'] || bundle['life_study_bedtime'] || bundle['bedtime'] || null;
        }
        if (key === STORAGE_KEYS.AI_PREFERENCES) {
          return bundle['life_study_ai_preferences.json'] || bundle['life_study_ai_preferences'] || bundle['aiPreferences'] || null;
        }
        if (key === STORAGE_KEYS.WEATHER_CONFIG) {
          return bundle['life_study_weather_config.json'] || bundle['life_study_weather_config'] || bundle['weatherConfig'] || null;
        }
        if (key === STORAGE_KEYS.RPG_ACHIEVEMENTS) {
          return bundle['life_study_rpg_achievements.json'] || bundle['life_study_rpg_achievements'] || bundle['achievements'] || null;
        }
        if (key === STORAGE_KEYS.RPG_INVENTORY) {
          return bundle['life_study_rpg_inventory.json'] || bundle['life_study_rpg_inventory'] || bundle['inventory'] || null;
        }
        if (key === STORAGE_KEYS.RPG_COSMETICS) {
          return bundle['life_study_rpg_cosmetics.json'] || bundle['life_study_rpg_cosmetics'] || bundle['cosmetics'] || null;
        }
        if (key === STORAGE_KEYS.RPG_RECORDS) {
          return bundle['life_study_rpg_records.json'] || bundle['life_study_rpg_records'] || bundle['records'] || null;
        }
        return null;
      };

      for (const option in selections) {
        if (selections[option] && keyMapping[option]) {
          for (const key of keyMapping[option]) {
            const importedData = resolveDataForKey(key);
            if (importedData === undefined || importedData === null) continue;

            if (mergeMode === 'overwrite') {
              await this.save(key, importedData);
            } else {
              const currentData = await this.get(key);

              // 1. Fusión de Unidades Universitarias y 17 Semanas
              if (key === STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS && Array.isArray(importedData)) {
                const localUnits = Array.isArray(currentData) ? currentData : [];
                const unitMap = new Map<string, any>();
                localUnits.forEach(u => { if (u && u.id) unitMap.set(u.id, u); });

                for (const remoteUnit of importedData) {
                  if (!remoteUnit) continue;
                  let matchedKey: string | null = null;
                  let localUnit = unitMap.get(remoteUnit.id);
                  if (!localUnit) {
                    for (const [k, lu] of unitMap.entries()) {
                      if (lu && remoteUnit && lu.courseId === remoteUnit.courseId &&
                          String(lu.title || '').trim().toLowerCase() === String(remoteUnit.title || '').trim().toLowerCase()) {
                        matchedKey = k;
                        localUnit = lu;
                        break;
                      }
                    }
                  } else {
                    matchedKey = remoteUnit.id;
                  }

                  if (!localUnit) {
                    unitMap.set(remoteUnit.id || `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, remoteUnit);
                  } else {
                    const maxWeeks = Math.max(localUnit.totalWeeks || 17, remoteUnit.totalWeeks || 17, 17);
                    const mergedWeeks = Array.from({ length: maxWeeks }, (_, idx) => {
                      const weekNum = idx + 1;
                      const localW = (localUnit.weeks || []).find((w: any) => w.weekNumber === weekNum) || { weekNumber: weekNum, completed: false, files: [] };
                      const remoteW = (remoteUnit.weeks || []).find((w: any) => w.weekNumber === weekNum) || { weekNumber: weekNum, completed: false, files: [] };

                      const fileMap = new Map<string, any>();
                      (localW.files || []).forEach((f: any) => { if (f) fileMap.set(f.id || f.name, f); });
                      (remoteW.files || []).forEach((f: any) => { if (f) fileMap.set(f.id || f.name, f); });

                      return {
                        ...localW,
                        ...remoteW,
                        weekNumber: weekNum,
                        completed: Boolean(localW.completed || remoteW.completed),
                        notes: remoteW.notes || localW.notes || '',
                        files: Array.from(fileMap.values())
                      };
                    });

                    const mergedUnit = {
                      ...localUnit,
                      ...remoteUnit,
                      id: localUnit.id || remoteUnit.id,
                      courseId: localUnit.courseId || remoteUnit.courseId,
                      semesterId: remoteUnit.semesterId || localUnit.semesterId,
                      weeks: mergedWeeks,
                      totalWeeks: maxWeeks,
                      examScore: Math.max(localUnit.examScore || 0, remoteUnit.examScore || 0),
                      evaluationExam: remoteUnit.evaluationExam || localUnit.evaluationExam
                    };
                    unitMap.set(matchedKey || localUnit.id, mergedUnit);
                  }
                }
                await this.save(key, Array.from(unitMap.values()));
              }
              // 2. Fusión de Cursos
              else if (key === STORAGE_KEYS.COURSES && Array.isArray(importedData)) {
                const localCourses = Array.isArray(currentData) ? currentData : [];
                const courseMap = new Map<string, any>();
                localCourses.forEach(c => { if (c) courseMap.set(c.id, c); });

                for (const remoteCourse of importedData) {
                  if (!remoteCourse) continue;
                  let matchKey: string | null = null;
                  let localCourse = courseMap.get(remoteCourse.id);
                  if (!localCourse) {
                    for (const [k, lc] of courseMap.entries()) {
                      if (lc && remoteCourse && (
                        (lc.code && remoteCourse.code && lc.code.trim().toLowerCase() === remoteCourse.code.trim().toLowerCase()) ||
                        (lc.name && remoteCourse.name && lc.name.trim().toLowerCase() === remoteCourse.name.trim().toLowerCase())
                      )) {
                        matchKey = k;
                        localCourse = lc;
                        break;
                      }
                    }
                  } else {
                    matchKey = remoteCourse.id;
                  }

                  if (!localCourse) {
                    courseMap.set(remoteCourse.id || `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, remoteCourse);
                  } else {
                    const mergedCourse = {
                      ...localCourse,
                      ...remoteCourse,
                      id: localCourse.id,
                      color: remoteCourse.color || localCourse.color,
                      semesterId: remoteCourse.semesterId || localCourse.semesterId,
                      evaluations: remoteCourse.evaluations || localCourse.evaluations
                    };
                    courseMap.set(matchKey || localCourse.id, mergedCourse);
                  }
                }
                await this.save(key, Array.from(courseMap.values()));
              }
              // 3. Fusión de Semestres
              else if (key === STORAGE_KEYS.SEMESTERS && Array.isArray(importedData)) {
                const localSemesters = Array.isArray(currentData) ? currentData : [];
                const semMap = new Map<string, any>();
                localSemesters.forEach(s => { if (s && s.id) semMap.set(s.id, s); });

                for (const remoteSem of importedData) {
                  if (!remoteSem) continue;
                  let matchKey: string | null = null;
                  let localSem = semMap.get(remoteSem.id);
                  if (!localSem) {
                    for (const [k, ls] of semMap.entries()) {
                      if (ls && remoteSem && ls.name && remoteSem.name && ls.name.trim().toLowerCase() === remoteSem.name.trim().toLowerCase()) {
                        matchKey = k;
                        localSem = ls;
                        break;
                      }
                    }
                  } else {
                    matchKey = remoteSem.id;
                  }

                  if (!localSem) {
                    semMap.set(remoteSem.id || `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, remoteSem);
                  } else {
                    semMap.set(matchKey || localSem.id, { ...localSem, ...remoteSem, id: localSem.id });
                  }
                }
                await this.save(key, Array.from(semMap.values()));
              }
              // 4. Fusión de Horario
              else if (key === STORAGE_KEYS.SCHEDULE && Array.isArray(importedData)) {
                const localSched = Array.isArray(currentData) ? currentData : [];
                const schedMap = new Map<string, any>();
                localSched.forEach(s => { if (s) schedMap.set(s.id || s.title || s.courseName, s); });

                importedData.forEach((s: any, idx: number) => {
                  if (!s) return;
                  const matchKey = s.id || s.courseName || s.title || `sched_${idx}`;
                  schedMap.set(matchKey, {
                    ...schedMap.get(matchKey),
                    ...s,
                    id: s.id || `sched_${Date.now()}_${idx}`
                  });
                });
                await this.save(key, Array.from(schedMap.values()));
              }
              // 5. Fusión de Tareas Universitarias
              else if (key === STORAGE_KEYS.UNIVERSITY_TASKS && Array.isArray(importedData)) {
                const localUni = Array.isArray(currentData) ? currentData : [];
                const uniMap = new Map<string, any>();
                localUni.forEach(u => { if (u && u.id) uniMap.set(u.id, u); });

                for (const remoteUni of importedData) {
                  if (!remoteUni) continue;
                  let matchKey: string | null = null;
                  let localTask = uniMap.get(remoteUni.id);
                  if (!localTask) {
                    for (const [k, lt] of uniMap.entries()) {
                      if (lt && remoteUni && lt.courseId === remoteUni.courseId &&
                          String(lt.title || '').trim().toLowerCase() === String(remoteUni.title || '').trim().toLowerCase()) {
                        matchKey = k;
                        localTask = lt;
                        break;
                      }
                    }
                  } else {
                    matchKey = remoteUni.id;
                  }

                  if (!localTask) {
                    uniMap.set(remoteUni.id || `uni_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, remoteUni);
                  } else {
                    const mergedTaskFiles = new Map<string, any>();
                    (localTask.files || []).forEach((f: any) => { if (f) mergedTaskFiles.set(f.id || f.name, f); });
                    (remoteUni.files || []).forEach((f: any) => { if (f) mergedTaskFiles.set(f.id || f.name, f); });

                    const mergedTaskNotes = new Map<string, any>();
                    (localTask.notes || []).forEach((n: any) => { if (n) mergedTaskNotes.set(n.id || n.title, n); });
                    (remoteUni.notes || []).forEach((n: any) => { if (n) mergedTaskNotes.set(n.id || n.title, n); });

                    uniMap.set(matchKey || localTask.id, {
                      ...localTask,
                      ...remoteUni,
                      id: localTask.id,
                      files: Array.from(mergedTaskFiles.values()),
                      notes: Array.from(mergedTaskNotes.values()),
                      completed: Boolean(localTask.completed || remoteUni.completed)
                    });
                  }
                }
                await this.save(key, Array.from(uniMap.values()));
              }
              // 6. Fusión de Archivos y Notas
              else if (key === STORAGE_KEYS.FILES && Array.isArray(importedData)) {
                const localFiles = Array.isArray(currentData) ? currentData : [];
                const fileMap = new Map<string, any>();
                localFiles.forEach(f => { if (f && f.id) fileMap.set(f.id, f); });

                for (const remoteFile of importedData) {
                  if (!remoteFile) continue;
                  let matchKey: string | null = null;
                  let localFile = fileMap.get(remoteFile.id);
                  if (!localFile) {
                    for (const [k, lf] of fileMap.entries()) {
                      if (lf && remoteFile && lf.name && remoteFile.name && lf.name.trim().toLowerCase() === remoteFile.name.trim().toLowerCase()) {
                        matchKey = k;
                        localFile = lf;
                        break;
                      }
                    }
                  } else {
                    matchKey = remoteFile.id;
                  }

                  if (!localFile) {
                    fileMap.set(remoteFile.id || `file_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, remoteFile);
                  } else {
                    fileMap.set(matchKey || localFile.id, { ...localFile, ...remoteFile, id: localFile.id });
                  }
                }
                await this.save(key, Array.from(fileMap.values()));
              }
              // 7. Fusión genérica
              else if (Array.isArray(currentData) && Array.isArray(importedData)) {
                const merged = [...currentData];
                for (const newItem of importedData) {
                  if (!newItem) continue;
                  const existsIndex = merged.findIndex((item: any) => {
                    if (!item) return false;
                    if (item.id && newItem.id && String(item.id) === String(newItem.id)) return true;
                    if (item.code && newItem.code && String(item.code) === String(newItem.code)) return true;
                    const nameA = String(item.courseName || item.title || item.name || '').trim().toLowerCase();
                    const nameB = String(newItem.courseName || newItem.title || newItem.name || '').trim().toLowerCase();
                    return Boolean(nameA && nameB && nameA === nameB);
                  });

                  if (existsIndex !== -1) {
                    const currentItem = merged[existsIndex] || {};
                    const mergedCompleted = Array.from(new Set([
                      ...(Array.isArray(currentItem.completedDates) ? currentItem.completedDates : []),
                      ...(Array.isArray(newItem.completedDates) ? newItem.completedDates : [])
                    ]));
                    merged[existsIndex] = {
                      ...currentItem,
                      ...newItem,
                      completedDates: mergedCompleted,
                      streak: Math.max(currentItem.streak || 0, newItem.streak || 0)
                    };
                  } else {
                    merged.push(newItem);
                  }
                }
                await this.save(key, merged);
              } else if (key === STORAGE_KEYS.RPG_STATS && currentData && typeof currentData === 'object' && typeof importedData === 'object') {
                const merged = {
                  ...currentData,
                  ...importedData,
                  level: Math.max(currentData.level || 1, importedData.level || 1),
                  xp: Math.max(currentData.xp || 0, importedData.xp || 0),
                  coins: Math.max(currentData.coins || 0, importedData.coins || 0),
                  totalCompletedTasks: Math.max(currentData.totalCompletedTasks || 0, importedData.totalCompletedTasks || 0),
                  totalCompletedHabits: Math.max(currentData.totalCompletedHabits || 0, importedData.totalCompletedHabits || 0),
                  streak: Math.max(currentData.streak || 0, importedData.streak || 0),
                };
                await this.save(key, merged);
              } else if (currentData && typeof currentData === 'object' && typeof importedData === 'object') {
                const merged = { ...currentData, ...importedData };
                await this.save(key, merged);
              } else {
                await this.save(key, importedData);
              }
            }
          }
        }
      }

      this.emit('DATA_UPDATED');
      this.emit('RPG_STATS_UPDATED');
      return true;
    } catch (e) {
      console.error('Import selected error:', e);
      return false;
    }
  }

  async clearAllDocCache(): Promise<boolean> {
    await this.save(STORAGE_KEYS.DOCUMENT_AI_CACHE, {});
    this.cache.delete(STORAGE_KEYS.DOCUMENT_AI_CACHE);
    return true;
  }

  async clearAllData(): Promise<boolean> {
    const keys = Object.values(STORAGE_KEYS);
    for (const key of keys) {
      this.cache.delete(key);
      try {
        if (typeof window !== 'undefined' && window.electronAPI) {
          await window.electronAPI.storageSet(key, null);
        }
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem(key);
        }
      } catch (err) {
        console.error(`Error clearing ${key}:`, err);
      }
    }
    this.emit('DATA_UPDATED');
    this.emit('RPG_STATS_UPDATED');
    return true;
  }

  // ===== UNAJ CREDENTIALS =====
  async getUnajCredentials(): Promise<{ username?: string; password?: string; remember?: boolean } | null> {
    return await this.get(STORAGE_KEYS.UNAJ_CREDENTIALS);
  }

  async saveUnajCredentials(credentials: any): Promise<boolean> {
    return await this.save(STORAGE_KEYS.UNAJ_CREDENTIALS, credentials);
  }

  async clearUnajCredentials(): Promise<boolean> {
    this.cache.delete(STORAGE_KEYS.UNAJ_CREDENTIALS);
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEYS.UNAJ_CREDENTIALS);
    }
    if (typeof window !== 'undefined' && (window as any).electronAPI) {
      await (window as any).electronAPI.storageSet(STORAGE_KEYS.UNAJ_CREDENTIALS, null);
    }
    return true;
  }
}

export default new StorageService();
