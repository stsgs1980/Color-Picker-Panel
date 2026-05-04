"use client";

import { useRef, useEffect, MouseEvent, TouchEvent, useCallback } from "react";

// Canvas size constant - used for color picker dimensions
const CANVAS_SIZE = 180;

interface ColorPickerProps {
  hue: number;
  saturation: number;
  lightness: number;
  onColorChange: (s: number, l: number) => void;
  title?: string;
  size?: number; // Optional size for responsive
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
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

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

// Helper function to convert HSL to RGB string for canvas
function hslToRgbString(h: number, s: number, l: number): string {
  const { r, g, b } = hslToRgb(h, s, l);
  return `rgb(${r}, ${g}, ${b})`;
}

// Calculate relative luminance for WCAG
function getRelativeLuminance(r: number, g: number, b: number): number {
  const rsRGB = r / 255;
  const gsRGB = g / 255;
  const bsRGB = b / 255;

  const rL = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
  const gL = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
  const bL = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);

  return 0.2126 * rL + 0.7152 * gL + 0.0722 * bL;
}

// Calculate contrast ratio between two colors
function getContrastRatio(rgb1: { r: number; g: number; b: number }, rgb2: { r: number; g: number; b: number }): number {
  const l1 = getRelativeLuminance(rgb1.r, rgb1.g, rgb1.b);
  const l2 = getRelativeLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

// White and black for contrast calculations
const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

// Find lightness value where contrast equals target ratio
function findLightnessForContrast(
  hue: number,
  saturation: number,
  targetRatio: number,
  backgroundColor: { r: number; g: number; b: number }
): number | null {
  // Binary search for lightness that gives target contrast
  let low = 0;
  let high = 100;
  const tolerance = 0.1;

  for (let i = 0; i < 20; i++) {
    const mid = (low + high) / 2;
    const rgb = hslToRgb(hue, saturation, mid);
    const ratio = getContrastRatio(rgb, backgroundColor);

    if (Math.abs(ratio - targetRatio) < tolerance) {
      return mid;
    }

    if (backgroundColor === WHITE) {
      // For white background: higher lightness = lower contrast
      if (ratio > targetRatio) {
        low = mid;
      } else {
        high = mid;
      }
    } else {
      // For black background: higher lightness = higher contrast
      if (ratio < targetRatio) {
        low = mid;
      } else {
        high = mid;
      }
    }
  }

  return (low + high) / 2;
}

export function ColorPicker({
  hue,
  saturation,
  lightness,
  onColorChange,
  title,
}: ColorPickerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDragging = useRef(false);

  // Cleanup isDragging on unmount
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      isDragging.current = false;
    };
    
    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('touchend', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalMouseUp);
    };
  }, []);

  // Draw color picker canvas with WCAG curves
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Create saturation/lightness gradient
    for (let x = 0; x < width; x++) {
      const s = (x / width) * 100;
      for (let y = 0; y < height; y++) {
        const l = 100 - (y / height) * 100;
        const color = hslToRgbString(hue, s, l);
        ctx.fillStyle = color;
        ctx.fillRect(x, y, 1, 1);
      }
    }

    // Draw WCAG contrast curves
    // AA = 4.5:1, AAA = 7:1
    
    // Curve for dark theme (contrast with black)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(59, 130, 246, 0.8)"; // Blue
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    
    for (let x = 0; x <= width; x += 2) {
      const s = (x / width) * 100;
      const l = findLightnessForContrast(hue, s, 4.5, BLACK);
      if (l !== null) {
        const y = height - (l / 100) * height;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Curve for light theme (contrast with white)
    ctx.beginPath();
    ctx.strokeStyle = "rgba(239, 68, 68, 0.8)"; // Red
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    
    for (let x = 0; x <= width; x += 2) {
      const s = (x / width) * 100;
      const l = findLightnessForContrast(hue, s, 4.5, WHITE);
      if (l !== null) {
        const y = height - (l / 100) * height;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }
    ctx.stroke();

    // Reset line dash
    ctx.setLineDash([]);

  }, [hue]);

  // Helper to get coordinates from event
  const getCoordinates = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      let clientX: number, clientY: number;

      if ("touches" in e) {
        if (e.touches.length === 0) return null;
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const x = Math.max(0, Math.min(clientX - rect.left, canvas.width));
      const y = Math.max(0, Math.min(clientY - rect.top, canvas.height));

      return { x, y };
    },
    []
  );

  const updateColorFromEvent = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      const coords = getCoordinates(e);
      if (!coords) return;

      const s = (coords.x / CANVAS_SIZE) * 100;
      const l = 100 - (coords.y / CANVAS_SIZE) * 100;

      onColorChange(s, l);
    },
    [getCoordinates, onColorChange]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      isDragging.current = true;
      updateColorFromEvent(e);
    },
    [updateColorFromEvent]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (isDragging.current) {
        updateColorFromEvent(e);
      }
    },
    [updateColorFromEvent]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDragging.current = true;
      updateColorFromEvent(e);
    },
    [updateColorFromEvent]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (isDragging.current) {
        updateColorFromEvent(e);
      }
    },
    [updateColorFromEvent]
  );

  const handleTouchEnd = useCallback(() => {
    isDragging.current = false;
  }, []);

  return (
    <div>
      {title && (
        <div className="text-xs text-muted-foreground mb-2">{title}</div>
      )}
      <div className="relative inline-block w-[120px] h-[120px] sm:w-[150px] sm:h-[150px] lg:w-[180px] lg:h-[180px]">
        <canvas
          ref={canvasRef}
          width={CANVAS_SIZE}
          height={CANVAS_SIZE}
          className="cursor-crosshair border border-border rounded touch-none w-full h-full"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
        {/* Cursor indicator */}
        <div
          className="absolute w-3 h-3 border-2 border-white rounded-full pointer-events-none"
          style={{
            left: `${(saturation / 100) * 100}%`,
            top: `${((100 - lightness) / 100) * 100}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 1px black",
          }}
        />
        {/* WCAG Legend */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-blue-500" style={{ borderTop: "1px dashed rgba(59, 130, 246, 0.8)" }}></div>
            <span className="text-muted-foreground">Тёмная (AA)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-red-500" style={{ borderTop: "1px dashed rgba(239, 68, 68, 0.8)" }}></div>
            <span className="text-muted-foreground">Светлая (AA)</span>
          </div>
        </div>
        {/* Axis labels */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
          Насыщенность
        </div>
        <div className="absolute top-1/2 -left-7 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground origin-center whitespace-nowrap">
          Яркость
        </div>
      </div>
    </div>
  );
}
