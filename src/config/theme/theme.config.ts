export const STORAGE_KEY = "vite-ui-theme";

export const THEME_OPTIONS = [
    { value: "light", label: "theme.light" },
    { value: "dark", label: "theme.dark" },
    { value: "system", label: "theme.system" },
] as const;

export type Theme = (typeof THEME_OPTIONS)[number]["value"];

// Light Mode Colors - Professional Blue Theme
export const LIGHT_THEME = {
    primary: "#0058a3",
    secondary: "#3366CC",
    tertiary: "#89CFF0",
    background: "#f5f5f5",
    foreground: "#1a1a1a",
    card: "#ffffff",
    border: "#d9d9d9",
    muted: "#f0f0f0",
    mutedForeground: "#666666",
    success: "#52c41a",
    warning: "#faad14",
    destructive: "#d4183d",
} as const;

// Dark Mode Colors - High Contrast Dark Theme
export const DARK_THEME = {
    primary: "#4da6ff",
    secondary: "#5c7cfa",
    tertiary: "#74c0fc",
    background: "#0a0a0a",
    foreground: "#e8e8e8",
    card: "#1a1a1a",
    border: "#2a2a2a",
    muted: "#262626",
    mutedForeground: "#a0a0a0",
    success: "#51cf66",
    warning: "#ffd43b",
    destructive: "#ff6b6b",
} as const;

// System Mode Colors - Nature-Inspired Green Theme
export const SYSTEM_THEME = {
    primary: "#2d7a3e", // Forest Green
    secondary: "#4a9960", // Sage Green
    tertiary: "#7ec699", // Mint Green
    background: "#f8faf9", // Off-white with green tint
    foreground: "#1a2e1a", // Dark Forest
    card: "#ffffff",
    border: "#d4e4d7", // Light Green Border
    muted: "#e8f3ea", // Very Light Green
    mutedForeground: "#5a6f5a", // Muted Forest
    success: "#38a169", // Natural Green
    warning: "#d69e2e", // Earth Yellow
    destructive: "#c53030", // Natural Red
} as const;

export type ThemeColors = typeof LIGHT_THEME;
