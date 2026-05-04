"use client";

import { getContrastRatio, passesWCAG } from "@/lib/colorUtils";
import { Check, X, AlertTriangle } from "lucide-react";

interface ContrastValidatorProps {
  foreground: string;
  background: string;
  compact?: boolean;
}

export function ContrastValidator({
  foreground,
  background,
  compact = false,
}: ContrastValidatorProps) {
  const ratio = getContrastRatio(foreground, background);
  
  // WCAG requirements
  const passesAANormal = passesWCAG(foreground, background, "AA", false); // 4.5:1
  const passesAALarge = passesWCAG(foreground, background, "AA", true);   // 3:1
  const passesAAANormal = passesWCAG(foreground, background, "AAA", false); // 7:1
  const passesAAALarge = passesWCAG(foreground, background, "AAA", true);   // 4.5:1

  // Compact mode
  if (compact) {
    const getStatusIcon = (passes: boolean) => passes ? <Check className="w-3 h-3 text-green-500" /> : <X className="w-3 h-3 text-red-500" />;
    
    return (
      <div className="space-y-1">
        <div className="text-sm font-medium tabular-nums">{ratio.toFixed(2)}:1</div>
        
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            {getStatusIcon(passesAANormal)}
            <span className="text-[10px]">AA: Обычный</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(passesAALarge)}
            <span className="text-[10px]">AA: Крупный</span>
          </div>
        </div>
        
        <div className="space-y-0.5">
          <div className="flex items-center gap-1">
            {getStatusIcon(passesAAANormal)}
            <span className="text-[10px]">AAA: Обычный</span>
          </div>
          <div className="flex items-center gap-1">
            {getStatusIcon(passesAAALarge)}
            <span className="text-[10px]">AAA: Крупный</span>
          </div>
        </div>
        
        {!passesAANormal && (
          <div className="flex items-center gap-1 text-yellow-500 mt-1">
            <AlertTriangle className="w-3 h-3" />
            <span className="text-[10px]">Минимум 4.5:1</span>
          </div>
        )}
        
        {passesAAANormal && (
          <div className="flex items-center gap-1 text-green-500 mt-1">
            <Check className="w-3 h-3" />
            <span className="text-[10px]">AAA</span>
          </div>
        )}
      </div>
    );
  }

  // Full mode (default)
  const getStatusColor = (passes: boolean) => (passes ? "bg-green-500" : "bg-red-500");

  return (
    <div className="bg-muted rounded-lg p-3 space-y-3">
      {/* Contrast ratio display */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Контрастность:</span>
        <span className="text-sm font-medium tabular-nums">{ratio.toFixed(2)}:1</span>
      </div>

      {/* WCAG Level AA */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">
          WCAG Level AA:
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(passesAANormal)}`} />
          <span className="text-xs">Обычный текст (≥4.5:1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(passesAALarge)}`} />
          <span className="text-xs">Крупный текст (≥3:1)</span>
        </div>
      </div>

      {/* WCAG Level AAA */}
      <div className="space-y-1">
        <div className="text-xs font-medium text-muted-foreground mb-1.5">
          WCAG Level AAA:
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(passesAAANormal)}`} />
          <span className="text-xs">Обычный текст (≥7:1)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className={`w-3 h-3 rounded-full ${getStatusColor(passesAAALarge)}`} />
          <span className="text-xs">Крупный текст (≥4.5:1)</span>
        </div>
      </div>

      {/* Warning for failing accessibility */}
      {!passesAANormal && (
        <div className="text-xs text-yellow-500 mt-2 p-2 bg-yellow-900/20 rounded border border-yellow-700/30">
          ⚠️ Недостаточная контрастность для доступности. Минимум 4.5:1 для AA уровня.
        </div>
      )}

      {/* Success message for AAA */}
      {passesAAANormal && (
        <div className="text-xs text-green-500 mt-2 p-2 bg-green-900/20 rounded border border-green-700/30">
          ✓ Отличная контрастность! Соответствует WCAG AAA (7:1)
        </div>
      )}
    </div>
  );
}
