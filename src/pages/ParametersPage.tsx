import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix } from "@/types/parameter";
import { MainLayout } from "@/components/layout/MainLayout";
import { getMatrices, deleteMatrix } from "@/api/index";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { scientificFields } from "@/data/constants"; // Keep scientificFields for filter if it's static, or fetch if dynamic. Let's assume static for now or just defined locally.

interface ParametersPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function ParametersPage({ activeMenu, onMenuClick }: ParametersPageProps) {
    const { t } = useTranslation();
    const [matrices, setMatrices] = useState<Matrix[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedField, setSelectedField] = useState<string>("all");
    const [isLoading, setIsLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const fetchMatrices = useCallback(async () => {
        setIsLoading(true);
        try {
            // Mapping UI filter to API query
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                search: searchQuery || undefined,
                page,
                itemsPerPage,
            };
            if (selectedField !== "all") {
                query.scientificField = selectedField;
            }

            const response = await getMatrices({ query });
            if (response.success && response.data) {
                setMatrices(response.data as Matrix[]);
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 0);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                toast.error("Failed to fetch parameters"); // "Parameter" in UI vs "Matrix" in API
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
        } finally {
            setIsLoading(false);
        }
    }, [searchQuery, selectedField, page, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchMatrices();
        }, 300); // Debounce search
        return () => clearTimeout(timer);
    }, [fetchMatrices]);

    const handleDelete = async (matrixId: string) => {
        if (!confirm(t("parameter.confirmDelete"))) return;

        try {
            const response = await deleteMatrix({ body: { id: matrixId } });
            if (response.success) {
                toast.success(t("parameter.deleteSuccess") || "Deleted successfully");
                fetchMatrices();
            } else {
                toast.error(response.error?.message || "Failed to delete parameter");
            }
        } catch {
            toast.error("Error deleting parameter");
        }
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("parameter.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("parameter.subtitle")}</p>
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t("parameter.add")}
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                {/* Filters */}
                <div className="bg-card rounded-lg border border-border p-4 mb-4">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("analysis.searchPlaceholder")}
                            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => setSelectedField("all")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                selectedField === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                            }`}
                        >
                            {t("analysis.filterAll")}
                        </button>
                        {scientificFields.map((field) => (
                            <button
                                key={field.value}
                                onClick={() => setSelectedField(field.value)}
                                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                    selectedField === field.value ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-muted/80"
                                }`}
                            >
                                {t(`analysis.fields.${field.value}`, field.label)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("parameter.name")}</th>
                                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("order.sampleMatrix")}</th>
                                    <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("parameter.unitPrice")}</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("parameter.tax")}</th>
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : matrices.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                            {t("analysis.noParametersFound")}
                                        </td>
                                    </tr>
                                ) : (
                                    matrices.map((matrix) => (
                                        <tr key={matrix.matrixId} className="border-t border-border hover:bg-muted">
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">{matrix.parameterName}</td>
                                            <td className="px-6 py-4 text-sm text-foreground">{matrix.sampleTypeName}</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{matrix.feeBeforeTax?.toLocaleString("vi-VN")} đ</td>
                                            <td className="px-6 py-4 text-center text-sm text-foreground">{matrix.taxRate}%</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors" title={t("common.edit")}>
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(matrix.matrixId)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        title={t("common.delete")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && matrices.length > 0 && (
                        <Pagination
                            currentPage={page}
                            totalPages={totalPages}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={(p) => setPage(p)}
                            onItemsPerPageChange={(items) => {
                                setItemsPerPage(items);
                                setPage(1);
                            }}
                        />
                    )}
                </div>
            </div>
        </MainLayout>
    );
}
