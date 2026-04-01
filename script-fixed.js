// Variables globales
let currentGrid = [];
let solutionGrid = [];
let notesGrid = [];
let selectedCell = null;
let timerInterval = null;
let startTime = null;
let elapsedTime = 0;
let hintsUsed = 0;
let errorsCount = 0;
let notesMode = false;
let history = [];
let historyIndex = -1;
let gameCompleted = false;
let originalGrid = [];
let finalTime = 0;
let database = null;
let livesRemaining = 3;
let currentDifficulty = 'simple'; // 'simple' ou 'difficile'
let isPaused = false;

// Configuration des niveaux de difficulté
const DIFFICULTY_LEVELS = {
    simple: { cellsToRemove: 43, label: 'Simple' },
    difficile: { cellsToRemove: 54, label: 'Difficile' }
};

// Détection navigateur
const isChrome = /Chrome/.test(navigator.userAgent) && !/Edg/.test(navigator.userAgent);
const isEdge = /Edg/.test(navigator.userAgent);
const isFirefox = /Firefox/.test(navigator.userAgent);

if (isChrome) {
    document.body.classList.add('chrome-browser');
}
if (isEdge || isFirefox) {
    document.body.classList.add('edge-firefox-browser');
}

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentDate();
    initializeFirebase();
    
    // Initialiser les modals (s'assurer qu'ils sont cachés)
    document.getElementById('name-modal').style.display = 'none';
    document.getElementById('leaderboard-modal').style.display = 'none';
    document.getElementById('gameover-modal').style.display = 'none';
    document.getElementById('seeYouTomorrow-modal').style.display = 'none';
    document.getElementById('countdown-modal').style.display = 'none';
    
    // Charger le niveau sauvegardé ou démarrer en simple
    const savedDifficulty = localStorage.getItem('current-difficulty');
    if (savedDifficulty && (savedDifficulty === 'simple' || savedDifficulty === 'difficile')) {
        currentDifficulty = savedDifficulty;
    }
    
    updateDifficultyButtons();
    
    // Vérifier si les deux niveaux sont terminés
    if (areBothLevelsCompleted()) {
        blockAllPuzzles();
    } else if (isTodayPuzzleCompleted(currentDifficulty)) {
        blockCurrentPuzzle();
    } else {
        initializeGame();
    }
    
    setupEventListeners();
});

// Afficher la date actuelle
function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('fr-FR', options);
    document.getElementById('current-date').textContent = dateStr;
}

// Initialiser Firebase
function initializeFirebase() {
    try {
        // La configuration sera chargée depuis firebase-config.js
        if (typeof initFirebase === 'function') {
            database = initFirebase();
            if (database) {
                console.log('Firebase initialisé avec succès');
            } else {
                console.log('Firebase non configuré - Mode hors ligne');
            }
        }
    } catch (error) {
        console.warn('Firebase non disponible:', error);
        database = null;
    }
}

// Générateur de nombre pseudo-aléatoire basé sur une seed (la date)
function seededRandom(seed) {
    let x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
}

// Obtenir la seed du jour
function getTodaysSeed() {
    const today = new Date();
    const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
    return seed;
}

// Obtenir la clé du jour pour localStorage
function getTodayKey() {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

// Vérifier si le puzzle du jour est déjà terminé pour un niveau spécifique
function isTodayPuzzleCompleted(difficulty = currentDifficulty) {
    const todayKey = getTodayKey();
    const completedDate = localStorage.getItem(`sudoku-completed-${difficulty}-${todayKey}`);
    return completedDate === 'true';
}

// Marquer le puzzle du jour comme terminé pour un niveau spécifique
function markTodayPuzzleCompleted(difficulty = currentDifficulty) {
    const todayKey = getTodayKey();
    localStorage.setItem(`sudoku-completed-${difficulty}-${todayKey}`, 'true');
}

// Vérifier si les deux niveaux sont terminés
function areBothLevelsCompleted() {
    return isTodayPuzzleCompleted('simple') && isTodayPuzzleCompleted('difficile');
}

// Bloquer tous les puzzles si les deux niveaux sont terminés
function blockAllPuzzles() {
    const messageEl = document.getElementById('message');
    messageEl.innerHTML = '🎉 <strong>Bravo ! Vous avez terminé les deux niveaux aujourd’hui !</strong><br>Revenez demain pour de nouveaux défis ! 🚀';
    messageEl.className = 'message success';
    messageEl.style.display = 'block';
    
    // Masquer tous les contrôles de jeu
    document.querySelector('.sudoku-grid').style.display = 'none';
    document.querySelector('.number-pad').style.display = 'none';
    document.querySelectorAll('.controls').forEach(el => el.style.display = 'none');
    document.querySelector('.difficulty-selector').style.display = 'none';
}

// Bloquer le niveau actuel mais permettre de changer de niveau
function blockCurrentPuzzle() {
    const messageEl = document.getElementById('message');
    const levelName = DIFFICULTY_LEVELS[currentDifficulty].label;
    messageEl.innerHTML = `🎉 <strong>Vous avez déjà terminé le niveau ${levelName} aujourd’hui !</strong><br>Essayez l'autre niveau ! 👆`;
    messageEl.className = 'message success';
    messageEl.style.display = 'block';
    
    // Masquer les contrôles de jeu mais garder le sélecteur de niveau
    document.querySelector('.sudoku-grid').style.display = 'none';
    document.querySelector('.number-pad').style.display = 'none';
    document.querySelectorAll('.controls').forEach(el => el.style.display = 'none');
}

// Bloquer le jeu si déjà terminé (ancienne fonction, maintenant redirigée)
function blockCompletedPuzzle() {
    if (areBothLevelsCompleted()) {
        blockAllPuzzles();
    } else {
        blockCurrentPuzzle();
    }
}

// Générer un sudoku complet valide
function generateCompleteSudoku(seed) {
    const grid = Array(9).fill(null).map(() => Array(9).fill(0));
    
    function isValid(grid, row, col, num) {
        // Vérifier la ligne
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }
        
        // Vérifier la colonne
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }
        
        // Vérifier le bloc 3x3
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }
        
        return true;
    }
    
    function fillGrid(grid, seed) {
        let randIndex = 0;
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    
                    for (let i = numbers.length - 1; i > 0; i--) {
                        const j = Math.floor(seededRandom(seed + randIndex++) * (i + 1));
                        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
                    }
                    
                    for (let num of numbers) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            
                            if (fillGrid(grid, seed)) {
                                return true;
                            }
                            
                            grid[row][col] = 0;
                        }
                    }
                    return false;
                }
            }
        }
        return true;
    }
    
    fillGrid(grid, seed);
    return grid;
}

// Compter le nombre de solutions d'un puzzle (max 2 pour optimiser)
function countSolutions(grid) {
    let count = 0;
    
    function isValid(grid, row, col, num) {
        // Vérifier la ligne
        for (let x = 0; x < 9; x++) {
            if (grid[row][x] === num) return false;
        }
        
        // Vérifier la colonne
        for (let x = 0; x < 9; x++) {
            if (grid[x][col] === num) return false;
        }
        
        // Vérifier le bloc 3x3
        let startRow = row - row % 3;
        let startCol = col - col % 3;
        for (let i = 0; i < 3; i++) {
            for (let j = 0; j < 3; j++) {
                if (grid[i + startRow][j + startCol] === num) return false;
            }
        }
        return true;
    }
    
    function solve(grid) {
        if (count > 1) return; // Optimisation : arrêter si plus d'une solution trouvée
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (grid[row][col] === 0) {
                    for (let num = 1; num <= 9; num++) {
                        if (isValid(grid, row, col, num)) {
                            grid[row][col] = num;
                            solve(grid);
                            grid[row][col] = 0;
                        }
                    }
                    return;
                }
            }
        }
        count++;
    }
    
    const gridCopy = grid.map(row => [...row]);
    solve(gridCopy);
    return count;
}

// Créer une grille de jeu en enlevant des cases
function createPuzzle(completeGrid, seed, difficulty = 40) {
    const puzzle = completeGrid.map(row => [...row]);
    let cellsToRemove = difficulty;
    let attempts = 0;
    const maxAttempts = 500;
    
    while (cellsToRemove > 0 && attempts < maxAttempts) {
        const row = Math.floor(seededRandom(seed + attempts) * 9);
        const col = Math.floor(seededRandom(seed + attempts + 1000) * 9);
        
        if (puzzle[row][col] !== 0) {
            const backup = puzzle[row][col];
            puzzle[row][col] = 0;
            
            // Vérifier qu'il n'y a qu'une solution unique
            if (countSolutions(puzzle) === 1) {
                cellsToRemove--;
            } else {
                // Remettre la valeur si plusieurs solutions
                puzzle[row][col] = backup;
            }
        }
        attempts++;
    }
    
    return puzzle;
}

// Initialiser le jeu
function initializeGame() {
    const seed = getTodaysSeed();
    // Utiliser une seed différente pour chaque niveau
    const levelSeed = seed + (currentDifficulty === 'difficile' ? 10000 : 0);
    const cellsToRemove = DIFFICULTY_LEVELS[currentDifficulty].cellsToRemove;
    
    solutionGrid = generateCompleteSudoku(levelSeed);
    originalGrid = createPuzzle(solutionGrid, levelSeed, cellsToRemove);
    currentGrid = originalGrid.map(row => [...row]);
    notesGrid = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
    history = [];
    historyIndex = -1;
    errorsCount = 0;
    gameCompleted = false;
    livesRemaining = 3;
    
    // Afficher les contrôles de jeu
    const gridElement = document.querySelector('.sudoku-grid');
    gridElement.style.display = 'grid';
    gridElement.classList.remove('paused');
    document.querySelector('.number-pad').style.display = 'grid';
    document.querySelectorAll('.controls').forEach(el => el.style.display = 'flex');
    
    updateLivesDisplay();
    saveState();
    renderGrid();
    updateProgress();
    updateNumberButtons();
    
    const levelName = DIFFICULTY_LEVELS[currentDifficulty].label;
    showMessage(`Niveau ${levelName} - Bonne chance ! 🍀`, 'info');
    
    // Lancer le compte à rebours de 3 secondes avant de démarrer le timer
    showCountdown();
}

// Afficher le compte à rebours de 3 secondes
function showCountdown() {
    const modal = document.getElementById('countdown-modal');
    const numberElement = document.getElementById('countdown-number');
    const countdownText = modal.querySelector('.countdown-text');
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    // Réinitialiser
    numberElement.style.fontSize = '';
    numberElement.textContent = '3';
    countdownText.style.display = '';
    
    let count = 3;
    
    const triggerAnimation = () => {
        numberElement.style.animation = 'none';
        void numberElement.offsetWidth; // force reflow
        numberElement.style.animation = 'countdownScale 0.9s cubic-bezier(0.34, 1.56, 0.64, 1)';
    };
    
    triggerAnimation();
    
    const countdownInterval = setInterval(() => {
        count--;
        if (count > 0) {
            numberElement.textContent = count;
            triggerAnimation();
        } else {
            numberElement.textContent = 'GO !';
            numberElement.style.fontSize = '4.5em';
            countdownText.style.display = 'none';
            triggerAnimation();
            
            setTimeout(() => {
                modal.style.display = 'none';
                modal.classList.remove('show');
                startTimer();
            }, 900);
            
            clearInterval(countdownInterval);
        }
    }, 1000);
}

// Afficher la grille
function renderGrid() {
    const gridElement = document.getElementById('sudoku-grid');
    gridElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;
            
            const value = currentGrid[row][col];
            if (value !== 0) {
                cell.textContent = value;
                if (isOriginalCell(row, col)) {
                    cell.classList.add('fixed');
                } else {
                    cell.classList.add('user-input');
                }
            } else if (notesGrid[row][col].size > 0) {
                renderNotes(cell, row, col);
            }
            
            cell.addEventListener('click', () => selectCell(cell));
            gridElement.appendChild(cell);
        }
    }
    
    validateRealTime();
}

// Rendre les notes dans une cellule
function renderNotes(cell, row, col) {
    cell.classList.add('notes-active');
    cell.innerHTML = '';
    
    for (let num = 1; num <= 9; num++) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'note-number';
        if (notesGrid[row][col].has(num)) {
            noteDiv.textContent = num;
        }
        cell.appendChild(noteDiv);
    }
}

// Vérifier si c'est une cellule originale
function isOriginalCell(row, col) {
    return originalGrid[row][col] !== 0;
}

// Sélectionner une cellule
function selectCell(cell) {
    if (isPaused) return;
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    cell.classList.add('selected');
    
    highlightRegions();
    highlightSameNumbers();
}

// Mettre en évidence la ligne, colonne et bloc de la cellule sélectionnée
function highlightRegions() {
    // Retirer toutes les classes de région
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('same-region');
    });
    
    if (!selectedCell) return;
    
    const selectedRow = parseInt(selectedCell.dataset.row);
    const selectedCol = parseInt(selectedCell.dataset.col);
    const selectedBlockRow = Math.floor(selectedRow / 3);
    const selectedBlockCol = Math.floor(selectedCol / 3);
    
    // Mettre en évidence toutes les cellules de la même ligne, colonne ou bloc
    document.querySelectorAll('.cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const blockRow = Math.floor(row / 3);
        const blockCol = Math.floor(col / 3);
        
        // Ne pas mettre en évidence la cellule sélectionnée elle-même
        if (row === selectedRow && col === selectedCol) return;
        
        // Vérifier si la cellule est dans la même ligne, colonne ou bloc 3x3
        if (row === selectedRow || col === selectedCol || 
            (blockRow === selectedBlockRow && blockCol === selectedBlockCol)) {
            cell.classList.add('same-region');
        }
    });
}

// Mettre en évidence les cases avec le même numéro
function highlightSameNumbers() {
    // Retirer toutes les classes same-number et same-number-note
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('same-number');
    });
    document.querySelectorAll('.note-number').forEach(note => {
        note.classList.remove('same-number-note');
    });
    
    if (!selectedCell) return;
    
    const selectedRow = parseInt(selectedCell.dataset.row);
    const selectedCol = parseInt(selectedCell.dataset.col);
    const selectedNum = currentGrid[selectedRow][selectedCol];
    
    // Si la case sélectionnée est vide, ne rien faire
    if (selectedNum === 0) return;
    
    // Mettre en évidence toutes les cellules avec le même numéro
    document.querySelectorAll('.cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        const num = currentGrid[row][col];
        
        // Ne pas mettre en évidence la cellule sélectionnée elle-même
        if (row === selectedRow && col === selectedCol) return;
        
        if (num === selectedNum) {
            cell.classList.add('same-number');
        } else {
            // Vérifier si la cellule contient des notes avec ce numéro
            if (notesGrid[row][col].has(selectedNum)) {
                // Mettre en évidence la note spécifique
                const noteElements = cell.querySelectorAll('.note-number');
                noteElements.forEach((noteEl, index) => {
                    if (index + 1 === selectedNum && noteEl.textContent) {
                        noteEl.classList.add('same-number-note');
                    }
                });
            }
        }
    });
}

// Effacer les notes dans la ligne, colonne et carré 3x3 quand on place un chiffre
function removeNotesInRelatedCells(row, col, num) {
    // Effacer dans la ligne
    for (let c = 0; c < 9; c++) {
        if (c !== col) {
            notesGrid[row][c].delete(num);
        }
    }
    
    // Effacer dans la colonne
    for (let r = 0; r < 9; r++) {
        if (r !== row) {
            notesGrid[r][col].delete(num);
        }
    }
    
    // Effacer dans le carré 3x3
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if (r !== row || c !== col) {
                notesGrid[r][c].delete(num);
            }
        }
    }
}

// Mettre à jour visuellement les cellules contenant des notes
function updateNoteCellsDisplay() {
    document.querySelectorAll('.cell').forEach(cell => {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // Si la cellule est vide et contient des notes, la mettre à jour
        if (currentGrid[row][col] === 0 && notesGrid[row][col].size > 0) {
            renderNotes(cell, row, col);
        } else if (currentGrid[row][col] === 0 && notesGrid[row][col].size === 0 && cell.classList.contains('notes-active')) {
            // Si la cellule n'a plus de notes, nettoyer l'affichage
            cell.classList.remove('notes-active');
            cell.innerHTML = '';
        }
    });
}

// Changer le niveau de difficulté
function changeDifficulty(newDifficulty) {
    if (newDifficulty === currentDifficulty) return;
    
    // Sauvegarder le choix
    currentDifficulty = newDifficulty;
    localStorage.setItem('current-difficulty', currentDifficulty);
    
    // Arrêter le timer actuel et réinitialiser le temps
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    elapsedTime = 0;
    
    // Mettre à jour les boutons
    updateDifficultyButtons();
    
    // Vérifier si ce niveau est déjà terminé
    if (isTodayPuzzleCompleted(currentDifficulty)) {
        blockCurrentPuzzle();
    } else {
        // Réinitialiser et démarrer le nouveau niveau
        document.getElementById('message').style.display = 'none';
        initializeGame();
    }
}

// Mettre à jour l'apparence des boutons de difficulté
function updateDifficultyButtons() {
    const simpleBtn = document.getElementById('difficulty-simple');
    const difficileBtn = document.getElementById('difficulty-difficile');
    
    if (!simpleBtn || !difficileBtn) return;
    
    // Retirer la classe active des deux
    simpleBtn.classList.remove('active');
    difficileBtn.classList.remove('active');
    
    // Ajouter la classe active au bouton actuel
    if (currentDifficulty === 'simple') {
        simpleBtn.classList.add('active');
    } else {
        difficileBtn.classList.add('active');
    }
    
    // Désactiver les boutons des niveaux déjà terminés
    if (isTodayPuzzleCompleted('simple')) {
        simpleBtn.classList.add('completed');
        simpleBtn.innerHTML = '✓ Simple';
    } else {
        simpleBtn.classList.remove('completed');
        simpleBtn.innerHTML = 'Simple';
    }
    
    if (isTodayPuzzleCompleted('difficile')) {
        difficileBtn.classList.add('completed');
        difficileBtn.innerHTML = '✓ Difficile';
    } else {
        difficileBtn.classList.remove('completed');
        difficileBtn.innerHTML = 'Difficile';
    }
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Boutons de changement de difficulté
    document.getElementById('difficulty-simple')?.addEventListener('click', () => changeDifficulty('simple'));
    document.getElementById('difficulty-difficile')?.addEventListener('click', () => changeDifficulty('difficile'));
    
    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        
        const key = e.key;
        
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
            navigateCell(key);
            return;
        }
        
        if (key === ' ') {
            e.preventDefault();
            toggleNotesMode();
            return;
        }
        
        if (key >= '1' && key <= '9') {
            placeNumber(parseInt(key));
        } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
            placeNumber(0);
        }
    });
    
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('notes-btn').addEventListener('click', toggleNotesMode);
    document.getElementById('pause-btn').addEventListener('click', togglePause);
    // document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('share-btn').addEventListener('click', shareScore);
    
    // Événements pour le clavier numérique
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const num = parseInt(btn.dataset.number);
            placeNumber(num);
        });
    });
    
    document.querySelector('.erase-btn').addEventListener('click', () => {
        placeNumber(0);
    });
    
    // Événements pour les modales
    document.getElementById('view-leaderboard-btn').addEventListener('click', () => showLeaderboard('simple'));
    document.getElementById('submit-score-btn').addEventListener('click', submitScore);
    document.getElementById('skip-score-btn').addEventListener('click', closeNameModal);
    document.getElementById('close-leaderboard').addEventListener('click', closeLeaderboard);
    document.getElementById('view-solution-btn').addEventListener('click', showSolution);
    document.getElementById('view-final-leaderboard-btn').addEventListener('click', () => {
        closeSeeYouTomorrowModal();
        showLeaderboard();
    });
    
    // Fermer les modales en cliquant à l'extérieur
    window.addEventListener('click', (e) => {
        const nameModal = document.getElementById('name-modal');
        const leaderboardModal = document.getElementById('leaderboard-modal');
        const gameoverModal = document.getElementById('gameover-modal');
        if (e.target === nameModal) {
            closeNameModal();
        }
        if (e.target === leaderboardModal) {
            closeLeaderboard();
        }
        if (e.target === gameoverModal) {
            // Ne pas permettre de fermer la modale game over
        }
        // Ne pas permettre de fermer la modale "À demain" en cliquant à l'extérieur
    });
}

// Placer un nombre dans la cellule sélectionnée
function placeNumber(num) {
    if (!selectedCell) return;
    if (isPaused) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    
    if (isOriginalCell(row, col)) return;
    if (gameCompleted) return;
    
    saveState();
    
    if (notesMode && num !== 0) {
        if (notesGrid[row][col].has(num)) {
            notesGrid[row][col].delete(num);
        } else {
            notesGrid[row][col].add(num);
        }
        renderNotes(selectedCell, row, col);
    } else {
        if (num === 0) {
            currentGrid[row][col] = 0;
            notesGrid[row][col].clear();
            selectedCell.textContent = '';
            selectedCell.classList.remove('user-input', 'error', 'correct', 'notes-active');
        } else {
            // Vérifier si le nombre placé est correct
            const isCorrect = (num === solutionGrid[row][col]);
            
            if (!isCorrect) {
                // Si incorrect, afficher temporairement le chiffre avec animation d'erreur
                selectedCell.textContent = num;
                selectedCell.classList.add('user-input', 'error');
                
                livesRemaining--;
                updateLivesDisplay();
                
                // Après l'animation, effacer le chiffre
                setTimeout(() => {
                    selectedCell.classList.remove('error', 'user-input');
                    selectedCell.textContent = '';
                    currentGrid[row][col] = 0;
                }, 500);
                
                // Vérifier si le joueur a perdu
                if (livesRemaining <= 0) {
                    gameOver();
                    return;
                }
            } else {
                // Si correct, garder le chiffre
                currentGrid[row][col] = num;
                notesGrid[row][col].clear();
                
                // Effacer automatiquement les notes correspondantes dans les cellules liées
                removeNotesInRelatedCells(row, col, num);
                
                // Re-rendre la grille complète pour afficher tous les changements
                renderGrid();
                
                // Re-sélectionner la cellule après le re-rendu
                const cells = document.querySelectorAll('.cell');
                selectedCell = cells[row * 9 + col];
                if (selectedCell) {
                    selectedCell.classList.add('selected');
                }
            }
        }
    }
    
    updateProgress();
    updateNumberButtons();
    validateRealTime();
    highlightSameNumbers();
    checkCompletion();
}

// Navigation au clavier
function navigateCell(direction) {
    if (!selectedCell) return;
    if (isPaused) return;
    
    let row = parseInt(selectedCell.dataset.row);
    let col = parseInt(selectedCell.dataset.col);
    
    switch(direction) {
        case 'ArrowUp': row = Math.max(0, row - 1); break;
        case 'ArrowDown': row = Math.min(8, row + 1); break;
        case 'ArrowLeft': col = Math.max(0, col - 1); break;
        case 'ArrowRight': col = Math.min(8, col + 1); break;
    }
    
    const newCell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    if (newCell) selectCell(newCell);
}

// Basculer le mode notes
function toggleNotesMode() {
    if (isPaused) return;
    notesMode = !notesMode;
    const btn = document.getElementById('notes-btn');
    const grid = document.getElementById('sudoku-grid');
    
    btn.classList.toggle('active', notesMode);
    
    if (notesMode) {
        grid.classList.add('notes-mode');
    } else {
        grid.classList.remove('notes-mode');
    }
}

// Basculer la pause
function togglePause() {
    if (gameCompleted) return;
    
    isPaused = !isPaused;
    const btn = document.getElementById('pause-btn');
    const grid = document.getElementById('sudoku-grid');
    
    if (isPaused) {
        // Mettre en pause
        stopTimer();
        grid.classList.add('paused');
        btn.innerHTML = '▶️ Reprendre';
        btn.classList.add('active');
    } else {
        // Reprendre
        startTimer();
        grid.classList.remove('paused');
        btn.innerHTML = '⏸️ Pause';
        btn.classList.remove('active');
    }
}

// Validation en temps réel - désactivée pour ne pas donner d'indices
function validateRealTime() {
    // Ne fait plus rien - le joueur doit découvrir ses erreurs lui-même
}

// Vérifier les conflits
function hasConflict(row, col, num) {
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentGrid[row][c] === num) return true;
    }
    
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentGrid[r][col] === num) return true;
    }
    
    const startRow = Math.floor(row / 3) * 3;
    const startCol = Math.floor(col / 3) * 3;
    for (let r = startRow; r < startRow + 3; r++) {
        for (let c = startCol; c < startCol + 3; c++) {
            if ((r !== row || c !== col) && currentGrid[r][c] === num) return true;
        }
    }
    
    return false;
}

// Mettre en évidence les chiffres identiques
// Sauvegarder l'état pour undo/redo
function saveState() {
    if (historyIndex < history.length - 1) {
        history = history.slice(0, historyIndex + 1);
    }
    
    history.push({
        grid: currentGrid.map(row => [...row]),
        notes: notesGrid.map(row => row.map(set => new Set(set)))
    });
    
    historyIndex++;
}

// Annuler
function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const state = history[historyIndex];
        currentGrid = state.grid.map(row => [...row]);
        notesGrid = state.notes.map(row => row.map(set => new Set(set)));
        renderGrid();
        updateProgress();
        updateNumberButtons();
    }
}

// Refaire
function redo() {
    if (historyIndex < history.length - 1) {
        historyIndex++;
        const state = history[historyIndex];
        currentGrid = state.grid.map(row => [...row]);
        notesGrid = state.notes.map(row => row.map(set => new Set(set)));
        renderGrid();
        updateProgress();
        updateNumberButtons();
    }
}

// Mettre à jour les boutons undo/redo
function updateUndoRedoButtons() {
    // Boutons supprimés - fonction conservée pour compatibilité
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = historyIndex <= 0;
    if (redoBtn) redoBtn.disabled = historyIndex >= history.length - 1;
}

// Mettre à jour la progression
function updateProgress() {
    // Barre de progression supprimée
}

// Fonction toggleTheme désactivée (bouton thème supprimé)
/*
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-btn').textContent = isDark ? 'Clair' : 'Sombre';
}
*/

// Vérifier la solution
// Donner un indice
function giveHint() {
    const emptyCells = [];
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentGrid[row][col] === 0) {
                emptyCells.push({ row, col });
            }
        }
    }
    
    if (emptyCells.length === 0) {
        showMessage('La grille est déjà complète !', 'info');
        return;
    }
    
    // Bloquer l'indice s'il ne reste qu'une seule case vide
    if (emptyCells.length === 1) {
        showMessage('⛔ Impossible d\'utiliser un indice : il ne reste qu\'une case !', 'error');
        return;
    }
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = randomCell;
    
    saveState();
    currentGrid[row][col] = solutionGrid[row][col];
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = solutionGrid[row][col];
    cell.classList.add('correct', 'user-input');
    
    hintsUsed++;
    
    // Ajouter pénalité au chronomètre (1 minute pour difficile, 30 secondes pour simple)
    const penaltyTime = currentDifficulty === 'difficile' ? 60000 : 30000; // 60s ou 30s en millisecondes
    const penaltySeconds = currentDifficulty === 'difficile' ? 60 : 30;
    if (startTime) {
        startTime -= penaltyTime;
    }
    
    // Animation rouge sur le timer
    const timerElement = document.getElementById('timer');
    timerElement.classList.add('penalty-flash');
    setTimeout(() => {
        timerElement.classList.remove('penalty-flash');
    }, 1000);
    
    updateProgress();
    updateNumberButtons();
    showMessage(`Indice donné ! (+${penaltySeconds}s de pénalité, ${hintsUsed} utilisés)`, 'info');
}

// Réinitialiser le jeu
function resetGame() {
    if (confirm('Êtes-vous sûr de vouloir recommencer ?')) {
        stopTimer();
        elapsedTime = 0;
        hintsUsed = 0;
        isPaused = false;
        const pauseBtn = document.getElementById('pause-btn');
        if (pauseBtn) {
            pauseBtn.innerHTML = '⏸️ Pause';
            pauseBtn.classList.remove('active');
        }
        document.getElementById('share-btn').style.display = 'none';
        initializeGame();
    }
}

// Chronomètre
function startTimer() {
    // Reprendre depuis le temps écoulé précédent
    startTime = Date.now() - (elapsedTime * 1000);
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    elapsedTime = elapsed;
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function stopTimer() {
    if (timerInterval) {
        // Sauvegarder le temps écoulé avant d'arrêter
        if (startTime) {
            elapsedTime = Math.floor((Date.now() - startTime) / 1000);
        }
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Mettre à jour l'affichage des vies
function updateLivesDisplay() {
    const livesElement = document.getElementById('lives');
    if (livesElement) {
        livesElement.textContent = livesRemaining;
        
        // Changer la couleur en fonction du nombre de vies
        if (livesRemaining === 3) {
            livesElement.style.color = '#ef5350';
        } else if (livesRemaining === 2) {
            livesElement.style.color = '#ff9800';
        } else if (livesRemaining === 1) {
            livesElement.style.color = '#d32f2f';
        } else {
            livesElement.style.color = '#b71c1c';
        }
    }
}

// Mettre à jour l'état des boutons de chiffres
function updateNumberButtons() {
    // Compter combien de fois chaque chiffre apparaît dans la grille
    const numberCounts = Array(10).fill(0);
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const num = currentGrid[row][col];
            if (num !== 0) {
                numberCounts[num]++;
            }
        }
    }
    
    // Désactiver les boutons si 9 instances sont placées
    document.querySelectorAll('.number-btn').forEach(btn => {
        const num = parseInt(btn.dataset.number);
        if (numberCounts[num] >= 9) {
            btn.disabled = true;
        } else {
            btn.disabled = false;
        }
    });
}

// Vérifier si la grille est complète
function checkCompletion() {
    let isComplete = true;
    let isCorrect = true;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentGrid[row][col] === 0) {
                isComplete = false;
                break;
            }
            if (currentGrid[row][col] !== solutionGrid[row][col]) {
                isCorrect = false;
            }
        }
        if (!isComplete) break;
    }
    
    // Si la grille est complète et correcte, le joueur a gagné
    if (isComplete && isCorrect) {
        gameCompleted = true;
        stopTimer();
        finalTime = Math.floor((Date.now() - startTime) / 1000);
        
        // Marquer le puzzle comme terminé
        markTodayPuzzleCompleted();
        
        // Désactiver tous les contrôles
        document.querySelectorAll('.number-btn, .erase-btn').forEach(btn => {
            btn.disabled = true;
        });
        const notesBtn = document.getElementById('notes-btn');
        const resetBtn = document.getElementById('reset-btn');
        const pauseBtn = document.getElementById('pause-btn');
        if (notesBtn) notesBtn.disabled = true;
        if (resetBtn) resetBtn.disabled = true;
        if (pauseBtn) pauseBtn.disabled = true;
        
        celebrateWin();
        setTimeout(() => {
            showNameModal();
        }, 1500);
    } else if (isComplete && !isCorrect) {
        // La grille est complète mais incorrecte - Game Over
        gameOver();
    }
}

// Game Over - le joueur a perdu toutes ses vies
function gameOver() {
    gameCompleted = true;
    stopTimer();
    
    // Marquer le puzzle comme perdu (impossible de le refaire)
    markTodayPuzzleCompleted();
    
    // Désactiver tous les contrôles
    document.querySelectorAll('.number-btn, .erase-btn').forEach(btn => {
        btn.disabled = true;
    });
    
    // Désactiver aussi les autres boutons
    const notesBtn = document.getElementById('notes-btn');
    const resetBtn = document.getElementById('reset-btn');
    const pauseBtn = document.getElementById('pause-btn');
    if (notesBtn) notesBtn.disabled = true;
    if (resetBtn) resetBtn.disabled = true;
    if (pauseBtn) pauseBtn.disabled = true;
    
    // Afficher la modale Game Over
    const modal = document.getElementById('gameover-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
}

// Afficher la solution
function showSolution() {
    // Remplir la grille avec la solution
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (!isOriginalCell(row, col)) {
                currentGrid[row][col] = solutionGrid[row][col];
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell) {
                    cell.textContent = solutionGrid[row][col];
                    cell.classList.add('user-input');
                    cell.classList.remove('error');
                }
            }
        }
    }
    
    // Fermer la modale
    const modal = document.getElementById('gameover-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}

// Afficher un message
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {
        messageEl.className = 'message';
        messageEl.textContent = '';
    }, 3000);
}

// Célébration de victoire
function celebrateWin() {
    const grid = document.getElementById('sudoku-grid');
    grid.style.animation = 'celebrate 1s ease-in-out';
    
    for (let i = 0; i < 50; i++) {
        setTimeout(() => {
            createConfetti();
        }, i * 50);
    }
    
    setTimeout(() => {
        grid.style.animation = '';
    }, 1000);
}

// Créer un confetti
function createConfetti() {
    const confetti = document.createElement('div');
    confetti.className = 'confetti';
    confetti.style.left = Math.random() * 100 + '%';
    confetti.style.background = ['#667eea', '#764ba2', '#ffa726', '#66bb6a', '#ef5350'][Math.floor(Math.random() * 5)];
    confetti.style.animationDuration = (Math.random() * 2 + 2) + 's';
    document.body.appendChild(confetti);
    
    setTimeout(() => confetti.remove(), 5000);
}

// Partager le score
function shareScore() {
    const time = document.getElementById('timer').textContent;
    const today = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    
    const text = `🎯 Sudoku du ${today}\n⏱️ Temps: ${time}\n💡 Indices: ${hintsUsed}\n❌ Erreurs: ${errorsCount}\n\n✅ Résolu avec succès !`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Mon score Sudoku',
            text: text
        }).catch(() => {
            copyToClipboard(text);
        });
    } else {
        copyToClipboard(text);
    }
}

// Copier dans le presse-papier
function copyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showMessage('📋 Score copié dans le presse-papier !', 'success');
}

// Afficher le modal de saisie du nom
function showNameModal() {
    // S'assurer que le modal de classement est complètement fermé
    const leaderboardModal = document.getElementById('leaderboard-modal');
    leaderboardModal.classList.remove('show');
    leaderboardModal.style.display = 'none';
    
    const modal = document.getElementById('name-modal');
    const finalTimeDisplay = document.getElementById('final-time');
    const minutes = Math.floor(finalTime / 60).toString().padStart(2, '0');
    const seconds = (finalTime % 60).toString().padStart(2, '0');
    finalTimeDisplay.textContent = `${minutes}:${seconds}`;
    modal.style.display = 'flex';
    modal.classList.add('show');
    document.getElementById('player-name').focus();
}

// Fermer le modal de saisie du nom
function closeNameModal() {
    const modal = document.getElementById('name-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    document.getElementById('player-name').value = '';
    
    // Afficher la modale "À demain"
    showSeeYouTomorrowModal();
}

// Soumettre le score
async function submitScore() {
    const rawName = document.getElementById('player-name').value;
    const playerName = sanitizeName(rawName);
    
    if (!playerName || playerName.length < 2) {
        showMessage('Veuillez entrer un nom valide (2-10 caractères) !', 'error');
        return;
    }
    
    if (!database) {
        showMessage('⚠️ Configurez Firebase pour activer le classement (voir README.md)', 'info');
        closeNameModal();
        return;
    }
    
    try {
        const today = getTodayKey();
        const scoreData = {
            name: playerName,
            time: finalTime,
            hints: hintsUsed,
            errors: errorsCount,
            difficulty: currentDifficulty,
            date: new Date().toISOString(),
            timestamp: Date.now()
        };
        
        // Sauvegarder le score dans Firebase avec le niveau
        await database.ref(`scores/${today}/${currentDifficulty}`).push(scoreData);
        
        closeNameModal();
        showMessage('🎉 Score enregistré avec succès !', 'success');
        
        // Afficher la modale "À demain" au lieu du classement
        setTimeout(() => {
            showSeeYouTomorrowModal();
        }, 400);
        
    } catch (error) {
        console.error('Erreur lors de l\'enregistrement:', error);
        showMessage('Erreur lors de l\'enregistrement du score', 'error');
    }
}

// Afficher le classement
async function showLeaderboard(selectedDifficulty = 'simple') {
    // S'assurer que le modal de nom est complètement fermé
    const nameModal = document.getElementById('name-modal');
    nameModal.classList.remove('show');
    nameModal.style.display = 'none';
    
    const modal = document.getElementById('leaderboard-modal');
    const leaderboardList = document.getElementById('leaderboard-list');
    const userRankDiv = document.getElementById('user-rank');
    
    modal.style.display = 'flex';
    modal.classList.add('show');
    
    leaderboardList.innerHTML = '<div class="loading">Chargement du classement...</div>';
    userRankDiv.innerHTML = '';
    
    // Créer les onglets de difficulté
    const tabsHtml = `
        <div class="leaderboard-tabs">
            <button class="leaderboard-tab ${selectedDifficulty === 'simple' ? 'active' : ''}" data-difficulty="simple">
                📊 Simple
            </button>
            <button class="leaderboard-tab ${selectedDifficulty === 'difficile' ? 'active' : ''}" data-difficulty="difficile">
                🏆 Difficile
            </button>
        </div>
    `;
    
    // Insérer les onglets avant la liste (si pas déjà fait)
    if (!document.querySelector('.leaderboard-tabs')) {
        leaderboardList.insertAdjacentHTML('beforebegin', tabsHtml);
        
        // Ajouter les événements sur les onglets
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const difficulty = tab.dataset.difficulty;
                showLeaderboard(difficulty);
            });
        });
    } else {
        // Mettre à jour l'onglet actif
        document.querySelectorAll('.leaderboard-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.difficulty === selectedDifficulty);
        });
    }
    
    if (!database) {
        leaderboardList.innerHTML = '<div class="loading">⚠️ Le classement nécessite la configuration de Firebase.<br><br>Consultez le README.md pour les instructions.</div>';
        return;
    }
    
    try {
        const today = getTodayKey();
        const snapshot = await database.ref(`scores/${today}/${selectedDifficulty}`).orderByChild('time').once('value');
        
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            scores.push({
                id: childSnapshot.key,
                ...childSnapshot.val()
            });
        });
        
        if (scores.length === 0) {
            const levelName = DIFFICULTY_LEVELS[selectedDifficulty].label;
            leaderboardList.innerHTML = `<div class="loading">Aucun score enregistré pour le niveau ${levelName} aujourd'hui</div>`;
            return;
        }
        
        // Trier par temps (déjà trié par Firebase, mais on s'assure)
        scores.sort((a, b) => a.time - b.time);
        
        // Construire le HTML du classement
        leaderboardList.innerHTML = '';
        scores.forEach((score, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            
            if (index < 3) {
                item.classList.add('top-3');
            }
            
            const rank = index + 1;
            const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '';
            const minutes = Math.floor(score.time / 60).toString().padStart(2, '0');
            const seconds = (score.time % 60).toString().padStart(2, '0');
            const date = new Date(score.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
            
            item.innerHTML = `
                <div class="rank-col">${medal} ${rank}</div>
                <div class="name-col">${escapeHtml(score.name)}</div>
                <div class="time-col">${minutes}:${seconds}</div>
                <div class="date-col">${date}</div>
            `;
            
            leaderboardList.appendChild(item);
        });
        
        // Afficher le rang de l'utilisateur s'il a joué
        if (gameCompleted && finalTime > 0) {
            const userPosition = scores.findIndex(s => s.time >= finalTime) + 1;
            const totalPlayers = scores.length;
            const percentile = Math.round((1 - (userPosition / totalPlayers)) * 100);
            
            userRankDiv.innerHTML = `
                🎯 Vous êtes le/la ${userPosition}${getOrdinalSuffix(userPosition)} plus rapide !<br>
                Vous êtes dans le top ${100 - percentile}% des joueurs (${totalPlayers} joueurs aujourd'hui)
            `;
        }
        
    } catch (error) {
        console.error('Erreur lors du chargement du classement:', error);
        leaderboardList.innerHTML = '<div class="loading">Erreur lors du chargement du classement</div>';
    }
}

// Fermer le modal du classement
function closeLeaderboard() {
    const modal = document.getElementById('leaderboard-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
    // Supprimer les onglets pour qu'ils soient recréés proprement à la prochaine ouverture
    const tabs = document.querySelector('.leaderboard-tabs');
    if (tabs) tabs.remove();
}

// Obtenir le suffixe ordinal (er, ème)
function getOrdinalSuffix(num) {
    if (num === 1) return 'er';
    return 'ème';
}

// Nettoyer et valider le nom du joueur
function sanitizeName(name) {
    // Supprimer les espaces au début et à la fin
    name = name.trim();
    
    // Limiter à 10 caractères
    name = name.substring(0, 10);
    
    // Supprimer les caractères dangereux (garde seulement lettres, chiffres, espaces, tirets, apostrophes)
    name = name.replace(/[^a-zA-Z0-9àâäéèêëïîôùûüÿæœçÀÂÄÉÈÊËÏÎÔÙÛÜŸÆŒÇ\s'-]/g, '');
    
    // Supprimer les espaces multiples
    name = name.replace(/\s+/g, ' ');
    
    return name;
}

// Échapper le HTML pour éviter les injections XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Afficher la modale "À demain"
function showSeeYouTomorrowModal() {
    // S'assurer que toutes les autres modales sont fermées
    const nameModal = document.getElementById('name-modal');
    nameModal.classList.remove('show');
    nameModal.style.display = 'none';
    
    const leaderboardModal = document.getElementById('leaderboard-modal');
    leaderboardModal.classList.remove('show');
    leaderboardModal.style.display = 'none';
    
    // Afficher la modale "À demain"
    const modal = document.getElementById('seeYouTomorrow-modal');
    modal.style.display = 'flex';
    modal.classList.add('show');
}

// Fermer la modale "À demain"
function closeSeeYouTomorrowModal() {
    const modal = document.getElementById('seeYouTomorrow-modal');
    modal.classList.remove('show');
    modal.style.display = 'none';
}
