function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function loadData(key, fallbackValue) {
    const savedValue = localStorage.getItem(key);

    if (savedValue === null) {
        return fallbackValue;
    }

    try {
        return JSON.parse(savedValue);
    } catch {
        return fallbackValue;
    }
}

let gameAudioContext = null;

function unlockGameAudio() {
    if (gameAudioContext !== null) {
        return;
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    if (!AudioContextClass) {
        return;
    }

    gameAudioContext = new AudioContextClass();
}

function playGameTone(frequency, duration, volume, type = "sine") {
    const soundOn = loadData("soundOn", true);

    if (!soundOn || gameAudioContext === null) {
        return;
    }

    const oscillator = gameAudioContext.createOscillator();
    const gain = gameAudioContext.createGain();

    oscillator.type = type;
    oscillator.frequency.value = frequency;

    gain.gain.setValueAtTime(volume, gameAudioContext.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, gameAudioContext.currentTime + duration);

    oscillator.connect(gain);
    gain.connect(gameAudioContext.destination);

    oscillator.start();
    oscillator.stop(gameAudioContext.currentTime + duration);
}

function playClickSound() {
    unlockGameAudio();

    const soundOn = loadData("soundOn", true);
    if (!soundOn || gameAudioContext === null) return;

    const now = gameAudioContext.currentTime;

    // Click "pop" (fast attack)
    const osc1 = gameAudioContext.createOscillator();
    const gain1 = gameAudioContext.createGain();

    osc1.type = "triangle";
    osc1.frequency.setValueAtTime(600, now);

    gain1.gain.setValueAtTime(0.08, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc1.connect(gain1);
    gain1.connect(gameAudioContext.destination);

    osc1.start(now);
    osc1.stop(now + 0.08);

    // High sparkle layer
    const osc2 = gameAudioContext.createOscillator();
    const gain2 = gameAudioContext.createGain();

    osc2.type = "square";
    osc2.frequency.setValueAtTime(1200, now + 0.02);

    gain2.gain.setValueAtTime(0.05, now + 0.02);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc2.connect(gain2);
    gain2.connect(gameAudioContext.destination);

    osc2.start(now + 0.02);
    osc2.stop(now + 0.1);

    // Tiny bass "tap"
    const osc3 = gameAudioContext.createOscillator();
    const gain3 = gameAudioContext.createGain();

    osc3.type = "sine";
    osc3.frequency.setValueAtTime(180, now);

    gain3.gain.setValueAtTime(0.04, now);
    gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc3.connect(gain3);
    gain3.connect(gameAudioContext.destination);

    osc3.start(now);
    osc3.stop(now + 0.1);
}

function playSuccessSound() {
    unlockGameAudio();

    playGameTone(520, 0.08, 0.055, "triangle");

    setTimeout(function () {
        playGameTone(660, 0.08, 0.05, "triangle");
    }, 90);

    setTimeout(function () {
        playGameTone(820, 0.12, 0.045, "triangle");
    }, 180);
}

function playWarningSound() {
    unlockGameAudio();

    playGameTone(900, 0.07, 0.06, "square");

    setTimeout(function () {
        playGameTone(1200, 0.06, 0.055, "square");
    }, 90);
}

function playEndSound() {
    unlockGameAudio();

    playGameTone(220, 0.22, 0.075, "sawtooth");

    setTimeout(function () {
        playGameTone(160, 0.25, 0.065, "sawtooth");
    }, 180);
}

document.addEventListener("pointerdown", unlockGameAudio, { once: true });
document.addEventListener("keydown", unlockGameAudio, { once: true });

document.addEventListener("click", function (event) {
    const clickableElement = event.target.closest("a, button, .difficulty-card, [onclick]");

    if (!clickableElement) {
        return;
    }

    playClickSound();

    if (clickableElement.tagName === "A") {
        const link = clickableElement.getAttribute("href");

        if (link && !link.startsWith("#") && !clickableElement.target) {
            event.preventDefault();

            setTimeout(function () {
                window.location.href = link;
            }, 140);
        }
    }
});