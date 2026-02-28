const screen = document.getElementById('fps');
screen.width = 500;
screen.height = 500;
const ctx = screen.getContext("2d");
const bgColor = '#111';
const fgColor = '#5f5';

const keys = {};
let mouseDeltaX = 0;

let levelMap = [[1,1,1,1,1],
                  [1,0,0,0,1],
                  [1,0,1,0,1],
                  [1,0,0,0,1],
                  [1,1,1,1,1]];

const player = {
    x : 1,
    y : 1,
    angle : ((Math.PI / 8) * 3),
    speed : 0.1
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
            newMap[y].push(1);
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
            if (map[y][x] === 0) return {x, y};
        }
    }
    return null;
};

const distance = (p1, p2) => Math.sqrt(Math.pow(p1.x-p2.x, 2)+Math.pow(p1.y-p2.y, 2));

const castRay = ({x, y}, angle, map) => {
    const mapSize = map[0].length;
    const bitsize = 16;
    const dx = Math.cos(angle) / bitsize;
    const dy = Math.sin(angle) / bitsize;
    const steps = 20;
    let tempX = x;
    let tempY = y;

    for (let i = 0; i < steps*bitsize; i++) {
        tempX += dx;
        if (outOfBounds(Math.floor(tempY), mapSize) || outOfBounds(Math.floor(tempX), mapSize) || map[Math.floor(tempY)][Math.floor(tempX)] === 1) break;
        tempY += dy;
        if (outOfBounds(Math.floor(tempY), mapSize) || outOfBounds(Math.floor(tempX), mapSize) || map[Math.floor(tempY)][Math.floor(tempX)] === 1) break;
    }

    return distance({x: x, y: y}, {x: tempX, y: tempY})
};

const toRad = (angle) => angle * Math.PI / 180;

const drawRayCast = ({x, y}, angle, map) => {
    const rays = screen.width/2;
    const maxAngle = 45; //fov
    const rayAngle = maxAngle/rays;

    for (let i = 0; i < rays; i++) {
        const currentRay = toRad(i * rayAngle) + (angle - toRad(maxAngle/2));
        const dist = castRay({x: x, y: y}, currentRay, map) || 0.0001;
        const color = [Math.floor((85 * (1 - (dist / 15)))/8)*8, Math.floor((255 * (1 - (dist / 15)))/8)*8, Math.floor((85 * (1-(dist / 15)))/8)*8];
        const lineHeight = (1/dist) * (screen.height);
        const screenX = i * (screen.width / rays);
        const drawStart = (screen.height / 2) - (lineHeight / 2);
        const drawEnd = (screen.height / 2) + (lineHeight / 2);

        drawLine(
                { x: screenX, y: drawStart }, 
                { x: screenX, y: drawEnd },
                `rgb(${color[0]}, ${color[1]}, ${color[2]})`
            );
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

function displayScreen() {
    clear();
    drawRayCast({x: player.x, y: player.y}, player.angle, levelMap);
    drawCRT();
}

function init() {
    levelMap = generateEmptyMap(20);
    levelMap = prims(levelMap, 20);

    const startLocation = pickPlayerStart(levelMap, 20);

    player.x = startLocation.x;
    player.y = startLocation.y;

    player.angle = toRad(-45);
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
}

// Game Loop
function update() {
    let changed = false;
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

    if (keys['ArrowUp'] || keys['KeyW'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        player.x += dx * player.speed;
        player.y += dy * player.speed;

        if (levelMap[Math.floor(player.y)][Math.floor(player.x)] === 1) {
            player.x -= dx * player.speed;
            player.y -= dy * player.speed;
        }

        changed = true;
    }

    if (keys['ArrowDown'] || keys['KeyS'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        player.x -= dx * player.speed;
        player.y -= dy * player.speed;

        if (levelMap[Math.floor(player.y)][Math.floor(player.x)] === 1) {
            player.x += dx * player.speed;
            player.y += dy * player.speed;
        }

        changed = true;
    }

    if (keys['KeyD'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle + toRad(90));
        const dy = Math.sin(player.angle + toRad(90));
        player.x += dx * player.speed;
        player.y += dy * player.speed;

        if (levelMap[Math.floor(player.y)][Math.floor(player.x)] === 1) {
            player.x -= dx * player.speed;
            player.y -= dy * player.speed;
        }

        changed = true;
    }

    if (keys['KeyA'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle + toRad(90));
        const dy = Math.sin(player.angle + toRad(90));
        player.x -= dx * player.speed;
        player.y -= dy * player.speed;

        if (levelMap[Math.floor(player.y)][Math.floor(player.x)] === 1) {
            player.x += dx * player.speed;
            player.y += dy * player.speed;
        }

        changed = true;
    }

    if (changed) displayScreen();
  
  requestAnimationFrame(update);
}

init();
update();