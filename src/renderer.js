const tabCompress = document.getElementById('tab-compress');
const tabExtract = document.getElementById('tab-extract');
const btnInputFile = document.getElementById('btn-input-file');
const btnInputDir = document.getElementById('btn-input-dir');
const btnOutput = document.getElementById('btn-output');
const btnAction = document.getElementById('btn-action');
const inputPathEl = document.getElementById('input-path');
const outputPathEl = document.getElementById('output-path');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');
const statusEl = document.getElementById('status');

let isCompressMode = true;
let currentInputPath = null;
let currentOutputPath = null;

tabCompress.addEventListener('click', () => {
    isCompressMode = true;
    tabCompress.classList.add('active');
    tabExtract.classList.remove('active');
    btnAction.innerText = "Start Compression";
    btnOutput.innerText = "Save Destination";
    resetIO();
});

tabExtract.addEventListener('click', () => {
    isCompressMode = false;
    tabExtract.classList.add('active');
    tabCompress.classList.remove('active');
    btnAction.innerText = "Start Extraction";
    btnOutput.innerText = "Select Out Folder";
    resetIO();
});

function resetIO() {
    currentInputPath = null;
    currentOutputPath = null;
    inputPathEl.value = "";
    outputPathEl.value = "";
    resetProgress();
}

function resetProgress() {
    progressBar.style.width = '0%';
    progressText.innerText = '0%';
    statusEl.innerText = '';
    statusEl.className = 'status-msg';
}

btnInputFile.addEventListener('click', async () => {
    const p = await window.electronAPI.selectInputFile();
    if (p) { currentInputPath = p; inputPathEl.value = p; }
});

btnInputDir.addEventListener('click', async () => {
    const p = await window.electronAPI.selectInputDir();
    if (p) { currentInputPath = p; inputPathEl.value = p; }
});

btnOutput.addEventListener('click', async () => {
    let p;
    if (isCompressMode) {
        p = await window.electronAPI.selectOutputFile();
    } else {
        p = await window.electronAPI.selectOutputDir();
    }
    if (p) { currentOutputPath = p; outputPathEl.value = p; }
});

btnAction.addEventListener('click', async () => {
    if (!currentInputPath || !currentOutputPath) {
        statusEl.innerText = "Please select input and output paths.";
        statusEl.className = 'status-msg error';
        return;
    }

    btnAction.disabled = true;
    resetProgress();
    statusEl.innerText = "Processing...";

    let res;
    if (isCompressMode) {
        res = await window.electronAPI.compress(currentInputPath, currentOutputPath);
    } else {
        res = await window.electronAPI.extract(currentInputPath, currentOutputPath);
    }

    if (res.success) {
        progressBar.style.width = '100%';
        progressText.innerText = '100%';
        statusEl.innerText = "Operation completed successfully!";
        statusEl.className = 'status-msg success';
    } else {
        statusEl.innerText = `Error: ${res.error}`;
        statusEl.className = 'status-msg error';
    }
    
    btnAction.disabled = false;
});

window.electronAPI.onProgress((val) => {
    progressBar.style.width = `${val}%`;
    progressText.innerText = `${val}%`;
});
