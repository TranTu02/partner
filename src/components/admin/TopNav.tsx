import { useTranslation } from "react-i18next";

export function TopNav() {
  const { t } = useTranslation();
  return (
    <header className="h-16 border-b border-border/50 bg-sidebar animate-slide-in-top">
      <div className="flex h-full items-center justify-between px-6">
        <div className="flex flex-1 items-center gap-4">
          <div className="relative flex-1 max-w-md group">
            <p>{t("dashboardLogs.header")}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
