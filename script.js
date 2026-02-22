// ---------- CONSTANTS ----------
const HOUSE_COLORS = {
    'Gryffindor': '#740001',
    'Slytherin': '#1A472A',
    'Ravenclaw': '#0E2150',
    'Hufflepuff': '#ECB939'
};
const CHARACTERS = {
    'harry': { skin: '#F0E68C', hair: '#000000', glasses: true },
    'hermione': { skin: '#F0D0A0', hair: '#8B4513', glasses: false },
    'ron': { skin: '#F0D0A0', hair: '#D2691E', glasses: false }
};
const MAX_LEVEL = 8;
const LEVEL_GRID_SIZE = [0, 4, 5, 6, 7, 8, 9, 10, 11];
const LEVEL_OBSTACLES = [0, 2, 4, 6, 8, 10, 12, 14, 16];
const LEVEL_BOMBS = [0, 0, 0, 2, 3, 4, 5, 6, 7];
const LEVEL_TIME = [0, 60, 55, 50, 45, 40, 35, 30, 25];

const CELL_OBSTACLE = -1;
const CELL_BOMB = -2;

// ---------- INTRO VIDEO ----------
window.addEventListener('load', function() {
    const introScreen = document.getElementById('introScreen');
    const homeScreen = document.getElementById('homeScreen');
    const mainTitle = document.getElementById('mainTitle');
    const video = document.getElementById('introVideo');
    const skipBtn = document.getElementById('skipIntroBtn');

    function showHome() {
        introScreen.style.display = 'none';
        mainTitle.style.display = 'block';
        homeScreen.style.display = 'block';
    }

    video.addEventListener('ended', showHome);
    skipBtn.addEventListener('click', function() {
        video.pause();
        showHome();
    });

    // Attempt to play (autoplay is set, but browsers may block)
    video.play().catch(e => console.log("Autoplay prevented, user must click skip or wait"));
});

// ---------- GLOBAL ----------
let currentHouse = 'Gryffindor';
let currentChar = 'harry';
let grid = [];
let optimalPath = [];
let optimalScore = 0;
let playerPos = { r: 0, c: 0 };
let playerScore = 0;
let totalScore = 0;
let currentLevel = 1;
let gameActive = false;
let timeRemaining = 0;
let timerInterval = null;
let canvas = document.getElementById('gameCanvas');
let ctx = canvas.getContext('2d');
let scores = JSON.parse(localStorage.getItem('gridScoresZ')) || 
    { 'Gryffindor': 0, 'Slytherin': 0, 'Ravenclaw': 0, 'Hufflepuff': 0 };
let audioCtx = null;

// Check first time
if (!localStorage.getItem('tutorialShown')) {
    document.getElementById('tutorial').style.display = 'flex';
}

function closeTutorial() {
    document.getElementById('tutorial').style.display = 'none';
    localStorage.setItem('tutorialShown', 'true');
}

// ---------- DOBBY DRAWING ----------
function drawDobby(ctx, isHappy) {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#C19A6B';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.ellipse(w/2, h/2 - 20, 40, 50, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.moveTo(w/2 - 30, h/2 - 60);
    ctx.lineTo(w/2 - 50, h/2 - 80);
    ctx.lineTo(w/2 - 20, h/2 - 70);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(w/2 + 30, h/2 - 60);
    ctx.lineTo(w/2 + 50, h/2 - 80);
    ctx.lineTo(w/2 + 20, h/2 - 70);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(w/2 - 15, h/2 - 30, 12, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w/2 + 15, h/2 - 30, 12, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = '#000';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(w/2 - 15, h/2 - 30, 5, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(w/2 + 15, h/2 - 30, 5, 0, 2*Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isHappy) {
        ctx.moveTo(w/2 - 25, h/2 - 50);
        ctx.quadraticCurveTo(w/2 - 15, h/2 - 60, w/2 - 5, h/2 - 50);
        ctx.moveTo(w/2 + 25, h/2 - 50);
        ctx.quadraticCurveTo(w/2 + 15, h/2 - 60, w/2 + 5, h/2 - 50);
    } else {
        ctx.moveTo(w/2 - 25, h/2 - 45);
        ctx.quadraticCurveTo(w/2 - 15, h/2 - 55, w/2 - 5, h/2 - 50);
        ctx.moveTo(w/2 + 25, h/2 - 45);
        ctx.quadraticCurveTo(w/2 + 15, h/2 - 55, w/2 + 5, h/2 - 50);
    }
    ctx.stroke();

    ctx.fillStyle = '#8B5A2B';
    ctx.beginPath();
    ctx.ellipse(w/2, h/2 - 15, 5, 10, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (isHappy) {
        ctx.arc(w/2, h/2 - 10, 15, 0.1, Math.PI - 0.1);
    } else {
        ctx.arc(w/2, h/2 - 5, 15, Math.PI + 0.1, 2*Math.PI - 0.1, true);
    }
    ctx.stroke();

    ctx.fillStyle = '#5D3A1A';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(w/2, h/2 + 30, 30, 40, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.strokeStyle = '#5D3A1A';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(w/2 - 20, h/2 + 10);
    ctx.lineTo(w/2 - 40, h/2 + 20);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(w/2 + 20, h/2 + 10);
    ctx.lineTo(w/2 + 40, h/2 + 20);
    ctx.stroke();

    ctx.shadowBlur = 0;
}

// ---------- SOUND EFFECTS ----------
function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        const gain = audioCtx.createGain();
        gain.gain.value = 0.5;
        gain.connect(audioCtx.destination);

        if (type === 'collect') {
            const osc = audioCtx.createOscillator();
            osc.connect(gain);
            osc.frequency.value = 880;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } 
        else if (type === 'win') {
            const notes = [523.25, 659.25, 783.99];
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                osc.connect(gain);
                osc.frequency.value = freq;
                osc.start(audioCtx.currentTime + i * 0.15);
                osc.stop(audioCtx.currentTime + i * 0.15 + 0.3);
            });
        } 
        else if (type === 'move') {
            const osc = audioCtx.createOscillator();
            osc.connect(gain);
            osc.frequency.value = 600;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.03);
        } 
        else if (type === 'gameover') {
            const notes = [392, 349.23, 329.63, 293.66];
            notes.forEach((freq, i) => {
                const osc = audioCtx.createOscillator();
                osc.connect(gain);
                osc.frequency.value = freq;
                osc.start(audioCtx.currentTime + i * 0.2);
                osc.stop(audioCtx.currentTime + i * 0.2 + 0.3);
            });
        }
        else if (type === 'bomb') {
            const osc = audioCtx.createOscillator();
            osc.connect(gain);
            osc.frequency.value = 100;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
            const osc2 = audioCtx.createOscillator();
            osc2.connect(gain);
            osc2.frequency.value = 50;
            osc2.start(audioCtx.currentTime + 0.1);
            osc2.stop(audioCtx.currentTime + 0.4);
        }
    } catch (e) {}
}

// ---------- DOBBY POPUP ----------
function showDobby(isWin) {
    const popup = document.getElementById('dobbyPopup');
    const canvas = document.getElementById('dobbyCanvas');
    const message = document.getElementById('dobbyMessage');
    
    const ctx = canvas.getContext('2d');
    drawDobby(ctx, isWin);
    
    message.innerHTML = isWin ? 'YOU WIN!' : 'GAME OVER';
    
    popup.style.display = 'block';
    
    setTimeout(() => {
        popup.style.display = 'none';
    }, 3000);
}

// ---------- SELECTION ----------
document.querySelectorAll('.house-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.house-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentHouse = btn.dataset.house;
        
        const container = document.getElementById('app-container');
        container.className = '';
        container.classList.add(`theme-${currentHouse.toLowerCase()}`);
    });
});
document.querySelector('.house-btn').classList.add('selected');
document.getElementById('app-container').classList.add('theme-gryffindor');

document.querySelectorAll('.char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.char-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentChar = btn.dataset.char;
    });
});
document.querySelector('.char-btn').classList.add('selected');

// ---------- GRID GENERATION ----------
function generateGrid() {
    let size = LEVEL_GRID_SIZE[currentLevel];
    let obstacleCount = LEVEL_OBSTACLES[currentLevel];
    let bombCount = LEVEL_BOMBS[currentLevel];
    
    let newGrid = Array(size).fill().map(() => Array(size).fill(0));
    for (let r=0; r<size; r++) {
        for (let c=0; c<size; c++) {
            newGrid[r][c] = Math.floor(Math.random()*9) + 1;
        }
    }

    let obstaclesPlaced = 0;
    while (obstaclesPlaced < obstacleCount) {
        let r = Math.floor(Math.random() * size);
        let c = Math.floor(Math.random() * size);
        if ((r === 0 && c === 0) || (r === size-1 && c === size-1)) continue;
        if (newGrid[r][c] !== CELL_OBSTACLE && newGrid[r][c] !== CELL_BOMB) {
            newGrid[r][c] = CELL_OBSTACLE;
            obstaclesPlaced++;
        }
    }

    let bombsPlaced = 0;
    while (bombsPlaced < bombCount) {
        let r = Math.floor(Math.random() * size);
        let c = Math.floor(Math.random() * size);
        if ((r === 0 && c === 0) || (r === size-1 && c === size-1)) continue;
        if (newGrid[r][c] !== CELL_OBSTACLE && newGrid[r][c] !== CELL_BOMB) {
            newGrid[r][c] = CELL_BOMB;
            bombsPlaced++;
        }
    }

    return newGrid;
}

// ---------- DP OPTIMAL PATH ----------
function computeOptimal(grid) {
    let rows = grid.length;
    let cols = grid[0].length;
    let dp = Array(rows).fill().map(() => Array(cols).fill(-Infinity));
    let pathMap = Array(rows).fill().map(() => Array(cols).fill(null));

    if (grid[0][0] > 0) {
        dp[0][0] = grid[0][0];
        pathMap[0][0] = 'start';
    } else {
        return { score: 0, path: [] };
    }

    for (let c=1; c<cols; c++) {
        if (grid[0][c] > 0 && dp[0][c-1] !== -Infinity) {
            dp[0][c] = dp[0][c-1] + grid[0][c];
            pathMap[0][c] = 'left';
        }
    }
    for (let r=1; r<rows; r++) {
        if (grid[r][0] > 0 && dp[r-1][0] !== -Infinity) {
            dp[r][0] = dp[r-1][0] + grid[r][0];
            pathMap[r][0] = 'up';
        }
    }
    for (let r=1; r<rows; r++) {
        for (let c=1; c<cols; c++) {
            if (grid[r][c] < 0) continue;
            let fromUp = dp[r-1][c];
            let fromLeft = dp[r][c-1];
            if (fromUp === -Infinity && fromLeft === -Infinity) continue;
            if (fromUp > fromLeft) {
                dp[r][c] = fromUp + grid[r][c];
                pathMap[r][c] = 'up';
            } else {
                dp[r][c] = fromLeft + grid[r][c];
                pathMap[r][c] = 'left';
            }
        }
    }

    let path = [];
    if (dp[rows-1][cols-1] === -Infinity) {
        return { score: 0, path: [] };
    }
    let r = rows-1, c = cols-1;
    path.push([r, c]);
    while (r > 0 || c > 0) {
        let dir = pathMap[r][c];
        if (dir === 'up') {
            r--;
        } else if (dir === 'left') {
            c--;
        } else {
            break;
        }
        path.push([r, c]);
    }
    path.reverse();
    return { score: dp[rows-1][cols-1], path: path.map(p => p[0]+','+p[1]) };
}

// ---------- CHECK LEGAL MOVES ----------
function hasLegalMoves() {
    let r = playerPos.r;
    let c = playerPos.c;
    let size = grid.length;
    if (c+1 < size && grid[r][c+1] !== CELL_OBSTACLE) return true;
    if (r+1 < size && grid[r+1][c] !== CELL_OBSTACLE) return true;
    return false;
}

// ---------- TIMER ----------
function startTimer() {
    timeRemaining = LEVEL_TIME[currentLevel];
    updateTimerDisplay();
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!gameActive) return;
        timeRemaining--;
        updateTimerDisplay();
        if (timeRemaining <= 0) {
            timeRemaining = 0;
            gameOver('time');
        }
    }, 1000);
}

function updateTimerDisplay() {
    let percent = (timeRemaining / LEVEL_TIME[currentLevel]) * 100;
    document.getElementById('timerFill').style.width = percent + '%';
}

// ---------- START NEW GAME ----------
function startGame() {
    currentLevel = 1;
    totalScore = 0;
    playerScore = 0;
    loadLevel();
}

function loadLevel() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'block';
    document.getElementById('rankingsScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelCompleteScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
    document.getElementById('houseDisplay').innerText = currentHouse;
    document.getElementById('levelDisplay').innerText = currentLevel;

    const container = document.getElementById('app-container');
    container.className = '';
    container.classList.add(`theme-${currentHouse.toLowerCase()}`);

    grid = generateGrid();
    let opt = computeOptimal(grid);
    optimalScore = opt.score;
    optimalPath = opt.path;

    while (optimalPath.length === 0) {
        grid = generateGrid();
        opt = computeOptimal(grid);
        optimalScore = opt.score;
        optimalPath = opt.path;
    }

    playerPos = { r: 0, c: 0 };
    playerScore = grid[0][0];
    gameActive = true;
    document.getElementById('scoreDisplay').innerText = playerScore;
    document.getElementById('optimalDisplay').innerText = optimalScore;
    drawCanvas();
    startTimer();
}

function restartGame() {
    if (timerInterval) clearInterval(timerInterval);
    currentLevel = 1;
    totalScore = 0;
    playerScore = 0;
    loadLevel();
}

function backToHome() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    document.getElementById('homeScreen').style.display = 'block';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('rankingsScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelCompleteScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
}

// ---------- GAME OVER ----------
function gameOver(reason) {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    
    let reasonText;
    if (reason === 'time') {
        reasonText = `⏰ Time ran out on Level ${currentLevel}!`;
        playSound('gameover');
    } else if (reason === 'bomb') {
        reasonText = `💣 BOOM! You stepped on a bomb on Level ${currentLevel}!`;
        playSound('bomb');
    } else {
        reasonText = `❌ Wrong move! You got stuck on Level ${currentLevel} (no moves left).`;
        playSound('gameover');
    }
    
    showDobby(false);

    scores[currentHouse] += totalScore;
    localStorage.setItem('gridScoresZ', JSON.stringify(scores));

    document.getElementById('gameOverReason').innerText = reasonText;
    document.getElementById('gameOverScore').innerText = totalScore;

    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'block';
}

// ---------- LEVEL COMPLETE ----------
function levelComplete() {
    gameActive = false;
    if (timerInterval) clearInterval(timerInterval);
    playSound('win');
    showDobby(true);

    totalScore += playerScore;

    if (currentLevel < MAX_LEVEL) {
        document.getElementById('completedLevel').innerText = currentLevel;
        document.getElementById('levelScore').innerText = playerScore;
        document.getElementById('totalScoreDisplay').innerText = totalScore;
        document.getElementById('gameScreen').style.display = 'none';
        document.getElementById('levelCompleteScreen').style.display = 'block';
    } else {
        finalGameComplete();
    }
}

function nextLevel() {
    currentLevel++;
    loadLevel();
}

function finalGameComplete() {
    scores[currentHouse] += totalScore;
    localStorage.setItem('gridScoresZ', JSON.stringify(scores));

    document.getElementById('resultPlayerScore').innerText = totalScore;
    document.getElementById('resultMessage').innerText = "🌟 Congratulations! You've mastered all levels! 🌟";

    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('levelCompleteScreen').style.display = 'none';
    document.getElementById('resultScreen').style.display = 'block';
}

// ---------- MOVE LOGIC ----------
function tryMove(dr, dc) {
    if (!gameActive) return;
    let nr = playerPos.r + dr;
    let nc = playerPos.c + dc;
    let size = grid.length;
    if (nr >= 0 && nr < size && nc >= 0 && nc < size) {
        let cell = grid[nr][nc];
        if (cell === CELL_OBSTACLE) return;
        
        playSound('move');
        playerPos = { r: nr, c: nc };
        
        if (cell === CELL_BOMB) {
            gameOver('bomb');
            return;
        }
        
        playerScore += cell;
        document.getElementById('scoreDisplay').innerText = playerScore;
        drawCanvas();

        if (nr === size-1 && nc === size-1) {
            levelComplete();
        } else {
            if (!hasLegalMoves()) {
                gameOver('stuck');
            } else {
                playSound('collect');
            }
        }
    }
}

// ---------- DRAWING FUNCTIONS ----------
function drawGoldenBall(x, y, size, number) {
    let centerX = x + size/2;
    let centerY = y + size/2;
    let radius = size * 0.28;

    let gradient = ctx.createRadialGradient(centerX-3, centerY-3, radius*0.2, centerX, centerY, radius*1.2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.6, '#D4AF37');
    gradient.addColorStop(1, '#8B691F');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12;
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(centerX-4, centerY-4, radius*0.15, 0, 2*Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.fill();

    ctx.shadowColor = '#FFF';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#F0F0F0';
    ctx.lineWidth = 1;

    // Left wing
    ctx.beginPath();
    ctx.moveTo(centerX - radius - 2, centerY - 4);
    ctx.quadraticCurveTo(centerX - radius - 18, centerY - 22, centerX - radius - 28, centerY - 10);
    ctx.quadraticCurveTo(centerX - radius - 22, centerY + 2, centerX - radius - 6, centerY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX - radius - 4, centerY - 2);
    ctx.quadraticCurveTo(centerX - radius - 16, centerY - 14, centerX - radius - 22, centerY - 6);
    ctx.quadraticCurveTo(centerX - radius - 18, centerY + 2, centerX - radius - 6, centerY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Right wing
    ctx.beginPath();
    ctx.moveTo(centerX + radius + 2, centerY - 4);
    ctx.quadraticCurveTo(centerX + radius + 18, centerY - 22, centerX + radius + 28, centerY - 10);
    ctx.quadraticCurveTo(centerX + radius + 22, centerY + 2, centerX + radius + 6, centerY + 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(centerX + radius + 4, centerY - 2);
    ctx.quadraticCurveTo(centerX + radius + 16, centerY - 14, centerX + radius + 22, centerY - 6);
    ctx.quadraticCurveTo(centerX + radius + 18, centerY + 2, centerX + radius + 6, centerY + 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.shadowBlur = 0;

    ctx.fillStyle = '#000000';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.font = `bold ${Math.min(18, size/3.5)}px Georgia`;
    ctx.fillText(number, centerX - 8, centerY + 7);
    ctx.shadowBlur = 0;
}

function drawBomb(x, y, size) {
    let centerX = x + size/2;
    let centerY = y + size/2;
    let radius = size * 0.3;

    ctx.fillStyle = '#2c3e50';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2*Math.PI);
    ctx.fill();

    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.moveTo(centerX + radius*0.7, centerY - radius*0.5);
    ctx.lineTo(centerX + radius*1.2, centerY - radius*0.8);
    ctx.stroke();

    ctx.fillStyle = '#e74c3c';
    ctx.shadowColor = '#e74c3c';
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(centerX + radius*1.2, centerY - radius*0.8, 5, 0, 2*Math.PI);
    ctx.fill();

    ctx.fillStyle = '#FFF';
    ctx.shadowBlur = 5;
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY - 5, 5, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 5, centerY - 5, 5, 0, 2*Math.PI);
    ctx.fill();
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.arc(centerX - 5, centerY - 5, 2, 0, 2*Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(centerX + 5, centerY - 5, 2, 0, 2*Math.PI);
    ctx.fill();

    ctx.shadowBlur = 0;
}

function drawCharacter(ctx, x, y, cellSize, character, house) {
    const charName = character === CHARACTERS['harry'] ? 'harry' : (character === CHARACTERS['hermione'] ? 'hermione' : 'ron');
    
    ctx.shadowColor = '#8B4513';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(x-25, y-5);
    ctx.lineTo(x+25, y+5);
    ctx.stroke();
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(x-30, y-8);
    ctx.lineTo(x-30, y+2);
    ctx.lineTo(x-20, y-3);
    ctx.fill();

    ctx.fillStyle = HOUSE_COLORS[house];
    ctx.shadowColor = HOUSE_COLORS[house];
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.ellipse(x, y-2, 16, 22, 0, 0, Math.PI*2);
    ctx.fill();

    ctx.fillStyle = HOUSE_COLORS[house];
    ctx.shadowColor = HOUSE_COLORS[house];
    ctx.fillRect(x-14, y-10, 28, 6);
    ctx.fillRect(x-12, y-4, 24, 6);
    ctx.fillRect(x-14, y-10, 6, 14);
    ctx.fillRect(x+8, y-10, 6, 14);

    ctx.shadowBlur = 15;
    ctx.shadowColor = character.skin;
    ctx.fillStyle = character.skin;
    ctx.beginPath();
    ctx.arc(x, y-20, 15, 0, 2*Math.PI);
    ctx.fill();

    ctx.shadowColor = '#000';
    ctx.fillStyle = '#000';

    if (charName === 'harry') {
        ctx.beginPath();
        ctx.moveTo(x-12, y-32);
        ctx.lineTo(x-8, y-38);
        ctx.lineTo(x-2, y-34);
        ctx.lineTo(x+4, y-40);
        ctx.lineTo(x+10, y-34);
        ctx.lineTo(x+14, y-38);
        ctx.lineTo(x+12, y-30);
        ctx.fill();

        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x-6, y-23, 4, 0, 2*Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x+6, y-23, 4, 0, 2*Math.PI);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x-2, y-23);
        ctx.lineTo(x+2, y-23);
        ctx.stroke();

        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(x, y-30);
        ctx.lineTo(x+3, y-36);
        ctx.lineTo(x-3, y-34);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x-6, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+6, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
    }
    else if (charName === 'ron') {
        ctx.fillStyle = '#D2691E';
        ctx.shadowColor = '#D2691E';
        ctx.beginPath();
        ctx.arc(x-4, y-30, 6, 0, Math.PI, true);
        ctx.arc(x+4, y-30, 6, 0, Math.PI, true);
        ctx.fill();

        ctx.fillStyle = '#8B4513';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x-8, y-18, 1.5, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x, y-16, 1.5, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+8, y-18, 1.5, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x-4, y-22, 1.5, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+4, y-22, 1.5, 0, 2*Math.PI);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x-5, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+5, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
    }
    else if (charName === 'hermione') {
        ctx.fillStyle = '#D2691E';
        ctx.shadowColor = '#D2691E';
        ctx.beginPath();
        ctx.ellipse(x-6, y-32, 8, 6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x+6, y-32, 8, 6, 0, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(x, y-36, 10, 6, 0, 0, Math.PI*2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.arc(x-5, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x+5, y-23, 2, 0, 2*Math.PI);
        ctx.fill();
    }

    ctx.shadowBlur = 0;
}

function drawCanvas() {
    let size = grid.length;
    let cellSize = 500 / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    for (let i=0; i<=size; i++) {
        ctx.beginPath();
        ctx.moveTo(i*cellSize, 0);
        ctx.lineTo(i*cellSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i*cellSize);
        ctx.lineTo(canvas.width, i*cellSize);
        ctx.stroke();
    }

    for (let r=0; r<size; r++) {
        for (let c=0; c<size; c++) {
            let x = c * cellSize;
            let y = r * cellSize;

            if (grid[r][c] === CELL_OBSTACLE) {
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.arc(x+cellSize/2, y+cellSize/2, cellSize/2-5, 0, 2*Math.PI);
                ctx.fill();
                ctx.fillStyle = '#7f8c8d';
                ctx.beginPath();
                ctx.arc(x+cellSize/2-3, y+cellSize/2-3, 6, 0, 2*Math.PI);
                ctx.fill();
            } else if (grid[r][c] === CELL_BOMB) {
                drawBomb(x, y, cellSize);
            } else {
                if (optimalPath.includes(r+','+c)) {
                    ctx.fillStyle = '#ADD8E6';
                } else {
                    ctx.fillStyle = HOUSE_COLORS[currentHouse];
                }
                ctx.fillRect(x+2, y+2, cellSize-4, cellSize-4);
                drawGoldenBall(x, y, cellSize, grid[r][c]);
            }

            if (r===0 && c===0) {
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 5;
                ctx.strokeRect(x+2, y+2, cellSize-4, cellSize-4);
                ctx.fillStyle = '#D4AF37';
                ctx.font = `bold ${Math.min(18, cellSize/3)}px Georgia`;
                ctx.fillText('START', x+10, y+30);
            }
            if (r===size-1 && c===size-1) {
                ctx.strokeStyle = '#D4AF37';
                ctx.lineWidth = 5;
                ctx.strokeRect(x+2, y+2, cellSize-4, cellSize-4);
                ctx.fillStyle = '#D4AF37';
                ctx.font = `bold ${Math.min(18, cellSize/3)}px Georgia`;
                ctx.fillText('END', x+cellSize-50, y+cellSize-15);
            }
        }
    }

    if (gameActive) {
        let pr = playerPos.r, pc = playerPos.c;
        let moves = [];
        if (pc+1 < size && grid[pr][pc+1] !== CELL_OBSTACLE) moves.push([pr, pc+1]);
        if (pr+1 < size && grid[pr+1][pc] !== CELL_OBSTACLE) moves.push([pr+1, pc]);
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 5;
        moves.forEach(([r,c]) => {
            ctx.strokeRect(c*cellSize+2, r*cellSize+2, cellSize-4, cellSize-4);
        });
        ctx.shadowBlur = 0;
    }

    let pr = playerPos.r, pc = playerPos.c;
    let x = pc * cellSize + cellSize/2;
    let y = pr * cellSize + cellSize/2;
    let char = CHARACTERS[currentChar];
    
    drawCharacter(ctx, x, y, cellSize, char, currentHouse);
}

// ---------- EVENT HANDLERS ----------
document.addEventListener('keydown', (e) => {
    if (!gameActive) return;
    if (e.key === 'ArrowRight') {
        e.preventDefault();
        tryMove(0, 1);
    } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        tryMove(1, 0);
    }
});

canvas.addEventListener('click', (e) => {
    if (!gameActive) return;
    let rect = canvas.getBoundingClientRect();
    let scaleX = canvas.width / rect.width;
    let scaleY = canvas.height / rect.height;
    let mouseX = (e.clientX - rect.left) * scaleX;
    let mouseY = (e.clientY - rect.top) * scaleY;
    let cellSize = 500 / grid.length;
    let c = Math.floor(mouseX / cellSize);
    let r = Math.floor(mouseY / cellSize);
    let pr = playerPos.r, pc = playerPos.c;
    if ((r === pr && c === pc+1) || (r === pr+1 && c === pc)) {
        tryMove(r - pr, c - pc);
    }
});

// ---------- RANKINGS ----------
function showRankings() {
    document.getElementById('homeScreen').style.display = 'none';
    document.getElementById('gameScreen').style.display = 'none';
    document.getElementById('rankingsScreen').style.display = 'block';
    document.getElementById('resultScreen').style.display = 'none';
    document.getElementById('levelCompleteScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';

    let sorted = Object.entries(scores).sort((a,b) => b[1] - a[1]);
    let rankHtml = '';
    sorted.forEach(([house, score], i) => {
        let color = HOUSE_COLORS[house];
        rankHtml += `<div class="rank-item" style="border-left-color: ${color};">${i+1}. ${house}: ${score}</div>`;
    });
    document.getElementById('rankList').innerHTML = rankHtml;
}

function resetScores() {
    for (let h in scores) scores[h] = 0;
    localStorage.setItem('gridScoresZ', JSON.stringify(scores));
    showRankings();
}

// ---------- INIT ----------
document.getElementById('startBtn').addEventListener('click', startGame);