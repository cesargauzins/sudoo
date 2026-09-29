// Mathoo — Le Compte est Bon : atteindre une cible (100-999) avec 6 nombres.

let database = null;
let target = 0;
let tiles = [];            // { id, value, used, computed }
let nextTileId = 1;
let history = [];          // étapes de calcul effectuées
let firstOperand = null;   // id de la première tuile sélectionnée
let chosenOp = null;       // opérateur choisi en attente du second chiffre
let gameEnded = false;
let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let finalResult = null;    // { finalValue, distance, perfect, time }
let currentStreak = 0;
let isPracticeMode = false; // manche rejouée pour s'entraîner, non comptée au classement

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

function generateDailyPuzzle(seed) {
    const bag = [];
    for (let i = 1; i <= 10; i++) {
        bag.push(i);
        bag.push(i);
    }
    bag.push(25, 50, 75, 100);

    for (let i = bag.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
    }

    const numbers = bag.slice(0, 6);
    const puzzleTarget = 100 + Math.floor(seededRandom(seed + 500) * 900);

    return { target: puzzleTarget, numbers };
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

// Relance une manche avec un tirage aléatoire (pas celui du jour), pour
// s'entraîner après avoir terminé — ne compte pas pour le classement ni la série.
function startPracticeRound() {
    closeResultModal();
    isPracticeMode = true;

    const randomSeed = Math.floor(Math.random() * 1000000000);
    const puzzle = generateDailyPuzzle(randomSeed);

    target = puzzle.target;
    tiles = puzzle.numbers.map(v => ({ id: nextTileId++, value: v, used: false, computed: false }));
    history = [];
    firstOperand = null;
    chosenOp = null;
    gameEnded = false;
    elapsedTime = 0;
    finalResult = null;

    document.getElementById('timer').textContent = '00:00';
    document.getElementById('mathoo-steps').innerHTML = '';
    document.getElementById('message').style.display = 'none';

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

    showMessage('🔄 Mode entraînement : ce résultat ne sera pas enregistré.', 'info');
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
    document.getElementById('replay-mathoo-btn').addEventListener('click', startPracticeRound);
    document.getElementById('share-mathoo-btn').addEventListener('click', shareMathooScore);
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
    const canValidate = !gameEnded && (available.length === 1 || (firstOperand !== null && chosenOp === null));
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

    if (resultValue === target) {
        const targetEl = document.getElementById('mathoo-target');
        targetEl.classList.add('reached');
        showMessage('🎯 Le compte est bon ! Cliquez sur Valider pour confirmer.', 'success');
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
    } else {
        return;
    }

    endRound(finalValue);
}

function endRound(finalValue) {
    gameEnded = true;
    stopTimer();

    const distance = Math.abs(target - finalValue);
    const perfect = distance === 0;
    finalResult = { finalValue, distance, perfect, time: elapsedTime };

    if (!isPracticeMode) {
        markTodayCompleted();
        updateStreakOnCompletion();
    }

    document.querySelectorAll('.mathoo-op-btn').forEach(b => b.disabled = true);
    document.getElementById('undo-btn').disabled = true;
    document.getElementById('reset-btn').disabled = true;
    document.getElementById('validate-btn').disabled = true;

    if (perfect) celebrate();

    setTimeout(showResultModal, perfect ? 900 : 300);
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
    messageEl.innerHTML = '🎉 <strong>Vous avez déjà joué à Mathoo aujourd’hui !</strong><br>Revenez demain pour une nouvelle cible ! 🎯';
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
        replayBtn.textContent = '🔄 Rejouer pour s\'entraîner';
        replayBtn.style.marginTop = '10px';
        replayBtn.addEventListener('click', startPracticeRound);
        messageEl.insertAdjacentElement('afterend', replayBtn);
    }
}

// ---------- Célébration ----------

function celebrate() {
    for (let i = 0; i < 40; i++) {
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

    if (isPracticeMode) {
        textEl.textContent += ' (entraînement, non comptabilisé)';
    }

    document.getElementById('result-distance').textContent = finalResult.perfect ? '0 🎯' : finalResult.distance;
    document.getElementById('result-time').textContent = formatTime(finalResult.time);

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

    const nameSection = document.querySelector('#mathoo-result-modal .name-input-container');
    const submitBtn = document.getElementById('submit-mathoo-score-btn');
    const shareBtn = document.getElementById('share-mathoo-btn');
    nameSection.style.display = isPracticeMode ? 'none' : '';
    submitBtn.style.display = isPracticeMode ? 'none' : '';
    shareBtn.style.display = isPracticeMode ? 'none' : '';

    const modal = document.getElementById('mathoo-result-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    if (!isPracticeMode) document.getElementById('mathoo-player-name').focus();
}

function closeResultModal() {
    const modal = document.getElementById('mathoo-result-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('mathoo-player-name').value = '';
}

async function submitMathooScore() {
    if (isPracticeMode) return; // les manches d'entraînement ne sont jamais enregistrées

    const submitBtn = document.getElementById('submit-mathoo-score-btn');
    if (submitBtn.disabled) return;

    const rawName = document.getElementById('mathoo-player-name').value;
    const playerName = sanitizeName(rawName);

    if (!playerName || playerName.length < 2) {
        showMessage('Veuillez entrer un nom valide (2-10 caractères) !', 'error');
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

        closeResultModal();
        showMessage('🎉 Score enregistré avec succès !', 'success');

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement du score', 'error');
        submitBtn.disabled = false;
    }
}

function shareMathooScore() {
    const todayStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const resultLine = finalResult.perfect
        ? `Le compte est bon ! 🎉 (${target})`
        : `${finalResult.finalValue} — écart de ${finalResult.distance} avec ${target}`;
    const text = `🧮 Mathoo du ${todayStr}\n🎯 Cible : ${target}\n${resultLine}\n⏱️ ${formatTime(finalResult.time)}\n🔥 Série : ${currentStreak} jour${currentStreak > 1 ? 's' : ''}`;

    if (navigator.share) {
        navigator.share({ title: 'Mon score Mathoo', text }).catch(() => copyToClipboard(text));
    } else {
        copyToClipboard(text);
    }
}

function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showMessage('📋 Score copié dans le presse-papier !', 'success');
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
            const resultDisplay = s.perfect ? '🎯 Compte bon !' : `Écart : ${s.distance}`;

            item.innerHTML = `
                <div class="rank-col">${medal} ${rank}</div>
                <div class="name-col">${escapeHtml(s.name)}</div>
                <div class="time-col">${resultDisplay}</div>
                <div class="date-col">${date}</div>
            `;

            leaderboardList.appendChild(item);
        });

        if (gameEnded && finalResult) {
            const userPosition = scores.findIndex(s => (s.distance || 0) >= finalResult.distance) + 1;
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
