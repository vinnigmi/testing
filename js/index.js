document.addEventListener("DOMContentLoaded", function () {
    const bestScoreEl = document.getElementById("bestScore");
    const gamesPlayedEl = document.getElementById("gamesPlayed");
    const scoreBubble = document.getElementById("scoreBubble");
    const scorePanel = document.querySelector(".score-panel");

    const bestScore = loadData("bestScore", 0);
    const gamesPlayed = loadData("gamesPlayed", 0);
    const lastScore = loadData("lastScore", null);

    animateNumber(bestScoreEl, bestScore, "%");
    animateNumber(gamesPlayedEl, gamesPlayed, "");

    if (gamesPlayed === 0) {
        scoreBubble.textContent = "No attempts yet";
        return;
    }

    if (lastScore !== null) {
        scoreBubble.textContent = lastScore + "%";

        if (lastScore >= 80) {
            scorePanel.style.borderColor = "#7CFF9B";
        } else if (lastScore >= 50) {
            scorePanel.style.borderColor = "#FFD84D";
        } else {
            scorePanel.style.borderColor = "#FF8A8A";
        }
    } else {
        scoreBubble.textContent = "Play to see score!";
    }
});

function animateNumber(element, targetNumber, suffix) {
    let currentNumber = 0;

    if (targetNumber === 0) {
        element.textContent = "0" + suffix;
        return;
    }

    const animation = setInterval(function () {
        currentNumber++;
        element.textContent = currentNumber + suffix;

        if (currentNumber >= targetNumber) {
            clearInterval(animation);
        }
    }, 18);
}