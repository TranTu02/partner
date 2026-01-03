import { StatCard } from "@/components/statistic/StatCard";
import { ActivityItem } from "@/components/statistic/ActivityItem";
import { ParameterBar } from "@/components/statistic/ParameterBar";
import { useTranslation } from "react-i18next";

import { MainLayout } from "@/components/layout/MainLayout";

interface DashboardPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function DashboardPage({ activeMenu, onMenuClick }: DashboardPageProps) {
    const { t } = useTranslation();

    const headerContent = (
        <div>
            <h1 className="text-xl font-bold text-foreground">{t("dashboard.title")}</h1>
            <p className="text-sm text-muted-foreground">{t("dashboard.subtitle")}</p>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div className="flex-1 overflow-auto bg-background">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title={t("dashboard.stats.totalClients")} value="28" change="+12%" isPositive={true} color="hsl(var(--primary))" />
                    <StatCard title={t("dashboard.stats.quotesThisMonth")} value="15" change="+8%" isPositive={true} color="hsl(var(--success))" />
                    <StatCard title={t("dashboard.stats.ordersInProgress")} value="7" change="-3%" isPositive={false} color="hsl(var(--warning))" />
                    <StatCard title={t("dashboard.stats.revenueThisMonth")} value="45.2M" change="+18%" isPositive={true} color="hsl(var(--secondary))" />
                </div>

                {/* Activity & Parameters */}
                <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Recent Activity */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <h3 className="text-base font-semibold text-foreground mb-4">{t("dashboard.recentActivity.title")}</h3>
                        <div className="space-y-4">
                            <ActivityItem title={t("dashboard.recentActivity.newQuote")} description="QT-20241230-01 - Công ty TNHH ABC" time="10 phút trước" />
                            <ActivityItem title={t("dashboard.recentActivity.orderCompleted")} description="ORD-20241229-01 - Công ty Cổ phần XYZ" time="2 giờ trước" />
                            <ActivityItem title={t("dashboard.recentActivity.newClient")} description="Nhà máy Sản xuất GHI" time="1 ngày trước" />
                        </div>
                    </div>

                    {/* Popular Parameters */}
                    <div className="bg-card rounded-lg border border-border p-6">
                        <h3 className="text-base font-semibold text-foreground mb-4">{t("dashboard.popularParameters.title")}</h3>
                        <div className="space-y-3">
                            <ParameterBar name="pH" count={45} />
                            <ParameterBar name="COD" count={38} />
                            <ParameterBar name="BOD5" count={32} />
                            <ParameterBar name="TSS" count={28} />
                            <ParameterBar name="Coliform" count={22} />
                        </div>
                    </div>
                </div>
            </div>
        </MainLayout>
    );
}
