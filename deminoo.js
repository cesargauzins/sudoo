// Deminoo — Démineur quotidien : grille 11x11, 22 mines, la même pour tout le monde.

const GRID_SIZE = 11;
const MINE_COUNT = 22;
const EARLY_DEATH_MOVE_LIMIT = 5; // rejouer autorisé si la mine tombe dans ces N premiers coups

let database = null;
let board = [];            // [row][col] = { isMine, adjacent, revealed, flagged }
let flagMode = false;
let gameEnded = false;
let isWon = false;
let revealedCount = 0;
let moveCount = 0;         // nombre de cases révélées tentées (mine incluse)
let startTime = null;
let timerInterval = null;
let elapsedTime = 0;
let finalResult = null;    // { time, won, earlyDeath }

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    document.getElementById('deminoo-result-modal').style.display = 'none';
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

// Incrémenter cette valeur change la grille du jour (y compris aujourd'hui)
// sans toucher au reste de la logique.
const SEED_SALT = 1;

function getTodaysSeed() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + 333333;
    return seed + SEED_SALT * 999983;
}

function isTodayCompleted() {
    return localStorage.getItem(`deminoo-completed-${getTodayKey()}`) === 'true';
}

function markTodayCompleted() {
    localStorage.setItem(`deminoo-completed-${getTodayKey()}`, 'true');
}

// ---------- Génération de la grille du jour ----------

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

function generateBoard(seed) {
    const cells = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        cells.push([]);
        for (let col = 0; col < GRID_SIZE; col++) {
            cells[row].push({ isMine: false, adjacent: 0, revealed: false, flagged: false });
        }
    }

    // Zone sûre garantie au centre (3x3), pour que la première ouverture soit toujours jouable
    const safeMin = Math.floor(GRID_SIZE / 2) - 1;
    const safeMax = Math.floor(GRID_SIZE / 2) + 1;

    const candidates = [];
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const inSafeZone = row >= safeMin && row <= safeMax && col >= safeMin && col <= safeMax;
            if (!inSafeZone) candidates.push({ row, col });
        }
    }

    // Mélange déterministe (Fisher-Yates) des positions candidates
    for (let i = candidates.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    for (let i = 0; i < MINE_COUNT; i++) {
        const { row, col } = candidates[i];
        cells[row][col].isMine = true;
    }

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (cells[row][col].isMine) continue;
            cells[row][col].adjacent = countAdjacentMines(cells, row, col);
        }
    }

    return cells;
}

function countAdjacentMines(cells, row, col) {
    let count = 0;
    for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
            if (dr === 0 && dc === 0) continue;
            const r = row + dr, c = col + dc;
            if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && cells[r][c].isMine) count++;
        }
    }
    return count;
}

// ---------- Initialisation ----------

function initializeGame() {
    const seed = getTodaysSeed();
    board = generateBoard(seed);
    flagMode = false;
    gameEnded = false;
    isWon = false;
    revealedCount = 0;
    moveCount = 0;
    elapsedTime = 0;
    finalResult = null;

    document.getElementById('timer').textContent = '00:00';
    document.getElementById('mines-left').textContent = MINE_COUNT;
    document.getElementById('flag-toggle-btn').classList.remove('active');
    document.getElementById('flag-toggle-btn').disabled = false;
    document.getElementById('reset-btn').disabled = false;

    renderGrid();
    startTimer();
}

function renderGrid() {
    const container = document.getElementById('deminoo-grid');
    container.innerHTML = '';
    let delayIndex = 0;

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            const el = document.createElement('div');
            el.className = 'deminoo-cell';
            el.dataset.row = row;
            el.dataset.col = col;
            el.style.animationDelay = `${Math.min(delayIndex * 6, 300)}ms`;
            delayIndex++;

            el.addEventListener('click', () => onCellClick(row, col));
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                toggleFlag(row, col);
            });

            container.appendChild(el);
        }
    }

    updateAllCellsDisplay();
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
    document.getElementById('flag-toggle-btn').addEventListener('click', toggleFlagMode);
    document.getElementById('reset-btn').addEventListener('click', resetGame);

    document.getElementById('view-leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('submit-deminoo-score-btn').addEventListener('click', submitDeminooScore);
    document.getElementById('skip-deminoo-score-btn').addEventListener('click', closeResultModal);
    document.getElementById('replay-early-deminoo-btn').addEventListener('click', () => {
        closeResultModal();
        restartDeminoo();
    });
    document.getElementById('deminoo-player-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitDeminooScore();
    });

    window.addEventListener('click', (e) => {
        const leaderboardModal = document.getElementById('leaderboard-modal');
        if (e.target === leaderboardModal) closeLeaderboard();
    });
}

function toggleFlagMode() {
    if (gameEnded) return;
    flagMode = !flagMode;
    document.getElementById('flag-toggle-btn').classList.toggle('active', flagMode);
}

function onCellClick(row, col) {
    if (gameEnded) return;
    if (flagMode) {
        toggleFlag(row, col);
    } else {
        revealCell(row, col);
    }
}

function toggleFlag(row, col) {
    if (gameEnded) return;
    const cell = board[row][col];
    if (cell.revealed) return;

    cell.flagged = !cell.flagged;

    const flagCount = countFlags();
    document.getElementById('mines-left').textContent = MINE_COUNT - flagCount;
    updateCellDisplay(row, col);
}

function countFlags() {
    let count = 0;
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (board[row][col].flagged) count++;
        }
    }
    return count;
}

function revealCell(row, col) {
    const cell = board[row][col];
    if (cell.revealed || cell.flagged) return;

    moveCount++;

    if (cell.isMine) {
        cell.revealed = true;
        gameOver(row, col);
        return;
    }

    floodReveal(row, col);
    updateAllCellsDisplay();
    checkWin();
}

// Révèle la case et, si elle n'a aucune mine adjacente, étend la révélation
// en cascade aux voisines (remplissage par diffusion classique du démineur).
function floodReveal(startRow, startCol) {
    const stack = [[startRow, startCol]];
    const visited = new Set();

    while (stack.length > 0) {
        const [row, col] = stack.pop();
        const key = `${row},${col}`;
        if (visited.has(key)) continue;
        visited.add(key);

        const cell = board[row][col];
        if (cell.revealed || cell.flagged || cell.isMine) continue;

        cell.revealed = true;
        revealedCount++;

        if (cell.adjacent === 0) {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (dr === 0 && dc === 0) continue;
                    const r = row + dr, c = col + dc;
                    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE && !visited.has(`${r},${c}`)) {
                        stack.push([r, c]);
                    }
                }
            }
        }
    }
}

function checkWin() {
    const totalSafeCells = GRID_SIZE * GRID_SIZE - MINE_COUNT;
    if (revealedCount >= totalSafeCells) {
        winGame();
    }
}

function winGame() {
    gameEnded = true;
    isWon = true;
    stopTimer();

    finalResult = { time: elapsedTime, won: true };
    markTodayCompleted();

    // Marquer les mines restantes avec un drapeau pour l'affichage final
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (board[row][col].isMine) board[row][col].flagged = true;
        }
    }
    updateAllCellsDisplay();
    disableControls();
    celebrate();

    setTimeout(showResultModal, 900);
}

function gameOver(explodedRow, explodedCol) {
    gameEnded = true;
    isWon = false;
    stopTimer();

    finalResult = { time: elapsedTime, won: false, earlyDeath: moveCount <= EARLY_DEATH_MOVE_LIMIT };
    markTodayCompleted();

    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            if (board[row][col].isMine) board[row][col].revealed = true;
        }
    }
    updateAllCellsDisplay();

    const explodedEl = document.querySelector(`.deminoo-cell[data-row="${explodedRow}"][data-col="${explodedCol}"]`);
    if (explodedEl) explodedEl.classList.add('exploded');

    disableControls();

    setTimeout(showResultModal, 600);
}

function disableControls() {
    document.getElementById('flag-toggle-btn').disabled = true;
    document.getElementById('reset-btn').disabled = true;
}

function resetGame() {
    if (gameEnded) return;
    if (!confirm('Recommencer la grille du jour depuis le début ?')) return;
    restartDeminoo();
}

// Relance la grille du jour (même mines, même disposition) — comptabilisée
// normalement au classement, comme une première tentative.
function restartDeminoo() {
    closeResultModal();
    initializeGame();
    showMessage('🔄 Nouvelle tentative sur la grille du jour !', 'info');
}

// ---------- Rendu ----------

function updateAllCellsDisplay() {
    for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
            updateCellDisplay(row, col);
        }
    }
}

function updateCellDisplay(row, col) {
    const el = document.querySelector(`.deminoo-cell[data-row="${row}"][data-col="${col}"]`);
    if (!el) return;
    const cell = board[row][col];

    el.classList.remove('revealed', 'flagged', 'mine', 'n1', 'n2', 'n3', 'n4', 'n5', 'n6', 'n7', 'n8');
    el.textContent = '';

    if (cell.flagged && !cell.revealed) {
        el.classList.add('flagged');
        el.textContent = '🚩';
        return;
    }

    if (!cell.revealed) return;

    el.classList.add('revealed');

    if (cell.isMine) {
        el.classList.add('mine');
        el.textContent = '💣';
    } else if (cell.adjacent > 0) {
        el.classList.add(`n${cell.adjacent}`);
        el.textContent = cell.adjacent;
    }
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
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = '🎉 <strong>Vous avez déjà joué à Deminoo aujourd’hui !</strong><br>Revenez demain pour une nouvelle grille ! 💣';
    messageEl.className = 'message success';
    messageEl.style.display = 'block';

    document.querySelector('.deminoo-grid').style.display = 'none';
    document.querySelectorAll('.controls').forEach(c => c.style.display = 'none');
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
    const titleEl = document.getElementById('deminoo-result-title');
    const textEl = document.getElementById('deminoo-result-text');

    if (finalResult.won) {
        titleEl.textContent = '🎉 Grille déminée !';
        titleEl.className = 'perfect';
        textEl.textContent = `Bravo, vous avez déminé la grille en ${formatTime(finalResult.time)} !`;
    } else {
        titleEl.textContent = '💥 Boom !';
        titleEl.className = 'lost';
        textEl.textContent = finalResult.earlyDeath
            ? `Vous êtes tombé sur une mine dès le ${moveCount}${moveCount === 1 ? 'er' : 'ème'} coup — pas de chance ! Vous pouvez rejouer cette grille.`
            : 'Vous êtes tombé sur une mine.';
    }

    document.getElementById('result-time').textContent = finalResult.won ? formatTime(finalResult.time) : '💥';

    const earlyReplayBtn = document.getElementById('replay-early-deminoo-btn');
    earlyReplayBtn.style.display = (!finalResult.won && finalResult.earlyDeath) ? 'block' : 'none';

    const modal = document.getElementById('deminoo-result-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.getElementById('deminoo-player-name').focus();
}

function closeResultModal() {
    const modal = document.getElementById('deminoo-result-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('deminoo-player-name').value = '';
}

async function submitDeminooScore() {
    const submitBtn = document.getElementById('submit-deminoo-score-btn');
    if (submitBtn.disabled) return;

    const rawName = document.getElementById('deminoo-player-name').value;
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
            time: finalResult.won ? finalResult.time : 999999,
            lost: !finalResult.won,
            difficulty: 'deminoo',
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        await database.ref(`scores/${today}/deminoo`).push(scoreData);

        closeResultModal();
        showMessage('🎉 Score enregistré avec succès !', 'success');

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
        const snapshot = await database.ref(`scores/${today}/deminoo`).once('value');

        const scores = [];
        snapshot.forEach((child) => { scores.push({ id: child.key, ...child.val() }); });

        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="loading">Aucun score enregistré pour Deminoo aujourd\'hui</div>';
            return;
        }

        scores.sort((a, b) => {
            if (a.lost && !b.lost) return 1;
            if (!a.lost && b.lost) return -1;
            return (a.time || 0) - (b.time || 0);
        });

        leaderboardList.innerHTML = '';
        let winnerRank = 0;
        scores.forEach((score) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';

            const date = new Date(score.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            let rankDisplay, timeDisplay;

            if (score.lost) {
                rankDisplay = '-';
                timeDisplay = '<span class="lost-text">💥 Perdu</span>';
            } else {
                winnerRank++;
                const medal = winnerRank === 1 ? '🥇' : winnerRank === 2 ? '🥈' : winnerRank === 3 ? '🥉' : '';
                if (winnerRank <= 3) item.classList.add('top-3');
                rankDisplay = `${medal} ${winnerRank}`;
                timeDisplay = formatTime(score.time);
            }

            item.innerHTML = `
                <div class="rank-col">${rankDisplay}</div>
                <div class="name-col">${escapeHtml(score.name)}</div>
                <div class="time-col">${timeDisplay}</div>
                <div class="date-col">${date}</div>
            `;

            leaderboardList.appendChild(item);
        });

        if (gameEnded && finalResult && finalResult.won) {
            const userPosition = scores.filter(s => !s.lost).findIndex(s => s.time >= finalResult.time) + 1;
            const totalPlayers = scores.length;
            if (userPosition > 0) {
                const percentile = Math.round((1 - (userPosition / totalPlayers)) * 100);
                userRankDiv.innerHTML = `
                    🎯 Vous êtes le/la ${userPosition}${userPosition === 1 ? 'er' : 'ème'} plus rapide !<br>
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
