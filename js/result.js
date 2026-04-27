const originalImage = document.getElementById("originalImage");
const playerDrawing = document.getElementById("playerDrawing");

const scoreText = document.getElementById("scoreText");
const feedbackTitle = document.getElementById("feedbackTitle");
const feedbackMessage = document.getElementById("feedbackMessage");
const bestScoreText = document.getElementById("bestScoreText");
const gamesPlayedText = document.getElementById("gamesPlayedText");
const modeText = document.getElementById("modeText");
const newRecordBadge = document.getElementById("newRecordBadge");

const selectedImage = loadData("selectedImage", "img/circle.png");
const drawingData = loadData("playerDrawing", "");
const difficulty = loadData("roundDifficulty", loadData("difficulty", "normal"));

const modeNames = {
    easy: "Easy",
    normal: "Normal",
    hard: "Hard"
};

originalImage.src = selectedImage;
playerDrawing.src = drawingData;
modeText.textContent = modeNames[difficulty] || "Normal";

calculateSimilarity(selectedImage, drawingData);

function calculateSimilarity(originalSrc, drawingSrc) {
    if (!drawingSrc) {
        finishResult(0);
        return;
    }

    const original = new Image();
    const drawing = new Image();

    original.onload = function () {
        drawing.onload = function () {
            try {
                const score = compareStrictSimilarity(original, drawing);
                finishResult(score);
            } catch (error) {
                console.error("Scoring error:", error);
                finishResult(0);
            }
        };

        drawing.onerror = function () {
            finishResult(0);
        };

        drawing.src = drawingSrc;
    };

    original.onerror = function () {
        finishResult(0);
    };

    original.src = originalSrc;
}

function compareStrictSimilarity(original, drawing) {
    const size = 240;

    const originalMask = createShapeMask(original, size);
    const drawingMask = createShapeMask(drawing, size);

    if (originalMask.count < 40 || drawingMask.count < 40) {
        return 0;
    }

    const widthScore = getRatioScore(originalMask.width, drawingMask.width);
    const heightScore = getRatioScore(originalMask.height, drawingMask.height);
    const sizeScore = (widthScore + heightScore) / 2;

    const centreDistance = getDistance(
        originalMask.centerX,
        originalMask.centerY,
        drawingMask.centerX,
        drawingMask.centerY
    );

    const maxGoodDistance = size * 0.3;
    const positionScore = Math.max(0, 1 - centreDistance / maxGoodDistance);

    const amountScore = getRatioScore(originalMask.count, drawingMask.count);

    const overlapScore = getLooseOverlapScore(
        originalMask.pixels,
        drawingMask.pixels,
        size,
        10
    );

    const reverseOverlapScore = getLooseOverlapScore(
        drawingMask.pixels,
        originalMask.pixels,
        size,
        10
    );

    const shapeScore = (overlapScore * 0.6) + (reverseOverlapScore * 0.4);

    let finalScore =
        shapeScore * 55 +
        sizeScore * 20 +
        positionScore * 15 +
        amountScore * 10;

    /*
        Wrong-shape protection:
        If the actual shape overlap is low, the score is capped.
        This prevents random circles from scoring highly against a heart.
    */
    if (shapeScore < 0.18) {
        finalScore = Math.min(finalScore, 20);
    } else if (shapeScore < 0.28) {
        finalScore = Math.min(finalScore, 35);
    } else if (shapeScore < 0.4) {
        finalScore = Math.min(finalScore, 55);
    }

    finalScore = Math.round(finalScore);

    if (finalScore < 0) {
        finalScore = 0;
    }

    if (finalScore > 100) {
        finalScore = 100;
    }

    return finalScore;
}

function createShapeMask(image, size) {
    const sourceCanvas = document.createElement("canvas");
    const sourceCtx = sourceCanvas.getContext("2d");

    sourceCanvas.width = image.width;
    sourceCanvas.height = image.height;

    sourceCtx.clearRect(0, 0, sourceCanvas.width, sourceCanvas.height);
    sourceCtx.drawImage(image, 0, 0);

    const sourceData = sourceCtx.getImageData(
        0,
        0,
        sourceCanvas.width,
        sourceCanvas.height
    ).data;

    const sourceBox = findBounds(sourceData, sourceCanvas.width, sourceCanvas.height);

    if (!sourceBox) {
        return emptyMask(size);
    }

    const normalCanvas = document.createElement("canvas");
    const normalCtx = normalCanvas.getContext("2d");

    normalCanvas.width = size;
    normalCanvas.height = size;
    normalCtx.clearRect(0, 0, size, size);

    const padding = 28;
    const targetSize = size - padding * 2;

    const sourceWidth = sourceBox.maxX - sourceBox.minX + 1;
    const sourceHeight = sourceBox.maxY - sourceBox.minY + 1;

    const scale = Math.min(targetSize / sourceWidth, targetSize / sourceHeight);

    const drawWidth = sourceWidth * scale;
    const drawHeight = sourceHeight * scale;

    const x = (size - drawWidth) / 2;
    const y = (size - drawHeight) / 2;

    normalCtx.drawImage(
        sourceCanvas,
        sourceBox.minX,
        sourceBox.minY,
        sourceWidth,
        sourceHeight,
        x,
        y,
        drawWidth,
        drawHeight
    );

    const data = normalCtx.getImageData(0, 0, size, size).data;
    const pixels = new Uint8Array(size * size);

    let count = 0;
    let minX = size;
    let minY = size;
    let maxX = -1;
    let maxY = -1;
    let totalX = 0;
    let totalY = 0;

    for (let yPos = 0; yPos < size; yPos++) {
        for (let xPos = 0; xPos < size; xPos++) {
            const index = yPos * size + xPos;
            const i = index * 4;

            const alpha = data[i + 3];
            const brightness = getBrightness(data[i], data[i + 1], data[i + 2]);

            const hasShape = alpha > 20 && brightness < 248;

            if (hasShape) {
                pixels[index] = 1;
                count++;

                minX = Math.min(minX, xPos);
                minY = Math.min(minY, yPos);
                maxX = Math.max(maxX, xPos);
                maxY = Math.max(maxY, yPos);

                totalX += xPos;
                totalY += yPos;
            }
        }
    }

    if (count === 0) {
        return emptyMask(size);
    }

    return {
        pixels: pixels,
        count: count,
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY,
        width: maxX - minX + 1,
        height: maxY - minY + 1,
        centerX: totalX / count,
        centerY: totalY / count
    };
}

function findBounds(data, width, height) {
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const i = (y * width + x) * 4;

            const alpha = data[i + 3];
            const brightness = getBrightness(data[i], data[i + 1], data[i + 2]);

            if (alpha > 20 && brightness < 248) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (maxX === -1) {
        return null;
    }

    return {
        minX: minX,
        minY: minY,
        maxX: maxX,
        maxY: maxY
    };
}

function getLooseOverlapScore(sourcePixels, targetPixels, size, tolerance) {
    let sourceCount = 0;
    let matchedCount = 0;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const index = y * size + x;

            if (sourcePixels[index] !== 1) {
                continue;
            }

            sourceCount++;

            if (hasNearbyPixel(targetPixels, size, x, y, tolerance)) {
                matchedCount++;
            }
        }
    }

    if (sourceCount === 0) {
        return 0;
    }

    return matchedCount / sourceCount;
}

function hasNearbyPixel(pixels, size, centerX, centerY, tolerance) {
    for (let y = centerY - tolerance; y <= centerY + tolerance; y++) {
        for (let x = centerX - tolerance; x <= centerX + tolerance; x++) {
            if (x < 0 || y < 0 || x >= size || y >= size) {
                continue;
            }

            if (pixels[y * size + x] === 1) {
                return true;
            }
        }
    }

    return false;
}

function getRatioScore(a, b) {
    const smaller = Math.min(a, b);
    const larger = Math.max(a, b);

    if (larger === 0) {
        return 0;
    }

    return smaller / larger;
}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(
        Math.pow(x2 - x1, 2) +
        Math.pow(y2 - y1, 2)
    );
}

function emptyMask(size) {
    return {
        pixels: new Uint8Array(size * size),
        count: 0,
        minX: 0,
        minY: 0,
        maxX: 0,
        maxY: 0,
        width: 0,
        height: 0,
        centerX: 0,
        centerY: 0
    };
}

function getBrightness(red, green, blue) {
    return (red + green + blue) / 3;
}

function finishResult(finalScore) {
    let previousBest = loadData("bestScore", 0);
    let gamesPlayed = loadData("gamesPlayed", 0) + 1;

    if (finalScore > previousBest) {
        saveData("bestScore", finalScore);
        previousBest = finalScore;
        newRecordBadge.classList.add("show");

        if (typeof playSuccessSound === "function") {
            playSuccessSound();
        }
    }

    saveData("lastScore", finalScore);
    saveData("gamesPlayed", gamesPlayed);

    bestScoreText.textContent = previousBest + "%";
    gamesPlayedText.textContent = gamesPlayed;

    animateScore(finalScore);
    setFeedback(finalScore);
}

function animateScore(targetScore) {
    let currentScore = 0;

    if (targetScore === 0) {
        scoreText.textContent = "0%";
        return;
    }

    const scoreAnimation = setInterval(function () {
        currentScore++;
        scoreText.textContent = currentScore + "%";

        if (currentScore >= targetScore) {
            clearInterval(scoreAnimation);
        }
    }, 18);
}

function setFeedback(score) {
    if (score >= 90) {
        feedbackTitle.textContent = "Amazing Memory!";
        feedbackMessage.textContent = "Excellent result. Your drawing is very close to the original.";
        return;
    }

    if (score >= 75) {
        feedbackTitle.textContent = "Great Attempt!";
        feedbackMessage.textContent = "Strong result. You remembered the main shape well.";
        return;
    }

    if (score >= 60) {
        feedbackTitle.textContent = "Good Work!";
        feedbackMessage.textContent = "Nice effort. Try focusing on the outline and proportions next time.";
        return;
    }

    if (score >= 40) {
        feedbackTitle.textContent = "Nice Try!";
        feedbackMessage.textContent = "You captured some of the image. Try remembering the biggest shapes first.";
        return;
    }

    feedbackTitle.textContent = "Keep Practising!";
    feedbackMessage.textContent = "Memory drawing is difficult. Try again and focus on one clear feature at a time.";
}