import { useState } from "react";
import { FileText, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { MainLayout } from "@/components/layout/MainLayout";

interface CompletedOrder {
    id: string;
    orderId: string;
    clientName: string;
    clientLegalId: string;
    invoiceEmail: string;
    invoiceInfo: string;
    total: number;
    completedDate: string;
    hasInvoice: boolean;
}

const mockCompletedOrders: CompletedOrder[] = [
    {
        id: "O001",
        orderId: "ORD-20241229-01",
        clientName: "Công ty TNHH ABC",
        clientLegalId: "0123456789",
        invoiceEmail: "invoice@abc.com",
        invoiceInfo: "Thông tin hóa đơn ABC",
        total: 1512000,
        completedDate: "2024-12-29",
        hasInvoice: false,
    },
    {
        id: "O002",
        orderId: "ORD-20241228-03",
        clientName: "Công ty Cổ phần XYZ",
        clientLegalId: "9876543210",
        invoiceEmail: "invoice@xyz.com",
        invoiceInfo: "Thông tin hóa đơn XYZ",
        total: 864000,
        completedDate: "2024-12-28",
        hasInvoice: false,
    },
    {
        id: "O003",
        orderId: "ORD-20241227-02",
        clientName: "Nhà máy Sản xuất DEF",
        clientLegalId: "5555666777",
        invoiceEmail: "invoice@def.com",
        invoiceInfo: "Thông tin hóa đơn DEF",
        total: 2160000,
        completedDate: "2024-12-27",
        hasInvoice: true,
    },
];

interface AccountingPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function AccountingPage({ activeMenu, onMenuClick }: AccountingPageProps) {
    const { t } = useTranslation();
    const [orders, setOrders] = useState<CompletedOrder[]>(mockCompletedOrders);
    const [searchQuery, setSearchQuery] = useState("");
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<CompletedOrder | null>(null);

    const filteredOrders = orders.filter(
        (order) => !order.hasInvoice && (order.orderId.toLowerCase().includes(searchQuery.toLowerCase()) || order.clientName.toLowerCase().includes(searchQuery.toLowerCase())),
    );

    const handleCreateInvoice = (order: CompletedOrder) => {
        setSelectedOrder(order);
        setShowInvoiceModal(true);
    };

    const handleConfirmInvoice = () => {
        if (!selectedOrder) return;

        setOrders(orders.map((o) => (o.id === selectedOrder.id ? { ...o, hasInvoice: true } : o)));

        alert(t("accounting.successMessage", { orderId: selectedOrder.orderId }));
        setShowInvoiceModal(false);
        setSelectedOrder(null);
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("accounting.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("accounting.subtitle")}</p>
            </div>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                {/* Search Bar */}
                <div className="bg-card rounded-lg border border-border p-4 mb-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("accounting.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-card rounded-lg border border-border p-6">
                        <div className="text-sm text-muted-foreground">{t("accounting.stats.pending")}</div>
                        <div className="text-2xl font-bold text-warning mt-2">{filteredOrders.length}</div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-6">
                        <div className="text-sm text-muted-foreground">{t("accounting.stats.completed")}</div>
                        <div className="text-2xl font-bold text-success mt-2">{orders.filter((o) => o.hasInvoice).length}</div>
                    </div>
                    <div className="bg-card rounded-lg border border-border p-6">
                        <div className="text-sm text-muted-foreground">{t("accounting.stats.totalPendingValue")}</div>
                        <div className="text-2xl font-bold text-primary mt-2">{filteredOrders.reduce((sum, o) => sum + o.total, 0).toLocaleString("vi-VN")} đ</div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-lg border border-border overflow-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.orderCode")}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("accounting.table.client")}</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.taxCode")}</th>
                                <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.total")}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-medium">{t("accounting.table.completedDate")}</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                        {t("accounting.noInvoicesFound")}
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map((order) => (
                                    <tr key={order.id} className="border-t border-border hover:bg-muted">
                                        <td className="px-6 py-4 text-sm font-medium text-primary">{order.orderId}</td>
                                        <td className="px-6 py-4 text-sm text-foreground">{order.clientName}</td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">{order.clientLegalId}</td>
                                        <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{order.total.toLocaleString("vi-VN")} đ</td>
                                        <td className="px-6 py-4 text-center text-sm text-muted-foreground">{new Date(order.completedDate).toLocaleDateString("vi-VN")}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => handleCreateInvoice(order)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                                            >
                                                <FileText className="w-4 h-4" />
                                                {t("accounting.createInvoice")}
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Invoice Modal */}
            {showInvoiceModal && selectedOrder && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-card rounded-lg w-full max-w-2xl shadow-xl border border-border">
                        <div className="flex items-center justify-between p-6 border-b border-border">
                            <h2 className="text-xl font-bold text-foreground">{t("accounting.createInvoice")}</h2>
                            <button onClick={() => setShowInvoiceModal(false)} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("accounting.table.orderId")}</label>
                                    <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-sm text-foreground" value={selectedOrder.orderId} readOnly />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("accounting.table.client")}</label>
                                    <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-sm text-foreground" value={selectedOrder.clientName} readOnly />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("accounting.table.taxCode")}</label>
                                    <input type="text" className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm text-foreground" defaultValue={selectedOrder.clientLegalId} />
                                </div>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceEmail")}</label>
                                    <input type="email" className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm text-foreground" defaultValue={selectedOrder.invoiceEmail} />
                                </div>
                            </div>

                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("client.invoiceInfo")}</label>
                                <textarea className="w-full px-3 py-2 border border-border rounded-lg bg-input text-sm text-foreground" rows={3} defaultValue={selectedOrder.invoiceInfo} />
                            </div>

                            <div className="bg-muted/50 p-4 rounded-lg">
                                <div className="flex justify-between mb-2">
                                    <span className="text-sm text-foreground">{t("accounting.table.total")}:</span>
                                    <span className="text-base font-semibold text-primary">{selectedOrder.total.toLocaleString("vi-VN")} đ</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                            <button
                                onClick={() => setShowInvoiceModal(false)}
                                className="px-4 py-2 border border-border rounded-lg hover:bg-muted transition-colors text-sm font-medium text-foreground"
                            >
                                {t("common.cancel")}
                            </button>
                            <button onClick={handleConfirmInvoice} className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                {t("accounting.confirmInvoice")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </MainLayout>
    );
}
