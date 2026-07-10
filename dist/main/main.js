const path = require("path");
const { execSync } = require("child_process");
const { app, BrowserWindow, dialog, ipcMain } = require("electron");

const MAX_INSTALLS = 3;
const REG_PATH = "HKCU\\Software\\SuperSeatMap";

let mainWindow = null;

// ── 机器指纹 ──

function getMachineId() {
  try {
    const uuid = execSync(
      'powershell -NoProfile -Command "(Get-CimInstance Win32_ComputerSystemProduct).UUID"',
      { timeout: 5000, windowsHide: true, encoding: "utf-8" }
    ).trim();
    return uuid || "host-" + require("os").hostname();
  } catch {
    return "host-" + require("os").hostname();
  }
}

// ── 注册表读写 ──

function getActivations() {
  try {
    const raw = execSync(
      `reg query "${REG_PATH}" /v Activations 2>nul`,
      { timeout: 5000, windowsHide: true, encoding: "utf-8" }
    );
    const match = raw.match(/Activations\s+REG_SZ\s+(.+)/);
    return match ? JSON.parse(match[1]) : [];
  } catch {
    return [];
  }
}

function saveActivations(list) {
  try {
    execSync(`reg add "${REG_PATH}" /f /ve 2>nul`, { timeout: 3000, windowsHide: true });
    execSync(
      `reg add "${REG_PATH}" /v Activations /t REG_SZ /d "${JSON.stringify(list)}" /f`,
      { timeout: 3000, windowsHide: true }
    );
    return true;
  } catch {
    return false;
  }
}

function checkActivation() {
  const machineId = getMachineId();
  const activations = getActivations();
  if (activations.includes(machineId)) return true;
  if (activations.length < MAX_INSTALLS) {
    activations.push(machineId);
    saveActivations(activations);
    return true;
  }
  return false;
}

// ── 主窗口 ──

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 960, height: 700, minWidth: 640, minHeight: 480,
    icon: path.join(__dirname, "../../assets/icons/seat-icon.png"),
    webPreferences: {
      nodeIntegration: false, contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.on("closed", () => { mainWindow = null; });
}

// ── IPC ──

ipcMain.handle("open-seating-view", async () => {
  const w = new BrowserWindow({
    width: 960, height: 700, title: "超级座位图 / PPT模式",
    icon: path.join(__dirname, "../../assets/icons/seat-icon.png"),
    resizable: true, maximizable: true, alwaysOnTop: true,
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false },
  });
  w.setMenuBarVisibility(false);
  w.loadFile(path.join(__dirname, "../renderer/index.html"));
  return { success: true };
});

ipcMain.handle("set-always-on-top", () => {
  if (mainWindow) {
    const t = !mainWindow.isAlwaysOnTop();
    mainWindow.setAlwaysOnTop(t);
    return t;
  }
  return false;
});

ipcMain.handle("get-activation-info", () => {
  const acts = getActivations();
  return { current: acts.length, max: MAX_INSTALLS, activated: acts.includes(getMachineId()) };
});

// ── 启动 ──

app.whenReady().then(() => {
  if (checkActivation()) {
    createWindow();
  } else {
    dialog.showErrorBox(
      "安装次数已用尽",
      `超级座位图最多可安装 ${MAX_INSTALLS} 台电脑，当前次数已用满。\\n如需继续使用，请联系开发者。`
    );
    app.quit();
  }
});

app.on("window-all-closed", () => { app.quit(); });
app.on("activate", () => { if (!mainWindow && checkActivation()) createWindow(); });
