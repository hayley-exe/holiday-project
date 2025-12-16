let scene, camera, renderer;
let dreidel;
let spinning = false;
let targetRotation = new THREE.Euler();

const faceRotations = {
    "נ": new THREE.Euler(0, 0, 0),
    "ג": new THREE.Euler(0, Math.PI / 2, 0),
    "ה": new THREE.Euler(0, Math.PI, 0),
    "ש": new THREE.Euler(0, -Math.PI / 2, 0)
};

init3D();

function init3D() {
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 3, 6);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(400, 400);
    document.getElementById("three-container").appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const light = new THREE.DirectionalLight(0xffffff, 0.6);
    light.position.set(5, 10, 5);
    scene.add(light);

    dreidel = createPlaceholder();
    scene.add(dreidel);

    animate();
}

/* Placeholder until you insert your own model */
function createPlaceholder() {
    const geo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x888888,
        wireframe: true
    });
    return new THREE.Mesh(geo, mat);
}

/* Called from script.js */
function spinToSymbol(letter) {
    spinning = true;
    targetRotation.copy(faceRotations[letter]);

    dreidel.rotation.set(
        Math.random() * 10,
        Math.random() * 10,
        Math.random() * 10
    );
}

function animate() {
    requestAnimationFrame(animate);

    if (spinning && dreidel) {
        dreidel.rotation.x += 0.25;
        dreidel.rotation.y += 0.35;
        dreidel.rotation.z += 0.15;

        dreidel.rotation.x += (targetRotation.x - dreidel.rotation.x) * 0.02;
        dreidel.rotation.y += (targetRotation.y - dreidel.rotation.y) * 0.02;
        dreidel.rotation.z += (targetRotation.z - dreidel.rotation.z) * 0.02;

        if (Math.abs(dreidel.rotation.y - targetRotation.y) < 0.01) {
            spinning = false;
            dreidel.rotation.copy(targetRotation);
        }
    }

    renderer.render(scene, camera);
}
