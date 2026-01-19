import { Moon, Sun, Laptop } from "lucide-react";
import { useTheme } from "../config/theme";
import { useTranslation } from "react-i18next";

export function ThemeToggle({ variant = "full" }: { variant?: "full" | "compact" }) {
  const { setTheme, theme } = useTheme();
  const { t } = useTranslation();

  const wrapClass =
    variant === "full"
      ? "flex items-center gap-1 border border-border rounded-lg p-1 bg-card"
      : "flex items-center gap-1";

  const btn = (active: boolean) =>
    `p-2 rounded-md transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
    }`;

  return (
    <div className={wrapClass}>
      <button onClick={() => setTheme("light")} className={btn(theme === "light")} title={t("theme.light") || "Light"}>
        <Sun className="h-4 w-4" />
      </button>
      <button onClick={() => setTheme("dark")} className={btn(theme === "dark")} title={t("theme.dark") || "Dark"}>
        <Moon className="h-4 w-4" />
      </button>
      <button onClick={() => setTheme("system")} className={btn(theme === "system")} title={t("theme.system") || "System"}>
        <Laptop className="h-4 w-4" />
      </button>
    </div>
  );
}
