const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    onProgress: (callback) => ipcRenderer.on('progress', (_event, value) => callback(value)),
    compress: (inputPath, outputPath) => ipcRenderer.invoke('compress', inputPath, outputPath),
    extract: (inputPath, outputPath) => ipcRenderer.invoke('extract', inputPath, outputPath),
    selectInputFile: () => ipcRenderer.invoke('dialog:selectInputFile'),
    selectInputDir: () => ipcRenderer.invoke('dialog:selectInputDir'),
    selectOutputFile: () => ipcRenderer.invoke('dialog:selectOutputFile'),
    selectOutputDir: () => ipcRenderer.invoke('dialog:selectOutputDir'),
});
