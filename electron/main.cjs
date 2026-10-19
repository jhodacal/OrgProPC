const { app, BrowserWindow, ipcMain, shell, Notification, powerMonitor } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');


let mainWindow;
const isDev = process.env.NODE_ENV === 'development';

// Ensure Single Instance of OrgPro PC
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Local data storage directory
const userDataPath = app.getPath('userData');
const dataDir = path.join(userDataPath, 'orgpro_data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1024,
    minHeight: 680,
    title: 'OrgPro PC',
    backgroundColor: '#070913',
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false
    }
  });

  mainWindow.removeMenu();

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  const distHtmlPath = path.join(__dirname, '../dist/index.html');

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173').catch(() => {
      mainWindow.loadFile(distHtmlPath);
    });
  } else {
    mainWindow.loadFile(distHtmlPath).catch((err) => {
      console.error('Failed to load local HTML file:', err);
    });
  }

  const logFile = path.join(dataDir, 'renderer_debug.log');
  fs.writeFileSync(logFile, `[${new Date().toISOString()}] App started\n`, 'utf-8');

  mainWindow.webContents.on('console-message', (_, level, message, line, sourceId) => {
    const lineStr = `[CONSOLE ${level}] ${sourceId}:${line} -> ${message}\n`;
    console.log(lineStr);
    try { fs.appendFileSync(logFile, lineStr, 'utf-8'); } catch (_) {}
  });

  mainWindow.webContents.on('render-process-gone', (_, details) => {
    const errStr = `[RENDER PROCESS GONE] ${JSON.stringify(details)}\n`;
    console.error(errStr);
    try { fs.appendFileSync(logFile, errStr, 'utf-8'); } catch (_) {}
  });

  mainWindow.webContents.on('did-fail-load', (_, errorCode, errorDescription, validatedURL) => {
    const failStr = `[DID FAIL LOAD] code=${errorCode}, desc=${errorDescription}, url=${validatedURL}\n`;
    console.error(failStr);
    try { fs.appendFileSync(logFile, failStr, 'utf-8'); } catch (_) {}
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}


const os = require('os');
const https = require('https');

function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  for (const devName in interfaces) {
    const iface = interfaces[devName];
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        ips.push(alias.address);
      }
    }
  }
  return ips;
}

function announcePCToCloud() {
  try {
    const ips = getLocalIPs();
    const payload = JSON.stringify({
      type: 'PC_BEACON',
      source: 'pc',
      ips: ips,
      port: 48920,
      timestamp: Date.now(),
      hostname: os.hostname()
    });

    const req = https.request('https://ntfy.sh/orgpro_sync_jhodacal_vault', {
      method: 'POST',
      headers: {
        'Title': 'ORGPRO_PC_BEACON',
        'Content-Type': 'application/json'
      }
    }, (res) => {
      res.resume();
    });

    req.on('error', () => {});
    req.write(payload);
    req.end();
  } catch (_) {}
}

function getCandidateFilePaths(key) {
  return [
    path.join(dataDir, `${encodeURIComponent(key)}.data.json`),
    path.join(dataDir, `${key.replace(/[@:]/g, '_')}.json`),
    path.join(dataDir, `${key}.json`),
    path.join(dataDir, key)
  ];
}

function readStorageKey(key) {
  for (const fp of getCandidateFilePaths(key)) {
    if (fs.existsSync(fp)) {
      try {
        return JSON.parse(fs.readFileSync(fp, 'utf-8'));
      } catch (_) {}
    }
  }
  return null;
}

function writeStorageKey(key, data) {
  const targetPath = path.join(dataDir, `${encodeURIComponent(key)}.data.json`);
  fs.writeFileSync(targetPath, JSON.stringify(data, null, 2), 'utf-8');
  return true;
}

function readAllStorageKeys() {
  const files = fs.readdirSync(dataDir);
  const result = {};
  for (const file of files) {
    try {
      const fullPath = path.join(dataDir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isFile()) {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));
        if (file.endsWith('.data.json')) {
          const key = decodeURIComponent(file.slice(0, -10));
          result[key] = parsed;
        } else if (file.endsWith('.json')) {
          const keyWithoutExt = decodeURIComponent(file.slice(0, -5));
          result[keyWithoutExt] = parsed;
          result[file] = parsed;
        } else {
          result[file] = parsed;
        }
      }
    } catch (_) {}
  }

  // Generate standardized key aliases for seamless cross-platform synchronization across all components
  const aliasPairs = [
    ['life_study_courses.json', 'courses'],
    ['life_study_courses.json', 'life_study_courses'],
    ['@life_study_schedule', 'schedule'],
    ['@life_study_schedule', 'blocks'],
    ['@life_study_schedule', 'life_study_schedule.json'],
    ['@life_study_schedule', 'life_study_schedule'],
    ['@life_study_schedule_image', 'scheduleImage'],
    ['@life_study_schedule_image', 'life_study_schedule_image'],
    ['@life_study_schedule_day_overrides', 'dayOverrides'],
    ['@life_study_schedule_day_overrides', 'life_study_schedule_day_overrides'],
    ['life_study_university_tasks.json', 'universityTasks'],
    ['life_study_university_tasks.json', 'life_study_university_tasks'],
    ['life_study_university_units_progress.json', 'universityUnitsProgress'],
    ['life_study_university_units_progress.json', 'life_study_university_units_progress'],
    ['life_study_semesters.json', 'semesters'],
    ['life_study_semesters.json', 'life_study_semesters'],
    ['life_study_files.json', 'files'],
    ['life_study_notes.json', 'notes'],
    ['life_study_daily_tasks.json', 'dailyTasks'],
    ['life_study_daily_tasks.json', 'tasks'],
    ['life_study_habits.json', 'habits'],
    ['life_study_routines.json', 'routines'],
    ['life_study_rpg_stats.json', 'rpgStats'],
    ['life_study_rpg_cosmetics.json', 'rpgCosmetics'],
    ['life_study_rpg_inventory.json', 'rpgInventory'],
    ['life_study_rpg_achievements.json', 'rpgAchievements'],
    ['life_study_bedtime.json', 'bedtime'],
    ['life_study_settings.json', 'settings'],
    ['life_study_ai_preferences.json', 'aiPreferences'],
    ['life_study_deleted_entities.json', 'deletedEntities'],
  ];

  for (const [canonical, alias] of aliasPairs) {
    if (result[canonical] !== undefined && result[alias] === undefined) {
      result[alias] = result[canonical];
    } else if (result[alias] !== undefined && result[canonical] === undefined) {
      result[canonical] = result[alias];
    }
  }

  return result;
}

// IPC Handlers for Local Storage Filesystem
ipcMain.handle('storage:get', async (_, key) => {
  try {
    return readStorageKey(key);
  } catch (err) {
    console.error('Storage get error:', err);
    return null;
  }
});

ipcMain.handle('storage:set', async (_, key, data) => {
  try {
    return writeStorageKey(key, data);
  } catch (err) {
    console.error('Storage set error:', err);
    return false;
  }
});

ipcMain.handle('storage:getAll', async () => {
  try {
    return readAllStorageKeys();
  } catch (err) {
    return {};
  }
});

ipcMain.handle('notify', async (_, title, body) => {
  if (Notification.isSupported()) {
    new Notification({ title: title || 'OrgPro', body: body || '' }).show();
    return true;
  }
  return false;
});

// IPC Handler for UNAJ Virtual Campus requests (Node.js network engine without CORS limits)
ipcMain.handle('unaj:request', async (_, { url, method = 'GET', data = null, headers = {}, formFields = null }) => {
  try {
    const axios = require('axios');
    let requestData = data;
    let requestHeaders = { ...headers };

    if (formFields) {
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(formFields)) {
        params.append(k, String(v));
      }
      requestData = params.toString();
      requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
    }

    const response = await axios({
      url,
      method,
      data: requestData,
      headers: requestHeaders,
      validateStatus: () => true,
      maxRedirects: 5,
    });

    return {
      status: response.status,
      data: response.data,
      headers: response.headers,
    };
  } catch (err) {
    return {
      status: 500,
      error: err.message,
    };
  }
});

// Embedded Local Sync Bridge & LAN server (allows Phone <-> PC direct LAN sync on port 48920)
let localSyncServer = null;
let beaconInterval = null;

function startLocalSyncServer() {
  try {
    localSyncServer = http.createServer((req, res) => {
      // Enable CORS
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Device-Id');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host}`);

      if (url.pathname === '/api/ping') {
        const ips = getLocalIPs();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: 'ok',
          server: 'OrgPro PC Sync Server',
          ips: ips,
          hostname: os.hostname(),
          timestamp: Date.now()
        }));
        return;
      }

      if (url.pathname === '/api/sync/pull') {
        const bundle = readAllStorageKeys();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: bundle, timestamp: Date.now() }));
        return;
      }

      if (url.pathname === '/api/sync/push' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            const payload = JSON.parse(body);
            if (payload && payload.bundle) {
              for (const [key, val] of Object.entries(payload.bundle)) {
                if (val !== undefined && val !== null) {
                  writeStorageKey(key, val);
                }
              }
              if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('sync:remoteUpdated', {
                  source: payload.source || 'phone',
                  timestamp: Date.now(),
                  bundle: payload.bundle
                });
              }
              res.writeHead(200, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: true, message: 'Sync merged successfully' }));
            } else {
              res.writeHead(400, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: 'Invalid payload' }));
            }
          } catch (err) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ success: false, error: err.message }));
          }
        });
        return;
      }

      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    });

    localSyncServer.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log('Sync server port 48920 already in use by another instance.');
      } else {
        console.error('Local sync server error:', err);
      }
    });

    localSyncServer.listen(48920, '0.0.0.0', () => {
      console.log('OrgPro Local Sync Bridge running on port 48920');
      announcePCToCloud();
    });

    // Periodically announce presence to Cloud Vault every 60 seconds
    beaconInterval = setInterval(() => {
      announcePCToCloud();
    }, 60000);

  } catch (err) {
    console.error('Failed to start sync server:', err);
  }
}

app.whenReady().then(() => {
  createWindow();
  startLocalSyncServer();

  if (powerMonitor) {
    powerMonitor.on('suspend', () => {
      console.log('System is suspending...');
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('power:suspend');
      }
    });

    powerMonitor.on('resume', () => {
      console.log('System resumed from suspension.');
      announcePCToCloud();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('power:resume');
      }
    });

    powerMonitor.on('unlock-screen', () => {
      announcePCToCloud();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('power:resume');
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});



app.on('before-quit', () => {
  if (localSyncServer) {
    try { localSyncServer.close(); } catch (_) {}
  }
});

app.on('window-all-closed', () => {
  if (localSyncServer) {
    try { localSyncServer.close(); } catch (_) {}
  }
  if (process.platform !== 'darwin') app.quit();
});
