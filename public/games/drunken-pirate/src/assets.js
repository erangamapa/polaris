/** Sprite backdrop removal helpers. */
export function knockOutLightBackground(img, threshold) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const frame = x.getImageData(0, 0, c.width, c.height);
  const d = frame.data;
  const t = threshold || 245;
  const w = c.width;
  const h = c.height;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => {
    const p = i * 4;
    return d[p] >= t && d[p + 1] >= t && d[p + 2] >= t && d[p + 3] > 8;
  };
  const push = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const i = py * w + px;
    if (seen[i] || !isBg(i)) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let px = 0; px < w; px++) { push(px, 0); push(px, h - 1); }
  for (let py = 0; py < h; py++) { push(0, py); push(w - 1, py); }
  while (stack.length) {
    const i = stack.pop();
    d[i * 4 + 3] = 0;
    const px = i % w;
    const py = (i / w) | 0;
    push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1);
  }
  x.putImageData(frame, 0, 0);
  return c;
}

export function knockOutBackground(img, threshold) {
  return knockOutLightBackground(img, threshold);
}

/** Remove solid black/near-black backdrop (apple PNG). */
export function knockOutDarkBackground(img, threshold) {
  const c = document.createElement("canvas");
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0);
  const frame = x.getImageData(0, 0, c.width, c.height);
  const d = frame.data;
  const t = threshold == null ? 40 : threshold;
  const w = c.width;
  const h = c.height;
  const seen = new Uint8Array(w * h);
  const stack = [];
  const isBg = (i) => {
    const p = i * 4;
    return d[p] <= t && d[p + 1] <= t && d[p + 2] <= t && d[p + 3] > 8;
  };
  const push = (px, py) => {
    if (px < 0 || py < 0 || px >= w || py >= h) return;
    const i = py * w + px;
    if (seen[i] || !isBg(i)) return;
    seen[i] = 1;
    stack.push(i);
  };
  for (let px = 0; px < w; px++) { push(px, 0); push(px, h - 1); }
  for (let py = 0; py < h; py++) { push(0, py); push(w - 1, py); }
  while (stack.length) {
    const i = stack.pop();
    d[i * 4 + 3] = 0;
    const px = i % w;
    const py = (i / w) | 0;
    push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1);
  }
  x.putImageData(frame, 0, 0);
  return c;
}
