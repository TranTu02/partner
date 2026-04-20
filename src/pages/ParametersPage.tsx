import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { Matrix } from "@/types/parameter";
import { MainLayout } from "@/components/layout/MainLayout";
import { getMatrices, deleteMatrix, getParameters, deleteParameter, getParameterGroups, deleteParameterGroup } from "@/api/index";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";
import { MatrixModal } from "@/components/parameter/MatrixModal";
import { ParameterModal } from "@/components/parameter/ParameterModal";
import { ParameterGroupModal } from "@/components/parameter/ParameterGroupModal";

const parseSimpleMarkdown = (text?: string) => {
    if (!text) return "";
    let html = text
        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.*?)\*/g, "<em>$1</em>")
        .replace(/\n/g, "<br/>");
    return html;
};

interface ParametersPageProps {
    activeMenu: string;
    onMenuClick: (menu: string) => void;
}

export function ParametersPage({ activeMenu, onMenuClick }: ParametersPageProps) {
    const { t } = useTranslation();

    // Tab State
    const [activeTab, setActiveTab] = useState<"matrix" | "parameters" | "groups">("matrix");

    // Common State
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    // Matrices (Danh mục chỉ tiêu - phương pháp)
    const [matrices, setMatrices] = useState<Matrix[]>([]);
    const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);
    const [selectedMatrix, setSelectedMatrix] = useState<Matrix | null>(null);

    // Parameters (Danh mục chỉ tiêu)
    const [parameters, setParameters] = useState<any[]>([]);
    const [isParamModalOpen, setIsParamModalOpen] = useState(false);
    const [selectedParameter, setSelectedParameter] = useState<any | null>(null);

    // Groups (Danh mục nhóm phép thử)
    const [groups, setGroups] = useState<any[]>([]);
    const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
    const [selectedGroup, setSelectedGroup] = useState<any | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const query: any = {
                search: searchQuery || undefined,
                page,
                itemsPerPage,
                option: activeTab === "groups" ? "full" : undefined,
            };

            let response;
            if (activeTab === "matrix") {
                response = await getMatrices({ query });
            } else if (activeTab === "parameters") {
                response = await getParameters({ query });
            } else {
                response = await getParameterGroups({ query });
            }

            if (response.success && response.data) {
                if (activeTab === "matrix") {
                    setMatrices(response.data as Matrix[]);
                } else if (activeTab === "parameters") {
                    setParameters(response.data as any[]);
                } else {
                    setGroups(response.data as any[]);
                }
                if (response.meta) {
                    setTotalPages(response.meta.totalPages || 0);
                    setTotalItems(response.meta.total || 0);
                }
            } else {
                if (activeTab === "matrix") setMatrices([]);
                else if (activeTab === "parameters") setParameters([]);
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

    const handleTabChange = (tab: "matrix" | "parameters" | "groups") => {
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

    const handleDeleteParameter = async (id: string) => {
        if (!confirm(t("parameter.confirmDelete"))) return;
        try {
            const res = await deleteParameter({ body: { parameterId: id } });
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

    const handleDeleteParameterGroup = async (id: string) => {
        if (!confirm(t("parameter.confirmDelete"))) return;
        try {
            const res = await deleteParameterGroup({ body: { groupId: id } });
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
        if (activeTab === "matrix") {
            setSelectedMatrix(null);
            setIsMatrixModalOpen(true);
        } else if (activeTab === "parameters") {
            setSelectedParameter(null);
            setIsParamModalOpen(true);
        } else {
            setSelectedGroup(null);
            setIsGroupModalOpen(true);
        }
    };

    const handleEditMatrix = (item: Matrix) => {
        setSelectedMatrix(item);
        setIsMatrixModalOpen(true);
    };

    const handleEditParameter = (item: any) => {
        setSelectedParameter(item);
        setIsParamModalOpen(true);
    };

    const handleEditGroup = (item: any) => {
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
                <span className="hidden sm:inline">
                    {activeTab === "matrix" ? t("analysis.addMethod", "Thêm CTPT") : activeTab === "parameters" ? t("parameter.add", "Thêm CT") : t("parameter.addGroup", "Thêm nhóm")}
                </span>
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
                            onClick={() => handleTabChange("matrix")}
                            className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                                activeTab === "matrix" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {t("parameter.subtitle", "Danh mục chỉ tiêu - phương pháp")}
                        </button>
                        <button
                            onClick={() => handleTabChange("parameters")}
                            className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                                activeTab === "parameters" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {t("parameter.management", "Danh mục chỉ tiêu")}
                        </button>
                        <button
                            onClick={() => handleTabChange("groups")}
                            className={`px-3 py-1.5 rounded-lg transition-colors text-sm font-medium ${
                                activeTab === "groups" ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-muted"
                            }`}
                        >
                            {t("parameter.groups", "Danh mục nhóm phép thử")}
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative w-64">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder={t("analysis.searchPlaceholder")}
                            className="w-full pl-9 pr-4 py-1.5 border border-border rounded-lg bg-input text-foreground text-sm"
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
                                    {activeTab === "matrix" ? (
                                        <>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-large">{t("parameter.name")}</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("order.sampleMatrix")}</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("parameter.protocol", "Phương pháp")}</th>
                                            <th className="px-3 py-2 text-center text-sm font-semibold text-foreground min-w-size-small">Nơi thực hiện</th>
                                            <th className="px-3 py-2 text-center text-sm font-semibold text-foreground min-w-size-small">Chứng chỉ</th>
                                            <th className="px-3 py-2 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("parameter.unitPrice")}</th>
                                            <th className="px-3 py-2 text-center text-sm font-semibold text-foreground min-w-size-small">{t("parameter.tax")}</th>
                                            <th className="px-3 py-2 text-right text-sm font-semibold text-foreground min-w-size-medium">{t("order.lineTotal")}</th>
                                        </>
                                    ) : activeTab === "parameters" ? (
                                        <>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-medium">Mã hệ thống</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">{t("parameter.name")}</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-medium">Hiển thị (VI / EN)</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-size-medium">{t("parameter.createdAt", "Ngày tạo")}</th>
                                        </>
                                    ) : (
                                        <>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-[150px]">Tên nhóm</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground min-w-[200px]">Nền mẫu</th>
                                            <th className="px-3 py-2 text-left text-sm font-semibold text-foreground">Chỉ tiêu</th>
                                            <th className="px-3 py-2 text-right text-sm font-semibold text-foreground min-w-size-small">Giảm (%)</th>
                                            <th className="px-3 py-2 text-right text-sm font-semibold text-foreground min-w-size-medium">Tổng tiền</th>
                                        </>
                                    )}
                                    <th className="px-3 py-2 text-center text-sm font-semibold text-foreground min-w-size-small">{t("common.action")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {isLoading ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-4 text-center text-muted-foreground text-sm">
                                            Loading...
                                        </td>
                                    </tr>
                                ) : (activeTab === "matrix" ? matrices.length === 0 : activeTab === "parameters" ? parameters.length === 0 : groups.length === 0) ? (
                                    <tr>
                                        <td colSpan={9} className="px-3 py-4 text-center text-muted-foreground text-sm">
                                            {t("analysis.noParametersFound")}
                                        </td>
                                    </tr>
                                ) : activeTab === "matrix" ? (
                                    matrices.map((matrix) => (
                                        <tr key={matrix.matrixId} className="border-t border-border hover:bg-muted">
                                            <td className="px-3 py-2 text-sm font-medium text-foreground">{matrix.parameterName}</td>
                                            <td className="px-3 py-2 text-sm text-foreground">{matrix.sampleTypeName}</td>
                                            <td className="px-3 py-2 text-sm text-foreground">{matrix.protocolCode}</td>
                                            <td className="px-3 py-2 text-center text-sm text-foreground">{(matrix as any).protocolSource || "--"}</td>
                                            <td className="px-3 py-2 text-center text-sm text-foreground">
                                                <div className="flex flex-wrap gap-1 justify-center">
                                                    {(() => {
                                                        let acc = matrix.protocolAccreditation;
                                                        if (typeof acc === "string" && acc.startsWith("{")) {
                                                            try {
                                                                acc = JSON.parse(acc);
                                                            } catch {
                                                                acc = null;
                                                            }
                                                        }
                                                        if (!acc || typeof acc !== "object") return "--";
                                                        const keys = Object.entries(acc)
                                                            .filter(([, v]) => v)
                                                            .map(([k]) => k);
                                                        if (keys.length === 0) return "--";
                                                        return keys.map((k) => (
                                                            <span key={k} className="px-2 py-0.5 bg-blue-100/50 border border-blue-200 text-blue-700 rounded text-xs font-semibold">
                                                                {k}
                                                            </span>
                                                        ));
                                                    })()}
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-sm text-foreground">{(matrix.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                            <td className="px-3 py-2 text-center text-sm text-foreground">{matrix.taxRate}%</td>
                                            <td className="px-3 py-2 text-right text-sm font-medium text-foreground">
                                                {((matrix as any).feeAfterTax ? Number((matrix as any).feeAfterTax) : (matrix.feeBeforeTax || 0) * (1 + (matrix.taxRate || 0) / 100)).toLocaleString(
                                                    "vi-VN",
                                                )}{" "}
                                                đ
                                            </td>
                                            <td className="px-3 py-2 text-center">
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
                                ) : activeTab === "parameters" ? (
                                    parameters.map((param) => (
                                        <tr key={param.parameterId} className="border-t border-border hover:bg-muted">
                                            <td className="px-3 py-2 text-sm text-foreground">{param.parameterId}</td>
                                            <td className="px-3 py-2 text-sm font-medium text-foreground">{param.parameterName}</td>
                                            <td className="px-3 py-2 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                                                {param.displayStyle?.default && <div className="mb-2" dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(param.displayStyle.default) }} />}
                                                {param.displayStyle?.eng && <div className="text-muted-foreground" dangerouslySetInnerHTML={{ __html: parseSimpleMarkdown(param.displayStyle.eng) }} />}
                                                {!param.displayStyle?.default && !param.displayStyle?.eng && <span className="text-muted-foreground">-</span>}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-foreground">{param.createdAt ? new Date(param.createdAt).toLocaleDateString("vi-VN") : ""}</td>
                                            <td className="px-3 py-2 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => handleEditParameter(param)}
                                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                        title={t("common.edit")}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteParameter(param.parameterId)}
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
                                    groups.map((group) => {
                                        const baseSum = (group.matrices || []).reduce((acc: number, m: any) => acc + (Number(m.feeBeforeTax) || 0), 0);
                                        const discountedSum = Math.round(baseSum * (1 - (group.discountRate || 0) / 100));

                                        return (
                                            <tr key={group.groupId} className="border-t border-border hover:bg-muted align-top">
                                                <td className="px-3 py-4 text-sm font-medium text-foreground uppercase">{group.groupName}</td>
                                                <td className="px-3 py-4 text-sm text-foreground">{group.sampleTypeName || "--"}</td>
                                                <td className="px-3 py-4 text-sm text-muted-foreground whitespace-normal">
                                                    <div className="flex flex-col gap-1.5">
                                                        {(group.matrices || []).map((m: any, i: number) => (
                                                            <div key={i} className="flex items-start gap-2">
                                                                <span className="mt-1.5 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
                                                                <span>{m.parameterName}</span>
                                                            </div>
                                                        ))}
                                                        {(group.matrices || []).length === 0 && <span className="italic">Chưa có chỉ tiêu</span>}
                                                    </div>
                                                </td>
                                                <td className="px-3 py-4 text-right text-sm font-semibold text-green-600">{group.discountRate || 0}%</td>
                                                <td className="px-3 py-4 text-right text-sm font-bold text-primary">{discountedSum > 0 ? discountedSum.toLocaleString("vi-VN") + " đ" : "--"}</td>
                                                <td className="px-3 py-4 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={() => handleEditGroup(group)}
                                                            className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                                            title={t("common.edit")}
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteParameterGroup(group.groupId)}
                                                            className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                                                            title={t("common.delete")}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    {!isLoading && (activeTab === "matrix" ? matrices.length > 0 : activeTab === "parameters" ? parameters.length > 0 : groups.length > 0) && (
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

            <MatrixModal
                isOpen={isMatrixModalOpen}
                onClose={() => setIsMatrixModalOpen(false)}
                onSuccess={() => {
                    if (activeTab === "matrix") fetchData();
                }}
                initialData={selectedMatrix}
            />

            <ParameterModal
                isOpen={isParamModalOpen}
                onClose={() => setIsParamModalOpen(false)}
                onSuccess={() => {
                    if (activeTab === "parameters") fetchData();
                }}
                initialData={selectedParameter}
            />

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
