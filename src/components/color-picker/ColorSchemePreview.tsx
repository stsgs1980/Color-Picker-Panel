"use client";

import {
  getContrastColor,
  DARK_BG,
} from "@/lib/colorUtils";

interface ColorSchemePreviewProps {
  colors: string[];
  secondaryColor: string;
  mode: "light" | "dark";
}

export function ColorSchemePreview({
  colors,
  secondaryColor,
  mode,
}: ColorSchemePreviewProps) {
  const [baseColor, variant1, variant2, variant3, variant4] = colors;

  // 60-30-10 Rule Implementation
  const neutralBg = mode === "light" ? "#f5f5f5" : DARK_BG;
  const neutralSurface = mode === "light" ? "#ffffff" : "#242424";
  const neutralText = mode === "light" ? "#1a1a1a" : "#e0e0e0";
  const neutralMuted = mode === "light" ? "#6b7280" : "#9ca3af";

  const primaryColor = baseColor;
  const accentColor = secondaryColor;

  return (
    <div
      className="w-full border rounded-xl overflow-hidden shadow-lg transition-all duration-300"
      style={{
        backgroundColor: neutralBg,
        color: neutralText,
        borderColor: mode === "light" ? "#e0e0e0" : "#404040",
      }}
    >
      {/* Header - 30% Primary */}
      <div
        className="p-4 flex items-center justify-between"
        style={{ backgroundColor: primaryColor }}
      >
        <div
          className="text-2xl font-serif italic"
          style={{ color: getContrastColor(primaryColor) }}
        >
          lorem ipsum
        </div>
        <div style={{ color: getContrastColor(primaryColor) }}>
          <div className="text-xs font-medium">DUIS AUTE</div>
          <div className="text-xs opacity-80">IRURE DOLOR</div>
        </div>
      </div>

      {/* Color bar - showing palette */}
      <div className="flex h-2">
        {colors.map((color, index) => (
          <div
            key={index}
            className="flex-1 transition-all duration-300"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      {/* Content area - 60% Neutral background */}
      <div className="p-5" style={{ backgroundColor: neutralBg }}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left column */}
          <div>
            <div
              className="mb-3 text-sm font-semibold"
              style={{ color: primaryColor }}
            >
              Mollit Anim
            </div>
            <div className="text-sm mb-4 leading-relaxed text-muted-foreground">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
              eiusmod tempor incididunt ut labore et dolore magna aliqua.
            </div>

            {/* Form elements preview */}
            <div className="space-y-3 mb-4">
              {/* Input field */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: neutralText }}>
                  Email адрес
                </label>
                <input
                  type="email"
                  placeholder="example@mail.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border transition-all focus:outline-none focus:ring-2"
                  style={{
                    backgroundColor: neutralSurface,
                    borderColor: mode === "light" ? "#d1d5db" : "#404040",
                    color: neutralText,
                  }}
                />
              </div>
              
              {/* Select field */}
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: neutralText }}>
                  Выберите опцию
                </label>
                <select
                  className="w-full px-3 py-2 text-sm rounded-lg border transition-all"
                  style={{
                    backgroundColor: neutralSurface,
                    borderColor: mode === "light" ? "#d1d5db" : "#404040",
                    color: neutralText,
                  }}
                >
                  <option>Опция 1</option>
                  <option>Опция 2</option>
                </select>
              </div>
              
              {/* Checkbox */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded"
                  style={{ accentColor: primaryColor }}
                />
                <span className="text-sm">Согласен с условиями</span>
              </label>
            </div>

            {/* CTA Button - 10% Secondary */}
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium mb-4 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md"
              style={{
                backgroundColor: accentColor,
                color: getContrastColor(accentColor),
              }}
            >
              Узнать больше
            </button>

            {/* Secondary button */}
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium ml-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                backgroundColor: "transparent",
                color: primaryColor,
                border: `1.5px solid ${primaryColor}`,
              }}
            >
              Отмена
            </button>

            {/* Card with elevation */}
            <div
              className="mt-5 p-4 rounded-xl shadow-md transition-all hover:shadow-lg"
              style={{
                backgroundColor: neutralSurface,
                borderLeft: `4px solid ${primaryColor}`,
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: primaryColor }}
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke={getContrastColor(primaryColor)}
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="10" strokeWidth="2" />
                    <path strokeWidth="2" d="M12 6v6l4 2" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: primaryColor }}
                  >
                    Duis aute irure dolor
                  </div>
                  <div className="text-xs space-y-0.5" style={{ color: neutralMuted }}>
                    <div>• Lorem ipsum</div>
                    <div>• Dolor sit amet</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right column - Cards */}
          <div className="space-y-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="p-3 rounded-xl shadow-sm transition-all hover:shadow-md hover:scale-[1.01]"
                style={{ backgroundColor: neutralSurface }}
              >
                <div className="flex gap-3">
                  <div className="text-xl" style={{ color: primaryColor }}>
                    ■
                  </div>
                  <div className="flex-1">
                    <div
                      className="mb-1 text-sm font-medium"
                      style={{ color: primaryColor }}
                    >
                      Lorem ipsum dolor
                    </div>
                    <div className="text-xs mb-1.5" style={{ color: accentColor }}>
                      Duis aute • Категория
                    </div>
                    <div className="text-xs leading-relaxed" style={{ color: neutralMuted }}>
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                    </div>
                    <button
                      className="text-xs mt-2 hover:underline font-medium transition-all"
                      style={{ color: accentColor }}
                    >
                      Подробнее →
                    </button>
                    {item === 2 && (
                      <div
                        className="text-xs p-2 rounded-lg mt-2"
                        style={{
                          backgroundColor: accentColor + "15",
                          borderLeft: `3px solid ${accentColor}`,
                          color: accentColor,
                        }}
                      >
                        ⚡ Adipiscing elit sed do eiusmod tempor.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="h-1.5" style={{ backgroundColor: primaryColor }} />
    </div>
  );
}
