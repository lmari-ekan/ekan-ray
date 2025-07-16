// Native
import { join } from 'path';

// Packages
import { BrowserWindow, app, ipcMain, IpcMainEvent, nativeTheme } from 'electron';
import isDev from 'electron-is-dev';

// Importa o servidor Ray
import { startRayServer } from './rayServer';

const height = 600;
const width = 800;

function createWindow() {
  const window = new BrowserWindow({
    width,
    height,
    show: true,
    resizable: true,
    fullscreenable: true,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, 'preload.js')
    }
  });

  const port = process.env.PORT || 3000;
  const url = isDev ? `http://localhost:${port}` : join(__dirname, '../dist-vite/index.html');

  if (isDev) {
    window.loadURL(url);
  } else {
    window.loadFile(url);
  }

  // ipc para controle da janela (AppBar)
  ipcMain.on('minimize', () => {
    window.isMinimized() ? window.restore() : window.minimize();
  });

  ipcMain.on('maximize', () => {
    window.isMaximized() ? window.restore() : window.maximize();
  });

  ipcMain.on('close', () => {
    window.close();
  });

  nativeTheme.themeSource = 'dark';
}

// Electron ready
app.whenReady().then(() => {
  // Inicia o servidor Ray
  startRayServer();

  // Cria a janela principal
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Encerra o app no Windows/Linux quando todas as janelas forem fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Exemplo de mensagem do renderer -> main -> renderer
ipcMain.on('message', (event: IpcMainEvent, message: any) => {
  console.log(message);
  setTimeout(() => event.sender.send('message', 'common.hiElectron'), 500);
});