import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "../config/theme";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
    const { setTheme, theme } = useTheme();
    const { t } = useTranslation();

    return (
        <div className="flex items-center gap-1 border border-border rounded-lg p-1 bg-card">
            <button
                onClick={() => setTheme("light")}
                className={`p-2 rounded-md transition-colors ${theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                title={t("theme.light") || "Light"}
            >
                <Sun className="h-4 w-4" />
            </button>
            <button
                onClick={() => setTheme("dark")}
                className={`p-2 rounded-md transition-colors ${theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                title={t("theme.dark") || "Dark"}
            >
                <Moon className="h-4 w-4" />
            </button>
            <button
                onClick={() => setTheme("system")}
                className={`p-2 rounded-md transition-colors ${theme === "system" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                title={t("theme.system") || "System"}
            >
                <Laptop className="h-4 w-4" />
            </button>
        </div>
    );
}
