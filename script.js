const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const pauseScreen = document.getElementById('pauseScreen');
const finalScoreElement = document.getElementById('finalScore');
const snakeStyleSelector = document.getElementById('snakeStyleSelector');

const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snakeStyle = "classic";

let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let dx = 0, dy = 0;
let score = 0;
let gameRunning = false;
let gameStarted = false;
let paused = false;
let highScore = Number(localStorage.getItem('highScore')) || 0;
highScoreElement.textContent = highScore;

function createAudioElements() {
    const eat = document.createElement('audio');
    eat.id = "eatSound";
    eat.src = "assets/eat.wav";
    document.body.appendChild(eat);
    const gameOverAud = document.createElement('audio');
    gameOverAud.id = "gameOverSound";
    gameOverAud.src = "assets/gameover.wav";
    document.body.appendChild(gameOverAud);
}
if (!document.getElementById('eatSound')) createAudioElements();

function randomFood() {
    let valid = false, newFood;
    while (!valid) {
        newFood = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        valid = true;
        for (let segment of snake) {
            if (segment.x === newFood.x && segment.y === newFood.y) {
                valid = false;
                break;
            }
        }
    }
    const shapes = ["circle", "square", "triangle"];
    newFood.shape = shapes[Math.floor(Math.random() * shapes.length)];
    const colorPalettes = [
        {stop0: "#ff007f", stop1: "#ff8c00", stop2: "#ffff00"},
        {stop0: "#00fff0", stop1: "#00ff00", stop2: "#007fff"},
        {stop0: "#ff00ff", stop1: "#ff1493", stop2: "#ffa500"},
        {stop0: "#adff2f", stop1: "#32cd32", stop2: "#7fff00"}
    ];
    newFood.palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    food = newFood;
}

function drawGame() {
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (snakeStyle === "cylindrical") {
        for (let segment of snake) {
            const centerX = segment.x * gridSize + gridSize / 2;
            const centerY = segment.y * gridSize + gridSize / 2;
            const gradient = ctx.createRadialGradient(centerX, centerY, gridSize / 4, centerX, centerY, gridSize / 2);
            gradient.addColorStop(0, "#ff9a9e");
            gradient.addColorStop(1, "#1a252f");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, gridSize / 2 - 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (snakeStyle === "neon") {
        ctx.shadowColor = "#39ff14";
        ctx.shadowBlur = 20;
        for (let segment of snake) {
            ctx.fillStyle = "#39ff14";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        }
        ctx.shadowBlur = 0;
    } else if (snakeStyle === "pixel") {
        for (let segment of snake) {
            ctx.fillStyle = "#e3342f";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        }
    } else {
        const defaultColors = ['#fad0c4', '#ff9a9e', '#fbc2eb', '#a18cd1'];
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            if (segment.color) {
                ctx.fillStyle = segment.color;
            } else {
                ctx.fillStyle = defaultColors[i % defaultColors.length];
            }
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        }
    }

    const foodCenterX = food.x * gridSize + gridSize / 2;
    const foodCenterY = food.y * gridSize + gridSize / 2;
    ctx.save();
    ctx.shadowColor = "#ff00ff";
    ctx.shadowBlur = 15;
    const grad = ctx.createRadialGradient(foodCenterX, foodCenterY, gridSize / 8, foodCenterX, foodCenterY, gridSize / 2);
    grad.addColorStop(0, food.palette.stop0);
    grad.addColorStop(0.5, food.palette.stop1);
    grad.addColorStop(1, food.palette.stop2);
    ctx.fillStyle = grad;
    if (food.shape === "circle") {
        ctx.beginPath();
        ctx.arc(foodCenterX, foodCenterY, gridSize / 2 - 2, 0, 2 * Math.PI);
        ctx.fill();
    } else if (food.shape === "square") {
        ctx.fillRect(food.x * gridSize + 2, food.y * gridSize + 2, gridSize - 4, gridSize - 4);
    } else if (food.shape === "triangle") {
        ctx.beginPath();
        ctx.moveTo(foodCenterX, foodCenterY - (gridSize / 2 - 2));
        ctx.lineTo(foodCenterX - (gridSize / 2 - 2), foodCenterY + (gridSize / 2 - 2));
        ctx.lineTo(foodCenterX + (gridSize / 2 - 2), foodCenterY + (gridSize / 2 - 2));
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameRunning || paused) return;
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    const interval = Math.max(80, 500 - score * 5);
    if (delta > interval) {
        moveSnake();
        drawGame();
        lastTime = timestamp;
    }
    requestAnimationFrame(gameLoop);
}

function moveSnake() {
    if (dx === 0 && dy === 0) return;
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        gameOver();
        return;
    }
    for (let segment of snake) {
        if (head.x === segment.x && head.y === segment.y) {
            gameOver();
            return;
        }
    }
    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        document.getElementById('eatSound').play();
        head.color = food.palette.stop1;
        randomFood();
    } else {
        snake.pop();
    }
}

function startGame() {
    snakeStyle = snakeStyleSelector.value;
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    gameRunning = true;
    gameStarted = true;
    paused = false;
    snake = [{ x: 10, y: 10 }];
    dx = 0; dy = 0; score = 0;
    scoreElement.textContent = score;
    randomFood();
    drawGame();
    lastTime = 0;
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameRunning = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreElement.textContent = highScore;
    }
    finalScoreElement.textContent = score;
    document.getElementById('gameOverSound').play();
    gameOverScreen.classList.remove("hidden");
}

function restartGame() {
    gameOverScreen.classList.add("hidden");
    startGame();
}

document.addEventListener('keydown', (e) => {
    if (!gameStarted && e.key === ' ') {
        startGame();
        return;
    }
    if (gameRunning && e.key.toLowerCase() === 'p') {
        paused = !paused;
        pauseScreen.classList.toggle("hidden", !paused);
        if (!paused) requestAnimationFrame(gameLoop);
        return;
    }
    if (!gameRunning) return;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
    }
    switch(e.key) {
        case 'ArrowLeft':
            if (dx !== 1) { dx = -1; dy = 0; }
            break;
        case 'ArrowUp':
            if (dy !== 1) { dx = 0; dy = -1; }
            break;
        case 'ArrowRight':
            if (dx !== -1) { dx = 1; dy = 0; }
            break;
        case 'ArrowDown':
            if (dy !== -1) { dx = 0; dy = 1; }
            break;
    }
});

let touchStartX = 0, touchStartY = 0;
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});
canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    if (!gameRunning) {
        if (!gameStarted) startGame();
        return;
    }
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX - touchEndX;
    const diffY = touchStartY - touchEndY;
    if (Math.abs(diffX) < 30 && Math.abs(diffY) < 30) return;
    if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && dx !== 1) { dx = -1; dy = 0; }
        else if (diffX < 0 && dx !== -1) { dx = 1; dy = 0; }
    } else {
        if (diffY > 0 && dy !== 1) { dx = 0; dy = -1; }
        else if (diffY < 0 && dy !== -1) { dx = 0; dy = 1; }
    }
});

drawGame();