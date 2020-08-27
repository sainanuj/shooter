let canvas = document.getElementById("myCanvas");
let ctx = canvas.getContext("2d");

let ASSET_MANAGER;

function resize(w, h) {
    canvas.width = w;
    canvas.height = h;
}

window.onload = () => {
    resize(window.innerWidth, window.innerHeight);
}

window.onresize = () => {
    resize(window.innerWidth, window.innerHeight);
}

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
    window.webkitRequestAnimationFrame  ||
    window.mozRequestAnimationFrame     ||
    window.oRequestAnimationFrame       ||
    window.msRequestFrame               ||
    function(/* function */ callback, /* DOMElement */ element) {
        window.setTimeout(callback, 1000/60);
    };
})();

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
    for (let i=0; i<this.soundQueue.length; i++) {
        let path = this.soundQueue[i];
        let sound = new Audio();
        let that = this;

        sound.addEventListener('canplaythrough', function() {
            that.successCount++;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);

        sound.addEventListener('error', function() {
            that.errorCount++;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);

        sound.src = path;
        this.cache[path] = sound;
    }
}

AssetManager.prototype.downloadAll = function(downloadCallback) {
    if (this.downloadQueue.length === 0 && this.soundQueue.length === 0) {
        downloadCallback();
    }

    this.downloadSounds(downloadCallback);
    
    for (let i=0; i<this.downloadQueue.length; i++) {
        let path = this.downloadQueue[i];
        let img = new Image();
        let that = this;

        img.addEventListener('load', function() {
            that.successCount++;
            if (that.isDone()) {
                downloadCallback();
            }
        }, false);

        img.addEventListener('error', function() {
            console.log('Could not load ' + this.src);
            that.errorCount++;
            if (that.isDone()) {
                downloadCallback();
            }
        },false);

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

let regularExplosions = {"frames": [
    {
        "filename": "regularExplosion00.png",
        "frame": {"x":152,"y":285,"w":192,"h":192},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":192,"h":192},
        "sourceSize": {"w":192,"h":192}
    },
    {
        "filename": "regularExplosion01.png",
        "frame": {"x":0,"y":285,"w":152,"h":150},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":152,"h":150},
        "sourceSize": {"w":152,"h":150}
    },
    {
        "filename": "regularExplosion02.png",
        "frame": {"x":0,"y":0,"w":82,"h":91},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":82,"h":91},
        "sourceSize": {"w":82,"h":91}
    },
    {
        "filename": "regularExplosion03.png",
        "frame": {"x":82,"y":0,"w":92,"h":102},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":92,"h":102},
        "sourceSize": {"w":92,"h":102}
    },
    {
        "filename": "regularExplosion04.png",
        "frame": {"x":174,"y":0,"w":120,"h":124},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":120,"h":124},
        "sourceSize": {"w":120,"h":124}
    },
    {
        "filename": "regularExplosion05.png",
        "frame": {"x":294,"y":0,"w":133,"h":134},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":133,"h":134},
        "sourceSize": {"w":133,"h":134}
    },
    {
        "filename": "regularExplosion06.png",
        "frame": {"x":0,"y":134,"w":138,"h":140},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":138,"h":140},
        "sourceSize": {"w":138,"h":140}
    },
    {
        "filename": "regularExplosion07.png",
        "frame": {"x":138,"y":134,"w":143,"h":144},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":143,"h":144},
        "sourceSize": {"w":143,"h":144}
    },
    {
        "filename": "regularExplosion08.png",
        "frame": {"x":281,"y":134,"w":149,"h":151},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":149,"h":151},
        "sourceSize": {"w":149,"h":151}
    }]
};

let sonicExplosions = {"frames": [
    {
        "filename": "sonicExplosion00.png",
        "frame": {"x":190,"y":291,"w":192,"h":192},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":192,"h":192},
        "sourceSize": {"w":192,"h":192}
    },
    {
        "filename": "sonicExplosion01.png",
        "frame": {"x":292,"y":140,"w":152,"h":150},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":152,"h":150},
        "sourceSize": {"w":152,"h":150}
    },
    {
        "filename": "sonicExplosion02.png",
        "frame": {"x":0,"y":291,"w":190,"h":190},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":190,"h":190},
        "sourceSize": {"w":190,"h":190}
    },
    {
        "filename": "sonicExplosion03.png",
        "frame": {"x":0,"y":483,"w":284,"h":284},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":284,"h":284},
        "sourceSize": {"w":284,"h":284}
    },
    {
        "filename": "sonicExplosion04.png",
        "frame": {"x":0,"y":0,"w":120,"h":124},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":120,"h":124},
        "sourceSize": {"w":120,"h":124}
    },
    {
        "filename": "sonicExplosion05.png",
        "frame": {"x":120,"y":0,"w":133,"h":134},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":133,"h":134},
        "sourceSize": {"w":133,"h":134}
    },
    {
        "filename": "sonicExplosion06.png",
        "frame": {"x":253,"y":0,"w":138,"h":140},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":138,"h":140},
        "sourceSize": {"w":138,"h":140}
    },
    {
        "filename": "sonicExplosion07.png",
        "frame": {"x":0,"y":140,"w":143,"h":144},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":143,"h":144},
        "sourceSize": {"w":143,"h":144}
    },
    {
        "filename": "sonicExplosion08.png",
        "frame": {"x":143,"y":140,"w":149,"h":151},
        "rotated": false,
        "trimmed": false,
        "spriteSourceSize": {"x":0,"y":0,"w":149,"h":151},
        "sourceSize": {"w":149,"h":151}
    }]
};

function Animation(spriteSheet, frameWidth, frameHeight, frameDuration, loop) {
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.frameDuration = frameDuration;
    this.loop = loop;
    this.elapsedTime = 0;
    this.totalTime = (this.spriteSheet.width/this.frameWidth) * this.frameDuration;
}

Animation.prototype.isDone = function() {
    return (this.elapsedTime >= this.totalTime);
}

Animation.prototype.currentFrame = function() {
    return Math.floor(this.elapsedTime/this.frameDuration);
}

Animation.prototype.drawFrame = function(tick, ctx, x, y, scaleBy) {
    this.scaleBy = scaleBy || 1;
    this.elapsedTime += tick;
    if (this.loop) {
        if (this.isDone()) {
            this.elapsedTime = 0;
        }
    } else if (this.isDone()) {
        return;
    }
    let index = this.currentFrame();
    let locX = x - (this.frameWidth/2)*scaleBy;
    let locY = y - (this.frameHeight/2)*scaleBy;
    ctx.drawImage(this.spriteSheet,
        index*this.frameWidth, 0,
        this.frameWidth, this.frameHeight,
        locX, locY,
        this.frameWidth*scaleBy, this.frameHeight*scaleBy);
}

function Timer() {
    this.getTime = 0;
    this.maxStep = 0.05;
    this.wallLastTimeStamp = 0;
}

Timer.prototype.tick = function() {
    let wallCurrent = Date.now();
    let wallDelta = (wallCurrent - this.wallLastTimeStamp) / 1000;
    this.wallLastTimeStamp = wallCurrent;

    let gameDelta = Math.min(wallDelta, this.maxStep);
    this.gameTime += gameDelta;
    return gameDelta;
}

function GameEngine() {
    this.entities = [];
    this.ctx = null;
    this.touch = null;
    this.mouse = null;
    this.touch = null;
    this.timer = new Timer();
    this.surfaceWidth = null;
    this.surfaceHeight = null;
    this.halfSurfaceWidth = null;
    this.halfSurfaceHeight = null;
    this.showOutlines = false;
}

GameEngine.prototype.startInput = function() {
    let that = this;

    let getXandY = function(e) {
        let x = e.clientX;
        let y = e.clientY;
        return {x: x, y: y};
    }

    this.ctx.canvas.addEventListener('touchmove', function(e) {
        that.touch = getXandY(e);
        e.stopPropagation();
        e.preventDefault();
    }, false);

    this.ctx.canvas.addEventListener('mousemove', function(e) {
        that.mouse = getXandY(e);
    }, false);
}

GameEngine.prototype.init = function(ctx) {
    console.log('Game has been initialized!');
    this.ctx = ctx;
    this.surfaceWidth = this.ctx.canvas.width;
    this.surfaceHeight = this.ctx.canvas.height;
    this.halfSurfaceWidth = this.surfaceWidth/2;
    this.halfSurfaceHeight = this.surfaceHeight/2;
    this.startInput();
}

GameEngine.prototype.start = function() {
    console.log('starting game...');
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
    this.ctx.drawImage(ASSET_MANAGER.getAsset('assets/image/spacebg.jpg'), 0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let i=0; i<this.entities.length; i++) {
        this.entities[i].draw(this.ctx);
    }
    if (callback) {
        callback(this);
    }
}

GameEngine.prototype.update = function() {
    let entitiesCount = this.entities.length;
    for (let i=0; i<entitiesCount; i++) {
        let entity = this.entities[i];
        if (!entity.removeFromWorld) {
            entity.update();
        }
    }

    for (let i=this.entities.length-1; i>=0; --i) {
        if (this.entities[i].removeFromWorld) {
            this.entities.splice(i, 1);
        }
    }
}

GameEngine.prototype.loop = function() {
    this.clockTick = this.timer.tick();
    this.update();
    this.draw();
    this.click = null
}

function Entity(game, x, y, radius) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.removeFromWorld = false;
}

Entity.prototype.update = function() {

}

Entity.prototype.draw = function() {
    if (this.game.showOutlines && this.radius) {
        ctx.beginPath();
        ctx.strokeStyle = "yellow";
        ctx.arc(this.x+this.radius+1, this.y+this.radius+1, this.radius, 0, Math.PI*2, false);
        ctx.stroke();
        ctx.closePath();
    }
}

Entity.prototype.drawSpriteCentered = function(ctx) {
    if (this.sprite && this.x && this.y) {
        let x = this.x - this.sprite.width/2;
        let y = this.y - this.sprite.height/2;
        ctx.drawImage(this.sprite, x, y);
    }
}

Entity.prototype.outsideOfScreen = function(width, height) {
    return (this.x > this.game.surfaceWidth+width || this.x < 0 ||
    this.y > this.game.surfaceHeight+height || this.y < 0);
}

Entity.prototype.rotateAndCache = function(image, angle) {
    let offscreenCanvas = document.createElement('canvas');
    let size = Math.max(image.width, image.height);
    offscreenCanvas.width = size;
    offscreenCanvas.height = size;
    let offscreenCtx = offscreenCanvas.getContext('2d');
    offscreenCtx.save();
    offscreenCtx.translate(size/2, size/2);
    offscreenCtx.rotate(angle + Math.PI/2);
    offscreenCtx.translate(0, 0);
    offscreenCtx.drawImage(image, -(image.width/2), -(image.height/2));
    offscreenCtx.restore();
    return offscreenCanvas;
}

function Ship(game) {
    this.sprite = ASSET_MANAGER.getAsset('assets/image/playerShip1_orange.png');
    this.x = 100-this.sprite.width/2;
    this.y = window.innerHeight-this.sprite.height/2;
    this.width = this.sprite.width*.5;
    this.height = this.sprite.height*.5;
    this.radius = Math.sqrt(Math.pow(this.width,2), Math.pow(this.height,2 ))/2;
    Entity.call(this, game, this.x, this.y, this.radius);
}

Ship.prototype = new Entity();
Ship.prototype.constructor = Ship;

Ship.prototype.update = function() {
    if (this.game.mouse) {
        this.x = this.game.mouse.x;
    }
    if (this.x < this.width/2) {
        this.x = 0;
    }
    if (this.x+this.width>this.game.ctx.canvas.width) {
        this.x = this.game.ctx.canvas.width-this.width;
    }
}

Ship.prototype.draw = function(ctx) {
    Entity.prototype.draw.call(this);
    ctx.drawImage(this.sprite, this.x, this.y, this.width, this.height);
}


function Shooter() {
    GameEngine.call(this);
    this.lives = 10;
    this.score = 0;
    this.showOutlines = true;
}

Shooter.prototype = new GameEngine();
Shooter.prototype.constructor = Shooter;

Shooter.prototype.start = function() {
    this.ship = new Ship(this);
    this.addEntity(this.ship);
    GameEngine.prototype.start.call(this);
}

let game = new Shooter();
ASSET_MANAGER = new AssetManager();

ASSET_MANAGER.queueDownload('assets/image/spacebg.jpg');
ASSET_MANAGER.queueDownload('assets/image/starfield.png');
ASSET_MANAGER.queueDownload('assets/image/playerShip1_orange.png')

ASSET_MANAGER.queueSound('assets/sound/pew.wav');

ASSET_MANAGER.downloadAll(function() {
    game.init(ctx);
    game.start();
});