(() => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    const timerDisplay = document.getElementById('timerDisplay');
    const alertDisplay = document.getElementById('alertDisplay');
    const statusDisplay = document.getElementById('statusDisplay');
    const missionTitle = document.getElementById('missionTitle');
    const missionHint = document.getElementById('missionHint');
    const taskList = document.getElementById('taskList');
    const eventLog = document.getElementById('eventLog');

    const startOverlay = document.getElementById('startOverlay');
    const endOverlay = document.getElementById('endOverlay');
    const endTag = document.getElementById('endTag');
    const endTitle = document.getElementById('endTitle');
    const endSummary = document.getElementById('endSummary');
    const startBtn = document.getElementById('startBtn');
    const restartBtn = document.getElementById('restartBtn');

    const keys = new Set();
    let running = false;
    let finished = false;
    let lastTs = 0;

    const state = {
        timeLeft: 420,
        alert: 0,
        player: { x: 72, y: 480, r: 11, speed: 170 },
        tasks: [
            { id: 'power', room: 'B1 Energie', x: 188, y: 448, title: 'Herstel noodstroom', hint: 'Interact bij de power console', done: false },
            { id: 'filter', room: 'Klimaatkern', x: 330, y: 306, title: 'Kalibreer luchtfilters', hint: 'Activeer filterpaneel', done: false },
            { id: 'server', room: 'Data Node', x: 532, y: 154, title: 'Reboot servers', hint: 'Reset de servercluster', done: false },
            { id: 'vault', room: 'Security Vault', x: 770, y: 186, title: 'Haal keycard op', hint: 'Pak de keycard uit vault-lade', done: false },
            { id: 'bridge', room: 'Control Bridge', x: 790, y: 395, title: 'Upload missie rapport', hint: 'Finaliseer op command terminal', done: false }
        ],
        drones: [
            { x: 258, y: 175, dir: 1, range: [205, 382], axis: 'x', speed: 82 },
            { x: 622, y: 360, dir: 1, range: [295, 470], axis: 'y', speed: 92 },
            { x: 688, y: 122, dir: 1, range: [590, 860], axis: 'x', speed: 95 }
        ],
        walls: [
            { x: 0, y: 0, w: 960, h: 22 },
            { x: 0, y: 518, w: 960, h: 22 },
            { x: 0, y: 0, w: 22, h: 540 },
            { x: 938, y: 0, w: 22, h: 540 },
            { x: 136, y: 22, w: 14, h: 360 },
            { x: 136, y: 420, w: 14, h: 98 },
            { x: 310, y: 160, w: 14, h: 358 },
            { x: 492, y: 22, w: 14, h: 330 },
            { x: 492, y: 392, w: 14, h: 126 },
            { x: 662, y: 112, w: 14, h: 406 },
            { x: 662, y: 22, w: 14, h: 50 },
            { x: 832, y: 22, w: 14, h: 358 },
            { x: 220, y: 254, w: 90, h: 14 },
            { x: 506, y: 252, w: 156, h: 14 }
        ]
    };

    const roomZones = [
        { x: 22, y: 22, w: 114, h: 496, label: 'Entree Corridor' },
        { x: 150, y: 360, w: 160, h: 158, label: 'B1 Energie' },
        { x: 150, y: 22, w: 160, h: 328, label: 'Klimaatkern' },
        { x: 324, y: 22, w: 168, h: 496, label: 'Data Node' },
        { x: 506, y: 266, w: 156, h: 252, label: 'Operations' },
        { x: 506, y: 22, w: 156, h: 230, label: 'Security Vault' },
        { x: 676, y: 22, w: 156, h: 496, label: 'Control Bridge' },
        { x: 846, y: 22, w: 92, h: 496, label: 'Service Bay' }
    ];

    const touchState = { up: false, down: false, left: false, right: false };

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    const logEvent = (message) => {
        const li = document.createElement('li');
        const stamp = new Date().toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
        li.textContent = `[${stamp}] ${message}`;
        eventLog.prepend(li);
        while (eventLog.children.length > 8) {
            eventLog.removeChild(eventLog.lastChild);
        }
    };

    const resetState = () => {
        state.timeLeft = 420;
        state.alert = 0;
        state.player.x = 72;
        state.player.y = 480;
        state.tasks.forEach((task) => {
            task.done = false;
        });
        finished = false;
        renderTasks();
        updateHud();
        missionTitle.textContent = state.tasks[0].title;
        missionHint.textContent = `${state.tasks[0].room}: ${state.tasks[0].hint}`;
        eventLog.innerHTML = '';
        logEvent('Missiebrief ontvangen. Facility toegang verleend.');
    };

    const renderTasks = () => {
        taskList.innerHTML = '';
        state.tasks.forEach((task, index) => {
            const item = document.createElement('li');
            item.className = task.done ? 'done' : '';
            item.textContent = `${index + 1}. ${task.title} (${task.room})`;
            taskList.appendChild(item);
        });
    };

    const updateHud = () => {
        const mins = Math.floor(state.timeLeft / 60);
        const secs = Math.floor(state.timeLeft % 60);
        timerDisplay.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const alertClamped = clamp(Math.round(state.alert), 0, 100);
        alertDisplay.textContent = `${alertClamped}%`;

        if (alertClamped < 35) {
            statusDisplay.textContent = 'Stealth';
            statusDisplay.style.color = '#89f0c9';
        } else if (alertClamped < 75) {
            statusDisplay.textContent = 'Opsporing';
            statusDisplay.style.color = '#ffd17a';
        } else {
            statusDisplay.textContent = 'Lockdown';
            statusDisplay.style.color = '#ff8686';
        }
    };

    const getActiveTask = () => state.tasks.find((task) => !task.done) || null;

    const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

    const collides = (circle, rect) => {
        const cx = clamp(circle.x, rect.x, rect.x + rect.w);
        const cy = clamp(circle.y, rect.y, rect.y + rect.h);
        const dx = circle.x - cx;
        const dy = circle.y - cy;
        return dx * dx + dy * dy < circle.r * circle.r;
    };

    const tryMovePlayer = (dx, dy, dt) => {
        if (!dx && !dy) return;

        const len = Math.hypot(dx, dy) || 1;
        const step = state.player.speed * dt;

        let nextX = state.player.x + (dx / len) * step;
        let nextY = state.player.y;
        const testX = { x: nextX, y: nextY, r: state.player.r };
        if (!state.walls.some((w) => collides(testX, w))) {
            state.player.x = nextX;
        }

        nextX = state.player.x;
        nextY = state.player.y + (dy / len) * step;
        const testY = { x: nextX, y: nextY, r: state.player.r };
        if (!state.walls.some((w) => collides(testY, w))) {
            state.player.y = nextY;
        }
    };

    const updateDrones = (dt) => {
        state.drones.forEach((drone) => {
            drone[drone.axis] += drone.dir * drone.speed * dt;
            if (drone[drone.axis] < drone.range[0] || drone[drone.axis] > drone.range[1]) {
                drone.dir *= -1;
                drone[drone.axis] = clamp(drone[drone.axis], drone.range[0], drone.range[1]);
            }

            const dist = Math.hypot(state.player.x - drone.x, state.player.y - drone.y);
            if (dist < 90) {
                state.alert += (90 - dist) * 0.015;
            }
        });

        state.alert = clamp(state.alert - 0.12 * dt * 60, 0, 120);
    };

    const completeTaskIfPossible = () => {
        if (!running || finished) return;

        const active = getActiveTask();
        if (!active) return;

        const dist = Math.hypot(state.player.x - active.x, state.player.y - active.y);
        if (dist > 34) {
            missionHint.textContent = 'Te ver van de objective. Beweeg dichterbij.';
            return;
        }

        active.done = true;
        logEvent(`Objective afgerond: ${active.title}.`);
        renderTasks();

        const next = getActiveTask();
        if (next) {
            missionTitle.textContent = next.title;
            missionHint.textContent = `${next.room}: ${next.hint}`;
        } else {
            finishMission(true);
        }
    };

    const finishMission = (success) => {
        if (finished) return;
        finished = true;
        running = false;

        endOverlay.classList.remove('hidden');
        if (success) {
            endTag.textContent = 'Missie geslaagd';
            endTitle.textContent = 'Facility onder controle';
            const score = Math.max(0, Math.round(100 - state.alert + state.timeLeft * 0.3));
            endSummary.textContent = `Score ${score}. Resterende tijd: ${Math.floor(state.timeLeft)}s, alert: ${Math.round(state.alert)}%.`;
            logEvent('Upload bevestigd. Team extractie gestart.');
        } else {
            endTag.textContent = 'Missie mislukt';
            endTitle.textContent = state.alert >= 100 ? 'Lockdown geactiveerd' : 'Tijd verlopen';
            endSummary.textContent = 'Probeer een andere route en hou drones op afstand.';
            logEvent('Missie afgebroken door security protocol.');
        }
    };

    const drawBackground = () => {
        const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        grad.addColorStop(0, '#0d1722');
        grad.addColorStop(1, '#081018');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.strokeStyle = 'rgba(69, 104, 129, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 22; x < canvas.width; x += 28) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 22; y < canvas.height; y += 28) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
    };

    const drawRooms = () => {
        roomZones.forEach((room) => {
            ctx.fillStyle = 'rgba(27, 42, 56, 0.35)';
            ctx.fillRect(room.x, room.y, room.w, room.h);
            ctx.strokeStyle = 'rgba(67, 98, 121, 0.42)';
            ctx.strokeRect(room.x, room.y, room.w, room.h);
            ctx.fillStyle = 'rgba(157, 190, 214, 0.66)';
            ctx.font = '12px Rajdhani';
            ctx.fillText(room.label, room.x + 8, room.y + 16);
        });

        ctx.fillStyle = '#30485d';
        state.walls.forEach((wall) => {
            ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
        });
    };

    const drawTasks = () => {
        const active = getActiveTask();

        state.tasks.forEach((task) => {
            const pulse = 4 + Math.sin(performance.now() * 0.005) * 2;

            if (task.done) {
                ctx.fillStyle = 'rgba(83, 215, 159, 0.85)';
                ctx.beginPath();
                ctx.arc(task.x, task.y, 7, 0, Math.PI * 2);
                ctx.fill();
                return;
            }

            ctx.strokeStyle = task === active ? 'rgba(61, 225, 211, 0.98)' : 'rgba(97, 157, 196, 0.7)';
            ctx.lineWidth = task === active ? 3 : 2;
            ctx.beginPath();
            ctx.arc(task.x, task.y, 12 + (task === active ? pulse : 0), 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = 'rgba(220, 243, 255, 0.95)';
            ctx.font = 'bold 12px Rajdhani';
            ctx.fillText(task.id.toUpperCase(), task.x - 15, task.y - 14);
        });
    };

    const drawDrones = () => {
        state.drones.forEach((drone) => {
            const glow = ctx.createRadialGradient(drone.x, drone.y, 2, drone.x, drone.y, 60);
            glow.addColorStop(0, 'rgba(247, 165, 49, 0.22)');
            glow.addColorStop(1, 'rgba(247, 165, 49, 0)');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(drone.x, drone.y, 60, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = '#f7a531';
            ctx.beginPath();
            ctx.arc(drone.x, drone.y, 8, 0, Math.PI * 2);
            ctx.fill();

            ctx.strokeStyle = 'rgba(255, 196, 114, 0.6)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.arc(drone.x, drone.y, 18, 0, Math.PI * 2);
            ctx.stroke();
        });
    };

    const drawPlayer = () => {
        const glow = ctx.createRadialGradient(state.player.x, state.player.y, 2, state.player.x, state.player.y, 34);
        glow.addColorStop(0, 'rgba(74, 199, 250, 0.42)');
        glow.addColorStop(1, 'rgba(74, 199, 250, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, 34, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#45c9ff';
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = 'rgba(160, 226, 255, 0.85)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(state.player.x, state.player.y, state.player.r + 4, 0, Math.PI * 2);
        ctx.stroke();
    };

    const tick = (ts) => {
        if (!running) return;

        const dt = Math.min((ts - lastTs) / 1000 || 0, 0.05);
        lastTs = ts;

        let dx = 0;
        let dy = 0;

        if (keys.has('arrowup') || keys.has('w') || touchState.up) dy -= 1;
        if (keys.has('arrowdown') || keys.has('s') || touchState.down) dy += 1;
        if (keys.has('arrowleft') || keys.has('a') || touchState.left) dx -= 1;
        if (keys.has('arrowright') || keys.has('d') || touchState.right) dx += 1;

        tryMovePlayer(dx, dy, dt);
        updateDrones(dt);

        state.timeLeft -= dt;
        if (state.timeLeft <= 0 || state.alert >= 100) {
            finishMission(false);
        }

        drawBackground();
        drawRooms();
        drawTasks();
        drawDrones();
        drawPlayer();

        updateHud();

        if (running) {
            requestAnimationFrame(tick);
        }
    };

    const startGame = () => {
        resetState();
        startOverlay.classList.add('hidden');
        endOverlay.classList.add('hidden');
        running = true;
        lastTs = performance.now();
        requestAnimationFrame(tick);
    };

    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        keys.add(key);

        if (key === 'e') {
            completeTaskIfPossible();
        }
    });

    document.addEventListener('keyup', (event) => {
        keys.delete(event.key.toLowerCase());
    });

    document.querySelectorAll('[data-dir]').forEach((btn) => {
        const dir = btn.getAttribute('data-dir');
        const press = (active) => {
            touchState[dir] = active;
        };

        btn.addEventListener('pointerdown', () => press(true));
        btn.addEventListener('pointerup', () => press(false));
        btn.addEventListener('pointercancel', () => press(false));
        btn.addEventListener('pointerleave', () => press(false));
    });

    document.querySelector('[data-action="interact"]').addEventListener('pointerdown', () => {
        completeTaskIfPossible();
    });

    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', startGame);

    // Render static scene before game start.
    drawBackground();
    drawRooms();
    drawTasks();
    drawDrones();
    drawPlayer();
    renderTasks();
    updateHud();
})();
