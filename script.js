import * as THREE from 'https://unpkg.com/three@0.153.0/build/three.module.js';
import { OrbitControls } from 'https://unpkg.com/three@0.153.0/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'https://unpkg.com/three@0.153.0/examples/jsm/loaders/OBJLoader.js';

// Model list (filename -> display name + color swatch)
const MODELS = [
    { name: 'Red', file: 'red-tinker.obj' },
    { name: 'Orange', file: 'orange-tinker.obj' },
    { name: 'Yellow', file: 'yellow-tinker.obj' },
    { name: 'Green', file: 'green-tinker.obj' },
    { name: 'Light Blue', file: 'lightblue-tinker.obj' },
    { name: 'Blue', file: 'blue-tinker.obj' },
    { name: 'Purple', file: 'purple-tinker.obj' },
    { name: 'Pink', file: 'pink-tinker.obj' }
];

// UI elements
const canvas = document.getElementById('dreidel-canvas');
const spinBtn = document.getElementById('spinBtn');
const resultText = document.getElementById('resultText');
const potEl = document.getElementById('pot');
const playerEl = document.getElementById('player');
const potGelt = document.getElementById('potGelt');
const playerGelt = document.getElementById('playerGelt');
const modelSelect = document.getElementById('model-select');
const colorSwatch = document.getElementById('color-swatch');

let scene, camera, renderer, controls, loader;
let currentModel = null;
let spinning = false;
let angularSpeed = 0; // rad/sec
let lastTime = 0;

// Game state
let pot = 10;
let player = 10;

function updateGeltUI() {
    potEl.textContent = pot;
    playerEl.textContent = player;
    potGelt.textContent = pot;
    playerGelt.textContent = player;
}

function populateModelSelect() {
    MODELS.forEach((m, i) => {
        const opt = document.createElement('option');
        opt.value = m.file;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
    });
    // set swatch for first
    setSwatchColor(MODELS[0].color);
}

function setSwatchColor(hex) {
    if (!colorSwatch) return;
    colorSwatch.style.background = hex;
}

function initThree() {
    scene = new THREE.Scene();
    const container = document.getElementById('thing-container');

    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    resizeRenderer();

    camera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
    camera.position.set(0, 1.5, 3);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.target.set(0, 0.5, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7.5);
    scene.add(dir);

    // ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(10, 10),
        new THREE.MeshStandardMaterial({ color: '#f5f5f5' })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    scene.add(ground);

    loader = new OBJLoader();

    window.addEventListener('resize', resizeRenderer);
}

function resizeRenderer() {
    const w = canvas.clientWidth || 640;
    const h = parseInt(canvas.style.height) || 480;
    renderer.setSize(w, h, false);
    if (camera) camera.aspect = w / h;
    if (camera) camera.updateProjectionMatrix();
}

function setModelColor(obj, hex) {
    obj.traverse(child => {
        if (child.isMesh) {
            if (child.material) {
                // replace or set color
                try {
                    child.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex), flatShading: false });
                } catch (e) {
                    // ignore
                }
            } else {
                child.material = new THREE.MeshStandardMaterial({ color: new THREE.Color(hex) });
            }
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
}

function loadModel(file, colorHex) {
    return new Promise((resolve, reject) => {
        loader.load(file, obj => {
            // center & scale
            const box = new THREE.Box3().setFromObject(obj);
            const size = new THREE.Vector3();
            box.getSize(size);
            const maxDim = Math.max(size.x, size.y, size.z);
            const scale = (1.2 / maxDim) || 1;
            obj.scale.setScalar(scale);

            // recenter
            box.setFromObject(obj);
            const center = new THREE.Vector3();
            box.getCenter(center);
            obj.position.sub(center);
            obj.position.y += 0.5; // lift a bit

            setModelColor(obj, colorHex);

            resolve(obj);
        }, undefined, err => reject(err));
    });
}

async function switchModel(file, colorHex) {
    if (currentModel) scene.remove(currentModel);
    try {
        const obj = await loadModel(file, colorHex);
        currentModel = obj;
        scene.add(currentModel);
    } catch (e) {
        console.error('Failed to load model', e);
        resultText.textContent = 'Failed to load model: see console';
    }
}

function randRange(a, b) { return a + Math.random() * (b - a); }

function spinOutcome() {
    const outcomes = ['Nun', 'Gimmel', 'Hey', 'Shin'];
    return outcomes[Math.floor(Math.random() * outcomes.length)];
}

function applyOutcome(outcome) {
    switch (outcome) {
        case 'Nun':
            resultText.textContent = 'Nun — nothing happens.';
            break;
        case 'Gimmel':
            resultText.textContent = 'Gimmel — you take the whole pot!';
            player += pot;
            pot = 0;
            break;
        case 'Hey': {
            const take = Math.floor(pot / 2);
            resultText.textContent = `Hey — take half the pot (${take}).`;
            player += take;
            pot -= take;
            break;
        }
        case 'Shin':
            resultText.textContent = 'Shin — put one gelt into the pot.';
            if (player > 0) {
                player -= 1;
                pot += 1;
            } else {
                resultText.textContent += ' (no gelt to contribute)';
            }
            break;
    }
    updateGeltUI();
}

function startSpin() {
    if (spinning) return;
    spinning = true;
    spinBtn.disabled = true;
    resultText.textContent = 'Spinning...';

    // set a random angular velocity and tilt
    angularSpeed = randRange(18, 36) * (Math.PI / 180); // rad/sec
    // Add a random spin boost
    angularSpeed *= randRange(6, 12);
}

function stopSpinWithOutcome() {
    const outcome = spinOutcome();
    applyOutcome(outcome);
    spinning = false;
    spinBtn.disabled = false;
}

function animate(time) {
    requestAnimationFrame(animate);
    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (currentModel) {
        if (spinning) {
            // apply rotation around Y and a little wobble
            currentModel.rotation.y += angularSpeed * dt;
            currentModel.rotation.x = Math.sin(time / 200) * 0.15;

            // decay
            angularSpeed *= Math.pow(0.98, dt * 60);

            if (angularSpeed < 0.01) {
                // finalize
                stopSpinWithOutcome();
            }
        } else {
            // subtle idle rotation
            currentModel.rotation.y += 0.002;
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

// initialization
populateModelSelect();
initThree();
// load first model
switchModel(MODELS[0].file, MODELS[0].color);
updateGeltUI();

// events
modelSelect.addEventListener('change', (e) => {
    const file = e.target.value;
    const entry = MODELS.find(m => m.file === file) || MODELS[0];
    setSwatchColor(entry.color);
    switchModel(entry.file, entry.color);
});

spinBtn.addEventListener('click', () => startSpin());

// keyboard: space to spin
window.addEventListener('keydown', (e) => { if (e.code === 'Space') startSpin(); });

// begin animation
requestAnimationFrame(animate);

