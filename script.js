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
const MAX_LEVEL = 5;
const LEVEL_GRID_SIZE = [0, 4, 5, 6, 7, 8];
const LEVEL_OBSTACLES = [0, 2, 4, 6, 8, 10];
const LEVEL_TIME = [0, 60, 55, 50, 45, 40]; // seconds per level

// ---------- GLOBAL ----------
let currentHouse = 'Gryffindor';
let currentChar = 'harry';
let grid = [];
let optimalPath = [];
let optimalScore = 0;
let playerPos = { r: 0, c: 0 };
let playerScore = 0; // score for current level
let totalScore = 0;   // accumulated across levels
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

// ---------- SOUND EFFECTS ----------
function playSound(type) {
    try {
        if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        if (type === 'collect') {
            osc.frequency.value = 800;
            gain.gain.value = 0.2;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.1);
        } else if (type === 'win') {
            osc.frequency.value = 1200;
            gain.gain.value = 0.3;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
        } else if (type === 'move') {
            osc.frequency.value = 600;
            gain.gain.value = 0.1;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.05);
        } else if (type === 'gameover') {
            osc.frequency.value = 200;
            gain.gain.value = 0.4;
            osc.start();
            osc.stop(audioCtx.currentTime + 0.5);
        }
    } catch (e) {}
}

// ---------- SELECTION (with theme) ----------
document.querySelectorAll('.house-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.house-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        currentHouse = btn.dataset.house;
        
        // Apply theme to container
        const container = document.getElementById('app-container');
        container.className = '';
        container.classList.add(`theme-${currentHouse.toLowerCase()}`);
    });
});
document.querySelector('.house-btn').classList.add('selected');
// Set initial theme
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
        if (newGrid[r][c] !== -1) {
            newGrid[r][c] = -1;
            obstaclesPlaced++;
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

    if (grid[0][0] !== -1) {
        dp[0][0] = grid[0][0];
        pathMap[0][0] = 'start';
    } else {
        return { score: 0, path: [] };
    }

    for (let c=1; c<cols; c++) {
        if (grid[0][c] !== -1 && dp[0][c-1] !== -Infinity) {
            dp[0][c] = dp[0][c-1] + grid[0][c];
            pathMap[0][c] = 'left';
        }
    }
    for (let r=1; r<rows; r++) {
        if (grid[r][0] !== -1 && dp[r-1][0] !== -Infinity) {
            dp[r][0] = dp[r-1][0] + grid[r][0];
            pathMap[r][0] = 'up';
        }
    }
    for (let r=1; r<rows; r++) {
        for (let c=1; c<cols; c++) {
            if (grid[r][c] === -1) continue;
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
    if (c+1 < size && grid[r][c+1] !== -1) return true;
    if (r+1 < size && grid[r+1][c] !== -1) return true;
    return false;
}

// ---------- TIMER FUNCTIONS ----------
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

    // Apply theme again (in case it changed)
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
    playSound('gameover');

    // Add total score so far to house
    scores[currentHouse] += totalScore;
    localStorage.setItem('gridScoresZ', JSON.stringify(scores));

    let reasonText;
    if (reason === 'time') {
        reasonText = `⏰ Time ran out on Level ${currentLevel}!`;
    } else {
        reasonText = `❌ Wrong move! You got stuck on Level ${currentLevel} (no moves left).`;
    }
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
        if (grid[nr][nc] !== -1) {
            playSound('move');
            playerPos = { r: nr, c: nc };
            playerScore += grid[nr][nc];
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
}

// ---------- DRAWING (with golden balls) ----------
function drawGoldenBall(x, y, size, number) {
    // Draw a 3D golden sphere
    let centerX = x + size/2;
    let centerY = y + size/2;
    let radius = size * 0.35;

    // Radial gradient for metallic gold
    let gradient = ctx.createRadialGradient(centerX-3, centerY-3, radius*0.2, centerX, centerY, radius*1.2);
    gradient.addColorStop(0, '#FFD700');
    gradient.addColorStop(0.5, '#D4AF37');
    gradient.addColorStop(1, '#8B691F');

    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 15;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Add a small white highlight
    ctx.beginPath();
    ctx.arc(centerX-5, centerY-5, radius*0.2, 0, 2*Math.PI);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fill();

    // Draw the number
    ctx.fillStyle = '#000000';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10;
    ctx.font = `bold ${Math.min(20, size/3)}px Georgia`;
    ctx.fillText(number, centerX - 10, centerY + 8);
    ctx.shadowBlur = 0;
}

function drawCanvas() {
    let size = grid.length;
    let cellSize = 500 / size;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid lines
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

    // Draw cells
    for (let r=0; r<size; r++) {
        for (let c=0; c<size; c++) {
            let x = c * cellSize;
            let y = r * cellSize;

            if (grid[r][c] === -1) {
                // Obstacle – Bludger
                ctx.fillStyle = '#2c3e50';
                ctx.beginPath();
                ctx.arc(x+cellSize/2, y+cellSize/2, cellSize/2-5, 0, 2*Math.PI);
                ctx.fill();
                ctx.fillStyle = '#7f8c8d';
                ctx.beginPath();
                ctx.arc(x+cellSize/2-3, y+cellSize/2-3, 6, 0, 2*Math.PI);
                ctx.fill();
            } else {
                // Cell background (house color or optimal path)
                if (optimalPath.includes(r+','+c)) {
                    ctx.fillStyle = '#ADD8E6';
                } else {
                    ctx.fillStyle = HOUSE_COLORS[currentHouse];
                }
                ctx.fillRect(x+2, y+2, cellSize-4, cellSize-4);

                // Draw golden ball with number
                drawGoldenBall(x, y, cellSize, grid[r][c]);
            }

            // Start/End markers
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

    // Draw possible moves (green glowing)
    if (gameActive) {
        let pr = playerPos.r, pc = playerPos.c;
        let moves = [];
        if (pc+1 < size && grid[pr][pc+1] !== -1) moves.push([pr, pc+1]);
        if (pr+1 < size && grid[pr+1][pc] !== -1) moves.push([pr+1, pc]);
        ctx.shadowColor = '#00ff00';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 5;
        moves.forEach(([r,c]) => {
            ctx.strokeRect(c*cellSize+2, r*cellSize+2, cellSize-4, cellSize-4);
        });
        ctx.shadowBlur = 0;
    }

    // Draw player (character on broom)
    let pr = playerPos.r, pc = playerPos.c;
    let x = pc * cellSize + cellSize/2;
    let y = pr * cellSize + cellSize/2;
    let char = CHARACTERS[currentChar];

    // Broom
    ctx.shadowColor = '#8B4513';
    ctx.shadowBlur = 10;
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(x-15, y-5);
    ctx.lineTo(x+15, y+5);
    ctx.stroke();

    // Bristles
    ctx.fillStyle = '#A0522D';
    ctx.beginPath();
    ctx.moveTo(x-20, y-8);
    ctx.lineTo(x-20, y+2);
    ctx.lineTo(x-10, y-3);
    ctx.fill();

    // Head
    ctx.fillStyle = char.skin;
    ctx.shadowColor = char.skin;
    ctx.shadowBlur = 15;
    ctx.beginPath();
    ctx.arc(x, y-12, 10, 0, 2*Math.PI);
    ctx.fill();

    // Hair
    ctx.fillStyle = char.hair;
    ctx.shadowColor = char.hair;
    ctx.beginPath();
    ctx.arc(x-4, y-18, 4, 0, 2*Math.PI);
    ctx.arc(x+4, y-18, 4, 0, 2*Math.PI);
    ctx.fill();

    // Glasses/Scar
    if (char.glasses) {
        ctx.fillStyle = '#000';
        ctx.shadowColor = '#000';
        ctx.beginPath();
        ctx.arc(x-6, y-14, 2, 0, 2*Math.PI);
        ctx.arc(x+6, y-14, 2, 0, 2*Math.PI);
        ctx.fill();
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.moveTo(x, y-18);
        ctx.lineTo(x+3, y-24);
        ctx.lineTo(x-3, y-22);
        ctx.fill();
    }

    // Robe
    ctx.fillStyle = HOUSE_COLORS[currentHouse];
    ctx.shadowColor = HOUSE_COLORS[currentHouse];
    ctx.fillRect(x-8, y-5, 16, 12);
    ctx.shadowBlur = 0;
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