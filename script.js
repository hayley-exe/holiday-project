const MODELS = [
    { name: 'Red', file: 'models/red-tinker.obj', color: '#d32f2f' },
    { name: 'Orange', file: 'models/orange-tinker.obj', color: '#ff9800' },
    { name: 'Yellow', file: 'models/yellow-tinker.obj', color: '#ffeb3b' },
    { name: 'Green', file: 'models/green-tinker.obj', color: '#4caf50' },
    { name: 'Light Blue', file: 'models/lightblue-tinker.obj', color: '#3bd1ff' },
    { name: 'Blue', file: 'models/blue-tinker.obj', color: '#2196f3' },
    { name: 'Purple', file: 'models/purple-tinker.obj', color: '#9c27b0' }
];

let currentModel = null;
const sides = ['Nun', 'Gimmel', 'Hey', 'Shin']; // Adjust order if your models' faces don't match

let spinAngle = 0, spinSpeed = 0, spinning = false;

const playSpaceEl = document.getElementById('playSpace');
const modelSelect = document.getElementById('modelSelect');
const spinBtn = document.getElementById('spinBtn');
const colorPreview = document.getElementById('colorPreview');
const resultText = document.getElementById('resultText');

MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name; opt.textContent = m.name;
    modelSelect.appendChild(opt);
});

function loadModelByName(name) {
    const sel = MODELS.find(m => m.name === name);
    loadModel(sel.file, true, mod => {
        currentModel = mod;
        colorPreview.style.background = sel.color;
        spinAngle = 0;
    });
}

modelSelect.addEventListener('change', () => loadModelByName(modelSelect.value));
spinBtn.addEventListener('click', () => {
    if (!currentModel || spinning) return;
    spinning = true; spinSpeed = random(0.5, 0.7);
    spinAngle = 0; spinBtn.disabled = true;
    resultText.textContent = 'Spinning... 🕎';
});

function preload() { loadModelByName(MODELS[3].name); modelSelect.value = MODELS[3].name; } // Default Green

function setup() {
    createCanvas(playSpaceEl.clientWidth, playSpaceEl.clientHeight, WEBGL).parent(playSpaceEl);
    ambientLight(150); directionalLight(255, 255, 255, 0.4, -1, 0.5);
    const cam = createCamera(); cam.setPosition(0, -180, 420); cam.lookAt(0, 40, 0);
}

function draw() {
    background(180, 220, 255, 0);
    push(); translate(0, 210, 0); rotateX(HALF_PI); fill(0, 0, 0, 30); ellipse(0, 0, 520, 520); pop();

    if (spinning) {
        spinAngle += spinSpeed; spinSpeed *= 0.982;
        if (spinSpeed < 0.01) {
            const norm = (spinAngle % TWO_PI + TWO_PI) % TWO_PI;
            const face = Math.round(norm / HALF_PI) % 4;
            const target = face * HALF_PI;
            spinAngle += (target - norm) * 0.2;
            if (abs(target - norm) < 0.01) {
                spinning = false; spinBtn.disabled = false;
                resolveSpin(sides[face]);
            }
        }
    }

    if (currentModel) {
        push(); translate(0, 40, 0);
        const wobble = spinning ? sin(frameCount * 0.45) * spinSpeed * 20 : 0;
        rotateX(radians(wobble)); rotateZ(radians(wobble * 0.5));
        rotateY(spinAngle + PI);
        scale(1.8); normalMaterial(); model(currentModel); pop();
    }
}

function windowResized() { resizeCanvas(playSpaceEl.clientWidth, playSpaceEl.clientHeight); }