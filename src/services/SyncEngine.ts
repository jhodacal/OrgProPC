import StorageService, { STORAGE_KEYS } from './StorageService';
import AudioService from './AudioService';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncTime: number | null;
  pendingOutboxCount: number;
  syncServerUrl: string;
  pairingCode: string;
  cloudVaultId: string;
  error: string | null;
  mode: 'cloud' | 'lan' | 'offline';
}

type SyncStatusListener = (status: SyncStatus) => void;

class SyncEngine {
  private isOnline: boolean = typeof navigator !== 'undefined' ? navigator.onLine : true;
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private syncServerUrl: string = 'http://localhost:48920';
  private cloudVaultId: string = 'orgpro_sync_jhodacal_vault';
  private pairingCode: string = 'JHODACAL-2026';
  private listeners: Set<SyncStatusListener> = new Set();
  private pollInterval: any = null;
  private sseSource: EventSource | null = null;
  private deviceId: string = '';

  constructor() {
    this.init();
  }

  private async getDeviceId(): Promise<string> {
    if (this.deviceId) return this.deviceId;
    try {
      let id = await StorageService.get<string>('@orgpro_device_id');
      if (!id) {
        id = `device_pc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        await StorageService.save('@orgpro_device_id', id);
      }
      this.deviceId = id;
    } catch (_) {
      this.deviceId = `device_pc_${Date.now()}`;
    }
    return this.deviceId;
  }

  private async init() {
    if (typeof window !== 'undefined') {
      await this.getDeviceId();

      window.addEventListener('online', () => {
        this.isOnline = true;
        this.notify();
        this.syncNow(false);
        this.setupRealtimeCloudListener();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.notify();
        this.closeSse();
      });

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.isOnline) {
          this.setupRealtimeCloudListener();
          this.syncNow(false);
        }
      });

      // Handle power suspension (laptop lid close, sleep)
      if ((window as any).electronAPI?.onPowerSuspend) {
        (window as any).electronAPI.onPowerSuspend(() => {
          this.closeSse();
        });
      }

      // Handle power resume (waking up from sleep)
      if ((window as any).electronAPI?.onPowerResume) {
        (window as any).electronAPI.onPowerResume(() => {
          this.isOnline = true;
          this.setupRealtimeCloudListener();
          this.syncNow(false);
        });
      }

      // Periodic Auto-Sync (every 15 seconds when online)
      this.pollInterval = setInterval(() => {
        if (this.isOnline && !this.isSyncing) {
          this.syncNow(false);
        }
      }, 15000);

      // Auto-push on local changes
      StorageService.on('DATA_UPDATED', () => {
        if (this.isOnline) {
          this.pushToCloud();
        }
      });

      // Listen to instantaneous local LAN push from Mobile via Electron IPC
      if ((window as any).electronAPI?.onRemoteUpdated) {
        (window as any).electronAPI.onRemoteUpdated(async (payload: any) => {
          if (payload && payload.bundle) {
            console.log('⚡ Direct Local LAN Push received:', payload);
            await this.mergeRemoteData(payload.bundle);
            this.lastSyncTime = Date.now();
            this.notify();
            this.notifySyncArrival(payload.source || 'Celular');
          }
        });
      }

      this.setupRealtimeCloudListener();
      this.syncNow(false);
    }
  }

  private notifySyncArrival(source: string = 'Celular') {
    try {
      AudioService.playCheck();
      if ((window as any).electronAPI?.notify) {
        (window as any).electronAPI.notify(
          '⚡ Sincronización Universitaria',
          `Cambios de materias, horario y tareas actualizados desde tu ${source}.`
        );
      }
    } catch (_) {}
  }

  private closeSse() {
    if (this.sseSource) {
      try {
        this.sseSource.close();
      } catch (_) {}
      this.sseSource = null;
    }
  }

  // Real-time instant cloud push listener via Server-Sent Events (SSE)
  private setupRealtimeCloudListener() {
    if (typeof window === 'undefined' || typeof EventSource === 'undefined') return;
    this.closeSse();

    try {
      this.sseSource = new EventSource(`https://ntfy.envs.net/${this.cloudVaultId}/sse`);
      
      this.sseSource.onmessage = async (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data && (data.title === 'ORGPRO_SYNC' || data.title === 'orgpro_sync' || data.attachment)) {
            let parsedEnvelope: any = null;

            if (data.attachment && data.attachment.url) {
              try {
                const res = await fetch(data.attachment.url, { signal: AbortSignal.timeout(10000) });
                if (res.ok) {
                  parsedEnvelope = await res.json();
                }
              } catch (_) {}
            }

            if (!parsedEnvelope && data.message) {
              try {
                parsedEnvelope = typeof data.message === 'string' ? JSON.parse(data.message) : data.message;
              } catch (_) {}
            }

            const myDeviceId = await this.getDeviceId();
            
            // Accept sync from ANY other device (phone 1, phone 2, tablet, another PC)
            if (parsedEnvelope && parsedEnvelope.deviceId !== myDeviceId && (parsedEnvelope.bundle || parsedEnvelope.data)) {
              console.log('⚡ Cloud Realtime Sync received from device:', parsedEnvelope.deviceId || parsedEnvelope.source);
              await this.mergeRemoteData(parsedEnvelope.bundle || parsedEnvelope.data || parsedEnvelope);
              this.lastSyncTime = Date.now();
              this.notify();
              this.notifySyncArrival(parsedEnvelope.source || 'Celular');
            }
          }
        } catch (_) {}
      };

      this.sseSource.onerror = () => {
        // SSE encountered transient network error (e.g. sleep/reconnect); safe silent recovery
      };
    } catch (_) {}
  }

  subscribe(listener: SyncStatusListener) {
    this.listeners.add(listener);
    listener(this.getStatus());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify(error: string | null = null) {
    const status = this.getStatus(error);
    this.listeners.forEach(fn => fn(status));
  }

  getStatus(error: string | null = null): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      pendingOutboxCount: 0,
      syncServerUrl: this.syncServerUrl,
      pairingCode: this.pairingCode,
      cloudVaultId: this.cloudVaultId,
      error,
      mode: !this.isOnline ? 'offline' : 'cloud'
    };
  }

  async syncNow(showIndicator = true): Promise<{ success: boolean; message: string }> {
    if (this.isSyncing) return { success: false, message: 'Sincronización en curso' };
    if (showIndicator) {
      this.isSyncing = true;
      this.notify();
    }

    try {
      const myDeviceId = await this.getDeviceId();

      // 1. Pull latest cloud bundle from Phone / Other Devices (4G / Wi-Fi) across relays
      const relays = ['https://ntfy.envs.net', 'https://ntfy.sh'];
      let pulled = false;

      for (const relay of relays) {
        try {
          const cloudRes = await fetch(`${relay}/${this.cloudVaultId}/json?poll=1`, {
            signal: AbortSignal.timeout(10000)
          });

          if (cloudRes.ok) {
            const rawText = await cloudRes.text();
            const lines = rawText.trim().split('\n').filter(Boolean);
            if (lines.length > 0) {
              for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
                try {
                  const envelope = JSON.parse(lines[i]);
                  let remoteData: any = null;

                  if (envelope.attachment && envelope.attachment.url) {
                    try {
                      const res = await fetch(envelope.attachment.url, { signal: AbortSignal.timeout(10000) });
                      if (res.ok) {
                        remoteData = await res.json();
                      }
                    } catch (_) {}
                  }

                  if (!remoteData && envelope.message) {
                    try {
                      remoteData = typeof envelope.message === 'string' ? JSON.parse(envelope.message) : envelope.message;
                    } catch (_) {}
                  }

                  if (remoteData && remoteData.deviceId !== myDeviceId && (remoteData.bundle || remoteData.data)) {
                    await this.mergeRemoteData(remoteData.bundle || remoteData.data || remoteData);
                    pulled = true;
                    break;
                  }
                } catch (_) {}
              }
            }
          }
        } catch (_) {}
        if (pulled) break;
      }

      // 2. Also try LAN bridge if available
      try {
        const lanRes = await fetch(`${this.syncServerUrl}/api/sync/pull`, { signal: AbortSignal.timeout(3000) });
        if (lanRes.ok) {
          const lanJson = await lanRes.json();
          if (lanJson && lanJson.data) {
            await this.mergeRemoteData(lanJson.data);
          }
        }
      } catch (_) {}

      this.lastSyncTime = Date.now();
      this.isSyncing = false;
      this.notify();
      return { success: true, message: '✅ Sincronizado en tiempo real con todos tus dispositivos.' };
    } catch (err: any) {
      this.isSyncing = false;
      this.notify(err.message);
      return { success: false, message: err.message || 'Error en sincronización' };
    }
  }

  async pushToCloud() {
    try {
      const myDeviceId = await this.getDeviceId();
      const localBundle = await StorageService.exportFullBundle();
      const payload = JSON.stringify({
        deviceId: myDeviceId,
        source: 'pc',
        platform: 'windows',
        scope: 'full_sync',
        timestamp: Date.now(),
        bundle: localBundle
      });

      const relays = ['https://ntfy.envs.net', 'https://ntfy.sh'];
      for (const relay of relays) {
        try {
          const putRes = await fetch(`${relay}/${this.cloudVaultId}`, {
            method: 'PUT',
            headers: {
              'Title': 'ORGPRO_SYNC',
              'Filename': 'sync.json',
              'X-Device-Id': myDeviceId,
            },
            body: payload,
            signal: AbortSignal.timeout(10000)
          });

          if (!putRes.ok && payload.length < 4000) {
            await fetch(`${relay}/${this.cloudVaultId}`, {
              method: 'POST',
              headers: {
                'Title': 'ORGPRO_SYNC',
                'Content-Type': 'application/json'
              },
              body: payload,
              signal: AbortSignal.timeout(10000)
            });
          }
        } catch (_) {}
      }
    } catch (_) {}
  }

  // Comprehensive Field-Level & Set-Union Merging across PC and Mobile
  private async mergeRemoteData(remote: Record<string, any>) {
    if (!remote || typeof remote !== 'object') return;

    // ===== MERGE DELETED ENTITIES FIRST (Across all categories) =====
    const localDeleted = (await StorageService.getDeletedEntities()) || {};
    const remoteDeleted = remote[STORAGE_KEYS.DELETED_ENTITIES] || remote['life_study_deleted_entities.json'] || remote['life_study_deleted_entities'] || remote['deletedEntities'] || {};
    const mergedDeleted = { ...localDeleted };
    const allCategories = ['courses', 'semesters', 'units', 'universityTasks', 'schedule', 'dailyTasks', 'habits', 'routines', 'files', 'notes'];

    for (const type of allCategories) {
      const map = remoteDeleted[type];
      if (typeof map === 'object' && map !== null) {
        if (!mergedDeleted[type]) mergedDeleted[type] = {};
        for (const [id, deletedAt] of Object.entries(map as any)) {
          const localTime = mergedDeleted[type][id] ? new Date(mergedDeleted[type][id]).getTime() : 0;
          const remoteTime = new Date(deletedAt as string).getTime();
          if (remoteTime > localTime) {
            mergedDeleted[type][id] = deletedAt as string;
          }
        }
      }
    }
    await StorageService.save(STORAGE_KEYS.DELETED_ENTITIES, mergedDeleted);

    const isTombstoned = (type: string, item: any): boolean => {
      if (!item) return false;
      const itemId = String(item.id || (typeof item === 'string' ? item : ''));
      if (itemId && mergedDeleted[type]?.[itemId]) return true;
      return false;
    };

    // 1. Merge University Tasks (Entregables, Tareas, Proyectos, Exámenes)
    const remoteUniTasks = remote[STORAGE_KEYS.UNIVERSITY_TASKS] || remote['life_study_university_tasks.json'] || remote['life_study_university_tasks'] || remote['universityTasks'];
    if (Array.isArray(remoteUniTasks)) {
      const local = (await StorageService.getUniversityTasks()) || [];
      const uniMap = new Map<string, any>();
      local.filter(u => !isTombstoned('universityTasks', u) && !isTombstoned('courses', { id: u.courseId, updatedAt: u.updatedAt })).forEach(u => uniMap.set(String(u.id), u));

      remoteUniTasks.forEach((remoteUni: any) => {
        if (!remoteUni || !remoteUni.id || isTombstoned('universityTasks', remoteUni) || isTombstoned('courses', { id: remoteUni.courseId, updatedAt: remoteUni.updatedAt })) return;
        const localTask = uniMap.get(String(remoteUni.id));
        if (!localTask) {
          uniMap.set(String(remoteUni.id), remoteUni);
        } else {
          const isRemoteNewer = new Date(remoteUni.updatedAt || remoteUni.completedAt || remoteUni.createdAt || 0).getTime() >=
            new Date(localTask.updatedAt || localTask.completedAt || localTask.createdAt || 0).getTime();
          const chosen = isRemoteNewer ? remoteUni : localTask;
          uniMap.set(String(remoteUni.id), chosen);
        }
      });
      await StorageService.save(STORAGE_KEYS.UNIVERSITY_TASKS, Array.from(uniMap.values()));
    }

    // 2. Merge Courses / Materias (supports life_study_courses.json, life_study_courses, courses)
    const remoteCourses = remote[STORAGE_KEYS.COURSES] || remote['life_study_courses.json'] || remote['life_study_courses'] || remote['courses'];
    if (Array.isArray(remoteCourses)) {
      const local = (await StorageService.getCourses()) || [];
      const courseMap = new Map<string, any>();
      local.filter(c => !isTombstoned('courses', c)).forEach(c => { if (c) courseMap.set(String(c.id), c); });

      remoteCourses.forEach((remoteCourse: any) => {
        if (!remoteCourse || isTombstoned('courses', remoteCourse)) return;
        let matchKey: string | null = null;
        let localCourse = courseMap.get(String(remoteCourse.id));
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
          matchKey = String(remoteCourse.id);
        }

        if (!localCourse) {
          courseMap.set(String(remoteCourse.id || `course_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`), remoteCourse);
        } else {
          const remoteTime = new Date(remoteCourse.updatedAt || remoteCourse.createdAt || 0).getTime();
          const localTime = new Date(localCourse.updatedAt || localCourse.createdAt || 0).getTime();
          const isRemoteNewer = remoteTime > localTime;

          const chosen = isRemoteNewer ? remoteCourse : localCourse;
          const mergedCourse = {
            ...localCourse,
            ...remoteCourse,
            id: localCourse.id,
            name: chosen.name || localCourse.name || remoteCourse.name,
            code: chosen.code !== undefined ? chosen.code : (localCourse.code || remoteCourse.code),
            color: chosen.color || localCourse.color || remoteCourse.color,
            professor: chosen.professor !== undefined ? chosen.professor : (localCourse.professor || remoteCourse.professor),
            classroom: chosen.classroom !== undefined ? chosen.classroom : (localCourse.classroom || remoteCourse.classroom),
            credits: chosen.credits !== undefined ? chosen.credits : (localCourse.credits || remoteCourse.credits),
            semesterId: chosen.semesterId || localCourse.semesterId || remoteCourse.semesterId,
            evaluations: chosen.evaluations || localCourse.evaluations || remoteCourse.evaluations,
            updatedAt: chosen.updatedAt || new Date().toISOString()
          };
          courseMap.set(matchKey || localCourse.id, mergedCourse);
        }
      });
      await StorageService.save(STORAGE_KEYS.COURSES, Array.from(courseMap.values()));
    }

    // 3. Merge Semesters
    const remoteSemesters = remote[STORAGE_KEYS.SEMESTERS] || remote['life_study_semesters.json'] || remote['life_study_semesters'] || remote['semesters'];
    if (Array.isArray(remoteSemesters)) {
      const local = (await StorageService.getSemesters()) || [];
      const semMap = new Map<string, any>();
      local.filter(s => !isTombstoned('semesters', s)).forEach(s => { if (s && s.id) semMap.set(String(s.id), s); });

      remoteSemesters.forEach((remoteSem: any) => {
        if (!remoteSem || isTombstoned('semesters', remoteSem)) return;
        let matchKey: string | null = null;
        let localSem = semMap.get(String(remoteSem.id));
        if (!localSem) {
          for (const [k, ls] of semMap.entries()) {
            if (ls && remoteSem && ls.name && remoteSem.name && ls.name.trim().toLowerCase() === remoteSem.name.trim().toLowerCase()) {
              matchKey = k;
              localSem = ls;
              break;
            }
          }
        } else {
          matchKey = String(remoteSem.id);
        }

        if (!localSem) {
          semMap.set(String(remoteSem.id || `sem_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`), remoteSem);
        } else {
          const remoteTime = new Date(remoteSem.updatedAt || remoteSem.createdAt || 0).getTime();
          const localTime = new Date(localSem.updatedAt || localSem.createdAt || 0).getTime();
          const isRemoteNewer = remoteTime > localTime;
          const chosen = isRemoteNewer ? remoteSem : localSem;

          semMap.set(matchKey || localSem.id, {
            ...localSem,
            ...remoteSem,
            id: localSem.id,
            name: chosen.name || localSem.name,
            updatedAt: chosen.updatedAt || new Date().toISOString()
          });
        }
      });
      await StorageService.save(STORAGE_KEYS.SEMESTERS, Array.from(semMap.values()));
    }

    // 4. Merge University Units & 17 Weeks Progress
    const remoteUnits = remote[STORAGE_KEYS.UNIVERSITY_UNITS_PROGRESS] || remote['life_study_university_units_progress.json'] || remote['life_study_university_units_progress'] || remote['universityUnitsProgress'];
    if (Array.isArray(remoteUnits)) {
      const localUnits = (await StorageService.getCourseUnitsProgress()) || [];
      const unitMap = new Map<string, any>();
      localUnits.filter(u => !isTombstoned('units', u) && !isTombstoned('courses', { id: u.courseId, updatedAt: u.updatedAt })).forEach(u => { if (u && u.id) unitMap.set(String(u.id), u); });

      remoteUnits.forEach((remoteUnit: any) => {
        if (!remoteUnit || isTombstoned('units', remoteUnit) || isTombstoned('courses', { id: remoteUnit.courseId, updatedAt: remoteUnit.updatedAt })) return;
        let matchedKey: string | null = null;
        let localUnit = unitMap.get(String(remoteUnit.id));
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
          matchedKey = String(remoteUnit.id);
        }

        if (!localUnit) {
          unitMap.set(String(remoteUnit.id || `unit_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`), remoteUnit);
        } else {
          const isRemoteNewer = new Date(remoteUnit.updatedAt || remoteUnit.createdAt || 0).getTime() >
            new Date(localUnit.updatedAt || localUnit.createdAt || 0).getTime();

          const maxWeeks = Math.max(localUnit.totalWeeks || 17, remoteUnit.totalWeeks || 17, 17);
          const mergedWeeks = Array.from({ length: maxWeeks }, (_, idx) => {
            const weekNum = idx + 1;
            const localW = (localUnit.weeks || []).find((w: any) => w.weekNumber === weekNum) || { weekNumber: weekNum, completed: false, files: [] };
            const remoteW = (remoteUnit.weeks || []).find((w: any) => w.weekNumber === weekNum) || { weekNumber: weekNum, completed: false, files: [] };

            const fileMap = new Map<string, any>();
            (localW.files || []).forEach((f: any) => { if (f) fileMap.set(f.id || f.name, f); });
            (remoteW.files || []).forEach((f: any) => { if (f) fileMap.set(f.id || f.name, f); });

            const chosenW = isRemoteNewer ? remoteW : localW;

            return {
              ...localW,
              ...remoteW,
              weekNumber: weekNum,
              title: chosenW.title || (isRemoteNewer ? remoteW.title || localW.title : localW.title || remoteW.title) || `Semana ${weekNum}`,
              completed: Boolean(chosenW.completed),
              notes: chosenW.notes !== undefined ? chosenW.notes : (remoteW.notes || localW.notes || ''),
              files: Array.from(fileMap.values())
            };
          });

          const chosenUnit = isRemoteNewer ? remoteUnit : localUnit;

          const mergedUnit = {
            ...localUnit,
            ...remoteUnit,
            id: chosenUnit.id || localUnit.id || remoteUnit.id,
            title: chosenUnit.title || localUnit.title || remoteUnit.title,
            courseId: chosenUnit.courseId || localUnit.courseId || remoteUnit.courseId,
            semesterId: chosenUnit.semesterId || remoteUnit.semesterId || localUnit.semesterId,
            weeks: mergedWeeks,
            totalWeeks: maxWeeks,
            examScore: Math.max(localUnit.examScore || 0, remoteUnit.examScore || 0),
            evaluationExam: chosenUnit.evaluationExam || remoteUnit.evaluationExam || localUnit.evaluationExam,
            updatedAt: chosenUnit.updatedAt || new Date().toISOString()
          };
          unitMap.set(matchedKey || localUnit.id, mergedUnit);
        }
      });
      await StorageService.saveCourseUnitsProgress(Array.from(unitMap.values()));
    }

    // 5. Merge University Schedule (Bloques de horario, días y horas de clases)
    const remoteSchedule = remote[STORAGE_KEYS.SCHEDULE] || remote['@life_study_schedule'] || remote['life_study_schedule.json'] || remote['life_study_schedule'] || remote['schedule'] || remote['blocks'];
    if (Array.isArray(remoteSchedule)) {
      const local = (await StorageService.getScheduleBlocks()) || [];
      const schedMap = new Map<string, any>();
      local.filter(s => !isTombstoned('schedule', s) && !isTombstoned('courses', { id: s.courseId, updatedAt: (s as any).updatedAt })).forEach(s => {
        if (s && s.id) schedMap.set(String(s.id), s);
      });

      remoteSchedule.forEach((remoteS: any, idx: number) => {
        if (!remoteS || isTombstoned('schedule', remoteS) || isTombstoned('courses', { id: remoteS.courseId, updatedAt: remoteS.updatedAt })) return;
        
        let matchId: string | null = null;
        let localS: any = null;

        if (remoteS.id && schedMap.has(String(remoteS.id))) {
          matchId = String(remoteS.id);
          localS = schedMap.get(matchId);
        } else {
          const searchName = remoteS.courseName || remoteS.title || remoteS.name;
          for (const [k, ls] of schedMap.entries()) {
            if (ls && (
              (remoteS.id && String(ls.id) === String(remoteS.id)) ||
              (searchName && (ls.courseName === searchName || ls.title === searchName)) ||
              (remoteS.courseId && ls.courseId && String(ls.courseId) === String(remoteS.courseId))
            )) {
              matchId = k;
              localS = ls;
              break;
            }
          }
        }

        if (!localS) {
          const courseName = remoteS.courseName || remoteS.title || remoteS.name || 'Materia';
          const newId = String(remoteS.id || `sched_${Date.now()}_${idx}`);
          schedMap.set(newId, {
            ...remoteS,
            id: newId,
            courseName,
            title: remoteS.title || courseName,
            color: remoteS.color || '#6366f1',
          });
        } else {
          const remoteTime = new Date(remoteS.updatedAt || remoteS.createdAt || 0).getTime();
          const localTime = new Date(localS.updatedAt || localS.createdAt || 0).getTime();
          const isRemoteNewer = remoteTime > localTime;

          if (isRemoteNewer) {
            const courseName = remoteS.courseName || remoteS.title || remoteS.name || localS.courseName || 'Materia';
            schedMap.set(matchId || localS.id, {
              ...localS,
              ...remoteS,
              id: localS.id || remoteS.id,
              courseName,
              title: remoteS.title || courseName,
              color: remoteS.color || localS.color || '#6366f1',
              updatedAt: remoteS.updatedAt || new Date().toISOString()
            });
          }
        }
      });
      await StorageService.saveAllScheduleBlocks(Array.from(schedMap.values()));
    }

    // 6. Merge Schedule Image
    const remoteScheduleImg = remote[STORAGE_KEYS.SCHEDULE_IMAGE] || remote['@life_study_schedule_image'] || remote['life_study_schedule_image'] || remote['scheduleImage'];
    if (remoteScheduleImg && typeof remoteScheduleImg === 'string') {
      await StorageService.saveScheduleImage(remoteScheduleImg);
    }

    // 7. Merge Day Overrides
    const remoteDayOverrides = remote['@life_study_schedule_day_overrides'] || remote['life_study_schedule_day_overrides'] || remote['dayOverrides'];
    if (remoteDayOverrides && typeof remoteDayOverrides === 'object') {
      await StorageService.save('@life_study_schedule_day_overrides', remoteDayOverrides);
    }

    // 8. Merge University Study Files & Notes
    if (Array.isArray(remote[STORAGE_KEYS.NOTES])) {
      const local = (await StorageService.get<any[]>(STORAGE_KEYS.NOTES)) || [];
      const map = new Map<string, any>();
      local.forEach(n => map.set(n.id, n));
      remote[STORAGE_KEYS.NOTES].forEach((n: any) => {
        if (n && n.id) map.set(n.id, n);
      });
      await StorageService.save(STORAGE_KEYS.NOTES, Array.from(map.values()));
    }

    if (Array.isArray(remote[STORAGE_KEYS.FILES])) {
      const local = (await StorageService.get<any[]>(STORAGE_KEYS.FILES)) || [];
      const map = new Map<string, any>();
      local.forEach(f => map.set(f.id, f));
      remote[STORAGE_KEYS.FILES].forEach((f: any) => {
        if (f && f.id) map.set(f.id, f);
      });
      await StorageService.save(STORAGE_KEYS.FILES, Array.from(map.values()));
    }

    // 9. Merge Daily Tasks (Tareas Diarias)
    const remoteDailyTasks = remote[STORAGE_KEYS.DAILY_TASKS] || remote['life_study_daily_tasks.json'] || remote['life_study_daily_tasks'] || remote['dailyTasks'] || remote['tasks'];
    if (Array.isArray(remoteDailyTasks)) {
      const local = (await StorageService.getDailyTasks()) || [];
      const taskMap = new Map<string, any>();
      local.filter(t => !isTombstoned('dailyTasks', t)).forEach(t => taskMap.set(String(t.id), t));

      remoteDailyTasks.forEach((remoteT: any) => {
        if (!remoteT || !remoteT.id || isTombstoned('dailyTasks', remoteT)) return;
        const localT = taskMap.get(String(remoteT.id));
        if (!localT) {
          taskMap.set(String(remoteT.id), remoteT);
        } else {
          const remoteTime = new Date(remoteT.updatedAt || remoteT.createdAt || 0).getTime();
          const localTime = new Date(localT.updatedAt || localT.createdAt || 0).getTime();
          const isRemoteNewer = remoteTime >= localTime;
          const chosen = isRemoteNewer ? remoteT : localT;

          const completedDates = Array.from(new Set([...(localT.completedDates || []), ...(remoteT.completedDates || [])]));
          const failedDates = Array.from(new Set([...(localT.failedDates || []), ...(remoteT.failedDates || [])]));
          const inProgressDates = Array.from(new Set([...(localT.inProgressDates || []), ...(remoteT.inProgressDates || [])]));

          taskMap.set(String(remoteT.id), {
            ...localT,
            ...remoteT,
            title: chosen.title || localT.title,
            priority: chosen.priority || localT.priority,
            rarity: chosen.rarity || localT.rarity,
            description: chosen.description !== undefined ? chosen.description : localT.description,
            completedDates,
            failedDates,
            inProgressDates,
            streak: Math.max(localT.streak || 0, remoteT.streak || 0),
            updatedAt: chosen.updatedAt || new Date().toISOString()
          });
        }
      });
      await StorageService.saveDailyTasks(Array.from(taskMap.values()));
    }

    // 10. Merge Habits (Hábitos)
    const remoteHabits = remote[STORAGE_KEYS.HABITS] || remote['life_study_habits.json'] || remote['life_study_habits'] || remote['habits'];
    if (Array.isArray(remoteHabits)) {
      const local = (await StorageService.getHabits()) || [];
      const habitMap = new Map<string, any>();
      local.filter(h => !isTombstoned('habits', h)).forEach(h => habitMap.set(String(h.id), h));

      remoteHabits.forEach((remoteH: any) => {
        if (!remoteH || !remoteH.id || isTombstoned('habits', remoteH)) return;
        const localH = habitMap.get(String(remoteH.id));
        if (!localH) {
          habitMap.set(String(remoteH.id), remoteH);
        } else {
          const remoteTime = new Date(remoteH.updatedAt || remoteH.createdAt || 0).getTime();
          const localTime = new Date(localH.updatedAt || localH.createdAt || 0).getTime();
          const isRemoteNewer = remoteTime >= localTime;
          const chosen = isRemoteNewer ? remoteH : localH;

          const completedDates = Array.from(new Set([...(localH.completedDates || []), ...(remoteH.completedDates || [])]));
          const failedDates = Array.from(new Set([...(localH.failedDates || []), ...(remoteH.failedDates || [])]));

          habitMap.set(String(remoteH.id), {
            ...localH,
            ...remoteH,
            title: chosen.title || localH.title,
            streak: Math.max(localH.streak || 0, remoteH.streak || 0),
            completedDates,
            failedDates,
            updatedAt: chosen.updatedAt || new Date().toISOString()
          });
        }
      });
      await StorageService.saveHabits(Array.from(habitMap.values()));
    }

    // 11. Merge Routines (Rutinas)
    const remoteRoutines = remote[STORAGE_KEYS.ROUTINES] || remote['life_study_routines.json'] || remote['life_study_routines'] || remote['routines'];
    if (Array.isArray(remoteRoutines)) {
      const local = (await StorageService.get<any[]>(STORAGE_KEYS.ROUTINES)) || [];
      const map = new Map<string, any>();
      local.filter(r => !isTombstoned('routines', r)).forEach(r => map.set(String(r.id), r));
      remoteRoutines.forEach((r: any) => {
        if (r && r.id && !isTombstoned('routines', r)) map.set(String(r.id), r);
      });
      await StorageService.save(STORAGE_KEYS.ROUTINES, Array.from(map.values()));
    }

    // 12. Merge RPG Stats (Nivel, Exp, Oro, HP, Rachas)
    const remoteRPG = remote[STORAGE_KEYS.RPG_STATS] || remote['life_study_rpg_stats.json'] || remote['life_study_rpg_stats'] || remote['rpgStats'];
    if (remoteRPG && typeof remoteRPG === 'object') {
      const localRPG = (await StorageService.getRPGStats()) || { level: 1, exp: 0, maxExp: 100, hp: 100, maxHp: 100, gold: 0, streak: 0 };
      const mergedRPG = {
        ...localRPG,
        ...remoteRPG,
        level: Math.max(localRPG.level || 1, remoteRPG.level || 1),
        exp: Math.max(localRPG.exp || 0, remoteRPG.exp || 0),
        maxExp: Math.max(localRPG.maxExp || 100, remoteRPG.maxExp || 100),
        gold: Math.max(localRPG.gold || 0, remoteRPG.gold || 0),
        streak: Math.max(localRPG.streak || 0, remoteRPG.streak || 0),
        updatedAt: new Date().toISOString()
      };
      await StorageService.saveRPGStats(mergedRPG);
    }

    // 13. Merge RPG Cosmetics, Inventory & Achievements
    const remoteCos = remote[STORAGE_KEYS.RPG_COSMETICS] || remote['life_study_rpg_cosmetics.json'] || remote['rpgCosmetics'];
    if (remoteCos && typeof remoteCos === 'object') {
      const localCos = (await StorageService.getRPGCosmetics()) || { equippedTheme: 'Default', unlockedThemes: ['Default'] };
      const unlockedThemes = Array.from(new Set([...(localCos.unlockedThemes || []), ...(remoteCos.unlockedThemes || [])]));
      const remoteTime = new Date(remoteCos.updatedAt || 0).getTime();
      const localTime = new Date(localCos.updatedAt || 0).getTime();
      const equippedTheme = remoteTime >= localTime ? (remoteCos.equippedTheme || localCos.equippedTheme) : localCos.equippedTheme;
      await StorageService.saveRPGCosmetics({ ...localCos, ...remoteCos, equippedTheme, unlockedThemes });
    }

    const remoteInv = remote[STORAGE_KEYS.RPG_INVENTORY] || remote['life_study_rpg_inventory.json'] || remote['rpgInventory'];
    if (remoteInv && typeof remoteInv === 'object') {
      const localInv = (await StorageService.getRPGInventory()) || { items: [] };
      const itemMap = new Map<string, any>();
      (localInv.items || []).forEach((i: any) => itemMap.set(String(i.id), i));
      (remoteInv.items || []).forEach((i: any) => {
        if (i && i.id) {
          const localItem = itemMap.get(String(i.id));
          const qty = Math.max(localItem?.quantity || 1, i.quantity || 1);
          itemMap.set(String(i.id), { ...localItem, ...i, quantity: qty });
        }
      });
      await StorageService.saveRPGInventory({ items: Array.from(itemMap.values()) });
    }

    const remoteAch = remote[STORAGE_KEYS.RPG_ACHIEVEMENTS] || remote['life_study_rpg_achievements.json'] || remote['rpgAchievements'];
    if (Array.isArray(remoteAch)) {
      const localAch = (await StorageService.getAchievements()) || [];
      const achMap = new Map<string, any>();
      localAch.forEach(a => achMap.set(String(a.id), a));
      remoteAch.forEach((a: any) => {
        if (a && a.id) {
          const localA = achMap.get(String(a.id));
          const unlocked = Boolean(localA?.unlocked || a.unlocked);
          achMap.set(String(a.id), { ...localA, ...a, unlocked });
        }
      });
      await StorageService.saveAchievements(Array.from(achMap.values()));
    }

    // 14. Merge Bedtime & Settings
    const remoteBedtime = remote[STORAGE_KEYS.BEDTIME] || remote['life_study_bedtime.json'] || remote['bedtime'];
    if (remoteBedtime && typeof remoteBedtime === 'object') {
      const local = await StorageService.getBedtime();
      await StorageService.saveBedtime({ ...local, ...remoteBedtime });
    }

    const remoteSettings = remote[STORAGE_KEYS.SETTINGS] || remote['life_study_settings.json'] || remote['settings'];
    if (remoteSettings && typeof remoteSettings === 'object') {
      const local = await StorageService.getSettings();
      await StorageService.saveSettings({ ...local, ...remoteSettings });
    }

    // Broadcast comprehensive UI updates to all PC views
    StorageService.emit('DATA_UPDATED');
    StorageService.emit('SCHEDULE_UPDATED');
    StorageService.emit('TASKS_UPDATED');
    StorageService.emit('HABITS_UPDATED');
    StorageService.emit('STATS_UPDATED');
    StorageService.emit('COSMETICS_UPDATED');
    StorageService.emit('SETTINGS_UPDATED');
  }
}

export default new SyncEngine();
