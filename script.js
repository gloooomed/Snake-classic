const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const livesElement = document.getElementById('lives');
const startScreen = document.getElementById('startScreen');
const gameOverScreen = document.getElementById('gameOver');
const pauseScreen = document.getElementById('pauseScreen');
const finalScoreElement = document.getElementById('finalScore');
const snakeStyleSelector = document.getElementById('snakeStyleSelector');
const gameModeSelector = document.getElementById('gameModeSelector');
const difficultySelector = document.getElementById('difficultySelector');
const achievementNotice = document.getElementById('achievementNotice');
const achievementList = document.getElementById('achievementList');
const activePowerUps = document.getElementById('activePowerUps');
const powerUpInfo = document.getElementById('powerUpInfo');

const gridSize = 20;
const tileCount = canvas.width / gridSize;
let snakeStyle = "classic";
let gameMode = "classic";
let difficulty = "medium";

// Game state variables
let snake = [{x: 10, y: 10}];
let food = {x: 15, y: 15};
let powerUp = null;
let obstacles = [];
let dx = 0, dy = 0;
let score = 0;
let lives = 3;
let gameRunning = false;
let gameStarted = false;
let paused = false;
let highScore = Number(localStorage.getItem('highScore')) || 0;
let achievements = JSON.parse(localStorage.getItem('achievements')) || [];

// Power-up system
let activePowerUpEffects = [];
let speedMultiplier = 1;

// Difficulty settings
const difficultySettings = {
    easy: { baseSpeed: 300, powerUpChance: 0.4, obstacleChance: 0 },
    medium: { baseSpeed: 200, powerUpChance: 0.3, obstacleChance: 0.1 },
    hard: { baseSpeed: 120, powerUpChance: 0.2, obstacleChance: 0.2 }
};

highScoreElement.textContent = highScore;
livesElement.textContent = lives;

// Achievement definitions
const achievementDefs = [
    { id: 'first_food', name: 'First Bite', desc: 'Eat your first food', trigger: (score) => score >= 10 },
    { id: 'score_50', name: 'Getting Started', desc: 'Reach 50 points', trigger: (score) => score >= 50 },
    { id: 'score_100', name: 'Century Club', desc: 'Reach 100 points', trigger: (score) => score >= 100 },
    { id: 'score_250', name: 'Quarter Master', desc: 'Reach 250 points', trigger: (score) => score >= 250 },
    { id: 'score_500', name: 'High Roller', desc: 'Reach 500 points', trigger: (score) => score >= 500 },
    { id: 'long_snake', name: 'Long Worm', desc: 'Grow to 20 segments', trigger: (score, snake) => snake.length >= 20 },
    { id: 'speed_demon', name: 'Speed Demon', desc: 'Use 10 speed boosts in one game', trigger: () => false }, // Special handling
    { id: 'survivor', name: 'Survivor', desc: 'Lose all lives and restart', trigger: () => false } // Special handling
];

function checkAchievements() {
    achievementDefs.forEach(achievement => {
        if (!achievements.includes(achievement.id) && achievement.trigger(score, snake)) {
            unlockAchievement(achievement);
        }
    });
}

function unlockAchievement(achievement) {
    achievements.push(achievement.id);
    localStorage.setItem('achievements', JSON.stringify(achievements));
    showAchievementNotice(achievement);
}

function showAchievementNotice(achievement) {
    achievementNotice.textContent = `🏆 Achievement Unlocked: ${achievement.name}`;
    achievementNotice.classList.remove('hidden');
    setTimeout(() => {
        achievementNotice.classList.add('hidden');
    }, 3000);
}
highScoreElement.textContent = highScore;

function createAudioElements() {
    try {
        const eat = document.createElement('audio');
        eat.id = "eatSound";
        eat.src = "assets/eat.wav";
        eat.volume = 0.3;
        eat.onerror = () => console.log('Eat sound not found, continuing without audio');
        document.body.appendChild(eat);
        
        const gameOverAud = document.createElement('audio');
        gameOverAud.id = "gameOverSound";
        gameOverAud.src = "assets/gameover.wav";
        gameOverAud.volume = 0.3;
        gameOverAud.onerror = () => console.log('Game over sound not found, continuing without audio');
        document.body.appendChild(gameOverAud);
    } catch (e) {
        console.log('Audio creation failed, continuing without audio');
    }
}
if (!document.getElementById('eatSound')) createAudioElements();

// Power-up types
const powerUpTypes = {
    speed: { emoji: '🚀', name: 'Speed Boost', color: '#ff6b6b', duration: 5000 },
    slow: { emoji: '🐌', name: 'Slow Motion', color: '#4ecdc4', duration: 8000 },
    bonus: { emoji: '⭐', name: 'Bonus Points', color: '#ffe66d', duration: 0 },
    invincible: { emoji: '🛡️', name: 'Invincibility', color: '#a8e6cf', duration: 3000 }
};

function createPowerUp() {
    if (gameMode !== 'arcade' || Math.random() > difficultySettings[difficulty].powerUpChance) {
        return null;
    }
    
    let valid = false, newPowerUp;
    while (!valid) {
        newPowerUp = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        valid = true;
        for (let segment of snake) {
            if (segment.x === newPowerUp.x && segment.y === newPowerUp.y) {
                valid = false;
                break;
            }
        }
        if (valid && food && newPowerUp.x === food.x && newPowerUp.y === food.y) {
            valid = false;
        }
        if (valid) {
            for (let obstacle of obstacles) {
                if (newPowerUp.x === obstacle.x && newPowerUp.y === obstacle.y) {
                    valid = false;
                    break;
                }
            }
        }
    }
    
    const types = Object.keys(powerUpTypes);
    newPowerUp.type = types[Math.floor(Math.random() * types.length)];
    newPowerUp.data = powerUpTypes[newPowerUp.type];
    return newPowerUp;
}

function createObstacle() {
    if (gameMode === 'classic' || Math.random() > difficultySettings[difficulty].obstacleChance) {
        return null;
    }
    
    let valid = false, newObstacle;
    let attempts = 0;
    while (!valid && attempts < 10) {
        newObstacle = {
            x: Math.floor(Math.random() * tileCount),
            y: Math.floor(Math.random() * tileCount)
        };
        valid = true;
        
        // Check collision with snake
        for (let segment of snake) {
            if (segment.x === newObstacle.x && segment.y === newObstacle.y) {
                valid = false;
                break;
            }
        }
        
        // Check collision with food
        if (valid && food && newObstacle.x === food.x && newObstacle.y === food.y) {
            valid = false;
        }
        
        // Check collision with power-up
        if (valid && powerUp && newObstacle.x === powerUp.x && newObstacle.y === powerUp.y) {
            valid = false;
        }
        
        // Check collision with existing obstacles
        if (valid) {
            for (let obstacle of obstacles) {
                if (newObstacle.x === obstacle.x && newObstacle.y === obstacle.y) {
                    valid = false;
                    break;
                }
            }
        }
        
        attempts++;
    }
    
    return valid ? newObstacle : null;
}

function applyPowerUp(type) {
    switch(type) {
        case 'speed':
            speedMultiplier = 2;
            activePowerUpEffects.push({ type: 'speed', endTime: Date.now() + powerUpTypes.speed.duration });
            break;
        case 'slow':
            speedMultiplier = 0.5;
            activePowerUpEffects.push({ type: 'slow', endTime: Date.now() + powerUpTypes.slow.duration });
            break;
        case 'bonus':
            score += 50;
            scoreElement.textContent = score;
            break;
        case 'invincible':
            activePowerUpEffects.push({ type: 'invincible', endTime: Date.now() + powerUpTypes.invincible.duration });
            break;
    }
    updatePowerUpDisplay();
}

function updatePowerUpDisplay() {
    const activeEffects = activePowerUpEffects.filter(effect => Date.now() < effect.endTime);
    if (activeEffects.length > 0) {
        activePowerUps.innerHTML = 'Active: ' + activeEffects.map(effect => 
            powerUpTypes[effect.type].emoji + ' ' + powerUpTypes[effect.type].name
        ).join(', ');
    } else {
        activePowerUps.innerHTML = '';
    }
}

function updatePowerUpEffects() {
    const now = Date.now();
    activePowerUpEffects = activePowerUpEffects.filter(effect => {
        if (now >= effect.endTime) {
            if (effect.type === 'speed' || effect.type === 'slow') {
                speedMultiplier = 1;
            }
            return false;
        }
        return true;
    });
    updatePowerUpDisplay();
}

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
        if (valid && powerUp && newFood.x === powerUp.x && newFood.y === powerUp.y) {
            valid = false;
        }
        if (valid) {
            for (let obstacle of obstacles) {
                if (newFood.x === obstacle.x && newFood.y === obstacle.y) {
                    valid = false;
                    break;
                }
            }
        }
    }
    
    // Chance for golden food (higher points)
    newFood.isGolden = gameMode === 'arcade' && Math.random() < 0.15;
    
    const shapes = ["circle", "square", "triangle"];
    newFood.shape = shapes[Math.floor(Math.random() * shapes.length)];
    
    if (newFood.isGolden) {
        newFood.palette = {stop0: "#ffd700", stop1: "#ffed4a", stop2: "#fff59d"};
    } else {
        const colorPalettes = [
            {stop0: "#ff007f", stop1: "#ff8c00", stop2: "#ffff00"},
            {stop0: "#00fff0", stop1: "#00ff00", stop2: "#007fff"},
            {stop0: "#ff00ff", stop1: "#ff1493", stop2: "#ffa500"},
            {stop0: "#adff2f", stop1: "#32cd32", stop2: "#7fff00"}
        ];
        newFood.palette = colorPalettes[Math.floor(Math.random() * colorPalettes.length)];
    }
    
    food = newFood;
    
    // Maybe create a power-up
    if (!powerUp && Math.random() < 0.3) {
        powerUp = createPowerUp();
    }
    
    // Maybe create an obstacle (in arcade mode on higher difficulties)
    if (gameMode === 'arcade' && obstacles.length < 5 && Math.random() < 0.15) {
        const newObstacle = createObstacle();
        if (newObstacle) {
            obstacles.push(newObstacle);
        }
    }
}

function drawGame() {
    ctx.fillStyle = '#1a252f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Check for invincibility effect
    const isInvincible = activePowerUpEffects.some(effect => effect.type === 'invincible');

    if (snakeStyle === "cylindrical") {
        for (let segment of snake) {
            const centerX = segment.x * gridSize + gridSize / 2;
            const centerY = segment.y * gridSize + gridSize / 2;
            const gradient = ctx.createRadialGradient(centerX, centerY, gridSize / 4, centerX, centerY, gridSize / 2);
            gradient.addColorStop(0, isInvincible ? "#a8e6cf" : "#ff9a9e");
            gradient.addColorStop(1, "#1a252f");
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(centerX, centerY, gridSize / 2 - 2, 0, 2 * Math.PI);
            ctx.fill();
        }
    } else if (snakeStyle === "neon") {
        ctx.shadowColor = isInvincible ? "#a8e6cf" : "#39ff14";
        ctx.shadowBlur = 20;
        for (let segment of snake) {
            ctx.fillStyle = isInvincible ? "#a8e6cf" : "#39ff14";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        }
        ctx.shadowBlur = 0;
    } else if (snakeStyle === "pixel") {
        for (let segment of snake) {
            ctx.fillStyle = isInvincible ? "#a8e6cf" : "#e3342f";
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 1, gridSize - 1);
        }
    } else {
        const defaultColors = isInvincible ? 
            ['#a8e6cf', '#88d8a3', '#68c77a', '#48b350'] :
            ['#fad0c4', '#ff9a9e', '#fbc2eb', '#a18cd1'];
        for (let i = 0; i < snake.length; i++) {
            const segment = snake[i];
            if (segment.color && !isInvincible) {
                ctx.fillStyle = segment.color;
            } else {
                ctx.fillStyle = defaultColors[i % defaultColors.length];
            }
            ctx.fillRect(segment.x * gridSize, segment.y * gridSize, gridSize - 2, gridSize - 2);
        }
    }

    // Draw food only if it exists
    if (food && food.palette) {
        const foodCenterX = food.x * gridSize + gridSize / 2;
        const foodCenterY = food.y * gridSize + gridSize / 2;
        ctx.save();
        ctx.shadowColor = food.isGolden ? "#ffd700" : "#ff00ff";
        ctx.shadowBlur = food.isGolden ? 20 : 15;
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
        
        // Draw golden food indicator
        if (food.isGolden) {
            ctx.font = '12px Arial';
            ctx.fillStyle = '#ffd700';
            ctx.fillText('🥇', food.x * gridSize + 2, food.y * gridSize - 2);
        }
        ctx.restore();
    }

    // Draw power-up
    if (powerUp) {
        const powerUpCenterX = powerUp.x * gridSize + gridSize / 2;
        const powerUpCenterY = powerUp.y * gridSize + gridSize / 2;
        ctx.save();
        ctx.shadowColor = powerUp.data.color;
        ctx.shadowBlur = 10;
        ctx.fillStyle = powerUp.data.color;
        ctx.beginPath();
        ctx.arc(powerUpCenterX, powerUpCenterY, gridSize / 2 - 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // Draw power-up emoji
        ctx.font = '16px Arial';
        ctx.fillStyle = '#000';
        ctx.textAlign = 'center';
        ctx.fillText(powerUp.data.emoji, powerUpCenterX, powerUpCenterY + 5);
        ctx.restore();
    }

    // Draw obstacles
    for (let obstacle of obstacles) {
        ctx.fillStyle = '#666';
        ctx.fillRect(obstacle.x * gridSize + 1, obstacle.y * gridSize + 1, gridSize - 2, gridSize - 2);
        ctx.fillStyle = '#999';
        ctx.fillRect(obstacle.x * gridSize + 3, obstacle.y * gridSize + 3, gridSize - 6, gridSize - 6);
    }
}

let lastTime = 0;
function gameLoop(timestamp) {
    if (!gameRunning || paused) return;
    if (!lastTime) lastTime = timestamp;
    const delta = timestamp - lastTime;
    
    // Update power-up effects
    updatePowerUpEffects();
    
    // Calculate speed based on difficulty, score, and power-ups
    const baseInterval = difficultySettings[difficulty].baseSpeed - (score * 2);
    const interval = Math.max(60, baseInterval / speedMultiplier);
    
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
    
    // Wall collision
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        handleCollision();
        return;
    }
    
    // Obstacle collision (unless invincible)
    const isInvincible = activePowerUpEffects.some(effect => effect.type === 'invincible');
    if (!isInvincible) {
        for (let obstacle of obstacles) {
            if (head.x === obstacle.x && head.y === obstacle.y) {
                handleCollision();
                return;
            }
        }
    }
    
    // Self collision (unless invincible)
    if (!isInvincible) {
        for (let segment of snake) {
            if (head.x === segment.x && head.y === segment.y) {
                handleCollision();
                return;
            }
        }
    }
    
    snake.unshift(head);
    
    // Check food collision
    if (head.x === food.x && head.y === food.y) {
        const points = food.isGolden ? 30 : 10;
        score += points;
        scoreElement.textContent = score;
        try {
            const eatSound = document.getElementById('eatSound');
            if (eatSound) eatSound.play().catch(e => console.log('Audio play failed'));
        } catch (e) {
            console.log('Audio not available');
        }
        head.color = food.palette.stop1;
        randomFood();
        checkAchievements();
    } else {
        snake.pop();
    }
    
    // Check power-up collision
    if (powerUp && head.x === powerUp.x && head.y === powerUp.y) {
        applyPowerUp(powerUp.type);
        powerUp = null;
    }
}

function handleCollision() {
    lives--;
    livesElement.textContent = lives;
    
    if (lives <= 0) {
        gameOver();
    } else {
        // Reset snake position and clear power-ups
        snake = [{ x: 10, y: 10 }];
        dx = 0; dy = 0;
        activePowerUpEffects = [];
        speedMultiplier = 1;
        powerUp = null;
        updatePowerUpDisplay();
        
        // Show temporary "life lost" message
        const canvas = document.getElementById('gameCanvas');
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Life Lost! Lives remaining: ' + lives, canvas.width/2, canvas.height/2);
        
        setTimeout(() => {
            drawGame();
        }, 1500);
    }
}

function startGame() {
    snakeStyle = snakeStyleSelector.value;
    gameMode = gameModeSelector.value;
    difficulty = difficultySelector.value;
    
    startScreen.classList.add("hidden");
    gameOverScreen.classList.add("hidden");
    pauseScreen.classList.add("hidden");
    
    // Show power-up info if arcade mode
    if (gameMode === 'arcade') {
        powerUpInfo.classList.remove('hidden');
    } else {
        powerUpInfo.classList.add('hidden');
    }
    
    gameRunning = true;
    gameStarted = true;
    paused = false;
    snake = [{ x: 10, y: 10 }];
    dx = 0; dy = 0; score = 0;
    lives = 3;
    activePowerUpEffects = [];
    speedMultiplier = 1;
    powerUp = null;
    obstacles = [];
    
    scoreElement.textContent = score;
    livesElement.textContent = lives;
    updatePowerUpDisplay();
    
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
    
    // Check for survivor achievement
    if (lives <= 0 && !achievements.includes('survivor')) {
        unlockAchievement(achievementDefs.find(a => a.id === 'survivor'));
    }
    
    finalScoreElement.textContent = score;
    
    // Show recent achievements
    const recentAchievements = achievements.slice(-3).map(id => {
        const achievement = achievementDefs.find(a => a.id === id);
        return achievement ? `🏆 ${achievement.name}` : '';
    }).filter(Boolean);
    
    if (recentAchievements.length > 0) {
        achievementList.innerHTML = 'Recent Achievements:<br>' + recentAchievements.join('<br>');
    } else {
        achievementList.innerHTML = '';
    }
    
    try {
        const gameOverSound = document.getElementById('gameOverSound');
        if (gameOverSound) gameOverSound.play().catch(e => console.log('Audio play failed'));
    } catch (e) {
        console.log('Audio not available');
    }
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