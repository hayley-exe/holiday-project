// ---------- MODELS ----------
const MODELS = [
    { name: 'Red', file: 'models/red-tinker.obj', color: '#d32f2f' },
    { name: 'Orange', file: 'models/orange-tinker.obj', color: '#ff9800' },
    { name: 'Yellow', file: 'models/yellow-tinker.obj', color: '#ffeb3b' },
    { name: 'Green', file: 'models/green-tinker.obj', color: '#4caf50' },
    { name: 'Light Blue', file: 'models/lightblue-tinker.obj', color: '#3bd1ff' },
    { name: 'Blue', file: 'models/blue-tinker.obj', color: '#2196f3' },
    { name: 'Purple', file: 'models/purple-tinker.obj', color: '#9c27b0' }
];

let loadedModel = null;
let modelScale = 1.6;

const spinState = {
    curANG: 0,
    speed: 0,
    decAmount: 0.98,
    decelerating: false,
    turning: false,
    targetAngle: 0,
    sides: ['Nun', 'Gimmel', 'Hey', 'Shin']
};

const playSpaceEl = document.getElementById('playSpace');
const modelSelect = document.getElementById('modelSelect');
const spinBtn = document.getElementById('spinBtn');
const colorPreview = document.getElementById('colorPreview');
const resultText = document.getElementById('resultText');

// Populate dropdown
MODELS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.name;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
});

// Model change
modelSelect.addEventListener('change', () => {
    const sel = MODELS.find(m => m.name === modelSelect.value);
    if (sel && loadedModel) {  // Only change if already loaded something
        loadModel(sel.file, true, (m) => {
            loadedModel = m;
            colorPreview.style.background = sel.color;
            spinState.curANG = 0; // Reset orientation
        });
    }
});

// Spin button
spinBtn.addEventListener('click', () => {
    if (!loadedModel || spinState.turning || (player <= 0 && pot <= 0)) return;
    startSpin();
});

function startSpin() {
    spinState.turning = true;
    spinState.decelerating = false;
    spinState.speed = random(0.4, 0.6); // Fast initial spin
    spinState.targetAngle = spinState.curANG + random(12, 20) * TWO_PI; // Many full spins
    spinBtn.disabled = true;
    resultText.textContent = 'Spinning...';
}

// p5.js
function preload() {
    const initial = MODELS[0];
    loadedModel = loadModel(initial.file, true);
    colorPreview.style.background = initial.color;
}

function setup() {
    const canvas = createCanvas(playSpaceEl.clientWidth, playSpaceEl.clientHeight, WEBGL);
    canvas.parent(playSpaceEl);

    // Lighting
    ambientLight(160);
    directionalLight(255, 255, 255, 0.3, -0.8, 0.5);

    // Camera
    const cam = createCamera();
    cam.setPosition(0, -180, 400);
    cam.lookAt(0, 20, 0);

    modelSelect.value = MODELS[0].name;
}

function draw() {
    background(180, 220, 251, 0); // Transparent to keep CSS gradient

    // Simple floor
    push();
    translate(0, 200, 0);
    rotateX(HALF_PI);
    fill(255, 255, 255, 100);
    circle(0, 0, 600);
    pop();

    // Update spin
    if (spinState.turning) {
        if (!spinState.decelerating) {
            spinState.curANG += spinState.speed;
            spinState.speed *= 0.995; // Slight natural slowdown

            if (spinState.curANG >= spinState.targetAngle) {
                spinState.decelerating = true;
            }
        } else {
            // Snap to nearest 90° face
            const normalized = spinState.curANG % TWO_PI;
            const faceIndex = Math.round(normalized / HALF_PI) % 4;
            const targetFaceAngle = faceIndex * HALF_PI;

            spinState.curANG += (targetFaceAngle - normalized) * 0.12;
            spinState.speed *= spinState.decAmount;

            if (abs(targetFaceAngle - normalized) < 0.01 && spinState.speed < 0.005) {
                spinState.turning = false;
                spinState.curANG = spinState.curANG - normalized + targetFaceAngle; // Lock it
                finalizeSpin(faceIndex);
            }
        }
    }

    // Draw dreidel
    push();
    translate(0, 20, 0);

    // Wobble during spin
    const wobbleAmount = spinState.turning ? sin(frameCount * 0.4) * min(spinState.speed * 10, 0.2) : 0;
    rotateX(-HALF_PI + wobbleAmount);
    rotateZ(wobbleAmount * 0.5);
    rotateY(spinState.curANG + PI);

    scale(modelScale);
    normalMaterial(); // Good for colored OBJs
    model(loadedModel);
    pop();
}

function finalizeSpin(faceIndex) {
    const result = spinState.sides[faceIndex];
    spinBtn.disabled = false;
    if (typeof resolveSpin === 'function') {
        resolveSpin(result);
    }
}

function windowResized() {
    resizeCanvas(playSpaceEl.clientWidth, playSpaceEl.clientHeight);
}