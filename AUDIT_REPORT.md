# Bug Root Cause Analysis Report
## Color Picker Panel - Full Code Audit

---

## 🔴 CRITICAL BUGS

### BUG-001: Memory Leak - setTimeout без cleanup
**Файл:** `page.tsx:290-294`
**Серьёзность:** CRITICAL
**Статус:** Не исправлен

```tsx
// ПРОБЛЕМА:
const showToast = useCallback((message: string) => {
  setToastMessage(message);
  setToastVisible(true);
  setTimeout(() => setToastVisible(false), 2000);  // ❌ Нет cleanup!
}, []);
```

**Root Cause:**
- `setTimeout` создаётся при каждом вызове `showToast`
- Если компонент unmount до истечения 2000ms, React попытается установить state на unmounted компоненте
- Memory leak + potential React warning

**Execution Flow:**
```
showToast() → setTimeout(2000ms) → [user navigates away] → Component unmount
              ↓
              [2000ms later] → setToastVisible(false) → ⚠️ setState on unmounted component
```

**Fix:**
```tsx
const showToast = useCallback((message: string) => {
  setToastMessage(message);
  setToastVisible(true);
  
  const timer = setTimeout(() => setToastVisible(false), 2000);
  return () => clearTimeout(timer);  // cleanup function
}, []);
```

---

### BUG-002: Memory Leak в ColorVariantsList
**Файл:** `ColorVariantsList.tsx:30-35`
**Серьёзность:** HIGH
**Статус:** Не исправлен

```tsx
const handleCopy = (e: React.MouseEvent, color: string, index: number) => {
  e.stopPropagation();
  onCopy?.(color);
  setCopiedIndex(index);
  setTimeout(() => setCopiedIndex(null), 1500);  // ❌ Нет cleanup!
};
```

**Root Cause:** Аналогично BUG-001 - setTimeout без cleanup при быстром переключении между цветами.

---

### BUG-003: Clipboard API без fallback
**Файл:** `page.tsx:297-300`, `CssExportPanel:134-136`
**Серьёзность:** MEDIUM
**Статус:** Не исправлен

```tsx
const copyToClipboard = useCallback((color: string) => {
  navigator.clipboard.writeText(color.toUpperCase());  // ❌ Может fail!
  showToast(`Скопировано: ${color.toUpperCase()}`);
}, [showToast]);
```

**Root Cause:**
- Clipboard API требует HTTPS или localhost
- Может быть заблокировано браузером
- Нет обработки ошибок

**Fix:**
```tsx
const copyToClipboard = useCallback(async (color: string) => {
  try {
    await navigator.clipboard.writeText(color.toUpperCase());
    showToast(`Скопировано: ${color.toUpperCase()}`);
  } catch (err) {
    // Fallback для старых браузеров
    const textArea = document.createElement('textarea');
    textArea.value = color.toUpperCase();
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    showToast(`Скопировано: ${color.toUpperCase()}`);
  }
}, [showToast]);
```

---

## 🟡 PERFORMANCE ISSUES

### PERF-001: Canvas перерисовка на каждый render
**Файл:** `ColorPicker.tsx:55-75`
**Серьёзность:** HIGH
**Статус:** Не исправлен

```tsx
useEffect(() => {
  // ... canvas drawing code
}, [hue]);  // ✅ Зависит только от hue
```

**Проблема:** Canvas перерисовывается полностью при каждом изменении hue. Для 180x180 пикселей = 32,400 fillRect операций.

**Рекомендация:** Использовать offscreen canvas или кеширование.

---

### PERF-002: Дублирование вычислений secondaryColor
**Файл:** `page.tsx:234-269`
**Серьёзность:** MEDIUM
**Статус:** Не исправлен

```tsx
// secondaryColor useMemo
const secondaryColor = useMemo(() => {
  // ... ~20 строк логики
}, [hue, saturation, lightness, secondaryHue, useAutoSecondary, colorScheme, previewMode]);

// secondaryColorHSL useMemo - ПОЧТИ ИДЕНТИЧНАЯ ЛОГИКА!
const secondaryColorHSL = useMemo(() => {
  // ... ~20 строк логики (дубликат!)
}, [hue, saturation, lightness, secondaryHue, useAutoSecondary, colorScheme, previewMode]);
```

**Root Cause:** Два useMemo вычисляют почти одно и то же.

**Fix:** Вычислять HSL один раз и деривировать hex из него:
```tsx
const secondaryColorHSL = useMemo(() => { /* ... */ }, [...]);
const secondaryColor = useMemo(() => 
  hslToHex(secondaryColorHSL.h, secondaryColorHSL.s, secondaryColorHSL.l),
[secondaryColorHSL]);
```

---

### PERF-003: Отсутствие useCallback для inline functions
**Файл:** `page.tsx:540-546`
**Серьёзность:** LOW
**Статус:** Не исправлен

```tsx
onChange={(e) => {
  const hsl = hexToHsl(e.target.value);
  setHue(hsl.h);
  setSaturation(hsl.s);
  setLightness(hsl.l);
  setSelectedSliderPreset("По умолчанию");
  addToHistory(e.target.value);
}}
```

**Проблема:** Inline функция создаётся при каждом render.

---

## 🟠 CODE QUALITY ISSUES

### CODE-001: Неиспользуемый импорт
**Файл:** `page.tsx:3`
**Серьёзность:** LOW

```tsx
import { useState, useMemo, useCallback, useEffect } from "react";
//                                    ^^^^^^^^^ 
// useEffect импортирован, но НЕ ИСПОЛЬЗУЕТСЯ в Home компоненте!
```

---

### CODE-002: Unused Import в ColorPicker
**Файл:** `ColorPicker.tsx:3`

```tsx
import { useRef, useEffect, MouseEvent, TouchEvent, useCallback } from "react";
//                                                          ^^^^^^^^^
// useCallback импортирован, используется только для getCoordinates
```

---

### CODE-003: Magic Numbers
**Файл:** `ColorPicker.tsx:110-111`, `ContrastPicker.tsx:56-57`

```tsx
// ColorPicker.tsx
const s = (coords.x / 180) * 100;  // ❌ Magic number 180
const l = 100 - (coords.y / 180) * 100;

// ContrastPicker.tsx
const cursorX = (contrast / 100) * 180;  // ❌ Magic number 180
const cursorY = ((100 - brightness) / 100) * 180;
```

**Рекомендация:** Вынести в константы:
```tsx
const CANVAS_SIZE = 180;
```

---

### CODE-004: Отсутствие типизации для event в ColorVariantsList
**Файл:** `ColorVariantsList.tsx:30`

```tsx
const handleCopy = (e: React.MouseEvent, color: string, index: number) => {
  //          ^^^^ Не указан тип элемента!
```

**Fix:**
```tsx
const handleCopy = (e: React.MouseEvent<HTMLButtonElement>, color: string, index: number) => {
```

---

### CODE-005: Дублирование функции getContrastTextColor
**Файл:** `ColorVariantsList.tsx:13-19`

```tsx
// Локальная функция с отличающейся формулой от getContrastColor в colorUtils.ts
function getContrastTextColor(hexColor: string): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}
```

**Root Cause:** Эта функция использует простую формулу luminance, а `getContrastColor` в colorUtils.ts использует WCAG-compliant формулу с gamma correction.

**Рекомендация:** Использовать единую функцию из colorUtils.ts.

---

## 🔵 ACCESSIBILITY ISSUES

### A11Y-001: Отсутствие aria-label для color picker
**Файл:** `ColorPicker.tsx:174-186`

```tsx
<canvas
  ref={canvasRef}
  width={180}
  height={180}
  className="cursor-crosshair border border-border rounded touch-none"
  // ❌ Нет aria-label, role, или keyboard navigation!
```

**Проблема:** Canvas-based color picker недоступен для screen readers и keyboard navigation.

---

### A11Y-002: Отсутствие keyboard navigation в ContrastPicker
**Файл:** `ContrastPicker.tsx`

**Проблема:** ContrastPicker поддерживает только mouse events, нет touch или keyboard support.

---

### A11Y-003: Timeout warning для toast
**Файл:** `page.tsx:97-108`

```tsx
function Toast({ message, visible }: { message: string; visible: boolean }) {
  // ❌ Toast auto-dismisses without user action - WCAG violation
```

**Проблема:** Auto-dismissing notifications могут быть пропущены пользователями с disabilities.

**Fix:** Добавить кнопку закрытия и pause on hover.

---

## 🟣 REACT ANTI-PATTERNS

### REACT-001: useRef для isDragging без cleanup
**Файл:** `ColorPicker.tsx:52`, `ContrastPicker.tsx:18`

```tsx
const isDragging = useRef(false);
```

**Проблема:** Если drag начинается и пользователь уводит курсор за пределы компонента без mouseup, isDragging остаётся true.

**Fix:** Добавить document-level event listeners для корректной обработки drag-end.

---

### REACT-002: Missing dependency в useEffect
**Файл:** `ColorPicker.tsx:55-75`

```tsx
useEffect(() => {
  // ... uses hslToRgbString which is defined outside
}, [hue]);  // ❌ hslToRgbString не в dependencies
```

**Примечание:** ESLint должен был это поймать, но функция pure и не изменяется.

---

### REACT-003: Direct style manipulation вместо CSS-in-JS
**Файл:** Множественные файлы

```tsx
style={{
  background: `linear-gradient(to right, hsl(0, 100%, 50%), ...)`
}}
```

**Проблема:** Complex gradients в inline styles не кешируются браузером.

---

## 📊 EXECUTION FLOW ANALYSIS

### Critical Path: Color Selection Flow

```
User clicks color → 
  handleColorSelect() →
    hexToHsl(color) →
      hexToRgb() → rgbToHsl() →
    setHue/setSaturation/setLightness →
  [React re-render] →
    baseColor = useMemo(hslToHex) →
    adaptedPrimaryHSL = useMemo(adaptColorForTheme) →
    adaptedPrimaryColor = useMemo(hslToHex) →
    secondaryColor = useMemo(...20 lines...) →
    colorVariants = useMemo(...generate 5 variants...) →
    [8 WCAG calculations] →
  [Canvas redraw if hue changed]
```

**Потенциальные точки оптимизации:**
1. Кеширование hexToHsl/hslToHex результатов
2. Batch WCAG calculations
3. Debounce для slider movements

---

## 🛠️ RECOMMENDED FIXES PRIORITY

| Priority | Bug ID | Description | Estimated Time |
|----------|--------|-------------|----------------|
| P0 | BUG-001 | setTimeout memory leak (Toast) | 15 min |
| P0 | BUG-002 | setTimeout memory leak (ColorVariants) | 10 min |
| P1 | BUG-003 | Clipboard API fallback | 20 min |
| P1 | PERF-002 | Duplicated secondaryColor logic | 15 min |
| P2 | A11Y-001 | Color picker accessibility | 2 hours |
| P2 | REACT-001 | Drag cleanup | 30 min |
| P3 | CODE-* | Code quality issues | 1 hour |

---

## ✅ VERIFICATION TESTS

### Test Cases для BUG-001:
1. Navigate to page
2. Click copy button
3. Immediately navigate away before 2s
4. Verify no console warnings about setState on unmounted component

### Test Cases для BUG-003:
1. Open page over HTTP (not HTTPS)
2. Click copy button
3. Verify fallback works
4. Test in browser with clipboard permissions denied

---

*Report generated by bug-analyzer agent*
*Files analyzed: 7*
*Issues found: 15*
*Critical bugs: 3*
