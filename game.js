// Создаём приложение PixiJS
const app = new PIXI.Application({
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: 0x111122,
    antialias: true
});
document.body.appendChild(app.view);

// Камера, которая следует за игроком
app.stage.position.set(window.innerWidth/2, window.innerHeight/2);

// Классы игровых объектов
class Tank {
    constructor(x, y, color, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.angle = 0; // угол поворота пушки
        this.hp = 100;
        this.maxHp = 100;
        this.level = 1;
        this.score = 0;
        this.isPlayer = isPlayer;
        this.lastShot = 0;
        this.shootDelay = 500; // миллисекунд
        this.speed = 3;
        this.size = 20;
        
        // Создаём графику
        this.container = new PIXI.Container();
        
        // Корпус танка (шестиугольник как в Diep.io)
        this.body = new PIXI.Graphics();
        this.body.beginFill(color);
        this.body.drawPolygon(this.getHexagonPoints(0, 0, this.size));
        this.body.endFill();
        this.body.lineStyle(2, 0xffffff, 0.5);
        
        // Пушка
        this.cannon = new PIXI.Graphics();
        this.cannon.beginFill(0x888888);
        this.cannon.drawRect(-5, -5, 30, 10);
        this.cannon.endFill();
        
        this.container.addChild(this.body);
        this.container.addChild(this.cannon);
        this.container.x = x;
        this.container.y = y;
        
        app.stage.addChild(this.container);
    }
    
    getHexagonPoints(cx, cy, radius) {
        const points = [];
        for (let i = 0; i < 6; i++) {
            const angle = (i * 60) * Math.PI / 180;
            points.push(cx + radius * Math.cos(angle));
            points.push(cy + radius * Math.sin(angle));
        }
        return points;
    }
    
    updatePosition() {
        this.container.x = this.x;
        this.container.y = this.y;
        // Обновляем угол пушки
        this.cannon.rotation = this.angle;
    }
    
    shoot(bullets) {
        const now = Date.now();
        if (now - this.lastShot >= this.shootDelay) {
            this.lastShot = now;
            const bullet = new Bullet(
                this.x + Math.cos(this.angle) * 25,
                this.y + Math.sin(this.angle) * 25,
                this.angle,
                this.isPlayer ? 10 : 7,
                this.isPlayer
            );
            bullets.push(bullet);
            return true;
        }
        return false;
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.destroy();
            return true;
        }
        // Эффект мигания при получении урона
        this.body.alpha = 0.5;
        setTimeout(() => { this.body.alpha = 1; }, 100);
        return false;
    }
    
    destroy() {
        this.container.destroy();
    }
}

class Bullet {
    constructor(x, y, angle, damage, isPlayer = false) {
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.speed = 8;
        this.damage = damage;
        this.size = 6;
        this.isPlayer = isPlayer;
        this.life = true;
        
        this.graphic = new PIXI.Graphics();
        this.graphic.beginFill(isPlayer ? 0xffaa44 : 0xff4444);
        this.graphic.drawCircle(0, 0, this.size);
        this.graphic.endFill();
        this.graphic.x = x;
        this.graphic.y = y;
        app.stage.addChild(this.graphic);
    }
    
    update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.graphic.x = this.x;
        this.graphic.y = this.y;
        
        // Исчезаем за пределами карты
        if (Math.abs(this.x) > 3000 || Math.abs(this.y) > 3000) {
            this.destroy();
            return false;
        }
        return true;
    }
    
    destroy() {
        this.life = false;
        this.graphic.destroy();
    }
}

class Square { // Квадраты для прокачки (как в Diep.io)
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 15;
        this.hp = 30;
        
        this.graphic = new PIXI.Graphics();
        this.graphic.beginFill(0x88ff88);
        this.graphic.drawRect(-this.size/2, -this.size/2, this.size, this.size);
        this.graphic.endFill();
        this.graphic.x = x;
        this.graphic.y = y;
        app.stage.addChild(this.graphic);
    }
    
    takeDamage(amount) {
        this.hp -= amount;
        if (this.hp <= 0) {
            this.destroy();
            return true;
        }
        return false;
    }
    
    destroy() {
        this.graphic.destroy();
    }
}

// Управление игроком
const keys = {};
document.addEventListener('keydown', (e) => keys[e.key] = true);
document.addEventListener('keyup', (e) => keys[e.key] = false);

// Мышь для наведения
let mouseX = 0, mouseY = 0;
app.view.addEventListener('mousemove', (e) => {
    const rect = app.view.getBoundingClientRect();
    mouseX = e.clientX - rect.left - window.innerWidth/2;
    mouseY = e.clientY - rect.top - window.innerHeight/2;
});

// Игровые объекты
let player = null;
let enemies = [];
let bullets = [];
let squares = [];

// Создание игрока
function createPlayer() {
    player = new Tank(0, 0, 0x44aaff, true);
}

// Создание врага
function createEnemy() {
    const x = (Math.random() - 0.5) * 2000;
    const y = (Math.random() - 0.5) * 2000;
    const enemy = new Tank(x, y, 0xff4444, false);
    enemies.push(enemy);
    return enemy;
}

// Создание квадрата
function createSquare() {
    const x = (Math.random() - 0.5) * 2500;
    const y = (Math.random() - 0.5) * 2500;
    const square = new Square(x, y);
    squares.push(square);
}

// ИИ для врагов
function updateEnemies() {
    enemies.forEach(enemy => {
        if (!enemy.container.parent) return;
        
        // Вектор к игроку
        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < 300) {
            // Атакуем игрока
            const angleToPlayer = Math.atan2(dy, dx);
            enemy.angle = angleToPlayer;
            enemy.shoot(bullets);
            
            // Немного отступаем от игрока
            if (dist < 150) {
                enemy.x -= (dx / dist) * 2;
                enemy.y -= (dy / dist) * 2;
            } else {
                enemy.x += (dx / dist) * enemy.speed * 0.5;
                enemy.y += (dy / dist) * enemy.speed * 0.5;
            }
        } else {
            // Случайное движение
            enemy.x += (Math.random() - 0.5) * 2;
            enemy.y += (Math.random() - 0.5) * 2;
            // Случайная стрельба
            if (Math.random() < 0.02) {
                enemy.angle = Math.random() * Math.PI * 2;
                enemy.shoot(bullets);
            }
        }
        
        enemy.updatePosition();
    });
}

// Обновление игрока
function updatePlayer() {
    let moveX = 0, moveY = 0;
    if (keys['w'] || keys['ArrowUp']) moveY -= 1;
    if (keys['s'] || keys['ArrowDown']) moveY += 1;
    if (keys['a'] || keys['ArrowLeft']) moveX -= 1;
    if (keys['d'] || keys['ArrowRight']) moveX += 1;
    
    if (moveX !== 0 || moveY !== 0) {
        const len = Math.hypot(moveX, moveY);
        moveX /= len;
        moveY /= len;
        player.x += moveX * player.speed;
        player.y += moveY * player.speed;
    }
    
    // Наведение пушки на мышь
    player.angle = Math.atan2(mouseY, mouseX);
    
    // Стрельба по клику
    if (keys[' '] || keys['Shift'] || keys['Control']) {
        player.shoot(bullets);
    }
    
    player.updatePosition();
    
    // Обновление камеры
    app.stage.x = -player.x + window.innerWidth/2;
    app.stage.y = -player.y + window.innerHeight/2;
}

// Проверка столкновений
function checkCollisions() {
    // Пули с игроком
    bullets = bullets.filter(bullet => {
        if (!bullet.life) return false;
        
        if (bullet.isPlayer) {
            // Пули игрока по врагам
            for (let i = 0; i < enemies.length; i++) {
                const enemy = enemies[i];
                if (!enemy.container.parent) continue;
                
                const dist = Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y);
                if (dist < 25) {
                    if (enemy.takeDamage(bullet.damage)) {
                        // Убил врага
                        enemies.splice(i, 1);
                        player.score += 100;
                        updateUI();
                        createEnemy(); // Создаём нового врага
                        // Шанс прокачки
                        if (player.score >= player.level * 200) {
                            player.level++;
                            player.maxHp += 20;
                            player.hp = player.maxHp;
                            player.speed += 0.5;
                            updateUI();
                        }
                    }
                    bullet.destroy();
                    return false;
                }
            }
            
            // Пули игрока по квадратам
            for (let i = 0; i < squares.length; i++) {
                const square = squares[i];
                const dist = Math.hypot(bullet.x - square.x, bullet.y - square.y);
                if (dist < 15) {
                    if (square.takeDamage(bullet.damage)) {
                        squares.splice(i, 1);
                        player.score += 50;
                        updateUI();
                        createSquare(); // Новый квадрат на карте
                    }
                    bullet.destroy();
                    return false;
                }
            }
        } else {
            // Пули врагов по игроку
            const dist = Math.hypot(bullet.x - player.x, bullet.y - player.y);
            if (dist < 25) {
                if (player.takeDamage(bullet.damage)) {
                    // Игрок умер
                    resetGame();
                }
                bullet.destroy();
                return false;
            }
        }
        
        return bullet.update();
    });
}

function updateUI() {
    document.getElementById('level').textContent = player.level;
    document.getElementById('score').textContent = player.score;
    document.getElementById('hp').textContent = Math.max(0, player.hp);
}

function resetGame() {
    // Пересоздаём игрока
    if (player.container) player.container.destroy();
    createPlayer();
    // Сбрасываем врагов и квадраты
    enemies.forEach(e => e.container.destroy());
    squares.forEach(s => s.graphic.destroy());
    enemies = [];
    squares = [];
    // Создаём заново
    for (let i = 0; i < 5; i++) createEnemy();
    for (let i = 0; i < 20; i++) createSquare();
    updateUI();
}

// Инициализация игры
function init() {
    createPlayer();
    for (let i = 0; i < 5; i++) createEnemy();
    for (let i = 0; i < 20; i++) createSquare();
    
    // Игровой цикл
    app.ticker.add(() => {
        if (player && player.container.parent) {
            updatePlayer();
            updateEnemies();
            checkCollisions();
            
            // Автоматическая стрельба для удобства
            if (Math.random() < 0.1) {
                player.shoot(bullets);
            }
        }
    });
}

init();
