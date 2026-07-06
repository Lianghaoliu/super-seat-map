const path = require("path");
const { app, BrowserWindow, nativeImage, ipcMain } = require("electron");

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960,
    height: 700,
    minWidth: 640,
    minHeight: 480,
    icon: path.join(__dirname, "../../assets/icons/seat-icon.png"),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
}
ipcMain.handle("open-seating-view", async () => {
  const seatingWin = new BrowserWindow({
    width: 960,
    height: 700,
    title: "超级座位图 / PPT模式",
    icon: path.join(__dirname, "../../assets/icons/seat-icon.png"),
    resizable: true,
    maximizable: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  seatingWin.setMenuBarVisibility(false);
  seatingWin.loadFile(path.join(__dirname, "../renderer/index.html"));
  return { success: true };
});

ipcMain.handle("set-always-on-top", () => {
  if (mainWindow) {
    const isOnTop = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(isOnTop);
    return isOnTop;
  }
  return false;
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { app.quit(); });
app.on("activate", () => { if (!mainWindow) createWindow(); });
