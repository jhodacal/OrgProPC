import axios from 'axios';
import { parse } from 'node-html-parser';
import StorageService from './StorageService';
import { Course, UniversityUnit, UniversityUnitWeek, UniversityFile } from '../types';

const BASE_URL = 'https://siscampusv.unaj.edu.pe';

const COURSE_COLORS = [
  '#4F46E5',
  '#06B6D4',
  '#10B981',
  '#F59E0B',
  '#EC4899',
  '#8B5CF6',
  '#3B82F6',
  '#14B8A6',
  '#F97316',
];

function normalizeStr(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanWeekName(raw: any, weekNumber?: number): string {
  if (!raw) return '';
  let cleaned = String(raw).trim();
  cleaned = cleaned.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (weekNumber !== undefined && weekNumber !== null) {
    const prefixRegex = new RegExp(`^(?:semana|sem|s)\\s*0?${weekNumber}\\s*[:–—.-]\\s*`, 'i');
    cleaned = cleaned.replace(prefixRegex, '').trim();
  }
  cleaned = cleaned.replace(/^(?:semana|sem|s)\s*0?\d{1,2}\s*[:–—.-]?\s*/i, '').trim();
  return cleaned;
}

function getFileCategory(fileName: string): 'pdf' | 'office' | 'image' | 'text' | 'audio' | 'video' {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext === 'pdf') return 'pdf';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'mkv', 'avi', 'mov'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) return 'audio';
  if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'office';
  return 'text';
}

function calculateWeekDistribution(numUnits: number): Array<{ start: number; end: number }> {
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

function formatAcademicPeriod(raw: any): string | null {
  if (!raw) return null;
  const str = String(raw).trim().toUpperCase();

  const match = str.match(/\b(202\d)\s*[-_./]?(?:\s*SEMESTRE\s*)?\s*(III|II|I|[1-3]|0)\b/i);
  if (match) {
    const year = match[1];
    let term = match[2].toUpperCase();
    if (term === '1') term = 'I';
    if (term === '2') term = 'II';
    if (term === '3') term = 'III';
    return `${year}-${term}`;
  }

  const simpleMatch = str.match(/\b(202\d\s*[-_./]\s*[A-Z0-9]+)\b/i);
  if (simpleMatch) {
    return simpleMatch[1].replace(/\s+/g, '').replace(/[._/]/, '-').toUpperCase();
  }

  return null;
}

function getDefaultAcademicPeriod(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const term = month >= 8 ? 'II' : 'I';
  return `${year}-${term}`;
}

function getStandardPeriodKey(raw: any): string {
  if (!raw) return '';
  const formatted = formatAcademicPeriod(raw);
  if (formatted) return formatted.toUpperCase();
  return normalizeStr(raw)
    .replace(/^(?:semestre|periodo|ciclo)\s+/gi, '')
    .replace(/\s+/g, '')
    .toUpperCase();
}

export interface SyncMetrics {
  evaluatedCourses: number;
  newCoursesCount: number;
  newUnitsCount: number;
  newWeeksCount: number;
  newFilesCount: number;
  detectedSemester?: string;
  availablePeriods?: string[];
}

export interface ScrapedCourse {
  name: string;
  code: string;
  sectionId: string;
  periodName?: string;
  periodId?: string;
  isCurrentPeriod?: boolean;
}

class UnajScraperService {
  private cookies: Record<string, string> = {};
  public detectedPeriod: string | null = null;
  public availablePeriods: Array<{ id: string; text: string; name: string; selected: boolean }> = [];

  private _storeCookies(res: any) {
    if (!res || !res.headers) return;
    let setCookieHeaders = null;
    if (typeof res.headers.getSetCookie === 'function') {
      setCookieHeaders = res.headers.getSetCookie();
    }
    if (!setCookieHeaders || !setCookieHeaders.length) {
      setCookieHeaders = res.headers['set-cookie'] || res.headers['Set-Cookie'];
    }
    if (!setCookieHeaders) return;
    const list = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

    list.forEach((cookieStr: any) => {
      if (typeof cookieStr === 'string') {
        const mainPart = cookieStr.split(';')[0];
        const eqIdx = mainPart.indexOf('=');
        if (eqIdx > 0) {
          const k = mainPart.slice(0, eqIdx).trim();
          const v = mainPart.slice(eqIdx + 1).trim();
          this.cookies[k] = v;
        }
      }
    });
  }

  private _getCookieHeader(): string {
    return Object.entries(this.cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  private _getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
    const cookieHeader = this._getCookieHeader();
    return {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
      ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      ...customHeaders,
    };
  }

  private async _request(options: {
    url: string;
    method?: string;
    data?: any;
    headers?: any;
    formFields?: any;
  }): Promise<any> {
    if (typeof window !== 'undefined' && (window as any).electronAPI?.unajRequest) {
      const res = await (window as any).electronAPI.unajRequest({
        ...options,
        headers: this._getHeaders(options.headers || {}),
      });
      this._storeCookies(res);
      return res;
    }

    let requestData = options.data;
    const reqHeaders = this._getHeaders(options.headers || {});

    if (options.formFields) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(options.formFields)) {
        params.append(k, String(v));
      }
      requestData = params.toString();
      reqHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const res = await axios({
      url: options.url,
      method: options.method || 'GET',
      data: requestData,
      headers: reqHeaders,
      withCredentials: true,
      validateStatus: () => true,
    });

    this._storeCookies(res);
    return res;
  }

  /**
   * 1. Login en el Aula Virtual UNAJ
   */
  async login(username: string, password: string): Promise<{ success: boolean; data: any }> {
    this.cookies = {};
    this.detectedPeriod = null;
    this.availablePeriods = [];

    const response = await this._request({
      url: `${BASE_URL}/account/login`,
      method: 'POST',
      formFields: {
        username: username.trim(),
        password: password.trim(),
      },
    });

    const resData = response.data;
    if (!resData) {
      throw new Error('Respuesta vacía del servidor de la UNAJ.');
    }

    if (resData.status !== true) {
      const rawData = resData.data || resData.message || '';
      let errorMsg = 'Credenciales incorrectas o usuario no autorizado.';
      if (rawData === 'Datos incorrectos' || /incorrect/i.test(rawData)) {
        errorMsg = 'Datos incorrectos: el código de estudiante o la contraseña no coinciden.';
      } else if (typeof rawData === 'string' && rawData.trim()) {
        errorMsg = rawData.trim();
      }
      throw new Error(errorMsg);
    }

    return { success: true, data: resData };
  }

  /**
   * 1.1 Extracción de Periodos Académicos Disponibles
   * Consulta el endpoint oficial de periodos académicos de UNAJ
   */
  async fetchAcademicPeriods(): Promise<Array<{ id: string; text: string; name: string; selected: boolean }>> {
    this.availablePeriods = [];
    try {
      const res = await this._request({
        url: `${BASE_URL}/periodos-academicos/disponibles/get`,
      });
      if (Array.isArray(res.data) && res.data.length > 0) {
        this.availablePeriods = res.data.map((item: any) => {
          const rawText = item.text || item.name || item.periodo || '';
          const formatted = formatAcademicPeriod(rawText) || rawText;
          return {
            id: String(item.id || item.periodoId || ''),
            text: rawText,
            name: formatted,
            selected: Boolean(item.selected),
          };
        });

        const activeItem = this.availablePeriods.find((p) => p.selected);
        if (activeItem) {
          this.detectedPeriod = activeItem.name;
        } else if (this.availablePeriods.length > 0) {
          this.detectedPeriod =
            this.availablePeriods[this.availablePeriods.length - 1].name;
        }
      }
    } catch (err: any) {
      console.warn('[UnajScraper PC] Advertencia al consultar periodos académicos:', err.message);
    }
    return this.availablePeriods;
  }

  /**
   * 1.2 Cambiar periodo académico activo en la sesión de UNAJ
   * Endpoint oficial descubierto en el cliente AngularJS de UNAJ:
   * GET /periodos-academicos/disponibles/set/${id}
   */
  async switchAcademicPeriod(periodId: string): Promise<boolean> {
    if (!periodId) return false;
    this.cookies['Term'] = String(periodId);
    try {
      await this._request({
        url: `${BASE_URL}/periodos-academicos/disponibles/set/${periodId}`,
      });
      this.cookies['Term'] = String(periodId);
      return true;
    } catch (e: any) {
      console.warn(`[UnajScraper PC] Error al cambiar a periodo ${periodId}:`, e.message);
      this.cookies['Term'] = String(periodId);
      return false;
    }
  }

  /**
   * 2. Extracción de Asignaturas de TODOS los periodos académicos disponibles
   * Cambia la sesión a cada periodo (ej. 2026-I, 2026-II) y consulta los endpoints:
   * - /web/user/info/courseinrole
   * - /web/user/info/system/courseinrole
   * - /web/course/list
   */
  async fetchCourses(): Promise<ScrapedCourse[]> {
    // Consultar todos los periodos académicos disponibles primero
    await this.fetchAcademicPeriods();

    const endpoints = [
      '/web/user/info/courseinrole',
      '/web/user/info/system/courseinrole',
      '/web/course/list',
    ];

    const coursesMap = new Map<string, ScrapedCourse>();

    const initialActivePeriod =
      this.availablePeriods.find((p) => p.selected) ||
      this.availablePeriods[this.availablePeriods.length - 1];

    if (this.availablePeriods && this.availablePeriods.length > 0) {
      for (const period of this.availablePeriods) {
        // Cambiar el periodo activo en la sesión de UNAJ
        await this.switchAcademicPeriod(period.id);

        for (const ep of endpoints) {
          try {
            const res = await this._request({ url: `${BASE_URL}${ep}` });
            this._parseCoursesFromData(res.data, coursesMap, period);
          } catch (err: any) {
            console.warn(
              `[UnajScraper PC] Advertencia consultando ${ep} en ${period.name}:`,
              err.message
            );
          }
        }
      }

      // Restaurar el periodo inicial seleccionado
      if (initialActivePeriod) {
        await this.switchAcademicPeriod(initialActivePeriod.id);
      }
    } else {
      for (const ep of endpoints) {
        try {
          const res = await this._request({ url: `${BASE_URL}${ep}` });
          this._parseCoursesFromData(res.data, coursesMap, null);
        } catch (err: any) {
          console.warn(`[UnajScraper PC] Advertencia consultando ${ep}:`, err.message);
        }
      }
    }

    return Array.from(coursesMap.values());
  }

  private _parseCoursesFromData(
    data: any,
    coursesMap: Map<string, ScrapedCourse>,
    currentPeriod: { id: string; name: string; selected?: boolean } | null = null
  ) {
    if (!data) return;

    if (!this.detectedPeriod && typeof data === 'object') {
      const rawPeriod =
        data.periodo ||
        data.period ||
        data.des_periodo ||
        data.semestre ||
        data.ciclo ||
        data.academicPeriod ||
        (data.tempo ? (data.tempo.period || data.tempo.des_periodo || data.tempo.semestre) : null);
      if (rawPeriod) {
        const p = formatAcademicPeriod(rawPeriod);
        if (p) this.detectedPeriod = p;
      }
    }

    let list: any[] | null = null;
    if (Array.isArray(data)) {
      list = data;
    } else if (typeof data === 'object') {
      list =
        data.data ||
        data.courses ||
        data.LstCourses ||
        data.LstCourse ||
        data.items ||
        (data.tempo ? data.tempo.LstCourses : null);
    }

    if (Array.isArray(list) && list.length > 0) {
      list.forEach((item) => {
        if (!item || typeof item !== 'object') return;

        let itemPeriodName = currentPeriod ? currentPeriod.name : null;
        let itemPeriodId = currentPeriod ? currentPeriod.id : null;
        let isCurrentPeriod = currentPeriod ? Boolean(currentPeriod.selected) : true;

        if (!itemPeriodName) {
          const itemPeriod =
            item.periodo ||
            item.period ||
            item.des_periodo ||
            item.semestre ||
            item.ciclo ||
            item.academicPeriod;
          if (itemPeriod) {
            itemPeriodName = formatAcademicPeriod(itemPeriod);
          }
        }

        const name =
          item.courseName ||
          item.name ||
          item.course ||
          item.nombre ||
          item.asignatura ||
          item.title ||
          item.des_curso ||
          '';
        const code =
          item.courseCode || item.code || item.codigo || item.cod_curso || item.id_curso || '';
        const sectionId =
          item.s ||
          item.sectionId ||
          item.section_id ||
          item.sec_id ||
          item.section ||
          item.id ||
          '';

        if (name && sectionId) {
          const key = String(sectionId);
          if (!coursesMap.has(key)) {
            coursesMap.set(key, {
              name: String(name).trim(),
              code: String(code).trim(),
              sectionId: key,
              periodName: itemPeriodName || this.detectedPeriod || getDefaultAcademicPeriod(),
              periodId: itemPeriodId || undefined,
              isCurrentPeriod,
            });
          }
        }
      });
      return;
    }

    if (typeof data === 'string') {
      if (!this.detectedPeriod) {
        const pMatch =
          data.match(/(?:periodo|semestre|ciclo)[^<>\n\r]{0,40}?(202\d\s*[-_./]?\s*(?:SEMESTRE\s*)?(?:III|II|I|[1-3]|0))/i) ||
          data.match(/\b(202\d\s*[-_./]\s*(?:III|II|I|[1-3]))\b/i);
        if (pMatch) {
          const p = formatAcademicPeriod(pMatch[1] || pMatch[0]);
          if (p) this.detectedPeriod = p;
        }
      }

      try {
        const root = parse(data);
        const links = root.querySelectorAll('a');
        links.forEach((a) => {
          const href = a.getAttribute('href') || '';
          const sMatch = href.match(/[?&]s=([a-zA-Z0-9_-]+)/);
          if (sMatch) {
            const sectionId = sMatch[1];
            const name = a.text.trim();
            if (name && sectionId && !coursesMap.has(sectionId)) {
              coursesMap.set(sectionId, {
                name,
                code: '',
                sectionId,
                periodName: currentPeriod ? currentPeriod.name : (this.detectedPeriod || getDefaultAcademicPeriod()),
                periodId: currentPeriod ? currentPeriod.id : undefined,
                isCurrentPeriod: currentPeriod ? Boolean(currentPeriod.selected) : true,
              });
            }
          }
        });
      } catch (_) {}

      const regexSection =
        /(?:href=["'][^"']*?[?&]s=|loadFile\([^,]+,[^,]+,['"]?)([a-zA-Z0-9_-]+)/g;
      let match;
      while ((match = regexSection.exec(data)) !== null) {
        const sectionId = match[1];
        if (!coursesMap.has(sectionId)) {
          coursesMap.set(sectionId, {
            name: `Curso ${sectionId}`,
            code: '',
            sectionId,
            periodName: currentPeriod ? currentPeriod.name : (this.detectedPeriod || getDefaultAcademicPeriod()),
            periodId: currentPeriod ? currentPeriod.id : undefined,
            isCurrentPeriod: currentPeriod ? Boolean(currentPeriod.selected) : true,
          });
        }
      }
    }
  }

  /**
   * 3. Extracción de Unidades, Semanas y Archivos por cada curso
   * Consulta endpoints autenticados de UNAJ y analiza JSON + HTML
   */
  async fetchCourseDetails(sectionId: string) {
    const urls = [
      `${BASE_URL}/web/unit/${sectionId}/get?s=${sectionId}`,
      `${BASE_URL}/web/section/get?s=${sectionId}`,
      `${BASE_URL}/web/unit?s=${sectionId}`,
      `${BASE_URL}/web/unit/list?s=${sectionId}`,
      `${BASE_URL}/web/unit/get?s=${sectionId}`,
      `${BASE_URL}/web/syllabus/get?s=${sectionId}`,
      `${BASE_URL}/web/syllabus?s=${sectionId}`,
      `${BASE_URL}/web/course/details?s=${sectionId}`,
    ];

    let combinedHtml = '';
    let parsedJsonUnits: any[] = [];
    let rootLevelWeeks: any[] = [];
    let rootLevelFiles: any[] = [];
    const extractedFiles: Array<{ src: string; name: string; unitRef: string | null; weekNum?: number }> = [];
    const detectedWeekTitles = new Map<number, string>();

    for (const url of urls) {
      try {
        const res = await this._request({ url });
        if (!res) continue;
        const data = res.data;
        if (!data) continue;

        if (Array.isArray(data)) {
          if (data.length > 0) {
            const first = data[0];
            const isWeekList =
              first &&
              (first.weekNumber || first.nro_semana || first.semana) &&
              !first.des_unidad &&
              !first.LstWeeks &&
              !first.weeks;
            if (isWeekList) {
              rootLevelWeeks.push(...data);
            } else {
              parsedJsonUnits.push(...data);
            }
          }
          combinedHtml += ' ' + JSON.stringify(data);
        } else if (typeof data === 'object') {
          if (!this.detectedPeriod) {
            const rawPeriod =
              data.periodo ||
              data.period ||
              data.des_periodo ||
              data.semestre ||
              data.ciclo ||
              data.academicPeriod ||
              data.tempo?.period ||
              data.tempo?.des_periodo ||
              data.tempo?.semestre;
            if (rawPeriod) {
              const p = formatAcademicPeriod(rawPeriod);
              if (p) this.detectedPeriod = p;
            }
          }

          const uList =
            data.tempo?.LstUnits ||
            data.LstUnits ||
            data.units ||
            data.unidades ||
            data.LstUnidades ||
            data.data?.LstUnits ||
            data.data?.units ||
            data.data?.unidades ||
            (Array.isArray(data.data) ? data.data : null) ||
            (Array.isArray(data.result) ? data.result : null) ||
            (Array.isArray(data.items) ? data.items : null);

          if (Array.isArray(uList) && uList.length > 0) {
            parsedJsonUnits.push(...uList);
          }

          const wList =
            data.tempo?.LstWeeks ||
            data.LstWeeks ||
            data.weeks ||
            data.semanas ||
            data.temas ||
            data.LstTemas ||
            data.data?.LstWeeks ||
            data.data?.weeks;

          if (Array.isArray(wList) && wList.length > 0) {
            rootLevelWeeks.push(...wList);
          }

          const fList =
            data.tempo?.LstFiles ||
            data.LstFiles ||
            data.files ||
            data.archivos ||
            data.materiales ||
            data.data?.LstFiles ||
            data.data?.files;

          if (Array.isArray(fList) && fList.length > 0) {
            rootLevelFiles.push(...fList);
          }

          combinedHtml += ' ' + JSON.stringify(data);
        } else if (typeof data === 'string') {
          combinedHtml += ' ' + data;
        }
      } catch (_) {
        // endpoint no disponible o formato alternativo
      }
    }

    if (!this.detectedPeriod && combinedHtml) {
      const pMatch =
        combinedHtml.match(
          /(?:periodo|semestre|ciclo)[^<>\n\r]{0,40}?(202\d\s*[-_./]?\s*(?:SEMESTRE\s*)?(?:III|II|I|[1-3]|0))/i
        ) || combinedHtml.match(/\b(202\d\s*[-_./]\s*(?:III|II|I|[1-3]))\b/i);
      if (pMatch) {
        const p = formatAcademicPeriod(pMatch[1] || pMatch[0]);
        if (p) this.detectedPeriod = p;
      }
    }

    // A. Detectar títulos y nombres de semanas desde HTML y scripts
    const weekTitleRegex =
      /(?:semana|sem|s)\s*0?(\d{1,2})\s*[:–—.-]\s*([^\r\n<>"'{}\[\]]{2,100})/gi;
    let wtMatch: RegExpExecArray | null;
    while ((wtMatch = weekTitleRegex.exec(combinedHtml)) !== null) {
      const wNum = parseInt(wtMatch[1], 10);
      const rawTitle = wtMatch[2].trim();
      if (wNum >= 1 && wNum <= 25 && rawTitle && !detectedWeekTitles.has(wNum)) {
        const cleaned = cleanWeekName(rawTitle, wNum);
        if (cleaned.length >= 2) {
          detectedWeekTitles.set(wNum, cleaned);
        }
      }
    }

    try {
      const root = parse(combinedHtml);
      const weekElements = root.querySelectorAll(
        'h2, h3, h4, h5, h6, .semana, .semana-title, .panel-heading, .card-header, strong, b, td, tr, li, p'
      );
      weekElements.forEach((el) => {
        const text = el.text.trim();
        const m = text.match(/(?:semana|sem|s)\s*0?(\d{1,2})\s*[:–—.-]\s*(.+)/i);
        if (m) {
          const wNum = parseInt(m[1], 10);
          const cleaned = cleanWeekName(m[2], wNum);
          if (
            wNum >= 1 &&
            wNum <= 25 &&
            cleaned.length >= 2 &&
            !detectedWeekTitles.has(wNum)
          ) {
            detectedWeekTitles.set(wNum, cleaned);
          }
        }
      });
    } catch (_) {}

    // B. Detectar tempo.LstUnits o LstWeeks desde scripts si no llegaron por JSON
    if (parsedJsonUnits.length === 0 && combinedHtml) {
      const tempoUnitsMatch = combinedHtml.match(
        /(?:tempo\.LstUnits|LstUnits|units)\s*[:=]\s*(\[[^;]+?\]);/
      );
      if (tempoUnitsMatch) {
        try {
          const jsonArr = JSON.parse(tempoUnitsMatch[1]);
          if (Array.isArray(jsonArr) && jsonArr.length > 0) {
            parsedJsonUnits.push(...jsonArr);
          }
        } catch (_) {}
      }

      const tempoWeeksMatch = combinedHtml.match(
        /(?:tempo\.LstWeeks|LstWeeks|weeks)\s*[:=]\s*(\[[^;]+?\]);/
      );
      if (tempoWeeksMatch) {
        try {
          const jsonArr = JSON.parse(tempoWeeksMatch[1]);
          if (Array.isArray(jsonArr) && jsonArr.length > 0) {
            rootLevelWeeks.push(...jsonArr);
          }
        } catch (_) {}
      }
    }

    // Deduplicar parsedJsonUnits
    const uniqueJsonUnits: any[] = [];
    const seenUnitKeys = new Set<string>();
    for (const u of parsedJsonUnits) {
      const key = String(
        u.id ||
          u.idUnit ||
          u.id_unidad ||
          u.title ||
          u.name ||
          u.nombre ||
          u.des_unidad ||
          ''
      ).trim();
      if (!key || !seenUnitKeys.has(key)) {
        if (key) seenUnitKeys.add(key);
        uniqueJsonUnits.push(u);
      }
    }

    let unitsList: Array<{
      title: string;
      startWeek?: any;
      endWeek?: any;
      rawFiles: any[];
      explicitWeeks: any[] | null;
    }> = [];

    if (uniqueJsonUnits.length > 0) {
      let runningWeekNumber = 1;
      unitsList = await Promise.all(
        uniqueJsonUnits.map(async (u, idx) => {
          const uId = u.id || u.idUnit || u.id_unidad || idx + 1;
          const rawWeeks =
            u.contents ||
            u.LstContents ||
            u.LstWeeks ||
            u.weeks ||
            u.semanas ||
            u.sessions ||
            u.sesiones ||
            u.temas ||
            u.LstTemas ||
            u.contenidos ||
            u.LstContenidos;

          let parsedWeeks = null;
          if (Array.isArray(rawWeeks) && rawWeeks.length > 0) {
            parsedWeeks = await Promise.all(
              rawWeeks.map(async (w: any, wIdx: number) => {
                let wNum = null;
                const rawName =
                  w.name ||
                  w.title ||
                  w.nombre ||
                  w.tema ||
                  w.des_semana ||
                  w.descripcion ||
                  w.topic ||
                  '';
                const m = rawName
                  ? rawName.match(/(?:semana|sem|s)\s*0?(\d{1,2})/i)
                  : null;
                if (m) {
                  wNum = parseInt(m[1], 10);
                } else if (
                  w.weekNumber ||
                  w.nro ||
                  w.semana ||
                  w.numero ||
                  w.nro_semana
                ) {
                  wNum = parseInt(
                    w.weekNumber ||
                      w.nro ||
                      w.semana ||
                      w.numero ||
                      w.nro_semana,
                    10
                  );
                } else {
                  wNum = runningWeekNumber;
                }
                runningWeekNumber = Math.max(runningWeekNumber + 1, wNum + 1);

                let cleaned = cleanWeekName(rawName, wNum);

                if (!cleaned && w.description) {
                  const dClean = cleanWeekName(w.description, wNum);
                  if (dClean && !dClean.match(/^(?:semana|sem)\s*\d+$/i)) {
                    cleaned = dClean;
                  }
                }

                let rawFiles =
                  w.files || w.LstFiles || w.archivos || w.materiales || [];

                // Si la semana tiene ID de contenido en UNAJ, consultar sus archivos reales
                if (w.id && typeof w.id === 'string' && rawFiles.length === 0) {
                  try {
                    const actRes = await this._request({
                      url: `${BASE_URL}/web/unit/contenidos/${w.id}`,
                    });
                    if (Array.isArray(actRes.data)) {
                      rawFiles = actRes.data.map((act: any) => {
                        let fileUrl = act.url;
                        let fileName = act.name || 'Material de clase';

                        let extFromUrl = '';
                        if (fileUrl) {
                          const cleanUrlPath = fileUrl
                            .split('?')[0]
                            .replace(/\\/g, '/');
                          const parts = cleanUrlPath.split('.');
                          if (parts.length > 1) {
                            extFromUrl = parts.pop().toLowerCase();
                          }
                        }

                        // Endpoint oficial de descarga en UNAJ
                        if (act.id && act.type !== 1) {
                          fileUrl = `${BASE_URL}/web/unit/archivo/${act.id}`;
                        } else if (fileUrl && fileUrl.startsWith('http')) {
                          // Enlace externo (Google Classroom, Drive, web, etc.)
                        } else if (act.id) {
                          fileUrl = `${BASE_URL}/web/unit/archivo/${act.id}`;
                        }

                        if (
                          extFromUrl &&
                          !fileName.toLowerCase().endsWith(`.${extFromUrl}`) &&
                          extFromUrl.length <= 5
                        ) {
                          fileName = `${fileName}.${extFromUrl}`;
                        }

                        const category = getFileCategory(fileName);

                        return {
                          id: `file_${act.id || Date.now()}_${Math.random()
                            .toString(36)
                            .slice(2, 6)}`,
                          name: fileName,
                          src: fileUrl,
                          uri: fileUrl,
                          category,
                          activity: act.activity || 'Material de clase',
                          size: act.size || 0,
                        };
                      });

                      // Si cleaned aún está vacío, intentar inferir tema desde la primera actividad descriptiva
                      if (!cleaned && rawFiles.length > 0) {
                        for (const act of rawFiles) {
                          const actTitle = (act.name || act.activity || '')
                            .replace(/\.[a-zA-Z0-9]{2,5}$/, '')
                            .replace(/\s*\((?:unit|homework|forum|evaluacion)\)$/i, '')
                            .trim();
                          const actClean = cleanWeekName(actTitle, wNum);
                          if (
                            actClean &&
                            !actClean.match(/^(?:semana|sem)\s*\d+$/i) &&
                            actClean.length >= 3
                          ) {
                            cleaned = actClean;
                            break;
                          }
                        }
                      }
                    }
                  } catch (actErr: any) {
                    // Silencioso en caso de error
                  }
                }

                if (cleaned && !detectedWeekTitles.has(wNum)) {
                  detectedWeekTitles.set(wNum, cleaned);
                }

                return {
                  weekNumber: wNum,
                  name: cleaned,
                  title: cleaned
                    ? `Semana ${wNum}: ${cleaned}`
                    : `Semana ${wNum}`,
                  completed: false,
                  rawFiles,
                  files: rawFiles,
                };
              })
            );
          } else if (rootLevelWeeks.length > 0) {
            const matchingWeeks = rootLevelWeeks.filter((w) => {
              const wUnitId =
                w.idUnit ||
                w.unitId ||
                w.id_unidad ||
                w.unit ||
                w.unidad ||
                w.nroUnidad ||
                w.nro_unidad;
              return (
                wUnitId &&
                (String(wUnitId) === String(uId) || Number(wUnitId) === idx + 1)
              );
            });
            if (matchingWeeks.length > 0) {
              parsedWeeks = matchingWeeks.map((w: any, wIdx: number) => {
                const wNum = parseInt(
                  w.weekNumber ||
                    w.nro ||
                    w.semana ||
                    w.numero ||
                    w.nro_semana ||
                    wIdx + 1,
                  10
                );
                const rawTitle =
                  w.name ||
                  w.title ||
                  w.nombre ||
                  w.tema ||
                  w.des_semana ||
                  w.descripcion ||
                  w.topic ||
                  detectedWeekTitles.get(wNum) ||
                  '';
                const cleaned = cleanWeekName(rawTitle, wNum);
                if (cleaned && !detectedWeekTitles.has(wNum)) {
                  detectedWeekTitles.set(wNum, cleaned);
                }
                const rawFiles =
                  w.files || w.LstFiles || w.archivos || w.materiales || [];
                return {
                  weekNumber: wNum,
                  name: cleaned,
                  title: cleaned
                    ? `Semana ${wNum}: ${cleaned}`
                    : `Semana ${wNum}`,
                  completed: false,
                  rawFiles,
                  files: rawFiles,
                };
              });
            }
          }

          return {
            title:
              u.title ||
              u.name ||
              u.nombre ||
              u.des_unidad ||
              u.denominacion ||
              `Unidad ${idx + 1}`,
            startWeek: u.startWeek || u.semana_inicio || u.semanaInicio || null,
            endWeek: u.endWeek || u.semana_fin || u.semanaFin || null,
            rawFiles: u.LstFiles || u.files || u.archivos || [],
            explicitWeeks: parsedWeeks,
          };
        })
      );
    }

    // C. Si no hay unidades desde JSON, analizar DOM de HTML
    if (unitsList.length === 0 && combinedHtml) {
      try {
        const root = parse(combinedHtml);

        // 1. Contenedores de Unidad (.panel, .box, .card, .unit, .accordion)
        const containerEls = root.querySelectorAll(
          '.panel, .box, .card, .unit, .unit-card, .accordion-group, .accordion-item, .nav-tabs-custom, fieldset'
        );
        const seenDomUnitTitles = new Set<string>();

        containerEls.forEach((container, cIdx) => {
          const headerEl = container.querySelector(
            '.panel-heading, .box-header, .card-header, h1, h2, h3, h4, h5, legend, strong, b, .title'
          );
          const headerText = headerEl ? headerEl.text.trim() : '';
          const normTitle = normalizeStr(headerText);
          if (
            (/unidad\s*([0-9ivxlc]+|[1-9])/i.test(headerText) ||
            /m[oó]dulo\s*([0-9ivxlc]+|[1-9])/i.test(headerText)) &&
            normTitle &&
            !seenDomUnitTitles.has(normTitle)
          ) {
            seenDomUnitTitles.add(normTitle);
            const unitWeeks: any[] = [];
            const weekEls = container.querySelectorAll(
              'h2, h3, h4, h5, h6, .semana, .semana-title, .timeline-item, tr, li, p, div'
            );
            const seenWeeksInUnit = new Set<number>();
            weekEls.forEach((wel) => {
              const wtext = wel.text.trim();
              const wm = wtext.match(
                /(?:semana|sem|s)\s*0?(\d{1,2})\s*[:–—.-]?\s*(.*)/i
              );
              if (wm) {
                const wNum = parseInt(wm[1], 10);
                if (wNum >= 1 && wNum <= 25 && !seenWeeksInUnit.has(wNum)) {
                  seenWeeksInUnit.add(wNum);
                  const wName = cleanWeekName(wm[2] || '', wNum);
                  unitWeeks.push({
                    weekNumber: wNum,
                    name: wName,
                    title: wName ? `Semana ${wNum}: ${wName}` : `Semana ${wNum}`,
                    completed: false,
                    rawFiles: [],
                  });
                  if (wName) detectedWeekTitles.set(wNum, wName);
                }
              }
            });

            const unitFiles: any[] = [];
            const containerHtml = container.innerHTML || '';
            let cMatch: RegExpExecArray | null;
            const cLoadFileRegex =
              /loadFile\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`](?:\s*,\s*['"`]?([^'"`\),]+)['"`]?)?\s*\)/gi;
            while ((cMatch = cLoadFileRegex.exec(containerHtml)) !== null) {
              let src = cMatch[1].trim();
              const name = cMatch[2].trim();
              if (!src.startsWith('http')) {
                src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
              }
              unitFiles.push({ src, name, unitRef: String(cIdx + 1) });
            }

            unitsList.push({
              title: headerText,
              explicitWeeks: unitWeeks.length > 0 ? unitWeeks : null,
              rawFiles: unitFiles,
            });
          }
        });

        // 2. Travesía lineal si no hubo contenedores de panel
        if (unitsList.length === 0) {
          const elements = root.querySelectorAll(
            'h1, h2, h3, h4, h5, h6, .unit-header, .card-header, .panel-heading, p, div, li, tr'
          );
          let currentDomUnit: any = null;
          const seenLinearUnitTitles = new Set<string>();

          elements.forEach((el) => {
            const text = el.text.trim();
            const normText = normalizeStr(text);
            const unitMatch = text.match(
              /^(?:unidad|m[oó]dulo)\s*([0-9ivxlc]+|[1-9])\s*[:–—.-]?\s*(.*)/i
            );
            if (unitMatch && text.length < 150 && !seenLinearUnitTitles.has(normText)) {
              seenLinearUnitTitles.add(normText);
              currentDomUnit = {
                title: text,
                explicitWeeks: [],
                rawFiles: [],
              };
              unitsList.push(currentDomUnit);
              return;
            }

            if (currentDomUnit) {
              const weekMatch = text.match(
                /(?:semana|sem|s)\s*0?(\d{1,2})\s*[:–—.-]?\s*(.*)/i
              );
              if (weekMatch && text.length < 150) {
                const wNum = parseInt(weekMatch[1], 10);
                if (wNum >= 1 && wNum <= 25) {
                  const already = currentDomUnit.explicitWeeks.find(
                    (w: any) => w.weekNumber === wNum
                  );
                  if (!already) {
                    const wName = cleanWeekName(weekMatch[2] || '', wNum);
                    currentDomUnit.explicitWeeks.push({
                      weekNumber: wNum,
                      name: wName,
                      title: wName
                        ? `Semana ${wNum}: ${wName}`
                        : `Semana ${wNum}`,
                      completed: false,
                      rawFiles: [],
                    });
                    if (wName) detectedWeekTitles.set(wNum, wName);
                  }
                }
              }
            }
          });
        }
      } catch (_) {}
    }

    // D. Si no se encontraron unidades pero hay semanas detectadas
    if (unitsList.length === 0) {
      if (detectedWeekTitles.size > 0) {
        const sortedWeeks = Array.from(detectedWeekTitles.keys()).sort(
          (a, b) => a - b
        );
        const maxWeek = sortedWeeks[sortedWeeks.length - 1] || 17;
        const midWeek = Math.ceil(maxWeek / 2);

        const w1 = sortedWeeks
          .filter((w) => w <= midWeek)
          .map((w) => ({
            weekNumber: w,
            name: detectedWeekTitles.get(w) || '',
            title: `Semana ${w}: ${detectedWeekTitles.get(w)}`,
            completed: false,
            rawFiles: [],
          }));
        const w2 = sortedWeeks
          .filter((w) => w > midWeek)
          .map((w) => ({
            weekNumber: w,
            name: detectedWeekTitles.get(w) || '',
            title: `Semana ${w}: ${detectedWeekTitles.get(w)}`,
            completed: false,
            rawFiles: [],
          }));

        unitsList = [
          {
            title: 'Unidad I: Fundamentos y Conceptos Clave',
            explicitWeeks: w1.length > 0 ? w1 : null,
            rawFiles: [],
          },
          {
            title: 'Unidad II: Desarrollo y Aplicación Práctica',
            explicitWeeks: w2.length > 0 ? w2 : null,
            rawFiles: [],
          },
        ];
      } else {
        unitsList = [
          {
            title: 'Unidad I: Generalidades y Fundamentos',
            explicitWeeks: null,
            rawFiles: [],
          },
          {
            title: 'Unidad II: Profundización y Aplicación',
            explicitWeeks: null,
            rawFiles: [],
          },
        ];
      }
    }

    // E. Extraer TODOS los archivos adjuntos mediante regex
    // a) loadFile
    const loadFileRegex =
      /loadFile\s*\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`](?:\s*,\s*['"`]?([^'"`\),]+)['"`]?)?\s*\)/gi;
    let match: RegExpExecArray | null;
    while ((match = loadFileRegex.exec(combinedHtml)) !== null) {
      let src = match[1].trim();
      const name = match[2].trim();
      const unitRef = match[3] ? match[3].trim() : null;

      if (!src.startsWith('http')) {
        src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
      }
      extractedFiles.push({ src, name, unitRef });
    }

    // b) Enlaces a /archivos/
    const archivosRegex =
      /(?:href|src)\s*=\s*['"`]([^'"`]*\/archivos\/[^'"`]+)['"`]/gi;
    while ((match = archivosRegex.exec(combinedHtml)) !== null) {
      let src = match[1].trim();
      const fileName = decodeURIComponent(
        src.split('/').pop()?.split('?')[0] || 'Archivo'
      );
      if (!src.startsWith('http')) {
        src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
      }
      extractedFiles.push({ src, name: fileName, unitRef: null });
    }

    // c) Enlaces a extensiones de documentos
    const docLinksRegex =
      /(?:href|src)\s*=\s*['"`]([^'"`]+\.(?:pdf|docx?|xlsx?|pptx?|zip|rar|txt)(?:\?[^'"`]*)?)['"`]/gi;
    while ((match = docLinksRegex.exec(combinedHtml)) !== null) {
      let src = match[1].trim();
      if (!src.startsWith('javascript') && !src.startsWith('#')) {
        const fileName = decodeURIComponent(
          src.split('/').pop()?.split('?')[0] || 'Archivo'
        );
        if (!src.startsWith('http')) {
          src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
        }
        extractedFiles.push({ src, name: fileName, unitRef: null });
      }
    }

    // d) Archivos de nivel raíz encontrados en JSON
    rootLevelFiles.forEach((rf: any) => {
      let src = rf.url || rf.src || rf.path || rf.archivo || '';
      let name = rf.name || rf.fileName || rf.title || rf.nombre || '';
      if (src) {
        if (!src.startsWith('http')) {
          src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
        }
        if (!name) {
          name = decodeURIComponent(src.split('/').pop()?.split('?')[0] || 'Archivo');
        }
        extractedFiles.push({
          src,
          name,
          unitRef: rf.idUnit || rf.unitId || rf.unidad || null,
          weekNum: rf.weekNumber || rf.idWeek || rf.weekId || rf.semana || null,
        });
      }
    });

    // e) Archivos dentro de rawFiles de cada unidad JSON
    unitsList.forEach((u, uIdx) => {
      if (Array.isArray(u.rawFiles)) {
        u.rawFiles.forEach((rf: any) => {
          let src = rf.url || rf.src || rf.path || rf.archivo || '';
          let name = rf.name || rf.fileName || rf.title || rf.nombre || '';
          if (src) {
            if (!src.startsWith('http')) {
              src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
            }
            if (!name) {
              name = decodeURIComponent(
                src.split('/').pop()?.split('?')[0] || 'Archivo'
              );
            }
            extractedFiles.push({
              src,
              name,
              unitRef: String(uIdx + 1),
            });
          }
        });
      }

      if (Array.isArray(u.explicitWeeks)) {
        u.explicitWeeks.forEach((ew: any) => {
          if (Array.isArray(ew.rawFiles)) {
            ew.rawFiles.forEach((rf: any) => {
              let src = rf.url || rf.src || rf.path || rf.archivo || '';
              let name = rf.name || rf.fileName || rf.title || rf.nombre || '';
              if (src) {
                if (!src.startsWith('http')) {
                  src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
                }
                if (!name) {
                  name = decodeURIComponent(
                    src.split('/').pop()?.split('?')[0] || 'Archivo'
                  );
                }
                extractedFiles.push({
                  src,
                  name,
                  unitRef: String(uIdx + 1),
                  weekNum: ew.weekNumber,
                });
              }
            });
          }
        });
      }
    });

    // F. Estructuración inteligente de Unidades y Semanas
    const distribution = calculateWeekDistribution(unitsList.length);

    const structuredUnits = unitsList.map((unit, idx) => {
      const dist = distribution[idx] || { start: 1, end: 17 };
      let startW = parseInt(String(dist.start), 10);
      let endW = parseInt(String(dist.end), 10);

      if (unit.startWeek && unit.endWeek) {
        const parsedStart = parseInt(unit.startWeek, 10);
        const parsedEnd = parseInt(unit.endWeek, 10);
        if (!isNaN(parsedStart) && !isNaN(parsedEnd) && parsedStart <= parsedEnd) {
          startW = parsedStart;
          endW = parsedEnd;
        }
      }

      const weekMap = new Map<number, any>();

      // 1. Poblado base de todas las semanas del rango asignado a la unidad
      for (let w = startW; w <= endW; w++) {
        const wName = detectedWeekTitles.get(w) || '';
        const cleaned = cleanWeekName(wName, w);
        weekMap.set(w, {
          weekNumber: w,
          name: cleaned,
          title: cleaned ? `Semana ${w}: ${cleaned}` : `Semana ${w}`,
          completed: false,
          files: [],
          rawFiles: [],
        });
      }

      // 2. Fusionar semanas explícitas detectadas con sus archivos y nombres específicos
      if (Array.isArray(unit.explicitWeeks) && unit.explicitWeeks.length > 0) {
        unit.explicitWeeks.forEach((ew: any) => {
          const wNum = ew.weekNumber;
          if (wNum >= 1 && wNum <= 25) {
            const wName = ew.name || detectedWeekTitles.get(wNum) || '';
            const cleaned = cleanWeekName(wName, wNum);
            const existing = weekMap.get(wNum);
            if (existing) {
              if (cleaned) {
                existing.name = cleaned;
                existing.title = `Semana ${wNum}: ${cleaned}`;
              }
              if (Array.isArray(ew.files) && ew.files.length > 0) {
                existing.files = ew.files;
              }
              if (Array.isArray(ew.rawFiles) && ew.rawFiles.length > 0) {
                existing.rawFiles = ew.rawFiles;
              }
            } else {
              weekMap.set(wNum, {
                weekNumber: wNum,
                name: cleaned,
                title: cleaned ? `Semana ${wNum}: ${cleaned}` : `Semana ${wNum}`,
                completed: false,
                files: Array.isArray(ew.files) ? ew.files : [],
                rawFiles: Array.isArray(ew.rawFiles) ? ew.rawFiles : [],
              });
            }
          }
        });
      }

      const finalWeeks = Array.from(weekMap.values()).sort(
        (a, b) => a.weekNumber - b.weekNumber
      );

      return {
        title: unit.title,
        weeks: finalWeeks,
        totalWeeks: finalWeeks.length,
      };
    });

    // 3. Garantizar que todas las 17 semanas académicas del ciclo estén cubiertas en structuredUnits
    const coveredWeekNums = new Set<number>();
    structuredUnits.forEach((u) => {
      u.weeks.forEach((w) => coveredWeekNums.add(w.weekNumber));
    });

    for (let w = 1; w <= 17; w++) {
      if (!coveredWeekNums.has(w)) {
        let targetIdx = distribution.findIndex((d) => w >= d.start && w <= d.end);
        if (targetIdx === -1) targetIdx = structuredUnits.length - 1;
        if (structuredUnits[targetIdx]) {
          const wName = detectedWeekTitles.get(w) || '';
          const cleaned = cleanWeekName(wName, w);
          structuredUnits[targetIdx].weeks.push({
            weekNumber: w,
            name: cleaned,
            title: cleaned ? `Semana ${w}: ${cleaned}` : `Semana ${w}`,
            completed: false,
            files: [],
            rawFiles: [],
          });
          structuredUnits[targetIdx].weeks.sort((a, b) => a.weekNumber - b.weekNumber);
          structuredUnits[targetIdx].totalWeeks = structuredUnits[targetIdx].weeks.length;
          coveredWeekNums.add(w);
        }
      }
    }

    // Extraer archivos directos que venían en las semanas de structuredUnits
    structuredUnits.forEach((u, uIdx) => {
      u.weeks.forEach((w) => {
        if (Array.isArray(w.rawFiles)) {
          w.rawFiles.forEach((rf: any) => {
            let src = rf.url || rf.src || rf.path || rf.archivo || '';
            let name = rf.name || rf.fileName || rf.title || rf.nombre || '';
            if (src) {
              if (!src.startsWith('http')) {
                src = `${BASE_URL}${src.startsWith('/') ? '' : '/'}${src}`;
              }
              if (!name) {
                name = decodeURIComponent(
                  src.split('/').pop()?.split('?')[0] || 'Archivo'
                );
              }
              extractedFiles.push({
                src,
                name,
                unitRef: String(uIdx + 1),
                weekNum: w.weekNumber,
              });
            }
          });
        }
      });
    });

    // G. Asignar archivos a las semanas correspondientes (soportando múltiples archivos por semana)
    const seenFilesSet = new Set<string>();

    extractedFiles.forEach((file) => {
      if (!file.src) return;
      const fileKey = `${normalizeStr(file.name)}_${file.src}`;
      if (seenFilesSet.has(fileKey)) return;
      seenFilesSet.add(fileKey);

      let targetWeekNum: number | null = file.weekNum || null;

      if (!targetWeekNum) {
        const weekMatch =
          file.name.match(/(?:semana|sem|s)[\s_.-]*0?(\d{1,2})/i) ||
          file.name.match(/\bs0?(\d{1,2})\b/i) ||
          file.name.match(/(?:_s|s)0?(\d{1,2})(?:_|\.|\b)/i) ||
          file.src.match(/(?:semana|sem|s)[\s_.-]*0?(\d{1,2})/i) ||
          file.src.match(/\bs0?(\d{1,2})\b/i);
        if (weekMatch) {
          targetWeekNum = parseInt(weekMatch[1], 10);
        }
      }

      let placed = false;
      if (targetWeekNum && targetWeekNum >= 1 && targetWeekNum <= 25) {
        for (const u of structuredUnits) {
          const foundWeek = u.weeks.find((w) => w.weekNumber === targetWeekNum);
          if (foundWeek) {
            const alreadyExists = foundWeek.files.some(
              (f: any) =>
                normalizeStr(f.name) === normalizeStr(file.name) ||
                (f.src && (f.src === file.src || f.src === (file as any).uri)) ||
                (f.uri && (f.uri === file.src || f.uri === (file as any).uri))
            );
            if (!alreadyExists) {
              foundWeek.files.push(file);
            }
            placed = true;
            break;
          }
        }
      }

      if (!placed) {
        let targetUnit = null;
        if (file.unitRef) {
          const uNum = parseInt(file.unitRef, 10);
          if (uNum && structuredUnits[uNum - 1]) {
            targetUnit = structuredUnits[uNum - 1];
          }
        }
        if (!targetUnit) {
          targetUnit = structuredUnits[0];
        }

        if (targetUnit && targetUnit.weeks.length > 0) {
          const targetWeek = targetUnit.weeks[0];
          const alreadyExists = targetWeek.files.some(
            (f: any) =>
              normalizeStr(f.name) === normalizeStr(file.name) ||
              (f.src && (f.src === file.src || f.src === (file as any).uri)) ||
              (f.uri && (f.uri === file.src || f.uri === (file as any).uri))
          );
          if (!alreadyExists) {
            targetWeek.files.push(file);
          }
        }
      }
    });

    return structuredUnits;
  }

  /**
   * 4. Smart Cascade Merge no destructivo
   */
  async syncAll({
    username,
    password,
    onProgress = () => {},
  }: {
    username: string;
    password: string;
    onProgress?: (message: string, percent: number) => void;
  }): Promise<{ success: boolean; metrics: SyncMetrics }> {
    onProgress('Iniciando sesión en el Aula Virtual UNAJ...', 0.1);
    await this.login(username, password);

    onProgress('Sesión iniciada. Extrayendo asignaturas matriculadas...', 0.25);
    const scrapedCourses = await this.fetchCourses();

    if (!scrapedCourses || scrapedCourses.length === 0) {
      throw new Error('No se encontraron asignaturas activas en su cuenta de la UNAJ.');
    }

    const localCourses = (await StorageService.getCourses()) || [];
    const allUnits = (await StorageService.getCourseUnitsProgress()) || [];

    // Resolver y vincular Periodos / Semestres Académicos detectados
    const detectedPeriodName = this.detectedPeriod || getDefaultAcademicPeriod();
    let semesters = (await StorageService.getSemesters()) || [];

    if (this.availablePeriods && this.availablePeriods.length > 0) {
      for (const p of this.availablePeriods) {
        const normPKey = getStandardPeriodKey(p.name);
        const existingSemIndex = semesters.findIndex(
          (s) => getStandardPeriodKey(s.name) === normPKey
        );
        if (existingSemIndex !== -1) {
          semesters[existingSemIndex] = {
            ...semesters[existingSemIndex],
            isCurrent: Boolean(p.selected),
          };
        } else {
          semesters.push({
            id: `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            name: p.name,
            isCurrent: Boolean(p.selected),
            createdAt: new Date().toISOString(),
          });
        }
      }
    }

    const normTargetKey = getStandardPeriodKey(detectedPeriodName);
    let targetSemester = semesters.find(
      (s) => getStandardPeriodKey(s.name) === normTargetKey
    );

    if (!targetSemester) {
      targetSemester = {
        id: `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        name: detectedPeriodName,
        isCurrent: true,
        createdAt: new Date().toISOString(),
      };
      semesters.push(targetSemester);
    } else {
      targetSemester.isCurrent = true;
    }

    const uniqueSemesters: Semester[] = [];
    const seenSemIds = new Set<string>();
    const seenSemKeys = new Set<string>();
    for (const s of semesters) {
      if (!s || !s.id) continue;
      const sId = String(s.id);
      const sKey = getStandardPeriodKey(s.name);
      if (seenSemIds.has(sId) || (sKey && seenSemKeys.has(sKey))) continue;
      seenSemIds.add(sId);
      if (sKey) seenSemKeys.add(sKey);
      uniqueSemesters.push(s);
    }
    semesters = uniqueSemesters;
    await StorageService.saveSemesters(semesters);

    const activeSemesterId = targetSemester ? targetSemester.id : undefined;

    const evaluatedCourses = scrapedCourses.length;
    let newCoursesCount = 0;
    let newUnitsCount = 0;
    let newWeeksCount = 0;
    let newFilesCount = 0;

    const totalCourses = scrapedCourses.length;
    let processedIndex = 0;

    for (const sc of scrapedCourses) {
      processedIndex++;
      const currentPct = 0.3 + (processedIndex / totalCourses) * 0.55;
      onProgress(
        `Sincronizando ${sc.name} (${processedIndex}/${totalCourses})...`,
        currentPct
      );

      // Paso 1: Cursos (Encontrar semestre exacto correspondiente con getStandardPeriodKey)
      const coursePeriodName =
        sc.periodName || this.detectedPeriod || getDefaultAcademicPeriod();
      const courseNormKey = getStandardPeriodKey(coursePeriodName);
      const matchingSemester =
        semesters.find(
          (s) => getStandardPeriodKey(s.name) === courseNormKey
        ) || targetSemester;

      const courseSemesterId = matchingSemester
        ? matchingSemester.id
        : activeSemesterId;

      const normScrapedName = normalizeStr(sc.name);
      let matchedCourse = localCourses.find((c) => {
        if (sc.code && c.code && normalizeStr(c.code) === normalizeStr(sc.code)) {
          return true;
        }
        return normalizeStr(c.name) === normScrapedName;
      });

      let courseId: string;
      if (matchedCourse) {
        courseId = matchedCourse.id;
        if (courseSemesterId && matchedCourse.semesterId !== courseSemesterId) {
          matchedCourse.semesterId = courseSemesterId;
          await StorageService.updateCourse(courseId, { semesterId: courseSemesterId });
        }
      } else {
        const newCourseObj: Partial<Course> = {
          name: sc.name,
          code: sc.code || '',
          color: COURSE_COLORS[newCoursesCount % COURSE_COLORS.length],
          semesterId: courseSemesterId,
          credits: 4,
        };
        const saved = await StorageService.saveCourse(newCourseObj);
        courseId = saved.id;
        matchedCourse = saved;
        localCourses.push(saved);
        newCoursesCount++;
      }

      // Cambiar al periodo del curso antes de consultar sus unidades y archivos
      if (sc.periodId) {
        await this.switchAcademicPeriod(sc.periodId);
      }

      const courseDetails = await this.fetchCourseDetails(sc.sectionId);
      const existingCourseUnits = allUnits.filter((u) => u.courseId === courseId);

      for (let uIdx = 0; uIdx < courseDetails.length; uIdx++) {
        const scrapedUnit = courseDetails[uIdx];
        const normScrapedUnitTitle = normalizeStr(scrapedUnit.title);

        let targetUnit = existingCourseUnits.find(
          (u) => normalizeStr(u.title) === normScrapedUnitTitle
        );

        if (!targetUnit && existingCourseUnits[uIdx]) {
          targetUnit = existingCourseUnits[uIdx];
          // Si el título local era un placeholder genérico, actualizarlo con el título descriptivo
          if (
            /^(?:unidad\s*[0-9ivxlc]+|unidad\s*[0-9ivxlc]+\s*:\s*generalidades)/i.test(
              targetUnit.title
            ) &&
            scrapedUnit.title
          ) {
            targetUnit.title = scrapedUnit.title;
          }
        }

        if (!targetUnit) {
          targetUnit = {
            id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: scrapedUnit.title,
            courseId: courseId,
            semesterId: courseSemesterId,
            totalWeeks: scrapedUnit.weeks.length,
            weeks: [],
          };
          allUnits.push(targetUnit);
          existingCourseUnits.push(targetUnit);
          newUnitsCount++;
        } else {
          if (courseSemesterId && targetUnit.semesterId !== courseSemesterId) {
            targetUnit.semesterId = courseSemesterId;
          }
        }

        if (!targetUnit.weeks) {
          targetUnit.weeks = [];
        }

        const scrapedWeekNums = new Set(
          scrapedUnit.weeks.map((w) => w.weekNumber)
        );

        for (const scrapedWeek of scrapedUnit.weeks) {
          let targetWeek = targetUnit.weeks.find(
            (w) => w.weekNumber === scrapedWeek.weekNumber
          );

          if (!targetWeek) {
            targetWeek = {
              weekNumber: scrapedWeek.weekNumber,
              name: scrapedWeek.name || '',
              title: scrapedWeek.name
                ? `Semana ${scrapedWeek.weekNumber}: ${scrapedWeek.name}`
                : `Semana ${scrapedWeek.weekNumber}`,
              completed: false,
              files: [],
            };
            targetUnit.weeks.push(targetWeek);
            newWeeksCount++;
          } else {
            if (scrapedWeek.name) {
              targetWeek.name = scrapedWeek.name;
              targetWeek.title = `Semana ${scrapedWeek.weekNumber}: ${scrapedWeek.name}`;
            }
          }

          if (!targetWeek.files) {
            targetWeek.files = [];
          }

          for (const scrapedFile of scrapedWeek.files) {
            const normScrapedFileName = normalizeStr(scrapedFile.name);
            const exists = targetWeek.files.some(
              (f) =>
                normalizeStr(f.name) === normScrapedFileName ||
                (scrapedFile.src && f.uri === scrapedFile.src)
            );

            if (!exists) {
              const fileCategory = getFileCategory(scrapedFile.name);
              const newFile: UniversityFile = {
                id: `file_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                name: scrapedFile.name,
                uri: scrapedFile.src,
                type: fileCategory,
                size: 0,
                addedAt: new Date().toISOString(),
              };
              targetWeek.files.push(newFile);
              newFilesCount++;
            }
          }
        }

        // Limpiar semanas vacías residuales de distribuciones dummy anteriores
        if (scrapedUnit.weeks.length > 0) {
          targetUnit.weeks = targetUnit.weeks.filter((w) => {
            if (scrapedWeekNums.has(w.weekNumber)) return true;
            const hasUserData =
              Boolean(w.completed) ||
              (w.notes && w.notes.trim().length > 0) ||
              (Array.isArray(w.files) && w.files.length > 0);
            return hasUserData;
          });
        }

        targetUnit.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
        targetUnit.totalWeeks = targetUnit.weeks.length;
      }
    }

    onProgress('Guardando cambios en OrgPro PC...', 0.95);
    await StorageService.saveCourseUnitsProgress(allUnits);
    StorageService.emit('DATA_UPDATED');

    onProgress('¡Sincronización finalizada con éxito!', 1.0);

    return {
      success: true,
      metrics: {
        evaluatedCourses,
        newCoursesCount,
        newUnitsCount,
        newWeeksCount,
        newFilesCount,
        detectedSemester: detectedPeriodName,
        availablePeriods:
          this.availablePeriods && this.availablePeriods.length > 0
            ? this.availablePeriods.map((p) => p.name)
            : [detectedPeriodName],
      },
    };
  }
}

export default new UnajScraperService();
