"use client";

import { useRef, MouseEvent, useCallback, useEffect } from "react";

// Canvas size constant
const CANVAS_SIZE = 180;

interface ContrastPickerProps {
  contrast: number;
  brightness: number;
  onContrastChange: (contrast: number, brightness: number) => void;
  title?: string;
  // Base color for WCAG calculations
  baseHue: number;
  baseSaturation: number;
  baseLightness: number;
  previewMode: "light" | "dark";
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

export function ContrastPicker({
  contrast,
  brightness,
  onContrastChange,
  title,
  baseHue,
  baseSaturation,
  baseLightness,
  previewMode,
}: ContrastPickerProps) {
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

  // Draw contrast picker canvas with WCAG zones
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Background gradient (gray to white to gray)
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    gradient.addColorStop(0, "rgb(128, 128, 128)");
    gradient.addColorStop(0.5, "rgb(255, 255, 255)");
    gradient.addColorStop(1, "rgb(128, 128, 128)");
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Overlay brightness gradient
    const brightnessGradient = ctx.createLinearGradient(0, 0, 0, height);
    brightnessGradient.addColorStop(0, "rgba(255, 255, 255, 0.5)");
    brightnessGradient.addColorStop(1, "rgba(0, 0, 0, 0.5)");
    
    ctx.fillStyle = brightnessGradient;
    ctx.fillRect(0, 0, width, height);

    // Calculate WCAG safe zones
    // For each point (contrast, brightness), calculate the resulting color and check WCAG
    const bgColor = previewMode === "dark" ? BLACK : WHITE;
    
    // Create safe zone overlay
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let x = 0; x < width; x++) {
      const contrastVal = (x / width) * 100;
      const saturationOffset = (contrastVal - 50) * 0.6;
      
      for (let y = 0; y < height; y++) {
        const brightnessVal = 100 - (y / height) * 100;
        const lightnessOffset = (brightnessVal - 50) * 0.6;
        
        // Calculate resulting color
        const adjustedSaturation = Math.max(0, Math.min(100, baseSaturation + saturationOffset));
        const adjustedLightness = Math.max(0, Math.min(100, baseLightness + lightnessOffset));
        
        const rgb = hslToRgb(baseHue, adjustedSaturation, adjustedLightness);
        const ratio = getContrastRatio(rgb, bgColor);
        
        const idx = (y * width + x) * 4;
        
        // AA = 4.5:1, AAA = 7:1
        if (ratio >= 7) {
          // AAA - best, green tint
          data[idx] = Math.min(255, data[idx] + 20);     // R
          data[idx + 1] = Math.min(255, data[idx + 1] + 40); // G
          data[idx + 2] = Math.min(255, data[idx + 2] + 20); // B
        } else if (ratio >= 4.5) {
          // AA - good, light green tint
          data[idx] = data[idx];
          data[idx + 1] = Math.min(255, data[idx + 1] + 15);
          data[idx + 2] = data[idx];
        }
        // Below AA - no tint (neutral/warning by default)
      }
    }

    ctx.putImageData(imageData, 0, 0);

    // Draw WCAG boundary lines
    // Find where contrast ratio = 4.5 (AA boundary)
    
    // AA line
    ctx.beginPath();
    ctx.strokeStyle = "rgba(34, 197, 94, 0.8)"; // Green
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    
    let started = false;
    for (let x = 0; x <= width; x += 2) {
      const contrastVal = (x / width) * 100;
      const saturationOffset = (contrastVal - 50) * 0.6;
      
      // Find y where ratio = 4.5
      for (let y = 0; y <= height; y += 2) {
        const brightnessVal = 100 - (y / height) * 100;
        const lightnessOffset = (brightnessVal - 50) * 0.6;
        
        const adjustedSaturation = Math.max(0, Math.min(100, baseSaturation + saturationOffset));
        const adjustedLightness = Math.max(0, Math.min(100, baseLightness + lightnessOffset));
        
        const rgb = hslToRgb(baseHue, adjustedSaturation, adjustedLightness);
        const ratio = getContrastRatio(rgb, bgColor);
        
        if (Math.abs(ratio - 4.5) < 0.3) {
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
          break;
        }
      }
    }
    ctx.stroke();

    // Reset line dash
    ctx.setLineDash([]);

  }, [baseHue, baseSaturation, baseLightness, previewMode]);

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

  const updateContrast = useCallback(
    (e: MouseEvent<HTMLCanvasElement> | TouchEvent<HTMLCanvasElement>) => {
      const coords = getCoordinates(e);
      if (!coords) return;

      const rect = canvasRef.current!.getBoundingClientRect();
      const newContrast = (coords.x / rect.width) * 100;
      const newBrightness = 100 - (coords.y / rect.height) * 100;

      onContrastChange(newContrast, newBrightness);
    },
    [getCoordinates, onContrastChange]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      isDragging.current = true;
      updateContrast(e);
    },
    [updateContrast]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      if (isDragging.current) {
        updateContrast(e);
      }
    },
    [updateContrast]
  );

  const handleMouseUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handleTouchStart = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      isDragging.current = true;
      updateContrast(e);
    },
    [updateContrast]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (isDragging.current) {
        updateContrast(e);
      }
    },
    [updateContrast]
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
            left: `${contrast}%`,
            top: `${100 - brightness}%`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 0 1px black",
          }}
        />
        {/* WCAG Legend */}
        <div className="absolute -bottom-8 left-0 right-0 flex justify-center gap-3 text-[9px]">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-200 border border-green-400"></div>
            <span className="text-muted-foreground">AA (4.5:1)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-400 border border-green-600"></div>
            <span className="text-muted-foreground">AAA (7:1)</span>
          </div>
        </div>
        {/* Axis labels */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground">
          Контраст
        </div>
        <div className="absolute top-1/2 -left-7 -translate-y-1/2 -rotate-90 text-[10px] text-muted-foreground origin-center whitespace-nowrap">
          Яркость
        </div>
      </div>
    </div>
  );
}
