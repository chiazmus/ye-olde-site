console.log('starting program...');
const screen = document.getElementById("screen");
screen.width = 320;
screen.height = 200;
const ctx = screen.getContext("2d");
let myAssets;

const frameBuffer = ctx.createImageData(screen.width, screen.height);
const buf32 = new Uint32Array(frameBuffer.data.buffer);

import { three } from "./three.js";

const Util = {
  toRad(degrees) {
    return degrees * (Math.PI / 180);
  },
};

function segmentsCross(ax, az, bx, bz, cx, cz, dx, dz) {
  const d1x = bx - ax, d1z = bz - az;
  const d2x = dx - cx, d2z = dz - cz;
  const denom = d1x * d2z - d1z * d2x;
  if (Math.abs(denom) < 1e-10) return false;
  const t = ((cx - ax) * d2z - (cz - az) * d2x) / denom;
  const u = ((cx - ax) * d1z - (cz - az) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

const Player = {
  pos: {
    x: 0,
    y: 0,
    z: 0,
  },
  angle: 0,
  currentSector: null,
};

const screenFunc = {
  clear() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, screen.width, screen.height);
  },

  drawLine(x1, y1, x2, y2, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  },

drawImagePoly(image, p1, p2, p3, p4, zLeft, zRight, uLeft, uRight) {
    const wallWidth = Math.abs(p2.x - p1.x);
    if (wallWidth === 0) return;

    const topDY    = (p2.y - p1.y) / wallWidth;
    const bottomDY = (p3.y - p4.y) / wallWidth;
    const texSize  = image.width;

    // Clamp draw range to screen bounds
    const startX = Math.max(0, Math.floor(p1.x));
    const endX   = Math.min(ctx.canvas.width, Math.floor(p1.x + wallWidth));

    for (let screenX = startX; screenX < endX; screenX++) {
      const x = screenX - p1.x;
      const t = x / wallWidth;

      // Perspective correct interpolation
      const zInv   = (1 - t) * (1 / zLeft) + t * (1 / zRight);
      const uOverZ = (1 - t) * (uLeft / zLeft) + t * (uRight / zRight);
      const u      = uOverZ / zInv;

      const topY    = (topDY * x) + p1.y;
      const bottomY = (bottomDY * x) + p4.y;
      
      // Multiplied by texSize so 1 world unit = 1 texture repeat
      const texX = Math.abs(Math.floor(u * texSize)) % texSize;

      ctx.drawImage(image, texX, 0, 1, texSize, screenX, topY, 1, bottomY - topY);
    }
  },
  
  drawTexturedColumn(imagePixels, screenX, topY, bottomY, u, texWidth, texHeight) {
    if (screenX < 0 || screenX >= screen.width) return;

    const startY = Math.max(0, Math.floor(topY));
    const endY = Math.min(screen.height, Math.floor(bottomY));
    const wallHeight = bottomY - topY;
    
    // Pre-calculate horizontal texture coordinate
    const tx = Math.floor(u * texWidth) % texWidth;
    
    for (let y = startY; y < endY; y++) {
      // Calculate vertical texture coordinate
      const tY = (y - topY) / wallHeight;
      const ty = Math.floor(tY * texHeight) % texHeight;
      
      // Get pixel from texture and write to buffer
      // (Assumes texture is also a Uint32Array for speed)
      buf32[y * screen.width + screenX] = imagePixels[ty * texWidth + tx];
    }
  },

  renderBuffer() {
    ctx.putImageData(frameBuffer, 0, 0);
  }
};

const NEAR_PLANE = 0.1;

class Wall {
  constructor(point1, point2, point3, point4) {
    // Store original world points
    this.worldPoints = [point1, point2, point3, point4];
    this.color = "white";
  }

draw() {
    // Calculate true length to set max U coordinate
    const trueWallLength = Math.sqrt(Math.pow(this.worldPoints[0].x - this.worldPoints[3].x, 2) + Math.pow(this.worldPoints[0].z - this.worldPoints[3].z, 2));
    const uCoords = [0, 0, trueWallLength, trueWallLength]; 

    let clippedPoints = [];

    for (let i = 0; i < 4; i++) {
      const p1_raw = this.worldPoints[i];
      const p2_raw = this.worldPoints[(i + 1) % 4];

      const p1 = three.relativePoint(p1_raw, Player);
      const p2 = three.relativePoint(p2_raw, Player);
      
      p1.u = uCoords[i];
      p2.u = uCoords[(i + 1) % 4];

      if (p1.z >= NEAR_PLANE) {
        clippedPoints.push(p1);
      }

      if (
        (p1.z >= NEAR_PLANE && p2.z < NEAR_PLANE) ||
        (p1.z < NEAR_PLANE && p2.z >= NEAR_PLANE)
      ) {
        const t = (NEAR_PLANE - p1.z) / (p2.z - p1.z);
        clippedPoints.push({
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          z: NEAR_PLANE,
          u: p1.u + t * (p2.u - p1.u), // Interpolate U on clip
        });
      }
    }

    if (clippedPoints.length < 3) return;

    // Project clipped points to screen space AND carry over Z and U
    const screenPoints = clippedPoints.map((p) => {
      const sp = three.toScreenCoord(three.to2D(p), screen.width, screen.height);
      sp.z = p.z;
      sp.u = p.u;
      return sp;
    });

    const sortedByX = [...screenPoints].sort((a, b) => a.x - b.x);

    const leftMost  = sortedByX[0];
    const rightMost = sortedByX[sortedByX.length - 1];

    const midX = (leftMost.x + rightMost.x) / 2;
    const leftPoints  = screenPoints.filter(p => p.x <= midX);
    const rightPoints = screenPoints.filter(p => p.x >  midX);

    const topLeft     = leftPoints.length  ? leftPoints.reduce( (a,b) => a.y <= b.y ? a : b) : leftMost;
    const bottomLeft  = leftPoints.length  ? leftPoints.reduce( (a,b) => a.y >= b.y ? a : b) : leftMost;
    const topRight    = rightPoints.length ? rightPoints.reduce((a,b) => a.y <= b.y ? a : b) : rightMost;
    const bottomRight = rightPoints.length ? rightPoints.reduce((a,b) => a.y >= b.y ? a : b) : rightMost;

    screenFunc.drawImagePoly(
      myAssets.wall, 
      topLeft, topRight, bottomRight, bottomLeft, 
      leftMost.z, rightMost.z, leftMost.u, rightMost.u
    );
  }
}

class Sector {
  constructor(points, topOffset, bottomOffset) {
    this.points = points;
    this.topOffset = topOffset;
    this.bottomOffset = bottomOffset;
    this.walls = [];
    this.floorColor = "#353";
    this.ceilingColor = "#533";
    this.neighbors = [];
    this.portalVertecies = [];
    this.portals = new Map();

    for (let i = 0; i < points.length; i++) {
      const currentPoint = points[i];
      const nextPoint = points[(i + 1) % points.length];

      const newWall = new Wall(
        { x: currentPoint.x, y: -this.bottomOffset, z: currentPoint.y },
        { x: currentPoint.x, y: this.topOffset, z: currentPoint.y },
        { x: nextPoint.x, y: this.topOffset, z: nextPoint.y },
        { x: nextPoint.x, y: -this.bottomOffset, z: nextPoint.y },
      );

      this.walls.push(newWall);
    }
  }

  playerInSector() {
    for (const wall of this.walls) {
      const p1 = wall.worldPoints[0];
      const p2 = wall.worldPoints[3];

      const side =
        (p2.x - p1.x) * (Player.pos.z - p1.z) -
        (p2.z - p1.z) * (Player.pos.x - p1.x);

      if (side > 0) {
        //between wall endpoints?
        const dx = p2.x - p1.x;
        const dz = p2.z - p1.z;
        const lengthSq = dx * dx + dz * dz;

        // Calculate how far along the line the player is (0.0 to 1.0)
        const dot =
          ((Player.pos.x - p1.x) * dx + (Player.pos.z - p1.z) * dz) / lengthSq;

        if (dot >= 0 && dot <= 1) {
          return wall;
        }
      }
    }
    return true;
  }

  createPortals() {
    const pointsMatch = (p1, p2) => p1.x === p2.x && p1.y === p2.y;
    // Check if walls share the same start and end coordinates
    const wallsMatch = (w1, w2) => {
      const p1a = w1.worldPoints[0],
        p1b = w1.worldPoints[3];
      const p2a = w2.worldPoints[0],
        p2b = w2.worldPoints[3];
      // Check both directions (shared walls are often wound oppositely)
      return (
        (pointsMatch({ x: p1a.x, y: p1a.z }, { x: p2a.x, y: p2a.z }) &&
          pointsMatch({ x: p1b.x, y: p1b.z }, { x: p2b.x, y: p2b.z })) ||
        (pointsMatch({ x: p1a.x, y: p1a.z }, { x: p2b.x, y: p2b.z }) &&
          pointsMatch({ x: p1b.x, y: p1b.z }, { x: p2a.x, y: p2a.z }))
      );
    };

    for (let neighbor of this.neighbors) {
      for (let p1 of this.points) {
        for (let p2 of neighbor.points) {
          if (pointsMatch(p1, p2)) {
            this.portalVertecies.push(p1);
            neighbor.portalVertecies.push(p2);
          }
        }
      }

      for (let wall of this.walls) {
        for (let neighborWall of neighbor.walls) {
          if (wallsMatch(wall, neighborWall)) {
            this.portals.set(wall, neighbor);
            neighbor.portals.set(neighborWall, this);
          }
        }
      }
    }
  }

  drawFloorCeiling(offset) {
    let worldFloorPoints = this.points.map((p) => ({
      x: p.x,
      y: offset,
      z: p.y,
    }));

    let clippedPoints = [];

    // Clip the floor polygon against the NEAR_PLANE
    for (let i = 0; i < worldFloorPoints.length; i++) {
      const p1_raw = worldFloorPoints[i];
      const p2_raw = worldFloorPoints[(i + 1) % worldFloorPoints.length];

      const p1 = three.relativePoint(p1_raw, Player);
      const p2 = three.relativePoint(p2_raw, Player);

      if (p1.z >= NEAR_PLANE) {
        clippedPoints.push(p1);
      }

      if (
        (p1.z >= NEAR_PLANE && p2.z < NEAR_PLANE) ||
        (p1.z < NEAR_PLANE && p2.z >= NEAR_PLANE)
      ) {
        const t = (NEAR_PLANE - p1.z) / (p2.z - p1.z);
        clippedPoints.push({
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          z: NEAR_PLANE,
        });
      }
    }

    if (clippedPoints.length < 3) return;

    ctx.beginPath();
    ctx.fillStyle = offset > 0 ? this.floorColor : this.ceilingColor;

    clippedPoints.forEach((p, index) => {
      const screenPos = three.toScreenCoord(
        three.to2D(p),
        screen.width,
        screen.height,
      );
      if (index === 0) ctx.moveTo(screenPos.x, screenPos.y);
      else ctx.lineTo(screenPos.x, screenPos.y);
    });

    ctx.closePath();
    ctx.fill();
  }

  clipPortal(worldPoints) {
    let clipped = [];
    for (let i = 0; i < worldPoints.length; i++) {
      const p1_raw = worldPoints[i];
      const p2_raw = worldPoints[(i + 1) % worldPoints.length];

      const p1 = three.relativePoint(p1_raw, Player);
      const p2 = three.relativePoint(p2_raw, Player);

      // Standard Sutherland-Hodgman clipping against z = NEAR_PLANE
      if (p1.z >= NEAR_PLANE) clipped.push(p1);

      if ((p1.z >= NEAR_PLANE && p2.z < NEAR_PLANE) || 
          (p1.z < NEAR_PLANE && p2.z >= NEAR_PLANE)) {
        const t = (NEAR_PLANE - p1.z) / (p2.z - p1.z);
        clipped.push({
          x: p1.x + t * (p2.x - p1.x),
          y: p1.y + t * (p2.y - p1.y),
          z: NEAR_PLANE
        });
      }
    }
    return clipped.length >= 3 ? clipped : null;
  }

  getPortalScreenCoords(wall) {
    const clipped3D = this.clipPortal(wall.worldPoints);
    if (!clipped3D) return null;

    // Project the clipped 3D points into 2D screen coordinates
    return clipped3D.map(p => 
      three.toScreenCoord(three.to2D(p), screen.width, screen.height)
    );
  }

  draw(clipPolygon = null, parentSectors = []) {
    ctx.save();

    // If a clip polygon is provided (from a portal), apply it
    if (clipPolygon) {
      ctx.beginPath();
      clipPolygon.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.clip();
    }

    // 1. Draw floor and ceiling
    this.drawFloorCeiling(-this.bottomOffset);
    this.drawFloorCeiling(this.topOffset);

    // 2. Draw walls and handle portals
    for (let wall of this.walls) {
      const neighbor = this.portals.get(wall);

      if (!neighbor) {
        // It's a solid wall: Draw it
        wall.draw();
      } else if (!parentSectors.includes(neighbor)) {
        // It's a portal: Calculate its screen-space area and recurse
        const portalScreenPoints = this.getPortalScreenCoords(wall);
        if (portalScreenPoints) {
          // Prevent infinite recursion by not drawing the sector we just came from
          // (Simplified for this example)
          neighbor.draw(portalScreenPoints, [...parentSectors, this]);
        }
      }
    }

    ctx.restore();
  }
}

// ═══════════════════════════════════════════════════
// SECTOR FORGE — Generated Level Data
// 9 sector(s), exported 3/22/2026, 1:00:54 PM
// ═══════════════════════════════════════════════════

const sector0 = new Sector(
  [
    { x: -2, y: 0 },
    { x: -2, y: 2 },
    { x: -1, y: 3 },
    { x: 1, y: 3 },
    { x: 2, y: 2 },
    { x: 2, y: 0 },
    { x: 2, y: -2 },
    { x: 1, y: -3 },
    { x: -1, y: -3 },
    { x: -2, y: -2 }
  ],
  1,  // topOffset
  1   // bottomOffset
);
sector0.floorColor = "#353";
sector0.ceilingColor = "#533";

const sector1 = new Sector(
  [
    { x: 1, y: 3 },
    { x: 1.5, y: 3.5 },
    { x: 2.5, y: 2.5 },
    { x: 2, y: 2 }
  ],
  1.25,  // topOffset
  0.75   // bottomOffset
);
sector1.floorColor = "#353";
sector1.ceilingColor = "#533";

const sector2 = new Sector(
  [
    { x: 2.5, y: 2.5 },
    { x: 3, y: 3.5 },
    { x: 2, y: 4 },
    { x: 1.5, y: 3.5 }
  ],
  1.5,  // topOffset
  0.5   // bottomOffset
);
sector2.floorColor = "#353";
sector2.ceilingColor = "#533";

const sector3 = new Sector(
  [
    { x: 3, y: 3.5 },
    { x: 3, y: 4.5 },
    { x: 2, y: 5 },
    { x: 2, y: 4 }
  ],
  1.75,  // topOffset
  0.25   // bottomOffset
);
sector3.floorColor = "#353";
sector3.ceilingColor = "#533";

const sector4 = new Sector(
  [
    { x: 3, y: 4.5 },
    { x: 3, y: 5.5 },
    { x: 2, y: 5.5 },
    { x: 2, y: 5 }
  ],
  2,  // topOffset
  0   // bottomOffset
);
sector4.floorColor = "#353";
sector4.ceilingColor = "#533";

const sector5 = new Sector(
  [
    { x: 3, y: 5.5 },
    { x: 4, y: 5.5 },
    { x: 4.5, y: 6.5 },
    { x: 3.5, y: 8.5 },
    { x: 0.5, y: 8.5 },
    { x: -1, y: 7 },
    { x: 1, y: 5.5 },
    { x: 2, y: 5.5 }
  ],
  2.5,  // topOffset
  -0.25   // bottomOffset
);
sector5.floorColor = "#353";
sector5.ceilingColor = "#533";

const sector6 = new Sector(
  [
    { x: 1, y: 5.5 },
    { x: 1, y: 4 },
    { x: -2, y: 4 },
    { x: -3, y: 5 },
    { x: -4, y: 6 },
    { x: -3, y: 7 },
    { x: -1, y: 7 }
  ],
  3,  // topOffset
  -0.5   // bottomOffset
);
sector6.floorColor = "#353";
sector6.ceilingColor = "#533";

const sector7 = new Sector(
  [
    { x: 4, y: 5.5 },
    { x: 4, y: 4 },
    { x: 6, y: 4 },
    { x: 6, y: 7 },
    { x: 5, y: 7 },
    { x: 4.5, y: 6.5 }
  ],
  2.5,  // topOffset
  0   // bottomOffset
);
sector7.floorColor = "#353";
sector7.ceilingColor = "#533";

const sector8 = new Sector(
  [
    { x: 2, y: -2 },
    { x: 6, y: -2 },
    { x: 6, y: 2 },
    { x: 3, y: 2 },
    { x: 2, y: 0 }
  ],
  2,  // topOffset
  1.25   // bottomOffset
);
sector8.floorColor = "#353";
sector8.ceilingColor = "#533";

// — Neighbor Links —
sector0.neighbors.push(sector1, sector8);
sector1.neighbors.push(sector0, sector2);
sector2.neighbors.push(sector1, sector3);
sector3.neighbors.push(sector2, sector4);
sector4.neighbors.push(sector3, sector5);
sector5.neighbors.push(sector4, sector6, sector7);
sector6.neighbors.push(sector5);
sector7.neighbors.push(sector5);
sector8.neighbors.push(sector0);

// — Portal Creation —
[sector0, sector1, sector2, sector3, sector4, sector5, sector6, sector7, sector8].forEach(s => s.createPortals());

// — Player Start —
Player.currentSector = sector0;
Player.pos = { x: 0, y: (1 - sector0.bottomOffset), z: 0 };

function drawScreen() {
  screenFunc.clear();
  Player.currentSector.draw();
}

function loadImage (url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.src = url;
    });
}

async function init() {
    
    ctx.imageSmoothingEnabled = false;
    console.log('loading images...');

    const [wall, floor] = await Promise.all([
        loadImage('/projects/doomEngine/assets/brickWall.png'),
        loadImage('/projects/doomEngine/assets/tileFloor.png'),
    ]);

    myAssets = { wall, floor };
        
    drawScreen();
}

document.addEventListener("keydown", (e) => {
  const speed = 0.1;
  const rotSpeed = 0.05;
  const tangle = Util.toRad(90) + Player.angle;

  const prevPos = { x: Player.pos.x, y: Player.pos.y, z: Player.pos.z };

  if (e.key === "w") {
    Player.pos.x += Math.cos(tangle) * speed;
    Player.pos.z += Math.sin(tangle) * speed;
  }
  if (e.key === "s") {
    Player.pos.x -= Math.cos(tangle) * speed;
    Player.pos.z -= Math.sin(tangle) * speed;
  }
  if (e.key === "ArrowLeft") Player.angle += rotSpeed;
  if (e.key === "ArrowRight") Player.angle -= rotSpeed;

  let crossed = null;
  for (const wall of Player.currentSector.walls) {
    const w1 = wall.worldPoints[0];
    const w2 = wall.worldPoints[3];
    if (segmentsCross(
      prevPos.x, prevPos.z,
      Player.pos.x, Player.pos.z,
      w1.x, w1.z, w2.x, w2.z
    )) {
      crossed = wall;
      break;
    }
  }

  if (crossed) {
    const nextSector = Player.currentSector.portals.get(crossed);
    if (nextSector) {
      Player.currentSector = nextSector;
      Player.pos.y = 1 - nextSector.bottomOffset;
    } else {
      Player.pos = prevPos; // solid wall, block movement
    }
  }

  drawScreen();
});


init();
