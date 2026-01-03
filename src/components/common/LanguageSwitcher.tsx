import { useTranslation } from "react-i18next";

export function LanguageSwitcher() {
    const { i18n } = useTranslation();

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <div className="flex gap-2">
            <button
                onClick={() => changeLanguage("vi")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    i18n.language === "vi" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
                VI
            </button>
            <button
                onClick={() => changeLanguage("en")}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    i18n.language === "en" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
            >
                EN
            </button>
        </div>
    );
}
