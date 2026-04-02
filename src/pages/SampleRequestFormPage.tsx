import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { Save, Printer, HelpCircle, X, FileDown, FileText } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getOrderDetail, checkOrderUri, updateOrder, convertHtmlToPdfForm1 } from "@/api/index";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import type { Client } from "@/types/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export function SampleRequestFormPage() {
    const { t } = useTranslation();
    const {} = useAuth();
    const [params] = useSearchParams();
    const orderId = params.get("orderId") || "";
    const uri = params.get("uri");

    const editorRef = useRef<any>(null);

    const [data, setData] = useState<OrderPrintData | null>(null);
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [savedContent, setSavedContent] = useState<string>("");
    const [showGuide, setShowGuide] = useState(false); // For mobile modal
    const [showPrintConfirm, setShowPrintConfirm] = useState(false);

    // Removed isLocked logic to allow editing at all times

    // Removed URI verification effect here, combined below

    useEffect(() => {
        const run = async () => {
            if (!orderId.trim()) {
                toast.error("Thiếu orderId. Ví dụ: /orders/form/request?orderId=DH26C0011");
                return;
            }

            setLoading(true);
            try {
                let printData: OrderPrintData | null = null;
                let requestFormContent = "";

                if (uri) {
                    // Public access flow verify URI and get order data
                    const res: any = await checkOrderUri({ body: { uri, orderId } });
                    if (!res?.success || !res?.data) {
                        toast.error("Liên kết không hợp lệ hoặc đã hết hạn");
                        setData(null);
                        return; // Stop if invalid
                    }
                    // res.data is the order object
                    printData = mapOrderDetailResponseToPrintData(res.data);
                    requestFormContent = res.data.requestForm || "";
                } else {
                    // Internal access flow
                    const res: any = await getOrderDetail({ query: { orderId } });
                    if (!res?.success || !res?.data) {
                        toast.error(res?.error?.message || "Không lấy được dữ liệu order");
                        setData(null);
                        return;
                    }
                    printData = mapOrderDetailResponseToPrintData(res.data);
                }

                if (printData) {
                    setData(printData);
                    if (requestFormContent) {
                        setSavedContent(requestFormContent);
                    }
                }
            } catch (e: any) {
                console.error(e);
                toast.error(e?.message || "Lỗi khi tải dữ liệu");
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [orderId, uri]);

    useEffect(() => {
        setEditorReady(false);
    }, [data?.orderId]);

    const initialHtml = useMemo(() => {
        if (savedContent) return savedContent;
        if (!data) return "";
        return generateSampleRequestHtml(data, t);
    }, [data, t, savedContent]);

    const handleSave = async () => {
        if (!editorRef.current) return false;

        const content = editorRef.current.getContent();
        const toastId = toast.loading(t("common.saving") || "Đang lưu...");

        try {
            const res = await updateOrder({
                body: {
                    orderId,
                    requestForm: content,
                    orderUri: uri || undefined,
                    client: {
                        ...data?.client,
                        clientName: data?.clientName,
                        clientAddress: data?.clientAddress,
                        clientPhone: data?.clientPhone,
                        clientEmail: data?.clientEmail,
                        invoiceInfo: {
                            ...data?.client?.invoiceInfo,
                            taxName: data?.taxName,
                            taxCode: data?.taxCode,
                            taxAddress: data?.invoiceAddress,
                            taxEmail: data?.invoiceEmail,
                        }
                    },
                    contactPerson: {
                        ...(data as any)?.rawContactPerson,
                        contactName: data?.contactPerson,
                        contactPhone: data?.contactPhone,
                        contactId: data?.contactIdentity,
                        contactEmail: data?.contactEmail,
                    },
                    reportRecipient: {
                        receiverName: data?.reportReceiverName,
                        receiverPhone: data?.reportReceiverPhone,
                        receiverEmail: data?.reportReceiverEmail,
                        receiverAddress: data?.reportReceiverAddress,
                    },
                    samples: (data?.samples || []).map((s: any, idx: number) => ({
                        ...(data as any)?.rawSamples?.[idx],
                        sampleName: s.sampleName,
                        sampleDesc: s.sampleDesc,
                        analyses: (s.analyses || []).map((a: any, aidx: number) => ({
                            ...(data as any)?.rawSamples?.[idx]?.analyses?.[aidx],
                            protocolCode: a.protocolCode,
                            analysisUnit: a.analysisUnit,
                        }))
                    }))
                },
            });

            if (res.success) {
                toast.success(t("common.saveSuccess") || "Lưu thành công", { id: toastId });
                setSavedContent(content);
                return true;
            } else {
                toast.error(res.error?.message || "Lỗi khi lưu", { id: toastId });
                return false;
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi lưu", { id: toastId });
            return false;
        }
    };

    const handlePrint = () => {
        if (!editorRef.current) return;

        const currentContent = editorRef.current.getContent();
        // Check if content has changed relative to the last saved content
        if (currentContent !== savedContent) {
            setShowPrintConfirm(true);
        } else {
            editorRef.current.execCommand("mcePrint");
        }
    };

    const handleExportPdf = async () => {
        if (!editorRef.current) return;
        const toastId = toast.loading("Đang xuất file PDF...");

        try {
            const content = editorRef.current.getContent();
            const blob = await convertHtmlToPdfForm1({
                body: {
                    requestForm: content,
                    orderId: orderId,
                },
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `request-form-${orderId || "export"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Xuất PDF thành công", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error("Lỗi khi xuất PDF", { id: toastId });
        }
    };

    const confirmPrint = async (shouldSave: boolean) => {
        setShowPrintConfirm(false);
        if (shouldSave) {
            const success = await handleSave();
            if (success && editorRef.current) {
                editorRef.current.execCommand("mcePrint");
            }
        } else {
            if (editorRef.current) {
                editorRef.current.execCommand("mcePrint");
            }
        }
    };

    const updateTopLevelData = (field: string, value: string) => {
        if (!data) return;
        const newData = { ...data, [field]: value };
        setData(newData);
        
        if (editorRef.current) {
            const html = generateSampleRequestHtml(newData, t);
            editorRef.current.setContent(html);
        }
    };

    const updateSampleData = (sampleIndex: number, field: string, value: string) => {
        if (!data) return;
        const newSamples = [...data.samples];
        newSamples[sampleIndex] = { ...newSamples[sampleIndex], [field]: value };
        const newData = { ...data, samples: newSamples };
        setData(newData);
        
        if (editorRef.current) {
            const html = generateSampleRequestHtml(newData, t);
            editorRef.current.setContent(html);
        }
    };

    const updateAnalysisData = (sampleIndex: number, analysisIndex: number, field: string, value: string) => {
        if (!data) return;
        const newSamples = [...data.samples];
        const newAnalyses = [...newSamples[sampleIndex].analyses];
        newAnalyses[analysisIndex] = { ...newAnalyses[analysisIndex], [field]: value };
        newSamples[sampleIndex] = { ...newSamples[sampleIndex], analyses: newAnalyses };
        const newData = { ...data, samples: newSamples };
        setData(newData);
        
        if (editorRef.current) {
            const html = generateSampleRequestHtml(newData, t);
            editorRef.current.setContent(html);
        }
    };

    const [isTinyMCELocked, setIsTinyMCELocked] = useState(true);

    return (
        <div className="h-screen flex flex-col bg-background">
            <div className="h-14 border-b border-border flex items-center justify-between px-3 md:px-4 bg-card shrink-0 z-20">
                <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex flex-col overflow-hidden">
                        <div className="text-base sm:text-lg font-semibold truncate">{t("sampleRequest.header")}</div>
                        <div className="text-xs text-muted-foreground truncate">{orderId ? `Order ID: ${orderId}` : "/orders/form/request?orderId=..."}</div>
                    </div>
                </div>

                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={() => {
                            setIsTinyMCELocked(!isTinyMCELocked);
                            if (editorRef.current) {
                                editorRef.current.mode.set(isTinyMCELocked ? "design" : "readonly");
                                toast.success(isTinyMCELocked ? "Đã mở khóa chỉnh sửa" : "Đã khóa chỉnh sửa");
                            }
                        }}
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors shadow-sm bg-gray-100 text-gray-700 hover:bg-gray-200 border border-border"
                        title="Khóa/Mở khóa"
                    >
                        {isTinyMCELocked ? <span className="text-sm font-medium">Mở khóa sửa</span> : <span className="text-sm font-medium">Khóa mẫu</span>}
                    </button>

                    <button
                        onClick={handleExportPdf}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-sm"
                        title="Xuất PDF"
                    >
                        <FileDown className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">PDF</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="flex items-center gap-2 px-3 py-2 rounded-md transition-colors shadow-sm bg-secondary text-secondary-foreground hover:bg-secondary/90 border border-border"
                        title={t("common.save") || "Lưu"}
                    >
                        <Save className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">{t("common.save") || "Lưu"}</span>
                    </button>

                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                        title={t("common.print") || "In"}
                    >
                        <Printer className="w-4 h-4" />
                        <span className="text-sm font-medium hidden sm:inline">{t("common.print") || "In"}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden flex bg-gray-100/50 relative">
                {/* Mobile Guide Button */}
                <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="fixed bottom-6 right-4 z-50 xl:hidden bg-primary text-primary-foreground p-3 rounded-full shadow-lg hover:bg-primary/90 transition-all"
                    title="Hướng dẫn"
                >
                    <HelpCircle className="w-6 h-6" />
                </button>

                {/* Left Form Panel */}
                {data && (
                    <div className="hidden lg:flex w-[480px] flex-col bg-white border-r border-border h-full overflow-hidden shrink-0 shadow-sm">
                        <div className="px-5 py-4 border-b border-border bg-gray-50/80">
                            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" />
                                Thông tin phiếu gửi mẫu
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">Sửa trực tiếp thông tin ở đây sẽ cập nhật vào bản xem trước</p>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 scroll-smooth space-y-6">
                            {/* Section 1: Thông tin cơ bản */}
                            <div className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                <div className="absolute top-0 left-0 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                    Thông tin cơ bản
                                </div>
                                <div className="space-y-3 mt-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Tên khách hàng *</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.clientName || ""}
                                                onChange={(e) => updateTopLevelData("clientName", e.target.value)} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Mã số thuế</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.taxCode || ""}
                                                onChange={(e) => updateTopLevelData("taxCode", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Địa chỉ *</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.clientAddress || ""}
                                                onChange={(e) => updateTopLevelData("clientAddress", e.target.value)} />
                                        </div>
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Số điện thoại</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.clientPhone || ""}
                                                onChange={(e) => updateTopLevelData("clientPhone", e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Email</label>
                                        <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                            value={data.clientEmail || ""}
                                            onChange={(e) => updateTopLevelData("clientEmail", e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Thông tin liên hệ */}
                            <div className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                <div className="absolute top-0 left-0 bg-green-100 text-green-700 px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                    Thông tin liên hệ
                                </div>
                                <div className="space-y-3 mt-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Người liên hệ *</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.contactPerson || ""}
                                                onChange={(e) => updateTopLevelData("contactPerson", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Căn cước công dân</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.contactIdentity || ""}
                                                onChange={(e) => updateTopLevelData("contactIdentity", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Số điện thoại liên hệ *</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.contactPhone || ""}
                                                onChange={(e) => updateTopLevelData("contactPhone", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Email liên hệ</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.contactEmail || ""}
                                                onChange={(e) => updateTopLevelData("contactEmail", e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 3: Người nhận báo cáo */}
                            <div className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                <div className="absolute top-0 left-0 bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                    Người nhận báo cáo
                                </div>
                                <div className="space-y-3 mt-1">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Tên người nhận</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.reportReceiverName || ""}
                                                onChange={(e) => updateTopLevelData("reportReceiverName", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">SĐT người nhận</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.reportReceiverPhone || ""}
                                                onChange={(e) => updateTopLevelData("reportReceiverPhone", e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Email người nhận</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.reportReceiverEmail || data.reportEmail || ""}
                                                onChange={(e) => updateTopLevelData("reportReceiverEmail", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Địa chỉ nhận</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.reportReceiverAddress || ""}
                                                onChange={(e) => updateTopLevelData("reportReceiverAddress", e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 4: Thông tin hóa đơn */}
                            <div className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                <div className="absolute top-0 left-0 bg-purple-100 text-purple-700 px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                    Thông tin hóa đơn
                                </div>
                                <div className="space-y-3 mt-1">
                                    <div>
                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Tên công ty (HĐ)</label>
                                        <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                            value={data.taxName || ""}
                                            onChange={(e) => updateTopLevelData("taxName", e.target.value)} />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Mã số thuế</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.taxCode || ""}
                                                onChange={(e) => updateTopLevelData("taxCode", e.target.value)} />
                                        </div>
                                        <div>
                                            <label className="block mb-1 text-[11px) font-medium text-muted-foreground">Địa chỉ (HĐ)</label>
                                            <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                                value={data.invoiceAddress || ""}
                                                onChange={(e) => updateTopLevelData("invoiceAddress", e.target.value)} />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">Email nhận hóa đơn</label>
                                        <input type="text" className="w-full px-2 py-1.5 border border-border rounded focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-xs"
                                            value={data.invoiceEmail || ""}
                                            onChange={(e) => updateTopLevelData("invoiceEmail", e.target.value)} />
                                    </div>
                                </div>
                            </div>

                            {/* Attached Documents Section (Auxiliary) */}
                            <div className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                <div className="absolute top-0 left-0 bg-gray-100 text-gray-700 px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                    Tài liệu đính kèm
                                </div>
                                <div className="mt-1">
                                    <label className="block mb-1.5 text-xs font-medium text-muted-foreground">Tài liệu đi kèm</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-1.5 border border-border rounded-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm transition-shadow"
                                        value={data.attachedDocuments || ""}
                                        onChange={(e) => updateTopLevelData("attachedDocuments", e.target.value)}
                                        placeholder="Ghi chú về tài liệu đính kèm hỗ trợ in..."
                                    />
                                </div>
                            </div>

                            {/* Samples Section */}
                            {data.samples.map((sample, sampleIdx) => (
                                <div key={sampleIdx} className="bg-card rounded-lg border border-border p-4 shadow-sm relative pt-5">
                                    <div className="absolute top-0 left-0 bg-primary/10 text-primary px-2 py-0.5 rounded-br-lg text-[10px] font-bold uppercase tracking-wider">
                                        Mẫu {sampleIdx + 1}
                                    </div>
                                    <div className="font-semibold text-sm mb-3 mt-1 text-foreground border-b pb-2">{sample.sampleName}</div>
                                    <div className="mb-4">
                                        <label className="block mb-1.5 text-xs font-medium text-muted-foreground">{t("sampleRequest.table.sampleDesc", "Mô tả mẫu")}</label>
                                        <input
                                            type="text"
                                            className="w-full px-3 py-1.5 border border-border rounded-md focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm transition-shadow"
                                            value={sample.sampleDesc || ""}
                                            onChange={(e) => updateSampleData(sampleIdx, "sampleDesc", e.target.value)}
                                            placeholder="Ghi chú thêm về mẫu này..."
                                        />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                            Danh sách chỉ tiêu ({sample.analyses?.length || 0})
                                        </div>
                                        {sample.analyses.map((analysis: any, analysisIdx: number) => (
                                            <div key={analysisIdx} className="p-3 bg-muted/30 rounded-md border border-border/50">
                                                <div className="flex gap-3 items-end">
                                                    <div className="flex-1">
                                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">
                                                            Chỉ tiêu
                                                        </label>
                                                        <input value={analysis.parameterName} disabled className="w-full px-2 py-1 border border-border rounded bg-gray-100 text-foreground text-xs truncate" />
                                                    </div>
                                                    <div className="w-[120px]">
                                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">
                                                            {t("table.method", "Phương pháp")}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-white text-xs"
                                                            value={analysis.protocolCode || ""}
                                                            onChange={(e) => updateAnalysisData(sampleIdx, analysisIdx, "protocolCode", e.target.value)}
                                                            placeholder="Theo IRDOP"
                                                        />
                                                    </div>
                                                    <div className="w-[80px]">
                                                        <label className="block mb-1 text-[11px] font-medium text-muted-foreground">
                                                            {t("order.print.unit", "Đơn vị")}
                                                        </label>
                                                        <input
                                                            type="text"
                                                            className="w-full px-2 py-1 border border-border rounded focus:border-primary focus:outline-none bg-white text-xs"
                                                            value={analysis.analysisUnit || ""}
                                                            onChange={(e) => updateAnalysisData(sampleIdx, analysisIdx, "analysisUnit", e.target.value)}
                                                            placeholder="Đơn vị"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Main Content Area */}
                <div className="flex-1 overflow-auto h-full scroll-smooth p-4 md:p-8">
                    {loading && <div className="p-4 text-center">{t("common.loading")}</div>}

                    {data && (
                        <div className="relative w-full max-w-[1200px] mx-auto flex flex-col items-center">
                            {/* Toolbar container - full width */}
                            <div className="w-full bg-white shadow-lg rounded-t-lg hidden" id="tinymce-toolbar-container"></div>

                            {/* Editor container - A4 width centered */}
                            <div className="w-[794px] min-w-[794px] mx-auto bg-white shadow-lg">
                                {!editorReady && <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">{t("common.loading")}</div>}

                                <div
                                    style={{
                                        visibility: editorReady ? "visible" : "hidden",
                                        height: "100%",
                                    }}
                                >
                                    <Editor
                                        key={data.orderId}
                                        disabled={false} // Always editable
                                        tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                                        onInit={(_evt: any, editor: any) => {
                                            editorRef.current = editor;
                                            editor.mode.set(isTinyMCELocked ? "readonly" : "design");
                                            setEditorReady(true);
                                        }}
                                        initialValue={initialHtml}
                                        init={{
                                            width: "100%",
                                            menubar: false,
                                            statusbar: false,
                                            plugins: "table lists code print noneditable autoresize",
                                            toolbar:
                                                "bold italic | alignleft aligncenter alignright | table tablemergecells tablesplitcells | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol | code print",
                                            toolbar_mode: "wrap",
                                            paste_as_text: true,
                                            paste_preprocess: (_plugin: any, args: any) => {
                                                // Remove any remaining HTML tags and keep only text
                                                args.content = args.content.replace(/<[^>]*>/g, "");
                                            },
                                            noneditable_noneditable_class: "mceNonEditable",
                                            noneditable_editable_class: "mceEditable",
                                            visual: false,
                                            visual_table_manager: false,
                                            table_resize_bars: false,
                                            body_class: "notranslate",
                                            min_height: 1123,
                                            autoresize_bottom_margin: 0,
                                            setup: (editor: any) => {
                                                editor.on("Init", () => {
                                                    editor.getBody().setAttribute("translate", "no");
                                                    editor.getBody().setAttribute("spellcheck", "false");
                                                    editor.getBody().setAttribute("data-gramm", "false");
                                                });
                                            },
                                            content_style: `
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                html { 
                                    overflow-y: hidden; /* Let iframe grow */
                                }
                                body { 
                                    width: 100%;
                                    margin: 0 auto !important; 
                                    padding: 5mm !important; 
                                    background-color: white; 
                                    font-size: 13px;
                                    line-height: 1.3;
                                }
                                table[data-mce-selected="1"] {
                                    outline: none !important;
                                    box-shadow: none !important;
                                }
                                .mce-resizehandle {
                                    display: none !important;
                                }   
                                .mceNonEditable { color: #64748b; }
                                 .mceEditable { border-bottom: 1px dotted #64748b !important; padding-bottom: 2px !important; line-height: 1.6 !important; }
                                table { width: 100% !important; border-collapse: collapse; margin-bottom: 10px; }
                                table:not(.layout-table) th, table:not(.layout-table) td { border: 1px solid black !important; padding: 4px !important; vertical-align: top; }
                                
                                /* Hide TinyMCE visual aids */
                                .mce-visual-caret, .mce-visual-guide { display: none !important; }
                                table[border="0"], table[style*="border: none"], table[style*="border:none"] { border: 0 !important; }
                                table[border="0"] td, table[style*="border: none"] td { border: 0 !important; }
                                
                                .layout-table td, .layout-table th { border: none !important; vertical-align: top !important; }
                                
                                html { background-color: #f0f0f0; display: flex; justify-content: center; }
                                @media print {
                                    body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                    html { background: none; display: block; }
                                    @page { size: A4 portrait !important; margin: 8mm !important; }
                                    .mceEditable { border-bottom: none !important; }
                                    .mceNonEditable { color: inherit; }
                                }
                            `,
                                        }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Side Guide Panel (Desktop) */}
                <div className="hidden xl:block w-80 bg-white border-l border-border p-6 overflow-y-auto h-full shrink-0">
                    <GuidePanelContent />
                </div>

                {/* Mobile Guide Modal */}
                {showGuide && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center xl:hidden p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowGuide(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 animate-in fade-in zoom-in duration-200">
                            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
                                <X className="w-5 h-5" />
                            </button>
                            <GuidePanelContent />
                        </div>
                    </div>
                )}

                {/* Print Confirmation Modal */}
                {showPrintConfirm && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPrintConfirm(false)} />
                        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
                            <h3 className="text-lg font-semibold mb-4">{t("common.unsavedChanges")}</h3>
                            <p className="text-sm text-muted-foreground mb-6">{t("common.unsavedChangesMessage")}</p>
                            <div className="flex justify-end gap-3">
                                <button onClick={() => confirmPrint(false)} className="px-4 py-2 rounded-md border border-border text-sm font-medium hover:bg-gray-50 transition-colors">
                                    {t("common.printWithoutSaving")}
                                </button>
                                <button
                                    onClick={() => confirmPrint(true)}
                                    className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                                >
                                    {t("common.saveAndPrint")}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .tox-tinymce {
                    border-radius: 0 !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
}

function mapOrderDetailResponseToPrintData(resp: any): OrderPrintData {
    const order = resp?.data ?? resp;
    const client: Client | null = order?.client ?? null;

    const cp = order?.contactPerson;
    const isCpObj = cp && typeof cp === "object";

    const contactPerson = isCpObj ? cp.contactName || "" : typeof cp === "string" ? cp : "";
    const contactPhone = isCpObj ? cp.contactPhone || "" : "";
    const contactIdentity = isCpObj ? cp.contactId || "" : "";
    const contactEmail = isCpObj ? cp.contactEmail || "" : "";
    const contactAddress = isCpObj ? cp.contactAddress || "" : "";
    const contactPosition = isCpObj ? cp.contactPosition || "" : "";

    const receiver = order?.reportRecipient;
    const isRecObj = receiver && typeof receiver === "object";

    const reportReceiverName = isRecObj ? receiver.receiverName || "" : "";
    const reportReceiverPhone = isRecObj ? receiver.receiverPhone || "" : "";
    const reportReceiverEmail = isRecObj ? receiver.receiverEmail || "" : "";
    const reportReceiverAddress = isRecObj ? receiver.receiverAddress || "" : "";

    const invoice = client?.invoiceInfo;

    return {
        orderId: String(order?.orderId ?? order?.id ?? ""),
        client,

        contactPerson,
        contactPhone,
        contactIdentity,
        reportEmail: contactEmail,

        contactEmail,
        contactPosition,
        contactAddress,

        clientName: client?.clientName ?? "",
        clientAddress: client?.clientAddress ?? "",
        clientPhone: client?.clientPhone ?? "",
        clientEmail: client?.clientEmail ?? "",

        reportReceiverName,
        reportReceiverPhone,
        reportReceiverEmail,
        reportReceiverAddress,

        taxName: invoice?.taxName ?? client?.clientName ?? "",
        taxCode: invoice?.taxCode ?? client?.legalId ?? "",
        invoiceAddress: invoice?.taxAddress ?? client?.clientAddress ?? "",
        invoiceEmail: invoice?.taxEmail ?? client?.clientEmail ?? "",

        attachedDocuments: "",

        samples: (order?.samples ?? []).map((s: any) => ({
            sampleName: s?.sampleName ?? "",
            sampleMatrix: s?.sampleMatrix ?? "",
            sampleNote: s?.sampleNote ?? "",
            sampleDesc: s?.sampleDesc ?? "",
            analyses: (s?.analyses ?? []).map((a: any) => ({
                parameterName: a?.parameterName ?? "",
                parameterId: a?.parameterId ?? undefined,
                feeBeforeTax: Number(a?.feeBeforeTax ?? 0),
                taxRate: Number(a?.taxRate ?? 0),
                feeAfterTax: Number(a?.feeAfterTax ?? 0),
                analysisUnit: a?.analysisUnit ?? undefined,
                protocolCode: a?.protocolCode ?? undefined,
            })),
        })),

        pricing: {
            subtotal: Number(order?.totalFeeBeforeTax ?? 0),
            discountAmount: Number(order?.totalDiscountValue ?? 0),
            feeBeforeTax: Number(order?.totalFeeBeforeTaxAndDiscount ?? 0),
            tax: Number(order?.totalTaxValue ?? 0),
            total: Number(order?.totalAmount ?? 0),
        },

        discountRate: Number(order?.discountRate ?? 0),
        
        // Keep raw objects for updating correctly back to server
        rawClient: client,
        rawContactPerson: order?.contactPerson,
        rawReportRecipient: order?.reportRecipient,
        rawSamples: order?.samples
    };
}

function generateSampleRequestHtml(data: OrderPrintData, t: any) {
    const rulesItems = t("sampleRequest.rules.items", {
        returnObjects: true,
    }) as string[];
    const rulesListHtml = Array.isArray(rulesItems)
        ? rulesItems
              .map(
                  (text, index) => `
        <div style="display: flex; align-items: flex-start; margin-bottom: 6px;">
            <div style="min-width: 26px; font-weight: 700;">${index + 1}.</div>
            <div style="text-align: justify;">${text}</div>
        </div>
    `,
              )
              .join("")
        : "";

    const samplesHtml = data.samples
        .map((sample, sampleIdx) => {
            const analyses = sample.analyses && sample.analyses.length > 0 ? sample.analyses : [{ parameterName: "", protocolCode: "", id: "dummy" }];

            const rowCount = analyses.length;

            const rowsHtml = analyses
                .map((analysis: any, index: number) => {
                    const isFirst = index === 0;

                    const sttCell = isFirst
                        ? `<td rowspan="${rowCount}" style="text-align:center; padding:5px; border: 1px solid #000 !important; vertical-align: top !important;">${sampleIdx + 1}</td>`
                        : "";

                    const sampleCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:top !important;">
                <div style="margin-bottom:2px;"><span style="font-weight:300;">${t("sampleRequest.sampleInfo.sampleName")}</span><strong>:</strong> <span style="font-weight:700;">${sample.sampleName || ""}</span></div>
                <div style="font-size:13px; line-height:1.2;">
                  <div><span style="font-weight:300;">${t("sampleRequest.sampleInfo.lotNo")}</span><strong>:</strong></div>
                  <div><span style="font-weight:300;">${t("sampleRequest.sampleInfo.mfgDate")}</span><strong>:</strong></div>
                  <div><span style="font-weight:300;">${t("sampleRequest.sampleInfo.expDate")}</span><strong>:</strong></div>
                  <div><span style="font-weight:300;">${t("sampleRequest.sampleInfo.placeOfOrigin")}</span><strong>:</strong></div>
                </div>
              </td>
            `
                        : "";

                    const descCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:middle !important; text-align: center;">
             ${sample.sampleDesc || ""}
              </td>
            `
                        : "";

                    const allMethodsEmpty = analyses.every((a: any) => !a.protocolCode || (a.protocolCode || "").trim() === "");

                    // Method and Note columns
                    let methodCell = "";
                    if (allMethodsEmpty) {
                        methodCell = isFirst
                            ? `<td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important; vertical-align:top !important;">Đã thống nhất phương pháp kiểm nghiệm với Irdop</td>`
                            : "";
                    } else {
                        methodCell = `<td style="padding:5px; border: 1px solid #000 !important; vertical-align:top !important;">${analysis.protocolCode || ""}</td>`;
                    }

                    const noteCell = isFirst ? `<td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important; vertical-align:top !important;"></td>` : "";

                    return `
          <tr>
            ${sttCell}
            ${sampleCell}
            ${descCell}
            <td style="padding:5px; border: 1px solid #000 !important;">${analysis.parameterName || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: center;">${analysis.analysisUnit || ""}</td>
            ${methodCell}
            ${noteCell}
          </tr>
        `;
                })
                .join("");

            const groupClass = sampleIdx === 0 ? "sample-group first-sample-group" : "sample-group";

            return `<tbody class="${groupClass}">${rowsHtml}</tbody>`;
        })
        .join("");

    const headerHtml = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <!-- Left: logo + info -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px; flex: 1;">
          <img
            src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg"
            style="height:28px; width:auto; object-fit:contain;"
            draggable="false"
          />
          <div style="font-size:10.5px; line-height:1.3; color:#0f172a; text-align:left; align-self: center;">
            <div style="font-weight:700;">
              ${t("sampleRequest.institute.name")}
            </div>
            <div>
              ${t("sampleRequest.institute.address")} - ${t("sampleRequest.institute.tel")}   -   ${t("sampleRequest.institute.email")}
            </div>
          </div>
          <div style="flex:1;">
            <div style="text-align:right; font-size:9px; font-weight:700; white-space:nowrap; text-transform:uppercase;">
              ${t("sampleRequest.title")}
            </div>
            <div style="text-align:right; font-size:9px; font-weight:700; margin-top:2px;">
               ${data.orderId}
            </div>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #cbd5e1; margin-top:10px; margin-bottom: 0px;"></div>
  `;

    const bodyHtml = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 6px;">
      <div style="flex:1;"></div>

      <div style="width:100%; margin-bottom: 12px;">
       <div style="text-align:center; font-size:20px; font-weight:700; white-space:nowrap; text-transform:uppercase;">
         ${t("sampleRequest.title")}
       </div>
       <div style="text-align:right; font-size:14px; font-weight:700; margin-top:4px;">
         ${t("sampleRequest.order")} ${data.orderId}
       </div>
     </div>
      </div>

      <div class="section">
        <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">
            ${t("sampleRequest.section1.title")}
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 6px 0 2px;">
            ${t("sampleRequest.section1.title2")}
        </div>
        <div style="font-size: 12px; font-style: italic; margin: 0 0 8px;">
            ${t("sampleRequest.section1.subtitle")}
        </div>

        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">  ${t("sampleRequest.clientName")}</span>
            <span class="field-dotted" style="flex-grow: 1; font-weight: 700;">${data.clientName || data.client?.clientName || ""}</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">${t("sampleRequest.address")}</span>
            <span class="field-dotted" style="flex-grow: 1; font-weight: 700;">${data.clientAddress || ""}</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
            ${t("sampleRequest.section2.title")}
        </div>
        
        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section2.contactPerson")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPerson || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.identity")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactIdentity || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email")}</td>
                 <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
        ${t("sampleRequest.section3.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
             <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address")}</td>
                <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.clientAddress || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
        ${t("sampleRequest.section4.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
            <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section4.taxName")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxName || data.client?.invoiceInfo?.taxName || ""}</td>
            </tr>
           <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.invoiceAddress || data.client?.invoiceInfo?.taxAddress || (data.client as any)?.invoiceAddress || ""}</td>
            </tr>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.taxId")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxCode || data.client?.legalId || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.invoiceEmail || data.client?.invoiceInfo?.taxEmail || (data.client as any)?.invoiceEmail || ""}</td>
            </tr>
        </table>
        <table>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 120px; font-weight: 700;">${t("sampleRequest.section5.title")}</td>
                <td style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;"></td>
            </tr>
        </table>
      </div>


      <div class="section">
        <div style="font-size: 13px; margin-top: 8px;">
        ${t("sampleRequest.section4.request")}
        </div>
        <table class="content-table" style="width: 100%; border-collapse: collapse; border: none; margin: 10px 0; table-layout: fixed;">
          <thead>
            <tr>
              <th style="border: 1px solid #1e293b; padding: 8px 8px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 40px;">
                ${t("table.stt")}
              </th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 175px;">
                ${t("sample.name")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 90px;">
                ${t("sampleRequest.table.sampleDesc")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 55px;">
                Đơn vị</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 115px;">
                ${t("table.method")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 60px;">
                ${t("sample.note")}</th>
            </tr>
          </thead>
          ${samplesHtml}
        </table>

        ${
            data.attachedDocuments
                ? `
        <div style="font-size: 13px; font-weight: 700; margin: 10px 0;">
             Tài liệu đính kèm: <span style="font-weight: 400; font-style: italic;">${data.attachedDocuments}</span>
        </div>
        `
                : ""
        }

        <div style="font-size: 12px; font-style: italic;">
        ${t("sampleRequest.section4.quote")}</div>

       <div class="section sign-block" style="margin-top:15px; page-break-inside: avoid; break-inside: avoid;">
        <!-- Cột Khách Hàng (Nằm trên) -->
        <div style="width:100%; display:flex; justify-content:center; margin-bottom: 50px;">
             <div style="width:80%; text-align:center;">
                <div class="sign-title" style="font-weight: 700; font-size: 14px;">${t("sampleRequest.signer.customer")}</div>
                <div class="sign-confirm" style="margin-top:4px; font-style:italic; font-size:12px;">${t("sampleRequest.signer.confirm")}</div>
                <div class="sign-confirm" style="margin-top:2px; font-size: 12px;">${t("sampleRequest.signer.signNote")}</div>
                <div class="sign-space" style="height:100px;"></div>
             </div>
        </div>

        <!-- Cột IRDOP (Nằm dưới) -->
        <table style="width:100%; border:1px solid #000; border-collapse:collapse;">
          <tr>
            <td style="width:55%; vertical-align:top; text-align:left; padding:8px; border-right:1px solid #000 !important; border-bottom:0 !important;">
              <div style="font-size:13px; font-weight:700; text-transform:uppercase; margin-bottom:6px;">
                ${t("sampleRequest.signer.receiptTitle")} - <span style="font-weight:700; text-transform:none;">${t("sampleRequest.signer.labOnly")}</span>
              </div>
              <div style="font-size:13px; line-height:1.5;">
                <div>${t("sampleRequest.signer.receivedDate")} ..................................................</div>
                <div>${t("sampleRequest.signer.receivedLocation")} &#9633; ${t("sampleRequest.signer.atInstitute")}</div>
                <div>&#9633; ${t("sampleRequest.signer.other")} ....................................................................</div>
                <div>${t("sampleRequest.signer.retention")} &#9633; ${t("sampleRequest.signer.noRetention")}&nbsp;&nbsp;&nbsp;&nbsp;&#9633; ${t("sampleRequest.signer.retainSample")}</div>
              </div>
            </td>
             <td style="vertical-align:top; text-align:center; padding:8px; border-bottom:0 !important;">
              <div style="font-size:13px; font-weight:700; text-transform:uppercase; margin-bottom:6px;">
                ${t("sampleRequest.signer.receiver")}
              </div>
               <div style="height:80px;"></div>
            </td>
          </tr>
        </table>
       </div>


       <div class="rules-section" style="page-break-before: always; break-before: page;">
         <div style="text-align:center; font-weight:700; font-size:15px; text-transform:uppercase; margin-bottom:4px;">
           ${t("sampleRequest.rules.header.title")}
         </div>
         <div style="text-align:center; font-style:italic; font-size:14px; margin-bottom:10px;">
           ${t("sampleRequest.rules.header.attached")}<br/>
           ${t("sampleRequest.rules.header.archived")}
         </div>
         <div class="rules-list" style="font-size:14px; line-height:1.3;">
            ${rulesListHtml}
         </div>
          <div style="margin-top:16px; font-size:14px; line-height:1.3;">
            <div style="font-weight:700; margin-bottom:4px;">
              ${t("sampleRequest.rules.contact.title")}
            </div>
            <div style="font-weight:700;">
              ${t("sampleRequest.rules.contact.orgName")}
            </div>
            <div>${t("sampleRequest.rules.contact.address")}</div>
            <div>${t("sampleRequest.rules.contact.phone")}</div>
            <div>${t("sampleRequest.rules.contact.email")}</div>
          </div>
       </div>
    `;

    return `
    <div style="font-family: 'Reddit Mono', monospace !important; color: #1e293b; max-width: 794px; margin: 0 auto; position: relative;">
       <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Reddit+Mono:wght@200..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet">
    <style>
        /* Global Font Settings */
        body, div, table, td, th, span {
            font-family: "Reddit Mono", monospace !important;
            font-weight: 300;
            line-height: 1.3;
        }
        b, strong, th, .bold, .font-weight-bold {
            font-weight: 700 !important;
        }

        .layout-table, .layout-table th, .layout-table td { border: none; border-collapse: collapse; }
        .field-dotted {
          border-bottom: 1px dotted #64748b !important;
          padding-bottom: 2px !important;
          line-height: 1.4 !important;
          display: inline-block;
          min-width: 50px;
          font-weight: 700 !important;
        }
        .section { margin-bottom: 25px; }
        .label-text { color: #64748b; font-weight: 300 !important; white-space: nowrap; margin-right: 5px; }

        .rules-section {
             margin-top: 40px;
             page-break-before: always;
             break-before: page;
        }

        /* Ensure content-table has borders */
        table.content-table { border-collapse: collapse !important; border: 1px solid black !important; }
        table.content-table th, table.content-table td { border: 1px solid black !important; padding: 5px !important; }
        /* Remove focus outline for all elements */
        *:focus { outline: none !important; }
      </style>

      <table class="layout-table" style="border: none !important;">
        <thead>
            <tr style="border: none !important;">
                <th style="border: none !important;">
                    ${headerHtml}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr style="border: none !important;">
                <td style="border: none !important;">
                    ${bodyHtml}
                </td>
            </tr>
        </tbody>
      </table>
    </div>
  `;
}

function GuidePanelContent() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold text-primary mb-2 flex items-center gap-2">
                    <HelpCircle className="w-5 h-5" />
                    Hướng dẫn quy trình
                </h3>
                <p className="text-sm text-muted-foreground">Vui lòng thực hiện theo các bước sau để hoàn tất quá trình gửi mẫu.</p>
            </div>

            <div className="space-y-4">
                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">1</div>
                    <div>
                        <h4 className="font-semibold text-sm">Kiểm tra và Lưu phiếu</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            Rà soát kỹ thông tin và nhấn nút{" "}
                            <span className="inline-flex items-center gap-1 font-medium text-foreground bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                <Save className="w-3 h-3" /> Lưu
                            </span>{" "}
                            để ghi nhận dữ liệu vào hệ thống.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">2</div>
                    <div>
                        <h4 className="font-semibold text-sm">In phiếu</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            Nhấn nút{" "}
                            <span className="inline-flex items-center gap-1 font-medium text-foreground bg-gray-100 px-1.5 py-0.5 rounded text-xs">
                                <Printer className="w-3 h-3" /> In
                            </span>{" "}
                            để in phiếu ra giấy (Khổ A4) hoặc lưu dưới dạng PDF.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">3</div>
                    <div>
                        <h4 className="font-semibold text-sm">Ký và Đóng dấu</h4>
                        <p className="text-sm text-muted-foreground mt-1">
                            Ký và <span className="font-bold">đóng dấu</span> vào ô "Khách hàng" trên phiếu đã in.
                        </p>
                    </div>
                </div>

                <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">4</div>
                    <div>
                        <h4 className="font-semibold text-sm">Hướng dẫn gửi mẫu</h4>
                        <div className="text-sm text-muted-foreground mt-1 space-y-1">
                            <p>
                                <span className="font-medium text-foreground">Hồ sơ kèm theo:</span> Đơn hàng và Phiếu gửi mẫu (có dấu mộc).
                            </p>
                            <p>
                                <span className="font-medium text-foreground">Địa chỉ nhận mẫu:</span> Viện IRDOP – 12 Phùng Khoang 2, Trung Văn, Nam Từ Liêm, Hà Nội.
                            </p>
                            <p>
                                <span className="font-medium text-foreground">Thanh toán:</span> Chuyển khoản trước theo giá trị đơn hàng.
                            </p>
                            <p className="italic text-xs text-yellow-600">Lưu ý: Nội dung chuyển khoản bắt buộc bao gồm Mã đơn hàng.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-4 border-t border-border mt-4">
                <div className="bg-blue-50 p-3 rounded-lg text-sm text-blue-800">
                    <span className="font-bold">Cần hỗ trợ?</span> <br />
                    Liên hệ hotline: <span className="font-bold">024 3553 5355</span>
                </div>
            </div>
        </div>
    );
}
