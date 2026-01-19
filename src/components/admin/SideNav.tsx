import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  BarChart3,
  Users,
  FileText,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
  Laptop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useTranslation } from "react-i18next";

import LogoFull from "@/assets/LOGO-FULL.png";
import LogoShort from "@/assets/LOGO-SORT.png";

import { LanguageSwitcher } from "@/components/common/LanguageSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/config/theme";

const mainItems = [
  { icon: LayoutDashboard, id: "dashboard" },
  { icon: BarChart3, id: "analytics" },
  { icon: Users, id: "clients" },
  { icon: FileText, id: "reports" },
];

function AvatarCircle({
  name,
  imageUrl,
  size = 34,
}: {
  name?: string;
  imageUrl?: string | null;
  size?: number;
}) {
  const n = (name || "").trim();
  const initials = !n ? "??" : (n[0] + n[n.length - 1]).toUpperCase();

  return (
    <div
      className="rounded-full overflow-hidden"
      style={{ width: size, height: size }}
      title={name}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name || "avatar"}
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="h-full w-full flex items-center justify-center bg-muted/40 text-xs font-semibold text-foreground">
          {initials}
        </div>
      )}
    </div>
  );
}

export function SideNav() {
  const { user, isGuest, logout } = useAuth();
  const { i18n, t } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [activeItem, setActiveItem] = useState(mainItems[0].id);
  const [collapsed, setCollapsed] = useState(false);

  const displayName = useMemo(() => {
    if (isGuest) return t("sidebar.guest", "Guest");
    return user?.identityName || "";
  }, [isGuest, user?.identityName, t]);

  const avatarUrl = null;

  const footerBtnClass =
    "h-10 w-full rounded-md border border-border bg-card hover:bg-muted/40 transition-smooth flex items-center justify-center";

  const isVI = (i18n.language || "").toLowerCase().startsWith("vi");
  const langLabel = isVI ? "VI" : "EN";
  const toggleLang = () => i18n.changeLanguage(isVI ? "en" : "vi");

  const nextTheme = () => {
    if (theme === "light") return "dark";
    if (theme === "dark") return "system";
    return "light";
  };

  const themeIcon =
    theme === "light" ? (
      <Sun className="h-4 w-4" />
    ) : theme === "dark" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Laptop className="h-4 w-4" />
    );

  const themeTitle =
    theme === "light"
      ? t("theme.light", "Light")
      : theme === "dark"
      ? t("theme.dark", "Dark")
      : t("theme.system", "System");

  const renderItem = (item: { icon: any; id: string }, idx: number) => {
    const isActive = activeItem === item.id;

    return (
      <Button
        key={item.id}
        onClick={() => setActiveItem(item.id)}
        variant={isActive ? "default" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 px-3 animate-fade-in-scale transition-smooth group",
          collapsed && "justify-center px-0",
          isActive
            ? "bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/50"
            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
        )}
        style={{ animationDelay: `${idx * 50}ms` }}
        title={collapsed ? t(`sidebar.${item.id}`) : undefined}>
        <item.icon
          className={cn(
            "h-5 w-5 transition-smooth shrink-0",
            isActive && "group-hover:rotate-12"
          )}
        />

        {!collapsed && (
          <span className="group-hover:translate-x-1 transition-smooth">
            {t(`sidebar.${item.id}`)}
          </span>
        )}
      </Button>
    );
  };

  return (
    <aside
      className={cn(
        "relative border-r border-border bg-sidebar text-sidebar-foreground animate-slide-in-left transition-all duration-300 ease-out",
        collapsed ? "w-16" : "w-60"
      )}>
      <button
        type="button"
        onClick={() => setCollapsed((v) => !v)}
        className={cn(
          "absolute top-1/2 right-0 z-20 -translate-y-1/2 translate-x-1/2",
          "h-9 w-9 rounded-full border border-border bg-background/90 backdrop-blur",
          "shadow-md hover:shadow-lg transition-smooth",
          "flex items-center justify-center"
        )}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>

      <div
        className={cn(
          "flex h-16 items-center border-b border-sidebar-border",
          collapsed ? "px-3" : "px-4"
        )}>
        <div
          className={cn(
            "flex items-center w-full",
            collapsed ? "justify-center" : "justify-center"
          )}>
          <img
            src={collapsed ? LogoShort : LogoFull}
            alt="logo"
            className={cn(
              "transition-all duration-300 ease-out",
              collapsed ? "h-9 w-auto" : "h-10 w-auto"
            )}
          />
        </div>
      </div>

      <div className="flex h-[calc(100vh-4rem)] flex-col">
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            {mainItems.map((item, idx) => renderItem(item, idx))}
          </div>
        </nav>

        {(user || isGuest) && (
          <div className="border-t border-border">
            {collapsed ? (
              <div className="p-3 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={toggleLang}
                  className={cn(
                    footerBtnClass,
                    "text-sm font-semibold bg-primary text-primary-foreground border-primary/40 hover:bg-primary/90"
                  )}
                  title={isVI ? "Switch to EN" : "Chuyển sang VI"}>
                  {langLabel}
                </button>

                <button
                  type="button"
                  onClick={() => setTheme(nextTheme())}
                  className={footerBtnClass}
                  title={themeTitle}>
                  {themeIcon}
                </button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "h-10 w-full border border-border bg-card hover:bg-muted/40 transition-smooth",
                        "flex items-center justify-center",
                        "rounded-full"
                      )}
                      title="User menu">
                      <AvatarCircle
                        name={displayName}
                        imageUrl={avatarUrl}
                        size={30}
                      />
                    </button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent
                    side="right"
                    align="end"
                    className="min-w-[160px]">
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-destructive focus:text-destructive">
                      <LogOut className="mr-2 h-4 w-4" />
                      {t("sidebar.logout", "Logout")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                <div className="flex justify-between gap-2">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>

                <div className="flex items-center justify-between gap-8">
                  <div className="h-10 w-10 rounded-full border border-border bg-card flex items-center justify-center">
                    <AvatarCircle
                      name={displayName}
                      imageUrl={avatarUrl}
                      size={34}
                    />
                  </div>
                  <button
                    onClick={logout}
                    className="flex-1 flex items-center gap-3 px-4 py-2.5 text-destructive hover:bg-destructive/10 rounded transition-colors text-sm font-medium">
                    <LogOut className="w-5 h-5" />
                    {t("sidebar.logout", "Logout")}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
