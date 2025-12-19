const { createApp, ref, watch, onMounted } = Vue;

createApp({
    setup() {
        const models = ref([]);
        const selectedModelId = ref('');
        const playerCount = ref(2);
        const resultText = ref('Choose a dreidel and spin!');
        const pot = ref(20);
        const players = ref([]);
        const currentPlayer = ref(0);

        const initGame = () => {
            players.value = Array.from({ length: playerCount.value }, () => ({ gelt: 10 }));
            pot.value = 20;
            currentPlayer.value = 0;
        };
        initGame();

        let p5Instance = null;

        onMounted(async () => {
            // Load models config
            try {
                const res = await fetch('models.json');
                models.value = await res.json();
                selectedModelId.value = 'primitive'; // default
            } catch (e) {
                console.error('Failed to load models.json');
            }

            // Initialize p5
            const sketch = (p) => {
                let dreidel = null;
                let spinSpeed = 0;
                let angle = 0;
                let slowing = false;
                let geltParticles = [];

                p.setup = () => {
                    p.createCanvas(700, 700, p.WEBGL);
                    loadCurrentModel();
                };

                const loadCurrentModel = () => {
                    const model = models.value.find(m => m.id === selectedModelId.value);
                    if (!model) return;

                    if (model.type === 'primitive') {
                        dreidel = createPrimitiveDreidel(p);
                    } else if (model.type === 'obj') {
                        p.loadModel(model.url, true, // normalized
                            (m) => { dreidel = m; },
                            () => {
                                console.warn(`Failed to load ${model.url}, using primitive`);
                                dreidel = createPrimitiveDreidel(p);
                            }
                        );
                    }
                };

                const createPrimitiveDreidel = (p) => {
                    const group = p.createShape(p.GROUP);
                    // Simple fallback dreidel (blue pyramid + handle + letters)
                    const body = p.createShape();
                    body.beginShape(p.TRIANGLES);
                    body.fill(100, 100, 255);
                    const sides = 4;
                    for (let i = 0; i < sides; i++) {
                        const a1 = p.TWO_PI * i / sides;
                        const a2 = p.TWO_PI * (i + 1) / sides;
                        body.vertex(0, -50, 0);
                        body.vertex(40 * p.cos(a1), 50, 40 * p.sin(a1));
                        body.vertex(40 * p.cos(a2), 50, 40 * p.sin(a2));
                    }
                    body.endShape();
                    group.addChild(body);

                    const handle = p.createShape(p.CYLINDER, 8, 100);
                    handle.translate(0, -90, 0);
                    group.addChild(handle);

                    const letters = ['נ', 'ג', 'ה', 'ש'];
                    letters.forEach((letter, i) => {
                        const tex = p.createGraphics(100, 100);
                        tex.background(0, 0);
                        tex.textSize(60);
                        tex.fill(255);
                        tex.textAlign(p.CENTER, p.CENTER);
                        tex.text(letter, 50, 50);
                        const face = p.createShape(p.PLANE, 60, 60);
                        face.texture(tex);
                        face.rotateY(p.HALF_PI * i);
                        face.translate(0, 0, 50);
                        group.addChild(face);
                    });

                    return group;
                };

                p.draw = () => {
                    p.background(0, 15, 40);
                    p.lights();
                    p.ambientLight(100);
                    p.directionalLight(255, 255, 255, 0, -1, -1);
                    p.orbitControl();

                    p.push();
                    p.rotateY(angle);
                    p.rotateX(p.PI / 10);
                    p.scale(1.5); // Make models bigger
                    if (dreidel) p.shape(dreidel);
                    p.pop();

                    // Gelt animation particles
                    geltParticles = geltParticles.filter(part => part.life > 0);
                    geltParticles.forEach(part => {
                        p.push();
                        p.translate(part.x, part.y, part.z);
                        p.fill(255, 215, 0, part.life * 4);
                        p.noStroke();
                        p.circle(0, 0, part.size);
                        p.pop();
                        part.y += part.vy;
                        part.life--;
                    });

                    if (spinSpeed > 0) {
                        angle += spinSpeed;
                        if (slowing) {
                            spinSpeed *= 0.97;
                            if (spinSpeed < 0.03) {
                                spinSpeed = 0;
                                slowing = false;
                                const side = Math.floor((angle % p.TWO_PI) / (p.TWO_PI / 4));
                                handleResult(side);
                            }
                        }
                    }
                };

                const handleResult = (side) => {
                    const outcomes = ['נ Nun — Nothing', 'ג Gimel — Take All!', 'ה Hey — Take Half', 'ש Shin — Put 2 In'];
                    resultText.value = outcomes[side];

                    const player = players.value[currentPlayer.value];
                    let coinsMoved = 0;

                    if (side === 1) { // Gimel
                        coinsMoved = pot.value;
                        player.gelt += pot.value;
                        pot.value = 0;
                    } else if (side === 2) { // Hey
                        coinsMoved = Math.floor(pot.value / 2);
                        player.gelt += coinsMoved;
                        pot.value -= coinsMoved;
                    } else if (side === 3) { // Shin
                        if (player.gelt >= 2) {
                            player.gelt -= 2;
                            pot.value += 2;
                            coinsMoved = -2;
                        }
                    }

                    animateGelt(Math.abs(coinsMoved));
                    currentPlayer.value = (currentPlayer.value + 1) % playerCount.value;
                    if (pot.value === 0) pot.value += playerCount.value; // Everyone antes 1 if pot empty
                };

                const animateGelt = (count) => {
                    for (let i = 0; i < count * 3; i++) {
                        geltParticles.push({
                            x: p.random(-150, 150),
                            y: -300,
                            z: p.random(-100, 100),
                            vy: p.random(4, 12),
                            size: p.random(25, 45),
                            life: 70
                        });
                    }
                };

                window.spinDreidel = () => {
                    if (!dreidel) return;
                    spinSpeed = p.random(0.25, 0.45);
                    slowing = true;
                    resultText.value = 'Spinning...';
                };

                window.reloadModel = loadCurrentModel;

                p5Instance = p;
            };

            new p5(sketch, 'canvas-container');
        });

        const spin = () => {
            if (window.spinDreidel) window.spinDreidel();
        };

        watch(selectedModelId, () => {
            if (window.reloadModel) window.reloadModel();
        });

        watch(playerCount, initGame);

        return {
            models,
            selectedModelId,
            playerCount,
            resultText,
            pot,
            players,
            currentPlayer,
            spin
        };
    }
}).mount('#app');