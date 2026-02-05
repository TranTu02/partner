import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils";
import type { AccountingStats as AccountingStatsType } from "@/types/common";

interface AccountingStatsProps {
    stats: AccountingStatsType;
    filterType: "pending" | "completed" | "totalPending" | "all";
    onFilterChange: (type: "pending" | "completed" | "totalPending" | "all") => void;
}

export function AccountingStats({ stats, filterType, onFilterChange }: AccountingStatsProps) {
    const { t } = useTranslation();

    // Toggle filter - click again to clear
    const handleFilterClick = (type: "pending" | "completed" | "totalPending") => {
        if (filterType === type) {
            onFilterChange("all"); // Clear filter
        } else {
            onFilterChange(type);
        }
    };

    return (
        <div className="grid grid-cols-3 gap-4 mb-4">
            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "pending" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => handleFilterClick("pending")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.pending")}</div>
                <div className="text-2xl font-bold text-warning mt-2">{stats.waitingExportInvoiceCount || 0}</div>
            </div>

            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "completed" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => handleFilterClick("completed")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.completed")}</div>
                <div className="text-2xl font-bold text-success mt-2">{stats.paymentProblemOrderCount || 0}</div>
            </div>

            <div
                className={`bg-card rounded-lg border p-6 cursor-pointer transition-colors ${filterType === "totalPending" ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
                onClick={() => handleFilterClick("totalPending")}
            >
                <div className="text-sm text-muted-foreground">{t("accounting.stats.totalPendingValue")}</div>
                <div className="text-2xl font-bold text-primary mt-2">{formatCurrency(stats.totalPaymentDifferenceAmount || 0)}</div>
            </div>
        </div>
    );
}
