window.addEventListener("DOMContentLoaded", () => {
    let scene, camera, renderer, controls;
    let dreidel = null;
    let spinning = false;
    let speed = 0;
    let axis = new THREE.Vector3();

    const MODELS = [
        { name: "Red", file: "models/red-tinker.obj", previewColor: 0xd32f2f },
        { name: "Orange", file: "models/orange-tinker.obj", previewColor: 0xff9800 },
        { name: "Yellow", file: "models/yellow-tinker.obj", previewColor: 0xffeb3b },
        { name: "Green", file: "models/green-tinker.obj", previewColor: 0x4caf50 },
        { name: "Blue", file: "models/blue-tinker.obj", previewColor: 0x2196f3 },
        { name: "Purple", file: "models/purple-tinker.obj", previewColor: 0x9c27b0 },
        { name: "Pink", file: "models/pink-tinker.obj", previewColor: 0xe91e63 }
    ];

    const playSpace = document.getElementById("playSpace");
    const modelSelect = document.getElementById("modelSelect");
    const spinBtn = document.getElementById("spinBtn");
    const colorPreview = document.getElementById("colorPreview");
    const resultText = document.getElementById("resultText"); // Make sure you have <div id="resultText" class="result">Ready!</div> in HTML

    let playerGelt = 10;
    let pot = 10;
    const playerEl = document.getElementById("player");
    const potEl = document.getElementById("pot");

    // Populate dropdown
    MODELS.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.file;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
    });

    modelSelect.onchange = loadCurrentModel;

    spinBtn.onclick = () => {
        if (!spinning && dreidel) {
            startSpin();
            resultText.textContent = "Spinning...";
            spinBtn.disabled = true;
        }
    };

    function updateGelt() {
        playerEl.textContent = playerGelt;
        potEl.textContent = pot;
    }

    function resolveSpin(result) {
        switch (result) {
            case "Nun":
                resultText.textContent = "נ — Nun: Nothing happens!";
                break;
            case "Gimmel":
                resultText.textContent = "ג — Gimmel: Take everything!";
                playerGelt += pot;
                pot = 0;
                break;
            case "Hey":
                const half = Math.floor(pot / 2);
                resultText.textContent = "ה — Hey: Take half!";
                playerGelt += half;
                pot -= half;
                break;
            case "Shin":
                resultText.textContent = "ש — Shin: Put one in!";
                if (playerGelt > 0) {
                    playerGelt--;
                    pot++;
                }
                break;
        }
        updateGelt();
        spinBtn.disabled = false;
    }

    initThree();
    loadCurrentModel();
    animate();

    function initThree() {
        const w = playSpace.clientWidth;
        const h = playSpace.clientHeight;

        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111133);

        camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100);
        camera.position.set(0, 4, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(w, h);
        playSpace.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(5, 10, 7);
        scene.add(dirLight);

        window.addEventListener("resize", () => {
            const w = playSpace.clientWidth;
            const h = playSpace.clientHeight;
            renderer.setSize(w, h);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });
    }

    function loadCurrentModel() {
        const selected = MODELS.find(m => m.file === modelSelect.value);
        loadModel(selected.file, selected.previewColor);
    }

    function loadModel(path, previewColor) {
        if (dreidel) scene.remove(dreidel);

        const loader = new THREE.OBJLoader();
        loader.load(
            path,
            (obj) => {
                // NO material override — keeps your model's colors/textures/letters visible!
                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());
                obj.position.sub(center);
                obj.position.y -= box.min.y + 0.1; // rest on bottom

                const size = box.getSize(new THREE.Vector3()).length();
                obj.scale.setScalar(5 / size); // adjust for good view

                dreidel = obj;
                scene.add(dreidel);

                colorPreview.style.background = "#" + previewColor.toString(16).padStart(6, "0");
            },
            undefined,
            (err) => {
                console.error("Load error:", err);
                resultText.textContent = "Failed to load model — use a local server!";
            }
        );
    }

    function startSpin() {
        spinning = true;
        speed = THREE.MathUtils.randFloat(15, 22);
        axis.set(
            THREE.MathUtils.randFloat(-0.15, 0.15),
            1,
            THREE.MathUtils.randFloat(-0.15, 0.15)
        ).normalize();
    }

    function getLandingSide() {
        if (!dreidel) return null;

        const worldUp = new THREE.Vector3(0, 1, 0);
        const localUp = worldUp.clone().applyQuaternion(dreidel.quaternion.clone().invert());

        // Adjust these based on your model's orientation (test and swap if results are wrong)
        const sides = [
            { dir: new THREE.Vector3(1, 0, 0), letter: "Gimmel" }, // ג
            { dir: new THREE.Vector3(-1, 0, 0), letter: "Nun" },    // נ
            { dir: new THREE.Vector3(0, 0, 1), letter: "Hey" },     // ה
            { dir: new THREE.Vector3(0, 0, -1), letter: "Shin" }    // ש
        ];

        let best = null;
        let maxDot = -Infinity;
        sides.forEach(s => {
            const dot = localUp.dot(s.dir);
            if (dot > maxDot) {
                maxDot = dot;
                best = s.letter;
            }
        });
        return best;
    }

    function animate() {
        requestAnimationFrame(animate);

        if (dreidel && spinning) {
            dreidel.rotateOnWorldAxis(axis, speed * 0.016);
            speed *= 0.97;

            if (speed < 0.4) {
                spinning = false;
                const result = getLandingSide();
                if (result) resolveSpin(result);
                else resultText.textContent = "Couldn't detect side — spin again!";
            }
        }

        controls.update();
        renderer.render(scene, camera);
    }
});