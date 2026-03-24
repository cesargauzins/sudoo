// Variables globales
let currentGrid = [];
let solutionGrid = [];
let notesGrid = []; // Grille pour les notes
let selectedCell = null;
let timerInterval = null;
let startTime = null;
let hintsUsed = 0;
let errorsCount = 0;
let notesMode = false;
let history = [];
let historyIndex = -1;
let gameCompleted = false;

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    displayCurrentDate();
    initializeGame();
    setupEventListeners();
});

// Afficher la date actuelle
function displayCurrentDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    const dateStr = now.toLocaleDateString('fr-FR', options);
    document.getElementById('current-date').textContent = dateStr;
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
                    // Créer un tableau de nombres 1-9 mélangé
                    let numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9];
                    
                    // Mélanger le tableau avec notre générateur seeded
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

// Créer une grille de jeu en enlevant des cases
function createPuzzle(completeGrid, seed, difficulty = 40) {
    const puzzle = completeGrid.map(row => [...row]);
    let cellsToRemove = difficulty;
    let attempts = 0;
    
    while (cellsToRemove > 0 && attempts < 100) {
        const row = Math.floor(seededRandom(seed + attempts) * 9);
        const col = Math.floor(seededRandom(seed + attempts + 1000) * 9);
        
        if (puzzle[row][col] !== 0) {
            puzzle[row][col] = 0;
            cellsToRemove--;
        }
        attempts++;
    }
    
    return puzzle;
}

// Initialiser le jeu
function initializeGame() {
    const seed = getTodaysSeed();
    solutionGrid = generateCompleteSudoku(seed);
    currentGrid = createPuzzle(solutionGrid, seed, 40);
    notesGrid = Array(9).fill(null).map(() => Array(9).fill(null).map(() => new Set()));
    history = [];
    historyIndex = -1;
    errorsCount = 0;
    gameCompleted = false;
    
    saveState();
    renderGrid();
    updateProgress();
    startTimer();
    showMessage('Bonne chance ! 🍀', 'info');
}

// Afficher la grille
function renderGrid() {
    const gridElement = document.getElementById('sudoku-grid');
    gridElement.innerHTML = '';
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cellif (isOriginalCell(row, col)) {
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
function renderNotes(cell, row, col) { && isOriginalCell(
        parseInt(cell.dataset.row), 
        parseInt(cell.dataset.col)
    )) return;
    
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    cell.classList.add('selected');
    
    // Mettre en évidence les chiffres identiques
    highlightSimilarNumbers(as(num)) {
            noteDiv.textContent = num;
        }
        cell.appendChild(noteDiv);
    }
}

// Vérifier si c'est une cellule originale
function isOriginalCell(row, col) {
    const seed = getTodaysSeed();
    const originalGrid = createPuzzle(generateCompleteSudoku(seed), seed, 40);
    return originalGrid[row][col] !== 0;           cell.textContent = value;
                cell.classList.add('fixed');
            }
            
            cell.addEventListener('click', () => selectCell(cell));
            gridElement.appendChild(cell);
        }
    }
}

// Sélectionner une cellule
function selectCell(cell) {
    if (cell.classList.contains('fixed')) return;
    
    if (selectedCell) {
        selectedCell.classList.remove('selected');
    }
    
    selectedCell = cell;
    cell.classList.add('selected');
}

// Configurer les écouteurs d'événements
function setupEventListeners() {
    // Pavé numérique
    document.querySelectorAll('.number-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            placeNumber(num);
        });
    });
    
    // Clavier
    document.addEventListener('keydown', (e) => {
        if (!selectedCell) return;
        
        const key = e.key;
        const row = parseInt(selectedCell.dataset.row);
        const col = parseInt(selectedCell.dataset.col);
        
        // Navigation avec flèches
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(key)) {
            e.preventDefault();
            navigateCell(key);
            return;
        }
        
        // Mode notes avec Espace
        if (key === ' ') {
            e.preventDefault();
            toggleNotesMode();
            return;
        }
        
        // Placer un nombre
        if (key >= '1' && key <= '9') {
            placeNumber(parseInt(key));
        } else if (key === 'Backspace' || key === 'Delete' || key === '0') {
            placeNumber(0);
        }
    });
    
    // Boutons
    document.getElementById('check-btn').addEventListener('click', checkSolution);
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
    document.getElementById('notes-btn').addEventListener('click', toggleNotesMode);
    document.getElementById('undo-btn').addEventListener('click', undo);
    document.getElementById('redo-btn').addEventListener('click', redo);
    document.getElementById('theme-btn').addEventListener('click', toggleTheme);
    document.getElementById('share-btn').addEventListener('click', shareScore);
}

// Placer un nombre dans la cellule sélectionnée
function placeNumber(num) {
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    if (gameCompleted) return;
    
    let correct = true;
    let complete = true;
    let newErrors = 0;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentGrid[row][col] === 0) {
                complete = false;
            } else if (currentGrid[row][col] !== solutionGrid[row][col]) {
                correct = false;
                newErrors++;
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell && !isOriginalCell(row, col)) {
                    cell.classList.add('error');
                    setTimeout(() => cell.classList.remove('error'), 2000);
                }
            }
        }
    }
    
    errorsCount += newErrors;
    document.getElementById('errors').textContent = errorsCount;
    
    if (complete && correct) {
        gameCompleted = true;
        stopTimer();
        showMessage('🎉 Félicitations ! Vous avez résolu le sudoku du jour !', 'success');
        document.getElementById('share-btn').style.display = 'block';
        celebrateWin();
    } else if (!complete) {
        showMessage('La grille n\'est pas encore complète !', 'info');
    } else {
        showMessage(`${newErrors} erreur(s) détectée(s). Continuez !`orrect', 'notes-active');
        }
    }
    
    updateProgress();
    validateRealTime();
    highlightSimilarNumbers();
}

// Navigation au clavier
function navigateCell(direction) {
    if (!selectedCell) return;
    
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
    notesMode = !notesMode;
    const btn = document.getElementById('notes-btn');
    btn.classList.toggle('active', notesMode);
    showMessage(notesMode ? '✏️ Mode notes activé' : '📝 Mode normal', 'info');
}

// Validation en temps réel
function validateRealTime() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('conflict');
    });
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            const num = currentGrid[row][col];
            if (num === 0) continue;
            
            if (hasConflict(row, col, num)) {
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell && !isOriginalCell(row, col)) {
                    cell.classList.add('conflict');
                }
            }
        }
    }
}

// Vérifier les conflits
function hasConflict(row, col, num) {
    // Vérifier la ligne
    for (let c = 0; c < 9; c++) {
        if (c !== col && currentGrid[row][c] === num) return true;
    }
    
    // Vérifier la colonne
    for (let r = 0; r < 9; r++) {
        if (r !== row && currentGrid[r][col] === num) return true;
    }
    
    // Vérifier le bloc 3x3
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
function highlightSimilarNumbers() {
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('highlighted');
    });
    
    if (!selectedCell) return;
    
    const row = parseInt(selectedCell.dataset.row);
    const col = parseInt(selectedCell.dataset.col);
    const num = currentGrid[row][col];
    
    if (num === 0) return;
    
    document.querySelectorAll('.cell').forEach(cell => {
        const r = parseInt(cell.dataset.row);
        const c = parseInt(cell.dataset.col);
        if (currentGrid[r][c] === num && (r !== row || c !== col)) {
            cell.classList.add('highlighted');
        }
    });
}

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
    updateUndoRedoButtons();
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
        updateUndoRedoButtons();
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
        updateUndoRedoButtons();
    }
}

// Mettre à jour les boutons undo/redo
function updateUndoRedoButtons() {
    document.getElementById('undo-btn').disabled = historyIndex <= 0;
    document.getElementById('redo-btn').disabled = historyIndex >= history.length - 1;
}

// Mettre à jour la progression
function updateProgress() {
    let filled = 0;
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentGrid[row][col] !== 0) filled++;
        }
    }
    
    const percentage = Math.round((filled / 81) * 100);
    document.getElementById('progress-bar').style.width = percentage + '%';
    document.getElementById('progress-text').textContent = percentage + '%';
}

// Basculer le thème
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('theme-btn').textContent = isDark ? '☀️' : '🌙'
    });
    
    // Boutons
    document.getElementById('check-btn').addEventListener('click', checkSolution);
    document.getElementById('hint-btn').addEventListener('click', giveHint);
    document.getElementById('reset-btn').addEventListener('click', resetGame);
}

// Vérifier la solution
function checkSolution() {
    let correct = true;
    let complete = true;
    
    for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
            if (currentGrid[row][col] === 0) {
                complete = false;
            } else if (currentGrid[row][col] !== solutionGrid[row][col]) {
                correct = false;
                const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
                if (cell && !cell.classList.contains('fixed')) {
                    cell.classList.add('error');
                    setTimeout(() => cell.classList.remove('error'), 2000);
                }
            }
        }
    }
    
    if (complete && correct) {
        stopTimer();
        showMessage('🎉 Félicitations ! Vous avez résolu le sudoku du jour !', 'success');
        celebrateWin();
    } else if (!complete) {
        showMessage('La grille n\'est pas encore complète !', 'info');
    } else {
        showMessage('Il y a des erreurs. Continuez !', 'error');
    }
}

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
    
    const randomCell = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const { row, col } = randomCell;
    
    currentGrid[row][col] = solutionGrid[row][col];
    const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
    cell.textContent = solutionGrid[row][col];
    cell.classList.add('correct', 'user-input');
    
    hintsUsed++;
    showMessage(`Indice donné ! (${hintsUsed} utilisés)`, 'info');
}

// Réinitialiser le jeu
function resetGame() {
    if (confirm('Êtes-vous sûr de vouloir recommencer ?')) {
        stopTimer();
        hintsUsed = 0;
        initializeGame();
    }
}

// Chronomètre
function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
    const seconds = (elapsed % 60).toString().padStart(2, '0');
    document.getElementById('timer').textContent = `${minutes}:${seconds}`;
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

// Afficher un message
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    
    setTimeout(() => {celebrate 1s ease-in-out';
    
    // Créer des confettis
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
    
    const text = `🎯 Sudoku du ${today}\\n⏱️ Temps: ${time}\\n💡 Indices: ${hintsUsed}\\n❌ Erreurs: ${errorsCount}\\n\\n✅ Résolu avec succès !`;
    
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
    showMessage('📋 Score copié dans le presse-papier !', 'success'

// Célébration de victoire
function celebrateWin() {
    const grid = document.getElementById('sudoku-grid');
    grid.style.animation = 'pulse 0.5s ease-in-out';
    
    setTimeout(() => {
        grid.style.animation = '';
    }, 500);
}
