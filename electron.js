const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(__dirname, 'public', 'favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'Document Management System',
    autoHideMenuBar: true,
  });

  // Start the backend server inside Electron's own Node.js (no system Node.js needed)
  startBackendServer();

  // Wait for server to be ready, then load the app
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5000');
  }, 4000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Prevent the page <title> from overriding the window title
  mainWindow.on('page-title-updated', (e) => e.preventDefault());
}

function startBackendServer() {
  const isDev = !app.isPackaged;
  const serverDir = isDev
    ? path.join(__dirname, 'server')
    : path.join(process.resourcesPath, 'app.asar.unpacked', 'server');

  // Store uploads and database in persistent AppData folder (survives app updates)
  const userDataPath = app.getPath('userData');
  const uploadsPath = path.join(userDataPath, 'uploads');
  const dataPath = path.join(userDataPath, 'data');

  process.env.UPLOAD_DIR = uploadsPath;
  process.env.SQLITE_PATH = path.join(dataPath, 'dms.sqlite');

  // On first run, copy the bundled database to AppData so data persists across updates
  const fs = require('fs');
  if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath, { recursive: true });
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });
  const bundledDb = path.join(serverDir, 'data', 'dms.sqlite');
  const userDb = process.env.SQLITE_PATH;
  if (!fs.existsSync(userDb) && fs.existsSync(bundledDb)) {
    // Copy the main database file
    fs.copyFileSync(bundledDb, userDb);
    // Copy WAL and SHM files if they exist (needed for complete database state)
    const walSrc = bundledDb + '-wal';
    const shmSrc = bundledDb + '-shm';
    if (fs.existsSync(walSrc)) fs.copyFileSync(walSrc, userDb + '-wal');
    if (fs.existsSync(shmSrc)) fs.copyFileSync(shmSrc, userDb + '-shm');
    console.log('[DMS] Copied initial database to:', userDb);
  }

  // Set working directory so server resolves paths correctly
  process.chdir(serverDir);
  process.env.NODE_ENV = 'production';

  try {
    require(path.join(serverDir, 'index.js'));
    console.log('[DMS] Server started in-process from:', serverDir);
  } catch (err) {
    console.error('[DMS] Failed to start server:', err);
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
