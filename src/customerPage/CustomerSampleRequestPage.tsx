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
import { useSearchParams, useNavigate } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { X, FileDown, HelpCircle, FileText, Lock, Unlock, ArrowLeft, UploadCloud, Loader2, ChevronDown, Tag } from "lucide-react";
import { useTranslation } from "react-i18next";
import Cookies from "js-cookie";
import { 
    customerGetOrderFull, 
    customerUpdateOrder, 
    customerMe, 
    CUSTOMER_TOKEN_KEY,
    customerUploadOrderDocument,
    customerGetOrderPresignUrl,
    buildFileUploadFormData
} from "@/api/customer";
import { convertHtmlToPdfForm1 } from "@/api/index";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { generateSampleRequestHtml } from "@/customerComponents/order/CustomerSampleRequestPrintPreviewModal";
import { toast } from "sonner";
import base64Images from "@/assets/base64Images.json";

// ─── Module-level constants (re-used from the modal) ─────────────────────────
const SAMPLE_INFO_ORDER = ["Tên mẫu thử", "Số lô", "Ngày sản xuất", "Hạn sử dụng", "Nơi sản xuất", "Địa chỉ sản xuất", "Số công bố", "Số đăng ký", "Thông tin khác"];

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

// Labels shown in left-panel form (Tên mẫu thử is handled via sampleName field, so skip here)
const DEFAULT_SAMPLE_INFO_LABELS = ["Số lô", "Ngày sản xuất", "Hạn sử dụng", "Nơi sản xuất", "Địa chỉ sản xuất", "Số công bố", "Số đăng ký", "Thông tin khác"];

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
    const [mobileTab, setMobileTab] = useState<"form" | "preview">("form");

    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [isUploading, setIsUploading] = useState(false);

    // Dropdown state for document category
    const [showDocMenu, setShowDocMenu] = useState(false);
    const [selectedDocCategory, setSelectedDocCategory] = useState<string>("Tiêu chuẩn cơ sở");
    const docMenuRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const DOC_CATEGORIES = [
        { label: "Tiêu chuẩn cơ sở", value: "Standard", color: "bg-blue-100 text-blue-700" },
        { label: "Đặc tả kỹ thuật",   value: "Specification", color: "bg-violet-100 text-violet-700" },
        { label: "Hợp đồng",          value: "Contract", color: "bg-orange-100 text-orange-700" },
        { label: "Chứng từ thanh toán", value: "Payment", color: "bg-emerald-100 text-emerald-700" },
    ];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleOutside = (e: MouseEvent) => {
            if (docMenuRef.current && !docMenuRef.current.contains(e.target as Node)) {
                setShowDocMenu(false);
            }
        };
        document.addEventListener("mousedown", handleOutside);
        return () => document.removeEventListener("mousedown", handleOutside);
    }, []);

    // Sync uploadedFiles when tempData.orderCustomerFiles changes
    useEffect(() => {
        if (tempData?.orderCustomerFiles) {
            setUploadedFiles(tempData.orderCustomerFiles);
        } else {
            setUploadedFiles([]);
        }
    }, [tempData?.orderCustomerFiles]);

    const handleUploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !tempData) return;

        const currentSize = uploadedFiles.reduce((acc, f) => acc + Number(f.fileSize || 0), 0);
        if (currentSize + file.size > 50 * 1024 * 1024) {
            toast.error("Tổng dung lượng tài liệu đính kèm vượt quá giới hạn 50MB.");
            return;
        }

        if (uploadedFiles.length >= 10) {
            toast.error("Mỗi đơn hàng tối đa chỉ được đính kèm 10 tệp tin.");
            return;
        }

        setIsUploading(true);
        const tid = toast.loading(`Đang tải "${selectedDocCategory}" lên...`);
        try {
            const formData = buildFileUploadFormData(file);
            // orderId: dùng tempData nếu có, fallback về URL param
            const resolvedOrderId = tempData.orderId || orderId;
            if (!resolvedOrderId) {
                toast.error("Không tìm thấy mã đơn hàng.", { id: tid });
                return;
            }
            formData.append("orderId", resolvedOrderId);
            formData.append("documentCategory", selectedDocCategory);

            // Map selected category label to its English tag value
            const selectedCatObj = DOC_CATEGORIES.find(c => c.label === selectedDocCategory);
            const tagValue = selectedCatObj ? selectedCatObj.value : "Standard";
            formData.append("fileTags", JSON.stringify([tagValue]));

            const res = await customerUploadOrderDocument({
                body: formData
            });

            const fileObj = res.data?.file;
            if (res.success && fileObj) {
                toast.success(`Đã tải "${selectedDocCategory}" lên thành công!`, { id: tid });
                const newFile = { ...fileObj, documentCategory: selectedDocCategory };

                setTempData(prev => {
                    if (!prev) return prev;
                    const oldIds = prev.orderCustomerFileIds || [];
                    const newIds = oldIds.includes(newFile.fileId) ? oldIds : [...oldIds, newFile.fileId];
                    const oldFiles = prev.orderCustomerFiles || [];
                    const newFiles = oldFiles.some((f: any) => f.fileId === newFile.fileId) ? oldFiles : [...oldFiles, newFile];
                    return { ...prev, orderCustomerFileIds: newIds, orderCustomerFiles: newFiles };
                });
            } else {
                toast.error(res.error?.message || "Tải tài liệu lên thất bại.", { id: tid });
            }
        } catch (err: any) {
            toast.error(err.message || "Lỗi kết nối khi tải tài liệu lên.", { id: tid });
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = "";
        }
    };

    const handleViewFile = async (fileId: string) => {
        try {
            const res = await customerGetOrderPresignUrl({ query: { fileId } });
            if (res.success && res.data?.url) {
                window.open(res.data.url, "_blank");
            } else {
                toast.error("Không thể lấy đường dẫn tải file.");
            }
        } catch (err: any) {
            toast.error("Lỗi khi lấy đường dẫn file.");
        }
    };

    const initialAnalysesRef = useRef<Record<string, { protocolCode: string | null; protocolId: string | null }>>({});

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
                const res = await customerGetOrderFull({ query: { orderId } });
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

                const contactPerson = isCpObj ? cp.contactName || "" : typeof cp === "string" ? cp : "";
                const contactPhone = isCpObj ? cp.contactPhone || "" : "";
                const contactEmail = isCpObj ? cp.contactEmail || "" : "";
                const contactAddress = isCpObj ? cp.contactAddress || "" : "";
                const contactPosition = isCpObj ? cp.contactPosition || "" : "";
                const reportReceiverName = (isRecObj ? receiver.receiverName : "") || (isCpObj ? cp.contactName : "") || "";
                const reportReceiverPhone = (isRecObj ? receiver.receiverPhone : "") || (isCpObj ? cp.contactPhone : "") || "";
                const reportReceiverEmail = (isRecObj ? receiver.receiverEmail : "") || client?.clientEmail || "";
                const reportReceiverAddress = (isRecObj ? receiver.receiverAddress : "") || client?.clientAddress || "";

                const otherItems = order.otherItems ?? [];
                const defaultNote = otherItems.map((item: any) => item.itemName).join(", ");

                const data: any = {
                    orderId: String(order.orderId ?? order.id ?? ""),
                    createdAt: order.createdAt,
                    client,
                    requestForm: order.requestForm || "",

                    contactPerson,
                    contactPhone,
                    contactIdentity: isCpObj ? cp.contactId || cp.identityId || "" : "",
                    contactEmail,
                    contactAddress,
                    contactPosition,
                    reportEmail: contactEmail,

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

                    attachedDocuments: order.attachedDocuments || "",

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
                        sampleNote: (s?.sampleNote ?? s?.sample_note) || defaultNote || "",
                        sampleDesc: s?.sampleDesc ?? "",
                        sampleInfo: normalizeSampleInfo(s?.sampleName ?? "", parseSampleInfo(s?.sampleInfo)),
                        analyses: (s?.analyses ?? []).map((a: any) => ({
                            ...a,
                            id: a?.id ?? a?.analysisId ?? a?.analysis_id ?? undefined,
                            protocolId: a?.protocolId ?? a?.protocol_id ?? a?.protocol?.protocolId ?? a?.protocol?.protocol_id ?? a?.libraryParameterProtocol?.protocolId ?? a?.libraryParameterProtocol?.protocol_id ?? null,
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
                    orderCustomerFiles: order.orderCustomerFiles || [],

                    rawSamples: order.samples ?? [],
                    rawContactPerson: order.contactPerson ?? null,
                    otherItems,
                };

                // Snapshot original protocol values per analysis ID
                initialAnalysesRef.current = {};
                data.samples.forEach((s: any) => {
                    (s.analyses || []).forEach((a: any) => {
                        if (a.id) {
                            initialAnalysesRef.current[a.id] = {
                                protocolCode: a.protocolCode || null,
                                protocolId: a.protocolId || null,
                            };
                        }
                    });
                });

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
            const updatedSample = { ...newSamples[idx], [field]: value };
            // Keep Tên mẫu thử in sampleInfo in sync with sampleName
            if (field === "sampleName") {
                updatedSample.sampleInfo = normalizeSampleInfo(value, parseSampleInfo(updatedSample.sampleInfo));
            }
            newSamples[idx] = updatedSample;
            return { ...prev, samples: newSamples };
        });
        setIsDirty(true);
    }, []);

    const handleUpdateAnalysis = useCallback((sIdx: number, aIdx: number, field: string, value: string) => {
        setTempData((prev) => {
            if (!prev) return prev;
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

    // ── Auto-refresh TinyMCE preview whenever tempData changes (live update) ──
    // Only runs in locked mode so we don't overwrite direct TinyMCE edits.
    // Debounced 300ms so rapid keystrokes don't cause flickering.
    useEffect(() => {
        if (!editorReady || !tempData || !isLocked) return;
        const timer = setTimeout(() => {
            if (editorRef.current) {
                editorRef.current.setContent(generateSampleRequestHtml(tempData, t));
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [tempData, editorReady, isLocked, t]);

    const handleSave = async (): Promise<boolean> => {
        if (!editorRef.current || !tempData) return false;
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
                        ...(tempData as any)?.rawContactPerson,
                        contactName: tempData.contactPerson,
                        contactPhone: tempData.contactPhone,
                        contactId: tempData.contactIdentity,
                        contactEmail: (tempData as any).contactEmail,
                    },
                    reportRecipient: {
                        receiverName: (tempData as any).reportReceiverName,
                        receiverPhone: (tempData as any).reportReceiverPhone,
                        receiverEmail: (tempData as any).reportReceiverEmail,
                        receiverAddress: (tempData as any).reportReceiverAddress,
                    },
                    attachedDocuments: (tempData as any).attachedDocuments,
                    samples: tempData.samples.map((s, sIdx) => {
                        const finalInfo = normalizeSampleInfo(s.sampleName || "", parseSampleInfo(s.sampleInfo));
                        const apiInfo = finalInfo.filter((info) => info.label === "Tên mẫu thử" || (info.value && info.value.trim() !== ""));
                        return {
                            ...s,
                            ...(tempData as any)?.rawSamples?.[sIdx],
                            sampleName: s.sampleName,
                            sampleNote: s.sampleNote,
                            sampleDesc: (s as any).sampleDesc,
                            sampleInfo: apiInfo,
                            analyses: s.analyses.map((a: any, aidx: number) => ({
                                ...a,
                                ...(tempData as any)?.rawSamples?.[sIdx]?.analyses?.[aidx],
                                parameterName: a.parameterName,
                                protocolCode: a.protocolCode,
                                protocolId: a.protocolId,
                                analysisUnit: a.analysisUnit,
                            })),
                        };
                    }),
                    orderCustomerFileIds: tempData.orderCustomerFileIds,
                },
            });
            if (res.success) {
                toast.success("Đã lưu phiếu gửi mẫu", { id: tid });
                setIsDirty(false);
                return true;
            } else {
                toast.error(res.error?.message || "Lưu thất bại", { id: tid });
                return false;
            }
        } catch (e: any) {
            toast.error(e?.message || "Lỗi khi lưu", { id: tid });
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        // Auto save before export
        const isSaved = await handleSave();
        if (!isSaved || !editorRef.current || !tempData) return;
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

                    <button
                        onClick={() => navigate(`/customer/orders/detail?orderId=${tempData.orderId}`)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-all text-xs font-medium text-muted-foreground"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        <span className="hidden sm:inline">Quay lại</span>
                    </button>
                </div>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex lg:hidden border-b border-border bg-card shrink-0 p-3 gap-3 shadow-sm z-10">
                <button
                    onClick={() => setMobileTab("form")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mobileTab === "form" ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    Nhập thông tin
                </button>
                <button
                    onClick={() => setMobileTab("preview")}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all ${mobileTab === "preview" ? "bg-primary text-primary-foreground shadow-md ring-2 ring-primary/20" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}
                >
                    Bản in PDF
                </button>
            </div>

            {/* Layout Body — y hệt modal */}
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
                <div className={`${mobileTab === "form" ? "flex" : "hidden"} lg:flex w-full lg:w-[550px] flex-col border-r border-border bg-white overflow-hidden shrink-0 shadow-sm`}>
                    <div className="px-5 py-3 border-b border-border bg-gray-50/50 flex items-center justify-between">
                        <h3 className="font-bold text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4 text-primary" />
                            Thông tin phiếu
                        </h3>

                        {/* ── Split-button dropdown for uploading inside the header ── */}
                        <div ref={docMenuRef} className="relative z-10">
                            <div className={`flex rounded-md overflow-hidden shadow-sm border border-primary bg-white ${isUploading ? "opacity-50 pointer-events-none" : ""}`}>
                                {/* Main action: trigger file picker with current category */}
                                <label
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-foreground hover:bg-gray-50 text-xs font-semibold cursor-pointer transition-colors select-none"
                                    title={`Tải lên: ${selectedDocCategory}`}
                                >
                                    {isUploading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-primary" />
                                    ) : (
                                        <UploadCloud className="w-3.5 h-3.5 shrink-0 text-primary" />
                                    )}
                                    <span className="truncate max-w-[200px] text-foreground font-semibold">
                                        {isUploading ? "Đang tải lên..." : `Tải lên: ${selectedDocCategory}`}
                                    </span>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        onChange={handleUploadDocument}
                                        disabled={isUploading}
                                    />
                                </label>

                                {/* Chevron — opens category selector */}
                                <button
                                    type="button"
                                    onClick={() => setShowDocMenu(v => !v)}
                                    className="px-2 py-1.5 bg-white hover:bg-gray-50 text-primary border-l border-primary/25 transition-colors flex items-center"
                                    title="Chọn loại tài liệu"
                                    aria-label="Chọn loại tài liệu"
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Dropdown menu */}
                            {showDocMenu && (
                                <div className="absolute right-0 top-full mt-1 w-52 z-50 bg-white border border-border rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                                    <div className="px-3 py-1.5 border-b border-border bg-muted/30">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Chọn loại tài liệu</p>
                                    </div>
                                    {DOC_CATEGORIES.map(({ label, color }) => (
                                        <button
                                            key={label}
                                            type="button"
                                            onClick={() => {
                                                setSelectedDocCategory(label);
                                                setShowDocMenu(false);
                                                // Trigger file picker after category is chosen
                                                setTimeout(() => fileInputRef.current?.click(), 50);
                                            }}
                                            className={`w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors ${
                                                selectedDocCategory === label ? "bg-primary/5" : ""
                                            }`}
                                        >
                                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${color}`}>
                                                <Tag className="w-2 h-2" />
                                                {label}
                                            </span>
                                            {selectedDocCategory === label && (
                                                <span className="ml-auto text-[9px] text-primary font-bold">✓</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-5 space-y-6 scroll-smooth">
                        {/* Danh sách tệp đã tải lên — hiển thị ngay dưới tiêu đề nếu có */}
                        {uploadedFiles.length > 0 && (
                            <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3.5 space-y-2">
                                <h4 className="text-[10px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                                    <FileText className="w-3.5 h-3.5" />
                                    Tài liệu đã đính kèm ({uploadedFiles.length})
                                </h4>
                                <div className="grid grid-cols-1 gap-2 max-h-[160px] overflow-y-auto pr-1">
                                    {uploadedFiles.map((file, idx) => {
                                        const fileTags = file.fileTags || [];
                                        const cat = DOC_CATEGORIES.find(c => fileTags.includes(c.value) || c.label === file.documentCategory);
                                        return (
                                            <div
                                                key={file.fileId || idx}
                                                onClick={() => handleViewFile(file.fileId)}
                                                className="flex items-center gap-2 p-2 bg-white border border-blue-100/70 rounded-lg cursor-pointer hover:bg-blue-50/50 hover:border-blue-200 transition-all group shadow-sm"
                                                title="Nhấn để xem tệp"
                                            >
                                                <FileText className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-[11px] font-semibold text-foreground truncate group-hover:text-primary transition-colors">{file.fileName}</p>
                                                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                                        {cat && (
                                                            <span className={`inline-flex items-center gap-0.5 px-1 py-0.2 rounded text-[8px] font-bold ${cat.color}`}>
                                                                <Tag className="w-1.5 h-1.5" />
                                                                {cat.label}
                                                            </span>
                                                        )}
                                                        <span className="text-[9px] text-muted-foreground">
                                                            {file.fileSize ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB` : ""}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

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
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Mô tả mẫu thử</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[48px]"
                                            placeholder="Nhập mô tả mẫu thử..."
                                            value={(sample as any).sampleDesc || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleDesc", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>
                                    <div className="space-y-1.5 mb-4">
                                        <label className="block text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Ghi chú</label>
                                        <textarea
                                            rows={2}
                                            className="w-full px-3 py-2 border border-border rounded-lg bg-white text-sm focus:ring-1 focus:ring-primary outline-none transition-all resize-none min-h-[48px]"
                                            placeholder="Nhập ghi chú..."
                                            value={sample.sampleNote || ""}
                                            onChange={(e) => handleUpdateSample(sIdx, "sampleNote", e.target.value)}
                                            onBlur={handleRefreshPreview}
                                        />
                                    </div>

                                    <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-4 p-4 bg-muted/20 rounded-xl border border-border/50 shadow-inner">
                                        {DEFAULT_SAMPLE_INFO_LABELS.map((label) => {
                                            const info = (sample.sampleInfo || []).find((i) => i.label === label);
                                            const isTextArea = label === "Thông tin khác";
                                            return (
                                                <div key={label} className={isTextArea ? "col-span-2" : "col-span-1"}>
                                                    <label className="block mb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
                                                    {isTextArea ? (
                                                        <textarea
                                                            className="w-full px-3 py-2 border border-border rounded-lg bg-gray-50/50 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none resize-none min-h-[60px]"
                                                            value={info?.value || ""}
                                                            onChange={(e) => handleUpdateSampleInfoByLabel(sIdx, label, e.target.value)}
                                                            onBlur={handleRefreshPreview}
                                                        />
                                                    ) : (
                                                        <input
                                                            type="text"
                                                            className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none"
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
                                        <div className="p-2 bg-muted/30 grid grid-cols-[1fr_120px_70px] gap-2 items-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                            <div>Chỉ tiêu</div>
                                            <div>Phương pháp</div>
                                            <div>Đơn vị</div>
                                        </div>
                                        {sample.analyses.map((ana: any, aIdx: number) => (
                                            <div key={aIdx} className="p-2 bg-card grid grid-cols-[1fr_120px_70px] gap-2 items-center">
                                                <input
                                                    className="w-full text-xs px-1.5 py-1 border border-transparent bg-transparent font-medium truncate"
                                                    value={ana.parameterName || ""}
                                                    readOnly
                                                />
                                                    <input
                                                        className="w-full text-xs px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none"
                                                        placeholder="Thống nhất với IRDOP"
                                                        value={(ana as any).protocolId ? "" : ((ana as any).protocolCode || "")}
                                                        onChange={(e) => handleUpdateAnalysis(sIdx, aIdx, "protocolCode", e.target.value)}
                                                        onBlur={handleRefreshPreview}
                                                    />
                                                <input
                                                    className="w-full text-xs px-1.5 py-1 border border-border rounded bg-white focus:ring-1 focus:ring-primary outline-none"
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
                <div className={`${mobileTab === "preview" ? "flex" : "hidden"} lg:flex flex-1 overflow-x-auto overflow-y-auto bg-muted/30 justify-start lg:justify-center p-4 md:p-8 pt-16 md:pt-20`}>
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

// ── Sub-components (copied from modal) ──

function Section({ title, children, color }: { title: string; children: any; color: string }) {
    const colors: any = {
        blue: "bg-blue-50 text-blue-700 border-blue-100",
        green: "bg-green-50 text-green-700 border-green-100",
        yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
        indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
        purple: "bg-purple-50 text-purple-700 border-purple-100",
    };
    return (
        <div className="bg-card rounded-xl border border-border p-4 shadow-sm relative pt-6 animate-in fade-in duration-500">
            <div className={`absolute top-0 left-0 px-2.5 py-0.5 rounded-br-lg text-[10px] font-black uppercase tracking-widest ${colors[color] || colors.blue}`}>{title}</div>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function Field({ label, value, onChange, onBlur }: { label: string; value?: string; onChange: (v: string) => void; onBlur?: () => void }) {
    return (
        <div>
            <label className="block mb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{label}</label>
            <input
                type="text"
                className="w-full px-3 py-1.5 border border-border rounded-lg bg-gray-50/50 text-sm focus:bg-white focus:ring-1 focus:ring-primary transition-all outline-none"
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
