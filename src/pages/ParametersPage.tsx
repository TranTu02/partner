import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search, Eye } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix, ParameterGroup } from "@/types/parameter";
import { MainLayout } from "@/components/layout/MainLayout";
import { getMatrices, deleteMatrix, getParameterGroups, deleteParameterGroup } from "@/api/index";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { MatrixModal } from "@/components/parameter/MatrixModal";
import { ParameterGroupModal } from "@/components/parameter/ParameterGroupModal";

interface ParametersPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function ParametersPage({ activeMenu, onMenuClick }: ParametersPageProps) {
    const { t } = useTranslation();

    // Tab State
    const [activeTab, setActiveTab] = useState<"parameters" | "groups">("parameters");

    // Common State
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Matrix State
    const [matrices, setMatrices] = useState<Matrix[]>([]);
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [selectedMatrix, setSelectedMatrix] = useState<Matrix | null>(null);

    // Group State
    const [groups, setGroups] = useState<ParameterGroup[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<ParameterGroup | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                search: searchQuery || undefined,
                page,
                itemsPerPage,
            };

            let response;
            if (activeTab === "parameters") {
                response = await getMatrices({ query });
            } else {
                response = await getParameterGroups({ query });
            }

            if (response.success && response.data) {
                if (activeTab === "parameters") {
                    setMatrices(response.data as Matrix[]);
                } else {
                    setGroups(response.data as ParameterGroup[]);
                }
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 0);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                // Silent fail or toast?
                if (activeTab === "parameters") setMatrices([]);
                else setGroups([]);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error connecting to server");
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, searchQuery, page, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleTabChange = (tab: "parameters" | "groups") => {
        setActiveTab(tab);
        setPage(1);
        setSearchQuery("");
    };

    const handleDeleteMatrix = async (id: string) => {
        if (!confirm(t("parameter.confirmDelete"))) return;
        try {
            const res = await deleteMatrix({ body: { id } });
            if (res.success) {
                toast.success(t("common.success"));
                fetchData();
            } else {
                toast.error(res.error?.message || t("common.error"));
            }
        } catch {
            toast.error(t("common.error"));
        }
    };

    const handleDeleteGroup = async (id: string) => {
        if (!confirm(t("parameter.confirmDelete"))) return;
        try {
            const res = await deleteParameterGroup({ body: { parameterGroupId: id } });
            if (res.success) {
                toast.success(t("common.success"));
                fetchData();
            } else {
                toast.error(res.error?.message || t("common.error"));
            }
        } catch {
            toast.error(t("common.error"));
        }
    };

    const handleAdd = () => {
        if (activeTab === "parameters") {
            setSelectedMatrix(null);
            setIsMatrixModalOpen(true);
        } else {
            setSelectedGroup(null);
            setIsGroupModalOpen(true);
        }
    };

    const handleEditMatrix = (item: Matrix) => {
        setSelectedMatrix(item);
        setIsMatrixModalOpen(true);
    };

    const handleEditGroup = (item: ParameterGroup) => {
        setSelectedGroup(item);
        setIsGroupModalOpen(true);
    };

    const headerContent = (
        <div className="flex items-center justify-between w-full">
            <div>
                <h1 className="text-xl font-bold text-foreground">{t("parameter.management")}</h1>
                <p className="text-sm text-muted-foreground">{t("parameter.subtitle")}</p>
            </div>
            <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" />
                {t(activeTab === "parameters" ? "parameter.add" : "common.add")}
            </button>
        </div>
    );

    return (
        <MainLayout activeMenu={activeMenu} onMenuClick={onMenuClick} headerContent={headerContent}>
            <div>
                {/* Controls */}
                <div className="flex justify-between items-center mb-4">
                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleTabChange("parameters")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                activeTab === "parameters" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {t("parameter.subtitle") || "Parameters"}
                        </button>
                        <button
                            onClick={() => handleTabChange("groups")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                activeTab === "groups" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {t("parameter.group") || "Group"}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("analysis.searchPlaceholder")}
                            className="w-full pl-9 pr-4 py-2 border border-border rounded-lg bg-input text-foreground text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                {/* Content */}
                <div className="bg-card rounded-lg border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-muted/50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {activeTab === "parameters" ? (
                                        <>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("parameter.name")}</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("order.sampleMatrix")}</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("parameter.unitPrice")}</th>
                                            <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("parameter.tax")}</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("order.lineTotal")}</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-large">{t("parameter.groupName")}</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("order.sampleMatrix")}</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">{t("parameter.note")}</th>
                                            <th className="px-6 py-4 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("order.lineTotal")}</th>
                                        </>
                                    )}
                                    <th className="px-6 py-4 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : (activeTab === "parameters" ? matrices.length === 0 : groups.length === 0) ? (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground text-sm">
                                            {t("analysis.noParametersFound")}
                                        </td>
                                    </tr>
                                ) : activeTab === "parameters" ? (
                                    matrices.map((matrix) => (
                                        <tr key={matrix.matrixId} className="border-t border-border hover:bg-muted">
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">{matrix.parameterName}</td>
                                            <td className="px-6 py-4 text-sm text-foreground">{matrix.sampleTypeName}</td>
                                            <td className="px-6 py-4 text-right text-sm text-foreground">{(matrix.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-6 py-4 text-center text-sm text-foreground">{matrix.taxRate}%</td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-foreground">
                                                {((matrix as any).feeAfterTax ? Number((matrix as any).feeAfterTax) : (matrix.feeBeforeTax || 0) * (1 + (matrix.taxRate || 0) / 100)).toLocaleString(
                                                    "vi-VN",
                                                )}{" "}
                                                đ
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditMatrix(matrix)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title={t("common.edit")}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteMatrix(matrix.matrixId)}
                                                        className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                        title={t("common.delete")}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    groups.map((group) => (
                                        <tr key={group.parameterGroupId} className="border-t border-border hover:bg-muted">
                                            <td className="px-6 py-4 text-sm font-medium text-foreground">{group.groupName}</td>
                                            <td className="px-6 py-4 text-sm text-foreground">{group.sampleTypeName}</td>
                                            <td className="px-6 py-4 text-sm text-foreground max-w-xs truncate" title={group.groupNote}>
                                                {group.groupNote}
                                            </td>
                                            <td className="px-6 py-4 text-right text-sm font-medium text-foreground">{(group.feeAfterTax || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditGroup(group)}
                                                        className="p-2 text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors"
                                                        title={t("common.view")}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditGroup(group)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title={t("common.edit")}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteGroup(group.parameterGroupId)}
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

                    {!isLoading && (activeTab === "parameters" ? matrices.length > 0 : groups.length > 0) && (
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

            {/* Matrix Modal */}
            <MatrixModal
                isOpen={isMatrixModalOpen}
                onClose={() => setIsMatrixModalOpen(false)}
                onSuccess={() => {
                    if (activeTab === "parameters") fetchData();
                }}
                initialData={selectedMatrix}
            />

            {/* Group Modal */}
            <ParameterGroupModal
                isOpen={isGroupModalOpen}
                onClose={() => setIsGroupModalOpen(false)}
                onSuccess={() => {
                    if (activeTab === "groups") fetchData();
                }}
                initialData={selectedGroup}
            />
        </MainLayout>
    );
}
