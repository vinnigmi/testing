const timerText = document.getElementById("timerText");
const progressFill = document.getElementById("progressFill");
const memoryImage = document.getElementById("memoryImage");
const imageStage = document.getElementById("imageStage");
const roundMessage = document.getElementById("roundMessage");
const memoryTip = document.getElementById("memoryTip");
const difficultyLabel = document.getElementById("difficultyLabel");
const bestScoreMini = document.getElementById("bestScoreMini");

const difficulty = loadData("difficulty", "normal");

const settings = loadData("gameSettings", {
    viewTime: 4,
    drawTime: 15
});

const imageLibrary = {
    easy: [
        "img/easy/circle.png",
        "img/easy/triangle.png",
        "img/easy/square.png",
        "img/easy/star.png",
        "img/easy/heart.png",
        "img/easy/cloud.png",
        "img/easy/sun.png",
        "img/easy/leaf.png",
        "img/easy/balloon.png",
        "img/easy/fish.png"
    ],
    normal: [
        "img/normal/crab.png",
        "img/normal/cat.png",
        "img/normal/cup.png",
        "img/normal/rocket.png",
        "img/normal/flower.png",
        "img/normal/house.png",
        "img/normal/tree.png",
        "img/normal/car.png",
        "img/normal/icecream.png",
        "img/normal/key.png"
    ],
    hard: [
        "img/hard/bicycle.png",
        "img/hard/robot.png",
        "img/hard/dragon.png",
        "img/hard/castle.png",
        "img/hard/airplane.png",
        "img/hard/elephant.png",
        "img/hard/guitar.png",
        "img/hard/clock.png",
        "img/hard/camera.png",
        "img/hard/shoe.png"
    ]
};

const tips = [
    "Look for the biggest shape first.",
    "Notice where the image sits inside the box.",
    "Remember one special detail before time runs out.",
    "Focus on outline first, then small details.",
    "Think in simple shapes: circles, lines, curves."
];

const modeNames = {
    easy: "Easy Mode",
    normal: "Normal Mode",
    hard: "Hard Mode"
};

difficultyLabel.textContent = modeNames[difficulty] || "Normal Mode";
bestScoreMini.textContent = loadData("bestScore", 0) + "%";

let availableImages = imageLibrary[difficulty];

if (!availableImages || availableImages.length === 0) {
    availableImages = imageLibrary.normal;
}

const usedImagesKey = "usedImages_" + difficulty;
let usedImages = loadData(usedImagesKey, []);

let unusedImages = availableImages.filter(function (image) {
    return !usedImages.includes(image);
});

if (unusedImages.length === 0) {
    const lastUsedImage = usedImages[usedImages.length - 1];

    usedImages = [];

    unusedImages = availableImages.filter(function (image) {
        return image !== lastUsedImage;
    });

    if (unusedImages.length === 0) {
        unusedImages = availableImages;
    }
}

const randomIndex = Math.floor(Math.random() * unusedImages.length);
const selectedImage = unusedImages[randomIndex];

usedImages.push(selectedImage);
saveData(usedImagesKey, usedImages);

const randomTip = tips[Math.floor(Math.random() * tips.length)];

saveData("selectedImage", selectedImage);
saveData("gameStarted", true);
saveData("roundDifficulty", difficulty);

memoryImage.src = selectedImage;
memoryTip.textContent = randomTip;

let timeLeft = Number(settings.viewTime) || 4;
const totalTime = timeLeft;

timerText.textContent = timeLeft;
roundMessage.textContent = "Memorise the image before it disappears.";
progressFill.style.width = "100%";

const countdown = setInterval(function () {
    timeLeft--;

    timerText.textContent = timeLeft;

    const progressPercent = (timeLeft / totalTime) * 100;
    progressFill.style.width = progressPercent + "%";

    if (timeLeft === 3) {
        roundMessage.textContent = "Lock the image into your memory.";
    }

    if (timeLeft <= 2 && timeLeft > 0) {
        roundMessage.textContent = "Almost time to draw...";
        document.querySelector(".timer-ring").classList.add("timer-warning");
    }

    if (timeLeft <= 0) {
        clearInterval(countdown);

        roundMessage.textContent = "Image hidden. Drawing starts now!";
        memoryImage.classList.add("fade-away");
        imageStage.classList.add("fade-away");

        setTimeout(function () {
            window.location.href = "drawing.html";
        }, 850);
    }
}, 1000);