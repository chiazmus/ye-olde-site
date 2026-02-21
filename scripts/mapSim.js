const canvas = document.getElementById('mapCanvas');
const ctx = canvas.getContext('2d');
let tick = 0;
let ships = [];
let cannonBalls = [];
let removeList = [];

const loadImage = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
};

const drawFlipped = (img, sx, sy, sw, sh, x, y, width, height) => {
    ctx.save(); // Save the current state (rotation, scaling, etc.)

    // Move the "pen" to the image position
    ctx.translate(x + width, y); 

    // Flip the X-axis
    ctx.scale(-1, 1);

    // Draw at 0,0 (since we translated the context to x,y)
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, width, height);

    ctx.restore(); // Return to normal coordinates
};

class CannonBall {
    constructor (x, y, shootingUp = false) {
        this.x = x;
        this.y = y;
        this.shootingUp = shootingUp;
    }

    update (allShips) {
        if (this.shootingUp) this.y -= 1.5;
        else this.y += 1.5;
        if (this.y < 0 || this.y > canvas.height) removeList.push(this);
        allShips.forEach(ship => {
            if (Math.abs(ship.x - this.x) + Math.abs(ship.y - this.y) < 10) {
                removeList.push(this);
                ship.state = 'dead';
            }
        });
    }

    draw (ctx) {
        ctx.fillStyle = '#202020';
        ctx.fillRect(Math.floor(this.x), Math.floor(this.y), 2, 2);
    }
}

class Ship {
    constructor (x, y) {
        this.x = x;
        this.y = y;
        this.destination = [Math.random() * canvas.width, Math.random() * canvas.height];
        this.flipped = false;
        this.state = 'moving';
        this.ani = 0;
    }

    update (allShips, tick) {
        if (this.state == 'moving' || this.state == 'fire') {
            const dx = this.destination[0] - this.x;
            const dy = this.destination[1] - this.y;
            const heading = Math.atan2(dy, dx);
            this.x += Math.cos(heading);
            this.y += Math.sin(heading);
            this.flipped = (dx < 0) ? false : true;
            if (Math.abs(dx + dy) < 5) {
                this.destination = [Math.random() * canvas.width, Math.random() * canvas.height];
            }
            allShips.forEach(ship => {
                if (ship !== this) {
                    if (Math.abs(this.x - ship.x) < 5 && Math.abs(this.y - ship.y) < 300 && tick % 15 == 0) {
                        this.state = 'fire';
                        let mod = (this.y > ship.y) ? -10 : 10;
                        cannonBalls.push(new CannonBall(this.x+8, this.y+mod, (mod < 0) ? true : false));
                    }
                }
            });
        }
    }

    draw (ctx, tick) {
        let animationFrame;
        switch (this.state) {
            case 'moving':
                if (tick % 60 > 30){
                    if (this.flipped) drawFlipped(window.assets.ship1, 0, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                    else ctx.drawImage(window.assets.ship1, 0, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                } else { 
                    if (this.flipped) drawFlipped(window.assets.ship1, 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                    else ctx.drawImage(window.assets.ship1, 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                }

                if (Math.random() < 0.0002) this.state = 'kraken';

                break;
            case 'kraken':
                this.ani++;
                animationFrame = Math.floor(this.ani / 15);
                if (animationFrame > 7) {
                    this.state = 'moving';
                    this.ani = 0;
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                } else {
                ctx.drawImage(window.assets.kraken, animationFrame * 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                }
                break;
            case 'fire':
                this.ani++;
                animationFrame = Math.floor(this.ani / 7);
                if (animationFrame > 2) {
                    this.state = 'moving';
                    this.ani = 0;
                } else {
                    if (this.flipped) drawFlipped(window.assets.firing, animationFrame * 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                    else ctx.drawImage(window.assets.firing, animationFrame * 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                }
                break;
            case 'dead':
                this.ani++;
                animationFrame = Math.floor(this.ani / 15);
                if (animationFrame > 3) {
                    this.state = 'moving';
                    this.ani = 0;
                    this.x = Math.random() * canvas.width;
                    this.y = Math.random() * canvas.height;
                } else {
                    ctx.drawImage(window.assets.sunk, animationFrame * 16, 0, 16, 16, Math.floor(this.x), Math.floor(this.y), 16, 16);
                }
                break;
            default:
                this.state = 'moving';
        }
    }
};


const drawLine = (x1, y1, x2, y2, color, thickness = 1) => {
    ctx.beginPath();       // 1. Start a new path
    ctx.moveTo(x1, y1);    // 2. Move "pen" to starting coordinates (x, y)
    ctx.lineTo(x2, y2);   // 3. Draw a line to these coordinates
    ctx.strokeStyle = color; // 4. Set the color
    ctx.lineWidth = thickness;     // 5. Set the thickness
    ctx.stroke();
};

// Generate Rhumb Lines
const generateRumbLine = (x, y) => {
    for (let i = 0; i < 16; i++) {
        let angle = (i / 16) * (Math.PI * 2);
        let radius = (canvas.width + canvas.height)
        let endX = Math.cos(angle) * radius + x;
        let endY = Math.sin(angle) * radius + y;
        drawLine(x, y, endX, endY, 'black', 1)
    }
};

const drawBackground = () => {
    // 1. Set the color
    ctx.fillStyle = '#f0feff'; 
    // 2. Draw a rectangle covering the whole canvas
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let i = 0; i < 5; i++) {
        let angle = (i / 5) * (Math.PI * 2);
        let radius = (canvas.width / 3.5)
        let startX = Math.cos(angle) * radius + canvas.width / 2;
        let startY = Math.sin(angle) * radius + canvas.height / 2;
        generateRumbLine(startX, startY)
    }
}

function animationLoop() {
    tick ++;
    drawBackground();
    cannonBalls.forEach(ball => {
        ball.update(ships);
        ball.draw(ctx);
    })
    ships.forEach(ship => {
        ship.update(ships, tick);
        ship.draw(ctx, tick);
    });
    removeList.forEach(item => {
        if (cannonBalls.includes(item)) {
            cannonBalls.splice(cannonBalls.indexOf(item));
        }
    });
    removeList = [];
    requestAnimationFrame(animationLoop);
}

async function initCanvas() {
    canvas.width = 2048;
    canvas.height = 1024;
    ctx.imageSmoothingEnabled = false;
    const [ship1, kraken, firing, sunk] = await Promise.all([
        loadImage('./assets/ship-1.png'),
        loadImage('./assets/kraken-ship.png'),
        loadImage('./assets/ship-firing.png'),
        loadImage('./assets/sunk-ship.png'),
    ]);

    // Store them globally or pass them to your loop
    window.assets = { ship1, kraken, firing, sunk };
    for (let i = 0; i < 10; i++) {
        ships.push(new Ship(Math.random() * canvas.width, Math.random() * canvas.height))
    }
    drawBackground();
    requestAnimationFrame(animationLoop);
}

document.addEventListener('DOMContentLoaded', () => {
    initCanvas(); // Run your setup function here
});