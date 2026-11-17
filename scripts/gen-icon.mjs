// 零依赖图标生成器：输出 icon.png (256x256 RGBA) 与等价 icon.svg
// 用法：node scripts/gen-icon.mjs
// 设计：Maven 品牌红渐变圆角矩形 + 自绘等轴测立方体 + 播放键（不复制 Apache Maven 官方 logo 图形）
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';

const SIZE = 256;        // 输出尺寸
const SS = 4;            // 超采样倍数（4x -> 1024 覆盖率网格）
const MARGIN = 4;        // 圆角矩形留边
const RADIUS = 56;       // 圆角半径

// ---- 调色板 ----
const GRAD_TOP = [210, 35, 66];    // #D22342
const GRAD_BOT = [163, 18, 42];    // #A3122A
const FACE_TOP = [255, 255, 255];  // 立方体顶面 #FFFFFF
const FACE_LEFT = [232, 232, 236]; // 立方体左面 #E8E8EC
const FACE_RIGHT = [245, 245, 247];// 立方体右面 #F5F5F7
const PLAY_BG = [255, 255, 255];   // 播放键底圆 白
const PLAY_FG = [199, 26, 54];     // 播放三角 #C71A36

// ---- 几何（256 坐标空间）----
// 等轴测立方体：中心略偏左
const CUBE_CX = 112, CUBE_CY = 124, CUBE_S = 62;
const ISO_X = 0.8660254; // cos30
const cube = {
  top: [
    [CUBE_CX, CUBE_CY - CUBE_S],
    [CUBE_CX + ISO_X * CUBE_S, CUBE_CY - 0.5 * CUBE_S],
    [CUBE_CX, CUBE_CY],
    [CUBE_CX - ISO_X * CUBE_S, CUBE_CY - 0.5 * CUBE_S],
  ],
  left: [
    [CUBE_CX - ISO_X * CUBE_S, CUBE_CY - 0.5 * CUBE_S],
    [CUBE_CX, CUBE_CY],
    [CUBE_CX, CUBE_CY + CUBE_S],
    [CUBE_CX - ISO_X * CUBE_S, CUBE_CY + 0.5 * CUBE_S],
  ],
  right: [
    [CUBE_CX, CUBE_CY],
    [CUBE_CX + ISO_X * CUBE_S, CUBE_CY - 0.5 * CUBE_S],
    [CUBE_CX + ISO_X * CUBE_S, CUBE_CY + 0.5 * CUBE_S],
    [CUBE_CX, CUBE_CY + CUBE_S],
  ],
};

// 播放键：与圆角矩形右下角同心，保证不越界
const PLAY_CX = 196, PLAY_CY = 196, PLAY_R = 34;
const playTri = [
  [PLAY_CX - 11, PLAY_CY - 17],
  [PLAY_CX - 11, PLAY_CY + 17],
  [PLAY_CX + 16, PLAY_CY],
];

// ---- 几何判定 ----
function inRoundedRect(x, y) {
  const x0 = MARGIN, y0 = MARGIN, x1 = SIZE - MARGIN, y1 = SIZE - MARGIN;
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  const halfW = (x1 - x0) / 2, halfH = (y1 - y0) / 2;
  const qx = Math.abs(x - cx) - (halfW - RADIUS);
  const qy = Math.abs(y - cy) - (halfH - RADIUS);
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
  const dist = Math.hypot(ox, oy) + Math.min(Math.max(qx, qy), 0) - RADIUS;
  return dist < 0;
}

// 凸多边形：叉积符号一致即在内部
function inConvex(x, y, verts) {
  let sign = 0;
  for (let i = 0; i < verts.length; i++) {
    const [ax, ay] = verts[i];
    const [bx, by] = verts[(i + 1) % verts.length];
    const cross = (bx - ax) * (y - ay) - (by - ay) * (x - ax);
    if (cross === 0) continue;
    const s = cross > 0 ? 1 : -1;
    if (sign === 0) sign = s;
    else if (s !== sign) return false;
  }
  return true;
}

function inCircle(x, y, cx, cy, r) {
  return Math.hypot(x - cx, y - cy) <= r;
}

function gradientAt(y) {
  const t = Math.min(1, Math.max(0, (y - MARGIN) / (SIZE - 2 * MARGIN)));
  return [
    GRAD_TOP[0] + (GRAD_BOT[0] - GRAD_TOP[0]) * t,
    GRAD_TOP[1] + (GRAD_BOT[1] - GRAD_TOP[1]) * t,
    GRAD_TOP[2] + (GRAD_BOT[2] - GRAD_TOP[2]) * t,
  ];
}

// 单个采样点 -> [r,g,b,a]（a 为 0..1）
function sample(x, y) {
  if (!inRoundedRect(x, y)) return [0, 0, 0, 0];
  let col = gradientAt(y);
  if (inConvex(x, y, cube.top)) col = FACE_TOP;
  else if (inConvex(x, y, cube.left)) col = FACE_LEFT;
  else if (inConvex(x, y, cube.right)) col = FACE_RIGHT;
  if (inCircle(x, y, PLAY_CX, PLAY_CY, PLAY_R)) {
    col = inConvex(x, y, playTri) ? PLAY_FG : PLAY_BG;
  }
  return [col[0], col[1], col[2], 1];
}

// ---- 渲染：4x 超采样 + 盒式降采样（premultiplied 累加，避免边缘彩边）----
function render() {
  const px = new Uint8Array(SIZE * SIZE * 4);
  const step = 1 / SS;
  for (let oy = 0; oy < SIZE; oy++) {
    for (let ox = 0; ox < SIZE; ox++) {
      let sa = 0, sr = 0, sg = 0, sb = 0;
      for (let j = 0; j < SS; j++) {
        for (let i = 0; i < SS; i++) {
          const sx = ox + (i + 0.5) * step;
          const sy = oy + (j + 0.5) * step;
          const [r, g, b, a] = sample(sx, sy);
          sa += a; sr += r * a; sg += g * a; sb += b * a;
        }
      }
      const n = SS * SS;
      const a = sa / n;
      const idx = (oy * SIZE + ox) * 4;
      if (a > 0) {
        px[idx] = Math.round(sr / sa);
        px[idx + 1] = Math.round(sg / sa);
        px[idx + 2] = Math.round(sb / sa);
      }
      px[idx + 3] = Math.round(a * 255);
    }
  }
  return px;
}

// ---- PNG 编码 ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(px) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace
  // 每行前置 filter byte 0
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y++) {
    const rowStart = y * (SIZE * 4 + 1);
    raw[rowStart] = 0; // filter type None
    Buffer.from(px.buffer, y * SIZE * 4, SIZE * 4).copy(raw, rowStart + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ---- SVG（与 PNG 同一组几何参数）----
const fmt = (n) => Number(n.toFixed(2));
function poly(points) {
  return points.map(([x, y]) => `${fmt(x)},${fmt(y)}`).join(' ');
}
function buildSVG() {
  const gid = 'g';
  const faces = [
    ['cube-top', cube.top, FACE_TOP],
    ['cube-left', cube.left, FACE_LEFT],
    ['cube-right', cube.right, FACE_RIGHT],
  ];
  const faceSvg = faces
    .map(([id, pts, c]) => `  <polygon id="${id}" points="${poly(pts)}" fill="rgb(${c.join(',')})"/>`)
    .join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
  <defs>
    <linearGradient id="${gid}" x1="0" y1="${MARGIN}" x2="0" y2="${SIZE - MARGIN}" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="rgb(${GRAD_TOP.join(',')})"/>
      <stop offset="1" stop-color="rgb(${GRAD_BOT.join(',')})"/>
    </linearGradient>
    <clipPath id="clip">
      <rect x="${MARGIN}" y="${MARGIN}" width="${SIZE - 2 * MARGIN}" height="${SIZE - 2 * MARGIN}" rx="${RADIUS}" ry="${RADIUS}"/>
    </clipPath>
  </defs>
  <g clip-path="url(#clip)">
    <rect x="${MARGIN}" y="${MARGIN}" width="${SIZE - 2 * MARGIN}" height="${SIZE - 2 * MARGIN}" fill="url(#${gid})"/>
${faceSvg}
    <circle cx="${PLAY_CX}" cy="${PLAY_CY}" r="${PLAY_R}" fill="rgb(${PLAY_BG.join(',')})"/>
    <polygon points="${poly(playTri)}" fill="rgb(${PLAY_FG.join(',')})"/>
  </g>
</svg>
`;
}

// ---- 自检 ----
function selfCheck(px) {
  const at = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return [0, 0, 0, 0];
    const i = (y * SIZE + x) * 4;
    if (i + 3 >= px.length) return [0, 0, 0, 0];
    return [px[i], px[i + 1], px[i + 2], px[i + 3]];
  };
  const corners = [[0, 0], [255, 0], [0, 255], [255, 255]].map(([x, y]) => at(x, y));
  const cornerAlphaZero = corners.every((c) => c[3] === 0);
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i] === 255) opaque++;
  const total = SIZE * SIZE;
  const center = at(128, 128);
  const cubeTop = at(CUBE_CX, CUBE_CY - CUBE_S / 2);
  const cubeLeft = at(CUBE_CX - ISO_X * CUBE_S / 2, CUBE_CY + CUBE_S / 4);
  const cubeRight = at(CUBE_CX + ISO_X * CUBE_S / 2, CUBE_CY + CUBE_S / 4);
  const playBg = at(PLAY_CX - 24, PLAY_CY);
  const playFg = at(PLAY_CX, PLAY_CY);
  const hex = (c) => (c.length < 4 || c[3] === 0 ? 'transparent' : '#' + c.slice(0, 3).map((v) => v.toString(16).padStart(2, '0')).join(''));
  console.log('size:', `${SIZE}x${SIZE}`);
  console.log('corner alpha (TL,TR,BL,BR):', corners.map((c) => c[3]).join(','), '-> allZero:', cornerAlphaZero);
  console.log('opaque pixel ratio:', `${(opaque / total * 100).toFixed(1)}%`);
  console.log('sample center(128,128):', hex(center), 'a=' + center[3]);
  console.log('sample cube top:', hex(cubeTop), 'left:', hex(cubeLeft), 'right:', hex(cubeRight));
  console.log('sample play bg:', hex(playBg), 'fg:', hex(playFg));
  return { cornerAlphaZero, opaqueRatio: opaque / total };
}

// ---- main ----
const px = render();
const png = encodePNG(px);
writeFileSync('icon.png', png);
writeFileSync('icon.svg', buildSVG());
const check = selfCheck(px);
console.log('icon.png bytes:', png.length);
console.log('icon.svg bytes:', Buffer.byteLength(buildSVG()));
if (!check.cornerAlphaZero) {
  console.error('FAIL: 四角 alpha 不为 0');
  process.exit(1);
}
console.log('OK');
