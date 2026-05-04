"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  ColorPicker,
  ContrastPicker,
  ColorVariantsList,
  ColorSchemePreview,
} from "@/components/color-picker";
import {
  hexToHsl,
  hslToHex,
  colorPresets,
  adaptColorForTheme,
  getColorName,
  isAchromatic,
  getAchromaticColorsForTheme,
  DARK_BG,
  getContrastRatio,
  passesWCAG,
} from "@/lib/colorUtils";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ChevronDown,
  RotateCcw,
  Check,
  X,
  AlertTriangle,
  Palette,
  Accessibility,
  Eye,
  Copy,
  History,
  Download,
  Code,
  CheckCircle,
} from "lucide-react";

type PreviewMode = "light" | "dark";

// Slider presets
const sliderPresets = [
  { name: "По умолчанию", contrast: 50, brightness: 50, description: "Базовые значения" },
  { name: "Яркий", contrast: 70, brightness: 55, description: "Максимальный контраст" },
  { name: "Пастельный", contrast: 40, brightness: 60, description: "Мягкие, приглушённые цвета" },
  { name: "Монохром", contrast: 50, brightness: 50, description: "Оттенки серого" },
  { name: "Высокий контраст", contrast: 80, brightness: 50, description: "Чёткое разделение оттенков" },
  { name: "Низкий контраст", contrast: 30, brightness: 50, description: "Плавные переходы" },
];

// Mapping color presets to slider presets
const colorPresetToSliderMap: Record<string, typeof sliderPresets[0]> = {
  "Схема по умолчанию": sliderPresets[0],
  "Пастельный": sliderPresets[2],
  "Средне-темный пастельный": sliderPresets[2],
  "Темный пастельный": sliderPresets[2],
  "Очень темный пастельный": sliderPresets[1],
  "Средне-темный (насыщенный)": sliderPresets[4],
  "Темный (насыщенный)": sliderPresets[4],
  "Очень темный (насыщенный)": sliderPresets[4],
  "Низкий контраст": sliderPresets[5],
  "Минимум контраста": sliderPresets[5],
  "Меньше контраста": sliderPresets[5],
  "Высокий контраст": sliderPresets[4],
  "Максимум контраста": sliderPresets[4],
  "Больше контраста": sliderPresets[4],
};

// Toast notification component
function Toast({ message, visible }: { message: string; visible: boolean }) {
  if (!visible) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
      <div className="bg-popover border border-border shadow-lg rounded-lg px-4 py-3 flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-green-500" />
        <span className="text-sm text-popover-foreground">{message}</span>
      </div>
    </div>
  );
}

// CSS Export Panel
function CssExportPanel({ colors, secondaryColor, onClose }: { colors: string[]; secondaryColor: string; onClose: () => void }) {
  const cssVars = `:root {
  --color-50: ${colors[0]};
  --color-100: ${colors[1]};
  --color-200: ${colors[2]};
  --color-300: ${colors[3]};
  --color-400: ${colors[4]};
  --color-secondary: ${secondaryColor};
}`;

  const tailwindConfig = `colors: {
  primary: {
    50: '${colors[0]}',
    100: '${colors[1]}',
    200: '${colors[2]}',
    300: '${colors[3]}',
    400: '${colors[4]}',
  },
  secondary: '${secondaryColor}',
}`;

  const [activeTab, setActiveTab] = useState<"css" | "tailwind">("css");
  
  const handleCopy = async () => {
    const textToCopy = activeTab === "css" ? cssVars : tailwindConfig;
    
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in" onClick={onClose}>
      <div className="bg-popover text-popover-foreground border border-border rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-primary" />
            <span className="font-semibold">Экспорт палитры</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="flex gap-1 mb-3">
            <button
              onClick={() => setActiveTab("css")}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeTab === "css" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              CSS Variables
            </button>
            <button
              onClick={() => setActiveTab("tailwind")}
              className={`px-3 py-1.5 text-xs rounded-lg transition-colors ${
                activeTab === "tailwind" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
              }`}
            >
              Tailwind Config
            </button>
          </div>
          
          <pre className="bg-muted/50 text-foreground rounded-lg p-3 text-xs overflow-auto max-h-64 font-mono">
            {activeTab === "css" ? cssVars : tailwindConfig}
          </pre>
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-border">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Закрыть
          </Button>
          <Button size="sm" onClick={handleCopy}>
            <Copy className="w-3 h-3 mr-1" />
            Копировать
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  // Color state
  const [hue, setHue] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [lightness, setLightness] = useState(100);

  // Secondary color state
  const [secondaryHue, setSecondaryHue] = useState(180);
  const [useAutoSecondary, setUseAutoSecondary] = useState(true);

  // Contrast/brightness controls
  const [contrast, setContrast] = useState(50);
  const [brightness, setBrightness] = useState(50);

  // UI state
  const [previewMode, setPreviewMode] = useState<PreviewMode>("light");
  const [selectedPreset, setSelectedPreset] = useState<string>("Схема по умолчанию");
  const [selectedSliderPreset, setSelectedSliderPreset] = useState<string>("По умолчанию");
  const [isPresetOpen, setIsPresetOpen] = useState(false);
  const [isSliderPresetOpen, setIsSliderPresetOpen] = useState(false);
  
  // New features state
  const [colorHistory, setColorHistory] = useState<string[]>([]);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [showExportPanel, setShowExportPanel] = useState(false);
  
  // Refs for cleanup
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate base color
  const baseColor = useMemo(() => hslToHex(hue, saturation, lightness), [hue, saturation, lightness]);

  // Calculate adapted colors for current preview mode
  const adaptedPrimaryHSL = useMemo(() => {
    if (isAchromatic(saturation, lightness)) {
      return getAchromaticColorsForTheme(previewMode === "dark").primary;
    }
    return adaptColorForTheme(hue, saturation, lightness, previewMode === "dark");
  }, [hue, saturation, lightness, previewMode]);

  const adaptedPrimaryColor = useMemo(() => {
    return hslToHex(adaptedPrimaryHSL.h, adaptedPrimaryHSL.s, adaptedPrimaryHSL.l);
  }, [adaptedPrimaryHSL]);

  // Calculate secondary color HSL first (single source of truth)
  const secondaryColorHSL = useMemo(() => {
    // Auto mode + achromatic primary: use predefined gray
    if (useAutoSecondary && isAchromatic(saturation, lightness)) {
      return getAchromaticColorsForTheme(previewMode === "dark").secondary;
    }
    
    // Manual mode: use secondaryHue with visible saturation and reasonable lightness
    if (!useAutoSecondary) {
      const manualSaturation = saturation < 10 ? 70 : saturation;
      const manualLightness = lightness > 85 ? 50 : lightness;
      return adaptColorForTheme(secondaryHue, manualSaturation, manualLightness, previewMode === "dark");
    }
    
    // Auto mode: complementary
    const actualHue = (hue + 180) % 360;
    return adaptColorForTheme(actualHue, saturation, lightness, previewMode === "dark");
  }, [hue, saturation, lightness, secondaryHue, useAutoSecondary, previewMode]);

  // Derive secondary color hex from HSL (avoids duplication)
  const secondaryColor = useMemo(() => {
    return hslToHex(secondaryColorHSL.h, secondaryColorHSL.s, secondaryColorHSL.l);
  }, [secondaryColorHSL]);

  // Generate color variants
  const colorVariants = useMemo(() => {
    const saturationOffset = (contrast - 50) * 0.6;
    const adjustedSaturation = Math.max(0, Math.min(100, adaptedPrimaryHSL.s + saturationOffset));
    const lightnessOffset = (brightness - 50) * 0.6;
    const adjustedLightness = Math.max(0, Math.min(100, adaptedPrimaryHSL.l + lightnessOffset));

    const variants: string[] = [];
    const lightnessOffsets = [30, 15, 0, -15, -30];

    for (const offset of lightnessOffsets) {
      const variantLightness = Math.max(0, Math.min(100, adjustedLightness + offset));
      variants.push(hslToHex(adaptedPrimaryHSL.h, adjustedSaturation, variantLightness));
    }

    return variants;
  }, [adaptedPrimaryHSL, contrast, brightness]);

  // Show toast notification with proper cleanup
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    
    // Clear previous timeout if exists
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    
    // Set new timeout and store ref
    toastTimeoutRef.current = setTimeout(() => {
      setToastVisible(false);
      toastTimeoutRef.current = null;
    }, 2000);
  }, []);
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) {
        clearTimeout(toastTimeoutRef.current);
      }
    };
  }, []);

  // Copy color to clipboard with fallback
  const copyToClipboard = useCallback(async (color: string) => {
    const textToCopy = color.toUpperCase();
    
    try {
      // Try modern Clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        // Fallback for older browsers or non-HTTPS contexts
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error('execCommand copy failed');
        }
      }
      showToast(`Скопировано: ${textToCopy}`);
    } catch (err) {
      console.error('Failed to copy:', err);
      showToast('Не удалось скопировать');
    }
  }, [showToast]);

  // Add color to history
  const addToHistory = useCallback((color: string) => {
    setColorHistory(prev => {
      const newHistory = [color, ...prev.filter(c => c !== color)].slice(0, 8);
      return newHistory;
    });
  }, []);

  // Apply slider preset
  const applySliderPreset = useCallback((preset: typeof sliderPresets[0]) => {
    setContrast(preset.contrast);
    setBrightness(preset.brightness);
    setSelectedSliderPreset(preset.name);
    setIsSliderPresetOpen(false);
  }, []);

  // Reset to defaults
  const handleReset = useCallback(() => {
    setHue(0);
    setSaturation(0);
    setLightness(100);
    setContrast(50);
    setBrightness(50);
    setSelectedPreset("Схема по умолчанию");
    setSelectedSliderPreset("По умолчанию");
  }, []);

  // Handle preset selection
  const handlePresetSelect = useCallback((presetName: string) => {
    setSelectedPreset(presetName);
    const preset = colorPresets.find((p) => p.name === presetName);
    if (preset && preset.colors.length > 0) {
      const hsl = hexToHsl(preset.colors[0]);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      addToHistory(preset.colors[0]);
    }
    
    const matchingSliderPreset = colorPresetToSliderMap[presetName];
    if (matchingSliderPreset) {
      setContrast(matchingSliderPreset.contrast);
      setBrightness(matchingSliderPreset.brightness);
      setSelectedSliderPreset(matchingSliderPreset.name);
    }
    
    setIsPresetOpen(false);
  }, [addToHistory]);

  // Handle color change from picker
  const handleColorChange = useCallback((s: number, l: number) => {
    setSaturation(s);
    setLightness(l);
    setSelectedSliderPreset("По умолчанию");
  }, []);

  // Handle contrast change
  const handleContrastChange = useCallback((c: number, b: number) => {
    setContrast(c);
    setBrightness(b);
    setSelectedSliderPreset("По умолчанию");
  }, []);

  // Handle base color input
  const handleBaseColorInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const hex = e.target.value;
    if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
      const hsl = hexToHsl(hex);
      setHue(hsl.h);
      setSaturation(hsl.s);
      setLightness(hsl.l);
      setSelectedSliderPreset("По умолчанию");
      addToHistory(hex);
    }
  }, [addToHistory]);

  // Handle color select from variants
  const handleColorSelect = useCallback((color: string) => {
    const hsl = hexToHsl(color);
    setHue(hsl.h);
    setSaturation(hsl.s);
    setLightness(hsl.l);
    addToHistory(color);
  }, [addToHistory]);

  // Contrast validation data
  const contrastWhite = getContrastRatio(adaptedPrimaryColor, "#ffffff");
  const contrastDark = getContrastRatio(adaptedPrimaryColor, DARK_BG);
  
  const whiteAA = passesWCAG(adaptedPrimaryColor, "#ffffff", "AA", false);
  const whiteAALarge = passesWCAG(adaptedPrimaryColor, "#ffffff", "AA", true);
  const whiteAAA = passesWCAG(adaptedPrimaryColor, "#ffffff", "AAA", false);
  const whiteAAALarge = passesWCAG(adaptedPrimaryColor, "#ffffff", "AAA", true);
  
  const darkAA = passesWCAG(adaptedPrimaryColor, DARK_BG, "AA", false);
  const darkAALarge = passesWCAG(adaptedPrimaryColor, DARK_BG, "AA", true);
  const darkAAA = passesWCAG(adaptedPrimaryColor, DARK_BG, "AAA", false);
  const darkAAALarge = passesWCAG(adaptedPrimaryColor, DARK_BG, "AAA", true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a1a2e] via-[#16213e] to-[#0f3460] text-white p-4 transition-all duration-500">
      {/* Background texture overlay */}
      <div className="fixed inset-0 opacity-5 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
      
      <div className="w-full relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold">Color Picker Panel</h1>
              <p className="text-xs text-muted-foreground">Дизайн-система для цветовых схем</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* History dropdown */}
            {colorHistory.length > 0 && (
              <div className="relative group">
                <Button variant="secondary" size="sm" className="h-8 gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span className="text-xs">История</span>
                </Button>
                <div className="absolute right-0 top-full mt-1 bg-popover text-popover-foreground border border-border rounded-lg shadow-xl p-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[160px]">
                  <div className="text-[10px] text-muted-foreground mb-1.5 px-1">Последние цвета</div>
                  <div className="space-y-1">
                    {colorHistory.map((color, i) => (
                      <button
                        key={i}
                        onClick={() => handleColorSelect(color)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted transition-colors"
                      >
                        <div className="w-5 h-5 rounded border border-white/20" style={{ backgroundColor: color }} />
                        <span className="text-xs font-mono">{color.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Main content - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Left panel - Controls & Validation in ONE card */}
          <Card className="bg-slate-300 text-slate-900 shadow-xl border border-slate-400">
            <CardContent className="p-4 space-y-4">
              {/* ЦВЕТОВОЙ ПРЕСЕТ */}
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Palette className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold">ЦВЕТОВОЙ ПРЕСЕТ</h3>
                </div>
                
                {/* Presets row */}
                <div className="mb-3">
                  <div className="flex justify-end mb-2">
                    <Button variant="outline" size="sm" onClick={handleReset} className="h-7 w-7 p-0 rounded-lg hover:rotate-[-180deg] transition-transform duration-500">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <label className="text-xs text-slate-600 mb-1">Схема:</label>
                      <div className="relative">
                        <Button
                          variant="secondary"
                          className="w-full justify-between text-xs h-8 rounded-lg"
                          onClick={() => setIsPresetOpen(!isPresetOpen)}
                        >
                          <span className="truncate">{selectedPreset}</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${isPresetOpen ? "rotate-180" : ""}`} />
                        </Button>
                        {isPresetOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-lg border shadow-xl max-h-32 overflow-y-auto animate-fade-in">
                            {colorPresets.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => handlePresetSelect(preset.name)}
                                className={`w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors ${
                                  selectedPreset === preset.name ? "bg-primary text-primary-foreground" : "text-foreground"
                                }`}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-xs text-slate-600 mb-1">Пресет:</label>
                      <div className="relative">
                        <Button
                          variant="secondary"
                          className="w-full justify-between text-xs h-8 rounded-lg"
                          onClick={() => setIsSliderPresetOpen(!isSliderPresetOpen)}
                        >
                          <span className="truncate">{selectedSliderPreset}</span>
                          <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform duration-200 ${isSliderPresetOpen ? "rotate-180" : ""}`} />
                        </Button>
                        {isSliderPresetOpen && (
                          <div className="absolute z-10 w-full mt-1 bg-popover text-popover-foreground rounded-lg border shadow-xl max-h-32 overflow-y-auto animate-fade-in">
                            {sliderPresets.map((preset) => (
                              <button
                                key={preset.name}
                                onClick={() => applySliderPreset(preset)}
                                className={`w-full text-left text-xs px-3 py-2 hover:bg-accent transition-colors ${
                                  selectedSliderPreset === preset.name ? "bg-primary text-primary-foreground" : "text-foreground"
                                }`}
                              >
                                {preset.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Primary & Secondary colors in one row */}
                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Primary */}
                  <div>
                    <div className="flex items-center justify-between mb-1 h-5">
                      <label className="text-xs text-slate-600">
                        Primary: {getColorName(hue, saturation, lightness)}
                      </label>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <input
                          type="color"
                          value={baseColor}
                          onChange={(e) => {
                            const hsl = hexToHsl(e.target.value);
                            setHue(hsl.h);
                            setSaturation(hsl.s);
                            setLightness(hsl.l);
                            setSelectedSliderPreset("По умолчанию");
                            addToHistory(e.target.value);
                          }}
                          className="absolute inset-0 w-7 h-7 opacity-0 cursor-pointer"
                        />
                        <div
                          className="w-7 h-7 rounded-lg border border-border cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: baseColor }}
                        />
                      </div>
                      <div 
                        className="flex-1 h-8 bg-muted rounded-lg flex items-center px-2 cursor-pointer hover:bg-muted/80 transition-colors group"
                        onClick={() => copyToClipboard(baseColor)}
                      >
                        <span className="text-xs font-mono flex-1">{baseColor.toUpperCase()}</span>
                        <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>

                  {/* Secondary */}
                  <div>
                    <div className="flex items-center justify-between mb-1 h-5">
                      <label className="text-xs text-slate-600">
                        Secondary: {getColorName(secondaryColorHSL.h, secondaryColorHSL.s, secondaryColorHSL.l)}
                      </label>
                      <Button
                        variant={useAutoSecondary ? "default" : "outline"}
                        size="sm"
                        className="text-[10px] h-4 px-1.5 rounded"
                        onClick={() => setUseAutoSecondary(!useAutoSecondary)}
                      >
                        {useAutoSecondary ? "Авто" : "Ручн."}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-lg border border-border cursor-pointer hover:scale-110 transition-transform"
                        style={{ backgroundColor: secondaryColor }}
                        onClick={() => copyToClipboard(secondaryColor)}
                      />
                      <div 
                        className="flex-1 h-8 bg-muted rounded-lg flex items-center px-2 cursor-pointer hover:bg-muted/80 transition-colors group"
                        onClick={() => copyToClipboard(secondaryColor)}
                      >
                        <span className="text-xs font-mono flex-1">{secondaryColor.toUpperCase()}</span>
                        <Copy className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Manual hue slider */}
                {!useAutoSecondary && (
                  <div className="mb-2">
                    <input
                      type="range"
                      min="0"
                      max="360"
                      value={secondaryHue}
                      onChange={(e) => setSecondaryHue(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                      style={{
                        background: `linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))`,
                      }}
                    />
                  </div>
                )}

                {/* Color Variants List - Базовый цвет */}
                <div className="mb-2">
                  <ColorVariantsList
                    colors={colorVariants}
                    onColorSelect={handleColorSelect}
                    onCopy={copyToClipboard}
                  />
                </div>

                {/* Sliders + Pickers */}
                <div className="flex flex-col lg:flex-row gap-4 lg:gap-10">
                  {/* Sliders column */}
                  <div className="flex-1 space-y-2">
                    <div>
                      <label className="block text-xs text-slate-600">
                        Оттенок: {Math.round(hue)}°
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="360"
                        value={hue}
                        onChange={(e) => setHue(Number(e.target.value))}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))`,
                        }}
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600">
                        Насыщ.: {Math.round(saturation)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={saturation}
                        onChange={(e) => { setSaturation(Number(e.target.value)); setSelectedSliderPreset("По умолчанию"); }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-muted"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600">
                        Контраст: {Math.round(contrast)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={contrast}
                        onChange={(e) => { setContrast(Number(e.target.value)); setSelectedSliderPreset("По умолчанию"); }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-muted"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-600">
                        Яркость: {Math.round(brightness)}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={brightness}
                        onChange={(e) => { setBrightness(Number(e.target.value)); setSelectedSliderPreset("По умолчанию"); }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-muted"
                      />
                    </div>
                  </div>

                  {/* Pickers column - responsive grid */}
                  <div className="grid grid-cols-2 gap-4 lg:gap-10 justify-items-center">
                    <div className="flex flex-col items-center">
                      <ColorPicker
                        hue={hue}
                        saturation={saturation}
                        lightness={lightness}
                        onColorChange={handleColorChange}
                        title="Насыщенность/Яркость"
                      />
                    </div>
                    <div className="flex flex-col items-center">
                      <ContrastPicker
                        contrast={contrast}
                        brightness={brightness}
                        onContrastChange={handleContrastChange}
                        baseHue={hue}
                        baseSaturation={saturation}
                        baseLightness={lightness}
                        previewMode={previewMode}
                        title="Контраст"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Export button at bottom */}
              <div className="pt-2 border-t border-border">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  onClick={() => setShowExportPanel(true)} 
                  className="w-full h-9 gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span className="text-xs">Экспорт палитры</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Right panel - Preview */}
          <Card className="bg-slate-300 text-slate-900 shadow-xl border border-slate-400">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-blue-500/20 flex items-center justify-center">
                    <Eye className="w-3.5 h-3.5 text-blue-500" />
                  </div>
                  <h3 className="text-sm font-semibold">ПРЕВЬЮ ТЕМЫ (60-30-10)</h3>
                </div>
                <div className="flex gap-1 bg-muted rounded-lg p-0.5">
                  <button
                    className={`text-xs h-7 px-3 rounded-md transition-colors ${
                      previewMode === "light" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPreviewMode("light")}
                  >
                    Светлая
                  </button>
                  <button
                    className={`text-xs h-7 px-3 rounded-md transition-colors ${
                      previewMode === "dark" ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setPreviewMode("dark")}
                  >
                    Темная
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-2 space-y-4">
              {/* ДОСТУПНОСТЬ (WCAG) */}
              <div className="border-b border-border pb-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <Accessibility className="w-3 h-3 text-green-500" />
                  </div>
                  <h4 className="text-xs font-semibold">ДОСТУПНОСТЬ (WCAG)</h4>
                </div>

                {/* Compact table for active theme only */}
                <div className="grid grid-cols-2 gap-1 text-xs">
                  {/* Header row */}
                  <div className={`p-1.5 rounded-t-lg text-center font-medium transition-colors duration-300 ${previewMode === "light" ? "bg-primary/20 text-primary" : "bg-muted/50"}`}>
                    Primary на {previewMode === "light" ? "белом" : "темном"}
                  </div>
                  <div className="bg-muted/50 p-1.5 rounded-t-lg text-center font-medium">Результат</div>

                  {/* Contrast ratio */}
                  <div className={`p-1.5 text-center font-medium tabular-nums transition-colors duration-300 ${previewMode === "light" ? "bg-primary/10" : "bg-muted/30"}`}>
                    {(previewMode === "light" ? contrastWhite : contrastDark).toFixed(2)}:1
                  </div>
                  <div className={`p-1.5 text-center font-medium tabular-nums rounded-lg ${
                    (previewMode === "light" ? contrastWhite : contrastDark) >= 4.5 
                      ? "bg-emerald-500/20 text-emerald-600 font-semibold" 
                      : "bg-orange-500/20 text-orange-600"
                  }`}>
                    {(previewMode === "light" ? contrastWhite : contrastDark) >= 7 
                      ? "AAA" 
                      : (previewMode === "light" ? contrastWhite : contrastDark) >= 4.5 
                        ? "AA" 
                        : "Не проходит"}
                  </div>

                  {/* AA checks */}
                  <div className={`p-1.5 space-y-0.5 rounded-lg transition-colors duration-300 ${previewMode === "light" ? "bg-primary/5" : "bg-muted/20"}`}>
                    <div className="flex items-center gap-1">
                      {(previewMode === "light" ? whiteAA : darkAA) 
                        ? <Check className="w-3 h-3 text-green-500" /> 
                        : <X className="w-3 h-3 text-red-500" />}
                      <span>AA: Обычный</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(previewMode === "light" ? whiteAALarge : darkAALarge) 
                        ? <Check className="w-3 h-3 text-green-500" /> 
                        : <X className="w-3 h-3 text-red-500" />}
                      <span>AA: Крупный</span>
                    </div>
                  </div>
                  <div className={`p-1.5 space-y-0.5 rounded-lg ${
                    (previewMode === "light" ? whiteAA : darkAA) 
                      ? "bg-emerald-500/15 text-emerald-600" 
                      : "bg-muted/20"
                  }`}>
                    <div className="font-medium">AA Требования</div>
                    <div className="text-[9px] text-slate-600">Мин. 4.5:1 (обычный), 3:1 (крупный)</div>
                  </div>

                  {/* AAA checks */}
                  <div className={`p-1.5 space-y-0.5 rounded-lg transition-colors duration-300 ${previewMode === "light" ? "bg-primary/5" : "bg-muted/20"}`}>
                    <div className="flex items-center gap-1">
                      {(previewMode === "light" ? whiteAAA : darkAAA) 
                        ? <Check className="w-3 h-3 text-emerald-600" /> 
                        : <X className="w-3 h-3 text-red-400" />}
                      <span>AAA: Обычный</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {(previewMode === "light" ? whiteAAALarge : darkAAALarge) 
                        ? <Check className="w-3 h-3 text-emerald-600" /> 
                        : <X className="w-3 h-3 text-red-400" />}
                      <span>AAA: Крупный</span>
                    </div>
                  </div>
                  <div className={`p-1.5 rounded-b-lg ${
                    (previewMode === "light" ? whiteAAA : darkAAA) 
                      ? "bg-emerald-500/15 text-emerald-600" 
                      : "bg-amber-500/15 text-amber-600"
                  }`}>
                    <div className="flex items-center gap-1">
                      {(previewMode === "light" ? whiteAAA : darkAAA) 
                        ? <Check className="w-3 h-3" /> 
                        : <AlertTriangle className="w-3 h-3" />}
                      <span>{(previewMode === "light" ? whiteAAA : darkAAA) ? "AAA пройден" : "Мин 7:1 для AAA"}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Color Scheme Preview */}
              <ColorSchemePreview
                colors={colorVariants}
                secondaryColor={secondaryColor}
                mode={previewMode}
              />
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Toast notification */}
      <Toast message={toastMessage} visible={toastVisible} />
      
      {/* CSS Export Panel */}
      {showExportPanel && (
        <CssExportPanel 
          colors={colorVariants} 
          secondaryColor={secondaryColor} 
          onClose={() => setShowExportPanel(false)} 
        />
      )}
      
      {/* Add fade-in animation */}
      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}
