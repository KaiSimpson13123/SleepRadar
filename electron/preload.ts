import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("SleepRadar", {
  getCid: () => ipcRenderer.invoke("settings:getCid") as Promise<string>,
  setCid: (cid: string) => ipcRenderer.invoke("settings:setCid", cid) as Promise<string>,

  getMapData: () => ipcRenderer.invoke("mapData:get"),
  fetchText: (url: string) => ipcRenderer.invoke("net:fetchText", url),
  fetchJson: (url: string) => ipcRenderer.invoke("net:fetchJson", url),
  flash: () => ipcRenderer.invoke("flash"),
});

export {};
