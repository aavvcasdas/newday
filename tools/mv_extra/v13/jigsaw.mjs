/**
 * jigsaw.mjs — Parametric interlocking Bezier jigsaw geometry & 3D beveled paper-board renderer.
 * Every shared edge between adjacent grid cells has exact opposite tab polarity (+1 / -1) so
 * puzzle worlds, split-screens, and the final 5x3 keepsake lock together with zero seam gaps.
 */

export function detHash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/**
 * Add one jigsaw edge from (x0, y0) to (x1, y1).
 * tab = 0 (flat border), +1 (protruding outward to the left of directed vector), -1 (indented inward).
 */
export function jigsawEdgeTo(c, x0, y0, x1, y1, tab = 0, tabSize = 0.22) {
  if (!tab) {
    c.lineTo(x1, y1);
    return;
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  // Outward normal for clockwise piece traversal (top: up, right: right, bottom: down, left: left)
  const nx = dy * tab * tabSize;
  const ny = -dx * tab * tabSize;
  const pt = (u, v) => [x0 + dx * u + nx * v, y0 + dy * u + ny * v];

  const [p1x, p1y] = pt(0.35, 0.0);
  const [c1x, c1y] = pt(0.38, -0.06);
  const [c2x, c2y] = pt(0.30, 0.36);
  const [p2x, p2y] = pt(0.35, 0.68);

  const [c3x, c3y] = pt(0.40, 1.04);
  const [c4x, c4y] = pt(0.60, 1.04);
  const [p3x, p3y] = pt(0.65, 0.68);

  const [c5x, c5y] = pt(0.70, 0.36);
  const [c6x, c6y] = pt(0.62, -0.06);
  const [p4x, p4y] = pt(0.65, 0.0);

  c.lineTo(p1x, p1y);
  c.bezierCurveTo(c1x, c1y, c2x, c2y, p2x, p2y);
  c.bezierCurveTo(c3x, c3y, c4x, c4y, p3x, p3y);
  c.bezierCurveTo(c5x, c5y, c6x, c6y, p4x, p4y);
  c.lineTo(x1, y1);
}

/**
 * Trace a complete rectangular jigsaw piece path clockwise from top-left (x, y).
 * tabs = { top, right, bottom, left } where +1 protrudes outward from the piece, -1 indents inward.
 */
export function traceJigsawPiece(c, x, y, w, h, tabs = {}, tabSize = 0.22) {
  const { top = 0, right = 0, bottom = 0, left = 0 } = tabs;
  c.beginPath();
  c.moveTo(x, y);
  jigsawEdgeTo(c, x, y, x + w, y, top, tabSize);
  jigsawEdgeTo(c, x + w, y, x + w, y + h, right, tabSize);
  jigsawEdgeTo(c, x + w, y + h, x, y + h, bottom, tabSize);
  jigsawEdgeTo(c, x, y + h, x, y, left, tabSize);
  c.closePath();
}

/**
 * Generate a cols x rows matrix of jigsaw tab definitions where adjacent cells interlock seamlessly.
 */
export function buildJigsawGrid(cols, rows, seed = 17, outerFlat = true) {
  const hEdges = Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols }, (_, col) => {
      if (outerFlat && (r === 0 || r === rows)) return 0;
      return detHash(seed * 97 + r * 31 + col * 13) > 0.5 ? 1 : -1;
    })
  );
  const vEdges = Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols + 1 }, (_, col) => {
      if (outerFlat && (col === 0 || col === cols)) return 0;
      return detHash(seed * 131 + r * 19 + col * 41) > 0.5 ? 1 : -1;
    })
  );

  const grid = [];
  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let col = 0; col < cols; col++) {
      // If hEdges[r][col] == +1, top piece protrudes upward (+1), piece above has bottom = -1
      row.push({
        col,
        row: r,
        top: hEdges[r][col],
        bottom: -hEdges[r + 1][col],
        left: vEdges[r][col],
        right: -vEdges[r][col + 1],
      });
    }
    grid.push(row);
  }
  return grid;
}

/**
 * Draw a 3D-extruded tactile paper-board jigsaw piece (voxel-mv tabletop craft thickness +
 * world-execute-me offset shadow plate).
 */
export function drawExtrudedPiece(
  c,
  x,
  y,
  w,
  h,
  tabs = { top: 1, right: 1, bottom: 0, left: -1 },
  {
    fill = '#e2d2b5',
    side = '#b39e7e',
    stroke = '#f5ead3',
    shadow = 'rgba(14, 24, 36, 0.24)',
    depth = 7,
    angle = 0,
    lineWidth = 1.6,
    tabSize = 0.22,
    alpha = 1,
  } = {}
) {
  c.save();
  c.globalAlpha *= alpha;
  const cx = x + w / 2;
  const cy = y + h / 2;
  c.translate(cx, cy);
  if (angle) c.rotate(angle);
  const lx = -w / 2;
  const ly = -h / 2;

  if (shadow && depth > 0) {
    c.save();
    c.translate(depth * 0.65, depth * 1.35);
    traceJigsawPiece(c, lx, ly, w, h, tabs, tabSize);
    c.fillStyle = shadow;
    c.fill();
    c.restore();
  }

  if (depth > 0 && side) {
    const steps = Math.max(2, Math.ceil(depth / 2));
    for (let s = steps; s >= 1; s--) {
      const f = s / steps;
      c.save();
      c.translate(depth * 0.32 * f, depth * f);
      traceJigsawPiece(c, lx, ly, w, h, tabs, tabSize);
      c.fillStyle = side;
      c.fill();
      c.restore();
    }
  }

  traceJigsawPiece(c, lx, ly, w, h, tabs, tabSize);
  c.fillStyle = fill;
  c.fill();
  if (stroke && lineWidth > 0) {
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.lineJoin = 'round';
    c.stroke();
  }
  c.restore();
}

/**
 * Clip arbitrary drawing into an interlocking jigsaw cell, then stroke its beveled seam.
 */
export function clipJigsawCell(
  c,
  x,
  y,
  w,
  h,
  tabs,
  drawFn,
  { stroke = '#efe3c8', shadowStroke = 'rgba(15, 25, 38, 0.35)', lineWidth = 2.6, tabSize = 0.2 } = {}
) {
  c.save();
  traceJigsawPiece(c, x, y, w, h, tabs, tabSize);
  c.clip();
  drawFn();
  c.restore();

  if (shadowStroke) {
    c.save();
    c.translate(1.5, 2.2);
    traceJigsawPiece(c, x, y, w, h, tabs, tabSize);
    c.strokeStyle = shadowStroke;
    c.lineWidth = lineWidth;
    c.stroke();
    c.restore();
  }
  if (stroke && lineWidth > 0) {
    c.save();
    traceJigsawPiece(c, x, y, w, h, tabs, tabSize);
    c.strokeStyle = stroke;
    c.lineWidth = lineWidth;
    c.stroke();
    c.restore();
  }
}
