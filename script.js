let scene, camera, renderer, controls;
let dreidel = null, spinning = false, angularSpeed = 0, spinAxis = new THREE.Vector3();
let spinResolveTimeout = null;

const MODELS = [
    { name: "Red", file: "models/red-tinker.obj", color: 0xd32f2f },
    { name: "Orange", file: "models/orange-tinker.obj", color: 0xff9800 },
    { name: "Yellow", file: "models/yellow-tinker.obj", color: 0xffeb3b },
    { name: "Green", file: "models/green-tinker.obj", color: 0x4caf50 },
    { name: "Blue", file: "models/blue-tinker.obj", color: 0x2196f3 }
];

const playSpace = document.getElementById("playSpace");
const modelSelect = document.getElementById("modelSelect");
const spinBtn = document.getElementById("spinBtn");
const colorPreview = document.getElementById("colorPreview");

MODELS.forEach(m => {
    const opt = document.createElement("option");
    opt.value = m.file;
    opt.textContent = m.name;
    modelSelect.appendChild(opt);
});

modelSelect.addEventListener('change', () => {
    const sel = MODELS.find(x => x.file === modelSelect.value);
    if (sel) loadModel(sel.file, sel.color);
});

spinBtn.addEventListener('click', () => {
    if (!dreidel || spinning) return;
    startSpin();
});

window.addEventListener('resize', () => {
    if (!renderer || !camera) return;
    camera.aspect = playSpace.clientWidth / playSpace.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(playSpace.clientWidth, playSpace.clientHeight);
});

initThree();
loadModel(MODELS[0].file, MODELS[0].color);
animate();

function initThree() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x222222);

    camera = new THREE.PerspectiveCamera(45, playSpace.clientWidth / playSpace.clientHeight, 0.1, 100);
    camera.position.set(0, 2, 5);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(3, 10, 10);
    scene.add(dir);

    const ambient = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambient);

    // ground
    const ground = new THREE.Mesh(
        new THREE.PlaneGeometry(20, 20),
        new THREE.MeshStandardMaterial({ color: 0x1d1d1d, roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.05;
    ground.receiveShadow = true;
    scene.add(ground);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(playSpace.clientWidth, playSpace.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    playSpace.innerHTML = "";
    playSpace.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
}

function loadModel(path, color = 0xffffff) {
    const loader = new THREE.OBJLoader();

    // remove existing
    if (dreidel) {
        scene.remove(dreidel);
        dreidel.traverse(c => { if (c.geometry) c.geometry.dispose(); });
        dreidel = null;
    }

    loader.load(path, obj => {
        // unify material
        const mat = new THREE.MeshStandardMaterial({ color: color, metalness: 0.2, roughness: 0.6 });

        obj.traverse(child => {
            if (child.isMesh) {
                child.material = mat;
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // center & scale
        const box = new THREE.Box3().setFromObject(obj);
        const size = box.getSize(new THREE.Vector3()).length();
        const scale = 1.2 / size;
        obj.scale.setScalar(scale);

        // reset rotation & position
        obj.position.set(0, 0.2, 0);
        obj.rotation.set(0, 0, 0);

        dreidel = obj;
        scene.add(dreidel);

        // update preview color
        colorPreview.style.background = '#' + color.toString(16).padStart(6, '0');
    }, xhr => {
        // progress
    }, err => {
        console.error('OBJ load err', err);
    });
}

function startSpin() {
    spinning = true;
    // random angular speed and axis (mostly around Y but with tilt)
    angularSpeed = THREE.MathUtils.randFloat(8, 12); // radians/sec
    const tilt = new THREE.Vector3(THREE.MathUtils.randFloat(-0.4, 0.4), THREE.MathUtils.randFloat(0.8, 1), THREE.MathUtils.randFloat(-0.4, 0.4)).normalize();
    spinAxis.copy(tilt);

    // add a small random pre-tilt
    dreidel.rotateX(THREE.MathUtils.randFloat(-0.4, 0.4));
    dreidel.rotateZ(THREE.MathUtils.randFloat(-0.4, 0.4));
}

function getTopFace() {
    if (!dreidel) return null;
    // Local normals for the four sides. If your model was exported with a different
    // orientation, change these vectors to match which local axis points out of
    // each labeled face. For example, if the model's 'Nun' side points to +Z
    // change the first vector to (0,0,1). The current mapping is:
    //  [ +X => Nun, -X => Gimmel, +Z => Hey, -Z => Shin ]
    const localNormals = [
        new THREE.Vector3(1, 0, 0), // Nun
        new THREE.Vector3(-1, 0, 0), // Gimmel
        new THREE.Vector3(0, 0, 1), // Hey
        new THREE.Vector3(0, 0, -1) // Shin
    ];
    const names = ['Nun', 'Gimmel', 'Hey', 'Shin'];
    const worldUp = new THREE.Vector3(0, 1, 0);

    const q = new THREE.Quaternion();
    dreidel.getWorldQuaternion(q);

    let best = { idx: -1, dot: -Infinity };
    localNormals.forEach((n, i) => {
        const wn = n.clone().applyQuaternion(q).normalize();
        const dot = wn.dot(worldUp);
        if (dot > best.dot) best = { idx: i, dot };
    });

    if (best.idx >= 0) return { face: names[best.idx], index: best.idx };
    return null;
}

function finalizeSpin() {
    spinning = false;
    angularSpeed = 0;

    const top = getTopFace();
    if (!top) {
        document.getElementById('resultText').textContent = 'Could not determine result.';
        return;
    }

    const outcome = top.face; // 'Nun' | 'Gimmel' | 'Hey' | 'Shin'
    // call gamble resolver
    if (typeof resolveSpin === 'function') resolveSpin(outcome);
}

let last = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const now = performance.now();
    const delta = (now - last) / 1000;
    last = now;

    if (dreidel && spinning) {
        // rotate around world axis
        const step = angularSpeed * delta;
        dreidel.rotateOnWorldAxis(spinAxis, step);
        // apply damping
        angularSpeed *= Math.max(0.95, 1 - 1.5 * delta);

        if (angularSpeed < 0.1) {
            // gently settle: align to nearest face by progressively reducing jitter
            // small timeout ensures we run final detection after motion settles
            if (spinResolveTimeout === null) {
                spinResolveTimeout = setTimeout(() => {
                    finalizeSpin();
                    spinResolveTimeout = null;
                }, 300);
            }
        }
    }

    renderer.render(scene, camera);
}