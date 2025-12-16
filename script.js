let config;
let symbols = [];
let pot = 0;
let player = 0;

const potText = document.getElementById("pot");
const playerText = document.getElementById("player");
const resultText = document.getElementById("resultText");

/* Load rules */
fetch("gambling.json")
    .then(res => res.json())
    .then(data => {
        config = data;
        symbols = data.symbols;
        pot = data.startingGelt.pot;
        player = data.startingGelt.player;
        updateUI("Ready to spin!");
    });

function weightedSpin() {
    let r = Math.random();
    let sum = 0;
    for (let s of symbols) {
        sum += s.probability;
        if (r <= sum) return s;
    }
}

function spinDreidel() {
    const result = weightedSpin();
    spinToSymbol(result.letter);

    setTimeout(() => {
        applyResult(result.action);
    }, config.spinDurationMs);
}

function applyResult(action) {
    let msg = "";

    switch (action) {
        case "nothing":
            msg = "Nothing happens.";
            break;
        case "all":
            player += pot;
            pot = 0;
            msg = "You take all the gelt!";
            break;
        case "half":
            const half = Math.floor(pot / 2);
            pot -= half;
            player += half;
            msg = "You take half the pot.";
            break;
        case "put":
            if (player > 0) {
                player--;
                pot++;
                msg = "You add one gelt.";
            } else {
                msg = "No gelt to put in.";
            }
            break;
    }

    updateUI(msg);
}

function updateUI(msg) {
    potText.textContent = pot;
    playerText.textContent = player;
    resultText.textContent = msg;
}
