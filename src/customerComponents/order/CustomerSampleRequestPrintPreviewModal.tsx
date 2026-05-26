import { useRef, useState, useMemo, useEffect } from "react";
import { X, FileDown, HelpCircle, FileText, Lock, Unlock } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { useTranslation } from "react-i18next";
import { customerUpdateOrder } from "@/api/customer";
import { convertHtmlToPdfForm1 } from "@/api/index";
import { toast } from "sonner";

// ─── Module-level constants (available before component renders) ─────────────
const SAMPLE_INFO_ORDER = ["Tên mẫu thử", "Số lô", "Ngày sản xuất", "Hạn sử dụng", "Nơi sản xuất", "Số công bố", "Số đăng ký", "Thông tin khác"];

const normalizeSampleInfo = (sampleName: string, rawInfo: { label: string; value: string }[]) => {
    const infoMap = new Map(rawInfo.map((i) => [i.label, i.value]));
    infoMap.set("Tên mẫu thử", sampleName || "");
    const ordered: { label: string; value: string }[] = [];
    for (const key of SAMPLE_INFO_ORDER) {
        ordered.push({ label: key, value: infoMap.get(key) ?? "" });
        infoMap.delete(key);
    }
    infoMap.forEach((value, label) => ordered.push({ label, value }));
    return ordered;
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

    // Local state to allow editing before saving
    const [tempData, setTempData] = useState<OrderPrintData>(data);

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

    const handleSave = async (): Promise<boolean> => {
        if (!editorRef.current) return false;
        setLoading(true);
        const content = editorRef.current.getContent();
        const tid = toast.loading(t("common.saving") || "Đang lưu...");

        try {
            const res = await customerUpdateOrder({
                body: {
                    orderId: tempData.orderId,
                    requestForm: content,
                    // Snapshot basic info back to server
                    clientName: tempData.clientName,
                    clientAddress: tempData.clientAddress,
                    clientPhone: tempData.clientPhone,
                    clientEmail: tempData.clientEmail,
                    taxName: tempData.taxName,
                    taxCode: tempData.taxCode,
                    invoiceAddress: tempData.invoiceAddress,
                    invoiceEmail: tempData.invoiceEmail,
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
                        const finalInfo = normalizeSampleInfo(s.sampleName || "", s.sampleInfo || []);
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
                                protocolId: (a as any).protocolId, // include protocolId
                                analysisUnit: a.analysisUnit,
                            })),
                        };
                    }),
                    orderCustomerFileIds: tempData.orderCustomerFileIds,
                },
            });

            if (res.success) {
                toast.success(t("common.saveSuccess") || "Lưu thành công", { id: tid });
                if (onUpdateData) onUpdateData({ ...tempData, requestForm: content });
                return true;
            } else {
                toast.error(res.error?.message || "Lỗi khi lưu", { id: tid });
                return false;
            }
        } catch (e: any) {
            toast.error(e.message || "Lỗi máy chủ", { id: tid });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(tempData) !== JSON.stringify(data);
    }, [tempData, data]);

    const handleExportPdf = async () => {
        // Auto save before export
        const isSaved = await handleSave();
        if (!isSaved) return;

        const tid = toast.loading("Đang chuẩn bị file PDF...");
        try {
            const html = editorRef.current?.getContent() || generateSampleRequestHtml(tempData, t);
            const response = await convertHtmlToPdfForm1({
                body: { requestForm: html, orderId: tempData.orderId },
            });

            const blob = new Blob([response as any], { type: "application/pdf" });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `request-form-${tempData.orderId || "phiếu"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            toast.success("Đã xuất PDF thành công", { id: tid });
        } catch (e) {
            toast.error("Lỗi khi xuất PDF", { id: tid });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background animate-in fade-in duration-200">
            {/* Header */}
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card shrink-0 shadow-sm">
                <div className="flex items-center gap-4">
                    <img
                        src="data:image/png;base64,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"
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
                            disabled={loading}
                            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg transition-all text-xs font-bold shadow-md ${isDirty ? "bg-primary text-primary-foreground hover:bg-primary/90 scale-105 ring-2 ring-primary/20" : "bg-orange-600 text-white hover:bg-orange-700"}`}
                        >
                            <FileDown className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Lưu & Xuất PDF</span>
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

                    <div className="relative group flex items-center justify-end">
                        <span className="absolute right-full mr-3 whitespace-nowrap bg-gray-900 text-white text-xs font-medium px-2.5 py-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                            Lưu & Xuất PDF
                        </span>
                        <button
                            onClick={handleExportPdf}
                            disabled={loading}
                            className={`p-3 rounded-full transition-transform shadow-lg hover:scale-110 active:scale-95 text-white ${isDirty ? "bg-orange-500 hover:bg-orange-600 ring-4 ring-orange-500/20" : "bg-orange-600 hover:bg-orange-700"}`}
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
                        <Section title="Thông tin thể hiện trên kết quả" color="blue">
                            <Field label="Tên khách hàng" value={(tempData as any).clientName} onChange={(v) => handleUpdateTopLevel("clientName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={tempData.clientAddress} onChange={(v) => handleUpdateTopLevel("clientAddress", v)} onBlur={handleRefreshPreview} />
                        </Section>

                        <Section title="Thông tin liên hệ" color="green">
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Người liên hệ" value={tempData.contactPerson as string} onChange={(v) => handleUpdateTopLevel("contactPerson", v)} onBlur={handleRefreshPreview} />
                                <Field label="CCCD" value={tempData.contactIdentity} onChange={(v) => handleUpdateTopLevel("contactIdentity", v)} onBlur={handleRefreshPreview} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Điện thoại" value={tempData.contactPhone as string} onChange={(v) => handleUpdateTopLevel("contactPhone", v)} onBlur={handleRefreshPreview} />
                                <Field label="Email" value={(tempData as any).contactEmail} onChange={(v) => handleUpdateTopLevel("contactEmail", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Thông tin nhận kết quả" color="yellow">
                            <Field label="Người nhận" value={(tempData as any).reportReceiverName} onChange={(v) => handleUpdateTopLevel("reportReceiverName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={(tempData as any).reportReceiverAddress} onChange={(v) => handleUpdateTopLevel("reportReceiverAddress", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Điện thoại" value={(tempData as any).reportReceiverPhone} onChange={(v) => handleUpdateTopLevel("reportReceiverPhone", v)} onBlur={handleRefreshPreview} />
                                <Field label="Email" value={(tempData as any).reportReceiverEmail} onChange={(v) => handleUpdateTopLevel("reportReceiverEmail", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Thông tin xuất hóa đơn" color="purple">
                            <Field label="Tên công ty" value={(tempData as any).taxName} onChange={(v) => handleUpdateTopLevel("taxName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={(tempData as any).invoiceAddress} onChange={(v) => handleUpdateTopLevel("invoiceAddress", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="MST/CCCD" value={(tempData as any).taxCode} onChange={(v) => handleUpdateTopLevel("taxCode", v)} onBlur={handleRefreshPreview} />
                                <Field label="Email" value={(tempData as any).invoiceEmail} onChange={(v) => handleUpdateTopLevel("invoiceEmail", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Thông tin chung" color="indigo">
                            <Field label="Giấy tờ đi kèm" value={(tempData as any).attachedDocuments} onChange={(v) => handleUpdateTopLevel("attachedDocuments", v)} onBlur={handleRefreshPreview} />
                        </Section>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Danh sách mẫu</h4>
                            {tempData.samples.map((sample, sIdx) => (
                                <Section key={sIdx} title={`Mẫu ${sIdx + 1}`} color="indigo">
                                    <div className="space-y-3 mb-4">
                                        <Field label="Tên mẫu" value={sample.sampleName} onChange={(v) => handleUpdateSample(sIdx, "sampleName", v)} onBlur={handleRefreshPreview} />
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Mô tả mẫu thử</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[48px]"
                                            value={sample.sampleDesc || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleDesc", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Ghi chú</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[48px]"
                                            value={sample.sampleNote || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleNote", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>

                                    {sample.sampleInfo && sample.sampleInfo.length > 0 && (
                                        <div className="mt-3 grid grid-cols-2 gap-2 p-2 bg-muted/20 rounded-md border border-border/50">
                                            {sample.sampleInfo.map((info, iIdx) => {
                                                const isTextArea = info.label === "Thông tin khác";
                                                return (
                                                    <div key={iIdx} className={isTextArea ? "col-span-2" : "col-span-1"}>
                                                        {isTextArea ? (
                                                            <div>
                                                                <label className="block mb-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{info.label}</label>
                                                                <textarea
                                                                    className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[60px]"
                                                                    value={info.value || ""}
                                                                    onChange={(e) => handleUpdateSampleInfo(sIdx, iIdx, e.target.value)}
                                                                    onBlur={handleRefreshPreview}
                                                                />
                                                            </div>
                                                        ) : (
                                                            <Field label={info.label} value={info.value} onChange={(v) => handleUpdateSampleInfo(sIdx, iIdx, v)} onBlur={handleRefreshPreview} />
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
                                                    className="w-full text-[10px] px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none"
                                                    placeholder="Thống nhất với IRDOP"
                                                    value={(ana as any).protocolId ? "" : ((ana as any).protocolCode || "")}
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
            src="data:image/png;base64,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"
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
