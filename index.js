const characters = [
    { id: 'player1', name: 'Atacante', color: '#FF6B6B', emoji: '⚡', speed: 4.5, power: 1.2 },
    { id: 'player2', name: 'Defensor', color: '#4ECDC4', emoji: '🛡️', speed: 3.5, power: 0.8 },
    { id: 'player3', name: 'Capitão', color: '#45B7D1', emoji: '👑', speed: 4, power: 1 },
    { id: 'player4', name: 'Velocista', color: '#96CEB4', emoji: '💨', speed: 5, power: 0.9 },
    { id: 'player5', name: 'Artilheiro', color: '#FFEAA7', emoji: '🎯', speed: 3.8, power: 1.4 },
    { id: 'player6', name: 'Goleiro', color: '#DDA0DD', emoji: '🥅', speed: 3, power: 0.7 },
    { id: 'player7', name: 'Mágico', color: '#FF7675', emoji: '✨', speed: 4.2, power: 1.1 },
    { id: 'player8', name: 'Robô', color: '#A29BFE', emoji: '🤖', speed: 4.8, power: 1.3 },
    { id: 'player9', name: 'Ninja', color: '#6C5CE7', emoji: '🥷', speed: 4.7, power: 1.1 }
];

let selectedPlayer = null;
let selectedAI = null;
let gameState = null;
let gameStats = { playerShots: 0, ballPossessions: 0, lastPossessor: null };
let timerInterval;
let animationFrameId;

const characterSelectScreen = document.getElementById('characterSelect');
const gameScreen = document.getElementById('gameContainer');
const startGameBtn = document.getElementById('startGameBtn');
const playerCharacterName = document.getElementById('playerCharacterName');
const aiCharacterName = document.getElementById('aiCharacterName');
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const gameOverScreen = document.getElementById('gameOver');
const winnerText = document.getElementById('winner');
const finalPlayerScore = document.getElementById('finalPlayerScore');
const finalAiScore = document.getElementById('finalAiScore');
const restartBtn = document.getElementById('restartBtn');

function initCharacterSelect() {
    const playerGrid = document.getElementById('playerCharacters');
    const aiGrid = document.getElementById('aiCharacters');
    characters.forEach(char => {
        const playerChar = createCharacterElement(char, 'player');
        playerGrid.appendChild(playerChar);
        const adversarioChar = createCharacterElement(char, 'ai');
        aiGrid.appendChild(adversarioChar);
    });
}

function createCharacterElement(character, type) {
    const div = document.createElement('div');
    div.className = 'character-option';
    div.style.background = `linear-gradient(135deg, ${character.color}, ${adjustBrightness(character.color, -20)})`;
    div.innerHTML = `${character.emoji}<br><small style="font-size:12px;">${character.name}</small>`;
    div.title = `${character.name} - Vel: ${character.speed} | Força: ${character.power}`;
    div.addEventListener('click', () => selectCharacter(character, type, div));
    return div;
}

function adjustBrightness(hex, percent) {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function selectCharacter(character, type, element) {
    if(type === 'player'){
        document.querySelectorAll('#playerCharacters .character-option').forEach(el => el.classList.remove('selected'));
        selectedPlayer = character;
        element.classList.add('selected');
        playerCharacterName.textContent = `${character.name} (Vel: ${character.speed}, Força: ${character.power})`;
    } else {
        document.querySelectorAll('#aiCharacters .character-option').forEach(el => el.classList.remove('selected'));
        selectedAI = character;
        element.classList.add('selected');
        aiCharacterName.textContent = `${character.name} (Vel: ${character.speed}, Força: ${character.power})`;
    }
    startGameBtn.disabled = !(selectedPlayer && selectedAI);
}

startGameBtn.addEventListener('click', () => {
    characterSelectScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    document.getElementById('playerIndicator').style.background = `linear-gradient(135deg, ${selectedPlayer.color}, ${adjustBrightness(selectedPlayer.color, -20)})`;
    document.getElementById('playerIndicator').textContent = selectedPlayer.emoji;
    document.getElementById('aiIndicator').style.background = `linear-gradient(135deg, ${selectedAI.color}, ${adjustBrightness(selectedAI.color, -20)})`;
    document.getElementById('aiIndicator').textContent = selectedAI.emoji;
    initGame();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    characterSelectScreen.classList.remove('hidden');
    selectedPlayer = null;
    selectedAI = null;
    startGameBtn.disabled = true;
    playerCharacterName.textContent = 'Selecione um personagem';
    aiCharacterName.textContent = 'Selecione um adversário';
    document.querySelectorAll('#playerCharacters .character-option').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('#aiCharacters .character-option').forEach(el => el.classList.remove('selected'));
    gameStats = { playerShots: 0, ballPossessions: 0, lastPossessor: null };
    cancelAnimationFrame(animationFrameId);
});

window.addEventListener('keydown', e => {
    if(gameState) gameState.keys[e.code] = true;
});

window.addEventListener('keyup', e => {
    if(gameState) gameState.keys[e.code] = false;
});

function initGame(){
    gameState = {
        player: { x: 400, y: 500, size: 22, color: selectedPlayer.color, emoji: selectedPlayer.emoji,
                  speed: selectedPlayer.speed, power: selectedPlayer.power },
        ai: { x: 400, y: 100, size: 22, color: selectedAI.color, emoji: selectedAI.emoji,
              speed: selectedAI.speed * 0.55, power: selectedAI.power },
        ball: { x: 400, y: 300, size: 12, vx:0, vy:0, color:'#fff' },
        playerGoal: { x: 325, y: 560, width: 150, height: 40 },
        aiGoal: { x: 325, y: 0, width: 150, height: 40 },
        playerScore: 0,
        aiScore: 0,
        timeLeft: 90,
        gameRunning: true,
        keys: {},
        aiLastKick: 0,
        lastKicker: null,
        trails: [],
        particles: [],
        aiProcessingKick: false
    };
    document.getElementById('playerScore').textContent = '0';
    document.getElementById('aiScore').textContent = '0';
    document.getElementById('timer').textContent = '90';
    updateStats();
    timer();
    gameLoop();
}

function timer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if(gameState.gameRunning) {
            gameState.timeLeft--;
            document.getElementById('timer').textContent = gameState.timeLeft;
            if(gameState.timeLeft <= 0) {
                endGame();
            }
        }
    }, 1000);
}

function endGame() {
    gameState.gameRunning = false;
    clearInterval(timerInterval);
    gameScreen.classList.add('hidden');
    gameOverScreen.classList.remove('hidden');

    let winnerMessage = '';
    if (gameState.playerScore > gameState.aiScore) {
        winnerMessage = '🏆 Você Venceu!';
    } else if (gameState.aiScore > gameState.playerScore) {
        winnerMessage = '😔 Você Perdeu!';
    } else {
        winnerMessage = '🤝 Empate!';
    }

    winnerText.textContent = winnerMessage;
    finalPlayerScore.textContent = gameState.playerScore;
    finalAiScore.textContent = gameState.aiScore;
    document.getElementById('finalPlayerShots').textContent = gameStats.playerShots;
    document.getElementById('finalBallPossessions').textContent = gameStats.ballPossessions;
}

function updatePlayer(){
    const speed = gameState.player.speed;
    if(gameState.keys['ArrowUp'] || gameState.keys['KeyW']) gameState.player.y -= speed;
    if(gameState.keys['ArrowDown'] || gameState.keys['KeyS']) gameState.player.y += speed;
    if(gameState.keys['ArrowLeft'] || gameState.keys['KeyA']) gameState.player.x -= speed;
    if(gameState.keys['ArrowRight'] || gameState.keys['KeyD']) gameState.player.x += speed;

    gameState.player.x = Math.min(canvas.width - gameState.player.size, Math.max(gameState.player.size, gameState.player.x));
    gameState.player.y = Math.min(canvas.height - gameState.player.size, Math.max(gameState.player.size, gameState.player.y));

    const playerBallDist = Math.sqrt((gameState.ball.x - gameState.player.x) ** 2 + (gameState.ball.y - gameState.player.y) ** 2);
    if(playerBallDist < 35 && gameStats.lastPossessor !== 'player') {
        gameStats.ballPossessions++;
        gameStats.lastPossessor = 'player';
    }
}

function performKickAI() {
    const ai = gameState.ai;
    const ball = gameState.ball;
    const dx = gameState.playerGoal.x + gameState.playerGoal.width / 2 - ball.x;
    const dy = gameState.playerGoal.y + gameState.playerGoal.height / 2 - ball.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const kickPower = 6 * ai.power;
    
    gameState.ball.vx = (dx / dist) * kickPower + (Math.random() - 0.5) * 3;
    gameState.ball.vy = (dy / dist) * kickPower + (Math.random() - 0.5) * 3;

    addParticles(ball.x, ball.y, '#ff6666');
    gameState.aiLastKick = 0;
    gameState.aiProcessingKick = false;
    gameState.lastKicker = 'ai';
}

function updateAI() {
    const ai = gameState.ai;
    const ball = gameState.ball;
    const aiSpeed = ai.speed;
    gameState.aiLastKick++;

    const ballDistance = Math.sqrt((ball.x - ai.x) ** 2 + (ball.y - ai.y) ** 2);
    let targetX, targetY;

    targetX = ball.x;
    targetY = ball.y;

    if (ballDistance < 45 && gameState.aiLastKick > 30 + Math.random() * 20 && !gameState.aiProcessingKick) {
        gameState.aiProcessingKick = true;

        setTimeout(() => {
            if(Math.sqrt((ball.x - ai.x) ** 2 + (ball.y - ai.y) ** 2) < 45){
                performKickAI();
            } else {
                gameState.aiProcessingKick = false;
            }
        }, 200);
    }

    const dx = targetX - ai.x;
    const dy = targetY - ai.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 1) {
        ai.x += (dx / dist) * aiSpeed;
        ai.y += (dy / dist) * aiSpeed;
    }

    ai.x = Math.min(canvas.width - ai.size, Math.max(ai.size, ai.x));
    ai.y = Math.min(canvas.height - ai.size, Math.max(ai.size, ai.y));

    if (ballDistance < 35 && gameStats.lastPossessor !== 'ai') {
        gameStats.ballPossessions++;
        gameStats.lastPossessor = 'ai';
    }
}

function kickBall(who){
    if(who === 'player'){
        if(gameState.keys['Space']){
            const dx = gameState.ball.x - gameState.player.x;
            const dy = gameState.ball.y - gameState.player.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if(dist < 45){
                const kickPower = 6 * gameState.player.power;
                gameState.ball.vx = (dx / dist) * kickPower;
                gameState.ball.vy = (dy / dist) * kickPower;
                gameStats.playerShots++;
                addParticles(gameState.ball.x, gameState.ball.y, '#ffff00');
                gameState.lastKicker = 'player';
            }
        }
    }
}

function addParticles(x, y, color) {
    for(let i = 0; i < 8; i++) {
        gameState.particles.push({
            x: x, y: y, vx: (Math.random() - 0.5) * 10, vy: (Math.random() - 0.5) * 10,
            color: color, life: 30, maxLife: 30
        });
    }
}

function updateBall(){
    gameState.trails.push({ x: gameState.ball.x, y: gameState.ball.y, life: 10 });
    gameState.trails = gameState.trails.filter(trail => --trail.life > 0);

    gameState.ball.x += gameState.ball.vx;
    gameState.ball.y += gameState.ball.vy;

    gameState.ball.vx *= 0.96;
    gameState.ball.vy *= 0.96;

    const postWidth = 12;
    const ballRadius = gameState.ball.size;

    if (gameState.ball.y - ballRadius < gameState.aiGoal.height && gameState.ball.x > gameState.aiGoal.x + postWidth && gameState.ball.x < gameState.aiGoal.x + gameState.aiGoal.width - postWidth) {
        gameState.ball.vy *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#fff');
    }
    if (gameState.ball.y < gameState.aiGoal.y + gameState.aiGoal.height) {
        if ((gameState.ball.x - ballRadius < gameState.aiGoal.x + postWidth && gameState.ball.x + ballRadius > gameState.aiGoal.x) ||
            (gameState.ball.x + ballRadius > gameState.aiGoal.x + gameState.aiGoal.width - postWidth && gameState.ball.x - ballRadius < gameState.aiGoal.x + gameState.aiGoal.width)) {
            gameState.ball.vx *= -0.8;
            addParticles(gameState.ball.x, gameState.ball.y, '#fff');
        }
    }


    if (gameState.ball.y + ballRadius > gameState.playerGoal.y && gameState.ball.x > gameState.playerGoal.x + postWidth && gameState.ball.x < gameState.playerGoal.x + gameState.playerGoal.width - postWidth) {
        gameState.ball.vy *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#fff');
    }
    if (gameState.ball.y > gameState.playerGoal.y - gameState.playerGoal.height) {
        if ((gameState.ball.x - ballRadius < gameState.playerGoal.x + postWidth && gameState.ball.x + ballRadius > gameState.playerGoal.x) ||
            (gameState.ball.x + ballRadius > gameState.playerGoal.x + gameState.playerGoal.width - postWidth && gameState.ball.x - ballRadius < gameState.playerGoal.x + gameState.playerGoal.width)) {
            gameState.ball.vx *= -0.8;
            addParticles(gameState.ball.x, gameState.ball.y, '#fff');
        }
    }


    if(gameState.ball.x < gameState.ball.size){
        gameState.ball.x = gameState.ball.size;
        gameState.ball.vx *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#ffffff');
    }
    if(gameState.ball.x > canvas.width - gameState.ball.size){
        gameState.ball.x = canvas.width - gameState.ball.size;
        gameState.ball.vx *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#ffffff');
    }
    if(gameState.ball.y < gameState.ball.size){
        gameState.ball.y = gameState.ball.size;
        gameState.ball.vy *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#ffffff');
    }
    if(gameState.ball.y > canvas.height - gameState.ball.size){
        gameState.ball.y = canvas.height - gameState.ball.size;
        gameState.ball.vy *= -0.8;
        addParticles(gameState.ball.x, gameState.ball.y, '#ffffff');
    }

    gameState.particles = gameState.particles.filter(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.95;
        p.vy *= 0.95;
        p.life--;
        return p.life > 0;
    });
}

function resetBall(kicker) {
    gameState.ball.vx = 0;
    gameState.ball.vy = 0;
    if (kicker === 'player') {
        gameState.ball.x = canvas.width / 2;
        gameState.ball.y = canvas.height / 4;
    } else {
        gameState.ball.x = canvas.width / 2;
        gameState.ball.y = canvas.height - canvas.height / 4;
    }
    gameState.player.x = canvas.width / 2;
    gameState.player.y = 500;
    gameState.ai.x = canvas.width / 2;
    gameState.ai.y = 100;
}

function checkGoals(){
    const ball = gameState.ball;
    const pGoal = gameState.playerGoal;
    const aiGoal = gameState.aiGoal;
    const ballRadius = gameState.ball.size;

    if(ball.x > pGoal.x && ball.x < pGoal.x + pGoal.width && ball.y + ballRadius > pGoal.y){
        gameState.aiScore++;
        document.getElementById('aiScore').textContent = gameState.aiScore;
        resetBall('ai');
    } else if (ball.x > aiGoal.x && ball.x < aiGoal.x + aiGoal.width && ball.y - ballRadius < aiGoal.y + aiGoal.height){
        gameState.playerScore++;
        document.getElementById('playerScore').textContent = gameState.playerScore;
        resetBall('player');
    }
}

function drawGame(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    const postWidth = 12;
    const postHeight = 40;

    ctx.fillStyle = '#fff';
    ctx.fillRect(gameState.aiGoal.x, gameState.aiGoal.y, gameState.aiGoal.width, postWidth);
    ctx.fillRect(gameState.aiGoal.x, gameState.aiGoal.y + postWidth, postWidth, postHeight);
    ctx.fillRect(gameState.aiGoal.x + gameState.aiGoal.width - postWidth, gameState.aiGoal.y + postWidth, postWidth, postHeight);

    ctx.fillRect(gameState.playerGoal.x, gameState.playerGoal.y, gameState.playerGoal.width, postWidth);
    ctx.fillRect(gameState.playerGoal.x, gameState.playerGoal.y - postHeight, postWidth, postHeight);
    ctx.fillRect(gameState.playerGoal.x + gameState.playerGoal.width - postWidth, gameState.playerGoal.y - postHeight, postWidth, postHeight);

    gameState.trails.forEach(trail => {
        ctx.fillStyle = `rgba(255, 255, 255, ${trail.life / 10})`;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, gameState.ball.size * (trail.life / 10), 0, Math.PI * 2);
        ctx.fill();
    });

    gameState.particles.forEach(p => {
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;

    ctx.fillStyle = gameState.ball.color;
    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.size, 0, Math.PI * 2);
    ctx.fill();

    function drawPlayer(player) {
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(player.emoji, player.x, player.y);
    }
    drawPlayer(gameState.player);
    drawPlayer(gameState.ai);
}

function updateStats() {
    document.getElementById('playerShots').textContent = gameStats.playerShots;
    document.getElementById('ballPossessions').textContent = gameStats.ballPossessions;
    const ballSpeed = Math.sqrt(gameState?.ball.vx ** 2 + gameState?.ball.vy ** 2).toFixed(1);
    document.getElementById('ballSpeed').textContent = ballSpeed;
}

function gameLoop() {
    if(gameState.gameRunning) {
        updatePlayer();
        updateAI();
        kickBall('player');
        updateBall();
        checkGoals();
        updateStats();
        drawGame();
    }
    animationFrameId = requestAnimationFrame(gameLoop);
}

window.onload = initCharacterSelect;
