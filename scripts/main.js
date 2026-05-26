/* --- Global Game Systems & State --- */
let canvas;
let ctx;
let ASSET_MANAGER;
let game;
let playSound = true;

// Globals for asset paths
const backgroundImage = 'assets/image/starfield.png';
const bullet = 'assets/image/laserRed16.png';
const batttleship = 'assets/image/playerShip1_orange.png';
const meteorBig1 = 'assets/image/meteorBrown_big1.png';
const meteorBig2 = 'assets/image/meteorBrown_big2.png';
const meteorMedium1 = 'assets/image/meteorBrown_med1.png';
const meteorMedium3 = 'assets/image/meteorBrown_med3.png';
const meteorSmall1 = 'assets/image/meteorBrown_small1.png';
const meteorSmall2 = 'assets/image/meteorBrown_small2.png';
const meteorTiny1 = 'assets/image/meteorBrown_tiny1.png';

const pew = 'assets/sound/pew.wav';
const backgroundMusic = 'assets/sound/tgfcoder-FrozenJam-SeamlessLoop.ogg';
const expl6 = 'assets/sound/expl6.wav';

// Predefined asset dimensions in case assets are still loading on-demand
const SHIP_FALLBACK_WIDTH = 112;
const SHIP_FALLBACK_HEIGHT = 75;
const METEOR_FALLBACK_SIZE = 60;
const BULLET_FALLBACK_WIDTH = 9;
const BULLET_FALLBACK_HEIGHT = 37;

// RequestAnimationFrame Polyfill
window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame  ||
    window.mozRequestAnimationFrame     ||
    window.oRequestAnimationFrame       ||
    window.msRequestFrame               ||
    function(callback) {
        window.setTimeout(callback, 1000/60);
    };
})();

/* --- Asset Manager with Preload Resilience --- */
function AssetManager() {
    this.successCount = 0;
    this.errorCount = 0;
    this.downloadQueue = [];
    this.soundQueue = [];
    this.cache = {};
}

AssetManager.prototype.queueDownload = function(path) {
    this.downloadQueue.push(path);
}

AssetManager.prototype.queueSound = function(path) {
    this.soundQueue.push(path);
}

AssetManager.prototype.downloadSounds = function(downloadCallback) {
    if (this.soundQueue.length === 0) return;
    
    for (let i = 0; i < this.soundQueue.length; i++) {
        let path = this.soundQueue[i];
        let sound = new Audio();
        let that = this;

        // Modern browsers block autoplay or defer preload on local systems.
        // Listen to multiple event states to be resilient.
        let onSoundLoad = function() {
            if (that.cache[path] && !that.cache[path].loaded) {
                that.cache[path].loaded = true;
                that.successCount++;
                if (that.isDone()) {
                    downloadCallback();
                }
            }
        };

        sound.addEventListener('canplaythrough', onSoundLoad, false);
        sound.addEventListener('canplay', onSoundLoad, false);
        sound.addEventListener('loadeddata', onSoundLoad, false);
        
        sound.addEventListener('error', function() {
            that.errorCount++;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);

        sound.src = path;
        sound.load(); // Explicitly request loading
        this.cache[path] = sound;
    }
}

AssetManager.prototype.downloadAll = function(downloadCallback) {
    if (this.downloadQueue.length === 0 && this.soundQueue.length === 0) {
        downloadCallback();
        return;
    }

    // Ensure the callback is only called exactly ONCE
    let callbackTriggered = false;
    let safeCallback = function() {
        if (!callbackTriggered) {
            callbackTriggered = true;
            downloadCallback();
        }
    };

    // Resilient preloading safety timeout:
    // If the browser blocks canplaythrough (common on file:// or strict policies),
    // start the game after 1.2 seconds anyway, letting media load on-demand.
    setTimeout(safeCallback, 1200);

    this.downloadSounds(safeCallback);
    
    for (let i = 0; i < this.downloadQueue.length; i++) {
        let path = this.downloadQueue[i];
        let img = new Image();
        let that = this;

        img.addEventListener('load', function() {
            that.successCount++;
            if (that.isDone()) {
                safeCallback();
            }
        }, false);

        img.addEventListener('error', function() {
            that.errorCount++;
            if (that.isDone()) {
                safeCallback();
            }
        }, false);

        img.src = path;
        this.cache[path] = img;
    }
}

AssetManager.prototype.isDone = function() {
    return (this.downloadQueue.length + this.soundQueue.length 
        == this.successCount + this.errorCount);
}

AssetManager.prototype.getAsset = function(path) {
    return this.cache[path];
}

/* --- Helper Math functions --- */
function radius(width, height) {
    return Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)) / 2;
}

function randomInt(start, end) {
    return start + Math.floor(Math.random() * (end - start));
}

function randomFloat(start, end) {
    return start + Math.random() * (end - start);
}

function returnAsset(src) {
    return ASSET_MANAGER.getAsset(src);
}

/* --- Engine Core Timer --- */
function Timer() {
    this.gameTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimeStamp = Date.now();
}

Timer.prototype.tick = function() {
    let wallCurrent = Date.now();
    let wallDelta = (wallCurrent - this.wallLastTimeStamp) / 1000;
    this.wallLastTimeStamp = wallCurrent;

    let gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}

/* --- Game Engine --- */
function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.touch = null;
    this.mouse = null;
    this.timer = new Timer();
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.halfSurfaceWidth = null;
    this.halfSurfaceHeight = null;
    this.showOutlines = false;
    this.state = 'menu'; // 'menu' | 'playing' | 'gameover'
}

GameEngine.prototype.startInput = function() {
    let that = this;

    let getXandY = function(e) {
        let rect = that.ctx.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        let y = e.clientY - rect.top;
        return {x: x, y: y};
    }

    this.ctx.canvas.addEventListener('mousemove', function(e) {
        that.mouse = getXandY(e);
    }, false);

    this.ctx.canvas.addEventListener('touchmove', function(e) {
        if (e.touches && e.touches[0]) {
            let rect = that.ctx.canvas.getBoundingClientRect();
            that.touch = {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
            that.mouse = that.touch;
        }
        e.preventDefault();
    }, {passive: false});
}

GameEngine.prototype.init = function(ctx) {
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.halfSurfaceWidth = this.surfaceWidth/2;
    this.halfSurfaceHeight = this.surfaceHeight/2;
    this.startInput();
}

GameEngine.prototype.start = function() {
    let that = this;
    (function gameLoop() {
        that.loop();
        requestAnimationFrame(gameLoop, that.ctx.canvas);
    })();
}

GameEngine.prototype.addEntity = function(entity) {
    this.entities.push(entity);
}

GameEngine.prototype.draw = function(callback) {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    let bg = ASSET_MANAGER.getAsset(backgroundImage);
    if (bg) {
        this.ctx.drawImage(bg, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    for (let i = 0; i < this.entities.length; i++) {
        if (this.entities[i]) {
            this.entities[i].draw(this.ctx);
        }
    }
    if (callback) {
        callback(this);
    }
}

GameEngine.prototype.update = function() {
    let entitiesCount = this.entities.length;
    for (let i = 0; i < entitiesCount; i++) {
        let entity = this.entities[i];
        if (entity && !entity.removeFromWorld) {
            entity.update();
        }
    }

    for (let i = this.entities.length - 1; i >= 0; --i) {
        if (this.entities[i] && this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function() {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.click = null;
}

/* --- Base Entity --- */
function Entity(game, x, y, radius) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.removeFromWorld = false;
}

Entity.prototype.update = function() {}

Entity.prototype.draw = function() {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "cyan";
        ctx.arc(this.x + this.radius + 1, this.y + this.radius + 1, this.radius, 0, Math.PI*2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.drawSpriteCentered = function(ctx) {
    if (this.sprite && this.x && this.y) {
        let w = this.sprite.width || this.width || 50;
        let h = this.sprite.height || this.height || 50;
        let x = this.x - w/2;
        let y = this.y - h/2;
        ctx.drawImage(this.sprite, x, y);
    }
}

Entity.prototype.outsideOfScreen = function(width, height) {
    return (this.x > this.game.surfaceWidth + width || this.x < -width ||
    this.y > this.game.surfaceHeight + height || this.y < -height);
}

Entity.prototype.rotateAndCache = function(image, angle) {
    let offscreenCanvas = document.createElement('canvas');
    let imgW = image.width || this.width || METEOR_FALLBACK_SIZE;
    let imgH = image.height || this.height || METEOR_FALLBACK_SIZE;
    let size = Math.max(imgW, imgH) * 1.5; 
    
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    let offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size/2, size/2);
    offscreenCtx.rotate(angle * Math.PI/180);
    offscreenCtx.translate(-imgW/2, -imgH/2);
    offscreenCtx.drawImage(image, 0, 0, imgW, imgH);
    offscreenCtx.restore();
    return offscreenCanvas;
}

/* --- Interceptor Ship --- */
function Ship(game) {
    this.sprite = ASSET_MANAGER.getAsset(batttleship);
    
    // Safety check fallback dimensions in case assets load on-demand
    let spriteW = this.sprite ? this.sprite.width : 0;
    let spriteH = this.sprite ? this.sprite.height : 0;
    this.width = spriteW ? spriteW * 0.5 : SHIP_FALLBACK_WIDTH * 0.5;
    this.height = spriteH ? spriteH * 0.5 : SHIP_FALLBACK_HEIGHT * 0.5;
    
    this.x = game.ctx.canvas.width/2 - this.width/2;
    this.y = game.ctx.canvas.height - this.height - 20;
    this.radius = radius(this.width, this.height) * 0.7; 
    
    Entity.call(this, game, this.x, this.y, this.radius);
    this.bulletTicks = 0;

    this.meteors = [];
    this.meteorTicks = 0;
    this.bullets = [];
}

Ship.prototype = new Entity();
Ship.prototype.constructor = Ship;

Ship.prototype.update = function() {
    if (this.game.mouse) {
        this.x = this.game.mouse.x - this.width/2;
    }
    
    if (this.x < 0) {
        this.x = 0;
    }
    if (this.x + this.width > this.game.ctx.canvas.width) {
        this.x = this.game.ctx.canvas.width - this.width;
    }

    this.bulletTicks += this.game.clockTick;
    if (this.bulletTicks > 0.3) { 
        this.bulletTicks = 0;
        this.shoot();
    }

    this.meteorTicks += this.game.clockTick;
    if (this.meteorTicks > 0.8) { 
        this.meteorTicks = 0;
        this.addMeteor();
    }

    this.checkForCollision();
}

Ship.prototype.draw = function(ctx) {
    Entity.prototype.draw.call(this);
    if (this.sprite) {
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    }
}

Ship.prototype.shoot = function() {
    let bulletObj = new Bullet(this.game, this);
    this.game.addEntity(bulletObj);
    this.bullets.push(bulletObj);
    
    if (playSound) {
        let a = returnAsset(pew);
        if (a) {
            a.volume = 0.2;
            a.currentTime = 0;
            a.play().catch(() => {}); // Prevent browser console warnings
        }
    }
}

Ship.prototype.addMeteor = function() {
    let m = new Meteor(this.game);
    this.game.addEntity(m);
    this.meteors.push(m);
}

Ship.prototype.removeMeteors = function() {
    for (let i = this.meteors.length - 1; i >= 0; i--) {
        if (this.meteors[i].removeFromWorld || this.meteors[i].outsideOfScreen()) {
            this.meteors.splice(i, 1);
        }
    }
}

Ship.prototype.removeBullets = function() {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
        if (this.bullets[i].removeFromWorld || this.bullets[i].outsideOfScreen()) {
            this.bullets.splice(i, 1);
        }
    }
}

Ship.prototype.checkForCollision = function() {
    this.removeBullets();
    this.removeMeteors();
    
    // 1. Bullets vs Meteors
    for (let i = 0; i < this.meteors.length; i++) {
        let met = this.meteors[i];
        if (!met || met.removeFromWorld) continue;

        for (let j = 0; j < this.bullets.length; j++) {
            let bul = this.bullets[j];
            if (!bul || bul.removeFromWorld) continue;

            let bulletX = bul.x;
            let bulletY = bul.y;
            let bulletWidth = bul.width;

            let meteorX = met.x;
            let meteorY = met.y;
            let meteorWidth = met.width;
            let meteorHeight = met.height;

            if (bulletX + bulletWidth > meteorX && bulletX < meteorX + meteorWidth &&
                bulletY < meteorY + meteorHeight && bulletY > meteorY) {
                
                met.removeFromWorld = true;
                bul.removeFromWorld = true;
                
                this.game.spawnExplosion(meteorX + meteorWidth/2, meteorY + meteorHeight/2, '#00f0ff', 15);
                
                this.meteors.splice(i, 1);
                this.bullets.splice(j, 1);
                
                this.game.score += 10;
                
                if (playSound) {
                    let snd = returnAsset(expl6);
                    if (snd) {
                        snd.currentTime = 0;
                        snd.volume = 0.35;
                        snd.play().catch(() => {});
                    }
                }
                
                i--;
                break; 
            }
        }
    }
    
    // 2. Ship vs Meteors
    let shipCenterX = this.x + this.width / 2;
    let shipCenterY = this.y + this.height / 2;
    
    for (let i = 0; i < this.meteors.length; i++) {
        let met = this.meteors[i];
        if (!met || met.removeFromWorld) continue;
        
        let metCenterX = met.x + met.width / 2;
        let metCenterY = met.y + met.height / 2;
        
        let dx = shipCenterX - metCenterX;
        let dy = shipCenterY - metCenterY;
        let dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < this.radius + met.radius) {
            met.removeFromWorld = true;
            this.meteors.splice(i, 1);
            
            this.game.spawnExplosion(metCenterX, metCenterY, '#ff7b00', 30);
            this.game.lives--;
            
            if (playSound) {
                let snd = returnAsset(expl6);
                if (snd) {
                    snd.currentTime = 0;
                    snd.volume = 0.6;
                    snd.play().catch(() => {});
                }
            }
            
            if (this.game.lives <= 0) {
                this.game.gameOver();
            }
            
            i--;
        }
    }
}

/* --- Falling Meteor Interceptors --- */
function Meteor(game) {
    this.meteors = [
        returnAsset(meteorBig1),
        returnAsset(meteorBig2),
        returnAsset(meteorMedium1),
        returnAsset(meteorMedium3),
        returnAsset(meteorSmall1),
        returnAsset(meteorSmall2),
        returnAsset(meteorTiny1)
    ];

    this.realSprite = this.meteors[randomInt(0, this.meteors.length)] || new Image();
    this.sprite = this.realSprite;
    
    this.angle = 0;
    this.speedOfSpinning = randomInt(1, 6);

    let spriteW = this.sprite ? this.sprite.width : 0;
    let spriteH = this.sprite ? this.sprite.height : 0;
    this.width = spriteW ? spriteW : METEOR_FALLBACK_SIZE;
    this.height = spriteH ? spriteH : METEOR_FALLBACK_SIZE;

    this.x = randomInt(0, game.ctx.canvas.width - this.width);
    this.y = -this.height;
    this.radius = radius(this.width, this.height) * 0.75; 
    
    Entity.call(this, game, this.x, this.y, this.radius);

    this.xMove = randomFloat(-0.8, 0.8);
    this.yMove = randomFloat(1.5, 3.5); 
}

Meteor.prototype = new Entity();
Meteor.prototype.constructor = Meteor;

Meteor.prototype.update = function() {
    if (this.outsideOfScreen()) {
        this.removeFromWorld = true;
    } else {
        this.sprite = this.rotateAndCache(this.realSprite, this.angle);
        this.angle = (this.angle + this.speedOfSpinning) % 360;
        this.x += this.xMove;
        this.y += this.yMove;
    }
}

Meteor.prototype.draw = function(ctx) {
    Entity.prototype.draw.call(this);
    let sprW = this.sprite ? this.sprite.width : this.width;
    let sprH = this.sprite ? this.sprite.height : this.height;
    let drawX = this.x + this.width/2 - sprW/2;
    let drawY = this.y + this.height/2 - sprH/2;
    if (this.sprite) {
        ctx.drawImage(this.sprite, drawX, drawY);
    }
}

Meteor.prototype.outsideOfScreen = function() {
    return (this.x > this.game.surfaceWidth || this.x + this.width < 0 ||
        this.y > this.game.surfaceHeight);
}

/* --- Plasma Lasers --- */
function Bullet(game, ship) {
    this.ship = ship;
    this.fired = true;
    this.sprite = ASSET_MANAGER.getAsset(bullet);

    let spriteW = this.sprite ? this.sprite.width : 0;
    let spriteH = this.sprite ? this.sprite.height : 0;
    this.width = spriteW ? spriteW * 0.7 : BULLET_FALLBACK_WIDTH;
    this.height = spriteH ? spriteH * 0.4 : BULLET_FALLBACK_HEIGHT;

    this.x = ship.x + this.ship.width/2 - this.width/2;
    this.y = ship.y - this.height;
    this.radius = radius(this.width, this.height);
    Entity.call(this, game, this.x, this.y, this.radius);
}

Bullet.prototype = new Entity();
Bullet.prototype.constructor = Bullet;

Bullet.prototype.update = function() {
    if (!this.fired) {
        this.x = this.ship.x + this.ship.width/2;
    } else {
        this.y -= 10; 
    }
    if (this.outsideOfScreen()) {
        this.removeFromWorld = true;
    }
}

Bullet.prototype.draw = function(ctx) {
    if (this.fired && this.sprite) {
        Entity.prototype.draw.call(this);
        ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
    }
}

Bullet.prototype.outsideOfScreen = function() {
    return Entity.prototype.outsideOfScreen.call(this, this.width, this.height);
}

/* --- High-End Canvas Starfield --- */
function Starfield(game) {
    this.game = game;
    this.stars = [];
    this.numStars = 80;
    this.init();
}

Starfield.prototype.init = function() {
    for (let i = 0; i < this.numStars; i++) {
        this.stars.push({
            x: Math.random() * this.game.surfaceWidth,
            y: Math.random() * this.game.surfaceHeight,
            size: Math.random() * 2 + 0.5,
            speed: Math.random() * 1.5 + 0.3, 
            color: 'rgba(255, 255, 255, ' + (Math.random() * 0.7 + 0.3) + ')'
        });
    }
};

Starfield.prototype.update = function() {
    let width = this.game.surfaceWidth;
    let height = this.game.surfaceHeight;
    for (let i = 0; i < this.stars.length; i++) {
        let star = this.stars[i];
        star.y += star.speed;
        if (star.y > height) {
            star.y = 0;
            star.x = Math.random() * width;
        }
    }
};

Starfield.prototype.draw = function(ctx) {
    for (let i = 0; i < this.stars.length; i++) {
        let star = this.stars[i];
        ctx.fillStyle = star.color;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
    }
};

/* --- Neon Particle Systems --- */
function Particle(game, x, y, color) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.color = color || '#00f0ff';
    this.radius = Math.random() * 2 + 0.8;
    let angle = Math.random() * Math.PI * 2;
    let speed = Math.random() * 4 + 1.5;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
    this.fade = Math.random() * 0.025 + 0.015;
    this.removeFromWorld = false;
    Entity.call(this, game, this.x, this.y, this.radius);
}

Particle.prototype = new Entity();
Particle.prototype.constructor = Particle;

Particle.prototype.update = function() {
    this.x += this.vx;
    this.y += this.vy;
    this.alpha -= this.fade;
    if (this.alpha <= 0) {
        this.removeFromWorld = true;
    }
}

Particle.prototype.draw = function(ctx) {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.shadowBlur = 8;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

/* --- Shooter Game Core --- */
function Shooter() {
    GameEngine.call(this);
    this.lives = 10;
    this.score = 0;
    this.highScore = 0;
    this.showOutlines = false;
}

Shooter.prototype = new GameEngine();
Shooter.prototype.constructor = Shooter;

Shooter.prototype.init = function(ctx) {
    GameEngine.prototype.init.call(this, ctx);
    this.starfield = new Starfield(this);
    this.highScore = parseInt(localStorage.getItem('shooter_high_score') || '0', 10);
    this.state = 'playing';
}

Shooter.prototype.start = function() {
    this.state = 'playing';
    this.reset();
    
    // Background music init
    this.bgm = ASSET_MANAGER.getAsset(backgroundMusic);
    if (this.bgm) {
        this.bgm.currentTime = 0;
        if (playSound) {
            this.bgm.play().catch(() => {});
            this.bgm.loop = true;
        }
    }
    
    GameEngine.prototype.start.call(this);
}

Shooter.prototype.reset = function() {
    this.entities = [];
    this.lives = 10;
    this.score = 0;
    this.state = 'playing';
    
    this.ship = new Ship(this);
    this.addEntity(this.ship);
    
    if (this.bgm && playSound) {
        this.bgm.currentTime = 0;
        this.bgm.play().catch(() => {});
    }
}

Shooter.prototype.spawnExplosion = function(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        this.addEntity(new Particle(this, x, y, color));
    }
}

Shooter.prototype.update = function() {
    if (this.starfield) {
        this.starfield.update();
    }
    
    if (this.state === 'gameover') {
        return;
    }
    
    GameEngine.prototype.update.call(this);
}

Shooter.prototype.draw = function() {
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    
    let bg = ASSET_MANAGER.getAsset(backgroundImage);
    if (bg) {
        this.ctx.drawImage(bg, 0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    }
    
    if (this.starfield) {
        this.starfield.draw(this.ctx);
    }
    
    for (let i = 0; i < this.entities.length; i++) {
        if (this.entities[i]) {
            this.entities[i].draw(this.ctx);
        }
    }
    
    if (this.state === 'playing') {
        this.drawHUD(this.ctx);
    }
}

Shooter.prototype.drawHUD = function(ctx) {
    ctx.save();
    
    ctx.fillStyle = "rgba(13, 11, 24, 0.4)";
    ctx.fillRect(0, 0, this.surfaceWidth, 55);
    
    ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 55);
    ctx.lineTo(this.surfaceWidth, 55);
    ctx.stroke();
    
    ctx.font = "bold 15px 'Orbitron', sans-serif";
    ctx.textBaseline = "top";
    
    // Score
    ctx.fillStyle = "#00f0ff";
    ctx.shadowBlur = 8;
    ctx.shadowColor = "#00f0ff";
    ctx.textAlign = "left";
    ctx.fillText("SCORE: " + this.score, 25, 18);
    
    // High Score
    ctx.fillStyle = "#39ff14";
    ctx.shadowColor = "#39ff14";
    ctx.textAlign = "center";
    ctx.fillText("SECTOR BEST: " + this.highScore, this.surfaceWidth / 2, 18);
    
    // Lives
    ctx.fillStyle = "#ff3b30";
    ctx.shadowColor = "#ff3b30";
    ctx.textAlign = "right";
    ctx.fillText("LIVES: " + this.lives, this.surfaceWidth - 25, 18);
    
    ctx.restore();
}

Shooter.prototype.gameOver = function() {
    this.state = 'gameover';
    
    if (this.bgm) {
        this.bgm.pause();
    }
    
    let isNewRecord = false;
    if (this.score > this.highScore) {
        this.highScore = this.score;
        localStorage.setItem('shooter_high_score', this.highScore);
        isNewRecord = true;
    }
    
    document.getElementById('final-score').innerText = String(this.score).padStart(4, '0');
    document.getElementById('high-score').innerText = String(this.highScore).padStart(4, '0');
    
    let recordMsg = document.getElementById('new-record-message');
    if (isNewRecord) {
        recordMsg.style.display = 'block';
    } else {
        recordMsg.style.display = 'none';
    }
    
    document.getElementById('game-over-screen').style.display = 'flex';
}

/* --- DOMContentLoaded Bootstrap --- */
window.addEventListener('DOMContentLoaded', () => {
    // Select canvas and context inside DOM Ready to ensure safety
    canvas = document.getElementById("myCanvas");
    ctx = canvas.getContext("2d");

    let mainMenu = document.getElementById("menu");
    let playBtn = document.getElementById("play");
    let soundStatus = document.getElementById("toggle_sound");

    // Modal UI toggles
    let htpModal = document.getElementById("htp-modal");
    let htpBtn = document.getElementById("htp_main");
    let closeHtpBtn = document.getElementById("close-htp");

    let aboutModal = document.getElementById("about-modal");
    let aboutBtn = document.getElementById("about");
    let closeAboutBtn = document.getElementById("close-about");

    // Game Over Panel controls
    let restartBtn = document.getElementById("restart-btn");
    let menuBtn = document.getElementById("menu-btn");
    let gameOverScreen = document.getElementById("game-over-screen");

    // Steer Canvas dimensions to fit browser window
    function resize(w, h) {
        canvas.width = w;
        canvas.height = h;
        if (game) {
            game.surfaceWidth = w;
            game.surfaceHeight = h;
            if (game.ship) {
                game.ship.y = h - game.ship.height - 20;
            }
        }
    }

    resize(window.innerWidth, window.innerHeight);

    window.addEventListener('resize', () => {
        resize(window.innerWidth, window.innerHeight);
    });

    // Sound toggle event binding
    soundStatus.onclick = () => {
        if (soundStatus.value == "on") {
            soundStatus.value = "off";
            soundStatus.innerHTML = "SOUND: OFF";
            playSound = false;
            if (game && game.bgm) {
                game.bgm.pause();
            }
        } else {
            soundStatus.value = "on";
            soundStatus.innerHTML = "SOUND: ON";
            playSound = true;
            if (game && game.bgm && game.state === 'playing') {
                game.bgm.play().catch(() => {});
                game.bgm.loop = true;
            }
        }
    };

    // Modal display actions
    htpBtn.onclick = () => { htpModal.style.display = "flex"; };
    closeHtpBtn.onclick = () => { htpModal.style.display = "none"; };
    aboutBtn.onclick = () => { aboutModal.style.display = "flex"; };
    closeAboutBtn.onclick = () => { aboutModal.style.display = "none"; };

    window.onclick = (e) => {
        if (e.target == htpModal) htpModal.style.display = "none";
        if (e.target == aboutModal) aboutModal.style.display = "none";
    };

    restartBtn.onclick = () => {
        gameOverScreen.style.display = "none";
        game.reset();
    };

    menuBtn.onclick = () => {
        gameOverScreen.style.display = "none";
        mainMenu.style.display = "flex";
        canvas.style.display = "none";
        game.state = "menu";
    };

    // Instantiate and queue assets immediately
    ASSET_MANAGER = new AssetManager();

    ASSET_MANAGER.queueDownload(backgroundImage);
    ASSET_MANAGER.queueDownload(batttleship);
    ASSET_MANAGER.queueDownload(bullet);
    ASSET_MANAGER.queueDownload(meteorBig1);
    ASSET_MANAGER.queueDownload(meteorBig2);
    ASSET_MANAGER.queueDownload(meteorMedium1);
    ASSET_MANAGER.queueDownload(meteorMedium3);
    ASSET_MANAGER.queueDownload(meteorSmall1);
    ASSET_MANAGER.queueDownload(meteorSmall2);
    ASSET_MANAGER.queueDownload(meteorTiny1);

    ASSET_MANAGER.queueSound(backgroundMusic);
    ASSET_MANAGER.queueSound(pew);
    ASSET_MANAGER.queueSound(expl6);

    // Bootstrap play listener immediately to make buttons interactive instantly
    playBtn.addEventListener('click', function(e) {
        if (soundStatus.value == "on") {
            playSound = true;
        } else {
            playSound = false;
        }

        mainMenu.style.display = "none";
        canvas.style.display = "block";

        game = new Shooter(); // Make sure a clean game instance is constructed
        game.init(ctx);
        game.start();
    }, false);

    // Preload assets in the background
    ASSET_MANAGER.downloadAll(function() {
        // Assets are fully preloaded in background!
    });
});