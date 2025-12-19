let player = 0, pot = 0, rules = null;
const playerEl = document.getElementById("player");
const potEl = document.getElementById("pot");
const resultText = document.getElementById("resultText");

function spawnChip(targetEl) {
    const chip = document.createElement('div');
    chip.classList.add('chip');
    const rect = targetEl.getBoundingClientRect();
    chip.style.left = `${rect.left + rect.width / 2 - 11}px`;
    chip.style.top = `${rect.top + rect.height / 2 - 11}px`;
    document.body.appendChild(chip);
    setTimeout(() => chip.remove(), 800);
}

fetch('gambling.json')
    .then(res => res.json())
    .then(data => {
        rules = data;
        player = rules.startingGelt.player;
        pot = rules.startingGelt.pot;
        playerEl.textContent = player;
        potEl.textContent = pot;
        resultText.textContent = 'Ready to spin! 🕎';
    });

function resolveSpin(result) {
    if (!rules) return;
    const symbol = rules.symbols.find(s => s.name === result);
    if (!symbol) return;

    let amount = 0, toPlayer = true;
    switch (symbol.effect) {
        case "nothing": resultText.textContent = `${result} — Nothing happens.`; break;
        case "all":
            resultText.textContent = `${result} — Gimmel! Take everything!`;
            amount = pot; player += pot; pot = 0;
            break;
        case "half":
            amount = Math.floor(pot / 2);
            resultText.textContent = `${result} — Hey! Take half!`;
            player += amount; pot -= amount;
            break;
        case "put":
            resultText.textContent = `${result} — Shin! Put one in.`;
            if (player > 0) { amount = 1; player--; pot++; toPlayer = false; }
            else resultText.textContent += ' (No gelt!)';
            break;
    }
    const target = toPlayer ? playerEl : potEl;
    for (let i = 0; i < amount; i++) setTimeout(() => spawnChip(target), i * 80);
    playerEl.textContent = player; potEl.textContent = pot;
}