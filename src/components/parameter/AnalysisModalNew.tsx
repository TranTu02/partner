import { useState, useEffect } from "react";
import { X, Search, Trash2, Layers } from "lucide-react";
import type { Matrix, ParameterGroup } from "@/types/parameter";
import { useTranslation } from "react-i18next";
import { getMatrices, getParameterGroups, getMatrixDetail } from "@/api/index";
import { scientificFields } from "@/data/constants";

interface AnalysisModalNewProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedItems: Matrix[]) => void;
}

export function AnalysisModalNew({ isOpen, onClose, onConfirm }: AnalysisModalNewProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedField, setSelectedField] = useState<string>("all");
    const [selectedMatrixIds, setSelectedMatrixIds] = useState<Set<string>>(new Set());
    const [bulkText, setBulkText] = useState("");
    const [mode, setMode] = useState<"select" | "bulk" | "group">("select");

    // Server-side selection results
    const [displayedMatrix, setDisplayedMatrix] = useState<Matrix[]>([]);
    const [displayedGroups, setDisplayedGroups] = useState<ParameterGroup[]>([]);
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);

    const [isSearching, setIsSearching] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalItems, setTotalItems] = useState(0);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, selectedField, mode]);

    // Simulated Server-Side Search for "Select Mode"
    useEffect(() => {
        const search = async () => {
            if (!isOpen) return; // Prevent call if closed
            setIsSearching(true);
            try {
                if (mode === "select") {
                    // Mapping UI filter to API query
                    interface SearchQuery {
                        search?: string;
                        scientificField?: string;
                        page: number;
                        itemsPerPage: number;
                    }
                    const query: SearchQuery = {
                        page,
                        itemsPerPage: 20, // Default items per page
                    };
                    if (searchQuery) {
                        query.search = searchQuery;
                    }
                    if (selectedField !== "all") {
                        query.scientificField = selectedField;
                    }

                    const response = await getMatrices({ query });

                    if (response.success && response.data) {
                        setDisplayedMatrix(response.data as Matrix[]);
                        if (response.meta) {
                            setTotalPages(response.meta.totalPages);
                            setTotalItems(response.meta.total);
                        }
                    } else {
                        setDisplayedMatrix([]);
                        setTotalPages(1);
                        setTotalItems(0);
                    }
                } else if (mode === "group") {
                    const response = await getParameterGroups({ query: { search: searchQuery, page, itemsPerPage: 20 } });
                    if (response.success && response.data) {
                        setDisplayedGroups(response.data as ParameterGroup[]);
                        if (response.meta) {
                            setTotalPages(response.meta.totalPages);
                            setTotalItems(response.meta.total);
                        }
                    } else {
                        setDisplayedGroups([]);
                        setTotalPages(1);
                        setTotalItems(0);
                    }
                }
            } catch (error) {
                console.error("Error searching", error);
                setDisplayedMatrix([]);
                setDisplayedGroups([]);
            } finally {
                setIsSearching(false);
            }
        };

        const timer = setTimeout(search, 300); // Debounce
        return () => clearTimeout(timer);
    }, [searchQuery, selectedField, isOpen, page, mode]); // Add isOpen to refresh when opened

    const handleToggleItem = (matrixId: string) => {
        const newSelected = new Set(selectedMatrixIds);
        if (newSelected.has(matrixId)) {
            newSelected.delete(matrixId);
        } else {
            newSelected.add(matrixId);
        }
        setSelectedMatrixIds(newSelected);
    };

    interface BulkRow {
        id: string;
        keyword: string;
        results: Matrix[];
        selectedMatrixId: string | null;
        isLoading: boolean;
        isSelected: boolean;
    }

    const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);

    const searchMatrixAPI = async (keyword: string): Promise<Matrix[]> => {
        if (!keyword.trim()) return [];
        try {
            const response = await getMatrices({ query: { search: keyword.trim() } });
            if (response.success && response.data) {
                return response.data as Matrix[];
            }
            return [];
        } catch (error) {
            console.error(error);
            return [];
        }
    };

    const handleBulkExtract = async () => {
        if (!bulkText.trim()) {
            alert(t("parameter.alertInput"));
            return;
        }

        const keywords = bulkText
            .split(";")
            .map((k) => k.trim())
            .filter((k) => k.length > 0);

        // Create initial rows
        const newRows: BulkRow[] = keywords.map((k, index) => ({
            id: `row-${Date.now()}-${index}`,
            keyword: k,
            results: [],
            selectedMatrixId: null,
            isLoading: true,
            isSelected: true,
        }));

        setBulkRows(newRows);
        setMode("bulk"); // Stay in bulk mode

        newRows.forEach(async (row) => {
            const results = await searchMatrixAPI(row.keyword);
            setBulkRows((prev) =>
                prev.map((r) =>
                    r.id === row.id
                        ? {
                              ...r,
                              isLoading: false,
                              results,
                              selectedMatrixId: results.length > 0 ? results[0].matrixId : null,
                          }
                        : r,
                ),
            );
        });
    };

    // Quick Fix for the internal logic of selecting items in 'Select Mode'
    const [itemsMap, setItemsMap] = useState<Map<string, Matrix>>(new Map());

    // Update itemsMap whenever displayedMatrix changes
    useEffect(() => {
        if (displayedMatrix.length === 0) return;

        setItemsMap((prev) => {
            const next = new Map(prev);
            let hasChanges = false;
            displayedMatrix.forEach((m) => {
                if (!next.has(m.matrixId)) {
                    next.set(m.matrixId, m);
                    hasChanges = true;
                }
            });
            return hasChanges ? next : prev;
        });
    }, [displayedMatrix]);

    const handleConfirm = async () => {
        if (mode === "select") {
            const selected: Matrix[] = [];
            selectedMatrixIds.forEach((id) => {
                const m = itemsMap.get(id);
                if (m) selected.push(m);
            });
            onConfirm(selected);
            handleClose();
        } else if (mode === "bulk") {
            const rowsToAdd = bulkRows.filter((r) => r.isSelected && r.selectedMatrixId);
            const selected = rowsToAdd.map((r) => r.results.find((m) => m.matrixId === r.selectedMatrixId)!);
            onConfirm(selected);
            handleClose();
        } else if (mode === "group") {
            if (!selectedGroupId) return;
            const group = displayedGroups.find((g) => g.parameterGroupId === selectedGroupId);
            if (!group) return;

            // Use matrices directly from group object if available
            if (group.matrices && group.matrices.length > 0) {
                // Attach group info
                const matricesWithGroup: Matrix[] = group.matrices.map((m) => ({
                    ...m,
                    groupId: group.parameterGroupId, // Attach group ID
                    groupDiscount: group.discountRate || (group as any).discount, // Attach group discount
                    discountRate: group.discountRate || (group as any).discount, // Use group discount as the generic discount rate
                }));

                onConfirm(matricesWithGroup);
                handleClose();
                return;
            }

            // Fallback for when matrices are not populated (should not happen based on user input, but good for safety)
            if (!group.matrixIds || group.matrixIds.length === 0) {
                onConfirm([]);
                handleClose();
                return;
            }

            try {
                const detailPromises = group.matrixIds.map((id) => getMatrixDetail({ query: { matrixId: id } }));

                const responses = await Promise.all(detailPromises);
                const matrices: Matrix[] = responses.map((r) => (r.success ? r.data : null)).filter((m): m is Matrix => !!m);

                // Attach group info
                const matricesWithGroup: Matrix[] = matrices.map((m) => ({
                    ...m,
                    groupId: group.parameterGroupId, // Attach group ID
                    groupDiscount: group.discountRate || (group as any).discount, // Attach group discount
                    discountRate: group.discountRate || (group as any).discount, // Use group discount as the generic discount rate
                }));

                onConfirm(matricesWithGroup);
                handleClose();
            } catch (e) {
                console.error("Error fetching group details", e);
            }
        }
    };

    const handleClose = () => {
        setSelectedMatrixIds(new Set());
        setSearchQuery("");
        setSelectedField("all");
        setBulkText("");
        setMode("select");
        setSelectedGroupId(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-6xl min-w-[900px] h-[95vh] min-h-[600px] flex flex-col shadow-xl border border-border">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{t("parameter.selectTitle")}</h2>
                    <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Mode Toggle */}
                <div className="p-3 border-b border-border">
                    <div className="flex gap-2 mb-4">
                        <button
                            onClick={() => setMode("select")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                mode === "select" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {t("parameter.selectFromList")}
                        </button>
                        <button
                            onClick={() => setMode("group")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                                mode === "group" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            <Layers className="w-4 h-4" />
                            {t("parameter.selectFromGroup", "Chọn theo Nhóm")}
                        </button>
                        <button
                            onClick={() => setMode("bulk")}
                            className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                mode === "bulk" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                        >
                            {t("parameter.bulkInput")}
                        </button>
                    </div>
                </div>

                {mode === "bulk" ? (
                    <div className="flex-1 overflow-hidden p-6 flex flex-col">
                        <div className="mb-4">
                            <label className="block mb-2 text-sm font-medium text-foreground">{t("parameter.bulkLabel")}</label>
                            <div className="flex gap-2">
                                <textarea
                                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                    rows={2}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={t("parameter.bulkPlaceholder")}
                                />
                                <button
                                    onClick={handleBulkExtract}
                                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium self-end"
                                >
                                    {t("common.search")}
                                </button>
                            </div>
                        </div>

                        {bulkRows.length > 0 && (
                            <div className="flex-1 overflow-auto border border-border rounded-lg">
                                <table className="w-full">
                                    <thead className="bg-muted/50 sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 text-center w-[50px]">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 accent-primary cursor-pointer"
                                                    checked={bulkRows.length > 0 && bulkRows.every((r) => r.isSelected)}
                                                    onChange={(e) => {
                                                        const checked = e.target.checked;
                                                        setBulkRows((prev) => prev.map((r) => ({ ...r, isSelected: checked })));
                                                    }}
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("common.keyword")}</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("common.result")}</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-foreground w-[100px]">{t("common.action")}</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bulkRows.map((row) => (
                                            <tr key={row.id} className="border-t border-border hover:bg-muted/50">
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-primary cursor-pointer"
                                                        checked={row.isSelected}
                                                        onChange={(e) => {
                                                            setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isSelected: e.target.checked } : r)));
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="text"
                                                        className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-background text-sm"
                                                        value={row.keyword}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, keyword: val } : r)));
                                                        }}
                                                    />
                                                </td>
                                                <td className="px-4 py-3">
                                                    {row.isLoading ? (
                                                        <span className="text-sm text-muted-foreground animate-pulse">Loading...</span>
                                                    ) : (
                                                        <select
                                                            className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-background text-sm"
                                                            value={row.selectedMatrixId || ""}
                                                            onChange={(e) => {
                                                                setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, selectedMatrixId: e.target.value } : r)));
                                                            }}
                                                        >
                                                            {row.results.length === 0 ? (
                                                                <option value="">{t("common.noResults")}</option>
                                                            ) : (
                                                                row.results.map((m) => (
                                                                    <option key={m.matrixId} value={m.matrixId}>
                                                                        {m.parameterName} - {m.sampleTypeName} - {m.protocolCode} (
                                                                        {(m.feeBeforeTax ?? Number((m as any).feeAfterTax || 0) / (1 + Number(m.taxRate || 0) / 100)).toLocaleString("vi-VN")} đ)
                                                                    </option>
                                                                ))
                                                            )}
                                                        </select>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button
                                                            onClick={async () => {
                                                                setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isLoading: true } : r)));
                                                                const results = await searchMatrixAPI(row.keyword);
                                                                setBulkRows((prev) =>
                                                                    prev.map((r) =>
                                                                        r.id === row.id
                                                                            ? {
                                                                                  ...r,
                                                                                  isLoading: false,
                                                                                  results,
                                                                                  selectedMatrixId: results.length > 0 ? results[0].matrixId : null,
                                                                              }
                                                                            : r,
                                                                    ),
                                                                );
                                                            }}
                                                            className="p-1 text-primary hover:bg-primary/10 rounded"
                                                            title={t("common.searchAgain")}
                                                        >
                                                            <Search className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setBulkRows((prev) => prev.filter((r) => r.id !== row.id))}
                                                            className="p-1 text-destructive hover:bg-destructive/10 rounded"
                                                            title={t("common.delete")}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                ) : mode === "group" ? (
                    <div className="flex-1 overflow-hidden p-6 flex flex-col">
                        <div className="mb-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t("parameter.searchGroupPlaceholder", "Search Groups...")}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto border border-border rounded-lg">
                            <table className="w-full">
                                <thead className="bg-card sticky top-0 z-10 shadow-sm">
                                    <tr className="bg-muted/50">
                                        <th className="px-4 py-3 text-center w-[50px]"></th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("parameter.groupName", "Group Name")}</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.sampleMatrix")}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("parameter.discount", "Discount")}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("parameter.total", "Total Price")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isSearching ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : displayedGroups.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-8 text-center">
                                                {t("common.noResults")}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedGroups.map((g) => (
                                            <tr
                                                key={g.parameterGroupId}
                                                className={`border-t border-border hover:bg-muted cursor-pointer ${selectedGroupId === g.parameterGroupId ? "bg-muted" : ""}`}
                                                onClick={() => setSelectedGroupId(g.parameterGroupId)}
                                            >
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="radio"
                                                        name="groupSelect"
                                                        checked={selectedGroupId === g.parameterGroupId}
                                                        onChange={() => setSelectedGroupId(g.parameterGroupId)}
                                                        className="w-4 h-4 accent-primary"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm">{g.groupName}</td>
                                                <td className="px-4 py-3 text-sm">{g.sampleTypeName}</td>
                                                <td className="px-4 py-3 text-right text-sm">{g.discountRate || (g as any).discount}%</td>
                                                <td className="px-4 py-3 text-right text-sm">{g.feeAfterTax?.toLocaleString("vi-VN")} đ</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination for Group Mode */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                {t("pagination.showing")} {displayedGroups.length} / {totalItems} {t("pagination.results")} (Page {page}/{totalPages})
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted transition-colors"
                                >
                                    {t("pagination.previous")}
                                </button>
                                <button
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted transition-colors"
                                >
                                    {t("pagination.next")}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden p-6 flex flex-col">
                        {/* Existing Select Mode UI - Filters */}
                        <div className="mb-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                <input
                                    type="text"
                                    placeholder={t("parameter.searchPlaceholder")}
                                    className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <div className="hidden gap-2">
                                <button
                                    onClick={() => setSelectedField("all")}
                                    className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                        selectedField === "all" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                    }`}
                                >
                                    {t("parameter.allFields")}
                                </button>
                                {scientificFields.map((field) => (
                                    <button
                                        key={field.value}
                                        onClick={() => setSelectedField(field.value)}
                                        className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium ${
                                            selectedField === field.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                        }`}
                                    >
                                        {field.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Existing Select Mode Table */}
                        <div className="flex-1 overflow-auto border border-border rounded-lg">
                            <table className="w-full">
                                <thead className="bg-card sticky top-0 z-10 shadow-sm">
                                    <tr className="bg-muted/50">
                                        <th className="px-4 py-3 text-center w-[50px]">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 accent-primary cursor-pointer"
                                                checked={displayedMatrix.length > 0 && displayedMatrix.every((m) => selectedMatrixIds.has(m.matrixId))}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        // Add all displayed to selection
                                                        const newSet = new Set(selectedMatrixIds);
                                                        displayedMatrix.forEach((m) => newSet.add(m.matrixId));
                                                        setSelectedMatrixIds(newSet);
                                                    } else {
                                                        // Remove all displayed from selection
                                                        const newSet = new Set(selectedMatrixIds);
                                                        displayedMatrix.forEach((m) => newSet.delete(m.matrixId));
                                                        setSelectedMatrixIds(newSet);
                                                    }
                                                }}
                                            />
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.print.parameter")}</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">{t("order.sampleMatrix")}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("parameter.unitPrice")}</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-foreground">{t("parameter.tax")}</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-foreground">{t("order.lineTotal")}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {isSearching ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : displayedMatrix.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground text-sm">
                                                {t("parameter.notFound")}
                                            </td>
                                        </tr>
                                    ) : (
                                        displayedMatrix.map((item) => (
                                            <tr key={item.matrixId} className="border-t border-border hover:bg-muted cursor-pointer" onClick={() => handleToggleItem(item.matrixId)}>
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        className="w-4 h-4 accent-primary cursor-pointer"
                                                        checked={selectedMatrixIds.has(item.matrixId)}
                                                        onChange={() => handleToggleItem(item.matrixId)}
                                                        onClick={(e) => e.stopPropagation()}
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-foreground">{item.parameterName}</td>
                                                <td className="px-4 py-3 text-sm text-foreground">{item.sampleTypeName}</td>
                                                <td className="px-4 py-3 text-right text-sm text-foreground">{(item.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                                <td className="px-4 py-3 text-center text-sm text-foreground">{item.taxRate}%</td>
                                                <td className="px-4 py-3 text-right text-sm text-foreground">
                                                    {(item.feeAfterTax ?? (item.feeBeforeTax || 0) * (1 + (item.taxRate || 0) / 100)).toLocaleString("vi-VN")} đ
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        {/* Pagination Controls */}
                        <div className="flex items-center justify-between mt-4">
                            <div className="text-sm text-muted-foreground">
                                {t("pagination.showing")} {displayedMatrix.length} / {totalItems} {t("pagination.results")} (Page {page}/{totalPages})
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                                    disabled={page === 1}
                                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted transition-colors"
                                >
                                    {t("pagination.previous", "Previous")}
                                </button>
                                <button
                                    onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
                                    disabled={page === totalPages}
                                    className="px-3 py-1 border border-border rounded text-sm disabled:opacity-50 hover:bg-muted transition-colors"
                                >
                                    {t("pagination.next", "Next")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-border">
                    <span className="text-sm text-muted-foreground">
                        {t("parameter.selectedCount")}:{" "}
                        <span className="font-semibold text-primary">
                            {mode === "bulk" ? bulkRows.filter((r) => r.isSelected && r.selectedMatrixId).length : mode === "group" ? (selectedGroupId ? 1 : 0) : selectedMatrixIds.size}
                        </span>{" "}
                        {t("common.parameter")?.toLowerCase()}
                    </span>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 border border-border rounded-lg hover:bg-muted text-foreground transition-colors text-sm font-medium">
                            {t("parameter.cancel")}
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={mode === "bulk" ? bulkRows.filter((r) => r.isSelected && r.selectedMatrixId).length === 0 : mode === "group" ? !selectedGroupId : selectedMatrixIds.size === 0}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            {mode === "group"
                                ? t("parameter.add")
                                : t("parameter.confirmAdd", { count: mode === "bulk" ? bulkRows.filter((r) => r.isSelected && r.selectedMatrixId).length : selectedMatrixIds.size })}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
