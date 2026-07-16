import { useRef, useState, useMemo, useEffect } from "react";
import { X, FileDown, HelpCircle, FileText, Lock, Unlock } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { useTranslation } from "react-i18next";
import { customerProcessOrderPdf } from "@/api/customer";
import { toast } from "sonner";
import base64Images from "@/assets/base64Images.json";

const SAMPLE_INFO_ORDER = ["Tên mẫu thử", "Số lô", "Ngày sản xuất", "Hạn sử dụng", "Nơi sản xuất", "Địa chỉ sản xuất", "Số công bố", "Số đăng ký", "Thông tin khác"];

const translateOrderStatus = (status?: string): string => {
    if (!status) return "Mới";
    switch (status.toLowerCase()) {
        case "pending":
            return "Chờ xử lý";
        case "processing":
            return "Đang xử lý";
        case "approved":
            return "Đã duyệt";
        case "rejected":
            return "Từ chối";
        case "draft":
            return "Bản nháp";
        case "new":
            return "Mới";
        case "completed":
            return "Hoàn thành";
        case "done":
            return "Hoàn thành";
        default:
            return status;
    }
};

const normalizeSampleInfo = (sampleName: string, rawInfo: { label: string; value: string }[]) => {
    const infoMap = new Map((rawInfo || []).map((i) => [i.label, i.value]));
    infoMap.set("Tên mẫu thử", sampleName || "");
    const ordered: { label: string; value: string }[] = [];
    for (const key of SAMPLE_INFO_ORDER) {
        ordered.push({ label: key, value: infoMap.get(key) ?? "" });
        infoMap.delete(key);
    }
    infoMap.forEach((value, label) => ordered.push({ label, value }));
    return ordered;
};

const parseSampleInfo = (rawInfo: any): { label: string; value: string }[] => {
    if (!rawInfo) return [];
    if (Array.isArray(rawInfo)) {
        return rawInfo.map((item) => {
            if (typeof item === "string") {
                try {
                    const parsed = JSON.parse(item);
                    if (parsed && typeof parsed === "object" && "label" in parsed) {
                        return parsed;
                    }
                } catch (e) {
                    // ignore
                }
                return { label: item, value: "" };
            }
            if (item && typeof item === "object") {
                return {
                    label: item.label || "",
                    value: item.value || "",
                };
            }
            return { label: String(item), value: "" };
        });
    }
    if (typeof rawInfo === "string") {
        try {
            const parsed = JSON.parse(rawInfo);
            return parseSampleInfo(parsed);
        } catch (e) {
            // ignore
        }
    }
    return [];
};
// ─────────────────────────────────────────────────────────────────────────────

interface CustomerSampleRequestPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: OrderPrintData;
    onUpdateData?: (data: Partial<OrderPrintData>) => void;
}

export function CustomerSampleRequestPrintPreviewModal({ isOpen, onClose, data, onUpdateData }: CustomerSampleRequestPrintPreviewModalProps) {
    const { t } = useTranslation();
    const editorRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [showGuide, setShowGuide] = useState(false);
    const [showConfirmExportModal, setShowConfirmExportModal] = useState(false);

    // Local state to allow editing before saving
    const [tempData, setTempData] = useState<OrderPrintData>(data);

    const isOrderLocked = useMemo(() => {
        const status = tempData?.orderStatus?.toLowerCase() || "";
        return status !== "pending" && status !== "draft" && status !== "new" && status !== "";
    }, [tempData?.orderStatus]);

    // Cache original protocolCode/protocolId to allow restoring when user clears input
    const initialAnalysesRef = useRef<Record<string, { protocolCode: string | null; protocolId: string | null }>>({});

    // normalizeSampleInfo is defined at module scope above

    useEffect(() => {
        if (isOpen) {
            const mappedSamples = data.samples.map(s => ({
                ...s,
                analyses: (s.analyses || []).map((a: any) => {
                    const pId = a.protocolId ?? a.protocol_id ?? a.protocol?.protocolId ?? a.protocol?.protocol_id ?? a.libraryParameterProtocol?.protocolId ?? a.libraryParameterProtocol?.protocol_id ?? null;
                    return {
                        ...a,
                        protocolId: pId
                    };
                })
            }));
            const mappedData = { ...data, samples: mappedSamples };
            setTempData(mappedData);

            // Snapshot original protocol values per analysis ID
            initialAnalysesRef.current = {};
            mappedSamples.forEach((s) => {
                s.analyses.forEach((a: any) => {
                    initialAnalysesRef.current[a.id] = {
                        protocolCode: a.protocolCode || null,
                        protocolId: a.protocolId || null,
                    };
                });
            });
        }
    }, [isOpen, data]);

    useEffect(() => {
        if (editorRef.current && editorReady) {
            editorRef.current.mode.set((isLocked || isOrderLocked) ? "readonly" : "design");
        }
    }, [isLocked, isOrderLocked, editorReady]);

    // Always regenerate HTML from current tempData so default texts (like
    // "Thống nhất với IRDOP về phương pháp thử") are always visible.
    // requestForm (saved manual edits) is only used as a fallback if the user
    // explicitly worked in locked=false mode and we have no data to regenerate from.
    const initialHtml = useMemo(() => {
        return generateSampleRequestHtml(tempData, t);
    }, [tempData.orderId, t]); // Only re-key on orderId so TinyMCE isn't re-mounted on every keystroke

    if (!isOpen) return null;

    const handleRefreshPreview = () => {
        if (editorRef.current) {
            const html = generateSampleRequestHtml(tempData, t);
            editorRef.current.setContent(html);
        }
    };

    const handleUpdateTopLevel = (field: string, value: string) => {
        setTempData((prev) => ({ ...prev, [field]: value }));
    };

    const handleUpdateSample = (idx: number, field: string, value: string) => {
        setTempData((prev) => {
            const newSamples = [...prev.samples];
            newSamples[idx] = { ...newSamples[idx], [field]: value };
            return { ...prev, samples: newSamples };
        });
    };

    const handleUpdateAnalysis = (sIdx: number, aIdx: number, field: string, value: string) => {
        setTempData((prev) => {
            const newSamples = [...prev.samples];
            const newAnalyses = [...newSamples[sIdx].analyses];
            const analysis = newAnalyses[aIdx] as any;

            if (field === "protocolCode") {
                if (value && value.trim()) {
                    // User typed something → override protocolCode, clear protocolId
                    newAnalyses[aIdx] = { ...analysis, protocolCode: value, protocolId: null };
                } else {
                    // User cleared or whitespace only → restore original if protocolId was set
                    const original = initialAnalysesRef.current[analysis.id];
                    if (original && original.protocolId) {
                        // Only restore if not yet exported (protocolId still in original)
                        newAnalyses[aIdx] = { ...analysis, protocolCode: original.protocolCode, protocolId: original.protocolId };
                    } else {
                        newAnalyses[aIdx] = { ...analysis, protocolCode: "", protocolId: null };
                    }
                }
            } else {
                newAnalyses[aIdx] = { ...analysis, [field]: value };
            }

            newSamples[sIdx] = { ...newSamples[sIdx], analyses: newAnalyses };
            return { ...prev, samples: newSamples };
        });
    };

    const handleUpdateSampleInfo = (sIdx: number, infoIdx: number, value: string) => {
        setTempData((prev) => {
            const newSamples = [...prev.samples];
            const newInfo = [...(newSamples[sIdx].sampleInfo || [])];
            newInfo[infoIdx] = { ...newInfo[infoIdx], value };
            newSamples[sIdx] = { ...newSamples[sIdx], sampleInfo: newInfo };
            return { ...prev, samples: newSamples };
        });
    };



    const isDirty = useMemo(() => {
        return JSON.stringify(tempData) !== JSON.stringify(data);
    }, [tempData, data]);

    const handleExportClick = () => {
        if (isOrderLocked) return;
        setShowConfirmExportModal(true);
    };

    const handleConfirmExportPdf = async () => {
        setShowConfirmExportModal(false);
        if (!editorRef.current) return;
        setLoading(true);
        const content = editorRef.current.getContent();
        const tid = toast.loading("Đang lưu và xuất file PDF...");

        try {
            const blob = await customerProcessOrderPdf({
                body: {
                    orderId: tempData.orderId,
                    requestForm: content,
                    client: {
                        ...tempData.client,
                        clientName: tempData.clientName,
                        clientAddress: tempData.clientAddress,
                        clientPhone: tempData.clientPhone,
                        clientEmail: tempData.clientEmail,
                        invoiceInfo: {
                            ...tempData.client?.invoiceInfo,
                            taxName: tempData.taxName,
                            taxCode: tempData.taxCode,
                            taxAddress: tempData.invoiceAddress,
                            taxEmail: tempData.invoiceEmail,
                        },
                    },
                    contactPerson: {
                        contactName: tempData.contactPerson,
                        contactPhone: tempData.contactPhone,
                        contactId: tempData.contactIdentity,
                        contactEmail: (tempData as any).contactEmail,
                    },
                    reportRecipient: {
                        receiverName: tempData.reportReceiverName,
                        receiverPhone: tempData.reportReceiverPhone,
                        receiverEmail: tempData.reportReceiverEmail,
                        receiverAddress: tempData.reportReceiverAddress,
                    },
                    attachedDocuments: (tempData as any).attachedDocuments,
                    samples: tempData.samples.map((s) => {
                        const finalInfo = normalizeSampleInfo(s.sampleName || "", parseSampleInfo(s.sampleInfo));
                        const apiInfo = finalInfo.filter((info) => info.label === "Tên mẫu thử" || (info.value && info.value.trim() !== ""));
                        return {
                            ...s,
                            sampleName: s.sampleName,
                            sampleDesc: s.sampleDesc,
                            sampleInfo: apiInfo,
                            analyses: s.analyses.map((a) => ({
                                ...a,
                                parameterName: a.parameterName,
                                protocolCode: a.protocolCode,
                                protocolId: (a as any).protocolId,
                                analysisUnit: a.analysisUnit,
                            })),
                        };
                    }),
                    orderCustomerFileIds: tempData.orderCustomerFileIds,
                }
            });

            const url = window.URL.createObjectURL(new Blob([blob as any]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `request-form-${tempData.orderId || "phiếu"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Lưu và xuất PDF thành công!", { id: tid });
            const updated = { ...tempData, orderStatus: "Processing" };
            setTempData(updated);
            setIsLocked(true);
            if (onUpdateData) onUpdateData(updated);
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || "Lỗi khi lưu và xuất PDF", { id: tid });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <img
                        src={base64Images.LOGOFULL}
                        alt="Logo"
                        className="h-8"
                    />
                    <div>
                        <h1 className="text-sm md:text-base font-bold text-foreground uppercase truncate">{t("sampleRequest.header")}</h1>
                        <p className="text-[10px] text-muted-foreground">Order ID: {tempData.orderId}</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Desktop Action Buttons */}
                    <div className="hidden xl:flex items-center gap-2">
                        {!isOrderLocked && (
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
                        )}

                        <button
                            onClick={handleExportClick}
                            disabled={loading || isOrderLocked}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-bold shadow-md disabled:opacity-55 disabled:cursor-not-allowed ${isDirty && !isOrderLocked ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-105 ring-2 ring-primary/20" : "bg-orange-600 text-white hover:bg-orange-700"}`}
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lưu &amp; Xuất PDF</span>
                        </button>

                        <div className="w-px h-6 bg-border mx-1" />
                    </div>

                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>

            </div>

            {/* Layout Body */}
            <div className="flex-1 flex overflow-hidden bg-gray-50/50 relative">
                
                {/* Floating Action Bar (Top Right) - Vertical Bubbles (Mobile Only) */}
                <div className="absolute top-4 right-4 md:right-6 z-50 flex xl:hidden flex-col gap-3">
                    {!isOrderLocked && (
                        <div className="relative group flex items-center justify-end">
                            <span className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                                {isLocked ? "Mở khóa sửa" : "Khóa mẫu"}
                            </span>
                            <button
                                onClick={() => {
                                    const newLock = !isLocked;
                                    setIsLocked(newLock);
                                    if (editorRef.current) editorRef.current.mode.set(newLock ? "readonly" : "design");
                                    toast.success(newLock ? "Đã khóa mẫu" : "Đã mở khóa sửa trực tiếp");
                                }}
                                className={`p-3 rounded-full border shadow-lg transition-transform hover:scale-110 active:scale-95 backdrop-blur-sm ${isLocked ? "bg-white/90 border-border text-muted-foreground hover:text-foreground" : "bg-primary text-primary-foreground border-primary"}`}
                            >
                                {isLocked ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                            </button>
                        </div>
                    )}

                    <div className="relative group flex items-center justify-end">
                        <span className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                            Lưu &amp; Xuất PDF
                        </span>
                        <button
                            onClick={handleExportClick}
                            disabled={loading || isOrderLocked}
                            className={`p-3 rounded-full transition-transform shadow-lg hover:scale-110 active:scale-95 text-white disabled:opacity-55 disabled:cursor-not-allowed ${isDirty && !isOrderLocked ? "bg-orange-500 hover:bg-orange-600 ring-4 ring-orange-500/20" : "bg-orange-600 hover:bg-orange-700"}`}
                        >
                            <FileDown className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="relative group flex items-center justify-end">
                        <span className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                            Hướng dẫn
                        </span>
                        <button
                            onClick={() => setShowGuide(!showGuide)}
                            className="p-3 bg-white/90 backdrop-blur-sm border border-border text-primary rounded-full shadow-lg hover:scale-110 active:scale-95 transition-transform"
                        >
                            <HelpCircle className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Left Panel: Form */}
                <div className="hidden lg:flex w-[550px] flex-col border-r border-border bg-white overflow-hidden shrink-0 shadow-sm">
                    <div className="px-5 py-4 border-b border-border bg-gray-50/50">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Thông tin phiếu
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
                        {isOrderLocked && (
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-xs shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                                <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                                <div className="space-y-1">
                                    <p className="font-bold uppercase tracking-wider">Phiếu yêu cầu đã khóa</p>
                                    <p className="leading-relaxed">
                                        Phiếu yêu cầu đang ở trạng thái <strong>{translateOrderStatus(tempData.orderStatus)}</strong> và đã bị khóa chỉnh sửa. Vui lòng liên hệ với nhân viên kinh doanh để được hỗ trợ mở lại đường link nhập mới nếu cần điều chỉnh thông tin.
                                    </p>
                                </div>
                            </div>
                        )}
                        <Section title="Thông tin thể hiện trên kết quả" color="blue">
                            <Field label="Tên khách hàng" value={(tempData as any).clientName} onChange={(v) => handleUpdateTopLevel("clientName", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            <Field label="Địa chỉ" value={tempData.clientAddress} onChange={(v) => handleUpdateTopLevel("clientAddress", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                        </Section>

                        <Section title="Thông tin liên hệ" color="green">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Người liên hệ" value={tempData.contactPerson as string} onChange={(v) => handleUpdateTopLevel("contactPerson", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                <Field label="CCCD" value={tempData.contactIdentity} onChange={(v) => handleUpdateTopLevel("contactIdentity", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Điện thoại" value={tempData.contactPhone as string} onChange={(v) => handleUpdateTopLevel("contactPhone", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                <Field label="Email" value={(tempData as any).contactEmail} onChange={(v) => handleUpdateTopLevel("contactEmail", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            </div>
                        </Section>

                        <Section title="Thông tin nhận kết quả" color="yellow">
                            <Field label="Người nhận" value={(tempData as any).reportReceiverName} onChange={(v) => handleUpdateTopLevel("reportReceiverName", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            <Field label="Địa chỉ" value={(tempData as any).reportReceiverAddress} onChange={(v) => handleUpdateTopLevel("reportReceiverAddress", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Điện thoại" value={(tempData as any).reportReceiverPhone} onChange={(v) => handleUpdateTopLevel("reportReceiverPhone", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                <Field label="Email" value={(tempData as any).reportReceiverEmail} onChange={(v) => handleUpdateTopLevel("reportReceiverEmail", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            </div>
                        </Section>

                        <Section title="Thông tin xuất hóa đơn" color="purple">
                            <Field label="Tên công ty" value={(tempData as any).taxName} onChange={(v) => handleUpdateTopLevel("taxName", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            <Field label="Địa chỉ" value={(tempData as any).invoiceAddress} onChange={(v) => handleUpdateTopLevel("invoiceAddress", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="MST/CCCD" value={(tempData as any).taxCode} onChange={(v) => handleUpdateTopLevel("taxCode", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                <Field label="Email" value={(tempData as any).invoiceEmail} onChange={(v) => handleUpdateTopLevel("invoiceEmail", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                            </div>
                        </Section>

                        <Section title="Thông tin chung" color="indigo">
                            <Field label="Giấy tờ đi kèm" value={(tempData as any).attachedDocuments} onChange={(v) => handleUpdateTopLevel("attachedDocuments", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                        </Section>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Danh sách mẫu</h4>
                            {tempData.samples.map((sample, sIdx) => (
                                <Section key={sIdx} title={`Mẫu ${sIdx + 1}`} color="indigo">
                                    <div className="space-y-3 mb-4">
                                        <Field label="Tên mẫu" value={sample.sampleName} onChange={(v) => handleUpdateSample(sIdx, "sampleName", v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Mô tả mẫu thử</label>
                                        <textarea
                                            rows={2}
                                            disabled={isOrderLocked}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[48px] disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
                                            value={sample.sampleDesc || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleDesc", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Ghi chú</label>
                                        <textarea
                                            rows={2}
                                            disabled={isOrderLocked}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[48px] disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
                                            value={sample.sampleNote || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleNote", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>

                                    {sample.sampleInfo && sample.sampleInfo.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 p-2 bg-muted/20 rounded-md border border-border/50">
                                            {sample.sampleInfo.map((info, iIdx) => {
                                                if (info.label === "Tên mẫu thử") return null;
                                                const isText = info.label === "Thông tin khác";
                                                return (
                                                    <div key={iIdx} className={isText ? "col-span-2" : "col-span-1"}>
                                                        {isText ? (
                                                            <div>
                                                                <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{info.label}</label>
                                                                <textarea
                                                                    disabled={isOrderLocked}
                                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[60px] disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
                                                                    value={info.value || ""}
                                                                    onChange={(e) => handleUpdateSampleInfo(sIdx, iIdx, e.target.value)}
                                                                    onBlur={handleRefreshPreview}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Field label={info.label} value={info.value} onChange={(v) => handleUpdateSampleInfo(sIdx, iIdx, v)} onBlur={handleRefreshPreview} disabled={isOrderLocked} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}

                                    <div className="mt-3 overflow-hidden rounded-md border border-border/50 divide-y divide-border/50">
                                        <div className="p-2 bg-muted/30 grid grid-cols-[1fr_80px_60px] gap-2 items-center text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <div>Chỉ tiêu</div>
                                            <div>Phương pháp</div>
                                            <div>Đơn vị</div>
                                        </div>
                                        {sample.analyses.map((ana, aIdx) => (
                                            <div key={aIdx} className="p-2 bg-card grid grid-cols-[1fr_80px_60px] gap-2 items-center">
                                                <input
                                                    className="w-full text-[10px] px-1.5 py-1 border border-transparent bg-transparent font-medium truncate"
                                                    value={ana.parameterName || ""}
                                                    readOnly
                                                />
                                                <input
                                                    disabled={isOrderLocked}
                                                    className="w-full text-[10px] px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
                                                    placeholder="Thống nhất với IRDOP"
                                                    value={(ana as any).protocolId ? "" : ((ana as any).protocolCode || "")}
                                                    onChange={(e) => handleUpdateAnalysis(sIdx, aIdx, "protocolCode", e.target.value)}
                                                    onBlur={handleRefreshPreview}
                                                />
                                                <input
                                                    disabled={isOrderLocked}
                                                    className="w-full text-[10px] px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
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
                <div className="flex-1 overflow-x-auto overflow-y-auto bg-muted/30 flex justify-start lg:justify-center p-4 md:p-8 pt-16 md:pt-20">
                    <div className="w-[794px] min-w-[794px] h-fit bg-white shadow-2xl relative mb-20 border border-border/50">
                        {!editorReady && (
                            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/90 backdrop-blur-sm">
                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                                    <span className="text-xs font-medium text-muted-foreground">Đang chuẩn bị mẫu in...</span>
                                </div>
                            </div>
                        )}
                        <div style={{ visibility: editorReady ? "visible" : "hidden" }}>
                            <Editor
                                key={tempData.orderId}
                                tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                                onInit={(_evt, editor) => {
                                    editorRef.current = editor;
                                    editor.mode.set((isLocked || isOrderLocked) ? "readonly" : "design");
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
                                        overflow: hidden;
                                    }
                                    html { overflow: hidden; }
                                    table { width: 100% !important; border-collapse: collapse; margin-bottom: 10px; }
                                    th, td { border: 1px solid black !important; padding: 5px !important; vertical-align: top; }
                                    .mceNonEditable { color: #64748b; }
                                    .mceEditable { border-bottom: 1px dotted #64748b !important; min-width: 20px; display: inline-block; }
                                    @media print {
                                        @page { size: A4 portrait; margin: 0; }
                                        body { padding: 8mm !important; }
                                        .mceEditable { border-bottom: none !important; }
                                        html { overflow: visible; }
                                    }
                                `,
                                }}
                            />
                        </div>
                    </div>
                </div>

                {/* Right Panel: Guide (Desktop Only) */}
                <div className="hidden xl:flex w-64 flex-col border-l border-border bg-white shrink-0 overflow-y-auto p-6 scroll-smooth shadow-sm">
                    <GuideContent />
                </div>

                {showGuide && (
                    <div className="fixed inset-0 z-[110] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:px-4 sm:pb-4 animate-in fade-in duration-200">
                        <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-6 pb-10 sm:pb-6 relative flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-4 shadow-2xl border border-border/50">
                            <div className="flex items-center justify-between border-b border-border pb-4 mb-5">
                                <h3 className="font-bold text-lg text-foreground uppercase tracking-wider">Hướng dẫn thao tác</h3>
                                <button onClick={() => setShowGuide(false)} className="p-2 -mr-2 text-muted-foreground hover:bg-muted hover:text-foreground rounded-full transition-colors">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                            <div className="overflow-y-auto pr-2 pb-6 custom-scrollbar">
                                <GuideContent />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Custom save & export PDF confirmation modal */}
            {showConfirmExportModal && (
                <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 relative flex flex-col animate-in zoom-in-95 duration-200 shadow-2xl border border-border">
                        <div className="flex items-center gap-3 text-amber-600 mb-4">
                            <div className="p-2 bg-amber-50 rounded-full flex shrink-0">
                                <HelpCircle className="w-6 h-6" />
                            </div>
                            <h3 className="font-bold text-base text-foreground uppercase tracking-wide">Xác nhận Lưu &amp; Xuất PDF</h3>
                        </div>
                        
                        <div className="text-sm text-muted-foreground space-y-3 leading-relaxed mb-6">
                            <p>
                                <strong>Lưu ý quan trọng:</strong> Sau khi xác nhận, thông tin phiếu yêu cầu gửi mẫu sẽ chuyển sang trạng thái <strong>Đang xử lý (Processing)</strong> và sẽ <strong>bị khóa hoàn toàn</strong>. Quý khách sẽ không thể chỉnh sửa thông tin được nữa.
                            </p>
                            <p>
                                Trường hợp cần sửa đổi thông tin sau khi đã xuất PDF, vui lòng liên hệ với nhân viên kinh doanh của IRDOP để được hỗ trợ mở lại đường link nhập mới.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setShowConfirmExportModal(false)}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-all border border-gray-200"
                            >
                                Hủy
                            </button>
                            <button
                                onClick={handleConfirmExportPdf}
                                className="px-4 py-2 text-xs font-bold rounded-lg bg-orange-600 hover:bg-orange-700 text-white transition-all shadow-md flex items-center gap-1.5"
                            >
                                Xác nhận &amp; Tải PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

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

function Field({ label, value, onChange, onBlur, disabled }: { label: string; value?: string; onChange: (v: string) => void; onBlur?: () => void; disabled?: boolean }) {
    return (
        <div>
            <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            <input
                type="text"
                disabled={disabled}
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none disabled:bg-gray-100 disabled:text-muted-foreground disabled:cursor-not-allowed"
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
            <div className="hidden xl:flex items-center gap-3 text-primary border-b border-border pb-4">
                <HelpCircle className="w-6 h-6" />
                <h3 className="font-bold text-base uppercase tracking-wider">Quy trình gửi mẫu</h3>
            </div>
            <div className="space-y-6">
                <Step 
                    num={1} 
                    title="Điền thông tin tự động" 
                    text="Quý khách chỉ cần nhập dữ liệu ở phần Nhập thông tin. Hệ thống sẽ tự động căn chỉnh và điền chuẩn xác vào Phiếu yêu cầu ở Bản in PDF." 
                />
                <Step 
                    num={2} 
                    title="Chỉnh sửa bản in (Tùy chọn)" 
                    text="Trường hợp cần định dạng lại văn bản, Quý khách có thể chuyển sang Bản in PDF, nhấn 'Mở khóa sửa' để điều chỉnh trực tiếp trên văn bản." 
                />
                <Step 
                    num={3} 
                    title="Lưu & Xuất phiếu PDF" 
                    text="Nhấn nút 'Lưu & Xuất PDF' màu cam để lưu trữ dữ liệu an toàn vào hệ thống và tải file PDF chính thức về thiết bị của Quý khách." 
                />
                <Step 
                    num={4} 
                    title="Ký & Đóng mộc đỏ" 
                    text="Vui lòng in file PDF ra giấy khổ A4, sau đó đại diện tổ chức/doanh nghiệp ký tên và đóng dấu mộc đỏ hợp lệ." 
                />

                <div className="p-5 bg-muted/40 rounded-xl space-y-4 border border-border/50 shadow-inner mt-6">
                    <div className="text-sm font-bold text-foreground uppercase tracking-wide">Hồ sơ gửi kèm mẫu:</div>
                    <ul className="text-sm text-muted-foreground space-y-3 list-disc pl-5 leading-relaxed">
                        <li><strong>Phiếu yêu cầu:</strong> Bản in A4 đã ký và đóng dấu.</li>
                        <li><strong>Đơn đặt hàng:</strong> Bản in kèm theo (nếu có).</li>
                        <li><strong>Mẫu thử:</strong> Được đóng gói cẩn thận, nhãn dán khớp với thông tin trên phiếu.</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function Step({ num, title, text }: { num: number; title: string; text: string }) {
    return (
        <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm">{num}</div>
            <div className="space-y-1.5 pt-1">
                <div className="font-bold text-sm text-foreground leading-tight">{title}</div>
                <p className="text-[13px] leading-relaxed text-muted-foreground text-justify">{text}</p>
            </div>
        </div>
    );
}

export function generateSampleRequestHtml(data: OrderPrintData, t: any) {
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

                    // Build all sampleInfo lines, filtering out empty values for preview
                    const allSampleInfo = sample.sampleInfo && sample.sampleInfo.length > 0 ? sample.sampleInfo.filter((i) => i.value && i.value.trim().length > 0) : [];

                    // Always show Tên mẫu thử if it was handled as sampleName and no sampleInfo yet
                    const hasSampleNameInInfo = allSampleInfo.some((i) => i.label === "Tên mẫu thử");
                    const sampleInfoLines = allSampleInfo
                        .map((info) => `<div><span style="font-weight:300;">${info.label}</span><strong>:</strong> <span style="font-weight:700;">${info.value || ""}</span></div>`)
                        .join("");

                    const sampleNameLineHtml =
                        !hasSampleNameInInfo && sample.sampleName
                            ? `<div><span style="font-weight:300;">Tên mẫu thử</span><strong>:</strong> <span style="font-weight:700;">${sample.sampleName}</span></div>`
                            : "";

                    const sampleCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:top !important;">
                <div style="font-size:13px; line-height:1.4;">
                  ${sampleNameLineHtml}
                  ${sampleInfoLines}
                </div>
              </td>
            `
                        : "";

                    const descCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:top !important;">
                <div style="font-size:12px; line-height:1.4; white-space: pre-wrap;">${sample.sampleDesc || ""}</div>
              </td>
            `
                        : "";

                    // const accKeys =
                    //     analysis.sampleTypeName === (sample.sampleTypeName || (sample as any).sampleMatrix) && analysis.protocolAccreditation
                    //         ? Object.entries(analysis.protocolAccreditation)
                    //               .filter(([, v]) => v)
                    //               .map(([k]) => k)
                    //               .join(", ")
                    //         : "";

                    const noteCell = isFirst
                        ? `<td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important; vertical-align:top !important; width: 18%;">${sample.sampleNote || ""}</td>`
                        : "";

                    return `
          <tr>
            ${sttCell}
            ${sampleCell}
            ${descCell}
            <td style="padding:5px; border: 1px solid #000 !important; width: 20%;">${analysis.parameterName || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: center; width: 6%;">${analysis.analysisUnit || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: left; width: 20%;">
                <div style="font-weight: 700;">
                    ${
                        (analysis as any).protocolId
                            ? "Đã thống nhất với IRDOP"
                            : analysis.protocolCode || "Thống nhất với IRDOP về phương pháp thử"
                    }
                </div>
            </td>
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
            src="${base64Images.LOGOFULL}"
            style="height:28px; width:auto; object-fit:contain;"
            draggable="false"
          />
          <div style="font-size:10.5px !important; line-height:1.3 !important; color:#0f172a; text-align:left; align-self: center;">
            <div style="font-weight:700 !important;">
              ${t("sampleRequest.institute.name")}
            </div>
            <div>
              ${t("sampleRequest.institute.address")} - ${t("sampleRequest.institute.tel")}   -   ${t("sampleRequest.institute.email")}
            </div>
          </div>
          <div style="flex:1;">
            <div style="text-align:right; font-size:9px !important; font-weight:700 !important; white-space:nowrap; text-transform:uppercase;">
              ${t("sampleRequest.title")}
            </div>
            <div style="text-align:right; font-size:9px !important; font-weight:700 !important; margin-top:2px;">
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
            <span class="label-text" style="min-width: 120px;">  ${t("sampleRequest.clientName").replace(":", "")}<strong>:</strong></span>
            <span class="field-dotted" style="flex-grow: 1; font-weight: 700;">${data.clientName || data.client?.clientName || ""}</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></span>
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
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section2.contactPerson").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPerson || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.identity").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactIdentity || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
                 <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${(data as any).contactEmail || data.reportEmail || ""}</td>
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
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
                <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${(data as any).reportReceiverAddress || data.clientAddress || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${(data as any).reportReceiverPhone || data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${(data as any).reportReceiverEmail || data.reportEmail || ""}</td>
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
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section4.taxName").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxName || data.client?.invoiceInfo?.taxName || ""}</td>
            </tr>
           <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.invoiceAddress || data.client?.invoiceInfo?.taxAddress || (data.client as any)?.invoiceAddress || ""}</td>
            </tr>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.taxId").replace(":", "")}<strong>:</strong></td>
               <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxCode || data.client?.legalId || ""}</td>
               
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
               <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.invoiceEmail || data.client?.invoiceInfo?.taxEmail || (data.client as any)?.invoiceEmail || ""}</td>
            </tr>
        </table>

        <table>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 120px; font-weight: 700;">${t("sampleRequest.section5.title")}</td>
                <td style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;">${(data as any).attachedDocuments || ""}</td>
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
              <th style="border: 1px solid #1e293b; padding: 8px 8px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 4%;">
                ${t("table.stt")}
              </th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 22%;">
                ${t("sample.name")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 10%;">
                ${t("sampleRequest.table.sampleDesc")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 20%;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 6%;">
                Đơn vị</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 20%;">
                Phương pháp</th>
               <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 18%;">
                Ghi chú</th>
            </tr>
          </thead>
          ${samplesHtml}
        </table>

        ${data.otherItems && data.otherItems.length > 0 ? `
        <div style="margin-top: 10px; margin-bottom: 12px; font-size: 13px; text-align: left;">
            <strong>Ghi chú khách hàng:</strong>
            <div style="margin-top: 4px; padding-left: 12px; font-weight: 700;">
                ${data.otherItems
                    .map((item) => `<div>- ${item.itemName}</div>`)
                    .join("")}
            </div>
        </div>
        ` : ""}


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
