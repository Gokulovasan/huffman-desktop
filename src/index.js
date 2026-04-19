const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { Archiver } = require('./backend/Archiver.js');

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow;

const createWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        },
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));
};

app.whenReady().then(() => {
    ipcMain.handle('dialog:selectInputFile', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openFile'] });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('dialog:selectInputDir', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('dialog:selectOutputFile', async () => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { filters: [{ name: 'Huffman Archive', extensions: ['huf'] }] });
        return canceled ? null : filePath;
    });

    ipcMain.handle('dialog:selectOutputDir', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, { properties: ['openDirectory'] });
        return canceled ? null : filePaths[0];
    });

    ipcMain.handle('compress', async (event, inputPath, outputPath) => {
        try {
            await Archiver.compress(inputPath, outputPath, (percent) => {
                mainWindow.webContents.send('progress', percent);
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    ipcMain.handle('extract', async (event, inputPath, outputPath) => {
        try {
            await Archiver.extract(inputPath, outputPath, (percent) => {
                mainWindow.webContents.send('progress', percent);
            });
            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    });

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
