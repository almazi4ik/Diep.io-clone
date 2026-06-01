(function(){
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let gameRunning = false;
    
    // === ИГРОК (змейка) ===
    let player = {
        segments: [],
        angle: 0,
        targetAngle: 0,
        speed: 5,
        length: 10,
        color: "#6fbf4c",
        name: "Player",
        isAlive: true
    };
    
    // Еда (светящиеся точки)
    let foods = [];
    const FOOD_COUNT = 250;
    
    // Боты-змейки
    let botSnakes = [];
    const BOT_COUNT = 12;
    
    const WORLD_SIZE = 4000;
    
    let mouseX = 0, mouseY = 0;
    let camera = { x: 0, y: 0 };
    let leaderboardList = [];
    
    // === ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ===
    function random(min, max) {
        return min + Math.random() * (max - min);
    }
    
    function randomColor() {
        const hues = [90, 120, 150, 180, 210, 240, 300];
        const hue = hues[Math.floor(Math.random() * hues.length)];
        return `hsl(${hue}, 75%, 55%)`;
    }
    
    function distance(x1,y1,x2,y2){
        return Math.hypot(x1-x2, y1-y2);
    }
    
    // === ИНИЦИАЛИЗАЦИЯ ===
    function initWorld(){
        // Еда
        foods = [];
        for(let i=0;i<FOOD_COUNT;i++){
            foods.push({
                x: random(50, WORLD_SIZE-50),
                y: random(50, WORLD_SIZE-50),
                radius: 4,
                value: 1
            });
        }
        
        // Боты
        botSnakes = [];
        for(let i=0;i<BOT_COUNT;i++){
            const startX = random(300, WORLD_SIZE-300);
            const startY = random(300, WORLD_SIZE-300);
            const segments = [];
            const startAngle = random(0, Math.PI*2);
            for(let s=0;s<12;s++){
                segments.push({
                    x: startX - Math.cos(startAngle) * s * 12,
                    y: startY - Math.sin(startAngle) * s * 12
                });
            }
            botSnakes.push({
                segments: segments,
                angle: startAngle,
                speed: random(3, 4.5),
                length: random(10, 25),
                color: randomColor(),
                name: `Bot${Math.floor(Math.random()*1000)}`,
                isAlive: true
            });
        }
    }
    
    function initPlayer(nick){
        player.name = nick || "Slither";
        player.length = 12;
        player.speed = 5.2;
        player.isAlive = true;
        
        const startX = WORLD_SIZE/2;
        const startY = WORLD_SIZE/2;
        player.segments = [];
        for(let i=0;i<player.length;i++){
            player.segments.push({ x: startX - i*12, y: startY });
        }
        player.angle = 0;
        player.targetAngle = 0;
    }
    
    // === ДВИЖЕНИЕ ЗМЕЙКИ ===
    function updateSnake(snake, isPlayer){
        if(!snake.isAlive) return;
        
        // Для ботов: плавное движение к случайной цели
        if(!isPlayer){
            // Бот иногда меняет направление
            if(Math.random() < 0.02){
                snake.angle += (Math.random() - 0.5) * 1.2;
            }
            // Нормализация угла
            if(snake.angle > Math.PI*2) snake.angle -= Math.PI*2;
            if(snake.angle < 0) snake.angle += Math.PI*2;
        } else {
            // Игрок: угол от мыши
            const dx = mouseX - snake.segments[0].x;
            const dy = mouseY - snake.segments[0].y;
            snake.targetAngle = Math.atan2(dy, dx);
            // Плавный поворот
            let diff = snake.targetAngle - snake.angle;
            while(diff > Math.PI) diff -= Math.PI*2;
            while(diff < -Math.PI) diff += Math.PI*2;
            snake.angle += diff * 0.1;
        }
        
        // Движение головы
        const head = snake.segments[0];
        const newX = head.x + Math.cos(snake.angle) * snake.speed;
        const newY = head.y + Math.sin(snake.angle) * snake.speed;
        
        // Границы мира
        const boundedX = Math.min(Math.max(newX, 10), WORLD_SIZE-10);
        const boundedY = Math.min(Math.max(newY, 10), WORLD_SIZE-10);
        
        snake.segments.unshift({ x: boundedX, y: boundedY });
        
        // Обрезка хвоста
        while(snake.segments.length > snake.length){
            snake.segments.pop();
        }
        
        // Проверка столкновения с собой
        const headPos = snake.segments[0];
        for(let i=2;i<snake.segments.length;i++){
            const seg = snake.segments[i];
            if(distance(headPos.x, headPos.y, seg.x, seg.y) < 14){
                snake.isAlive = false;
                if(isPlayer){
                    alert(`💀 Вы врезались в себя! Игра перезапущена.`);
                    resetGame();
                }
                return;
            }
        }
    }
    
    // Столкновения змеек между собой
    function checkSnakeCollisions(){
        const allSnakes = [{segments: player.segments, isPlayer: true, name: player.name, color: player.color}, ...botSnakes];
        
        for(let i=0;i<allSnakes.length;i++){
            const s1 = allSnakes[i];
            if(!s1.isAlive && s1.isPlayer === undefined) continue;
            const head1 = s1.segments[0];
            
            for(let j=0;j<allSnakes.length;j++){
                if(i===j) continue;
                const s2 = allSnakes[j];
                if(!s2.isAlive && s2.isPlayer === undefined) continue;
                
                // Проверка головы s1 о тело s2
                for(let k=0;k<s2.segments.length;k++){
                    const seg = s2.segments[k];
                    if(distance(head1.x, head1.y, seg.x, seg.y) < 15){
                        // Если голова врезалась в тело — смерть
                        if(s1.isPlayer){
                            alert(`💀 Вас убила змея ${s2.name}!`);
                            resetGame();
                            return;
                        } else {
                            s1.isAlive = false;
                        }
                        break;
                    }
                }
            }
        }
        
        // Удаляем мертвых ботов и возрождаем
        for(let i=0;i<botSnakes.length;i++){
            if(!botSnakes[i].isAlive){
                // Возродить бота
                const startX = random(300, WORLD_SIZE-300);
                const startY = random(300, WORLD_SIZE-300);
                const segments = [];
                const startAngle = random(0, Math.PI*2);
                for(let s=0;s<12;s++){
                    segments.push({
                        x: startX - Math.cos(startAngle) * s * 12,
                        y: startY - Math.sin(startAngle) * s * 12
                    });
                }
                botSnakes[i] = {
                    segments: segments,
                    angle: startAngle,
                    speed: random(3, 4.5),
                    length: random(10, 25),
                    color: randomColor(),
                    name: `Bot${Math.floor(Math.random()*1000)}`,
                    isAlive: true
                };
            }
        }
    }
    
    // Еда: съедание головой
    function handleEat(){
        const head = player.segments[0];
        for(let i=0;i<foods.length;i++){
            const f = foods[i];
            if(distance(head.x, head.y, f.x, f.y) < 15){
                player.length += 1;
                player.speed = Math.max(3.2, 5.5 - (player.length / 200));
                foods.splice(i,1);
                foods.push({
                    x: random(50, WORLD_SIZE-50),
                    y: random(50, WORLD_SIZE-50),
                    radius: 4,
                    value: 1
                });
                break;
            }
        }
    }
    
    // Боты тоже едят еду
    function botsEat(){
        for(let bot of botSnakes){
            if(!bot.isAlive) continue;
            const head = bot.segments[0];
            for(let i=0;i<foods.length;i++){
                const f = foods[i];
                if(distance(head.x, head.y, f.x, f.y) < 15){
                    bot.length += 1;
                    bot.speed = Math.max(3, 4.8 - (bot.length / 200));
                    foods.splice(i,1);
                    foods.push({
                        x: random(50, WORLD_SIZE-50),
                        y: random(50, WORLD_SIZE-50),
                        radius: 4,
                        value: 1
                    });
                    break;
                }
            }
        }
    }
    
    function resetGame(){
        initPlayer(player.name);
        initWorld();
    }
    
    // === КАМЕРА ===
    function updateCamera(){
        if(!player.segments.length) return;
        const head = player.segments[0];
        camera.x = head.x - width/2;
        camera.y = head.y - height/2;
        camera.x = Math.min(Math.max(camera.x, 0), WORLD_SIZE - width);
        camera.y = Math.min(Math.max(camera.y, 0), WORLD_SIZE - height);
    }
    
    // === ЛИДЕРБОРД ===
    function updateLeaderboard(){
        let entities = [{name: player.name, length: player.length, isPlayer: true}];
        for(let bot of botSnakes){
            if(bot.isAlive){
                entities.push({name: bot.name, length: bot.length, isPlayer: false});
            }
        }
        entities.sort((a,b)=>b.length - a.length);
        leaderboardList = entities.slice(0,8);
    }
    
    // === РАДАР ===
    function drawRadar(){
        const radarSize = 130;
        const radarX = canvas.width - radarSize - 20;
        const radarY = canvas.height - radarSize - 20;
        
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.beginPath();
        ctx.rect(radarX, radarY, radarSize, radarSize);
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fill();
        ctx.strokeStyle = '#6fbf4c';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        const scale = radarSize / WORLD_SIZE;
        
        // Еда
        for(let f of foods){
            ctx.fillStyle = '#ffff88';
            ctx.beginPath();
            ctx.arc(radarX + f.x * scale, radarY + f.y * scale, 2, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Боты
        for(let bot of botSnakes){
            if(!bot.isAlive) continue;
            const head = bot.segments[0];
            ctx.fillStyle = bot.color;
            ctx.beginPath();
            ctx.arc(radarX + head.x * scale, radarY + head.y * scale, 3, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Игрок
        if(player.segments.length){
            const head = player.segments[0];
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(radarX + head.x * scale, radarY + head.y * scale, 4, 0, Math.PI*2);
            ctx.fill();
            ctx.fillStyle = '#6fbf4c';
            ctx.font = 'bold 8px monospace';
            ctx.fillText("YOU", radarX + head.x * scale - 8, radarY + head.y * scale - 5);
        }
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px monospace';
        ctx.fillText("РАДАР", radarX+5, radarY+12);
        ctx.restore();
    }
    
    // === ОТРИСОВКА ===
    function draw(){
        ctx.clearRect(0,0,width,height);
        
        // Сетка
        ctx.strokeStyle = '#2a5a4a';
        ctx.lineWidth = 0.5;
        const step = 100;
        const startX = Math.floor(camera.x/step)*step;
        const startY = Math.floor(camera.y/step)*step;
        for(let x=startX; x<camera.x+width; x+=step){
            ctx.beginPath();
            ctx.moveTo(x-camera.x, 0);
            ctx.lineTo(x-camera.x, height);
            ctx.stroke();
        }
        for(let y=startY; y<camera.y+height; y+=step){
            ctx.beginPath();
            ctx.moveTo(0, y-camera.y);
            ctx.lineTo(width, y-camera.y);
            ctx.stroke();
        }
        
        // Еда
        for(let f of foods){
            ctx.beginPath();
            ctx.arc(f.x-camera.x, f.y-camera.y, f.radius, 0, Math.PI*2);
            ctx.fillStyle = '#ffee88';
            ctx.fill();
            ctx.fillStyle = '#ffdd66';
            ctx.beginPath();
            ctx.arc(f.x-camera.x, f.y-camera.y, 2, 0, Math.PI*2);
            ctx.fill();
        }
        
        // Боты
        for(let bot of botSnakes){
            if(!bot.isAlive) continue;
            for(let i=0;i<bot.segments.length;i++){
                const seg = bot.segments[i];
                const radius = (i===0) ? 12 : 9;
                ctx.beginPath();
                ctx.arc(seg.x-camera.x, seg.y-camera.y, radius, 0, Math.PI*2);
                ctx.fillStyle = bot.color;
                ctx.fill();
                if(i===0){
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 14px Arial';
                    ctx.shadowBlur = 0;
                    ctx.fillText(bot.name, seg.x-camera.x-20, seg.y-camera.y-15);
                    // Глаза
                    ctx.fillStyle = 'black';
                    ctx.beginPath();
                    ctx.arc(seg.x-camera.x-4, seg.y-camera.y-3, 2, 0, Math.PI*2);
                    ctx.arc(seg.x-camera.x+4, seg.y-camera.y-3, 2, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        
        // Игрок
        if(player.segments.length){
            for(let i=0;i<player.segments.length;i++){
                const seg = player.segments[i];
                const radius = (i===0) ? 14 : 10;
                ctx.beginPath();
                ctx.arc(seg.x-camera.x, seg.y-camera.y, radius, 0, Math.PI*2);
                ctx.fillStyle = player.color;
                ctx.fill();
                if(i===0){
                    ctx.fillStyle = 'white';
                    ctx.font = 'bold 16px Arial';
                    ctx.fillText(player.name, seg.x-camera.x-25, seg.y-camera.y-20);
                    // Глаза
                    ctx.fillStyle = '#111';
                    ctx.beginPath();
                    ctx.arc(seg.x-camera.x-5, seg.y-camera.y-4, 2.5, 0, Math.PI*2);
                    ctx.arc(seg.x-camera.x+5, seg.y-camera.y-4, 2.5, 0, Math.PI*2);
                    ctx.fill();
                    ctx.fillStyle = 'white';
                    ctx.beginPath();
                    ctx.arc(seg.x-camera.x-5.5, seg.y-camera.y-5, 1, 0, Math.PI*2);
                    ctx.arc(seg.x-camera.x+4.5, seg.y-camera.y-5, 1, 0, Math.PI*2);
                    ctx.fill();
                }
            }
        }
        
        drawRadar();
    }
    
    function updateUI(){
        document.getElementById('playerNameDisplay').innerHTML = `🐍 ${player.name}`;
        document.getElementById('scoreDisplay').innerHTML = `📏 ДЛИНА: ${player.length}`;
        const leaderOl = document.getElementById('leaderList');
        leaderOl.innerHTML = '';
        for(let i=0;i<leaderboardList.length;i++){
            const ent = leaderboardList[i];
            const li = document.createElement('li');
            li.style.color = ent.isPlayer ? '#6fbf4c' : '#ccc';
            li.innerHTML = `${ent.name} (${ent.length})`;
            leaderOl.appendChild(li);
        }
    }
    
    // === ГЛАВНЫЙ ЦИКЛ ===
    function gameLoop(){
        if(!gameRunning) return;
        
        updateSnake(player, true);
        for(let bot of botSnakes){
            updateSnake(bot, false);
        }
        handleEat();
        botsEat();
        checkSnakeCollisions();
        updateLeaderboard();
        updateCamera();
        updateUI();
        draw();
        
        requestAnimationFrame(gameLoop);
    }
    
    function resizeCanvas(){
        width = window.innerWidth;
        height = window.innerHeight;
        canvas.width = width;
        canvas.height = height;
    }
    
    function startGame(nick){
        initPlayer(nick);
        initWorld();
        gameRunning = true;
        document.getElementById('menuOverlay').style.display = 'none';
        resizeCanvas();
        updateCamera();
        gameLoop();
    }
    
    // === СОБЫТИЯ МЫШИ ===
    function onMouseMove(e){
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rect.width;
        const scaleY = canvas.height/rect.height;
        let canvasX = (e.clientX - rect.left) * scaleX;
        let canvasY = (e.clientY - rect.top) * scaleY;
        mouseX = camera.x + canvasX;
        mouseY = camera.y + canvasY;
    }
    
    window.addEventListener('load',()=>{
        resizeCanvas();
        window.addEventListener('resize',resizeCanvas);
        canvas.addEventListener('mousemove',onMouseMove);
        document.getElementById('startBtn').addEventListener('click',()=>{
            let nick = document.getElementById('nicknameInput').value.trim();
            if(nick==="") nick = "Slither";
            startGame(nick);
        });
    });
})();
