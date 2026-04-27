const canvas = document.getElementById("drawingCanvas");
const ctx = canvas.getContext("2d");
const cursorDot = document.getElementById("cursorDot");

const brushBtn = document.getElementById("brushBtn");
const eraserBtn = document.getElementById("eraserBtn");
const lineBtn = document.getElementById("lineBtn");
const rectBtn = document.getElementById("rectBtn");
const circleBtn = document.getElementById("circleBtn");

const colorPicker = document.getElementById("colorPicker");
const brushSize = document.getElementById("brushSize");
const brushSizeText = document.getElementById("brushSizeText");

const gridBtn = document.getElementById("gridBtn");
const undoBtn = document.getElementById("undoBtn");
const downloadBtn = document.getElementById("downloadBtn");
const clearBtn = document.getElementById("clearBtn");
const submitDrawing = document.getElementById("submitDrawing");

const drawTimer = document.getElementById("drawTimer");
const drawingMessage = document.getElementById("drawingMessage");
const modeText = document.getElementById("modeText");
const bestScoreText = document.getElementById("bestScoreText");
const canvasWrap = document.getElementById("canvasWrap");

const difficulty = loadData("roundDifficulty", loadData("difficulty", "normal"));

const settings = loadData("gameSettings", {
    viewTime: 4,
    drawTime: 15
});

let isDrawing = false;
let currentTool = "brush";
let currentColor = colorPicker.value;
let backgroundColor = "#ffffff";
let currentSize = Number(brushSize.value);
let undoStack = [];
let startX = 0;
let startY = 0;
let snapshotBeforeShape = null;
let gridVisible = false;
let hasSubmitted = false;
let audioContext = null;

const modeNames = {
    easy: "Easy",
    normal: "Normal",
    hard: "Hard"
};

modeText.textContent = modeNames[difficulty] || "Normal";
bestScoreText.textContent = loadData("bestScore", 0) + "%";
brushSizeText.textContent = currentSize;

ctx.fillStyle = backgroundColor;
ctx.fillRect(0, 0, canvas.width, canvas.height);
saveCanvasState();
updateCursorStyle();

function unlockAudio() {
    if (audioContext !== null) {
        return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    audioContext = new AudioContextClass();
}

function playTone(frequency, duration, volume, type = "sine") {
    const soundOn = loadData("soundOn", true);

    if (!soundOn || audioContext === null) {
        return;
    }

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, audioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);

    oscillator.start();
    oscillator.stop(audioContext.currentTime + duration);
}

function getCanvasPosition(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * (canvas.width / rect.width),
        y: (event.clientY - rect.top) * (canvas.height / rect.height)
    };
}

function startDrawing(event) {
    event.preventDefault();
    unlockAudio();

    const position = getCanvasPosition(event);

    startX = position.x;
    startY = position.y;
    isDrawing = true;

    if (isShapeTool()) {
        snapshotBeforeShape = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
}

function draw(event) {
    if (!isDrawing) {
        return;
    }

    event.preventDefault();

    const position = getCanvasPosition(event);

    ctx.lineWidth = currentSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentTool === "eraser" ? backgroundColor : currentColor;

    if (currentTool === "brush" || currentTool === "eraser") {
        ctx.lineTo(position.x, position.y);
        ctx.stroke();
        return;
    }

    if (isShapeTool()) {
        ctx.putImageData(snapshotBeforeShape, 0, 0);
        drawShapePreview(position.x, position.y);
    }
}

function stopDrawing() {
    if (!isDrawing) {
        return;
    }

    isDrawing = false;
    ctx.beginPath();
    saveCanvasState();
}

function isShapeTool() {
    return currentTool === "line" || currentTool === "rectangle" || currentTool === "circle";
}

function drawShapePreview(currentX, currentY) {
    ctx.beginPath();
    ctx.lineWidth = currentSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = currentColor;

    if (currentTool === "line") {
        ctx.moveTo(startX, startY);
        ctx.lineTo(currentX, currentY);
    }

    if (currentTool === "rectangle") {
        ctx.rect(startX, startY, currentX - startX, currentY - startY);
    }

    if (currentTool === "circle") {
        const radius = Math.sqrt(
            Math.pow(currentX - startX, 2) + Math.pow(currentY - startY, 2)
        );

        ctx.arc(startX, startY, radius, 0, Math.PI * 2);
    }

    ctx.stroke();
}

function saveCanvasState() {
    if (undoStack.length >= 20) {
        undoStack.shift();
    }

    undoStack.push(canvas.toDataURL("image/png"));
}

function restoreCanvasState(imageDataUrl) {
    const image = new Image();

    image.onload = function () {
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(image, 0, 0);
    };

    image.src = imageDataUrl;
}

function undoCanvas() {
    if (undoStack.length <= 1) {
        return;
    }

    undoStack.pop();
    restoreCanvasState(undoStack[undoStack.length - 1]);
    drawingMessage.textContent = "Undo applied.";
}

function setActiveTool(toolName) {
    currentTool = toolName;
    unlockAudio();
    playTone(520, 0.06, 0.05);

    const allToolButtons = [brushBtn, eraserBtn, lineBtn, rectBtn, circleBtn];

    allToolButtons.forEach(function (button) {
        button.classList.remove("active");
    });

    if (toolName === "brush") {
        brushBtn.classList.add("active");
        drawingMessage.textContent = "Brush selected. Draw freely.";
    }

    if (toolName === "eraser") {
        eraserBtn.classList.add("active");
        drawingMessage.textContent = "Eraser selected. Remove mistakes carefully.";
    }

    if (toolName === "line") {
        lineBtn.classList.add("active");
        drawingMessage.textContent = "Line tool selected. Drag to create a line.";
    }

    if (toolName === "rectangle") {
        rectBtn.classList.add("active");
        drawingMessage.textContent = "Rectangle tool selected. Drag to create a box.";
    }

    if (toolName === "circle") {
        circleBtn.classList.add("active");
        drawingMessage.textContent = "Circle tool selected. Drag outward to create a circle.";
    }

    updateCursorStyle();
}

function updateCursorStyle() {
    cursorDot.classList.remove("cursor-brush", "cursor-eraser", "cursor-shape");

    if (currentTool === "brush") {
        cursorDot.classList.add("cursor-brush");
        cursorDot.style.borderColor = currentColor;
        cursorDot.style.background = "transparent";
    } else if (currentTool === "eraser") {
        cursorDot.classList.add("cursor-eraser");
        cursorDot.style.borderColor = "#ff4d4d";
        cursorDot.style.background = "rgba(255, 77, 77, 0.12)";
    } else {
        cursorDot.classList.add("cursor-shape");
        cursorDot.style.borderColor = "#202020";
        cursorDot.style.background = "rgba(0, 0, 0, 0.06)";
    }

    const cursorSize = Math.max(currentSize * 2, 12);

    cursorDot.style.width = cursorSize + "px";
    cursorDot.style.height = cursorSize + "px";
}

function moveCursor(event) {
    if (event.pointerType === "touch") {
        cursorDot.style.display = "none";
        return;
    }

    const rect = canvas.getBoundingClientRect();

    cursorDot.style.left = (event.clientX - rect.left) + "px";
    cursorDot.style.top = (event.clientY - rect.top) + "px";
}

brushBtn.addEventListener("click", function () {
    setActiveTool("brush");
});

eraserBtn.addEventListener("click", function () {
    setActiveTool("eraser");
});

lineBtn.addEventListener("click", function () {
    setActiveTool("line");
});

rectBtn.addEventListener("click", function () {
    setActiveTool("rectangle");
});

circleBtn.addEventListener("click", function () {
    setActiveTool("circle");
});

colorPicker.addEventListener("input", function () {
    unlockAudio();
    currentColor = colorPicker.value;
    setActiveTool("brush");
    updateCursorStyle();
});

brushSize.addEventListener("input", function () {
    unlockAudio();
    currentSize = Number(brushSize.value);
    brushSizeText.textContent = currentSize;
    updateCursorStyle();
});

gridBtn.addEventListener("click", function () {
    unlockAudio();
    gridVisible = !gridVisible;
    canvasWrap.classList.toggle("grid-on", gridVisible);
    gridBtn.textContent = gridVisible ? "Grid Off" : "Grid";
    playTone(470, 0.06, 0.05);
});

undoBtn.addEventListener("click", function () {
    unlockAudio();
    undoCanvas();
    playTone(420, 0.06, 0.05);
});

downloadBtn.addEventListener("click", function () {
    unlockAudio();

    const link = document.createElement("a");
    link.download = "memory-drawing.png";
    link.href = canvas.toDataURL("image/png");
    link.click();

    playTone(620, 0.08, 0.05);
});

clearBtn.addEventListener("click", function () {
    unlockAudio();

    const confirmClear = confirm("Clear your drawing?");

    if (!confirmClear) {
        return;
    }

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    saveCanvasState();

    drawingMessage.textContent = "Canvas cleared. Start again with the main outline.";
    playTone(260, 0.1, 0.06);
});

canvas.addEventListener("pointerdown", function (event) {
    canvas.setPointerCapture(event.pointerId);
    startDrawing(event);
});

canvas.addEventListener("pointermove", function (event) {
    moveCursor(event);
    draw(event);
});

canvas.addEventListener("pointerup", function (event) {
    stopDrawing();

    if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
    }
});

canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("pointerleave", stopDrawing);

canvas.addEventListener("pointerenter", function (event) {
    if (event.pointerType === "mouse" || event.pointerType === "pen") {
        cursorDot.style.display = "block";
    }
});

canvas.addEventListener("pointerleave", function () {
    cursorDot.style.display = "none";
});

document.addEventListener("keydown", function (event) {
    const key = event.key.toLowerCase();

    if ((event.ctrlKey || event.metaKey) && key === "z") {
        event.preventDefault();
        undoCanvas();
        return;
    }

    if (key === "b") {
        setActiveTool("brush");
    }

    if (key === "e") {
        setActiveTool("eraser");
    }

    if (key === "l") {
        setActiveTool("line");
    }

    if (key === "r") {
        setActiveTool("rectangle");
    }

    if (key === "c") {
        setActiveTool("circle");
    }
});

document.addEventListener("pointerdown", unlockAudio, { once: true });
document.addEventListener("keydown", unlockAudio, { once: true });

let timeLeft = Number(settings.drawTime) || 15;
drawTimer.textContent = timeLeft;

const drawingCountdown = setInterval(function () {
    timeLeft--;
    drawTimer.textContent = timeLeft;

    if (timeLeft === 10) {
        drawingMessage.textContent = "10 seconds left. Add the most important details.";
        playTone(520, 0.1, 0.07, "triangle");
    }

    if (timeLeft <= 5 && timeLeft > 0) {
        document.querySelector(".timer-box").classList.add("timer-warning");
        drawingMessage.textContent = "Final seconds. Finish your drawing!";

        playTone(900, 0.07, 0.08, "square");

        setTimeout(function () {
            playTone(1200, 0.06, 0.07, "square");
        }, 90);
    }

    if (timeLeft <= 0) {
        clearInterval(drawingCountdown);

        playTone(220, 0.22, 0.09, "sawtooth");

        setTimeout(function () {
            playTone(160, 0.25, 0.08, "sawtooth");
        }, 180);

        finishDrawing(true);
    }
}, 1000);

function finishDrawing(autoSubmit) {
    if (hasSubmitted) {
        return;
    }

    if (!autoSubmit) {
        const confirmSubmit = confirm("Submit your drawing?");

        if (!confirmSubmit) {
            return;
        }
    }

    hasSubmitted = true;

    const drawingData = canvas.toDataURL("image/png");

    saveData("playerDrawing", drawingData);
    saveData("drawingCompleted", true);

    window.location.href = "result.html";
}

submitDrawing.addEventListener("click", function () {
    unlockAudio();
    clearInterval(drawingCountdown);
    playTone(620, 0.08, 0.06);
    finishDrawing(false);
});