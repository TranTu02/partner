/**
 * CustomerSampleRequestPage
 * ------------------------------------------
 * Standalone full-page version of CustomerSampleRequestPrintPreviewModal.
 * Opened in a NEW TAB from the order detail view.
 * Route: /customer/orders/sample-request?orderId=xxx
 *
 * Layout is IDENTICAL to the modal — left panel (form), center (TinyMCE), right (guide).
 * Only difference: no modal overlay, no onClose → use window.close() instead.
 */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { X, Save, FileDown, HelpCircle, FileText, Lock, Unlock, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import { customerGetOrderDetail, customerUpdateOrder, customerMe, CUSTOMER_TOKEN_KEY } from "@/api/customer";
import { convertHtmlToPdfForm1 } from "@/api/index";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { generateSampleRequestHtml } from "@/customerComponents/order/CustomerSampleRequestPrintPreviewModal";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const DEFAULT_SAMPLE_INFO_LABELS = ["Số lô", "Ngày sản xuất", "Nơi sản xuất", "Hạn sử dụng", "Số công bố", "Số đăng ký", "Thông tin khác"];

export function CustomerSampleRequestPage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get("orderId") || "";

    const editorRef = useRef<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Same state as the modal
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [showGuide, setShowGuide] = useState(false);
    const [tempData, setTempData] = useState<OrderPrintData | null>(null);
    const [isDirty, setIsDirty] = useState(false);

    // Customer info from localStorage

    // ── Unified init: set session (nếu có) → rồi load order ──
    useEffect(() => {
        const run = async () => {
            // Step 1: Nếu URL có ?sessionId → gán cookie ngay (Cực kỳ quan trọng để các API sau có Token)
            const sessionIdFromUrl = searchParams.get("sessionId");
            if (sessionIdFromUrl) {
                Cookies.set(CUSTOMER_TOKEN_KEY, sessionIdFromUrl, { expires: 7, sameSite: "Lax" });
                // Optional: Verify me to populate localStorage, but don't block order load unless necessary
                try {
                    const meRes = await customerMe({});
                    if (meRes.success && meRes.data) {
                        const identity = meRes.data?.identity || meRes.data;
                        localStorage.setItem("customer", JSON.stringify(identity));
                    }
                } catch (e) {
                    console.error("[GuestSession] Failed to verify identity", e);
                }
            }

            // Step 2: Load order
            if (!orderId.trim()) {
                setError("Thiếu mã đơn hàng.");
                setIsLoading(false);
                return;
            }

            setIsLoading(true);
            setError(null);
            try {
                // IMPORTANT: We only pass orderId. Let the backend identify the client via the token (Bearer).
                // Avoid passing clientId unless explicitly required, to prevent UNKNOWN/Mismatch errors.
                const res = await customerGetOrderDetail({ query: { orderId } });
                if (!res.success || !res.data) {
                    setError(res.error?.message || "Không thể tải dữ liệu đơn hàng.");
                    return;
                }
                const order = res.data as any;
                const cp = order?.contactPerson;
                const isCpObj = cp && typeof cp === "object";
                const receiver = order?.reportRecipient;
                const isRecObj = receiver && typeof receiver === "object";
                const client = order?.client ?? null;
                const invoice = client?.invoiceInfo;

                const data: OrderPrintData = {
                    orderId: String(order.orderId || ""),
                    createdAt: order.createdAt,
                    client,
                    requestForm: order.requestForm || "",

                    contactPerson: isCpObj ? cp.contactName || "" : typeof cp === "string" ? cp : "",
                    contactPhone: isCpObj ? cp.contactPhone || "" : "",
                    contactIdentity: isCpObj ? cp.contactId || cp.identityId || "" : "",
                    contactEmail: isCpObj ? cp.contactEmail || "" : "",
                    contactAddress: isCpObj ? cp.contactAddress || "" : "",
                    contactPosition: isCpObj ? cp.contactPosition || "" : "",
                    reportEmail: isCpObj ? cp.contactEmail || "" : "",

                    clientName: client?.clientName ?? "",
                    clientAddress: client?.clientAddress ?? "",
                    clientPhone: client?.clientPhone ?? "",
                    clientEmail: client?.clientEmail ?? "",

                    reportReceiverName: isRecObj ? receiver.receiverName || "" : "",
                    reportReceiverPhone: isRecObj ? receiver.receiverPhone || "" : "",
                    reportReceiverEmail: isRecObj ? receiver.receiverEmail || "" : "",
                    reportReceiverAddress: isRecObj ? receiver.receiverAddress || "" : "",

                    taxName: invoice?.taxName ?? client?.clientName ?? "",
                    taxCode: invoice?.taxCode ?? client?.legalId ?? "",
                    invoiceAddress: invoice?.taxAddress ?? client?.clientAddress ?? "",
                    invoiceEmail: invoice?.taxEmail ?? "",

                    attachedDocuments: "",

                    samples: (order.samples ?? []).map((s: any) => ({
                        ...s,
                        sampleName: s?.sampleName ?? "",
                        // User said: "nền mẫu là sampleTypeName"
                        sampleMatrix: s?.sampleTypeName ?? s?.sample_type_name ?? s?.sampleMatrix ?? s?.sample_matrix ?? "",
                        sampleTypeName:
                            s?.sampleTypeName ??
                            s?.sample_type_name ??
                            s?.librarySampleType?.sampleTypeName ??
                            (s as any)?.library_sample_type?.sample_type_name ??
                            s?.sampleMatrix ??
                            s?.sample_matrix ??
                            s?.matrix?.matrixName ??
                            (s as any)?.matrix?.matrix_name ??
                            "",
                        sampleTypeId: s?.sampleTypeId ?? s?.sample_type_id ?? s?.librarySampleType?.sampleTypeId ?? (s as any)?.library_sample_type?.sample_type_id ?? "",
                        sampleNote: s?.sampleNote ?? s?.sample_note ?? "",
                        sampleDesc: s?.sampleDesc ?? "",
                        sampleInfo: s?.sampleInfo ?? [],
                        analyses: (s?.analyses ?? []).map((a: any) => ({
                            ...a,
                            parameterName: a?.parameterName ?? a?.parameter_name ?? "",
                            parameterId: a?.parameterId ?? a?.parameter_id,
                            sampleTypeName:
                                a?.sampleTypeName ??
                                a?.sample_type_name ??
                                a?.librarySampleType?.sampleTypeName ??
                                (a as any)?.library_sample_type?.sample_type_name ??
                                s?.sampleMatrix ??
                                s?.sample_matrix ??
                                "",
                            sampleTypeId: a?.sampleTypeId ?? a?.sample_type_id ?? a?.librarySampleType?.sampleTypeId ?? (a as any)?.library_sample_type?.sample_type_id ?? "",
                            protocolAccreditation:
                                a?.protocolAccreditation ??
                                a?.protocol_accreditation ??
                                (a?.protocol as any)?.protocolAccreditation ??
                                (a?.protocol as any)?.protocol_accreditation ??
                                (a?.libraryParameterProtocol as any)?.protocolAccreditation ??
                                (a?.libraryParameterProtocol as any)?.protocol_accreditation ??
                                null,
                            feeBeforeTax: Number(a?.feeBeforeTax ?? a?.fee_before_tax ?? 0),
                            taxRate: Number(a?.taxRate ?? a?.tax_rate ?? 0),
                            feeAfterTax: Number(a?.feeAfterTax ?? a?.fee_after_tax ?? 0),
                            analysisUnit: a?.analysisUnit ?? a?.analysis_unit ?? "",
                            protocolCode:
                                a?.protocolCode ??
                                a?.protocol_code ??
                                (a?.protocol as any)?.protocolCode ??
                                (a?.protocol as any)?.protocol_code ??
                                (a?.libraryParameterProtocol as any)?.protocolCode ??
                                (a?.libraryParameterProtocol as any)?.protocol_code ??
                                "",
                        })),
                    })),

                    pricing: {
                        subtotal: Number(order.totalFeeBeforeTax ?? 0),
                        discountAmount: Number(order.totalDiscountValue ?? 0),
                        feeBeforeTax: Number(order.totalFeeBeforeTaxAndDiscount ?? 0),
                        tax: Number(order.totalTaxValue ?? 0),
                        total: Number(order.totalAmount ?? 0),
                    },
                    discountRate: order.discountRate || 0,
                    orderUri: order.orderUri || "",
                    orderCustomerFileIds: order.orderCustomerFileIds || [],
                };

                setTempData(data);
            } catch (e: any) {
                setError(e?.message || "Lỗi kết nối.");
            } finally {
                setIsLoading(false);
            }
        };

        run();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderId]);

    // Same handlers as modal
    const initialHtml = useMemo(() => {
        if (!tempData) return "";
        if (tempData.requestForm && tempData.requestForm.trim().length > 0) return tempData.requestForm;
        return generateSampleRequestHtml(tempData, t);
    }, [tempData, t]);

    const handleRefreshPreview = useCallback(() => {
        if (editorRef.current && tempData) {
            const html = generateSampleRequestHtml(tempData, t);
            editorRef.current.setContent(html);
            setIsDirty(false);
        }
    }, [tempData, t]);

    const handleUpdateTopLevel = useCallback((field: string, value: string) => {
        setTempData((prev) => (prev ? { ...prev, [field]: value } : prev));
        setIsDirty(true);
    }, []);

    const handleUpdateSample = useCallback((idx: number, field: string, value: string) => {
        setTempData((prev) => {
            if (!prev) return prev;
            const newSamples = [...prev.samples];
            newSamples[idx] = { ...newSamples[idx], [field]: value };
            return { ...prev, samples: newSamples };
        });
        setIsDirty(true);
    }, []);

    const handleUpdateAnalysis = useCallback((sIdx: number, aIdx: number, field: string, value: string) => {
        setTempData((prev) => {
            if (!prev) return prev;
            const newSamples = [...prev.samples];
            const newAnalyses = [...newSamples[sIdx].analyses];
            newAnalyses[aIdx] = { ...newAnalyses[aIdx], [field]: value };
            newSamples[sIdx] = { ...newSamples[sIdx], analyses: newAnalyses };
            return { ...prev, samples: newSamples };
        });
        setIsDirty(true);
    }, []);

    const handleUpdateSampleInfoByLabel = useCallback((sIdx: number, label: string, value: string) => {
        setTempData((prev) => {
            if (!prev) return prev;
            const newSamples = [...prev.samples];
            const currentInfo = [...(newSamples[sIdx].sampleInfo || [])];
            const foundIdx = currentInfo.findIndex((i) => i.label === label);
            if (foundIdx >= 0) {
                currentInfo[foundIdx] = { ...currentInfo[foundIdx], value };
            } else {
                currentInfo.push({ label, value });
            }
            newSamples[sIdx] = { ...newSamples[sIdx], sampleInfo: currentInfo };
            return { ...prev, samples: newSamples };
        });
        setIsDirty(true);
    }, []);

    const handleSave = async () => {
        if (!editorRef.current || !tempData) return;
        setLoading(true);
        const content = editorRef.current.getContent();
        const tid = toast.loading(t("common.saving") || "Đang lưu...");
        try {
            const res = await customerUpdateOrder({
                body: {
                    orderId: tempData.orderId,
                    requestForm: content,
                    clientName: (tempData as any).clientName,
                    clientAddress: tempData.clientAddress,
                    clientPhone: (tempData as any).clientPhone,
                    clientEmail: (tempData as any).clientEmail,
                    taxName: (tempData as any).taxName,
                    taxCode: (tempData as any).taxCode,
                    invoiceAddress: (tempData as any).invoiceAddress,
                    invoiceEmail: (tempData as any).invoiceEmail,
                    contactPerson: {
                        contactName: tempData.contactPerson,
                        contactPhone: tempData.contactPhone,
                        contactId: tempData.contactIdentity,
                        contactEmail: tempData.contactEmail,
                    },
                    reportRecipient: {
                        receiverName: (tempData as any).reportReceiverName,
                        receiverPhone: (tempData as any).reportReceiverPhone,
                        receiverEmail: (tempData as any).reportReceiverEmail,
                        receiverAddress: (tempData as any).reportReceiverAddress,
                    },
                    samples: tempData.samples.map((s) => ({
                        sampleName: s.sampleName,
                        sampleNote: s.sampleNote,
                        sampleDesc: (s as any).sampleDesc,
                        sampleInfo: s.sampleInfo,
                        analyses: s.analyses.map((a: any) => ({
                            parameterName: a.parameterName,
                            protocolCode: a.protocolCode,
                            analysisUnit: a.analysisUnit,
                        })),
                    })),
                    orderCustomerFileIds: tempData.orderCustomerFileIds,
                },
            });
            if (res.success) {
                toast.success("Đã lưu phiếu gửi mẫu", { id: tid });
                setIsDirty(false);
            } else {
                toast.error(res.error?.message || "Lưu thất bại", { id: tid });
            }
        } catch (e: any) {
            toast.error(e?.message || "Lỗi khi lưu", { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!editorRef.current || !tempData) return;
        const tid = toast.loading("Đang xuất file PDF...");
        try {
            const html = editorRef.current.getContent() || generateSampleRequestHtml(tempData, t);
            const blob = await convertHtmlToPdfForm1({ body: { html, orderId } });
            const url = window.URL.createObjectURL(new Blob([blob as any]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `request-form-${orderId || "phiếu"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Đã xuất PDF thành công", { id: tid });
        } catch {
            toast.error("Lỗi khi xuất PDF", { id: tid });
        }
    };

    // ── Loading ──
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm">Đang tải phiếu gửi mẫu...</p>
                </div>
            </div>
        );
    }

    // ── Error ──
    if (error || !tempData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center p-8 bg-card rounded-2xl border border-border shadow-lg max-w-sm w-full mx-4">
                    <div className="text-5xl mb-4">⚠️</div>
                    <h1 className="text-xl font-bold text-foreground mb-2">Không thể tải phiếu</h1>
                    <p className="text-sm text-muted-foreground mb-6">{error || "Dữ liệu không tồn tại."}</p>
                    <button onClick={() => window.close()} className="flex items-center gap-2 px-4 py-2 bg-muted text-foreground rounded-lg hover:bg-muted/80 transition-colors text-sm mx-auto">
                        <X className="w-4 h-4" />
                        Đóng tab
                    </button>
                </div>
            </div>
        );
    }

    // ── Main — identical layout to CustomerSampleRequestPrintPreviewModal ──
    return (
        <div className="fixed inset-0 z-0 flex flex-col bg-background">
            {/* Header — y hệt modal */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(`/customer/orders/detail?orderId=${tempData.orderId}`)}
                        className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground mr-2"
                        title="Quay lại đơn hàng"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <img
                        src="https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg"
                        alt="Logo"
                        className="h-8"
                    />
                    <div>
                        <h1 className="text-sm md:text-base font-bold text-foreground uppercase truncate">{t("sampleRequest.header")}</h1>
                        <p className="text-[10px] text-muted-foreground">Order ID: {tempData.orderId}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => {
                            const newLock = !isLocked;
                            setIsLocked(newLock);
                            if (editorRef.current) editorRef.current.mode.set(newLock ? "readonly" : "design");
                            toast.success(newLock ? "Đã khóa mẫu" : "Đã mở khóa sửa trực tiếp");
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border transition-all text-xs font-medium ${isLocked ? "bg-muted" : "bg-primary/10 text-primary border-primary/20"}`}
                    >
                        {isLocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isLocked ? "Mở khóa sửa" : "Khóa mẫu"}</span>
                    </button>

                    <button
                        onClick={handleExportPdf}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-medium ${isDirty ? "bg-muted text-muted-foreground opacity-50 cursor-not-allowed" : "bg-orange-600 text-white hover:bg-orange-700 shadow-sm"}`}
                    >
                        <FileDown className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">PDF</span>
                    </button>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-bold shadow-md ${isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-105 ring-2 ring-primary/20" : "bg-secondary text-secondary-foreground hover:bg-secondary/90"}`}
                    >
                        <Save className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">{t("common.save")}</span>
                    </button>

                    <div className="w-px h-6 bg-border mx-1" />

                    <button
                        onClick={() => navigate(`/customer/orders/detail?orderId=${tempData.orderId}`)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-all text-xs font-medium text-muted-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Quay lại</span>
                    </button>
                </div>
            </div>

            {/* Layout Body — y hệt modal */}
            <div className="flex-1 flex overflow-hidden bg-gray-50/50 relative">
                {/* Left Panel: Form */}
                <div className="hidden lg:flex w-[550px] flex-col border-r border-border bg-white overflow-hidden shrink-0 shadow-sm">
                    <div className="px-5 py-4 border-b border-border bg-gray-50/50">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Thông tin phiếu
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
                        <Section title="Khách hàng" color="blue">
                            <Field label="Tên khách hàng" value={(tempData as any).clientName} onChange={(v) => handleUpdateTopLevel("clientName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={tempData.clientAddress} onChange={(v) => handleUpdateTopLevel("clientAddress", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="SĐT" value={(tempData as any).clientPhone} onChange={(v) => handleUpdateTopLevel("clientPhone", v)} onBlur={handleRefreshPreview} />
                                <Field label="Mã số thuế" value={(tempData as any).taxCode} onChange={(v) => handleUpdateTopLevel("taxCode", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Liên hệ" color="green">
                            <Field label="Người liên hệ" value={tempData.contactPerson as string} onChange={(v) => handleUpdateTopLevel("contactPerson", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Số CCCD" value={tempData.contactIdentity} onChange={(v) => handleUpdateTopLevel("contactIdentity", v)} onBlur={handleRefreshPreview} />
                                <Field label="Điện thoại" value={tempData.contactPhone as string} onChange={(v) => handleUpdateTopLevel("contactPhone", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Nhận báo cáo" color="yellow">
                            <Field label="Người nhận" value={(tempData as any).reportReceiverName} onChange={(v) => handleUpdateTopLevel("reportReceiverName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={(tempData as any).reportReceiverAddress} onChange={(v) => handleUpdateTopLevel("reportReceiverAddress", v)} onBlur={handleRefreshPreview} />
                        </Section>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Danh sách mẫu</h4>
                            {tempData.samples.map((sample, sIdx) => (
                                <Section key={sIdx} title={`Mẫu ${sIdx + 1}`} color="indigo">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Field label="Tên mẫu" value={sample.sampleName} onChange={(v) => handleUpdateSample(sIdx, "sampleName", v)} onBlur={handleRefreshPreview} />
                                        <Field label="Ghi chú" value={sample.sampleNote} onChange={(v) => handleUpdateSample(sIdx, "sampleNote", v)} onBlur={handleRefreshPreview} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Mô tả mẫu thử</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-white text-xs focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[100px]"
                                            placeholder="Nhập mô tả mẫu thử..."
                                            value={(sample as any).sampleDesc || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleDesc", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 p-4 bg-muted/20 rounded-xl border border-border/50 shadow-inner">
                                        {DEFAULT_SAMPLE_INFO_LABELS.map((label) => {
                                            const info = (sample.sampleInfo || []).find((i) => i.label === label);
                                            const isTextArea = label === "Thông tin khác";
                                            return (
                                                <div key={label} className={isTextArea ? "col-span-2" : "col-span-1"}>
                                                    <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
                                                    {isTextArea ? (
                                                        <textarea
                                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[60px]"
                                                            value={info?.value || ""}
                                                            onChange={(e) => handleUpdateSampleInfoByLabel(sIdx, label, e.target.value)}
                                                            onBlur={handleRefreshPreview}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none"
                                                            value={info?.value || ""}
                                                            onChange={(e) => handleUpdateSampleInfoByLabel(sIdx, label, e.target.value)}
                                                            onBlur={handleRefreshPreview}
                                                        />
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>

                                    <div className="mt-3 overflow-hidden rounded-md border border-border/50 divide-y divide-border/50">
                                        <div className="p-2 bg-muted/30 grid grid-cols-[1fr_80px_60px] gap-2 items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <div>Chỉ tiêu</div>
                                            <div>Phương pháp</div>
                                            <div>Đơn vị</div>
                                        </div>
                                        {sample.analyses.map((ana: any, aIdx: number) => (
                                            <div key={aIdx} className="p-2 bg-card grid grid-cols-[1fr_80px_60px] gap-2 items-center">
                                                <input
                                                    className="w-full text-[10px] px-1.5 py-1 border border-transparent bg-transparent font-medium truncate"
                                                    value={ana.parameterName || ""}
                                                    readOnly
                                                />
                                                <input
                                                    className="w-full text-[10px] px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none"
                                                    placeholder="P.pháp"
                                                    value={ana.protocolCode || ""}
                                                    onChange={(e) => handleUpdateAnalysis(sIdx, aIdx, "protocolCode", e.target.value)}
                                                    onBlur={handleRefreshPreview}
                                                />
                                                <input
                                                    className="w-full text-[10px] px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none"
                                                    placeholder="Đơn vị"
                                                    value={ana.analysisUnit || ""}
                                                    onChange={(e) => handleUpdateAnalysis(sIdx, aIdx, "analysisUnit", e.target.value)}
                                                    onBlur={handleRefreshPreview}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </Section>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Center: Editor Preview */}
                <div className="flex-1 overflow-auto bg-muted/30 flex justify-center p-4 md:p-8">
                    <div className="w-[794px] min-w-[794px] h-fit bg-white shadow-2xl relative mb-20 border border-border/50">
                        {!editorReady && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs font-medium text-muted-foreground">Đang chuẩn bị mẫu in...</span>
                                </div>
                            </div>
                        )}
                        <Editor
                            key={tempData.orderId}
                            tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                            onInit={(_evt, editor) => {
                                editorRef.current = editor;
                                editor.mode.set(isLocked ? "readonly" : "design");
                                setEditorReady(true);
                            }}
                            initialValue={initialHtml}
                            init={{
                                width: "100%",
                                min_height: 1123,
                                menubar: false,
                                statusbar: false,
                                plugins: "table lists code print noneditable autoresize paste",
                                toolbar: "bold italic | alignleft aligncenter alignright | table | code print",
                                toolbar_mode: "wrap",
                                paste_as_text: true,
                                noneditable_noneditable_class: "mceNonEditable",
                                noneditable_editable_class: "mceEditable",
                                visual: false,
                                content_style: `
                                    @import url('https://fonts.googleapis.com/css2?family=Reddit+Mono:wght@200..900&display=swap');
                                    body {
                                        font-family: 'Reddit Mono', monospace !important;
                                        padding: 0 !important;
                                        width: 100%;
                                        margin: 0 !important;
                                        font-size: 13px;
                                        line-height: 1.4;
                                        color: #1e293b;
                                    }
                                    table { width: 100% !important; border-collapse: collapse; margin-bottom: 10px; }
                                    th, td { border: 1px solid black !important; padding: 5px !important; vertical-align: top; }
                                    .mceNonEditable { color: #64748b; }
                                    .mceEditable { border-bottom: 1px dotted #64748b !important; min-width: 20px; display: inline-block; }
                                    @media print {
                                        @page { size: A4 portrait; margin: 0; }
                                        body { padding: 8mm !important; }
                                        .mceEditable { border-bottom: none !important; }
                                    }
                                `,
                            }}
                        />
                    </div>
                </div>

                {/* Right Panel: Guide */}
                <div className="hidden xl:flex w-56 flex-col border-l border-border bg-white shrink-0 overflow-y-auto p-6 scroll-smooth shadow-sm">
                    <GuideContent />
                </div>

                {/* Mobile Guide Button */}
                <button
                    onClick={() => setShowGuide(!showGuide)}
                    className="fixed bottom-6 right-6 xl:hidden z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-transform"
                >
                    <HelpCircle className="w-6 h-6" />
                </button>

                {showGuide && (
                    <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm flex items-end justify-center px-4 pb-4 animate-in slide-in-from-bottom duration-300">
                        <div className="bg-white rounded-2xl w-full max-w-lg p-6 relative overflow-hidden">
                            <button onClick={() => setShowGuide(false)} className="absolute top-4 right-4 text-muted-foreground">
                                <X className="w-5 h-5" />
                            </button>
                            <GuideContent />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Sub-components (copied from modal) ──

function Section({ title, children, color }: { title: string; children: any; color: string }) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        green: "bg-green-50 text-green-700 border-green-100",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
    };
    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm relative pt-6 animate-in fade-in duration-500">
            <div className={`absolute top-0 left-0 px-2.5 py-0.5 rounded-br-lg text-[9px] font-black uppercase tracking-widest ${colors[color] || colors.blue}`}>{title}</div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Field({ label, value, onChange, onBlur }: { label: string; value?: string; onChange: (v: string) => void; onBlur?: () => void }) {
    return (
        <div>
            <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            <input
                type="text"
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none"
                value={value || ""}
                onChange={(e) => onChange(e.target.value)}
                onBlur={onBlur}
            />
        </div>
    );
}

function GuideContent() {
    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3 text-primary">
                <HelpCircle className="w-5 h-5" />
                <h3 className="font-bold text-base">Hướng dẫn gửi mẫu</h3>
            </div>
            <div className="space-y-5">
                <Step num={1} title="Kiểm tra & Lưu" text="Xem lại dữ liệu ở cột trái hoặc sửa trực tiếp trên bản in. Nhớ nhấn Lưu để ghi nhận thay đổi." />
                <Step num={2} title="Link PDF/In" text="Xuất file PDF hoặc nhấn In để nhận bản cứng (A4). Giao diện đã được tối ưu cho máy in văn phòng." />
                <Step num={3} title="Ký & Đóng dấu" text="Vui lòng ký tên và ĐÓNG DẤU MỘC vào ô Khách hàng trên phiếu sau khi in." />
                <div className="p-4 bg-muted/40 rounded-xl space-y-3 border border-border/50">
                    <div className="text-xs font-bold text-foreground">Hồ sơ gửi IRDOP:</div>
                    <ul className="text-[11px] text-muted-foreground space-y-2 list-disc pl-3">
                        <li>Đơn đặt hàng (bản in).</li>
                        <li>Phiếu gửi mẫu có dấu mộc.</li>
                        <li>Mẫu thử đóng gói cẩn thận.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function Step({ num, title, text }: { num: number; title: string; text: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-sm">{num}</div>
            <div className="space-y-1">
                <div className="font-bold text-xs text-foreground">{title}</div>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{text}</p>
            </div>
        </div>
    );
}
