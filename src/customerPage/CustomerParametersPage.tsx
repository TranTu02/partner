import { useState, useEffect, useCallback } from "react";
import { Search } from "lucide-react";
import { customerGetMatrices, customerGetParameters } from "@/api/customer";
import { toast } from "sonner";
import { Pagination } from "@/components/common/Pagination";

export function CustomerParametersPage() {
    const [activeTab, setActiveTab] = useState<"matrix" | "parameters">("matrix");
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
            const query = { search: searchQuery || undefined, page, itemsPerPage };
            const res = activeTab === "matrix"
                ? await customerGetMatrices({ query })
                : await customerGetParameters({ query });

            if (res.success && res.data) {
                const rawData = res.data as any;
                const list = Array.isArray(rawData) ? rawData : (rawData.items || rawData.matrices || rawData.parameters || []);
                
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

    const handleTabChange = (tab: "matrix" | "parameters") => {
        setActiveTab(tab);
        setPage(1);
        setSearchQuery("");
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div>
                <h1 className="text-xl font-bold text-foreground">Danh mục chỉ tiêu</h1>
                <p className="text-sm text-muted-foreground mt-0.5">Tra cứu chỉ tiêu thử nghiệm & bảng giá dịch vụ</p>
            </div>

            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-2">
                    <button
                        onClick={() => handleTabChange("matrix")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === "matrix"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-card border border-border text-foreground hover:bg-muted/50"
                        }`}
                    >
                        Chỉ tiêu - Phương pháp
                    </button>
                    <button
                        onClick={() => handleTabChange("parameters")}
                        className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                            activeTab === "parameters"
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "bg-card border border-border text-foreground hover:bg-muted/50"
                        }`}
                    >
                        Danh mục chỉ tiêu
                    </button>
                </div>

                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                        type="text"
                        placeholder="Tìm kiếm..."
                        className="w-full pl-9 pr-4 py-2 border border-border rounded-xl bg-card text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
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
                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Chứng chỉ</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Đơn giá</th>
                                        <th className="px-4 py-2.5 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thuế</th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wide">Thành tiền</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Mã</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tên chỉ tiêu</th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Hiển thị</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr>
                                    <td colSpan={activeTab === "matrix" ? 7 : 3} className="py-12 text-center text-sm text-muted-foreground">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                                        Đang tải...
                                    </td>
                                </tr>
                            ) : data.length === 0 ? (
                                <tr>
                                    <td colSpan={activeTab === "matrix" ? 7 : 3} className="py-12 text-center text-sm text-muted-foreground">
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
                                                {item.protocolAccreditation?.VILAS997 && (
                                                    <span className="px-2 py-0.5 bg-blue-100/50 border border-blue-200 text-blue-700 rounded text-[10px] font-semibold">VILAS 997</span>
                                                )}
                                                {item.protocolAccreditation?.["107"] && (
                                                    <span className="px-2 py-0.5 bg-green-100/50 border border-green-200 text-green-700 rounded text-[10px] font-semibold">107</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-right text-foreground">{(item.feeBeforeTax || 0).toLocaleString("vi-VN")} đ</td>
                                        <td className="px-4 py-3 text-sm text-center text-foreground">{item.taxRate}%</td>
                                        <td className="px-4 py-3 text-sm text-right font-semibold text-foreground">
                                            {((item.feeAfterTax ? Number(item.feeAfterTax) : (item.feeBeforeTax || 0) * (1 + (item.taxRate || 0) / 100))).toLocaleString("vi-VN")} đ
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                data.map((item: any) => (
                                    <tr key={item.parameterId} className="border-t border-border hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-3 text-sm text-muted-foreground font-mono">{item.parameterId}</td>
                                        <td className="px-4 py-3 text-sm font-medium text-foreground">{item.parameterName}</td>
                                        <td className="px-4 py-3 text-sm text-foreground">
                                            {item.displayStyle?.default || item.displayStyle?.eng || "—"}
                                        </td>
                                    </tr>
                                ))
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
                        onItemsPerPageChange={(n) => { setItemsPerPage(n); setPage(1); }}
                    />
                )}
            </div>
        </div>
    );
}
