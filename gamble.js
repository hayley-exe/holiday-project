let player = 0;
let pot = 0;
let rules = null;

const playerEl = document.getElementById("player");
const potEl = document.getElementById("pot");
const resultText = document.getElementById("resultText");

function spawnChip(targetEl) {
    const chip = document.createElement('div');
    chip.classList.add('chip');

    const rect = targetEl.getBoundingClientRect();
    const x = rect.left + rect.width / 2 - 11;
    const y = rect.top + rect.height / 2 - 11;

    chip.style.left = x + 'px';
    chip.style.top = y + 'px';

    document.body.appendChild(chip);

    setTimeout(() => chip.remove(), 800);
}

fetch('gambling.json')
    .then(res => res.json())
    .then(data => {
        rules = data;
        player = rules.startingGelt.player;
        pot = rules.startingGelt.pot;
        updateUI();
        resultText.textContent = 'Ready to spin!';
    })
    .catch(err => {
        console.error(err);
        resultText.textContent = 'Failed to load rules.';
    });

function updateUI() {
    playerEl.textContent = player;
    potEl.textContent = pot;
}

function resolveSpin(result) {
    if (!rules) return;

    const symbol = rules.symbols.find(s => s.name === result);
    if (!symbol) return;

    let amount = 0;
    let fromPot = false;

    switch (symbol.effect) {
        case "nothing":
            resultText.textContent = `${result} — nothing happens.`;
            break;
        case "all":
            resultText.textContent = `${result} — take the whole pot!`;
            amount = pot;
            fromPot = true;
            player += pot;
            pot = 0;
            break;
        case "half":
            amount = Math.floor(pot / 2);
            resultText.textContent = `${result} — take half the pot!`;
            fromPot = true;
            player += amount;
            pot -= amount;
            break;
        case "put":
            resultText.textContent = `${result} — put one in the pot.`;
            if (player > 0) {
                amount = 1;
                player--;
                pot++;
                fromPot = false;
            } else {
                resultText.textContent += " (no gelt to put)";
            }
            break;
    }

    // Animate chips
    const target = fromPot ? playerEl : potEl;
    for (let i = 0; i < amount; i++) {
        setTimeout(() => spawnChip(target), i * 100);
    }

    updateUI();
}