window.addEventListener("DOMContentLoaded", () => {

    let scene, camera, renderer, controls;
    let dreidel = null;
    let spinning = false;
    let speed = 0;
    let axis = new THREE.Vector3();

    const MODELS = [
        { name: "Red", file: "models/red-tinker.obj", color: 0xd32f2f },
        { name: "Orange", file: "models/orange-tinker.obj", color: 0xff9800 },
        { name: "Yellow", file: "models/yellow-tinker.obj", color: 0xffeb3b },
        { name: "Green", file: "models/green-tinker.obj", color: 0x4caf50 },
        { name: "Blue", file: "models/blue-tinker.obj", color: 0x2196f3 }
        { name: "Purple", file: "models/purple-tinker.obj", color: 0x9c27b0 },
        { name: "Pink", file: "models/pink-tinker.obj", color: 0xe91e63 }
    ];

    const playSpace = document.getElementById("playSpace");
    const modelSelect = document.getElementById("modelSelect");
    const spinBtn = document.getElementById("spinBtn");
    const colorPreview = document.getElementById("colorPreview");

    // Populate dropdown
    MODELS.forEach(m => {
        const opt = document.createElement("option");
        opt.value = m.file;
        opt.textContent = m.name;
        modelSelect.appendChild(opt);
    });

    modelSelect.onchange = () => {
        const m = MODELS.find(x => x.file === modelSelect.value);
        loadModel(m.file, m.color);
    };

    spinBtn.onclick = () => {
        if (!spinning && dreidel) startSpin();
    };

    initThree();
    loadModel(MODELS[0].file, MODELS[0].color);
    animate();

    function initThree() {
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111111);

        camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0, 2.5, 5);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setPixelRatio(window.devicePixelRatio);
        playSpace.appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);

        scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1));
        const d = new THREE.DirectionalLight(0xffffff, 1);
        d.position.set(5, 10, 5);
        scene.add(d);

        resize();
        window.addEventListener("resize", resize);
    }

    function resize() {
        const w = playSpace.clientWidth;
        const h = playSpace.clientHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    function loadModel(path, color) {
        if (dreidel) scene.remove(dreidel);

        const loader = new THREE.OBJLoader();
        loader.load(
            path,
            obj => {
                const mat = new THREE.MeshStandardMaterial({ color });
                obj.traverse(m => { if (m.isMesh) m.material = mat; });

                const box = new THREE.Box3().setFromObject(obj);
                const center = box.getCenter(new THREE.Vector3());
                obj.position.sub(center);
                obj.position.y = 0.5;

                const scale = 1.5 / box.getSize(new THREE.Vector3()).length();
                obj.scale.setScalar(scale);

                dreidel = obj;
                scene.add(dreidel);

                colorPreview.style.background =
                    "#" + color.toString(16).padStart(6, "0");

                console.log("Loaded:", path);
            },
            undefined,
            err => console.error("OBJ FAILED:", path, err)
        );
    }

    function startSpin() {
        spinning = true;
        speed = THREE.MathUtils.randFloat(10, 14);
        axis.set(
            THREE.MathUtils.randFloat(-0.2, 0.2),
            1,
            THREE.MathUtils.randFloat(-0.2, 0.2)
        ).normalize();
    }

    function animate() {
        requestAnimationFrame(animate);

        if (dreidel && spinning) {
            dreidel.rotateOnWorldAxis(axis, speed * 0.016);
            speed *= 0.96;
            if (speed < 0.1) spinning = false;
        }

        renderer.render(scene, camera);
    }
});
