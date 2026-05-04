"use client";

interface ColorPaletteProps {
  colors: string[];
}

export function ColorPalette({ colors }: ColorPaletteProps) {
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground mb-2">Основной Цвет:</div>
      <div className="flex gap-2">
        {colors.map((color, index) => (
          <div key={index} className="flex-1">
            <div
              className="h-12 rounded border border-border"
              style={{ backgroundColor: color }}
            />
            <div className="text-[10px] text-center mt-1.5 text-muted-foreground uppercase">
              {color}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
