import { createContext, useContext, useEffect, useState } from "react";
import { STORAGE_KEY, type Theme } from "./theme.config";

type ThemeProviderProps = {
    children: React.ReactNode;
    defaultTheme?: Theme;
    storageKey?: string;
};

type ThemeProviderState = {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    actualTheme: "light" | "dark"; // The actual resolved theme (light or dark)
};

const initialState: ThemeProviderState = {
    theme: "system",
    setTheme: () => null,
    actualTheme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({ children, defaultTheme = "system", storageKey = STORAGE_KEY }: ThemeProviderProps) {
    const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem(storageKey) as Theme) || defaultTheme);
    const [actualTheme, setActualTheme] = useState<"light" | "dark">("light");

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove("light", "dark", "system");

        let resolvedTheme: "light" | "dark";

        if (theme === "system") {
            // Apply system class directly for nature theme
            root.classList.add("system");
            // Still track actual theme for components that need it
            const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
            resolvedTheme = systemTheme;
        } else {
            resolvedTheme = theme;
            root.classList.add(resolvedTheme);
        }

        setActualTheme(resolvedTheme);
    }, [theme]);

    // Listen for system theme changes when in system mode
    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            const root = window.document.documentElement;
            root.classList.remove("light", "dark", "system");
            root.classList.add("system");
            const newTheme = e.matches ? "dark" : "light";
            setActualTheme(newTheme);
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    const value = {
        theme,
        actualTheme,
        setTheme: (newTheme: Theme) => {
            localStorage.setItem(storageKey, newTheme);
            setTheme(newTheme);
        },
    };

    return <ThemeProviderContext.Provider value={value}>{children}</ThemeProviderContext.Provider>;
}

export const useTheme = () => {
    const context = useContext(ThemeProviderContext);

    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }

    return context;
};
