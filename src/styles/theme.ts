export const COLORS = {
  primary: '#6C63FF',
  primaryLight: '#8B85FF',
  primaryDark: '#4B44DB',
  secondary: '#FF6B6B',
  secondaryLight: '#FF8E8E',
  accent: '#4ECDC4',
  accentLight: '#6EE7DE',
  bgDark: '#070913',
  bgCard: 'rgba(255, 255, 255, 0.05)',
  bgCardHover: 'rgba(255, 255, 255, 0.09)',
  bgInput: 'rgba(255, 255, 255, 0.08)',
  textPrimary: '#FFFFFF',
  textSecondary: '#A0A0C0',
  textMuted: '#6B6B8D',
  success: '#4ADE80',
  warning: '#FBBF24',
  danger: '#EF4444',
  info: '#60A5FA',
};

export const THEMES: Record<string, { bg: string; gradient: string; accent: string; border: string }> = {
  "Default": { bg: '#070913', gradient: 'from-[#050726] to-[#251044]', accent: '#6C63FF', border: '#6C63FF40' },
  "Espacio Profundo": { bg: '#020617', gradient: 'from-[#0F172A] to-[#020617]', accent: '#38BDF8', border: '#38BDF840' },
  "Bosque Místico": { bg: '#022C22', gradient: 'from-[#064E3B] to-[#022C22]', accent: '#34D399', border: '#34D39940' },
  "Cyberpunk": { bg: '#050811', gradient: 'from-[#0B2B3C] to-[#050811]', accent: '#00F0FF', border: '#00F0FF40' },
  "Aurora Boreal": { bg: '#051C1C', gradient: 'from-[#0C4C4C] to-[#051C1C]', accent: '#2DD4BF', border: '#2DD4BF40' },
  "Atardecer Dorado": { bg: '#1A0C02', gradient: 'from-[#5C2A02] to-[#1A0C02]', accent: '#F59E0B', border: '#F59E0B40' },
  "Nebulosa Estelar": { bg: '#090115', gradient: 'from-[#2E0854] to-[#090115]', accent: '#D946EF', border: '#D946EF40' },
  "Antigravedad Cósmica": { bg: '#05050A', gradient: 'from-[#2B1055] to-[#05050A]', accent: '#F59E0B', border: '#F59E0B40' },
};

export const RARITY_CONFIG = {
  common: { name: 'Común', color: '#9CA3AF', bg: 'bg-gray-500/10', border: 'border-gray-500/30', xp: 20 },
  uncommon: { name: 'Poco Común', color: '#10B981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', xp: 35 },
  rare: { name: 'Rara', color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/30', xp: 60 },
  epic: { name: 'Épica', color: '#8B5CF6', bg: 'bg-purple-500/10', border: 'border-purple-500/30', xp: 100 },
  legendary: { name: 'Legendaria', color: '#F59E0B', bg: 'bg-amber-500/10', border: 'border-amber-500/30', xp: 200 }
};

export const PRIORITY_CONFIG = {
  low: { label: 'Baja', color: '#60A5FA', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  medium: { label: 'Media', color: '#34D399', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30' },
  high: { label: 'Alta', color: '#FBBF24', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  urgent: { label: 'Urgente', color: '#EF4444', bg: 'bg-rose-500/10', border: 'border-rose-500/30' }
};
