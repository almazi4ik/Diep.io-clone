(function(){
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    let width, height;
    let animationId;
    let gameRunning = false;
    
    // Игрок
    let player = {
        x: 0, y: 0,
        radius: 30,
        mass: 30,
        color: '#ff3366',
        name: 'Player'
    };
    
    let mouseX = 0, mouseY = 0;
    
    // Мир
    let foods = [];
    let bots = [];
    const FOOD_COUNT = 180;
    const BOT_COUNT = 25;
    const WORLD_SIZE = 5000;
    
    // Камера
    let camera = { x: 0, y: 0 };
    
    // Лидерборд
    let leaderboardList = [];
    
    // === UTILS ===
    function random(min, max) {
        return min + Math.random() * (max - min);
    }
    
    function randomColor() {
        const hue = Math.random() * 360;
        return `hsl(${hue}, 70%, 55%)`;
    }
    
    function distance(x1,y1,x2,y2){
        const dx = x1-x2;
        const dy = y1-y2;
        return Math.hypot(dx,dy);
    }
    
    // === ИНИЦИАЛИЗАЦИЯ МИРА ===
    function initWorld(){
        foods = [];
        for(let i=0;i<FOOD_COUNT;i++){
            foods.push({
                x: random(100, WORLD_SIZE-100),
                y: random(100, WORLD_SIZE-100),
                radius: 6,
                mass: 6,
                color: '#ffcc44'
            });
        }
        
        bots = [];
        for(let i=0;i<BOT_COUNT;i++){
            bots.push({
                x: random(200, WORLD_SIZE-200),
                y: random(200, WORLD_SIZE-200),
                radius: 22,
                mass: 22,
                color: randomColor(),
                name: `Bot${Math.floor(Math.random()*1000)}`,
                vx: (Math.random() - 0.5)*1.2,
                vy: (Math.random() - 0.5)*1.2
            });
        }
    }
    
    // Съедание еды игроком
    function handleEat(){
        for(let i=0;i<foods.length;i++){
            const f = foods[i];
            const dist = distance(player.x, player.y, f.x, f.y);
            if(dist < player.radius + f.radius){
                player.mass += f.mass;
                player.radius = Math.sqrt(player.mass) * 1.5;
                foods.splice(i,1);
                foods.push({
                    x: random(100, WORLD_SIZE-100),
                    y: random(100, WORLD_SIZE-100),
                    radius: 6,
                    mass: 6,
                    color: '#ffcc44'
                });
                break;
            }
        }
    }
    
    // Боты едят еду
    function botsEat(){
        for(let bot of bots){
            for(let i=0;i<foods.length;i++){
                const f = foods[i];
                const dist = distance(bot.x, bot.y, f.x, f.y);
                if(dist < bot.radius + f.radius){
                    bot.mass += f.mass;
                    bot.radius = Math.sqrt(bot.mass) * 1.5;
                    foods.splice(i,1);
                    foods.push({
                        x: random(100, WORLD_SIZE-100),
                        y: random(100, WORLD_SIZE-100),
                        radius: 6,
                        mass: 6,
                        color: '#ffcc44'
                    });
                    break;
                }
            }
        }
    }
    
    // Боты едят друг друга и игрока
    function checkEatBetween(){
        // бот ест бота (если радиус на 15% больше)
        for(let i=0;i<bots.length;i++){
            for(let j=0;j<bots.length;j++){
                if(i===j) continue;
                const b1 = bots[i];
                const b2 = bots[j];
                const dist = distance(b1.x,b1.y,b2.x,b2.y);
                if(dist < b1.radius + b2.radius){
                    if(b1.radius > b2.radius * 1.15){
                        b1.mass += b2.mass;
                        b1.radius = Math.sqrt(b1.mass) * 1.5;
                        bots.splice(j,1);
                        break;
                    } else if(b2.radius > b1.radius * 1.15){
                        b2.mass += b1.mass;
                        b2.radius = Math.sqrt(b2.mass) * 1.5;
                        bots.splice(i,1);
                        break;
                    } else {
                        // отталкивание
                        const angle = Math.atan2(b2.y-b1.y, b2.x-b1.x);
                        const force = 2;
                        b1.x -= Math.cos(angle)*force;
                        b1.y -= Math.sin(angle)*force;
                        b2.x += Math.cos(angle)*force;
                        b2.y += Math.sin(angle)*force;
                    }
                }
            }
        }
        
        // игрок ест ботов
        for(let i=0;i<bots.length;i++){
            const bot = bots[i];
            const dist = distance(player.x, player.y, bot.x, bot.y);
            if(dist < player.radius + bot.radius){
                if(player.radius > bot.radius * 1.15){
                    player.mass += bot.mass;
                    player.radius = Math.sqrt(player.mass) * 1.5;
                    bots.splice(i,1);
                    bots.push({
                        x: random(200, WORLD_SIZE-200),
                        y: random(200, WORLD_SIZE-200),
                        radius: 22,
                        mass: 22,
                        color: randomColor(),
                        name: `Bot${Math.floor(Math.random()*1000)}`,
                        vx: (Math.random() - 0.5)*1.2,
                        vy: (Math.random() - 0.5)*1.2
                    });
                    break;
                } else if(bot.radius > player.radius * 1.15){
                    // бот съел игрока — перезапуск
                    alert(`Вас съел ${bot.name}! Игра перезапущена.`);
                    resetGame();
                    return;
                } else {
                    // упругое столкновение
                    const angle = Math.atan2(bot.y-player.y, bot.x-player.x);
                    const force = 2.5;
                    player.x -= Math.cos(angle)*force;
                    player.y -= Math.sin(angle)*force;
                    bot.x += Math.cos(angle)*force;
                    bot.y += Math.sin(angle)*force;
                }
            }
        }
    }
    
    function resetGame(){
        player.mass = 30;
        player.radius = 30;
        player.x = WORLD_SIZE/2;
        player.y = WORLD_SIZE/2;
        initWorld();
    }
    
    // Движение ботов (к еде или случайно)
    function updateBots(){
        for(let bot of bots){
            // ищем ближайшую еду
            let closest = null;
            let minDist = Infinity;
            for(let f of foods){
                const d = distance(bot.x,bot.y,f.x,f.y);
                if(d<minDist){
                    minDist = d;
                    closest = f;
                }
            }
            if(closest){
                const angle = Math.atan2(closest.y-bot.y, closest.x-bot.x);
                const speed = Math.min(3.5, 120 / bot.mass);
                bot.vx += Math.cos(angle) * 0.2;
                bot.vy += Math.sin(angle) * 0.2;
                // ограничение скорости
                const maxSpeed = Math.min(6, 280 / bot.mass);
                if(Math.abs(bot.vx) > maxSpeed) bot.vx = bot.vx>0?maxSpeed:-maxSpeed;
                if(Math.abs(bot.vy) > maxSpeed) bot.vy = bot.vy>0?maxSpeed:-maxSpeed;
            }
            bot.x += bot.vx;
            bot.y += bot.vy;
            // границы мира
            bot.x = Math.min(Math.max(bot.x, 20), WORLD_SIZE-20);
            bot.y = Math.min(Math.max(bot.y, 20), WORLD_SIZE-20);
            if(bot.x<=20 || bot.x>=WORLD_SIZE-20) bot.vx *= -0.8;
            if(bot.y<=20 || bot.y>=WORLD_SIZE-20) bot.vy *= -0.8;
        }
    }
    
    // Движение игрока за мышью
    function updatePlayer(){
        if(!gameRunning) return;
        const dx = mouseX - player.x;
        const dy = mouseY - player.y;
        const len = Math.hypot(dx,dy);
        if(len > 0.01){
            const speed = Math.min(9, 280 / player.mass);
            const move = Math.min(speed, len);
            player.x += (dx/len)*move;
            player.y += (dy/len)*move;
        }
        // границы
        player.x = Math.min(Math.max(player.x, 20), WORLD_SIZE-20);
        player.y = Math.min(Math.max(player.y, 20), WORLD_SIZE-20);
    }
    
    // Обновление лидерборда
    function updateLeaderboard(){
        let entities = [{name: player.name, mass: Math.floor(player.mass), isPlayer:true}];
        for(let bot of bots){
            entities.push({name: bot.name, mass: Math.floor(bot.mass), isPlayer:false});
        }
        entities.sort((a,b)=>b.mass - a.mass);
        leaderboardList = entities.slice(0,8);
    }
    
    // Рендер радара (в правом нижнем углу)
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
        ctx.strokeStyle = '#0af';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // Преобразование мировых координат в радар
        const scale = radarSize / WORLD_SIZE;
        
        // еда
        for(let f of foods){
            ctx.fillStyle = '#ffaa33';
            ctx.beginPath();
            const rx = radarX + f.x * scale;
            const ry = radarY + f.y * scale;
            ctx.arc(rx, ry, 2, 0, Math.PI*2);
            ctx.fill();
        }
        // боты
        for(let bot of bots){
            ctx.fillStyle = bot.color;
            ctx.beginPath();
            const rx = radarX + bot.x * scale;
            const ry = radarY + bot.y * scale;
            ctx.arc(rx, ry, 3, 0, Math.PI*2);
            ctx.fill();
        }
        // игрок
        ctx.fillStyle = '#ff3366';
        ctx.beginPath();
        const px = radarX + player.x * scale;
        const py = radarY + player.y * scale;
        ctx.arc(px, py, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 10px monospace';
        ctx.fillText("РАДАР", radarX+5, radarY+12);
        ctx.restore();
    }
    
    // Камера
    function updateCamera(){
        camera.x = player.x - width/2;
        camera.y = player.y - height/2;
        camera.x = Math.min(Math.max(camera.x, 0), WORLD_SIZE - width);
        camera.y = Math.min(Math.max(camera.y, 0), WORLD_SIZE - height);
    }
    
    // Отрисовка мира
    function draw(){
        if(!ctx) return;
        ctx.clearRect(0,0,width,height);
        
        // сетка
        ctx.strokeStyle = '#333';
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
        
        // еда
        for(let f of foods){
            ctx.beginPath();
            ctx.arc(f.x-camera.x, f.y-camera.y, f.radius, 0, Math.PI*2);
            ctx.fillStyle = f.color;
            ctx.fill();
        }
        // боты
        for(let bot of bots){
            ctx.beginPath();
            ctx.arc(bot.x-camera.x, bot.y-camera.y, bot.radius, 0, Math.PI*2);
            ctx.fillStyle = bot.color;
            ctx.fill();
            ctx.strokeStyle = '#111';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.fillStyle = 'white';
            ctx.font = `${Math.max(10, Math.floor(bot.radius/3))}px Arial`;
            ctx.shadowBlur = 0;
            ctx.fillText(bot.name, bot.x-camera.x - bot.radius/2, bot.y-camera.y - bot.radius/2);
        }
        // игрок
        ctx.beginPath();
        ctx.arc(player.x-camera.x, player.y-camera.y, player.radius, 0, Math.PI*2);
        ctx.fillStyle = player.color;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = 'white';
        ctx.font = `bold ${Math.max(14, Math.floor(player.radius/3))}px Arial`;
        ctx.fillText(player.name, player.x-camera.x - player.radius/2, player.y-camera.y - player.radius/2);
        
        drawRadar();
    }
    
    function updateUI(){
        document.getElementById('playerNameDisplay').innerHTML = `👤 ${player.name}`;
        document.getElementById('scoreDisplay').innerHTML = `🍎 MASS: ${Math.floor(player.mass)}`;
        const leaderOl = document.getElementById('leaderList');
        leaderOl.innerHTML = '';
        for(let i=0;i<leaderboardList.length;i++){
            const ent = leaderboardList[i];
            const li = document.createElement('li');
            li.style.color = ent.isPlayer ? '#ffaa66' : '#ccc';
            li.innerHTML = `${ent.name} (${ent.mass})`;
            leaderOl.appendChild(li);
        }
    }
    
    function gameLoop(){
        if(!gameRunning) return;
        updatePlayer();
        handleEat();
        botsEat();
        updateBots();
        checkEatBetween();
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
        player.name = nick || "Player";
        player.mass = 30;
        player.radius = 30;
        player.x = WORLD_SIZE/2;
        player.y = WORLD_SIZE/2;
        player.color = '#ff5566';
        
        initWorld();
        mouseX = player.x;
        mouseY = player.y;
        gameRunning = true;
        document.getElementById('menuOverlay').style.display = 'none';
        resizeCanvas();
        updateCamera();
        gameLoop();
    }
    
    // События мыши
    function onMouseMove(e){
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width/rect.width;
        const scaleY = canvas.height/rect.height;
        let canvasX = (e.clientX - rect.left)*scaleX;
        let canvasY = (e.clientY - rect.top)*scaleY;
        mouseX = camera.x + canvasX;
        mouseY = camera.y + canvasY;
    }
    
    window.addEventListener('load',()=>{
        resizeCanvas();
        window.addEventListener('resize',resizeCanvas);
        canvas.addEventListener('mousemove',onMouseMove);
        document.getElementById('startBtn').addEventListener('click',()=>{
            let nick = document.getElementById('nicknameInput').value.trim();
            if(nick==="") nick = "Guest";
            startGame(nick);
        });
    });
})();
