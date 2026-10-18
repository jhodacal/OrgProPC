export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface DailyTask {
  id: string;
  title: string;
  description?: string;
  priority: Priority;
  rarity?: TaskRarity;
  estimatedMinutes?: number;
  hasTime?: boolean;
  timeHour?: number;
  timeMin?: number;
  hasAlarm?: boolean;
  completedDates?: string[];
  failedDates?: string[];
  failedInstances?: string[];
  streak?: number;
  createdAt: string;
  updatedAt?: string;
  inProgressDates?: string[];
  inProgressInstances?: string[];
  inProgressEndTimestamps?: Record<string, number>;
  recurrence?: {
    type: 'daily' | 'weekly' | 'custom' | 'none';
    days?: number[];
  };
}

export interface Habit {
  id: string;
  title: string;
  description?: string;
  priority?: Priority;
  rarity?: TaskRarity;
  targetPerDay?: number;
  completedDates: string[];
  failedDates?: string[];
  streak: number;
  icon?: string;
  color?: string;
  category?: string;
  createdAt: string;
  updatedAt?: string;
  habiticaId?: string;
}

export interface UniversityTask {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  courseName?: string;
  type: 'task' | 'exam' | 'project' | 'lab' | 'reading';
  priority: Priority;
  rarity?: TaskRarity;
  dueDate: string;
  dueTime?: string;
  completed: boolean;
  completedAt?: string | null;
  grade?: number;
  maxGrade?: number;
  weightPercentage?: number;
  notes?: TaskNote[];
  files?: TaskFile[];
  createdAt: string;
  updatedAt?: string;
}

export interface TaskNote {
  id: string;
  title?: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
}

export interface TaskFile {
  id: string;
  name: string;
  uri: string;
  size?: number;
  type?: string;
  addedAt: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
  createdAt: string;
}

export interface UniversityFile {
  id: string;
  name: string;
  type: 'pdf' | 'office' | 'image' | 'text' | 'audio' | 'video';
  uri: string;
  size?: number;
  textContent?: string;
  addedAt: string;
  aiSummary?: string;
  keyPoints?: string[];
  flashcards?: Array<{ question: string; answer: string }>;
}

export interface EvaluationQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
  justification: string;
}

export interface UniversityUnitWeek {
  weekNumber: number;
  completed: boolean;
  name?: string;
  title?: string;
  notes?: string;
  files?: UniversityFile[];
}

export interface UniversityUnit {
  id: string;
  title: string;
  courseId: string;
  semesterId?: string;
  totalWeeks: number;
  weeks: UniversityUnitWeek[];
  completed?: boolean;
  evaluationExam?: EvaluationQuestion[];
  examScore?: number;
}

export interface CourseEvaluationWeight {
  id: string;
  name: string;
  weight: number;
  score?: number;
}

export interface Course {
  id: string;
  name: string;
  code?: string;
  professor?: string;
  classroom?: string;
  color: string;
  credits?: number;
  cycle?: number;
  semesterId?: string;
  evaluations?: CourseEvaluationWeight[];
  createdAt: string;
  updatedAt?: string;
}

export interface ScheduleBlock {
  id: string;
  courseId: string;
  courseName: string;
  color: string;
  classroom?: string;
  professor?: string;
  schedules?: Array<{
    days: string[];
    startTime: string;
    endTime: string;
    location?: string;
    classroom?: string;
    unified?: boolean;
    dayOverrides?: Record<string, {
      startTime: string;
      endTime: string;
      classroom?: string;
      location?: string;
    }>;
  }>;
  createdAt: string;
  updatedAt?: string;
}

export interface RPGStats {
  level: number;
  xp: number;
  nextLevelXp: number;
  coins: number;
  totalCompletedTasks: number;
  totalCompletedHabits: number;
  streak: number;
  longestStreak: number;
  xpBoosterUntil?: string | null;
}

export interface RPGCosmetics {
  equippedAvatar: string;
  equippedTheme: string;
  equippedSword?: string | null;
  equippedShield?: string | null;
  equippedHelmet?: string | null;
  unlockedAvatars: string[];
  unlockedThemes: string[];
  unlockedSwords?: string[];
  unlockedShields?: string[];
  unlockedHelmets?: string[];
}

export interface RPGRecord {
  longestStreak: number;
  maxTasksCompletedInWeek: number;
  currentWeekTasks: number;
  currentWeekNumber: string;
  maxXpAccumulatedInMonth: number;
  currentMonthXp: number;
  currentMonthYear: string;
}

export interface RPGInventory {
  focus_blocker: number;
  notif_silencer: number;
  xp_booster: number;
  xpBoosterActiveUntil?: string | null;
  focusBlockerActiveUntil?: string | null;
  notifSilencerActiveUntil?: string | null;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  maxProgress: number;
  unlocked: boolean;
  xpReward: number;
  icon: string;
  targetType?: string;
  targetTitle?: string;
}

export interface ShopItem {
  id: string;
  title: string;
  description: string;
  cost: number;
  icon: string;
  type: 'consumable' | 'sword' | 'shield' | 'helmet' | 'theme';
  multiplier?: number;
}

export interface CustomReward {
  id: string;
  title: string;
  description?: string;
  cost: number;
  icon?: string;
  category?: string;
  timesClaimed?: number;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSettings {
  aiVoiceEnabled: boolean;
  assistantName: string;
  voiceActivationEnabled: boolean;
  proactiveCoachEnabled: boolean;
  extremePrivacy: boolean;
  localAiMode: boolean;
  speechEnabled: boolean;
  speechSilenceMode: string;
  equippedTheme?: string;
  syncServerUrl?: string;
  deviceId?: string;
  lastSyncTimestamp?: number;
  cloudSyncEnabled?: boolean;
}

export interface WeatherConfig {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface BedtimeSettings {
  enabled: boolean;
  bedtimeHour: number;
  bedtimeMin: number;
  wakeupHour: number;
  wakeupMin: number;
  alarmUri?: string;
}

export interface AIPreferences {
  gradingScale: number;
  country: string;
  context: string;
  selectedModel?: string;
  geminiApiKey?: string;
  geminiApiKey2?: string;
  geminiApiKey3?: string;
  groqApiKey?: string;
  groqApiKey2?: string;
  groqApiKey3?: string;
  grokApiKey?: string;
  cohereApiKey?: string;
  cohereApiKey2?: string;
  cohereApiKey3?: string;
  openrouterApiKey?: string;
  openrouterApiKey2?: string;
  openrouterApiKey3?: string;
  githubApiKey?: string;
  githubApiKey2?: string;
  githubApiKey3?: string;
  githubGptApiKey?: string;
  mistralApiKey?: string;
  cerebrasApiKey?: string;
  nvidiaApiKey?: string;
  cloudflareApiKey?: string;
  cloudflareApiKey2?: string;
  cloudflareApiKey3?: string;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  actionData?: any;
}

export interface SyncPayload {
  version: string;
  timestamp: number;
  deviceId: string;
  data: Record<string, any>;
}
