import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hexToRgb } from "./lib/colors.js";

const css = readFileSync(new URL("./app.css", import.meta.url), "utf8");
const token = (name) => css.match(new RegExp(`--${name}: (#[0-9a-f]{6});`))[1];

// WCAG 2 relative luminance and contrast ratio.
const luminance = (hex) => {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [dark, light] = [luminance(a), luminance(b)].sort((x, y) => x - y);
  return (light + 0.05) / (dark + 0.05);
};

describe("text colors", () => {
  it("measures contrast as WCAG does", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21);
    expect(contrast("#777777", "#ffffff")).toBeCloseTo(4.48, 2);
  });

  // Each text color against every background it is printed on.
  it.each([
    ["brand", "masthead"],
    ["ink", "masthead"],
    ["text", "bg"],
    ["text", "panel"],
    ["muted", "bg"],
    ["muted", "panel"],
    ["on-accent", "accent"],
    ["ink", "card-paper"],
    ["accent", "panel"],
  ])("--%s reaches 4.5:1 on --%s", (text, background) => {
    expect(contrast(token(text), token(background))).toBeGreaterThanOrEqual(4.5);
  });
});
