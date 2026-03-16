// =============================================================================
// canvas
// Canvas setup, rendering context, scratch buffer, and image pixel buffer
// =============================================================================

const screen = document.getElementById('fps');
screen.width = 500;
screen.height = 500;
const ctx = screen.getContext("2d");

const scratchCanvas = document.createElement('canvas');
scratchCanvas.width = screen.width;
scratchCanvas.height = screen.height;
const scratchCtx = scratchCanvas.getContext('2d');

const imageBuffer = ctx.createImageData(screen.width, screen.height);
const pixels = imageBuffer.data;

const bgColor = '#111';
const fgColor = '#5f5';


// =============================================================================
// state
// All mutable global game state — assets, sprites, entities, input, flags, tick
// =============================================================================

let myAssets;
let zBuffer = new Float32Array(500);
let musicPlaying = false;

let attackState = 0;
let animationPlaying = false;

let sprites = [];
let entities = [];
let destroyList = [];

const keys = {};
const lastKeys = {};
let rayCastRows = {};
let mouseDeltaX = 0;

let tick = 0;


// =============================================================================
// map
// Level map data, map size, wall/sprite type registries, and map-related state
// =============================================================================

const walls = {};
const spriteTypes = {};
const entityTypes = {};
const entityAnimations = {};
let breakables = [];
let lootables = [];
let visibleTiles = [];
let floorTexture;
const floorTextureWidth = 32;
const floorTextureHeight = 32;

const mapSize = 40;

let levelMap = [
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 1, 0, 0, 5, 0, 3, 1, 1, 1, 1, 3, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 6, 0, 0, 6, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 1, 1, 0, 0, 0, -1, 0, 0, 5, 0, 0, 5, 0, 0, 5, 0, 0, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 8, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 0, 5, 0, 0, 0, 3, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 0, 0, 0, 0, 5, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 2, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 4, 1, 4, 0, 0, 0, 3, 1, 3, 0, 0, 0, 0, 0, 8, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 3, 0, 3, 1, 1, 1, 1, 1, 1, 0, 5, 0, 1, 1, 1, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 6, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 1, 0, 1, 1, 1, 0, 6, 0, 1, 0, 0, 0, 4, 1, 4, 0, 0, 0, 3, 1, 3, 4, 0, 0, 4, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 3, 0, 3, 1, 1, 7, 5, 7, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 1, 1, 0, 5, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 4, 0, 0, 0, 4, 1, 0, 0, 0, 1, 1, 1, 0, 0, 5, 0, 0, 1, 1, 0, 0, 1, 4, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 0, 5, 0, 1, 1, 0, 5, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 4, 0, 0, 0, 4, 1, 0, 0, 0, 1, 0, 0, 1, 3, 0, 3, 1, 0, 0, 0, 0, 1, 4, 0, 0, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 1, 0, 5, 0, 1, 1, 0, 1, 1, 1, 0, 0, 0, 1, 5, 1, 0, 0, 0, 0, 0, 1, 3, 0, 5, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 1, 3, 0, 3, 1, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 7, 1, 7, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 0, 8, 3, 1, 3, 1, 1, 1, 3, 5, 0, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 5, 1, 1, 1, 5, 0, 3, 1, 2, 2, 1, 3, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 0, 0, 7, 1, 7, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 8, 3, 1, 3, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [2, 0, 0, 0, 5, 0, 0, 0, 3, 1, 2, 2, 1, 3, 0, 6, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [1, 1, 6, 0, 0, 0, 6, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 3, 5, 3, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 3, 5, 3, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 3, 8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6, 0, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0, 0, 5, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 3, 3, 8, 0, 0, 0, 0, 0, 0, 6, 0, 6, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 7, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 8, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];


// =============================================================================
// lighting
// Light map state, light source registry, and light map initialization/spreading
// =============================================================================

let lightMap = [];
let lightSource = [];

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


// =============================================================================
// player
// Player object and spawn placement logic
// =============================================================================

const player = {
    x : 1.5,
    y : 1.5,
    angle : ((Math.PI / 8) * 3),
    speed : 0.1,
    shootAni : null
};

function placePlayer(map, size) {
    for (let x = 0; x < size; x++) {
        for (let y = 0; y < size; y++) {
            if (map[y][x] == -1) {
                map[y][x] = 0;
                player.x = x + 0.25;
                player.y = y + 0.25;
                return map;
            }
        }
    }
    return map;
}


// =============================================================================
// assets
// Image/audio loading utilities and texture data extraction
// =============================================================================

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


// =============================================================================
// mapgen
// Procedural map generation algorithms and utility helpers
// =============================================================================

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


// =============================================================================
// sprites
// Sprite/entity population, projectile spawning, and decorator helpers (lamps, pots)
// =============================================================================

const addLamps = (mapSize) => {
    for (let x = 0; x < mapSize; x++) {
        for (let y = 0; y < mapSize; y++) {
            if ((x % 2) + (y % 2) === 2 && Math.random() < 0.2) {
                sprites.push({
                    x: x + 0.5,
                    y: y + 0.5,
                    tex: myAssets.lamp,
                    dist: 110,
                    aWidth: 32,
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
                    aWidth: 32,
                    dimmable: false,
                    breakable: true,
                    animations: 2,
                }); 
            }
        }
    }
};

const addEnemy = (type, x, y, damage, animations) => {
    const myEnemy = {
        x: x,
        y: y,
        tex: animations.walk,
        dist: 110,
        dimmable: false,
        breakable: false,
        lootable: false,
        animations: Math.floor(animations.walk.width / 64),
        idleAnimation: animations.idle,
        walkAnimation: animations.walk,
        hurtAnimation: animations.hurt,
        attackAnimation: animations.attack,
        aWidth: 64,
        damage: damage,
        speed: 0.04,
        type: 'enemy',
        etype: type,
        hurtCountdown: 0,
        health: 40,
        sidePrefX: Math.random() - 0.5,
        sidePrefY: Math.random() - 0.5
    }

    sprites.push(myEnemy);

    entities.push(myEnemy);
}

const addProjectile = (x, y, angle, damage, animation) => {
    const myProjectile = {
        x: x,
        y: y,
        tex: animation,
        dist: 110,
        dimmable: false,
        breakable: false,
        lootable: false,
        animations: Math.floor(animation.width / 32),
        aWidth: 32,
        angle: angle,
        damage: damage,
        speed: 0.2,
        type: 'projectile',
        toDestroy: false,
    }

    sprites.push(myProjectile);

    entities.push(myProjectile);
}

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
                    aWidth: 32,
                    breakable: breakables.includes(map[y][x]) || false,
                    lootable: lootables.includes(map[y][x]) || false,
                    animations: Math.floor(spriteTypes[map[y][x]].width / 32)
                });
                map[y][x] = 0;
            } else if (map[y][x] in entityTypes) {
                addEnemy(map[y][x], x + 0.5, y + 0.5, 5, entityAnimations[map[y][x]]);
                map[y][x] = 0;
            }
        }
    }
    return map;
}

const updateProjectile = (entity) => {
    const dx = Math.cos(entity.angle);
    const dy = Math.sin(entity.angle);
    entity.x += dx * entity.speed;
    entity.y += dy * entity.speed;
    if (outOfBounds(entity.x, mapSize) || outOfBounds(entity.y, mapSize) || levelMap[Math.floor(entity.y)][Math.floor(entity.x)] !== 0 || entity.toDestroy) {
        entities.splice(entities.indexOf(entity), 1);
        sprites.splice(sprites.indexOf(entity), 1);
        return;
    }

    for (const ent of sprites) {
        const simDist = Math.abs(entity.x - ent.x) + Math.abs(ent.y - entity.y)
        if (ent.breakable && simDist <= 0.25) {
            sprites.splice(sprites.indexOf(ent), 1);
            entity.toDestroy = true;
        }
    }
};

const updateEnemy = (entity) => {
    const hasLineOfSight = lineOfSight({x: entity.x, y: entity.y}, {x: player.x, y: player.y}, levelMap);

    if (entity.hurtCountdown > 0) {
        entity.hurtCountdown --;
        entity.tex = entity.hurtAnimation;
        entity.animations =  Math.floor(entity.hurtAnimation.width / 64);
    } else if (hasLineOfSight && distance(entity, player) > 1) {
        entity.tex = entity.walkAnimation;
        entity.animations =  Math.floor(entity.walkAnimation.width / 64);
        const totaldx = (player.x + entity.sidePrefX) - entity.x;
        const totaldy = (player.y + entity.sidePrefY) - entity.y;
        const angleToPlayer = Math.atan2(totaldy, totaldx);
        const dx = Math.cos(angleToPlayer) * entity.speed;
        const dy = Math.sin(angleToPlayer) * entity.speed;
        const tdx = entity.x + dx;
        const tdy = entity.y + dy;

        if (!outOfBounds(tdx, mapSize) && !outOfBounds(tdy, mapSize) && levelMap[Math.floor(tdy)][Math.floor(tdx)] === 0) {
            let crammed = false;
            for (const ent of entities) {
                if (ent.type === 'enemy' && ent !== entity) {
                    if (manhattanDistance(ent, {x: tdx, y: tdy}) <= 0.5) {
                        crammed = true;
                    }
                }
            }
            if (!crammed) {
                entity.x = tdx;
                entity.y = tdy;
            } else {
                entity.tex = entity.idleAnimation;
                entity.animations = 1; 
            }
        } else {
                entity.tex = entity.idleAnimation;
                entity.animations = 1; 
        }
    } else if (!hasLineOfSight) {
        entity.tex = entity.idleAnimation;
        entity.animations = 1;
    } else {
        entity.tex = entity.attackAnimation;
        entity.animations = Math.floor(entity.attackAnimation.width / 64); 
    }

    for (const ent of entities) {
        if (ent.type === 'projectile') {
            const simpleDist = Math.abs(Math.floor(ent.x) - Math.floor(entity.x)) + Math.abs(Math.floor(ent.y) - Math.floor(entity.y), levelMap)
            if (simpleDist < 2) {
                const dist = distance(entity, ent);
                if (dist <= 0.75) {
                    entity.health -= ent.damage;
                    entity.hurtCountdown = 15;
                    ent.toDestroy = true;
                    if (entity.health <= 0) {
                        entities.splice(entities.indexOf(entity), 1);
                        sprites.splice(sprites.indexOf(entity), 1);
                        return;
                    }
                }
            }
        }
    }
};

const updateEntity = (entity) => {
    if (entity.type === 'projectile') {
        updateProjectile(entity);
    } else if (entity.type === 'enemy') {
        updateEnemy(entity);
    }
}

// =============================================================================
// renderer
// All drawing/rendering functions: raycasting, floor, sprites, skybox, CRT effect
// =============================================================================

function distance(p1, p2) {
    return Math.sqrt(Math.pow(p1.x-p2.x, 2)+Math.pow(p1.y-p2.y, 2))
};

function manhattanDistance(p1, p2) {
    return Math.abs(p2.x-p1.x)+Math.abs(p2.y-p1.y);
}

const toRad = (angle) => angle * Math.PI / 180;

const lineOfSight = (p1, p2, map) => {
  let x0 = Math.floor(p1.x);
  let y0 = Math.floor(p1.y);
  const x1 = Math.floor(p2.x);
  const y1 = Math.floor(p2.y);

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    // Bounds check
    if (y0 < 0 || y0 >= map.length || x0 < 0 || x0 >= map[0].length) {
      return false;
    }

    // Wall check — anything non-zero is a wall
    if (map[y0][x0] !== 0) {
      return false;
    }

    // Reached the destination
    if (x0 === x1 && y0 === y1) {
      return true;
    }

    const e2 = err * 2;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 <  dx) { err += dx; y0 += sy; }
  }
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

function ddaRayCast({x, y}, angle, map) {
    const rayDirX = Math.cos(angle);
    const rayDirY = Math.sin(angle);

    // These are the distance between horizontal/vertical lines for 1 unit of travel based on the angle
    // Ex. if you are moving y by 1, you move x by deltaDistX and vice versa
    const deltaDistX = Math.abs(1/rayDirX);
    const deltaDistY = Math.abs(1/rayDirY);

    let mapX = Math.floor(x);
    let mapY = Math.floor(y);

    let sideDistX, sideDistY;
    let stepX, stepY;

    // This finds the first x and y gridlines that I step to.  After that it should be simple

    if (rayDirX < 0) {
        stepX = -1;
        sideDistX = (x - mapX) * deltaDistX;
    } else {
        stepX = 1;
        sideDistX = (mapX + 1.0 - x) * deltaDistX;
    }

    if (rayDirY < 0) {
        stepY = -1;
        sideDistY = (y - mapY) * deltaDistY;
    } else {
        stepY = 1;
        sideDistY = (mapY + 1.0 - y) * deltaDistY;
    }

    // Now this is the actual raycasting loop

    let hit = false;
    let side; // 0 = X wall hit, 1 = Y wall hit

    while (!hit) {
        if (sideDistX < sideDistY) {
            // This means I need to make a horizontal step next
            sideDistX += deltaDistX;
            mapX += stepX;
            side = 1;
        } else {
            // And this is a vertical step next.
            sideDistY += deltaDistY;
            mapY += stepY;
            side = 0;
        }

        if (map[mapY][mapX] !== 0) hit = true;

    }

    let hitX, hitY;
    if (side === 1) {
        const t = (mapX - x + (1 - stepX) / 2) / rayDirX;
        hitX = mapX + (1 - stepX) / 2;
        hitY = y + t * rayDirY;
    } else {
        const t = (mapY - y + (1 - stepY) / 2) / rayDirY;
        hitY = mapY + (1 - stepY) / 2;
        hitX = x + t * rayDirX;
    }

    return {dist: distance({x: x, y: y}, {x: hitX, y: hitY}), hitX, hitY, side: side, tex: walls[map[mapY][mapX]] || walls[1]};
}

const naiveRayCast = ({x, y}, angle, map) => {
    const bitsize = 32;
    const dx = Math.cos(angle) / bitsize;
    const dy = Math.sin(angle) / bitsize;
    const steps = 30;
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

    return {dist: distance({x: x, y: y}, {x: tempX, y: tempY}), hitX: tempX, hitY: tempY, side: side, tex: walls[map[Math.floor(tempY)][Math.floor(tempX)]] || walls[1]};
};

const drawRayCast = ({x, y}, angle, map) => {
    const rays = screen.width/2;
    const maxAngle = 45; //fov
    const rayAngle = maxAngle/rays;
    visibleTiles = [];

    for (let i = 0; i < rays; i++) {
        const currentRay = toRad(i * rayAngle) + (angle - toRad(maxAngle/2));
        const result = ddaRayCast({x: x, y: y}, currentRay, map);
        const dist = result.dist || 0.0001;
        const side = result.side;

        let wallX = (side === 1) ? result.hitY : result.hitX;
        wallX -= Math.floor(wallX);
        let texX = Math.floor(wallX * 32); //This is the texture x...
        if (side === 1 && Math.cos(currentRay) > 0) texX = 31 - texX;
        if (side === 0 && Math.sin(currentRay) < 0) texX = 31 - texX;
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

    for (let x = 0; x < screen.width; x++) {
        const angleToLocation = rayAngle * Math.floor(x / 2) + (player.angle - halfFov);
        const cosA = Math.cos(angleToLocation);
        const sinA = Math.sin(angleToLocation);
        const col = rayCastRows[x - (x % 2)];

        for (let y = 0; y < screen.height; y++) {
            let distanceToLocation = Math.abs(y - halfHeight) * 2;
            if (distanceToLocation === 0) continue;
            distanceToLocation = screen.height / distanceToLocation;

            if (y >= col.drawEnd - 1 || y <= col.drawStart + 1) {

                const worldX = player.x + cosA * distanceToLocation;
                const worldY = player.y + sinA * distanceToLocation;
                const mapH = lightMap.length;
                const mapW = lightMap[0].length;

                const tileY = Math.floor(worldY);
                const tileX = Math.floor(worldX);
                const texY = Math.floor((worldY-tileY) * floorTextureHeight);
                const texX = Math.floor((worldX-tileX) * floorTextureWidth);


                if (tileY < 0 || tileY >= mapH || tileX < 0 || tileX >= mapW) continue;

                const lightLevel = lightMap[tileY][tileX];
                const intensity = ((lightLevel + 2) / 12);

                const screenIndex = (y * screen.width + x) * 4;
                const texIndex = (texY * floorTextureWidth + texX) * 4;
                pixels[screenIndex]     = floorTexture[texIndex] * intensity;
                pixels[screenIndex + 1] = floorTexture[texIndex+1] * intensity;
                pixels[screenIndex + 2] = floorTexture[texIndex+2] * intensity;
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
            ctx.drawImage(spriteTex, Math.floor(x/spriteSize * sprite.aWidth) + (texNum*sprite.aWidth), 0, 1, sprite.aWidth, columnX, drawStart, 2, spriteSize);
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
    // skyboxWidth represents the full 360° panorama width
    const skyboxWidth = screen.width * (360 / 45); // e.g. screen.width * 6 for 60° FOV

    let rotation = player.angle % (Math.PI * 2);
    if (rotation < 0) rotation += Math.PI * 2;

    // Map full rotation to full skybox width
    let offset = (rotation / (Math.PI * 2)) * skyboxWidth;
    const x = -(offset % skyboxWidth);

    ctx.drawImage(img, x,                  screen.height/2 - (skyboxWidth / 8), skyboxWidth, skyboxWidth / 4);
    ctx.drawImage(img, x + skyboxWidth,    screen.height/2 - (skyboxWidth / 8), skyboxWidth, skyboxWidth / 4);
};


// =============================================================================
// main
// Top-level game orchestration: displayScreen, init, and the update game loop
// =============================================================================

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
        const spriteNum = (player.shootAni.width / 32)-Math.floor(attackState/5);
        ctx.drawImage(player.shootAni, spriteNum * 32, 0, 32, 32, screen.width - (256+64), screen.height - 256, 256, 256);
    }
    drawCRT();
}

async function init() {

    ctx.imageSmoothingEnabled = false;
    const [wall, tileWall, barrel, lamp, pot, arm, skybox, tube, bannerWall, potionTable, eldritchBlast, guardWalk, guardIdle, guardHurt, guardAttack,
        tileFloor
    ] = await Promise.all([
        loadImage('./assets/brickWall.png'),
        loadImage('./assets/tileWall.png'),
        loadImage('./assets/barrel.png'),
        loadImage('./assets/lamp.png'),
        loadImage('./assets/pot.png'),
        loadImage('./assets/witchBolt.png'),
        loadImage('./assets/mountain-skybox.png'),
        loadImage('./assets/tube.png'),
        loadImage('./assets/bannerWall.png'),
        loadImage('./assets/potionTable.png'),
        loadImage('./assets/eldritchBlast.png'),
        loadImage('./assets/guardWalk.png'),
        loadImage('./assets/guard.png'),
        loadImage('./assets/guardHurt.png'),
        loadImage('./assets/guardAttack.png'),
        loadImage('./assets/tileFloor.png'),
    ]);

    myAssets = { wall, tileWall, barrel, lamp, pot, arm, shootSound: new Audio('./assets/potBreak.mp3'), stormTheKeep: new Audio('./assets/stormTheKeep.mp3'), 
        skybox, tube, bannerWall, potionTable, eldritchBlast, guardWalk, guardIdle, guardHurt, guardAttack, tileFloor };

    myAssets.stormTheKeep.loop = true;

    floorTexture = getTextureData(tileFloor);

    walls['1'] = wall;
    walls['2'] = tileWall;
    walls['3'] = bannerWall;
    spriteTypes['4'] = tube;
    spriteTypes['5'] = lamp;
    spriteTypes['6'] = potionTable;
    spriteTypes['7'] = pot;
    entityTypes['8'] = guardWalk;
    entityAnimations['8'] = {idle: guardIdle, walk: guardWalk, hurt: guardHurt, attack: guardAttack};
    breakables.push(7);
    lootables.push(6);
    lightSource = [2, 5];

    lightMap = generateEmptyMap(mapSize);

    lightMap = initLightMap(lightMap, lightSource, levelMap, mapSize);
    console.log(lightMap);
    levelMap = placePlayer(levelMap, mapSize);
    levelMap = populateMap(levelMap, mapSize);

    // levelMap = generateEmptyMap(20);
    // levelMap = prims(levelMap, 20);
    // levelMap = removeRandomCells(levelMap, 20);

    // addLamps(20);
    // addPots(15);
    // player.x = 1.25;
    // player.y = 1.25;

    player.angle = toRad(45);
    player.shootAni = arm;
    displayScreen();

    window.addEventListener('keydown', (e) => {
        lastKeys[e.code] = keys[e.code] ? true : false;
        keys[e.code] = true;
    });

    window.addEventListener('keyup', (e) => {
        lastKeys[e.code] = keys[e.code] ? true : false;
        keys[e.code] = false;
    });

    screen.addEventListener('click', () => {
        if (document.pointerLockElement !== screen) screen.requestPointerLock();
        else if (attackState <= 0) {
            attackState = (3*6);
            animationPlaying = true;
            const px = player.x + Math.cos(player.angle) * 0.2;
            const py = player.y + Math.sin(player.angle) * 0.2;
            addProjectile(px, py, player.angle, 10, eldritchBlast);
            myAssets.shootSound.play();
        }
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
    tick += 1;
    // if (keys['ArrowLeft']) {
    //     player.angle -= (Math.PI / 90);
    //     changed = true;
    // }

    // if (keys['ArrowRight']) {
    //     player.angle += (Math.PI / 90);
    //     changed = true;
    // }
    let tempEntities = [...entities];
    tempEntities.forEach((entity) => {
        updateEntity(entity);
    });

    if (mouseDeltaX !== 0) {
        const mouseSensitivity = 0.001;
        player.angle += mouseDeltaX * mouseSensitivity;
        mouseDeltaX = 0; // Reset after applying
        changed = true;
    }

    if ((lastKeys['KeyE'] && (!keys['KeyE'])) && (document.pointerLockElement === screen)) {
        // interact
    }

    if (keys['ArrowUp'] || keys['KeyW'] && (document.pointerLockElement === screen)) {
        const dx = Math.cos(player.angle);
        const dy = Math.sin(player.angle);
        let tempX = player.x + dx * player.speed;
        let tempY = player.y + dy * player.speed;

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] === 0) {
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

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] === 0) {
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

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] === 0) {
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

        if (!outOfBounds(Math.floor(tempY), mapSize) && !outOfBounds(Math.floor(tempX), mapSize) && levelMap[Math.floor(tempY)][Math.floor(tempX)] === 0) {
            player.x = tempX;
            player.y = tempY
        }

        changed = true;
    }

    if (lastKeys['KeyT'] && (!keys['KeyT']) && (document.pointerLockElement === screen)) {
        lastKeys['KeyT'] = keys['KeyT'];
        if (!musicPlaying) myAssets.stormTheKeep.play();
        else myAssets.stormTheKeep.pause();
        musicPlaying = !musicPlaying;
    }

    if (changed || animationPlaying) displayScreen();
  
  requestAnimationFrame(update);
}

document.addEventListener('DOMContentLoaded', () => {
    init();
});