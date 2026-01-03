import { useTranslation } from "react-i18next";

interface StatCardProps {
    title: string;
    value: string;
    change: string;
    isPositive: boolean;
    color: string;
}

export function StatCard({ title, value, change, isPositive, color }: StatCardProps) {
    const { t } = useTranslation();

    return (
        <div className="bg-card rounded-lg border border-border p-6">
            <div className="text-sm text-muted-foreground mb-2">{title}</div>
            <div className="text-2xl font-bold mb-2" style={{ color }}>
                {value}
            </div>
            <div className={`text-xs ${isPositive ? "text-success" : "text-destructive"}`}>
                {change} {t("dashboard.stats.comparedToLastMonth")}
            </div>
        </div>
    );
}
