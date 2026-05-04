// Color manipulation utilities

export interface HSL {
  h: number;
  s: number;
  l: number;
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

// Convert hex to RGB
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

// Convert RGB to hex
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    "#" +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(x).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
      })
      .join("")
  );
}

// Convert RGB to HSL
export function rgbToHsl(r: number, g: number, b: number): HSL {
  r /= 255;
  g /= 255;
  b /= 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Convert HSL to RGB
export function hslToRgb(h: number, s: number, l: number): RGB {
  h = h / 360;
  s = s / 100;
  l = l / 100;

  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

// Convert hex to HSL
export function hexToHsl(hex: string): HSL {
  const rgb = hexToRgb(hex);
  return rgbToHsl(rgb.r, rgb.g, rgb.b);
}

// Convert HSL to hex
export function hslToHex(h: number, s: number, l: number): string {
  const rgb = hslToRgb(h, s, l);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

// Generate color variants based on lightness adjustments
export function generateColorVariants(
  baseHex: string,
  saturation: number = 100,
  lightness: number = 50
): string[] {
  const hsl = hexToHsl(baseHex);
  const adjustedHue = hsl.h;

  // Generate 5 variants with different lightness values
  const variants: string[] = [];
  const lightnessValues = [
    Math.min(100, lightness + 30), // Variant 1 - lighter
    Math.min(100, lightness + 15), // Variant 2 - light
    lightness, // Base color (Variant 3)
    Math.max(0, lightness - 15), // Variant 4 - dark
    Math.max(0, lightness - 30), // Variant 5 - darker
  ];

  for (const l of lightnessValues) {
    variants.push(hslToHex(adjustedHue, saturation, l));
  }

  return variants;
}

// Get contrasting text color (black or white) based on background
// Uses WCAG-compliant relative luminance calculation
export function getContrastColor(hexColor: string): string {
  const rgb = hexToRgb(hexColor);
  const luminance = getRelativeLuminance(rgb);
  // Use WCAG threshold: luminance > 0.179 (approximately 0.5 in gamma-corrected space)
  // But for practical UI purposes, we use 0.5 as threshold
  // Contrast ratio with white = (1 + 0.05) / (L + 0.05)
  // Contrast ratio with black = (L + 0.05) / (0 + 0.05)
  // We choose white if contrast with white > contrast with black
  const contrastWithWhite = (1.0 + 0.05) / (luminance + 0.05);
  const contrastWithBlack = (luminance + 0.05) / (0.0 + 0.05);
  return contrastWithWhite > contrastWithBlack ? "#ffffff" : "#000000";
}

// Calculate relative luminance for WCAG contrast
export function getRelativeLuminance(rgb: RGB): number {
  const rsRGB = rgb.r / 255;
  const gsRGB = rgb.g / 255;
  const bsRGB = rgb.b / 255;

  const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// Calculate contrast ratio between two colors
export function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const l1 = getRelativeLuminance(rgb1);
  const l2 = getRelativeLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// Check if color passes WCAG AA contrast requirements
export function passesWCAG(
  foreground: string,
  background: string,
  level: "AA" | "AAA" = "AA",
  isLargeText: boolean = false
): boolean {
  const ratio = getContrastRatio(foreground, background);

  if (level === "AAA") {
    return isLargeText ? ratio >= 4.5 : ratio >= 7;
  }

  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

// Get complementary color (opposite on color wheel)
export function getComplementaryColor(h: number, s: number, l: number): string {
  const complementaryHue = (h + 180) % 360;
  return hslToHex(complementaryHue, s, l);
}

// Adapt color saturation for dark theme
export function adaptColorForTheme(
  h: number,
  s: number,
  l: number,
  isDark: boolean
): HSL {
  // Don't adapt achromatic colors (white/gray/black)
  if (s < 10) {
    return { h, s, l };
  }

  if (isDark) {
    // For dark theme: reduce saturation, adjust lightness
    return {
      h,
      s: Math.max(40, s * 0.7), // Reduce saturation by 30%, min 40%
      l: Math.min(70, Math.max(50, l + 10)), // Lighten to 50-70% range
    };
  }

  // For light theme: keep vibrant
  return { h, s, l };
}

// Deep dark gray for dark theme backgrounds (not pure black)
export const DARK_BG = "#1a1a1a";
export const DARK_SURFACE_1 = "#242424"; // Elevated surface level 1
export const DARK_SURFACE_2 = "#2e2e2e"; // Elevated surface level 2
export const DARK_SURFACE_3 = "#383838"; // Elevated surface level 3

// Achromatic color values for light/dark themes
// Standard: both primary and secondary must be visible on background
// Light theme: both colors visible on white/light background
// Dark theme: both colors visible on dark background
export const ACHROMATIC_LIGHT = {
  primary: { h: 0, s: 0, l: 25 },    // Dark gray #404040 (visible on light background)
  secondary: { h: 0, s: 0, l: 50 },  // Medium gray #808080 (visible on light background)
};

export const ACHROMATIC_DARK = {
  primary: { h: 0, s: 0, l: 100 },   // White #FFFFFF (visible on dark background)
  secondary: { h: 0, s: 0, l: 75 },  // Light gray #BFBFBF (visible on dark background)
};

// Achromatic secondary color for grayscale primary
export const ACHROMATIC_SECONDARY = { h: 0, s: 0, l: 50 };  // Medium gray #808080

// Check if color is achromatic (grayscale)
export function isAchromatic(s: number, l: number): boolean {
  // Saturation < 10% means grayscale
  return s < 10;
}

// Get achromatic colors for theme (inverted for dark mode)
export function getAchromaticColorsForTheme(isDark: boolean): {
  primary: { h: number; s: number; l: number };
  secondary: { h: number; s: number; l: number };
} {
  return isDark ? ACHROMATIC_DARK : ACHROMATIC_LIGHT;
}

// Get secondary color based on primary
// Special handling for achromatic (grayscale) primary colors
export function getSecondaryHSL(primaryH: number, primaryS: number, primaryL: number, scheme: string): HSL {
  // If primary is achromatic (white/gray/black), return dark gray as secondary
  if (isAchromatic(primaryS, primaryL)) {
    return { ...ACHROMATIC_SECONDARY };
  }
  
  // Standard color scheme calculations
  switch (scheme) {
    case "complementary":
      return { h: (primaryH + 180) % 360, s: primaryS, l: primaryL };
    case "analogous":
      return { h: (primaryH + 30) % 360, s: primaryS, l: primaryL };
    case "triadic":
      return { h: (primaryH + 120) % 360, s: primaryS, l: primaryL };
    case "split-complementary":
      return { h: (primaryH + 150) % 360, s: primaryS, l: primaryL };
    default:
      return { h: (primaryH + 180) % 360, s: primaryS, l: primaryL };
  }
}

// Get color name based on hue value
export function getColorName(h: number, s: number, l: number): string {
  // Check for grayscale first
  if (s < 10) {
    if (l > 90) return "Белый";
    if (l > 70) return "Светло-серый";
    if (l > 40) return "Серый";
    if (l > 20) return "Темно-серый";
    return "Черный";
  }

  // Color names based on hue
  if (h < 15 || h >= 345) return "Красный";
  if (h < 45) return "Оранжевый";
  if (h < 75) return "Желтый";
  if (h < 150) return "Зеленый";
  if (h < 200) return "Голубой";
  if (h < 260) return "Синий";
  if (h < 300) return "Фиолетовый";
  if (h < 345) return "Пурпурный";

  return "Цвет";
}

// Predefined color presets
export const colorPresets = [
  {
    name: "Схема по умолчанию",
    colors: ["#FFFFFF", "#404040", "#808080", "#C0C0C0", "#000000"], // White primary, Dark gray secondary
  },
  {
    name: "Больше контраста",
    colors: ["#000000", "#FFFFFF", "#FF0000", "#00FF00", "#0000FF"],
  },
  {
    name: "Высокий контраст",
    colors: ["#1a1a1a", "#ffffff", "#ff6b6b", "#4ecdc4", "#45b7d1"],
  },
  {
    name: "Максимум контраста",
    colors: ["#000000", "#ffffff", "#ff0000", "#00ff00", "#0000ff"],
  },
  {
    name: "Меньше контраста",
    colors: ["#e8e8e8", "#f5f5f5", "#d4d4d4", "#c9c9c9", "#b8b8b8"],
  },
  {
    name: "Минимум контраста",
    colors: ["#f0f0f0", "#f5f5f5", "#fafafa", "#e5e5e5", "#ebebeb"],
  },
  {
    name: "Низкий контраст",
    colors: ["#333333", "#444444", "#555555", "#666666", "#777777"],
  },
  {
    name: "Средне-темный (насыщенный)",
    colors: ["#2c3e50", "#34495e", "#7f8c8d", "#95a5a6", "#bdc3c7"],
  },
  {
    name: "Темный (насыщенный)",
    colors: ["#1a1a2e", "#16213e", "#0f3460", "#533483", "#e94560"],
  },
  {
    name: "Очень темный (насыщенный)",
    colors: ["#0a0a0a", "#1a1a1a", "#2a2a2a", "#3a3a3a", "#4a4a4a"],
  },
  {
    name: "Пастельный",
    colors: ["#ffd6d6", "#ffe6d6", "#fff6d6", "#e6ffd6", "#d6f6ff"],
  },
  {
    name: "Средне-темный пастельный",
    colors: ["#ffb3ba", "#ffdfba", "#ffffba", "#baffc9", "#bae1ff"],
  },
  {
    name: "Темный пастельный",
    colors: ["#ff8fa3", "#ffbe9d", "#fff599", "#9ff5b0", "#9fd9ff"],
  },
  {
    name: "Очень темный пастельный",
    colors: ["#e57373", "#ffb74d", "#fff176", "#81c784", "#64b5f6"],
  },
];
