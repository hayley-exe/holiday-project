const { createApp, ref, watch, onMounted, computed } = Vue;

createApp({
    setup() {
        const models = ref([]);
        const selectedModelId = ref('');
        const playerCount = ref(2);
        const resultText = ref('Choose a dreidel and spin!');
        const pot = ref(20);
        const players = ref([]);
        const currentPlayer = ref(0);
        const spinning = ref(false);

        const initGame = () => {
            players.value = Array.from({ length: playerCount.value }, () => ({ gelt: 10 }));
            pot.value = 20;
            currentPlayer.value = 0;
        };
        initGame();

        let p5Instance = null;

        onMounted(async () => {
            try {
                const res = await fetch('models.json');
                models.value = await res.json();
                // No default selection: show placeholder until user picks a color
                selectedModelId.value = '';
            } catch (e) {
                console.error('Failed to load models.json');
            }

            const sketch = (p) => {
                let dreidel = null;
                let spinSpeed = 0;
                let angle = 0;
                let randomOffset = 0; // For true random landing
                let wobble = 0;
                let geltParticles = [];
                let modelColor = [100, 120, 255];
                let isObj = false;

                p.setup = () => {
                    p.createCanvas(800, 800, p.WEBGL);
                    loadCurrentModel();
                };

                const hexToRgb = (hex) => {
                    if (!hex) return [204, 204, 204];
                    if (hex.startsWith('#')) hex = hex.slice(1);
                    if (hex.length === 3) hex = hex.split('').map(ch => ch + ch).join('');
                    const bigint = parseInt(hex, 16);
                    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
                };

                const loadCurrentModel = (onLoaded) => {
                    // reset
                    dreidel = null;
                    isObj = false;
                    modelColor = [100, 120, 255];

                    const model = models.value.find(m => m.id === selectedModelId.value);
                    if (!model) {
                        if (typeof onLoaded === 'function') onLoaded();
                        return;
                    }

                    if (model.type === 'primitive') {
                        dreidel = createPrimitiveDreidel(p);
                        isObj = false;
                        modelColor = [100, 120, 255];
                        if (typeof onLoaded === 'function') onLoaded();
                    } else if (model.type === 'obj') {
                        // Try to load the OBJ; on success mark isObj and store color
                        p.loadModel(model.url, true, // normalize = true
                            (m) => { dreidel = m; isObj = true; modelColor = hexToRgb(model.color || '#cccccc'); if (typeof onLoaded === 'function') onLoaded(); },
                            () => {
                                console.warn(`Failed to load ${model.url}, falling back to primitive`);
                                dreidel = createPrimitiveDreidel(p);
                                isObj = false;
                                modelColor = [100, 120, 255];
                                if (typeof onLoaded === 'function') onLoaded();
                            }
                        );
                    }
                };

                const createPrimitiveDreidel = (p) => {
                    const letters = ['נ', 'ג', 'ה', 'ש'];
                    return {
                        render: (p) => {
                            p.push();

                            // Body: use a cone with few sides to mimic a dreidel
                            p.push();
                            p.rotateX(p.PI);
                            p.fill(100, 120, 255);
                            p.noStroke();
                            p.cone(60, 120, 4, 1);
                            p.pop();

                            // Handle
                            p.push();
                            p.fill(180);
                            p.translate(0, -120, 0);
                            p.cylinder(6, 120);
                            p.pop();

                            // Faces with letters
                            for (let i = 0; i < 4; i++) {
                                p.push();
                                p.rotateY(i * p.TWO_PI / 4);
                                p.translate(0, 20, 60);
                                const tex = p.createGraphics(120, 120);
                                tex.clear();
                                tex.textSize(80);
                                tex.fill(255);
                                tex.textAlign(p.CENTER, p.CENTER);
                                tex.text(letters[i], 60, 60);
                                p.push();
                                p.texture(tex);
                                p.plane(80, 80);
                                p.pop();
                                p.pop();
                            }

                            p.pop();
                        }
                    };
                };

                p.draw = () => {
                    p.background(0, 20, 60);
                    p.ambientLight(255);
                    p.directionalLight(255, 255, 255, 0.5, -1, -0.5);

                    p.noStroke();
                    p.push();
                    p.rotateY(angle + randomOffset);
                    p.rotateX(p.PI / 2);
                    // p.rotateX(p.PI / 12 + p.sin(wobble) * 0.05);
                    p.scale(-2, 2, 2);
                    if (dreidel) {
                        if (typeof dreidel.render === 'function') {
                            dreidel.render(p);
                        } else {
                            p.push();
                            if (isObj) {
                                // Apply material tint for OBJ models
                                p.ambientMaterial(modelColor[0], modelColor[1], modelColor[2]);
                                p.ambientMaterial(Math.floor(modelColor[0] * 0.6), Math.floor(modelColor[1] * 0.6), Math.floor(modelColor[2] * 0.6));
                                if (typeof p.model === 'function') {
                                    p.model(dreidel);
                                } else if (typeof p.shape === 'function') {
                                    p.shape(dreidel);
                                }
                            } else {
                                p.fill(100, 120, 255);
                                if (typeof p.shape === 'function') p.shape(dreidel);
                            }
                            p.pop();
                        }
                    }
                    p.pop();

                    // Particles
                    geltParticles = geltParticles.filter(part => part.life > 0);
                    geltParticles.forEach(part => {
                        p.push();
                        p.translate(part.x, part.y, part.z);
                        p.fill(255, 215, 0, part.life * 5);
                        p.noStroke();
                        p.circle(0, 0, part.size);
                        p.pop();
                        part.y += part.vy;
                        part.life--;
                    });

                    if (spinSpeed > 0) {
                        angle += spinSpeed;
                        wobble += 0.15;
                        spinSpeed *= 0.975; // Realistic slowdown
                        if (spinSpeed < 0.02) {
                            spinSpeed = 0;
                            spinning.value = false;
                            const finalAngle = (angle + randomOffset) % p.TWO_PI;
                            const side = Math.floor((finalAngle + p.PI / 4) / (p.TWO_PI / 4)) % 4; // Offset for accurate facing
                            handleResult(side);
                        }
                    }
                };

                const handleResult = (side) => {
                    const outcomes = ['נ Nun — Nothing', 'ג Gimel — Take All!', 'ה Hey — Take Half', 'ש Shin — Put 2 In'];
                    resultText.value = `Landed on ${outcomes[side]}!`;

                    const player = players.value[currentPlayer.value];
                    let coinsMoved = 0;

                    if (side === 1) { // Gimel
                        coinsMoved = pot.value;
                        player.gelt += pot.value;
                        pot.value = 0;
                    } else if (side === 2) { // Hey
                        coinsMoved = Math.ceil(pot.value / 2);
                        player.gelt += coinsMoved;
                        pot.value -= coinsMoved;
                    } else if (side === 3) { // Shin
                        if (player.gelt >= 2) {
                            player.gelt -= 2;
                            pot.value += 2;
                            coinsMoved = -2;
                        } else if (player.gelt >= 1) {
                            player.gelt -= 1;
                            pot.value += 1;
                            coinsMoved = -1;
                        }
                    }
                    // Nun (0) = nothing

                    animateGelt(coinsMoved);
                    // Clear button clicked state at end of turn so hover doesn't persist
                    document.querySelectorAll('button').forEach(b => b.classList.remove('clicked'));
                    currentPlayer.value = (currentPlayer.value + 1) % playerCount.value;

                    if (pot.value === 0 && players.value.some(pl => pl.gelt > 0)) {
                        pot.value += playerCount.value; // Everyone antes 1
                    }
                };

                const animateGelt = (count) => {
                    const particleCount = Math.abs(count) * 8;
                    for (let i = 0; i < particleCount; i++) {
                        geltParticles.push({
                            x: p.random(-200, 200),
                            y: count > 0 ? 300 : -300, // From pot or to pot
                            z: p.random(-100, 100),
                            vy: count > 0 ? p.random(-12, -6) : p.random(6, 12),
                            size: p.random(30, 50),
                            life: 80
                        });
                    }
                };

                window.spinDreidel = () => {
                    if (spinSpeed > 0) return;
                    spinSpeed = p.random(0.3, 0.5);
                    randomOffset = p.random(p.TWO_PI); // True random landing
                    wobble = 0;
                    spinning.value = true;
                    resultText.value = 'Spinning...';
                };

                window.reloadModel = (cb) => loadCurrentModel(cb);

                p5Instance = p;
            };

            new p5(sketch, 'canvas-container');

            // When any button is clicked, add the 'clicked' class so the hover glow appears; remove on mouseleave or blur
            document.querySelectorAll('button').forEach(btn => {
                btn.addEventListener('click', () => {
                    btn.classList.add('clicked');
                });
                // Clear the clicked state as soon as the pointer leaves the button
                btn.addEventListener('mouseleave', () => {
                    btn.classList.remove('clicked');
                });
                // Also clear on blur for keyboard users
                btn.addEventListener('blur', () => {
                    btn.classList.remove('clicked');
                });
            });
        });

        const spin = () => {
            const player = players.value[currentPlayer.value];
            const playerModel = player && player.modelId ? player.modelId : selectedModelId.value;
            selectedModelId.value = playerModel;
            if (window.reloadModel) {
                window.reloadModel(() => {
                    if (window.spinDreidel) window.spinDreidel();
                });
            } else {
                if (window.spinDreidel) window.spinDreidel();
            }
        };

        watch(selectedModelId, (val) => {
            // Sync single-player top selector to player 1 model for display
            if (playerCount.value === 1 && players.value[0]) {
                players.value[0].modelId = val;
            }
            if (window.reloadModel) window.reloadModel();
        });

        watch(playerCount, (count) => {
            initGame();
            if (count === 1) {
                // Single-player: set player's model to the selected one (or keep player's if set)
                if (players.value[0]) {
                    if (players.value[0].modelId) selectedModelId.value = players.value[0].modelId;
                    else players.value[0].modelId = selectedModelId.value;
                }
            } else {
                // Multi-player: give each player the current selected model as default if they don't have one
                players.value.forEach((pl) => {
                    if (!pl.modelId) pl.modelId = selectedModelId.value;
                });
            }
        });

        // Computed guard for whether the Spin button should be enabled.
        const canSpin = computed(() => {
            if (playerCount.value === 1) {
                // require a visible (non-hidden) model selection
                const sel = selectedModelId.value;
                const model = models.value.find(m => m.id === sel);
                return !!sel && model && !model.hidden;
            } else {
                // multiplayer: require current player to have chosen a model
                const player = players.value[currentPlayer.value];
                return !!(player && player.modelId);
            }
        });

        const lockColor = (i) => {
            const player = players.value[i];
            if (player && player.modelId) player.locked = true;
        };

        return {
            models,
            selectedModelId,
            playerCount,
            resultText,
            pot,
            players,
            currentPlayer,
            spinning,
            spin,
            lockColor,
            canSpin
        };
    }
}).mount('#app');