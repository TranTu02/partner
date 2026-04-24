import { useRef, useState, useMemo, useEffect } from "react";
import { X, Save, FileDown, HelpCircle, FileText, Lock, Unlock } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { useTranslation } from "react-i18next";
import { customerUpdateOrder } from "@/api/customer";
import { convertHtmlToPdfForm1 } from "@/api/index";
import { toast } from "sonner";

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

    useEffect(() => {
        if (isOpen) {
            setTempData(data);
        }
    }, [isOpen, data]);

    const initialHtml = useMemo(() => {
        if (tempData.requestForm && tempData.requestForm.trim().length > 0) {
            return tempData.requestForm;
        }
        return generateSampleRequestHtml(tempData, t);
    }, [tempData, t]);

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
            newAnalyses[aIdx] = { ...newAnalyses[aIdx], [field]: value };
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

    const handleSave = async () => {
        if (!editorRef.current) return;
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
                        contactEmail: tempData.contactEmail,
                    },
                    reportRecipient: {
                        receiverName: tempData.reportReceiverName,
                        receiverPhone: tempData.reportReceiverPhone,
                        receiverEmail: tempData.reportReceiverEmail,
                        receiverAddress: tempData.reportReceiverAddress,
                    },
                    samples: tempData.samples.map((s) => ({
                        sampleName: s.sampleName,
                        sampleDesc: s.sampleDesc,
                        analyses: s.analyses.map((a) => ({
                            parameterName: a.parameterName,
                            protocolCode: a.protocolCode,
                            analysisUnit: a.analysisUnit,
                        })),
                    })),
                    orderCustomerFileIds: tempData.orderCustomerFileIds,
                },
            });

            if (res.success) {
                toast.success(t("common.saveSuccess") || "Lưu thành công", { id: tid });
                if (onUpdateData) onUpdateData({ ...tempData, requestForm: content });
            } else {
                toast.error(res.error?.message || "Lỗi khi lưu", { id: tid });
            }
        } catch (e: any) {
            toast.error(e.message || "Lỗi máy chủ", { id: tid });
        } finally {
            setLoading(false);
        }
    };

    const isDirty = useMemo(() => {
        return JSON.stringify(tempData) !== JSON.stringify(data);
    }, [tempData, data]);

    const handleExportPdf = async () => {
        if (isDirty) {
            toast.error("Vui lòng nhấn 'Lưu' để cập nhật thay đổi trước khi xuất PDF");
            return;
        }

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

                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Layout Body */}
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
                            <Field label="Tên khách hàng" value={tempData.clientName} onChange={(v) => handleUpdateTopLevel("clientName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={tempData.clientAddress} onChange={(v) => handleUpdateTopLevel("clientAddress", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="SĐT" value={tempData.clientPhone} onChange={(v) => handleUpdateTopLevel("clientPhone", v)} onBlur={handleRefreshPreview} />
                                <Field label="Mã số thuế" value={tempData.taxCode} onChange={(v) => handleUpdateTopLevel("taxCode", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Liên hệ" color="green">
                            <Field label="Người liên hệ" value={tempData.contactPerson} onChange={(v) => handleUpdateTopLevel("contactPerson", v)} onBlur={handleRefreshPreview} />
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Số CCCD" value={tempData.contactIdentity} onChange={(v) => handleUpdateTopLevel("contactIdentity", v)} onBlur={handleRefreshPreview} />
                                <Field label="Điện thoại" value={tempData.contactPhone} onChange={(v) => handleUpdateTopLevel("contactPhone", v)} onBlur={handleRefreshPreview} />
                            </div>
                        </Section>

                        <Section title="Nhận báo cáo" color="yellow">
                            <Field label="Người nhận" value={tempData.reportReceiverName} onChange={(v) => handleUpdateTopLevel("reportReceiverName", v)} onBlur={handleRefreshPreview} />
                            <Field label="Địa chỉ" value={tempData.reportReceiverAddress} onChange={(v) => handleUpdateTopLevel("reportReceiverAddress", v)} onBlur={handleRefreshPreview} />
                        </Section>

                        <div className="space-y-4">
                            <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest pl-1">Danh sách mẫu</h4>
                            {tempData.samples.map((sample, sIdx) => (
                                <Section key={sIdx} title={`Mẫu ${sIdx + 1}`} color="indigo">
                                    <div className="grid grid-cols-2 gap-3 mb-4">
                                        <Field label="Tên mẫu" value={sample.sampleName} onChange={(v) => handleUpdateSample(sIdx, "sampleName", v)} onBlur={handleRefreshPreview} />
                                        <Field label="Ghi chú/Ma trận" value={sample.sampleNote || ""} onChange={(v) => handleUpdateSample(sIdx, "sampleNote", v)} onBlur={handleRefreshPreview} />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="block text-[10px] font-bold text-muted-foreground uppercase tracking-wider pl-0.5">Mô tả mẫu thử</label>
                                        <textarea
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-xs focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[80px]"
                                            value={sample.sampleDesc || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleDesc", e.target.value)}
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

                {/* Right Panel: Guide (Hidden on mobile) */}
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
                    <div className="text-xs font-bold text-foreground">Hỗ sơ gửi IRDOP:</div>
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

                    const accKeys =
                        analysis.sampleTypeName === (sample.sampleTypeName || (sample as any).sampleMatrix) && analysis.protocolAccreditation
                            ? Object.entries(analysis.protocolAccreditation)
                                  .filter(([, v]) => v)
                                  .map(([k]) => k)
                                  .join(", ")
                            : "";

                    return `
          <tr>
            ${sttCell}
            ${sampleCell}
            ${descCell}
            <td style="padding:5px; border: 1px solid #000 !important; width: 20%;">${analysis.parameterName || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: center; width: 7%;">${analysis.analysisUnit || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: left; width: 14%;">${analysis.protocolCode || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important; text-align: left; width: 10%;">
                 ${[analysis.protocolSource, accKeys].filter(Boolean).join(" ")}
            </td>
            <td style="padding:5px; border: 1px solid #000 !important; width: 10%;">${analysis.parameterNote || ""}</td>
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
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
                <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.clientAddress || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
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
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section4.taxName").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxName || data.client?.invoiceInfo?.taxName || ""}</td>
            </tr>
           <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.invoiceAddress || data.client?.invoiceInfo?.taxAddress || (data.client as any)?.invoiceAddress || ""}</td>
            </tr>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.taxId").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: 700;" class="field-dotted">${data.taxCode || data.client?.legalId || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: 700;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
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
              <th style="border: 1px solid #1e293b; padding: 8px 8px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 4%;">
                ${t("table.stt")}
              </th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 25%;">
                ${t("sample.name")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 10%;">
                ${t("sampleRequest.table.sampleDesc")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 20%;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 7%;">
                Đơn vị</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 14%;">
                Phương pháp</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 10%;">
                Công nhận</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 700; width: 10%;">
                ${t("sample.note")}</th>
            </tr>
          </thead>
          ${samplesHtml}
        </table>

        <div style="margin-top: 8px; margin-bottom: 12px; font-size: 11px; color: #333; padding-top: 6px;">
            <span style="font-weight: bold;">Chú thích:</span>
            <br/><span style="margin-left: 8px;"><b>IRDOP</b>: Chỉ tiêu được thực hiện tại IRDOP.</span>
            <br/><span style="margin-left: 8px;"><b>EX</b>: Chỉ tiêu được thực hiện bởi nhà thầu phụ.</span>
            <br/><span style="margin-left: 8px;"><b>VILAS997</b>: Chỉ tiêu được công nhận ISO/IEC 17025:2017.</span>
            <br/><span style="margin-left: 8px;"><b>TDC</b>: Chỉ tiêu được công nhận đánh giá sự phù hợp theo NĐ 107/2016/NĐ-CP.</span>
        </div>

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
