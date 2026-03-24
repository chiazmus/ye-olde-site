export const three = {
  relativePoint(point, player) {
    const cos = Math.cos(player.angle);
    const sin = Math.sin(player.angle);

    // translate point relative to player position
    const dx = point.x - player.pos.x;
    const dy = point.y - player.pos.y;
    const dz = point.z - player.pos.z;

    // rotate around the Y-axis (XZ plane)
    return {
      x: dx * cos + dz * sin,
      y: dy,
      z: dz * cos - dx * sin
    };
  },

  to2D({ x, y, z }) {
    const safeZ = z <= 0 ? 0.001 : z;
    return {
      x: x / safeZ,
      y: y / safeZ
    };
  },

  toScreenCoord({ x, y }, screenWidth, screenHeight) {
    return {
      x: ((x + 1) / 2) * screenWidth,
      y: (1 - (y + 1) / 2) * screenHeight
    };
  }
};