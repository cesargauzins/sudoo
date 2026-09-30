// Menu principal — classement consultable pour les 3 jeux sans y entrer.

let database = null;
let currentGame = 'sudoku';
let currentSudokuDifficulty = 'simple';

document.addEventListener('DOMContentLoaded', () => {
    initializeFirebase();
    document.getElementById('leaderboard-modal').style.display = 'none';
    setupEventListeners();
});

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

function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

function setupEventListeners() {
    document.getElementById('view-leaderboard-btn').addEventListener('click', openLeaderboard);
    document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);

    document.querySelectorAll('#game-tabs .leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentGame = tab.dataset.game;
            document.querySelectorAll('#game-tabs .leaderboard-tab').forEach(t => {
                t.classList.toggle('active', t === tab);
            });
            loadLeaderboard();
        });
    });

    document.querySelectorAll('#sudoku-sub-tabs .leaderboard-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            currentSudokuDifficulty = tab.dataset.difficulty;
            document.querySelectorAll('#sudoku-sub-tabs .leaderboard-tab').forEach(t => {
                t.classList.toggle('active', t === tab);
            });
            loadLeaderboard();
        });
    });

    window.addEventListener('click', (e) => {
        const modal = document.getElementById('leaderboard-modal');
        if (e.target === modal) closeLeaderboard();
    });
}

function openLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
    loadLeaderboard();
}

function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Ne vide jamais la liste avant d'avoir les nouvelles données : on garde l'ancien
// contenu affiché (léger fondu) pendant le chargement, puis on remplace en une seule
// fois, pour éviter le clignotement disparition/réapparition en changeant d'onglet.
async function loadLeaderboard() {
    const listEl = document.getElementById('leaderboard-list');
    const subTabs = document.getElementById('sudoku-sub-tabs');
    const resultLabel = document.getElementById('leaderboard-result-label');
    const requestId = ++loadLeaderboard.requestId;

    subTabs.style.display = currentGame === 'sudoku' ? 'flex' : 'none';
    resultLabel.textContent = currentGame === 'mathoo' ? 'Résultat' : (currentGame === 'lettro' ? 'Score' : 'Temps');

    listEl.classList.add('loading-fade');

    if (!database) {
        if (requestId !== loadLeaderboard.requestId) return;
        listEl.innerHTML = '<div class="loading">⚠️ Le classement nécessite la configuration de Firebase.</div>';
        listEl.classList.remove('loading-fade');
        return;
    }

    const path = currentGame === 'sudoku' ? currentSudokuDifficulty : currentGame;

    try {
        const today = getTodayKey();
        const snapshot = await database.ref(`scores/${today}/${path}`).once('value');
        const scores = [];
        snapshot.forEach((child) => { scores.push({ id: child.key, ...child.val() }); });

        // Si l'utilisateur a re-changé d'onglet entre-temps, on ignore cette réponse
        // devenue obsolète pour ne pas écraser l'onglet actuellement affiché.
        if (requestId !== loadLeaderboard.requestId) return;

        if (scores.length === 0) {
            listEl.innerHTML = '<div class="loading">Aucun score enregistré ici aujourd\'hui</div>';
            listEl.classList.remove('loading-fade');
            return;
        }

        if (currentGame === 'lettro') {
            renderLettroScores(scores, listEl);
        } else if (currentGame === 'mathoo') {
            renderMathooScores(scores, listEl);
        } else {
            // 'sudoku' et 'deminoo' partagent le même format (temps + perdu)
            renderSudokuScores(scores, listEl);
        }
        listEl.classList.remove('loading-fade');
    } catch (error) {
        console.error('Erreur lors du chargement du classement:', error);
        if (requestId !== loadLeaderboard.requestId) return;
        listEl.innerHTML = '<div class="loading">Erreur lors du chargement du classement</div>';
        listEl.classList.remove('loading-fade');
    }
}
loadLeaderboard.requestId = 0;

function renderSudokuScores(scores, listEl) {
    scores.sort((a, b) => {
        if (a.lost && !b.lost) return 1;
        if (!a.lost && b.lost) return -1;
        return (a.time || 0) - (b.time || 0);
    });

    listEl.innerHTML = '';
    let winnerRank = 0;
    scores.forEach((score) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';

        const date = new Date(score.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
        let rankDisplay, timeDisplay;

        if (score.lost) {
            rankDisplay = '-';
            timeDisplay = '<span class="lost-text">Perdu</span>';
        } else {
            winnerRank++;
            const medal = winnerRank === 1 ? '🥇' : winnerRank === 2 ? '🥈' : winnerRank === 3 ? '🥉' : '';
            if (winnerRank <= 3) item.classList.add('top-3');
            rankDisplay = `${medal} ${winnerRank}`;
            const minutes = Math.floor(score.time / 60).toString().padStart(2, '0');
            const seconds = (score.time % 60).toString().padStart(2, '0');
            timeDisplay = `${minutes}:${seconds}`;
        }

        item.innerHTML = `
            <div class="rank-col">${rankDisplay}</div>
            <div class="name-col">${escapeHtml(score.name)}</div>
            <div class="time-col">${timeDisplay}</div>
            <div class="date-col">${date}</div>
        `;
        listEl.appendChild(item);
    });
}

function renderLettroScores(scores, listEl) {
    scores.sort((a, b) => {
        if ((b.score || 0) !== (a.score || 0)) return (b.score || 0) - (a.score || 0);
        return (b.wordCount || 0) - (a.wordCount || 0);
    });

    listEl.innerHTML = '';
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
        listEl.appendChild(item);
    });
}

function renderMathooScores(scores, listEl) {
    scores.sort((a, b) => {
        if ((a.distance || 0) !== (b.distance || 0)) return (a.distance || 0) - (b.distance || 0);
        return (a.time || 0) - (b.time || 0);
    });

    listEl.innerHTML = '';
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
        listEl.appendChild(item);
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
