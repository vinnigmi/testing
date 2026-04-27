function selectDifficulty(level) {

    // Save difficulty
    saveData("difficulty", level);

    // Set game settings based on difficulty
    let settings = {};

    if (level === "easy") {
        settings = {
            viewTime: 6,
            drawTime: 20
        };
    }

    if (level === "normal") {
        settings = {
            viewTime: 4,
            drawTime: 15
        };
    }

    if (level === "hard") {
        settings = {
            viewTime: 2,
            drawTime: 10
        };
    }

    saveData("gameSettings", settings);

    // Redirect to game page
    setTimeout(function () {
        window.location.href = "game.html";
    }, 180);
}