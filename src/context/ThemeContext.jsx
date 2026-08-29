import React, { createContext, useContext, useState, useEffect } from "react";

export const COLOR_PALETTES = [
  { id: "indigo",  label: "Indigo",    primary: "#6366f1", secondary: "#8b5cf6", accent: "#10b981",  dark: "#0f172a" },
  { id: "blue",    label: "Ocean",     primary: "#2563eb", secondary: "#0ea5e9", accent: "#06b6d4",  dark: "#0a1628" },
  { id: "emerald", label: "Emerald",   primary: "#059669", secondary: "#10b981", accent: "#34d399",  dark: "#052e16" },
  { id: "orange",  label: "Sunset",    primary: "#f97316", secondary: "#f59e0b", accent: "#fbbf24",  dark: "#1c0a00" },
  { id: "rose",    label: "Rose",      primary: "#e11d48", secondary: "#ec4899", accent: "#f43f5e",  dark: "#1a0010" },
  { id: "violet",  label: "Violet",    primary: "#7c3aed", secondary: "#8b5cf6", accent: "#a78bfa",  dark: "#1e0a4e" },
  { id: "slate",   label: "Graphite",  primary: "#475569", secondary: "#64748b", accent: "#94a3b8",  dark: "#0f172a" },
  { id: "teal",    label: "Teal",      primary: "#0d9488", secondary: "#14b8a6", accent: "#2dd4bf",  dark: "#042f2e" },
];

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [mode, setMode] = useState(() => localStorage.getItem("app_theme_mode") || "dark");
  const [paletteId, setPaletteId] = useState(() => localStorage.getItem("app_theme_palette") || "indigo");

  const palette = COLOR_PALETTES.find(p => p.id === paletteId) || COLOR_PALETTES[0];
  const isDark = mode === "dark";

  const toggleMode = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    localStorage.setItem("app_theme_mode", next);
  };

  const setPalette = (id) => {
    setPaletteId(id);
    localStorage.setItem("app_theme_palette", id);
  };

  // Apply CSS variables to document root
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-theme-mode", mode);

    if (isDark) {
      root.style.setProperty("--theme-bg",          palette.dark);
      root.style.setProperty("--theme-surface",     "rgba(255,255,255,0.04)");
      root.style.setProperty("--theme-border",      "rgba(255,255,255,0.08)");
      root.style.setProperty("--theme-text",        "#f1f5f9");
      root.style.setProperty("--theme-text-muted",  "#64748b");
      root.style.setProperty("--theme-card-bg",     "rgba(255,255,255,0.03)");
      root.style.setProperty("--theme-header-bg",   `linear-gradient(135deg,${palette.dark} 0%,#0d1425 100%)`);
      root.style.setProperty("--theme-chart-grid",  "rgba(255,255,255,0.04)");
      root.style.setProperty("--theme-tooltip-bg",  "#0f172a");
    } else {
      root.style.setProperty("--theme-bg",          "#f8fafc");
      root.style.setProperty("--theme-surface",     "#ffffff");
      root.style.setProperty("--theme-border",      "#e2e8f0");
      root.style.setProperty("--theme-text",        "#0f172a");
      root.style.setProperty("--theme-text-muted",  "#64748b");
      root.style.setProperty("--theme-card-bg",     "#ffffff");
      root.style.setProperty("--theme-header-bg",   `linear-gradient(135deg,#1e3a5f 0%,${palette.primary} 100%)`);
      root.style.setProperty("--theme-chart-grid",  "#f1f5f9");
      root.style.setProperty("--theme-tooltip-bg",  "#ffffff");
    }

    root.style.setProperty("--theme-primary",   palette.primary);
    root.style.setProperty("--theme-secondary", palette.secondary);
    root.style.setProperty("--theme-accent",    palette.accent);
  }, [mode, palette, isDark]);

  return (
    <ThemeContext.Provider value={{ mode, isDark, palette, paletteId, toggleMode, setPalette, COLOR_PALETTES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return {
    mode: "dark", isDark: true,
    palette: COLOR_PALETTES[0], paletteId: "indigo",
    toggleMode: () => {}, setPalette: () => {},
    COLOR_PALETTES,
  };
  return ctx;
}