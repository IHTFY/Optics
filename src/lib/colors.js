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
  background: "#fbf4e8",
  red: "#f31e28",
  blue: "#0132ad",
  yellow: "#fbc002",
  cyan: "#03b7ce",
};

export const inkCss = (name) => `rgb(${INK[name].join(",")})`;

export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
