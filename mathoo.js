// Mathoo — Le Compte est Bon : atteindre une cible (201-999) avec 6 nombres.

let database = null;
let target = 0;
let tiles = [];            // { id, value, used, computed }
let nextTileId = 1;
let history = [];          // étapes de calcul effectuées
let firstOperand = null;   // id de la première tuile sélectionnée
let chosenOp = null;       // opérateur choisi en attente du second chiffre
let lastResultId = null;   // id du dernier résultat calculé (utilisable tel quel comme réponse finale)
let gameEnded = false;
let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let finalResult = null;    // { finalValue, distance, perfect, time }
let currentStreak = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    document.getElementById('mathoo-result-modal').style.display = 'none';
    document.getElementById('leaderboard-modal').style.display = 'none';

    setupEventListeners();

    if (isTodayCompleted()) {
        blockGame();
    } else {
        initializeGame();
    }
});

// ---------- Firebase ----------

function initializeFirebase() {
    try {
        if (typeof initFirebase === 'function') {
            database = initFirebase();
        }
    } catch (error) {
        console.warn('Firebase non disponible:', error);
        database = null;
    }
}

// ---------- Dates / stockage local ----------

function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function getYesterdayKey() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Incrémenter cette valeur change la cible et les nombres tirés pour toutes
// les dates (y compris aujourd'hui) sans toucher au reste de la logique.
const SEED_SALT = 1;

function getTodaysSeed() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + 555555;
    return seed + SEED_SALT * 999983;
}

function isTodayCompleted() {
    return localStorage.getItem(`mathoo-completed-${getTodayKey()}`) === 'true';
}

function markTodayCompleted() {
    localStorage.setItem(`mathoo-completed-${getTodayKey()}`, 'true');
}

// ---------- Série de jours consécutifs ----------

function loadStreak() {
    const streak = parseInt(localStorage.getItem('mathoo-streak') || '0', 10);
    const lastPlayed = localStorage.getItem('mathoo-last-played');
    const today = getTodayKey();
    const yesterday = getYesterdayKey();

    // Si le dernier jour joué n'est ni hier ni aujourd'hui, la série est rompue
    if (lastPlayed && lastPlayed !== today && lastPlayed !== yesterday) {
        localStorage.setItem('mathoo-streak', '0');
        return 0;
    }
    return streak;
}

function updateStreakDisplay() {
    currentStreak = loadStreak();
    document.getElementById('streak-count').textContent = currentStreak;
}

function updateStreakOnCompletion() {
    const today = getTodayKey();
    const yesterday = getYesterdayKey();
    const lastPlayed = localStorage.getItem('mathoo-last-played');
    let streak = parseInt(localStorage.getItem('mathoo-streak') || '0', 10);

    if (lastPlayed === today) {
        // déjà comptabilisé aujourd'hui
    } else if (lastPlayed === yesterday) {
        streak += 1;
    } else {
        streak = 1;
    }

    localStorage.setItem('mathoo-streak', String(streak));
    localStorage.setItem('mathoo-last-played', today);
    currentStreak = streak;
    document.getElementById('streak-count').textContent = streak;
}

// ---------- Génération du tirage du jour ----------

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Difficulté : peu de grands nombres (0 ou 1 au lieu de 0 à 4), cible entre 201
// et 999, et on n'accepte que des tirages où la cible est atteignable exactement
// mais jamais avec moins de MIN_NUMBERS_REQUIRED nombres. Le tirage reste
// déterministe : si une combinaison ne convient pas, on passe à la suivante.
const MIN_NUMBERS_REQUIRED = 4;
const MAX_INTERMEDIATE = 100000;

function generateDailyPuzzle(seed) {
    let fallback = null;
    for (let attempt = 0; attempt < 200; attempt++) {
        const s = seed + attempt * 7919;
        const small = [];
        for (let i = 1; i <= 10; i++) small.push(i, i);
        for (let i = small.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom(s + i) * (i + 1));
            [small[i], small[j]] = [small[j], small[i]];
        }

        const bigCount = seededRandom(s + 400) < 0.5 ? 0 : 1;
        const numbers = small.slice(0, 6 - bigCount);
        if (bigCount) numbers.push([25, 50, 75, 100][Math.floor(seededRandom(s + 450) * 4)]);

        const puzzleTarget = 201 + Math.floor(seededRandom(s + 500) * 799);
        const needed = minNumbersToReach(computeReachableBySubset(numbers), puzzleTarget);

        if (needed !== Infinity && needed >= MIN_NUMBERS_REQUIRED) {
            return { target: puzzleTarget, numbers };
        }
        if (needed !== Infinity && !fallback) fallback = { target: puzzleTarget, numbers };
    }
    return fallback;
}

// Pour chaque sous-ensemble de nombres (bitmask), toutes les valeurs atteignables
// en utilisant exactement ces nombres-là.
function computeReachableBySubset(numbers) {
    const full = 1 << numbers.length;
    const sets = new Array(full);
    for (let m = 1; m < full; m++) {
        if ((m & (m - 1)) === 0) {
            sets[m] = new Set([numbers[31 - Math.clz32(m)]]);
            continue;
        }
        const values = new Set();
        for (let a = (m - 1) & m; a > 0; a = (a - 1) & m) {
            const b = m ^ a;
            if (a < b) continue; // chaque découpage {a, b} une seule fois
            for (const x of sets[a]) {
                for (const y of sets[b]) {
                    values.add(x + y);
                    if (x * y <= MAX_INTERMEDIATE) values.add(x * y);
                    if (x !== y) values.add(Math.abs(x - y));
                    if (x % y === 0) values.add(x / y);
                    else if (y % x === 0) values.add(y / x);
                }
            }
        }
        sets[m] = values;
    }
    return sets;
}

function minNumbersToReach(sets, value) {
    let best = Infinity;
    for (let m = 1; m < sets.length; m++) {
        if (!sets[m].has(value)) continue;
        let bits = 0;
        for (let k = m; k; k >>= 1) bits += k & 1;
        best = Math.min(best, bits);
    }
    return best;
}

// Retrouve une suite d'opérations menant à la cible (affichée en fin de partie
// quand le joueur ne l'a pas trouvée, pour montrer que c'était faisable).
function findSolution(numbers, goal) {
    const seen = new Set();
    function search(values, steps) {
        if (values.includes(goal)) return steps;
        if (values.length < 2) return null;
        const key = values.slice().sort((a, b) => a - b).join(',');
        if (seen.has(key)) return null;
        seen.add(key);
        for (let i = 0; i < values.length; i++) {
            for (let j = 0; j < values.length; j++) {
                if (i === j) continue;
                const x = values[i], y = values[j];
                const candidates = [];
                if (i < j) candidates.push([x + y, '+'], [x * y, '×']);
                if (x > y) candidates.push([x - y, '−']);
                if (y > 1 && x % y === 0) candidates.push([x / y, '÷']);
                for (const [r, sym] of candidates) {
                    const rest = values.filter((_, k) => k !== i && k !== j);
                    rest.push(r);
                    const found = search(rest, [...steps, `${x} ${sym} ${y} = ${r}`]);
                    if (found) return found;
                }
            }
        }
        return null;
    }
    return search(numbers.slice(), []);
}

// ---------- Initialisation / animation d'intro ----------

function initializeGame() {
    const seed = getTodaysSeed();
    const puzzle = generateDailyPuzzle(seed);

    target = puzzle.target;
    tiles = puzzle.numbers.map(v => ({ id: nextTileId++, value: v, used: false, computed: false }));
    history = [];
    firstOperand = null;
    chosenOp = null;
    lastResultId = null;
    gameEnded = false;
    elapsedTime = 0;
    finalResult = null;

    updateStreakDisplay();
    document.getElementById('timer').textContent = '00:00';
    document.getElementById('mathoo-steps').innerHTML = '';

    renderTargetPlaceholder();
    renderTilesPlaceholder();
    playIntroAnimation();
}

// Relance la grille du jour (même cible, mêmes nombres) — le résultat
// compte normalement pour le classement, comme un premier essai.
function restartMathoo() {
    closeResultModal();

    const seed = getTodaysSeed();
    const puzzle = generateDailyPuzzle(seed);

    target = puzzle.target;
    tiles = puzzle.numbers.map(v => ({ id: nextTileId++, value: v, used: false, computed: false }));
    history = [];
    firstOperand = null;
    chosenOp = null;
    lastResultId = null;
    gameEnded = false;
    elapsedTime = 0;
    finalResult = null;

    document.getElementById('timer').textContent = '00:00';
    document.getElementById('mathoo-steps').innerHTML = '';
    // On efface le message "déjà joué" sans masquer la zone : elle doit rester
    // disponible pour les messages suivants (opération invalide, etc.)
    const messageEl = document.getElementById('message');
    messageEl.style.display = '';
    messageEl.className = 'message';
    messageEl.textContent = '';

    const oldReplayBtn = document.getElementById('replay-practice-btn');
    if (oldReplayBtn) oldReplayBtn.remove();

    document.querySelector('.mathoo-target-wrapper').style.display = '';
    document.querySelector('.mathoo-numbers').style.display = '';
    document.querySelector('.mathoo-operators').style.display = '';
    document.getElementById('mathoo-steps').style.display = '';
    document.querySelectorAll('.controls').forEach(c => c.style.display = '');
    document.getElementById('undo-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;

    renderTargetPlaceholder();
    renderTilesPlaceholder();
    playIntroAnimation();

    showMessage('🔄 Nouvelle tentative sur la grille du jour !', 'info');
}

function renderTargetPlaceholder() {
    const el = document.getElementById('mathoo-target');
    el.textContent = '---';
    el.classList.remove('reached');
}

function renderTilesPlaceholder() {
    const container = document.getElementById('mathoo-numbers');
    container.innerHTML = '';
    tiles.forEach(() => {
        const el = document.createElement('div');
        el.className = 'mathoo-tile spinning';
        el.textContent = randomDisplayNumber();
        container.appendChild(el);
    });
}

function randomDisplayNumber() {
    return Math.floor(Math.random() * 100) + 1;
}

// Anime chaque tuile et la cible : chiffres aléatoires rapides puis
// ralentissement progressif jusqu'à se figer sur la valeur finale du jour.
function playIntroAnimation() {
    const tileEls = document.querySelectorAll('.mathoo-tile');
    const totalToLock = tileEls.length + 1; // tuiles + cible
    let lockedCount = 0;

    const onOneLocked = () => {
        lockedCount++;
        if (lockedCount === totalToLock) onIntroComplete();
    };

    tileEls.forEach((el, i) => {
        animateSpinningElement(el, tiles[i].value, 1200 + i * 150, randomDisplayNumber, () => {
            el.classList.remove('spinning');
            el.classList.add('locked');
            onOneLocked();
        });
    });

    const targetEl = document.getElementById('mathoo-target');
    animateSpinningElement(targetEl, target, 1200 + tileEls.length * 150 + 300, randomTargetDisplay, onOneLocked);
}

function randomTargetDisplay() {
    return 100 + Math.floor(Math.random() * 900);
}

function animateSpinningElement(el, finalValue, totalDuration, randomValueFn, onDone) {
    const start = performance.now();

    function tick() {
        const elapsed = performance.now() - start;

        if (elapsed >= totalDuration) {
            el.textContent = finalValue;
            onDone();
            return;
        }

        el.textContent = randomValueFn();
        const progress = elapsed / totalDuration;
        const delay = 40 + progress * progress * 260;
        setTimeout(tick, delay);
    }

    tick();
}

function onIntroComplete() {
    renderTiles();
    updateOperatorButtonsState();
    updateValidateButtonState();
    startTimer();
}

// ---------- Chronomètre ----------

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    elapsedTime = Math.floor((Date.now() - startTime) / 1000);
    document.getElementById('timer').textContent = formatTime(elapsedTime);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

// ---------- Logique de jeu ----------

function setupEventListeners() {
    document.querySelectorAll('.mathoo-op-btn').forEach(btn => {
        btn.addEventListener('click', () => onOperatorClick(btn.dataset.op));
    });

    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('validate-btn').addEventListener('click', validate);

    document.getElementById('view-leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('submit-mathoo-score-btn').addEventListener('click', submitMathooScore);
    document.getElementById('skip-mathoo-score-btn').addEventListener('click', closeResultModal);
    document.getElementById('replay-mathoo-btn').addEventListener('click', restartMathoo);
    document.getElementById('mathoo-player-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitMathooScore();
    });

    window.addEventListener('click', (e) => {
        const leaderboardModal = document.getElementById('leaderboard-modal');
        if (e.target === leaderboardModal) closeLeaderboard();
    });
}

// Sélection : on clique un chiffre, puis un opérateur, puis un second chiffre.
function onTileClick(tileId) {
    if (gameEnded) return;
    const tile = tiles.find(t => t.id === tileId);
    if (!tile || tile.used) return;

    if (firstOperand === null) {
        // premier chiffre de l'opération
        firstOperand = tileId;
    } else if (tileId === firstOperand) {
        // reclic sur le même chiffre : on annule la sélection
        firstOperand = null;
        chosenOp = null;
    } else if (chosenOp === null) {
        // pas encore d'opérateur choisi : on change simplement le premier chiffre
        firstOperand = tileId;
    } else {
        // chiffre + opérateur déjà choisis : ce clic est le second chiffre
        const leftTile = tiles.find(t => t.id === firstOperand);
        if (!isValidOperation(chosenOp, leftTile.value, tile.value)) {
            showMessage('❌ Opération invalide', 'error');
            return; // on garde la sélection en cours, l'utilisateur peut réessayer
        }
        performOperationBetween(leftTile, tile, chosenOp);
        firstOperand = null;
        chosenOp = null;
        return; // performOperationBetween s'occupe déjà du rendu
    }

    updateTileSelectionClasses();
    updateOperatorButtonsState();
    updateValidateButtonState();
}

function onOperatorClick(op) {
    if (gameEnded || firstOperand === null) return;
    chosenOp = op;
    updateOperatorButtonsState();
    updateValidateButtonState();
}

function isValidOperation(op, left, right) {
    switch (op) {
        case '+': return true;
        case '*': return true;
        case '-': return left - right > 0;
        case '/': return right !== 0 && Number.isInteger(left / right);
        default: return false;
    }
}

// Met juste à jour la classe "selected" des tuiles déjà présentes dans le DOM,
// sans tout reconstruire — évite le clignotement au clic.
function updateTileSelectionClasses() {
    document.querySelectorAll('.mathoo-tile').forEach(el => {
        const id = parseInt(el.dataset.tileId, 10);
        el.classList.toggle('selected', id === firstOperand);
    });
}

function updateOperatorButtonsState() {
    const opButtons = document.querySelectorAll('.mathoo-op-btn');
    opButtons.forEach(b => {
        b.disabled = gameEnded || firstOperand === null;
        b.classList.toggle('active', b.dataset.op === chosenOp);
    });
}

function updateValidateButtonState() {
    const available = tiles.filter(t => !t.used);
    const hasSelectedSingle = firstOperand !== null && chosenOp === null;
    const hasImplicitResult = firstOperand === null && chosenOp === null &&
        lastResultId !== null && tiles.some(t => t.id === lastResultId && !t.used);
    const canValidate = !gameEnded && (available.length === 1 || hasSelectedSingle || hasImplicitResult);
    document.getElementById('validate-btn').disabled = !canValidate;
}

function performOperationBetween(leftTile, rightTile, op) {
    let resultValue;
    switch (op) {
        case '+': resultValue = leftTile.value + rightTile.value; break;
        case '-': resultValue = leftTile.value - rightTile.value; break;
        case '*': resultValue = leftTile.value * rightTile.value; break;
        case '/': resultValue = leftTile.value / rightTile.value; break;
    }

    leftTile.used = true;
    rightTile.used = true;

    const resultTile = { id: nextTileId++, value: resultValue, used: false, computed: true };
    tiles.push(resultTile);
    lastResultId = resultTile.id;

    const opSymbol = { '+': '+', '-': '−', '*': '×', '/': '÷' }[op];
    history.push({
        leftId: leftTile.id,
        rightId: rightTile.id,
        resultId: resultTile.id,
        leftVal: leftTile.value,
        rightVal: rightTile.value,
        opSymbol,
        resultVal: resultValue
    });

    renderTiles();
    renderSteps();
    updateOperatorButtonsState();
    updateValidateButtonState();

    // Le compte est bon : victoire immédiate, sans avoir à cliquer sur Valider.
    if (resultValue === target) {
        document.getElementById('mathoo-target').classList.add('reached');
        endRound(resultValue);
    }
}

function undo() {
    if (gameEnded || history.length === 0) return;

    const last = history.pop();
    const leftTile = tiles.find(t => t.id === last.leftId);
    const rightTile = tiles.find(t => t.id === last.rightId);
    leftTile.used = false;
    rightTile.used = false;
    tiles = tiles.filter(t => t.id !== last.resultId);
    firstOperand = null;
    chosenOp = null;
    lastResultId = history.length > 0 ? history[history.length - 1].resultId : null;

    document.getElementById('mathoo-target').classList.remove('reached');

    renderTiles();
    renderSteps();
    updateOperatorButtonsState();
    updateValidateButtonState();
}

function resetGame() {
    if (gameEnded) return;
    if (!confirm('Recommencer ce calcul depuis le début (mêmes nombres) ?')) return;

    tiles = tiles.filter(t => !t.computed);
    tiles.forEach(t => t.used = false);
    history = [];
    firstOperand = null;
    chosenOp = null;
    lastResultId = null;

    document.getElementById('mathoo-target').classList.remove('reached');

    renderTiles();
    renderSteps();
    updateOperatorButtonsState();
    updateValidateButtonState();
    showMessage('Recommencé !', 'info');
}

function validate() {
    if (gameEnded) return;
    const available = tiles.filter(t => !t.used);

    let finalValue;
    if (available.length === 1) {
        finalValue = available[0].value;
    } else if (firstOperand !== null && chosenOp === null) {
        finalValue = tiles.find(t => t.id === firstOperand).value;
    } else if (lastResultId !== null) {
        const resultTile = tiles.find(t => t.id === lastResultId && !t.used);
        if (!resultTile) return;
        finalValue = resultTile.value;
    } else {
        return;
    }

    endRound(finalValue);
}

function endRound(finalValue) {
    gameEnded = true;
    stopTimer();
    if (startTime) elapsedTime = Math.floor((Date.now() - startTime) / 1000);

    const distance = Math.abs(target - finalValue);
    const perfect = distance === 0;
    finalResult = { finalValue, distance, perfect, time: elapsedTime };

    markTodayCompleted();
    updateStreakOnCompletion();

    document.querySelectorAll('.mathoo-op-btn').forEach(b => b.disabled = true);
    document.getElementById('undo-btn').disabled = true;
    document.getElementById('reset-btn').disabled = true;
    document.getElementById('validate-btn').disabled = true;

    if (perfect) celebrate();

    setTimeout(showResultModal, perfect ? 1900 : 300);
}

// ---------- Rendu ----------

function renderTiles() {
    const container = document.getElementById('mathoo-numbers');
    container.innerHTML = '';
    tiles.filter(t => !t.used).forEach(t => {
        const el = document.createElement('div');
        el.className = 'mathoo-tile';
        el.dataset.tileId = t.id;
        if (t.id === firstOperand) el.classList.add('selected');
        if (t.computed) el.classList.add('computed');
        if (t.value >= 100) el.classList.add('big-number');
        el.textContent = t.value;
        el.addEventListener('click', () => onTileClick(t.id));
        container.appendChild(el);
    });
}

function renderSteps() {
    const container = document.getElementById('mathoo-steps');
    container.innerHTML = '';
    history.forEach(step => {
        const chip = document.createElement('span');
        chip.className = 'mathoo-step-chip';
        chip.textContent = `${step.leftVal} ${step.opSymbol} ${step.rightVal} = ${step.resultVal}`;
        container.appendChild(chip);
    });
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
        messageEl.textContent = '';
    }, 2500);
}

// ---------- Blocage (une partie par jour) ----------

function blockGame() {
    updateStreakDisplay();

    const messageEl = document.getElementById('message');
    messageEl.innerHTML = '🎉 <strong>Vous avez déjà joué à Mathoo aujourd\'hui !</strong><br>Revenez demain pour une nouvelle cible ! 🎯';
    messageEl.className = 'message success';
    messageEl.style.display = 'block';

    document.querySelector('.mathoo-target-wrapper').style.display = 'none';
    document.querySelector('.mathoo-numbers').style.display = 'none';
    document.querySelector('.mathoo-operators').style.display = 'none';
    document.getElementById('mathoo-steps').style.display = 'none';
    document.querySelectorAll('.controls').forEach(c => c.style.display = 'none');

    if (!document.getElementById('replay-practice-btn')) {
        const replayBtn = document.createElement('button');
        replayBtn.id = 'replay-practice-btn';
        replayBtn.className = 'btn btn-warning';
        replayBtn.textContent = '🔄 Recommencer';
        replayBtn.style.marginTop = '10px';
        replayBtn.addEventListener('click', restartMathoo);
        messageEl.insertAdjacentElement('afterend', replayBtn);
    }
}

// ---------- Célébration ----------

function celebrate() {
    const banner = document.createElement('div');
    banner.className = 'mathoo-victory-banner';
    banner.innerHTML = `<span>🎯 Le compte est bon !</span><small>⏱️ ${formatTime(elapsedTime)}</small>`;
    document.body.appendChild(banner);
    setTimeout(() => banner.remove(), 1900);

    for (let i = 0; i < 70; i++) {
        setTimeout(() => createConfetti(), i * 50);
    }
}

function createConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.position = 'fixed';
    confetti.style.top = '-10px';
    confetti.style.width = '8px';
    confetti.style.height = '8px';
    confetti.style.zIndex = '2000';
    confetti.style.borderRadius = '2px';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = ['#667eea', '#764ba2', '#ffa726', '#66bb6a', '#ef5350'][Math.floor(Math.random() * 5)];
    confetti.style.animation = `confetti ${(Math.random() * 2 + 2)}s linear forwards`;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 4200);
}

// ---------- Modale de résultat ----------

function showResultModal() {
    const titleEl = document.getElementById('mathoo-result-title');
    const textEl = document.getElementById('mathoo-result-text');

    if (finalResult.perfect) {
        titleEl.textContent = '🎉 Le compte est bon !';
        titleEl.classList.add('perfect');
        textEl.textContent = `Vous avez atteint exactement ${target} !`;
    } else {
        titleEl.textContent = '🎯 Résultat';
        titleEl.classList.remove('perfect');
        textEl.textContent = `Vous avez obtenu ${finalResult.finalValue} (cible : ${target})`;
    }

    document.getElementById('result-distance').textContent = finalResult.perfect ? '0 🎯' : finalResult.distance;
    document.getElementById('result-time').textContent = formatTime(finalResult.time);

    // Réaffiche le formulaire d'enregistrement (masqué après une soumission précédente)
    document.querySelector('#mathoo-result-modal .name-input-container').style.display = '';
    const submitBtn = document.getElementById('submit-mathoo-score-btn');
    submitBtn.style.display = '';
    submitBtn.disabled = false;
    const skipBtn = document.getElementById('skip-mathoo-score-btn');
    skipBtn.style.display = '';
    skipBtn.textContent = 'Passer';

    const stepsContainer = document.getElementById('mathoo-result-steps');
    stepsContainer.innerHTML = '';
    if (history.length === 0) {
        stepsContainer.innerHTML = '<span style="color:#aaa;font-style:italic;font-size:0.85em;">Aucun calcul effectué</span>';
    } else {
        history.forEach(step => {
            const chip = document.createElement('span');
            chip.className = 'mathoo-step-chip';
            chip.textContent = `${step.leftVal} ${step.opSymbol} ${step.rightVal} = ${step.resultVal}`;
            stepsContainer.appendChild(chip);
        });
    }

    if (!finalResult.perfect) {
        const solution = findSolution(tiles.filter(t => !t.computed).map(t => t.value), target);
        if (solution) {
            const solutionEl = document.createElement('div');
            solutionEl.className = 'mathoo-solution';
            solutionEl.innerHTML = '<div class="mathoo-solution-label">💡 Une solution possible :</div>';
            solution.forEach(step => {
                const chip = document.createElement('span');
                chip.className = 'mathoo-step-chip';
                chip.textContent = step;
                solutionEl.appendChild(chip);
            });
            stepsContainer.appendChild(solutionEl);
        }
    }

    const modal = document.getElementById('mathoo-result-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.getElementById('mathoo-player-name').focus();
}

function closeResultModal() {
    const modal = document.getElementById('mathoo-result-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('mathoo-player-name').value = '';
}

async function submitMathooScore() {
    const submitBtn = document.getElementById('submit-mathoo-score-btn');
    if (submitBtn.disabled) return;

    const rawName = document.getElementById('mathoo-player-name').value;
    const playerName = sanitizeName(rawName);

    if (!playerName || playerName.length < 2) {
        showNameError('mathoo-player-name');
        return;
    }

    if (!database) {
        showMessage('⚠️ Configurez Firebase pour activer le classement', 'info');
        closeResultModal();
        return;
    }

    submitBtn.disabled = true;

    try {
        const today = getTodayKey();
        const scoreData = {
            name: playerName,
            time: finalResult.time,
            difficulty: 'mathoo',
            target: target,
            result: finalResult.finalValue,
            distance: finalResult.distance,
            perfect: finalResult.perfect,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        await database.ref(`scores/${today}/mathoo`).push(scoreData);

        // On garde la modale ouverte (avec Recommencer et Fermer) au lieu de la fermer
        // directement, pour permettre de rejouer sans redemander le nom — mais on laisse
        // toujours un moyen de fermer la modale pour retourner au menu.
        document.querySelector('#mathoo-result-modal .name-input-container').style.display = 'none';
        submitBtn.style.display = 'none';
        const skipBtn = document.getElementById('skip-mathoo-score-btn');
        skipBtn.textContent = 'Fermer';
        document.getElementById('mathoo-result-text').textContent = '🎉 Score enregistré avec succès ! Vous pouvez rejouer ou fermer cette fenêtre.';

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement du score', 'error');
        submitBtn.disabled = false;
    }
}

// ---------- Classement ----------

async function showLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const userRankDiv = document.getElementById('user-rank');

    modal.style.display = 'flex';
    modal.classList.add('show');

    leaderboardList.innerHTML = '<div class="loading">Chargement du classement...</div>';
    userRankDiv.innerHTML = '';

    if (!database) {
        leaderboardList.innerHTML = '<div class="loading">⚠️ Le classement nécessite la configuration de Firebase.</div>';
        return;
    }

    try {
        const today = getTodayKey();
        const snapshot = await database.ref(`scores/${today}/mathoo`).once('value');

        const scores = [];
        snapshot.forEach((child) => { scores.push({ id: child.key, ...child.val() }); });

        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="loading">Aucun score enregistré pour Mathoo aujourd\'hui</div>';
            return;
        }

        scores.sort((a, b) => {
            if ((a.distance || 0) !== (b.distance || 0)) return (a.distance || 0) - (b.distance || 0);
            return (a.time || 0) - (b.time || 0);
        });

        leaderboardList.innerHTML = '';
        scores.forEach((s, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';

            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            if (rank <= 3) item.classList.add('top-3');

            const date = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            const resultDisplay = s.perfect ? '🎯 Compte bon' : `Écart ${s.distance}`;

            item.innerHTML = `
                <div class="rank-col">${medal} ${rank}</div>
                <div class="name-col">${escapeHtml(s.name)}</div>
                <div class="time-col">${resultDisplay}<br><small class="lb-time">⏱️ ${formatTime(s.time || 0)}</small></div>
                <div class="date-col">${date}</div>
            `;

            leaderboardList.appendChild(item);
        });

        if (gameEnded && finalResult) {
            const userPosition = scores.findIndex(s =>
                (s.distance || 0) > finalResult.distance ||
                ((s.distance || 0) === finalResult.distance && (s.time || 0) >= finalResult.time)) + 1;
            const totalPlayers = scores.length;
            if (userPosition > 0) {
                const percentile = Math.round((1 - (userPosition / totalPlayers)) * 100);
                userRankDiv.innerHTML = `
                    🎯 Vous êtes ${userPosition}${userPosition === 1 ? 'er' : 'ème'} !<br>
                    Vous êtes dans le top ${100 - percentile}% des joueurs (${totalPlayers} joueurs aujourd'hui)
                `;
            }
        }

    } catch (error) {
        console.error('Erreur lors du chargement du classement:', error);
        leaderboardList.innerHTML = '<div class="loading">Erreur lors du chargement du classement</div>';
    }
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Le message général est caché derrière la fenêtre : l'erreur de nom s'affiche
// donc juste sous le champ, avec le champ en rouge.
function showNameError(inputId) {
    const input = document.getElementById(inputId);
    let err = input.parentElement.querySelector('.name-error');
    if (!err) {
        err = document.createElement('div');
        err.className = 'name-error';
        input.insertAdjacentElement('afterend', err);
    }
    err.textContent = 'Entrez un nom de 2 à 10 caractères (lettres ou chiffres)';
    input.classList.remove('invalid');
    void input.offsetWidth;
    input.classList.add('invalid');
    input.focus();
    clearTimeout(err._hideTimer);
    err._hideTimer = setTimeout(() => { err.remove(); input.classList.remove('invalid'); }, 3500);
}

// ---------- Utilitaires ----------

function sanitizeName(name) {
    name = name.trim().substring(0, 10);
    name = name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿæœçÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒÇ\s'-]/g, '');
    name = name.replace(/\s+/g, ' ');
    return name;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
