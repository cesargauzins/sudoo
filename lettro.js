// Lettro — grille de 9 lettres, 3 minutes, un maximum de mots français.

const ROUND_DURATION = 180; // secondes

let database = null;
let grid = [];                 // 9 lettres de la grille du jour
let letterCounts = {};         // occurrences de chaque lettre dans la grille
let foundWords = [];           // [{ word, points }]
let foundWordSet = new Set();  // mots déjà trouvés (normalisés)
let score = 0;
let timeRemaining = ROUND_DURATION;
let timerInterval = null;
let startTime = null;
let gameActive = false;
let gameEnded = false;

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();

    document.getElementById('lettro-result-modal').style.display = 'none';
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

// Incrémenter cette valeur change la grille générée pour toutes les dates
// (y compris aujourd'hui) sans toucher au reste de la logique.
const SEED_SALT = 1;

function getTodaysSeed() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate() + 77777;
    return seed + SEED_SALT * 999983; // grand nombre premier pour bien mélanger la seed
}

function isTodayCompleted() {
    return localStorage.getItem(`lettro-completed-${getTodayKey()}`) === 'true';
}

function markTodayCompleted() {
    localStorage.setItem(`lettro-completed-${getTodayKey()}`, 'true');
}

// ---------- Génération de la grille du jour ----------

function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}

// Pool de lettres pondéré selon la fréquence approximative en français
const LETTER_POOL = (
    'E'.repeat(15) + 'A'.repeat(9) + 'I'.repeat(8) + 'S'.repeat(8) + 'N'.repeat(7) +
    'T'.repeat(7) + 'R'.repeat(7) + 'U'.repeat(6) + 'L'.repeat(6) + 'O'.repeat(6) +
    'D'.repeat(4) + 'C'.repeat(3) + 'P'.repeat(3) + 'M'.repeat(3) + 'V'.repeat(2) +
    'Q' + 'F' + 'B' + 'G' + 'H' + 'J' + 'X' + 'Y' + 'Z' + 'K' + 'W'
).split('');

const VOWELS = new Set(['A', 'E', 'I', 'O', 'U', 'Y']);

function generateDailyGrid(seed) {
    const letters = [];
    for (let i = 0; i < 9; i++) {
        const idx = Math.floor(seededRandom(seed + i) * LETTER_POOL.length);
        letters.push(LETTER_POOL[idx]);
    }

    // Filet de sécurité : garantir au moins 3 voyelles pour que la grille soit jouable
    const vowelPool = ['A', 'E', 'I', 'O', 'U'];
    let vowelCount = letters.filter(l => VOWELS.has(l)).length;
    let attempt = 0;
    while (vowelCount < 3 && attempt < 30) {
        const replaceIdx = Math.floor(seededRandom(seed + 200 + attempt) * 9);
        if (!VOWELS.has(letters[replaceIdx])) {
            const vowelIdx = Math.floor(seededRandom(seed + 300 + attempt) * vowelPool.length);
            letters[replaceIdx] = vowelPool[vowelIdx];
            vowelCount++;
        }
        attempt++;
    }

    return letters;
}

function computeLetterCounts(letters) {
    const counts = {};
    letters.forEach(l => {
        counts[l] = (counts[l] || 0) + 1;
    });
    return counts;
}

// ---------- Initialisation / animation d'intro ----------

function initializeGame() {
    grid = generateDailyGrid(getTodaysSeed());
    letterCounts = computeLetterCounts(grid);

    foundWords = [];
    foundWordSet = new Set();
    score = 0;
    timeRemaining = ROUND_DURATION;
    gameActive = false;
    gameEnded = false;

    updateWordCountDisplay();
    updateScoreDisplay();
    document.getElementById('found-words').innerHTML = '';
    document.getElementById('timer').textContent = formatTime(ROUND_DURATION);

    renderGridCells();
    playIntroAnimation();
}

function renderGridCells() {
    const gridEl = document.getElementById('lettro-grid');
    gridEl.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'lettro-cell spinning';
        cell.dataset.index = i;
        cell.textContent = randomDisplayLetter();
        gridEl.appendChild(cell);
    }
}

function randomDisplayLetter() {
    return String.fromCharCode(65 + Math.floor(Math.random() * 26));
}

// Anime chaque case : lettres aléatoires rapides puis ralentissement progressif
// jusqu'à se figer sur la lettre finale de la grille du jour (effet "machine à sous").
function playIntroAnimation() {
    const cells = document.querySelectorAll('.lettro-cell');
    let lockedCount = 0;

    cells.forEach((cell, i) => {
        const totalDuration = 1300 + i * 180;
        const cellStart = performance.now();

        function tick() {
            const elapsed = performance.now() - cellStart;

            if (elapsed >= totalDuration) {
                cell.textContent = grid[i];
                cell.classList.remove('spinning');
                cell.classList.add('locked');
                lockedCount++;
                if (lockedCount === cells.length) {
                    onIntroAnimationComplete();
                }
                return;
            }

            cell.textContent = randomDisplayLetter();
            const progress = elapsed / totalDuration;
            const delay = 40 + progress * progress * 260; // accélère le ralentissement vers la fin
            setTimeout(tick, delay);
        }

        tick();
    });
}

function onIntroAnimationComplete() {
    const flash = document.getElementById('go-flash');
    flash.classList.add('show');
    setTimeout(() => flash.classList.remove('show'), 800);

    startRound();
}

// ---------- Déroulement de la partie ----------

function startRound() {
    gameActive = true;
    startTime = Date.now();

    const input = document.getElementById('word-input');
    input.disabled = false;
    input.value = '';
    input.focus();

    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    timeRemaining = Math.max(0, ROUND_DURATION - elapsed);
    document.getElementById('timer').textContent = formatTime(timeRemaining);

    if (timeRemaining <= 0) {
        endRound();
    }
}

function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
}

function endRound() {
    gameActive = false;
    gameEnded = true;
    clearInterval(timerInterval);
    timerInterval = null;

    const input = document.getElementById('word-input');
    input.disabled = true;
    document.getElementById('submit-word-btn').disabled = true;

    markTodayCompleted();

    if (score > 0) celebrate();

    setTimeout(showResultModal, 900);
}

// ---------- Validation des mots ----------

function setupEventListeners() {
    document.getElementById('submit-word-btn').addEventListener('click', submitWord);
    document.getElementById('word-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitWord();
        }
    });

    document.getElementById('view-leaderboard-btn').addEventListener('click', showLeaderboard);
    document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('submit-lettro-score-btn').addEventListener('click', submitLettroScore);
    document.getElementById('skip-lettro-score-btn').addEventListener('click', closeResultModal);
    document.getElementById('lettro-player-name').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') submitLettroScore();
    });

    window.addEventListener('click', (e) => {
        const leaderboardModal = document.getElementById('leaderboard-modal');
        if (e.target === leaderboardModal) closeLeaderboard();
    });
}

function submitWord() {
    if (!gameActive || gameEnded) return;

    const input = document.getElementById('word-input');
    const raw = input.value;
    input.value = '';

    const normalized = normalizeFrenchWord(raw);

    if (normalized.length < 2) {
        rejectWord('Mot trop court');
        return;
    }

    if (foundWordSet.has(normalized)) {
        rejectWord('Déjà trouvé !');
        return;
    }

    if (!canFormFromGrid(normalized)) {
        rejectWord('Lettres non disponibles dans la grille');
        return;
    }

    if (!FRENCH_WORDS_SET.has(normalized)) {
        rejectWord('Mot inconnu');
        return;
    }

    acceptWord(normalized);
}

function canFormFromGrid(word) {
    const needed = {};
    for (const ch of word.toUpperCase()) {
        needed[ch] = (needed[ch] || 0) + 1;
    }
    for (const ch in needed) {
        if ((letterCounts[ch] || 0) < needed[ch]) return false;
    }
    return true;
}

function rejectWord(reason) {
    showMessage(`❌ ${reason}`, 'error');
    const input = document.getElementById('word-input');
    input.classList.add('invalid');
    setTimeout(() => input.classList.remove('invalid'), 350);
}

function acceptWord(normalized) {
    const points = normalized.length;
    foundWords.push({ word: normalized, points });
    foundWordSet.add(normalized);
    score += points;

    updateWordCountDisplay();
    updateScoreDisplay();
    addWordChip(normalized, points);
    flashUsedCells(normalized);
    showMessage(`✓ ${normalized.toUpperCase()} (+${points})`, 'success');
}

function flashUsedCells(word) {
    const cells = Array.from(document.querySelectorAll('.lettro-cell'));
    const usedIndices = new Set();
    for (const ch of word.toUpperCase()) {
        const cellIndex = cells.findIndex((cell, idx) =>
            !usedIndices.has(idx) && cell.textContent === ch);
        if (cellIndex !== -1) {
            usedIndices.add(cellIndex);
            cells[cellIndex].classList.add('used');
        }
    }
    setTimeout(() => {
        usedIndices.forEach(idx => cells[idx].classList.remove('used'));
    }, 400);
}

function addWordChip(word, points) {
    const container = document.getElementById('found-words');
    const chip = document.createElement('span');
    chip.className = 'lettro-word-chip';
    chip.innerHTML = `${word.toUpperCase()} <span class="chip-points">+${points}</span>`;
    container.appendChild(chip);
    container.scrollTop = container.scrollHeight;
}

function updateWordCountDisplay() {
    document.getElementById('word-count').textContent = foundWords.length;
}

function updateScoreDisplay() {
    document.getElementById('score-count').textContent = score;
}

function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    setTimeout(() => {
        messageEl.className = 'message';
        messageEl.textContent = '';
    }, 2000);
}

// ---------- Blocage (une partie par jour) ----------

function blockGame() {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = '🎉 <strong>Vous avez déjà joué à Lettro aujourd’hui !</strong><br>Revenez demain pour une nouvelle grille ! 🔤';
    messageEl.className = 'message success';
    messageEl.style.display = 'block';

    document.querySelector('.lettro-grid').style.display = 'none';
    document.querySelector('.lettro-input-row').style.display = 'none';
    document.getElementById('found-words').style.display = 'none';
    document.getElementById('go-flash').style.display = 'none';
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
    document.getElementById('result-word-count').textContent = foundWords.length;
    document.getElementById('result-score').textContent = score;

    const wordsList = document.getElementById('result-words-list');
    wordsList.innerHTML = '';
    foundWords
        .slice()
        .sort((a, b) => b.points - a.points)
        .forEach(({ word, points }) => {
            const chip = document.createElement('span');
            chip.className = 'lettro-word-chip';
            chip.innerHTML = `${word.toUpperCase()} <span class="chip-points">+${points}</span>`;
            wordsList.appendChild(chip);
        });

    const modal = document.getElementById('lettro-result-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.getElementById('lettro-player-name').focus();
}

function closeResultModal() {
    const modal = document.getElementById('lettro-result-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('lettro-player-name').value = '';
}

async function submitLettroScore() {
    const rawName = document.getElementById('lettro-player-name').value;
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

    try {
        const today = getTodayKey();
        const scoreData = {
            name: playerName,
            time: 0, // non pertinent pour Lettro, conservé pour la validation Firebase
            difficulty: 'lettro',
            score: score,
            wordCount: foundWords.length,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };

        await database.ref(`scores/${today}/lettro`).push(scoreData);

        closeResultModal();
        showMessage('🎉 Score enregistré avec succès !', 'success');

    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement du score', 'error');
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
        const snapshot = await database.ref(`scores/${today}/lettro`).once('value');

        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push({ id: childSnapshot.key, ...childSnapshot.val() });
        });

        if (scores.length === 0) {
            leaderboardList.innerHTML = '<div class="loading">Aucun score enregistré pour Lettro aujourd\'hui</div>';
            return;
        }

        scores.sort((a, b) => {
            if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
            return (b.wordCount || 0) - (a.wordCount || 0);
        });

        leaderboardList.innerHTML = '';
        scores.forEach((s, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';

            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            if (rank <= 3) item.classList.add('top-3');

            const date = new Date(s.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });

            item.innerHTML = `
                <div class="rank-col">${medal} ${rank}</div>
                <div class="name-col">${escapeHtml(s.name)}</div>
                <div class="time-col">⭐ ${s.score || 0} · 📝 ${s.wordCount || 0}</div>
                <div class="date-col">${date}</div>
            `;

            leaderboardList.appendChild(item);
        });

        if (gameEnded) {
            const userPosition = scores.findIndex(s => (s.score || 0) <= score) + 1;
            const totalPlayers = scores.length;
            if (userPosition > 0) {
                const percentile = Math.round((1 - (userPosition / totalPlayers)) * 100);
                userRankDiv.innerHTML = `
                    🎯 Vous êtes ${userPosition}${userPosition === 1 ? 'er' : 'ème'} avec ${score} points !<br>
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
