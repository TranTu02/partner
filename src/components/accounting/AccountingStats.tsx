import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";

interface AccountingStatsProps {
    stats: {
        pendingCount: number;
        completedCount: number;
        totalPendingValue: number;
    };
    filterType: "pending" | "completed" | "totalPending" | "all";
    onFilterChange: (type: "pending" | "completed" | "totalPending" | "all") => void;
}

export function AccountingStats({ stats, filterType, onFilterChange }: AccountingStatsProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-3 gap-4 mb-4">
            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "pending" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => onFilterChange("pending")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.pending")}</div>
                <div className="text-2xl font-bold text-warning mt-2">{stats.pendingCount || 0}</div>
            </div>

            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "completed" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => onFilterChange("completed")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.completed")}</div>
                <div className="text-2xl font-bold text-success mt-2">{stats.completedCount || 0}</div>
            </div>

            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "totalPending" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => onFilterChange("totalPending")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.totalPendingValue")}</div>
                <div className="text-2xl font-bold text-primary mt-2">{formatCurrency(stats.totalPendingValue || 0)}</div>
            </div>
        </div>
    );
}
