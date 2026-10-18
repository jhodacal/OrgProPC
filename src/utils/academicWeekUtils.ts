/**
 * academicWeekUtils.ts
 * Utilidades para el cálculo automático de semanas académicas a partir de la
 * fecha de inicio del ciclo / semestre (considerando sábados, domingos y feriados dentro de la semana lectiva),
 * y mapeo dinámico a unidades y semanas de cada curso universitario.
 */

import { UniversityUnit, UniversityUnitWeek } from '../types';

const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_ES = [
  'Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'
];

/**
 * Normaliza un objeto Date o string a las 00:00:00 locales para comparación limpia de fechas
 */
export function normalizeDateToMidnight(dateInput?: string | Date | null): Date {
  if (!dateInput) return new Date();
  if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    const [year, month, day] = dateInput.split('-').map(Number);
    return new Date(year, month - 1, day, 0, 0, 0, 0);
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
}

/**
 * Obtiene el lunes correspondiente a la semana de una fecha dada
 * (En JavaScript: 0=Domingo, 1=Lunes, ..., 6=Sábado)
 */
export function getMondayOfWeek(dateInput?: string | Date | null): Date {
  const d = normalizeDateToMidnight(dateInput);
  const day = d.getDay();
  // Días transcurridos desde el lunes de esa misma semana
  const diffToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  return monday;
}

/**
 * Calcula el número de semana académica (1-indexed) a partir de la fecha de inicio del semestre.
 * Regla:
 * - El ciclo inicia en la semana que contiene a `startDateStr` (iniciando el lunes de esa semana).
 * - Sábado y Domingo pertenecen a la semana lectiva en curso (no desfasan el conteo).
 * - Si targetDate es anterior al inicio, retorna 1.
 *
 * @param startDateStr - Fecha de inicio del ciclo (ej: '2026-08-17' o '2026-03-16')
 * @param targetDate - Fecha a evaluar
 * @returns Número de semana (1, 2, 3...)
 */
export function getAcademicWeek(startDateStr?: string | Date | null, targetDate: string | Date = new Date()): number {
  if (!startDateStr) return 1;

  const startMonday = getMondayOfWeek(startDateStr);
  const currentMidnight = normalizeDateToMidnight(targetDate);

  const diffMs = currentMidnight.getTime() - startMonday.getTime();
  if (diffMs < 0) {
    return 1; // Aún no inicia el semestre, pertenece a la Semana 1 introductoria
  }

  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  // 0-6 días = Semana 1 (Lunes a Domingo)
  // 7-13 días = Semana 2 (Lunes a Domingo)
  const weekNumber = Math.floor(diffDays / 7) + 1;
  return Math.max(1, weekNumber);
}

/**
 * Retorna las fechas de inicio (lunes) y fin (domingo) para una semana académica dada.
 */
export function getAcademicWeekDates(startDateStr?: string | Date | null, weekNumber: number = 1): {
  monday: Date;
  sunday: Date;
  label: string;
} {
  const startMonday = getMondayOfWeek(startDateStr || new Date());
  const weekMonday = new Date(startMonday);
  weekMonday.setDate(startMonday.getDate() + (weekNumber - 1) * 7);

  const weekSunday = new Date(weekMonday);
  weekSunday.setDate(weekMonday.getDate() + 6);

  const formatShort = (d: Date) => `${d.getDate()} de ${MONTH_NAMES_ES[d.getMonth()].slice(0, 3)}`;

  return {
    monday: weekMonday,
    sunday: weekSunday,
    label: `${formatShort(weekMonday)} - ${formatShort(weekSunday)}`,
  };
}

export interface UnitWeekMappingResult {
  unit: UniversityUnit | null;
  weekNumber: number;
  unitIndex: number;
  relativeWeek: number;
  isEstimated: boolean;
}

/**
 * Mapea la semana académica calculada a la unidad y semana correspondiente de un curso.
 */
export function findUnitAndWeekForAcademicWeek(courseUnits?: UniversityUnit[], academicWeek: number = 1): UnitWeekMappingResult {
  if (!courseUnits || courseUnits.length === 0) {
    return {
      unit: null,
      weekNumber: academicWeek,
      unitIndex: 0,
      relativeWeek: academicWeek,
      isEstimated: true,
    };
  }

  const sortedUnits = [...courseUnits].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime() || 0;
    const timeB = new Date(b.createdAt || 0).getTime() || 0;
    if (timeA !== timeB) return timeA - timeB;
    return (a.title || '').localeCompare(b.title || '');
  });

  let accumulatedWeeks = 0;

  for (let i = 0; i < sortedUnits.length; i++) {
    const currentUnit = sortedUnits[i];
    const unitWeeks = currentUnit.weeks || [];
    const totalWeeksInUnit = Math.max(
      1,
      unitWeeks.length || (typeof currentUnit.totalWeeks === 'number' ? currentUnit.totalWeeks : parseInt(String(currentUnit.totalWeeks || '16'), 10)) || 6
    );

    const exactAbsMatch = unitWeeks.find(w => w.weekNumber === academicWeek);
    if (exactAbsMatch) {
      return {
        unit: currentUnit,
        weekNumber: academicWeek,
        unitIndex: i,
        relativeWeek: academicWeek - accumulatedWeeks,
        isEstimated: false,
      };
    }

    if (academicWeek <= accumulatedWeeks + totalWeeksInUnit) {
      const relativeWeek = Math.max(1, academicWeek - accumulatedWeeks);
      const relMatch = unitWeeks.find(w => w.weekNumber === relativeWeek);
      const chosenWeekNumber = relMatch ? relativeWeek : (unitWeeks.length > 0 ? unitWeeks[Math.min(relativeWeek - 1, unitWeeks.length - 1)].weekNumber : relativeWeek);

      return {
        unit: currentUnit,
        weekNumber: chosenWeekNumber,
        unitIndex: i,
        relativeWeek,
        isEstimated: false,
      };
    }

    accumulatedWeeks += totalWeeksInUnit;
  }

  const lastUnit = sortedUnits[sortedUnits.length - 1];
  const lastUnitWeeks = lastUnit.weeks || [];
  const fallbackWeek = lastUnitWeeks.length > 0
    ? lastUnitWeeks[lastUnitWeeks.length - 1].weekNumber
    : Math.max(1, academicWeek - (accumulatedWeeks - (lastUnitWeeks.length || 6)));

  return {
    unit: lastUnit,
    weekNumber: fallbackWeek,
    unitIndex: sortedUnits.length - 1,
    relativeWeek: fallbackWeek,
    isEstimated: true,
  };
}

/**
 * Formatea una fecha de forma legible en español (ej: "Miércoles, 15 de Octubre de 2026")
 */
export function formatDateReadableSpanish(dateInput: string | Date = new Date()): string {
  const d = normalizeDateToMidnight(dateInput);
  const dayName = DAY_NAMES_ES[d.getDay()];
  const dayNum = d.getDate();
  const monthName = MONTH_NAMES_ES[d.getMonth()];
  const year = d.getFullYear();
  return `${dayName}, ${dayNum} de ${monthName} de ${year}`;
}

/**
 * Formatea una fecha simple para título en español (ej: "15 de Octubre de 2026")
 */
export function formatDateSimpleSpanish(dateInput: string | Date = new Date()): string {
  const d = normalizeDateToMidnight(dateInput);
  const dayNum = d.getDate();
  const monthName = MONTH_NAMES_ES[d.getMonth()];
  const year = d.getFullYear();
  return `${dayNum} de ${monthName} de ${year}`;
}

/**
 * Genera un nombre de archivo por defecto basado en la fecha (ej: "Apuntes_15_Octubre_2026.txt")
 */
export function generateDefaultNoteFileName(dateInput: string | Date = new Date(), prefix = "Apuntes"): string {
  const d = normalizeDateToMidnight(dateInput);
  const dayNum = String(d.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES_ES[d.getMonth()];
  const year = d.getFullYear();
  return `${prefix}_${dayNum}_${monthName}_${year}.txt`;
}

/**
 * Calcula la distribución exacta de 17 semanas académicas entre el número de unidades del curso.
 */
export function calculateWeekDistribution(numUnits: number): Array<{ start: number; end: number }> {
  if (numUnits <= 1) {
    return [{ start: 1, end: 17 }];
  }
  if (numUnits === 2) {
    return [
      { start: 1, end: 8 },
      { start: 9, end: 17 },
    ];
  }
  if (numUnits === 3) {
    return [
      { start: 1, end: 6 },
      { start: 7, end: 12 },
      { start: 13, end: 17 },
    ];
  }
  if (numUnits === 4) {
    return [
      { start: 1, end: 4 },
      { start: 5, end: 8 },
      { start: 9, end: 12 },
      { start: 13, end: 17 },
    ];
  }

  const baseWeeks = Math.floor(17 / numUnits);
  const remainder = 17 % numUnits;
  const dist = [];
  let cur = 1;
  for (let i = 0; i < numUnits; i++) {
    const count = baseWeeks + (i < remainder ? 1 : 0);
    const end = i === numUnits - 1 ? 17 : cur + count - 1;
    dist.push({ start: cur, end });
    cur = end + 1;
  }
  return dist;
}

/**
 * Garantiza que cada curso universitario tenga registradas las 17 semanas académicas completas
 * distribuidas armónicamente entre sus unidades temáticas, sin sobreescribir notas, archivos ni progresos existentes.
 */
export function ensureCompleteCourseWeeks(units: UniversityUnit[]): UniversityUnit[] {
  if (!Array.isArray(units) || units.length === 0) return units;

  const courseUnitsMap = new Map<string, UniversityUnit[]>();
  units.forEach(u => {
    if (!u.courseId) return;
    const list = courseUnitsMap.get(u.courseId) || [];
    list.push(u);
    courseUnitsMap.set(u.courseId, list);
  });

  courseUnitsMap.forEach((cUnits) => {
    if (cUnits.length === 0) return;

    // Detectar todas las semanas ya registradas en las unidades de este curso
    const coveredWeeks = new Set<number>();
    cUnits.forEach(u => {
      (u.weeks || []).forEach(w => {
        if (typeof w.weekNumber === 'number') {
          coveredWeeks.add(w.weekNumber);
        }
      });
    });

    const dist = calculateWeekDistribution(cUnits.length);

    for (let w = 1; w <= 17; w++) {
      if (!coveredWeeks.has(w)) {
        let uIdx = dist.findIndex(d => w >= d.start && w <= d.end);
        if (uIdx === -1) uIdx = cUnits.length - 1;
        const targetUnit = cUnits[uIdx];
        if (targetUnit) {
          if (!Array.isArray(targetUnit.weeks)) {
            targetUnit.weeks = [];
          }
          targetUnit.weeks.push({
            weekNumber: w,
            title: `Semana ${w}`,
            name: `Semana ${w}`,
            completed: false,
            files: [],
          });
          coveredWeeks.add(w);
        }
      }
    }

    // Ordenar cronológicamente y sincronizar totalWeeks
    cUnits.forEach(u => {
      if (Array.isArray(u.weeks)) {
        u.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
        u.totalWeeks = u.weeks.length;
      }
    });
  });

  return units;
}

