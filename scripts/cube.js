const screen = document.getElementById('cubeScreen');
screen.width = 500;
screen.height = 500;
const ctx = screen.getContext("2d");
const bgColor = '#111';
const fgColor = '#5f5';

// 'x = x/z
// 'y = y/z

const clear = () => {
    ctx.fillStyle = bgColor;
    ctx.fillRect(0,0,screen.width,screen.height);
};

const drawPoint = ({x, y}) => {
    const s = 4
    ctx.fillStyle = fgColor;
    ctx.fillRect(x - s/2, y - s/2, s, s);
};

const drawLine = (p1, p2) => {
    ctx.strokeStyle = fgColor;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();
};

const convert2D = ({x, y, z}) => {
    return {
        x: x / z, 
        y: y / z
    };
};

const toScreenCoord = ({x, y}) => {
    return {
        x: (x + 1) / 2 * screen.width,
        y: (1 - (y + 1) / 2) * screen.height
    }
}

const rotateXZ = ({x, y, z}, theta) => {
    const zOffset = 2.5
    const cosine = Math.cos(theta);
    const sine = Math.sin(theta);
    return {
        x: (x * cosine) - ((z - zOffset) * sine),
        y: y,
        z: (x * sine) + ((z - zOffset) * cosine)+zOffset
    }
};

const rotateXY = ({x, y, z}, theta) => {
    const cosine = Math.cos(theta);
    const sine = Math.sin(theta);
    return {
        x: (x * cosine) - (y * sine),
        y: (x * sine) + (y * cosine),
        z: z
    }
};

const rotatePoint = ({x, y, z}, theta) => {
    return rotateXY(rotateXZ({x, y, z}, theta), theta)
};

const drawCube = (cube, theta) => {
    for (let i = 0; i < 4; i++) {
        drawLine(toScreenCoord(convert2D(rotatePoint(cube[i], theta))), toScreenCoord(convert2D(rotatePoint(cube[(i+1) % 4], theta))));
        drawLine(toScreenCoord(convert2D(rotatePoint(cube[(i+4)], theta))), toScreenCoord(convert2D(rotatePoint(cube[((i+1) % 4) + 4], theta))));
        drawLine(toScreenCoord(convert2D(rotatePoint(cube[(i+4)], theta))), toScreenCoord(convert2D(rotatePoint(cube[i], theta))));
    }
};

const myCube = [
    {x : 0.5, y : -0.5, z : 2}, {x : -0.5, y : -0.5, z : 2}, {x : -0.5, y : 0.5, z : 2}, {x : 0.5, y : 0.5, z : 2},
    {x : 0.5, y : -0.5, z : 3}, {x : -0.5, y : -0.5, z : 3}, {x : -0.5, y : 0.5, z : 3}, {x : 0.5, y : 0.5, z : 3}
];

const miniCube = [
    {x : 0.25, y : -0.25, z : 2.25}, {x : -0.25, y : -0.25, z : 2.25}, {x : -0.25, y : 0.25, z : 2.25}, {x : 0.25, y : 0.25, z : 2.25},
    {x : 0.25, y : -0.25, z : 2.75}, {x : -0.25, y : -0.25, z : 2.75}, {x : -0.25, y : 0.25, z : 2.75}, {x : 0.25, y : 0.25, z : 2.75}
];

const FPS = 60;
let angle = 0;
let littleAngle = 0;

function frame() {
    const dt = 1/FPS;
    angle += (Math.PI / 2) * dt;
    littleAngle -= (Math.PI) * dt;
    clear();
    drawCube(miniCube, littleAngle);
    drawCube(myCube, angle);
    setTimeout(frame, 1000/FPS);
}

setTimeout(frame, 1000/FPS);