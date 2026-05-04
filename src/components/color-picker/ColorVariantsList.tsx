"use client";

import { useState, useEffect, useRef } from "react";
import { Copy, Check } from "lucide-react";
import { getContrastColor } from "@/lib/colorUtils";

interface ColorVariantsListProps {
  colors: string[];
  onColorSelect?: (color: string) => void;
  onCopy?: (color: string) => void;
}

export function ColorVariantsList({
  colors,
  onColorSelect,
  onCopy,
}: ColorVariantsListProps) {
  // Номера цветов по шкале дизайн-системы
  const labels = ["50", "100", "200", "300", "400"];
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const copyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCopy = (e: React.MouseEvent<HTMLDivElement>, color: string, index: number) => {
    e.stopPropagation();
    onCopy?.(color);
    setCopiedIndex(index);
    
    // Clear previous timeout if exists
    if (copyTimeoutRef.current) {
      clearTimeout(copyTimeoutRef.current);
    }
    
    // Set new timeout and store ref
    copyTimeoutRef.current = setTimeout(() => {
      setCopiedIndex(null);
      copyTimeoutRef.current = null;
    }, 1500);
  };
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-1.5">
      <div className="text-xs text-muted-foreground mb-1.5">Базовый цвет</div>
      <div className="flex rounded-xl overflow-hidden border border-border shadow-sm">
        {colors.map((color, index) => (
          <button
            key={index}
            className="group relative flex flex-col items-center justify-center cursor-pointer flex-1 py-3 px-1 transition-all duration-200 hover:flex-[1.2]"
            onClick={() => onColorSelect?.(color)}
            style={{ backgroundColor: color }}
          >
            <div className="text-xs font-semibold mb-0.5" style={{ color: getContrastColor(color) }}>
              {labels[index]}
            </div>
            <div className="text-[9px] tabular-nums opacity-80" style={{ color: getContrastColor(color) }}>
              {color.toUpperCase()}
            </div>
            
            {/* Copy button overlay */}
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => handleCopy(e, color, index)}
            >
              {copiedIndex === index ? (
                <Check className="w-4 h-4 text-white drop-shadow-md" />
              ) : (
                <Copy className="w-4 h-4 text-white drop-shadow-md" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
