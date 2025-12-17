let player = 10;
let pot = 10;

const playerEl = document.getElementById("player");
const potEl = document.getElementById("pot");
const resultText = document.getElementById("resultText");

function resolveSpin(result) {
    // result should be one of: 'Nun', 'Gimmel', 'Hey', 'Shin'
    switch (result) {
        case "Nun":
            resultText.textContent = "Nun — nothing happens.";
            break;
        case "Gimmel":
            resultText.textContent = "Gimmel — take the pot!";
            player += pot;
            pot = 0;
            break;
        case "Hey":
            const half = Math.floor(pot / 2);
            resultText.textContent = "Hey — take half.";
            player += half;
            pot -= half;
            break;
        case "Shin":
            resultText.textContent = "Shin — add one to the pot.";
            if (player > 0) {
                player--;
                pot++;
            }
            break;
        default:
            resultText.textContent = `Unknown result: ${result}`;
    }

    playerEl.textContent = player;
    potEl.textContent = pot;
}
