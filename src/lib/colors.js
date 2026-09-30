export const COLORS = ["red", "blue", "yellow", "cyan"];

// Pure "ink" colors used while drawing. Every pixel is later snapped to the
// nearest ink (or the background), so these only need to be far apart.
export const INK = {
  background: [0, 0, 0],
  red: [255, 0, 0],
  blue: [0, 0, 255],
  yellow: [255, 255, 0],
  cyan: [0, 255, 255],
};

// Display colors the snapped pixels are painted with.
export const PALETTE = {
  background: "#f3efe6",
  red: "#e5383b",
  blue: "#2851c8",
  yellow: "#f7c318",
  cyan: "#1fc6d6",
};

export const inkCss = (name) => `rgb(${INK[name].join(",")})`;

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
