const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const selectedModel = ref('primitive');
        const playerCount = ref(2);
        const resultText = ref('Click Spin to play!');
        const pot = ref(20); // Starting gelt in pot
        const players = ref([]);
        const currentPlayer = ref(0);

        // Initialize players
        const initGame = () => {
            players.value = Array.from({ length: playerCount.value }, (_, i) => ({ gelt: 10 }));
            pot.value = 20;
            currentPlayer.value = 0;
        };
        initGame();

        onMounted(() => {
            const sketch = (p) => {
                let dreidel;
                let spinSpeed = 0;
                let angle = 0;
                let slowing = false;
                let landedSide = -1;
                let geltParticles = []; // For animations

                p.setup = () => {
                    p.createCanvas(600, 600, p.WEBGL);
                    loadCurrentModel();
                };

                const loadCurrentModel = () => {
                    if (selectedModel.value === 'primitive') {
                        dreidel = createPrimitiveDreidel(p);
                    } else {
                        // Placeholder for custom GLTF - replace with real URLs
                        const customUrls = {
                            custom1: 'https://example.com/dreidel1.glb', // Replace!
                            custom2: 'https://example.com/dreidel2.glb'  // Replace!
                        };
                        p.loadModel(customUrls[selectedModel.value] || '', true,
                            (m) => { dreidel = m; },
                            () => { dreidel = createPrimitiveDreidel(p); } // Fallback
                        );
                    }
                };

                const createPrimitiveDreidel = (p) => {
                    return p.createShape(p.GROUP);
                    // Body (pyramid-like)
                    const body = p.createShape();
                    body.beginShape(p.TRIANGLES);
                    body.fill(100, 100, 255);
                    // Simple 4-sided pyramid approximation
                    const sides = 4;
                    for (let i = 0; i < sides; i++) {
                        const a1 = p.TWO_PI * i / sides;
                        const a2 = p.TWO_PI * (i + 1) / sides;
                        // Bottom point
                        body.vertex(0, -50, 0);
                        body.vertex(40 * p.cos(a1), 50, 40 * p.sin(a1));
                        body.vertex(40 * p.cos(a2), 50, 40 * p.sin(a2));
                    }
                    body.endShape(p.CLOSE);
                    dreidel.addChild(body);

                    // Handle
                    const handle = p.createShape(p.CYLINDER, 8, 80);
                    handle.translate(0, -80, 0);
                    dreidel.addChild(handle);

                    // Letters on sides (simple text textures)
                    const letters = ['נ', 'ג', 'ה', 'ש'];
                    letters.forEach((letter, i) => {
                        const tex = p.createGraphics(100, 100);
                        tex.background(255, 255, 255, 0);
                        tex.textSize(60);
                        tex.fill(0);
                        tex.textAlign(p.CENTER, p.CENTER);
                        tex.text(letter, 50, 50);
                        const face = p.createShape(p.PLANE, 60, 60);
                        face.texture(tex);
                        face.rotateY(p.HALF_PI * i);
                        face.translate(45, 0, 0);
                        dreidel.addChild(face);
                    });
                    return dreidel;
                };

                p.draw = () => {
                    p.background(0, 20, 50);
                    p.lights();
                    p.orbitControl(); // Mouse drag to rotate view

                    p.push();
                    p.rotateY(angle);
                    p.rotateX(p.PI / 8); // Slight tilt for realism
                    if (dreidel) p.shape(dreidel);
                    p.pop();

                    // Draw gelt particles animation
                    geltParticles = geltParticles.filter(part => part.life > 0);
                    geltParticles.forEach(part => {
                        p.push();
                        p.translate(part.x, part.y, part.z);
                        p.fill(255, 215, 0);
                        p.noStroke();
                        p.circle(0, 0, part.size);
                        p.pop();
                        part.y += part.vy;
                        part.life--;
                    });

                    if (spinSpeed > 0) {
                        angle += spinSpeed;
                        if (slowing) {
                            spinSpeed *= 0.98; // Friction
                            if (spinSpeed < 0.05) {
                                spinSpeed = 0;
                                slowing = false;
                                landedSide = Math.floor((angle % p.TWO_PI) / (p.TWO_PI / 4));
                                handleResult(landedSide);
                            }
                        }
                    }
                };

                const handleResult = (side) => {
                    const sides = ['Nun (Nothing)', 'Gimel (Take All)', 'Hey (Take Half)', 'Shin (Put In)'];
                    resultText.value = `Landed on: ${sides[side]}`;

                    const player = players.value[currentPlayer.value];
                    if (side === 0) { // Nun - nothing
                    } else if (side === 1) { // Gimel - take all
                        animateGelt(0, 0, player.gelt + pot.value);
                        player.gelt += pot.value;
                        pot.value = 0;
                    } else if (side === 2) { // Hey - half
                        const half = Math.floor(pot.value / 2);
                        animateGelt(0, 0, player.gelt + half);
                        player.gelt += half;
                        pot.value -= half;
                    } else if (side === 3) { // Shin - put 2
                        if (player.gelt >= 2) {
                            player.gelt -= 2;
                            pot.value += 2;
                            animateGelt(player.gelt, 0, 0);
                        }
                    }
                    currentPlayer.value = (currentPlayer.value + 1) % playerCount.value;
                    if (pot.value === 0) pot.value += playerCount.value; // Ante up if empty
                };

                const animateGelt = (fromX, fromY, toAmount) => {
                    // Simple particle burst for gelt movement
                    for (let i = 0; i < 10; i++) {
                        geltParticles.push({
                            x: p.random(-100, 100),
                            y: -200,
                            z: p.random(-50, 50),
                            vy: p.random(2, 8),
                            size: p.random(20, 40),
                            life: 60
                        });
                    }
                };

                const spin = () => {
                    spinSpeed = p.random(0.2, 0.4);
                    slowing = false;
                    landedSide = -1;
                    resultText.value = 'Spinning...';
                };

                // Vue integration
                window.spinDreidel = spin;
                window.reloadModel = () => {
                    loadCurrentModel();
                };
            };

            new p5(sketch, 'canvas-container');
        });

        const spin = () => {
            resultText.value = 'Spinning...';
            window.spinDreidel();
        };

        watch(selectedModel, () => {
            window.reloadModel();
        });

        watch(playerCount, initGame);

        return { selectedModel, playerCount, resultText, pot, players, spin };
    }
}).mount('#app');