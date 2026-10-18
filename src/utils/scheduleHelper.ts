import { ScheduleBlock } from '../types';

export interface FlatScheduleInstance {
  id: string;
  blockId: string;
  courseId?: string;
  courseName: string;
  color: string;
  dayName: string;
  dayIndex: number; // 0=Lun, 1=Mar, ..., 6=Dom
  startTime: string;
  endTime: string;
  startMinutes: number;
  endMinutes: number;
  durationMinutes: number;
  classroom?: string;
  location?: string;
  professor?: string;
  isCustomDay?: boolean;
}

export const DAYS_NAMES = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'] as const;
export const FULL_DAYS_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'] as const;

export function normalizeDayName(day: string | number): string {
  if (typeof day === 'number') {
    return DAYS_NAMES[day] || 'Lun';
  }
  if (!day || typeof day !== 'string') return 'Lun';
  const d = day.trim().toLowerCase();
  if (d.startsWith('lu')) return 'Lun';
  if (d.startsWith('ma')) return 'Mar';
  if (d.startsWith('mi')) return 'Mié';
  if (d.startsWith('ju')) return 'Jue';
  if (d.startsWith('vi')) return 'Vie';
  if (d.startsWith('sá') || d.startsWith('sa') || d.startsWith('s')) return 'Sáb';
  if (d.startsWith('do') || d.startsWith('d')) return 'Dom';
  return 'Lun';
}

export function parseTimeToMinutes(timeStr?: string): number {
  if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) {
    return 8 * 60; // 08:00 default
  }
  const [h, m] = timeStr.split(':').map(Number);
  const validH = isNaN(h) ? 0 : Math.max(0, Math.min(23, h));
  const validM = isNaN(m) ? 0 : Math.max(0, Math.min(59, m));
  return validH * 60 + validM;
}

export function formatMinutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime12h(timeStr?: string): string {
  if (!timeStr) return '';
  const mins = parseTimeToMinutes(timeStr);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 === 0 ? 12 : h % 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Aplanamiento completo de todos los bloques de horario universitario
 * para soportar todos los formatos de la app móvil y de PC.
 */
export function flattenScheduleBlocks(blocks: ScheduleBlock[]): FlatScheduleInstance[] {
  if (!Array.isArray(blocks)) return [];

  const instances: FlatScheduleInstance[] = [];

  blocks.forEach((b) => {
    if (!b) return;
    const courseName = (b as any).courseName || (b as any).title || (b as any).name || (b as any).subject || 'Materia';
    const color = b.color || '#6366f1';
    const professor = (b as any).professor || '';
    const rootClassroom = (b as any).classroom || '';
    const rootLocation = (b as any).location || '';
    const fallbackBlockId = b.id || `sched_blk_${courseName.replace(/\s+/g, '_')}`;

    // 1. Caso bloques modernos con arreglo "schedules"
    if (Array.isArray(b.schedules) && b.schedules.length > 0) {
      b.schedules.forEach((sched, sIdx) => {
        if (!sched) return;
        const days = Array.isArray(sched.days) ? sched.days : sched.days ? [sched.days] : [];
        days.forEach((rawDay) => {
          const normDay = normalizeDayName(rawDay);
          const dayIdx = DAYS_NAMES.indexOf(normDay as any);
          if (dayIdx === -1) return;

          const overrides = sched.dayOverrides?.[normDay] || (sched.dayOverrides as any)?.[rawDay];
          const isCustom = sched.unified === false && !!overrides;

          const startTime = (isCustom && overrides?.startTime) ? overrides.startTime : (sched.startTime || (b as any).startTime || '08:00');
          const endTime = (isCustom && overrides?.endTime) ? overrides.endTime : (sched.endTime || (b as any).endTime || '10:00');
          const classroom = (isCustom && overrides?.classroom) ? overrides.classroom : (sched.classroom || rootClassroom);
          const location = (isCustom && overrides?.location) ? overrides.location : (sched.location || rootLocation);

          const startM = parseTimeToMinutes(startTime);
          const endM = parseTimeToMinutes(endTime);
          const duration = Math.max(15, endM > startM ? endM - startM : 60);

          instances.push({
            id: `${b.id || fallbackBlockId}_${sIdx}_${normDay}_${startTime}`,
            blockId: b.id || fallbackBlockId,
            courseId: b.courseId,
            courseName,
            color,
            dayName: normDay,
            dayIndex: dayIdx,
            startTime,
            endTime,
            startMinutes: startM,
            endMinutes: endM,
            durationMinutes: duration,
            classroom,
            location,
            professor,
            isCustomDay: isCustom,
          });
        });
      });
    }
    // 2. Caso bloques con "days" en la raíz
    else if (Array.isArray((b as any).days) && (b as any).days.length > 0) {
      (b as any).days.forEach((rawDay: string) => {
        const normDay = normalizeDayName(rawDay);
        const dayIdx = DAYS_NAMES.indexOf(normDay as any);
        if (dayIdx === -1) return;

        const startTime = (b as any).startTime || '08:00';
        const endTime = (b as any).endTime || '10:00';
        const startM = parseTimeToMinutes(startTime);
        const endM = parseTimeToMinutes(endTime);

        instances.push({
          id: `${b.id || fallbackBlockId}_${normDay}_${startTime}`,
          blockId: b.id || fallbackBlockId,
          courseId: b.courseId,
          courseName,
          color,
          dayName: normDay,
          dayIndex: dayIdx,
          startTime,
          endTime,
          startMinutes: startM,
          endMinutes: endM,
          durationMinutes: Math.max(15, endM - startM),
          classroom: rootClassroom,
          location: rootLocation,
          professor,
          isCustomDay: false,
        });
      });
    }
    // 3. Caso formato legado "day" (número 0..6)
    else if (typeof (b as any).day === 'number' || (b as any).day !== undefined) {
      const normDay = normalizeDayName((b as any).day);
      const dayIdx = DAYS_NAMES.indexOf(normDay as any);
      const startTime = (b as any).startTime || '08:00';
      const endTime = (b as any).endTime || '10:00';
      const startM = parseTimeToMinutes(startTime);
      const endM = parseTimeToMinutes(endTime);

      instances.push({
        id: `${b.id || fallbackBlockId}_${normDay}_${startTime}`,
        blockId: b.id || fallbackBlockId,
        courseId: b.courseId,
        courseName,
        color,
        dayName: normDay,
        dayIndex: dayIdx !== -1 ? dayIdx : 0,
        startTime,
        endTime,
        startMinutes: startM,
        endMinutes: endM,
        durationMinutes: Math.max(15, endM - startM),
        classroom: rootClassroom,
        location: rootLocation,
        professor,
        isCustomDay: false,
      });
    }
  });

  return instances;
}

/**
 * Obtener clases de hoy ordenadas por hora
 */
export function getTodayClasses(blocks: ScheduleBlock[], date = new Date()): FlatScheduleInstance[] {
  const dayIdx = (date.getDay() + 6) % 7; // 0=Lun, ..., 6=Dom
  const allInstances = flattenScheduleBlocks(blocks);
  return allInstances
    .filter(inst => inst.dayIndex === dayIdx)
    .sort((a, b) => a.startMinutes - b.startMinutes);
}

/**
 * Obtener la próxima clase universitaria en tiempo real
 */
export interface NextClassInfo extends FlatScheduleInstance {
  isToday: boolean;
  isTomorrow: boolean;
  isOngoing: boolean;
  remainingText: string;
  formattedTime12: string;
}

export function getNextUniversityClass(blocks: ScheduleBlock[], now = new Date()): NextClassInfo | null {
  const flat = flattenScheduleBlocks(blocks);
  if (flat.length === 0) return null;

  const todayIdx = (now.getDay() + 6) % 7;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Buscar si hay una clase hoy que aún no termine o esté por empezar
  const todayClasses = flat
    .filter(b => b.dayIndex === todayIdx)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  for (const c of todayClasses) {
    if (nowMinutes < c.endMinutes) {
      const isOngoing = nowMinutes >= c.startMinutes;
      let remainingText = '';

      if (isOngoing) {
        const minsLeft = c.endMinutes - nowMinutes;
        remainingText = `En curso (termina en ${minsLeft} min)`;
      } else {
        const diff = c.startMinutes - nowMinutes;
        if (diff < 60) {
          remainingText = `En ${diff} min`;
        } else {
          const h = Math.floor(diff / 60);
          const m = diff % 60;
          remainingText = `En ${h}h${m > 0 ? ` ${m}m` : ''}`;
        }
      }

      return {
        ...c,
        isToday: true,
        isTomorrow: false,
        isOngoing,
        remainingText,
        formattedTime12: `${formatTime12h(c.startTime)} - ${formatTime12h(c.endTime)}`
      };
    }
  }

  // 2. Si no hay más clases hoy, buscar el día más cercano de los próximos 7 días
  for (let offset = 1; offset <= 7; offset++) {
    const targetIdx = (todayIdx + offset) % 7;
    const targetDayClasses = flat
      .filter(b => b.dayIndex === targetIdx)
      .sort((a, b) => a.startMinutes - b.startMinutes);

    if (targetDayClasses.length > 0) {
      const firstClass = targetDayClasses[0];
      const isTomorrow = offset === 1;
      const dayLabel = isTomorrow ? 'Mañana' : FULL_DAYS_NAMES[targetIdx];

      return {
        ...firstClass,
        isToday: false,
        isTomorrow,
        isOngoing: false,
        remainingText: `${dayLabel} a las ${formatTime12h(firstClass.startTime)}`,
        formattedTime12: `${formatTime12h(firstClass.startTime)} - ${formatTime12h(firstClass.endTime)}`
      };
    }
  }

  return null;
}
