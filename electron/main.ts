import { app, BrowserWindow, ipcMain } from "electron";
import path from "node:path";
import Store from "electron-store";
import { session } from "electron";
import fs from "node:fs";

type Settings = { cid: string };

type StoreLike = {
  get: <K extends keyof Settings>(key: K) => Settings[K];
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
};

const store = new Store<Settings>({
  name: "settings",
  defaults: { cid: "" },
});

const isDev = !app.isPackaged;

let win: BrowserWindow | null = null;

function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 1080,
    minHeight: 680,
    backgroundColor: "#070a12",
    icon: path.join(__dirname, "../build/icon.ico"),

    frame: true, // ✅ removes the native title bar
    autoHideMenuBar: true,

    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (!app.isPackaged) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      const headers = details.responseHeaders ?? {};
      const cspKey = Object.keys(headers).find(
        (k) => k.toLowerCase() === "content-security-policy"
      );

      const csp = cspKey ? String(headers[cspKey]?.[0] ?? "") : "";

      // If there's already a CSP, expand connect-src to allow ws/wss for Vite
      const next =
        csp && csp.includes("connect-src")
          ? csp.replace(/connect-src([^;]*);/i, (m, p1) => {
              // ensure ws://127.0.0.1:5173 and ws: are allowed
              if (/ws:/.test(m)) return m;
              return `connect-src${p1} ws: wss: http: https:;`;
            })
          : "default-src 'self'; connect-src 'self' http: https: ws: wss:; img-src 'self' data: blob: https:; style-src 'self' 'unsafe-inline' https:; script-src 'self' 'unsafe-eval' 'unsafe-inline';";

      callback({
        responseHeaders: {
          ...headers,
          "Content-Security-Policy": [next],
        },
      });
    });
  }

  if (!app.isPackaged) {
    win.webContents.openDevTools({ mode: "detach" });
  }

  win.webContents.on("render-process-gone", (_e, details) => {
    console.log("Renderer gone:", details);
  });
  win.webContents.on("did-fail-load", (_e, code, desc) => {
    console.log("did-fail-load:", code, desc);
  });

  if (isDev) {
    win.loadURL("http://127.0.0.1:5173");
    win.webContents.openDevTools({ mode: "detach" });
  } else {
    const indexPath = path.join(app.getAppPath(), "dist", "index.html");
    console.log("PROD indexPath:", indexPath, "exists:", fs.existsSync(indexPath));
    win.loadFile(indexPath);
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// IPC: settings
ipcMain.handle("settings:getCid", () => (store.get("cid") || "").trim());

ipcMain.handle("settings:setCid", (_evt, cid: string) => {
  const clean = String(cid || "").trim();
  store.set("cid", clean);
  return clean;
});

ipcMain.handle("mapData:get", async () => {
  const r = await fetch("https://api.vatsim.net/api/map_data/");
  if (!r.ok) throw new Error(`map_data failed: ${r.status}`);
  return r.json();
});

ipcMain.handle("net:fetchText", async (_e, url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetchText failed: ${r.status}`);
  return r.text();
});

ipcMain.handle("net:fetchJson", async (_e, url: string) => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetchJson failed: ${r.status}`);
  return r.json();
});

ipcMain.handle("flash", () => {
  if (!win) return;
  win.flashFrame(true);
  setTimeout(() => win?.flashFrame(false), 4000);
});
