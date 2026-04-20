import { useState, useEffect } from "react";
import { X, Search, Trash2, Layers } from "lucide-react";
import type { Matrix, ParameterGroup, SampleType } from "@/types/parameter";
import { useTranslation } from "react-i18next";
import { getMatrices, getParameterGroups, getMatrixDetail, getSampleTypes, getParameterGroupFull } from "@/api/index";
import { customerGetMatrices, customerGetParameterGroups, customerGetMatrixDetail, customerGetSampleTypes, customerGetParameterGroupFull } from "@/api/customer";

interface AnalysisModalNewProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedItems: Matrix[]) => void;
    isCustomer?: boolean; // New prop to handle customer-specific API calls
}

export function AnalysisModalNew({ isOpen, onClose, onConfirm, isCustomer = false }: AnalysisModalNewProps) {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedField, setSelectedField] = useState<string>("all");
    const [selectedMatrixIds, setSelectedMatrixIds] = useState<Set<string>>(new Set());
    const [sampleTypes, setSampleTypes] = useState<SampleType[]>([]);
    const [selectedSampleTypeNames, setSelectedSampleTypeNames] = useState<string[]>([]);
    const [stSearch, setStSearch] = useState("");
    const [isStDropdownOpen, setIsStDropdownOpen] = useState(false);
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

    // API Switcher
    const api = {
        getSampleTypes: isCustomer ? customerGetSampleTypes : getSampleTypes,
        getMatrices: isCustomer ? customerGetMatrices : getMatrices,
        getParameterGroups: isCustomer ? customerGetParameterGroups : getParameterGroups,
        getParameterGroupFull: isCustomer ? customerGetParameterGroupFull : getParameterGroupFull,
        getMatrixDetail: isCustomer ? customerGetMatrixDetail : getMatrixDetail,
    };

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [searchQuery, selectedField, selectedSampleTypeNames, mode]);

    // Fetch sample types
    useEffect(() => {
        const fetchSampleTypes = async () => {
            const res = await api.getSampleTypes({ query: { itemsPerPage: 100 } });
            if (res.success && res.data) {
                setSampleTypes(res.data as SampleType[]);
            }
        };
        fetchSampleTypes();
    }, [api.getSampleTypes]);

    // Simulated Server-Side Search
    useEffect(() => {
        const search = async () => {
            if (!isOpen) return;
            setIsSearching(true);
            try {
                if (mode === "select") {
                    const query: any = {
                        page,
                        itemsPerPage: 20,
                    };
                    if (searchQuery) query.search = searchQuery;
                    if (selectedField !== "all") query.scientificField = selectedField;
                    if (selectedSampleTypeNames.length > 0) query.sampleTypeName = selectedSampleTypeNames;

                    const response = await api.getMatrices({ query });
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
                    const response = await api.getParameterGroups({ query: { search: searchQuery, page, itemsPerPage: 20, option: "full" } });
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

        const timer = setTimeout(search, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, selectedField, selectedSampleTypeNames, isOpen, page, mode]);

    const [itemsMap, setItemsMap] = useState<Map<string, Matrix>>(new Map());
    useEffect(() => {
        if (displayedMatrix.length === 0) return;
        setItemsMap((prev) => {
            const next = new Map(prev);
            displayedMatrix.forEach((m) => next.set(m.matrixId, m));
            return next;
        });
    }, [displayedMatrix]);

    const handleToggleItem = (matrixId: string) => {
        const newSelected = new Set(selectedMatrixIds);
        if (newSelected.has(matrixId)) newSelected.delete(matrixId);
        else newSelected.add(matrixId);
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

    const handleBulkExtract = async () => {
        if (!bulkText.trim()) return;
        const keywords = bulkText
            .split(";")
            .map((k) => k.trim())
            .filter((k) => k.length > 0);
        const newRows: BulkRow[] = keywords.map((k, index) => ({
            id: `row-${Date.now()}-${index}`,
            keyword: k,
            results: [],
            selectedMatrixId: null,
            isLoading: true,
            isSelected: true,
        }));
        setBulkRows(newRows);
        newRows.forEach(async (row) => {
            const res = await api.getMatrices({ query: { search: row.keyword } });
            const results = res.success && res.data ? (res.data as Matrix[]) : [];
            setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isLoading: false, results, selectedMatrixId: results.length > 0 ? results[0].matrixId : null } : r)));
        });
    };

    const handleConfirm = async () => {
        if (mode === "select") {
            const selected: Matrix[] = [];
            selectedMatrixIds.forEach((id) => {
                const m = itemsMap.get(id);
                if (m) selected.push(m);
            });
            onConfirm(selected);
            handleClose();
        } else if (mode === "group") {
            if (!selectedGroupId) return;
            const group = displayedGroups.find((g) => g.groupId === selectedGroupId);
            if (!group) return;

            try {
                // Get full group data with matrix snapshots
                const res = await api.getParameterGroupFull({ query: { groupId: selectedGroupId } });
                if (res.success && res.data && res.data.matrices) {
                    const groupData = res.data as ParameterGroup;
                    onConfirm(
                        groupData.matrices!.map((m) => ({
                            ...m,
                            groupId: groupData.groupId,
                            discountRate: groupData.discountRate,
                        })),
                    );
                    handleClose();
                } else {
                    // Fallback to matrixIds if matrices snapshot is not returned
                    const matrixIds = group.matrixIds || [];
                    if (matrixIds.length > 0) {
                        const promises = matrixIds.map((id) => api.getMatrixDetail({ query: { matrixId: id } }));
                        const results = await Promise.all(promises);
                        const matrices = results.map((r) => (r.success ? r.data : null)).filter((m) => !!m) as Matrix[];
                        onConfirm(
                            matrices.map((m) => ({
                                ...m,
                                groupId: group.groupId,
                                discountRate: group.discountRate,
                            })),
                        );
                        handleClose();
                    }
                }
            } catch (e) {
                console.error("Error fetching full group details:", e);
            }
        } else if (mode === "bulk") {
            const selected = bulkRows.filter((r) => r.isSelected && r.selectedMatrixId).map((r) => r.results.find((m) => m.matrixId === r.selectedMatrixId)!);
            onConfirm(selected);
            handleClose();
        }
    };

    const handleClose = () => {
        setSelectedMatrixIds(new Set());
        setSearchQuery("");
        setSelectedField("all");
        setBulkText("");
        setMode("select");
        setSelectedGroupId(null);
        setSelectedSampleTypeNames([]);
        setStSearch("");
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-card rounded-lg w-full max-w-6xl min-w-[900px] h-[95vh] flex flex-col shadow-xl border border-border">
                <div className="flex items-center justify-between p-6 border-b border-border">
                    <h2 className="text-xl font-bold text-foreground">{t("parameter.selectTitle")}</h2>
                    <button onClick={handleClose} className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-3 border-b border-border">
                    <div className="flex gap-2">
                        {(["select", "group", "bulk"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => setMode(m)}
                                className={`px-4 py-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2 ${
                                    mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"
                                }`}
                            >
                                {m === "group" && <Layers className="w-4 h-4" />}
                                {t(`parameter.${m === "select" ? "selectFromList" : m === "group" ? "selectFromGroup" : "bulkInput"}`)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden p-6 flex flex-col">
                    {mode === "bulk" ? (
                        <div className="flex flex-col h-full">
                            <div className="mb-4 flex gap-2">
                                <textarea
                                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input text-sm"
                                    rows={2}
                                    value={bulkText}
                                    onChange={(e) => setBulkText(e.target.value)}
                                    placeholder={t("parameter.bulkPlaceholder")}
                                />
                                <button onClick={handleBulkExtract} className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm self-end">
                                    {t("common.search")}
                                </button>
                            </div>
                            {bulkRows.length > 0 && (
                                <div className="flex-1 overflow-auto border border-border rounded-lg">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 sticky top-0">
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={bulkRows.every((r) => r.isSelected)}
                                                        onChange={(e) => setBulkRows((prev) => prev.map((r) => ({ ...r, isSelected: e.target.checked })))}
                                                    />
                                                </th>
                                                <th className="p-3 text-left font-semibold">{t("common.keyword")}</th>
                                                <th className="p-3 text-left font-semibold">{t("common.result")}</th>
                                                <th className="p-3 text-center w-24 font-semibold">{t("common.action")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bulkRows.map((row) => (
                                                <tr key={row.id} className="border-t hover:bg-muted/30">
                                                    <td className="p-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={row.isSelected}
                                                            onChange={(e) => setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, isSelected: e.target.checked } : r)))}
                                                        />
                                                    </td>
                                                    <td className="p-3 font-medium">{row.keyword}</td>
                                                    <td className="p-3">
                                                        {row.isLoading ? (
                                                            <span className="animate-pulse">Loading...</span>
                                                        ) : (
                                                            <select
                                                                className="w-full p-1 border rounded bg-background"
                                                                value={row.selectedMatrixId || ""}
                                                                onChange={(e) => setBulkRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, selectedMatrixId: e.target.value } : r)))}
                                                            >
                                                                {row.results.length === 0 ? (
                                                                    <option value="">{t("common.noResults")}</option>
                                                                ) : (
                                                                    row.results.map((m) => (
                                                                        <option key={m.matrixId} value={m.matrixId}>
                                                                            {m.parameterName} - {m.sampleTypeName}
                                                                        </option>
                                                                    ))
                                                                )}
                                                            </select>
                                                        )}
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button
                                                            onClick={() => setBulkRows((prev) => prev.filter((r) => r.id !== row.id))}
                                                            className="text-destructive p-1 hover:bg-destructive/10 rounded"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            <div className="flex flex-col md:flex-row gap-4 mb-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="text"
                                        placeholder={t("parameter.searchPlaceholder")}
                                        className="w-full pl-10 pr-4 py-2 border rounded-lg bg-input text-sm h-10"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                                <div className="w-full md:w-80 relative">
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder={t("order.sampleMatrix") + "..."}
                                            className="w-full pl-10 pr-10 py-2 border rounded-lg bg-input text-sm h-10"
                                            value={stSearch}
                                            onChange={(e) => {
                                                setStSearch(e.target.value);
                                                setIsStDropdownOpen(true);
                                            }}
                                            onFocus={() => setIsStDropdownOpen(true)}
                                        />
                                        {stSearch && (
                                            <button onClick={() => setStSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                <X className="w-4 h-4" />
                                            </button>
                                        )}
                                        {isStDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-40" onClick={() => setIsStDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-xl z-50 max-h-60 overflow-auto p-1">
                                                    {sampleTypes
                                                        .filter((st) => st.sampleTypeName.toLowerCase().includes(stSearch.toLowerCase()))
                                                        .map((st) => (
                                                            <button
                                                                key={st.sampleTypeId}
                                                                onClick={() => {
                                                                    if (!selectedSampleTypeNames.includes(st.sampleTypeName)) setSelectedSampleTypeNames((p) => [...p, st.sampleTypeName]);
                                                                    setStSearch("");
                                                                    setIsStDropdownOpen(false);
                                                                }}
                                                                className="w-full px-3 py-2 text-left text-sm hover:bg-primary/10 rounded flex items-center justify-between"
                                                            >
                                                                <span>{st.sampleTypeName}</span>
                                                                {selectedSampleTypeNames.includes(st.sampleTypeName) && <X className="w-3 h-3 text-primary" />}
                                                            </button>
                                                        ))}
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-2 flex flex-wrap gap-1">
                                        {selectedSampleTypeNames.map((name) => (
                                            <span key={name} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded-md text-[10px] font-semibold flex items-center gap-1">
                                                {name}
                                                <button onClick={() => setSelectedSampleTypeNames((p) => p.filter((n) => n !== name))}>
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto border rounded-lg">
                                <table className="w-full text-sm">
                                    <thead className="bg-muted/50 sticky top-0 shadow-sm z-10">
                                        {mode === "select" ? (
                                            <tr>
                                                <th className="p-3 w-10">
                                                    <input
                                                        type="checkbox"
                                                        checked={displayedMatrix.length > 0 && displayedMatrix.every((m) => selectedMatrixIds.has(m.matrixId))}
                                                        onChange={(e) => {
                                                            const next = new Set(selectedMatrixIds);
                                                            displayedMatrix.forEach((m) => (e.target.checked ? next.add(m.matrixId) : next.delete(m.matrixId)));
                                                            setSelectedMatrixIds(next);
                                                        }}
                                                    />
                                                </th>
                                                <th className="p-3 text-left font-semibold">{t("order.print.parameter")}</th>
                                                <th className="p-3 text-left font-semibold">{t("order.sampleMatrix")}</th>
                                                <th className="p-3 text-left font-semibold">Phương pháp</th>
                                                <th className="p-3 text-left font-semibold">Công nhận</th>
                                                <th className="p-3 text-center w-20 font-semibold">Thuế (%)</th>
                                                <th className="p-3 text-right font-semibold">{t("parameter.unitPrice")}</th>
                                            </tr>
                                        ) : (
                                            <tr>
                                                <th className="p-3 w-10"></th>
                                                <th className="p-3 text-left font-semibold">{t("parameter.groupName")}</th>
                                                <th className="p-3 text-left font-semibold">{t("order.sampleMatrix")}</th>
                                                <th className="p-3 text-left font-semibold">{t("common.parameter")}</th>
                                                <th className="p-3 text-right font-semibold">{t("parameter.discountRate")}</th>
                                                <th className="p-3 text-right font-semibold">{t("parameter.sumAfterTax")}</th>
                                            </tr>
                                        )}
                                    </thead>
                                    <tbody>
                                        {isSearching ? (
                                            <tr>
                                                <td colSpan={mode === "group" ? 6 : 5} className="p-8 text-center text-muted-foreground italic">
                                                    Loading...
                                                </td>
                                            </tr>
                                        ) : mode === "select" ? (
                                            displayedMatrix.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-8 text-center text-muted-foreground">
                                                        {t("parameter.notFound")}
                                                    </td>
                                                </tr>
                                            ) : (
                                                displayedMatrix.map((m) => (
                                                    <tr key={m.matrixId} className="border-t hover:bg-muted/30 cursor-pointer" onClick={() => handleToggleItem(m.matrixId)}>
                                                        <td className="p-3 text-center">
                                                            <input type="checkbox" checked={selectedMatrixIds.has(m.matrixId)} readOnly />
                                                        </td>
                                                        <td className="p-3 font-medium">{m.parameterName}</td>
                                                        <td className="p-3">{m.sampleTypeName}</td>
                                                        <td className="p-3">{m.protocolCode || "--"}</td>
                                                        <td className="p-3">
                                                            {m.protocolAccreditation
                                                                ? Object.keys(m.protocolAccreditation)
                                                                      .filter((k) => m.protocolAccreditation[k])
                                                                      .join(", ") || "--"
                                                                : "--"}
                                                        </td>
                                                        <td className="p-3 text-center">{m.taxRate || 0}%</td>
                                                        <td className="p-3 text-right">{Math.round(m.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                                    </tr>
                                                ))
                                            )
                                        ) : displayedGroups.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                    {t("common.noResults")}
                                                </td>
                                            </tr>
                                        ) : (
                                            displayedGroups.map((g) => {
                                                const subTotal = (g.matrices || []).reduce((acc, m) => acc + (m.feeBeforeTax || 0), 0);
                                                const feeAfterTax = g.feeAfterTax || Math.round(subTotal * (1 - (g.discountRate || 0) / 100) * (1 + (g.taxRate || 0) / 100));

                                                return (
                                                    <tr
                                                        key={g.groupId}
                                                        className={`border-t hover:bg-muted/30 cursor-pointer ${selectedGroupId === g.groupId ? "bg-primary/5" : ""}`}
                                                        onClick={() => setSelectedGroupId(g.groupId)}
                                                    >
                                                        <td className="p-3 text-center align-top">
                                                            <input type="radio" checked={selectedGroupId === g.groupId} readOnly className="mt-1" />
                                                        </td>
                                                        <td className="p-3 font-medium align-top">{g.groupName}</td>
                                                        <td className="p-3 align-top">{g.sampleTypeName}</td>
                                                        <td className="p-3 text-sm text-muted-foreground align-top">
                                                            <div className="flex flex-col gap-1">
                                                                {g.matrices?.map((m) => (
                                                                    <div key={m.matrixId} className="whitespace-nowrap">
                                                                        • {m.parameterName}
                                                                    </div>
                                                                )) || "--"}
                                                            </div>
                                                        </td>
                                                        <td className="p-3 text-right text-green-600 font-medium align-top">{g.discountRate}%</td>
                                                        <td className="p-3 text-right font-semibold text-primary align-top">{Math.round(feeAfterTax || 0).toLocaleString("vi-VN")} đ</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                                <div>
                                    Showing {mode === "select" ? displayedMatrix.length : displayedGroups.length} / {totalItems} results (Page {page}/{totalPages})
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-muted">
                                        Prev
                                    </button>
                                    <button
                                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-2 py-1 border rounded disabled:opacity-50 hover:bg-muted"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="p-6 border-t border-border flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                        {t("parameter.selectedCount")}:{" "}
                        <span className="text-primary">
                            {mode === "bulk" ? bulkRows.filter((r) => r.isSelected && r.selectedMatrixId).length : mode === "group" ? (selectedGroupId ? 1 : 0) : selectedMatrixIds.size}
                        </span>
                    </span>
                    <div className="flex gap-3">
                        <button onClick={handleClose} className="px-4 py-2 border rounded-lg hover:bg-muted text-sm font-medium">
                            {t("parameter.cancel")}
                        </button>
                        <button onClick={handleConfirm} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 text-sm font-medium">
                            {t("common.confirm")}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
