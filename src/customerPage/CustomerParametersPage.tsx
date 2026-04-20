import { useState, useEffect, useCallback } from "react";
import { Search, Package, FlaskConical, BookOpen } from "lucide-react";
import { customerGetMatrices, customerGetParameters, customerGetParameterGroups } from "@/api/customer";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";

type TabType = "matrix" | "parameters" | "groups";

export function CustomerParametersPage() {
    const [activeTab, setActiveTab] = useState<TabType>("matrix");
    const [data, setData] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(0);
    const [totalItems, setTotalItems] = useState(0);
    const [itemsPerPage, setItemsPerPage] = useState(20);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            let res;
            const query = { search: searchQuery || undefined, page, itemsPerPage };

            if (activeTab === "matrix") {
                res = await customerGetMatrices({ query });
            } else if (activeTab === "parameters") {
                res = await customerGetParameters({ query });
            } else {
                // groups: fetch with option=full to have matrices snapshot
                res = await customerGetParameterGroups({ query: { ...query, option: "full" } });
            }

            if (res.success && res.data) {
                const rawData = res.data as any;
                const list = Array.isArray(rawData) ? rawData : rawData.items || rawData.matrices || rawData.parameters || rawData.groups || [];
                const meta = res.meta || rawData.pagination || {};
                setData(list);
                setTotalPages(Number(meta.totalPages || rawData.totalPages || 0));
                setTotalItems(Number(meta.total || meta.totalItems || rawData.total || rawData.totalItems || 0));
            } else {
                setData([]);
                setTotalPages(0);
                setTotalItems(0);
            }
        } catch {
            toast.error("Lỗi tải dữ liệu");
        } finally {
            setIsLoading(false);
        }
    }, [activeTab, searchQuery, page, itemsPerPage]);

    useEffect(() => {
        const timer = setTimeout(() => fetchData(), 300);
        return () => clearTimeout(timer);
    }, [fetchData]);

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setPage(1);
        setSearchQuery("");
    };

    const colSpan = activeTab === "matrix" ? 7 : activeTab === "groups" ? 5 : 3;

    const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
        { id: "matrix", label: "Chỉ tiêu - Phương pháp", icon: <FlaskConical className="w-4 h-4" /> },
        { id: "parameters", label: "Danh mục chỉ tiêu", icon: <BookOpen className="w-4 h-4" /> },
        { id: "groups", label: "Gói kiểm dịch vụ", icon: <Package className="w-4 h-4" /> },
    ];

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-foreground">Danh mục chỉ tiêu</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Tra cứu chỉ tiêu thử nghiệm, bảng giá & gói kiểm dịch vụ</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2 flex-wrap">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex items-center gap-2 ${
                                activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "bg-card border border-border text-foreground hover:bg-muted/50"
                            }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-muted/50">
                            <tr>
                                {activeTab === "matrix" ? (
                                    <>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chỉ tiêu</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Loại mẫu</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Phương pháp</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Công nhận</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Đơn giá</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thuế</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thành tiền</th>
                                    </>
                                ) : activeTab === "parameters" ? (
                                    <>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tên chỉ tiêu</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hiển thị</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tên gói</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Nền mẫu</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chỉ tiêu trong gói</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Giảm (%)</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thành tiền</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={colSpan} className="py-12 text-center text-sm text-muted-foreground">
                                        Không tìm thấy dữ liệu
                                    </td>
                                </tr>
                            ) : activeTab === "matrix" ? (
                                data.map((item: any) => (
                                    <tr key={item.matrixId} className="border-t border-border hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">{item.parameterName}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{item.sampleTypeName}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{item.protocolCode}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex flex-wrap gap-1 justify-center">
                                                {item.protocolAccreditation &&
                                                    Object.entries(item.protocolAccreditation)
                                                        .filter(([, v]) => v)
                                                        .map(([k]) => (
                                                            <span key={k} className="px-2 py-0.5 bg-blue-100/50 border border-blue-200 text-blue-700 rounded text-[10px] font-semibold">
                                                                {k}
                                                            </span>
                                                        ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-foreground">{Math.ceil(item.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                        <td className="px-4 py-3 text-sm text-center text-foreground">{item.taxRate}%</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">
                                            {Math.ceil(item.feeAfterTax ? Number(item.feeAfterTax) : (item.feeBeforeTax || 0) * (1 + (Number(item.taxRate) || 0) / 100)).toLocaleString("vi-VN")} đ
                                        </td>
                                    </tr>
                                ))
                            ) : activeTab === "parameters" ? (
                                data.map((item: any) => (
                                    <tr key={item.parameterId} className="border-t border-border hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{item.parameterId}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">{item.parameterName}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">{item.displayStyle?.default || item.displayStyle?.eng || "—"}</td>
                                    </tr>
                                ))
                            ) : (
                                // Groups tab
                                data.map((g: any) => {
                                    const subTotal = (g.matrices || []).reduce((acc: number, m: any) => acc + (m.feeBeforeTax || 0), 0);
                                    const feeAfterTax = g.feeAfterTax || Math.ceil(subTotal * (1 - (g.discountRate || 0) / 100) * (1 + (g.taxRate || 0) / 100));

                                    return (
                                        <tr key={g.groupId} className="border-t border-border hover:bg-muted/30 transition-colors">
                                            <td className="px-4 py-3 text-sm font-semibold text-foreground align-top">
                                                <div className="flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-primary shrink-0" />
                                                    {g.groupName}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-foreground align-top">{g.sampleTypeName}</td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-0.5">
                                                    {(g.matrices || []).map((m: any) => (
                                                        <div key={m.matrixId} className="text-sm text-muted-foreground flex items-center gap-1.5 py-1 border-b border-border/30 last:border-0">
                                                            <span className="w-1.5 h-1.5 rounded-full bg-primary/40 shrink-0 mt-0.5" />
                                                            <div className="flex flex-col">
                                                                <span className="font-medium text-foreground">{m.parameterName}</span>
                                                                <div className="flex flex-wrap gap-1 mt-0.5">
                                                                    {m.protocolAccreditation &&
                                                                        Object.entries(m.protocolAccreditation)
                                                                            .filter(([, v]) => v)
                                                                            .map(([k]) => (
                                                                                <span
                                                                                    key={k}
                                                                                    className="px-1.5 py-0.5 bg-blue-50 text-[9px] font-bold text-blue-600 rounded-sm border border-blue-100 uppercase"
                                                                                >
                                                                                    {k}
                                                                                </span>
                                                                            ))}
                                                                </div>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground/60 ml-auto whitespace-nowrap">
                                                                {Math.ceil(m.feeBeforeTax || 0).toLocaleString("vi-VN")} đ
                                                            </span>
                                                        </div>
                                                    ))}
                                                    {(!g.matrices || g.matrices.length === 0) && <span className="text-sm text-muted-foreground/50 italic">—</span>}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right align-top">
                                                {g.discountRate > 0 ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100/60 text-green-700 border border-green-200 text-xs font-semibold">
                                                        -{g.discountRate}%
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">—</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-bold text-primary align-top">{Math.ceil(feeAfterTax).toLocaleString("vi-VN")} đ</td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {!isLoading && (totalPages > 0 || data.length > 0) && (
                    <Pagination
                        currentPage={page}
                        totalPages={totalPages}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setPage}
                        onItemsPerPageChange={(n) => {
                            setItemsPerPage(n);
                            setPage(1);
                        }}
                    />
                )}
            </div>
        </div>
    );
}
