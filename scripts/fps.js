const screen = document.getElementById('fps');
screen.width = 500;
screen.height = 500;
const ctx = screen.getContext("2d");

const scratchCanvas = document.createElement('canvas');
scratchCanvas.width = screen.width;
scratchCanvas.height = screen.height;
const scratchCtx = scratchCanvas.getContext('2d');

const bgColor = '#111';
const fgColor = '#5f5';
let myAssets;
let zBuffer = {};

let attackState = 0;
let animationPlaying = false;

let sprites = [];

const keys = {};
let rayCastRows = {};
let mouseDeltaX = 0;

const walls = {'1': null, '2': null};
const spriteTypes = {};
let visibleTiles = [];

let tick = 0;

let levelMap = [
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0],
  [2, 0, 0, 4, 0, 0, 0, 0, 4, 0, 0, 0, 0, 4, 0, 1, 1, 0, 0, 0],
  [1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 0, 4, 0, 1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 3, 0, 0, 0, 3, 1, 0, 0, 0],
  [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [2, 0, 0, 0, 1, 1, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 2],
  [1, 0, 4, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [2, 0, 0, 0, 1, 1, 0, 4, 0, 0, 0, 0, 0, 4, 0, 0, 0, 0, 0, 2],
  [1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
  [2, 0, 4, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 4, 0, 4, 0, 4, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 2, 1, 2, 1, 1, 0, 0, 0, 0, 0]
];

let lightMap = [];

let lightSource = [];

const player = {
    x : 1.5,
    y : 1.5,
    angle : ((Math.PI / 8) * 3),
    speed : 0.1
};

const imageBuffer = ctx.createImageData(screen.width, screen.height);
const pixels = imageBuffer.data;

const getTextureData = (img) => {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = img.width;
    tempCanvas.height = img.height;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(img, 0, 0);
    return tempCtx.getImageData(0, 0, img.width, img.height).data;
};

const loadImage = (url) => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.src = url;
    });
};

const clear = () => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,screen.width,screen.height);
};


const drawPoint = ({x, y}) => {
    const s = 4
    ctx.fillStyle = fgColor;
    ctx.fillRect(x - s/2, y - s/2, s, s);
};

const drawLine = (p1, p2, color) => {
    ctx.strokeStyle = color || fgColor;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
};

const generateEmptyMap = (size) => {
    let newMap = [];
    for (let y = 0; y < size; y++) {
        newMap.push([]);
        for (let x = 0; x < size; x++) {
            newMap[y].push(0);
        }
    }
    return newMap;
};

const outOfBounds = (p, size) => p < 0 || p >= size; 

const prims = (map, size) => {
    // Initialize start point
    map[1][1] = 0;
    let frontier = [];

    // Helper to find valid walls to potentially break
    const addFrontier = (x, y) => {
        const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
        for (let [dx, dy] of dirs) {
            let nx = x + dx, ny = y + dy;
            if (!outOfBounds(nx, size) && !outOfBounds(ny, size) && map[ny][nx] === 1) {
                // Store the target cell AND the cell it came from
                frontier.push({ x: nx, y: ny, px: x, py: y });
            }
        }
    };

    addFrontier(1, 1);

    while (frontier.length > 0) {
        // Pick a random frontier cell
        let index = Math.floor(Math.random() * frontier.length);
        let { x, y, px, py } = frontier.splice(index, 1)[0];

        if (map[y][x] === 1) {
            // Carve the new cell and the wall between it and its parent
            map[y][x] = 0;
            map[py + (y - py) / 2][px + (x - px) / 2] = 0;
            
            // Add new neighbors to the frontier
            addFrontier(x, y);
        }
    }
    return map;
};

const mazeCarve = (map, size) => {
    //Setup visited tracker and stack
    let visited = Array.from({ length: size }, () => Array(size).fill(false));
    let current = { x: 1, y: 1 };
    let stack = [current];
    
    visited[current.y][current.x] = true;
    map[current.y][current.x] = 0;

    //Loop until backtracked to the start
    while (stack.length > 0) {
        let neighbors = [];
        let dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];

        for (let [dx, dy] of dirs) {
            let nx = current.x + dx;
            let ny = current.y + dy;
            if (!outOfBounds(nx, size) && !outOfBounds(ny, size) && !visited[ny][nx]) {
                neighbors.push({ x: nx, y: ny });
            }
        }

        if (neighbors.length > 0) {
            // Move forward
            let next = neighbors[Math.floor(Math.random() * neighbors.length)];
            
            // Clear the wall between current and next
            map[current.y + (next.y - current.y) / 2][current.x + (next.x - current.x) / 2] = 0;
            map[next.y][next.x] = 0;

            visited[next.y][next.x] = true;
            stack.push(current);
            current = next;
        } else {
            // Backtrack
            current = stack.pop();
        }
    }
    return map;
};

const removeRandomCells = (map, size) => {
    const iterations = 20;

    for (let i = 0; i < iterations; i++) {
        let x = Math.floor(Math.random() * (size-2))+1;
        let y = Math.floor(Math.random() * (size-2))+1;
        map[y][x] = 0;
    }

    return map;
};

const carveOutMap = (map, size) => {
    const iterations = 80;
    let x = Math.floor(Math.random() * size);
    let y = Math.floor(Math.random() * size);

    for (let i = 0; i < iterations; i++) {
        map[y][x] = 0;
        let tx = x + (Math.floor(Math.random() * 3) - 1);
        let ty = y + (Math.floor(Math.random() * 3) - 1);
        if (!outOfBounds(tx, size)) x = tx;
        if (!outOfBounds(ty, size)) y = ty;
    }

    for (let i = 0; i < size; i++) {
        map[i][0] = 1;
        map[i][size-1] = 1;
        map[0][i] = 1;
        map[size-1][i] = 1;
    }

    return map;
};

const pickPlayerStart = (map, size) => {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (map[y][x] === 0) return {x: x + 0.25, y: y + 0.25};
        }
    }
    return null;
};

const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x-p2.x, 2)+Math.pow(p1.y-p2.y, 2));

const castRay = ({x, y}, angle, map) => {
    const mapSize = map[0].length;
    const bitsize = 32;
    const dx = Math.cos(angle) / bitsize;
    const dy = Math.sin(angle) / bitsize;
    const steps = 20;
    let tempX = x;
    let tempY = y;
    let side = 0;

    for (let i = 0; i < steps*bitsize; i++) {
        tempX += dx;
        if (outOfBounds(Math.floor(tempY), mapSize) || outOfBounds(Math.floor(tempX), mapSize) || map[Math.floor(tempY)][Math.floor(tempX)] in walls) { 
            side = 1;
            break;
        }
        tempY += dy;
        if (outOfBounds(Math.floor(tempY), mapSize) || outOfBounds(Math.floor(tempX), mapSize) || map[Math.floor(tempY)][Math.floor(tempX)] in walls){ 
            side = 0;
            break;
        }
    }

    return {dist: distance({x: x, y: y}, {x: tempX, y: tempY}), hitX: tempX, hitY: tempY, side: side, tex: walls[map[Math.floor(tempY)][Math.floor(tempX)]]};
};

const toRad = (angle) => angle * Math.PI / 180;

const drawRayCast = ({x, y}, angle, map) => {
    const rays = screen.width/2;
    const maxAngle = 45; //fov
    const rayAngle = maxAngle/rays;
    visibleTiles = [];

    for (let i = 0; i < rays; i++) {
        const currentRay = toRad(i * rayAngle) + (angle - toRad(maxAngle/2));
        const result = castRay({x: x, y: y}, currentRay, map)
        const dist = result.dist || 0.0001;
        const side = result.side;

        let wallX = (side === 1) ? result.hitY : result.hitX;
        wallX -= Math.floor(wallX);
        const texX = Math.floor(wallX * 32); //This is the texture x...
        const color = [Math.floor((85 * (1 - (dist / 15)))/8)*8, Math.floor((255 * (1 - (dist / 15)))/8)*8, Math.floor((85 * (1-(dist / 15)))/8)*8];
        const lineHeight = (1/dist) * (screen.height);
        const screenX = i * (screen.width / rays);
        const drawStart = (screen.height / 2) - (lineHeight / 2);
        const drawEnd = (screen.height / 2) + (lineHeight / 2);
        const stripWidth = screen.width / rays;
        const texture = result.tex; 

        rayCastRows[screenX] = {drawStart, drawEnd};

        zBuffer[Math.floor(screenX)] = dist;
        ctx.drawImage(texture, texX, 0, 1, 32, screenX, drawStart, stripWidth, lineHeight);

        const maxDist = 15; // The distance where things become invisible
        // let opacity = dist / maxDist; 
        let lightVal = lightMap[Math.floor(result.hitY)][Math.floor(result.hitX)];
        lightVal = 1 - ((1/7) * (lightVal+2))
        let opacity = lightVal;
        if (side === 1) opacity += 0.2;
        if (opacity > 1) opacity = 1; // Clamp to 1

        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.fillRect(screenX, drawStart, stripWidth, lineHeight);

        // drawLine(
        //         { x: screenX, y: drawStart }, 
        //         { x: screenX, y: drawEnd },
        //         `rgb(${color[0]}, ${color[1]}, ${color[2]})`
        //     );

    }
};

const drawTexturedFloor = () => {
    pixels.fill(0);

    const halfHeight = screen.height / 2;
    const rayAngle = toRad(45 / (screen.width / 2));
    const halfFov = toRad(45 / 2);

    for (let y = 0; y < screen.height; y++) {

        // Pre-compute the distance for this entire row (it's the same for every x)
        let distanceToLocation = Math.abs(y - halfHeight) * 2;
        if (distanceToLocation === 0) continue; // avoid division by zero on horizon
        distanceToLocation = screen.height / distanceToLocation;

        for (let x = 0; x < screen.width; x++) {
            const col = rayCastRows[x - (x % 2)];
            if (y >= col.drawEnd - 1 || y <= col.drawStart + 1) {

                // Pre-compute angle per-column, not per-pixel
                const angleToLocation = rayAngle * Math.floor(x / 2) + (player.angle - halfFov);

                const worldX = player.x + Math.cos(angleToLocation) * distanceToLocation;
                const worldY = player.y + Math.sin(angleToLocation) * distanceToLocation;
                const mapH = lightMap.length;
                const mapW = lightMap[0].length;

                const tileY = Math.floor(worldY);
                const tileX = Math.floor(worldX);

                if (tileY < 0 || tileY >= mapH || tileX < 0 || tileX >= mapW) continue;

                const lightLevel = lightMap[tileY][tileX];
                const intensity = 50 * ((lightLevel + 2) / 6);

                const screenIndex = (y * screen.width + x) * 4;
                pixels[screenIndex]     = intensity;
                pixels[screenIndex + 1] = intensity;
                pixels[screenIndex + 2] = intensity;
                pixels[screenIndex + 3] = 255;
            }
        }
    }

    scratchCtx.putImageData(imageBuffer, 0, 0);
    ctx.drawImage(scratchCanvas, 0, 0);
};

const drawSprite = (sprite) => {
    const maxAngle = 45
    function getSpriteScreenX(sprite) {
        // 1. Get absolute angle from player to sprite
        const dx = sprite.x - player.x;
        const dy = sprite.y - player.y;
        const spriteAngle = Math.atan2(dy, dx);

        // 2. Get relative angle and NORMALIZE it to [-PI, PI]
        // This prevents the sprite from "glitching" when crossing the 0/360 boundary
        let beta = spriteAngle - player.angle;
        beta = Math.atan2(Math.sin(beta), Math.cos(beta));

        // 3. Convert to degrees to match your raycasting logic
        const betaDeg = beta * (180 / Math.PI);

        // 4. Map degrees to screen coordinates
        // Middle of screen is 0 degrees. Left is -22.5, Right is 22.5.
        const screenX = (betaDeg + maxAngle / 2) * (screen.width / maxAngle);

        return {
            x: screenX,
            dist: Math.sqrt(dx * dx + dy * dy),
            isVisible: Math.abs(betaDeg) < maxAngle // basic FOV clipping
        };
    }
    const spriteTex = sprite.tex;
    const texNum = Math.floor(tick / 10) % sprite.animations;
    const distanceToSprite = sprite.dist;
    const screenX = getSpriteScreenX(sprite).x

    // Calculate size (inverse to distance, just like walls)
    const spriteSize = (1 / distanceToSprite) * screen.height;
    const drawStart = (screen.height / 2) - (spriteSize / 2);

    for (let x = 0; x < spriteSize; x++) {
        let columnX = Math.floor(screenX - (spriteSize/2) + x);
        if (distanceToSprite < zBuffer[columnX] && distanceToSprite < 15 && !outOfBounds(columnX, screen.width)) {
            ctx.drawImage(spriteTex, Math.floor(x/spriteSize * 32) + (texNum*32), 0, 1, 32, columnX, drawStart, 2, spriteSize);
            if (sprite.animations > 0) {
                animationPlaying = true;
            }
            // if (sprite.dimmable) {
            //     const maxDist = 15; // The distance where things become invisible
            //     let opacity = distanceToSprite / maxDist; 
            //     if (opacity > 1) opacity = 1; // Clamp to 1
            //     ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
            //     ctx.fillRect(columnX, drawStart, 2, spriteSize);
            // }
        }
    }
};

const drawSprites = () => {
    sprites.forEach((sprite) => {
        sprite.dist = distance({x: sprite.x, y: sprite.y}, {x: player.x, y: player.y});
    });

    sprites.sort((a, b) => b.dist - a.dist);

    sprites.forEach((sprite) => {
        drawSprite(sprite);
    });
};

const addLamps = (mapSize) => {
    for (let x = 0; x < mapSize; x++) {
        for (let y = 0; y < mapSize; y++) {
            if ((x % 2) + (y % 2) === 2 && Math.random() < 0.2) {
                sprites.push({
                    x: x + 0.5,
                    y: y + 0.5,
                    tex: myAssets.lamp,
                    dist: 110,
                    dimmable: false,
                    breakable: false,
                    animations: 1,
                }); 
            }
        }
    }
};

const addPots = (mapSize) => {
    for (let x = 0; x < mapSize; x++) {
        for (let y = 0; y < mapSize; y++) {
            if ((x % 2) + (y % 2) === 2 && Math.random() < 0.2) {
                sprites.push({
                    x: x + 0.5,
                    y: y + 0.5,
                    tex: myAssets.tube,
                    dist: 110,
                    dimmable: false,
                    breakable: true,
                    animations: 2,
                }); 
            }
        }
    }
};

const drawCRT = () => {
    ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
    for (let i = 0; i < screen.height; i += 3) {
        ctx.fillRect(0, i, screen.width, 1);
    }

    const vignette = ctx.createRadialGradient(
        screen.width / 2, screen.height / 2, screen.width * 0.3,
        screen.width / 2, screen.height / 2, screen.width * 0.7
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, screen.width, screen.height);

    if (Math.random() > 0.98) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.02)";
        ctx.fillRect(0, 0, screen.width, screen.height);
    }
};

const drawSkybox = (img) => {
    let rotation = player.angle % (Math.PI * 2);
    if (rotation < 0) rotation += Math.PI * 2;

    let offset = (rotation / (Math.PI * 2)) * img.width * 8;

    const x = -(offset % img.width);

    ctx.drawImage(img, x, 0, img.width, screen.height);
    ctx.drawImage(img, x + img.width, 0, img.width, screen.height);
    ctx.drawImage(img, x - img.width, 0, img.width, screen.height);
};

function populateMap(map, size) {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (map[y][x] in spriteTypes) {
                sprites.push({
                    x: x + 0.5,
                    y: y + 0.5,
                    tex: spriteTypes[map[y][x]],
                    dist: 110,
                    dimmable: false,
                    breakable: false,
                    animations: Math.floor(spriteTypes[map[y][x]].width / 32)
                });
                map[y][x] = 0;
            }
        }
    }
    return map;
}

function initLightMap(lightMap, lightSource, map, size) {
    const LIGHT_RADIUS = 4;
    const LIGHT_STRENGTH = 5;

    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (lightSource.includes(map[y][x])) {
                lightMap[y][x] = LIGHT_STRENGTH;

                // Spread light in all directions
                for (let tx = -LIGHT_RADIUS; tx <= LIGHT_RADIUS; tx++) {
                    for (let ty = -LIGHT_RADIUS; ty <= LIGHT_RADIUS; ty++) {
                        if (tx === 0 && ty === 0) continue;

                        const nx = x + tx;
                        const ny = y + ty;

                        // Bounds check
                        if (nx < 0 || nx >= size || ny < 0 || ny >= size) continue;

                        // Manhattan distance falloff — swap for Math.sqrt(tx*tx + ty*ty) if preferred
                        const dist = Math.abs(tx) + Math.abs(ty);
                        const lightValue = LIGHT_STRENGTH - dist;

                        if (lightValue > 0) {
                            // Keep the brightest value from any light source
                            lightMap[ny][nx] = Math.max(lightMap[ny][nx], lightValue);
                        }
                    }
                }
            }
        }
    }

    return lightMap;
}

function displayScreen() {
    clear();
    animationPlaying = false;
    drawSkybox(myAssets.skybox);
    drawRayCast({x: player.x, y: player.y}, player.angle, levelMap);
    drawTexturedFloor();
    drawSprites();
    if (attackState > 0) {
        animationPlaying = true;
        attackState--;
        const spriteNum = 5-Math.floor(attackState/3);
        ctx.drawImage(myAssets.arm, spriteNum * 32, 0, 32, 32, screen.width - (256+64), screen.height - 256, 256, 256);
    }
    drawCRT();
}

async function init() {

    ctx.imageSmoothingEnabled = false;
    const [wall, tileWall, barrel, lamp, pot, arm, skybox, tube] = await Promise.all([
        loadImage('./assets/brickWall.png'),
        loadImage('./assets/tileWall.png'),
        loadImage('./assets/barrel.png'),
        loadImage('./assets/lamp.png'),
        loadImage('./assets/pot.png'),
        loadImage('./assets/arm.png'),
        loadImage('./assets/mountain-skybox.png'),
        loadImage('./assets/tube.png'),
    ]);

    myAssets = { wall, tileWall, barrel, lamp, pot, arm, breakSound: new Audio('./assets/potBreak.mp3'), skybox, tube };

    walls['1'] = wall;
    walls['2'] = tileWall;
    spriteTypes['3'] = tube;
    spriteTypes['4'] = lamp;
    lightSource = [2, 4];

    lightMap = generateEmptyMap(20);

    lightMap = initLightMap(lightMap, lightSource, levelMap, 20);
    console.log(lightMap);

    levelMap = populateMap(levelMap, 20);

    // levelMap = generateEmptyMap(20);
    // levelMap = prims(levelMap, 20);
    // levelMap = removeRandomCells(levelMap, 20);

    // addLamps(20);
    // addPots(15);
    player.x = 1.25;
    player.y = 1.25;


    player.angle = toRad(45);
    displayScreen();

    window.addEventListener('keydown', e => keys[e.code] = true);
    window.addEventListener('keyup', e => keys[e.code] = false);
    screen.addEventListener('click', () => {
    screen.requestPointerLock(); // Locks mouse to the canvas
    });
    window.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === screen) {
            mouseDeltaX += e.movementX; 
            
        }
    });
    update();
}

// Game Loop
function update() {
    let changed = false;
    let mapSize = 20;
    tick += 1;
    // if (keys['ArrowLeft']) {
    //     player.angle -= (Math.PI / 90);
    //     changed = true;
    // }

    // if (keys['ArrowRight']) {
    //     player.angle += (Math.PI / 90);
    //     changed = true;
    // }

    if (mouseDeltaX !== 0) {
        const mouseSensitivity = 0.001;
        player.angle += mouseDeltaX * mouseSensitivity;
        mouseDeltaX = 0; // Reset after applying
        changed = true;
    }

    if ((keys['KeySpace'] || keys['KeyE']) && (document.pointerLockElement === screen)) {
        attackState = (3*6);
        animationPlaying = true;
        for (let i = 0; i < sprites.length; i++) {
            if (sprites[i].dist <= 1 && sprites[i].breakable) {
                sprites.splice(i, 1);
                myAssets.breakSound.play();
                break;
            }
        }
    }

    if (keys['ArrowUp'] || keys['KeyW'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        let tempX = player.x + dx * player.speed;
        let tempY = player.y + dy * player.speed;

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] !== 1) {
            player.x = tempX;
            player.y = tempY
        }

        changed = true;
    }

    if (keys['ArrowDown'] || keys['KeyS'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        let tempX = player.x - dx * player.speed;
        let tempY = player.y - dy * player.speed;

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] !== 1) {
            player.x = tempX;
            player.y = tempY
        }

        changed = true;
    }

    if (keys['KeyD'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle + toRad(90));
        const dy = Math.sin(player.angle + toRad(90));
        let tempX = player.x + dx * player.speed;
        let tempY = player.y + dy * player.speed;

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] !== 1) {
            player.x = tempX;
            player.y = tempY
        }

        changed = true;
    }

    if (keys['KeyA'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle + toRad(90));
        const dy = Math.sin(player.angle + toRad(90));
        let tempX = player.x - dx * player.speed;
        let tempY = player.y - dy * player.speed;

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] !== 1) {
            player.x = tempX;
            player.y = tempY
        }

        changed = true;
    }

    if (changed || animationPlaying) displayScreen();
  
  requestAnimationFrame(update);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});