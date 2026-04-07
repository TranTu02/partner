import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { CustomerSampleCard } from "./CustomerSampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { OtherItemsSection } from "@/components/order/OtherItemsSection";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { CustomerOrderPrintPreviewModal } from "./CustomerOrderPrintPreviewModal";
import { CustomerSampleRequestPrintPreviewModal } from "./CustomerSampleRequestPrintPreviewModal";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import type { Matrix } from "@/types/parameter";
import type { EditorMode } from "@/components/order/OrderEditor";
import type { SampleWithQuantity, AnalysisWithQuantity } from "./CustomerSampleCard";
import { useTranslation } from "react-i18next";
import { customerCreateOrder, customerUpdateOrder, customerGetQuoteDetail } from "@/api/customer";
import type { OtherItem } from "@/types/order";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface CustomerOrderEditorProps {
    mode: EditorMode;
    initialData?: any;
    onSaveSuccess?: (data?: any) => void;
    onBack?: () => void;
    initialQuoteId?: string;
}

export interface CustomerOrderEditorRef {
    save: () => void;
    export: () => void;
    exportSampleRequest: () => void;
    hasUnsavedChanges: () => boolean;
}

export const CustomerOrderEditor = forwardRef<CustomerOrderEditorRef, CustomerOrderEditorProps>(
    ({ mode, initialData, onSaveSuccess, initialQuoteId }, ref) => {
        const { t } = useTranslation();
        const [internalMode, setInternalMode] = useState<EditorMode>(mode);
        const isReadOnly = internalMode === "view";
        useEffect(() => { setInternalMode(mode); }, [mode]);

        // Customer profile from localStorage — no client picker
        const customerInfo = (() => {
            try { return JSON.parse(localStorage.getItem("customer") || "{}"); } catch { return {}; }
        })();

        // Client snapshot fields (editable in create/edit mode)
        const [clientAddress, setClientAddress] = useState(initialData?.client?.clientAddress || customerInfo?.clientAddress || "");
        const [clientPhone, setClientPhone] = useState(initialData?.client?.clientPhone || customerInfo?.clientPhone || "");
        const [clientEmail, setClientEmail] = useState(initialData?.client?.clientEmail || customerInfo?.clientEmail || "");
        const [taxName, setTaxName] = useState(initialData?.client?.invoiceInfo?.taxName || customerInfo?.invoiceInfo?.taxName || customerInfo?.clientName || "");
        const [taxCode, setTaxCode] = useState(initialData?.client?.invoiceInfo?.taxCode || customerInfo?.invoiceInfo?.taxCode || customerInfo?.legalId || "");
        const [taxAddress, setTaxAddress] = useState(initialData?.client?.invoiceInfo?.taxAddress || customerInfo?.invoiceInfo?.taxAddress || customerInfo?.clientAddress || "");
        const [taxEmail, setTaxEmail] = useState(initialData?.client?.invoiceInfo?.taxEmail || customerInfo?.invoiceInfo?.taxEmail || "");

        // Contact
        const defaultContact = initialData?.contactPerson || customerInfo?.clientContacts?.[0] || {};
        const [contactPerson, setContactPerson] = useState(defaultContact.contactName || "");
        const [contactPhone, setContactPhone] = useState(defaultContact.contactPhone || "");
        const [contactEmail, setContactEmail] = useState(defaultContact.contactEmail || "");
        const [contactAddress, setContactAddress] = useState(defaultContact.contactAddress || "");
        const [contactId, setContactId] = useState(defaultContact.contactId || "");

        // Report Recipient
        const [reportRecipient, setReportRecipient] = useState<any>(initialData?.reportRecipient || {
            receiverName: "",
            receiverPhone: "",
            receiverEmail: "",
            receiverAddress: ""
        });

        // Quote ID for create mode
        const [quoteId, setQuoteId] = useState(initialData?.quoteId || initialQuoteId || "");
        const [orderNote, setOrderNote] = useState(initialData?.orderNote || "");

        const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
        const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0);
        const [otherItems, setOtherItems] = useState<OtherItem[]>([]);

        // Print
        const [previewData, setPreviewData] = useState<OrderPrintData | null>(null);
        const [isPreviewOpen, setIsPreviewOpen] = useState(false);
        const [isSampleRequestPreviewOpen, setIsSampleRequestPreviewOpen] = useState(false);

        // UI
        const [isModalOpen, setIsModalOpen] = useState(false);
        const [currentSampleIndex, setCurrentSampleIndex] = useState<number | null>(null);
        const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

        const orderId = initialData?.orderId;

        // Populate from initialData
        useEffect(() => {
            if (initialData) {
                setClientAddress(initialData.client?.clientAddress || customerInfo?.clientAddress || "");
                setClientPhone(initialData.client?.clientPhone || customerInfo?.clientPhone || "");
                setClientEmail(initialData.client?.clientEmail || customerInfo?.clientEmail || "");
                if (initialData.client?.invoiceInfo) {
                    setTaxName(initialData.client.invoiceInfo.taxName || "");
                    setTaxCode(initialData.client.invoiceInfo.taxCode || "");
                    setTaxAddress(initialData.client.invoiceInfo.taxAddress || "");
                    setTaxEmail(initialData.client.invoiceInfo.taxEmail || "");
                }
                const contact = initialData.contactPerson || customerInfo?.clientContacts?.[0];
                if (contact) {
                    setContactPerson(contact.contactName || "");
                    setContactPhone(contact.contactPhone || "");
                    setContactEmail(contact.contactEmail || "");
                    setContactAddress(contact.contactAddress || "");
                    setContactId(contact.contactId || "");
                }
                if (initialData.reportRecipient) setReportRecipient({
                    receiverName: initialData.reportRecipient.receiverName || "",
                    receiverPhone: initialData.reportRecipient.receiverPhone || "",
                    receiverEmail: initialData.reportRecipient.receiverEmail || "",
                    receiverAddress: initialData.reportRecipient.receiverAddress || ""
                });
                if (initialData.orderNote) setOrderNote(initialData.orderNote);
                if (initialData.quoteId) setQuoteId(initialData.quoteId);
                if (initialData.samples?.length > 0) {
                    setSamples(initialData.samples.map((s: any) => {
                        // Merge existing info with defaults
                        const existingInfo = s.sampleInfo || [];
                        const mergedInfo = [...defaultSampleInfo];
                        
                        existingInfo.forEach((item: any) => {
                            const idx = mergedInfo.findIndex(m => m.label === item.label);
                            if (idx !== -1) {
                                mergedInfo[idx] = { ...mergedInfo[idx], value: item.value };
                            } else {
                                mergedInfo.push(item);
                            }
                        });

                        return {
                            ...s,
                            id: s.id || `rs-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            sampleInfo: mergedInfo,
                            analyses: (s.analyses || []).map((a: any) => {
                                const qty = a.quantity || 1;
                                const taxRate = a.taxRate !== undefined ? a.taxRate : parseFloat(a.parameterTaxRate || "0");
                                let unitPrice = a.unitPrice !== undefined ? Number(a.unitPrice) : Number(a.parameterPrice) || 0;
                                if (!unitPrice && a.feeAfterTax) unitPrice = Number(a.feeAfterTax) / qty / (1 + taxRate / 100);
                                if (!unitPrice && a.feeBeforeTax && typeof a.feeBeforeTax === "number") unitPrice = a.feeBeforeTax / qty;
                                return { 
                                    ...a, 
                                    id: a.id || `ra-${Date.now()}-${Math.random().toString(36).slice(2)}`, 
                                    unitPrice, 
                                    feeBeforeTax: unitPrice * qty, 
                                    feeAfterTax: a.feeAfterTax || unitPrice * qty * (1 + taxRate / 100), 
                                    taxRate, 
                                    quantity: qty 
                                };
                            }),
                        };
                    }));
                }
                if (initialData.discountRate !== undefined) setDiscountRate(initialData.discountRate);
                if (Array.isArray(initialData.otherItems)) setOtherItems(initialData.otherItems);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [initialData]);

        // Auto-load from quote if initialQuoteId provided on create
        useEffect(() => {
            if (mode === "create" && initialQuoteId && !initialData) {
                handleLoadQuote(initialQuoteId);
            }
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [mode, initialQuoteId]);

        useEffect(() => {
            if (!isReadOnly && samples.length > 0) setHasUnsavedChanges(true);
        }, [samples, isReadOnly]);

        // Pricing
        const calculatePricing = () => {
            let totalFeeBeforeTax = 0, sumVAT = 0;
            samples.forEach((sample) => {
                sample.analyses.forEach((a) => {
                    const qty = Number(a.quantity || 1);
                    const up = Number(a.unitPrice || 0);
                    const dr = Number(a.discountRate || 0);
                    const tr = Number(a.taxRate || 0);
                    const lineNet = up * qty * (1 - dr / 100);
                    totalFeeBeforeTax += lineNet;
                    sumVAT += lineNet * (tr / 100);
                });
            });
            const discountAmount = totalFeeBeforeTax * (discountRate / 100);
            const feeAfterDiscount = totalFeeBeforeTax - discountAmount;
            const totalTax = sumVAT * (1 - discountRate / 100);
            let otherFee = 0, otherVAT = 0;
            otherItems.forEach((i) => {
                otherFee += Number(i.feeBeforeTax || 0);
                otherVAT += (Number(i.feeBeforeTax || 0) * Number(i.taxRate || 0)) / 100;
            });
            return { subtotal: totalFeeBeforeTax, discountAmount, feeBeforeTax: feeAfterDiscount + otherFee, tax: totalTax + otherVAT, total: feeAfterDiscount + totalTax + otherFee + otherVAT };
        };
        const pricing = calculatePricing();

        // Load from customer quote
        const handleLoadQuote = async (argId?: string) => {
            if (isReadOnly) return;
            const idToUse = argId || quoteId;
            if (!idToUse?.trim()) { toast.error("Vui lòng nhập mã báo giá"); return; }
            try {
                const response = await customerGetQuoteDetail({ query: { quoteId: idToUse } });
                if (response.success && response.data) {
                    const q: any = response.data;
                    if (q.client) {
                        setClientAddress(q.client.clientAddress || "");
                        setClientPhone(q.client.clientPhone || "");
                        setClientEmail(q.client.clientEmail || "");
                        if (q.client.invoiceInfo) {
                            setTaxName(q.client.invoiceInfo.taxName || "");
                            setTaxCode(q.client.invoiceInfo.taxCode || "");
                            setTaxAddress(q.client.invoiceInfo.taxAddress || "");
                            setTaxEmail(q.client.invoiceInfo.taxEmail || "");
                        }
                    }
                    const contact = q.contactPerson || q.client?.clientContacts?.[0];
                    if (contact) {
                        setContactPerson(contact.contactName || "");
                        setContactPhone(contact.contactPhone || "");
                        setContactEmail(contact.contactEmail || "");
                        setContactAddress(contact.contactAddress || "");
                    }
                    setDiscountRate(q.discountRate || 0);
                    const expandedSamples: SampleWithQuantity[] = [];
                    (q.samples || []).forEach((s: any) => {
                        const qty = Number(s.quantity) || 1;
                        for (let i = 0; i < qty; i++) {
                            expandedSamples.push({
                                id: `temp-sample-${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
                                sampleId: undefined,
                                sampleName: s.sampleName || s.name || "Mẫu",
                                sampleNote: s.sampleNote || "",
                                analyses: (s.analyses || []).map((a: any) => ({
                                    ...a,
                                    id: `temp-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
                                    unitPrice: Number(a.unitPrice) || Number(a.parameterPrice) || 0,
                                    quantity: Number(a.quantity) || 1,
                                    discountRate: Number(a.discountRate) || 0,
                                    taxRate: Number(a.taxRate) || Number(a.parameterTaxRate) || 0,
                                })),
                            });
                        }
                    });
                    setSamples(expandedSamples);
                    toast.success("Đã tải thông tin từ báo giá");
                } else {
                    toast.error("Không tìm thấy báo giá");
                }
            } catch {
                toast.error("Lỗi tải báo giá");
            }
        };

        // Sample handlers
        const defaultSampleInfo = [
            { label: "Số lô", value: "" },
            { label: "Ngày sản xuất", value: "" },
            { label: "Nơi sản xuất", value: "" },
            { label: "Hạn sử dụng", value: "" },
            { label: "Số công bố", value: "" },
            { label: "Số đăng ký", value: "" },
            { label: "Thông tin khác", value: "" },
        ];

        const handleAddSample = () => {
            if (isReadOnly) return;
            setSamples([...samples, { 
                id: `S${Date.now()}`, 
                sampleId: undefined, 
                sampleName: "", 
                sampleNote: "", 
                sampleInfo: [...defaultSampleInfo],
                analyses: [] 
            }]);
        };
        const handleRemoveSample = useCallback((id: string) => { if (!isReadOnly) setSamples(samples.filter((s) => s.id !== id)); }, [isReadOnly, samples]);
        const handleUpdateSample = useCallback((id: string, updates: Partial<SampleWithQuantity>) => { if (!isReadOnly) setSamples(samples.map((s) => s.id === id ? { ...s, ...updates } : s)); }, [isReadOnly, samples]);
        const handleDuplicateSample = useCallback((id: string, count: number = 1) => {
            if (isReadOnly) return;
            const src = samples.find((s) => s.id === id);
            if (!src) return;
            const copies: SampleWithQuantity[] = [];
            for (let i = 0; i < count; i++) {
                const ts = Date.now() + i;
                copies.push({ ...src, id: `S${ts}`, sampleId: undefined, analyses: src.analyses.map((a, idx) => ({ ...a, id: `${a.parameterId}_copy_${ts}_${idx}` })) });
            }
            setSamples([...samples, ...copies]);
        }, [isReadOnly, samples]);
        const handleRemoveAnalysis = (sampleId: string, analysisId: string) => {
            if (isReadOnly) return;
            setSamples(samples.map((s) => s.id === sampleId ? { ...s, analyses: s.analyses.filter((a) => a.parameterId !== analysisId && a.id !== analysisId) } : s));
        };
        const handleOpenModal = (idx: number) => { if (!isReadOnly) { setCurrentSampleIndex(idx); setIsModalOpen(true); } };
        const handleAddAnalyses = (items: Matrix[]) => {
            if (currentSampleIndex === null) return;
            const sample = samples[currentSampleIndex];
            const ts = Date.now();
            const newAnalyses: AnalysisWithQuantity[] = items.map((m, i) => {
                const taxRate = Number(m.taxRate || 0);
                const feeAfterTax = Number((m as any).feeAfterTax || 0);
                let unitPrice = Number(m.feeBeforeTax || (m as any).unitPrice || 0);
                if (!unitPrice && feeAfterTax) unitPrice = feeAfterTax / (1 + taxRate / 100);
                return { ...m, id: `temp-analysis-${ts}-${Math.random().toString(36).slice(2)}-${i}`, unitPrice, feeBeforeTax: unitPrice, taxRate, feeAfterTax: feeAfterTax || unitPrice * (1 + taxRate / 100), quantity: 1 };
            });
            const updatedSamples = [...samples];
            updatedSamples[currentSampleIndex] = { ...sample, analyses: [...sample.analyses, ...newAnalyses] };
            setSamples(updatedSamples);
        };

        const buildClientSnapshot = () => ({
            clientId: customerInfo?.clientId,
            clientName: customerInfo?.clientName,
            clientAddress,
            clientPhone,
            clientEmail,
            legalId: customerInfo?.legalId,
            invoiceInfo: { taxName, taxCode, taxAddress, taxEmail },
        });

        const prepareExportData = (): OrderPrintData => ({
            orderId,
            createdAt: initialData?.createdAt,
            client: buildClientSnapshot() as any,
            contactPerson,
            contactPhone,
            contactId,
            contactEmail,
            contactAddress,
            reportEmail: contactEmail,
            contactPosition: "",
            clientAddress,
            taxName,
            taxCode,
            invoiceAddress: taxAddress,
            samples: samples.map((s) => {
                const cleanInfo = (s.sampleInfo || []).filter((info) => info.label && info.value && info.value.trim() !== "");
                const finalInfo = [
                    { label: "Tên mẫu thử", value: s.sampleName || "" },
                    ...cleanInfo.filter((info) => info.label !== "Tên mẫu thử"),
                ];
                return {
                    sampleName: s.sampleName || "",
                    sampleNote: s.sampleNote || "",
                    sampleInfo: finalInfo,
                    analyses: s.analyses.map((a) => {
                        const qty = Number(a.quantity) || 1;
                        const up = Number(a.unitPrice) || 0;
                        const dr = Number(a.discountRate) || 0;
                        const tr = Number(a.taxRate) || 0;
                        const feeNet = up * qty * (1 - dr / 100);
                        return { 
                            parameterName: a.parameterName, 
                            parameterId: a.parameterId, 
                            feeBeforeTax: feeNet, 
                            feeBeforeTaxAndDiscount: up * qty, 
                            taxRate: tr, 
                            feeAfterTax: a.feeAfterTax || feeNet * (1 + tr / 100), 
                            discountRate: dr, 
                            quantity: qty, 
                            unitPrice: up, 
                            protocolCode: a.protocolCode 
                        };
                    }),
                };
            }),
            pricing,
            discountRate,
            orderUri: initialData?.orderUri || "",
            requestForm: initialData?.requestForm || "",
            otherItems,
        } as any);

        const handleExport = () => { setPreviewData(prepareExportData()); setIsPreviewOpen(true); };
        const handleExportSampleRequest = () => { setPreviewData(prepareExportData()); setIsSampleRequestPreviewOpen(true); };

        const handleSave = async () => {
            if (isReadOnly) return;
            if (samples.length === 0) { toast.error("Vui lòng thêm ít nhất một mẫu"); return; }

            const { discount: _d, ...rest } = initialData || {};
            const orderData = {
                ...rest,
                ...(mode === "create" ? {} : { orderId }),
                orderStatus: mode === "create" ? "pending" : initialData?.orderStatus || "pending",
                clientId: customerInfo?.clientId,
                client: buildClientSnapshot(),
                contactPerson: { contactName: contactPerson, contactPhone, contactEmail, contactAddress, contactId },
                reportRecipient,
                quoteId: quoteId || undefined,
                orderNote: orderNote?.trim() || null,
                samples: samples.map((s) => {
                    // Filter out empty sample info
                    const cleanInfo = (s.sampleInfo || []).filter((info) => info.label && info.value && info.value.trim() !== "");
                    // Ensure "Tên mẫu thử" is always present and matches sampleName
                    const finalInfo = [
                        { label: "Tên mẫu thử", value: s.sampleName || "" },
                        ...cleanInfo.filter((info) => info.label !== "Tên mẫu thử"),
                    ];

                    const { id: _, ...rest } = s;
                    return {
                        ...rest,
                        sampleInfo: finalInfo,
                        analyses: s.analyses.map((a) => ({
                            ...a,
                            unitPrice: Number(a.unitPrice) || 0,
                            discountRate: Number(a.discountRate) || 0,
                            feeBeforeTax: (Number(a.unitPrice) || 0) * (Number(a.quantity) || 1) * (1 - (Number(a.discountRate) || 0) / 100),
                            feeBeforeTaxAndDiscount: (Number(a.unitPrice) || 0) * (Number(a.quantity) || 1),
                            taxRate: a.taxRate || 0,
                            feeAfterTax: (Number(a.unitPrice) || 0) * (Number(a.quantity) || 1) * (1 - (Number(a.discountRate) || 0) / 100) * (1 + (a.taxRate || 0) / 100),
                        })),
                    };
                }),
                discountRate,
                otherItems,
                totalFeeBeforeTax: pricing.subtotal,
                totalDiscountValue: pricing.discountAmount,
                totalFeeBeforeTaxAndDiscount: pricing.feeBeforeTax,
                totalTaxValue: pricing.tax,
                totalAmount: pricing.total,
            };

            try {
                const response = mode === "create"
                    ? await customerCreateOrder({ body: orderData })
                    : await customerUpdateOrder({ body: orderData });

                if (response.success) {
                    toast.success(mode === "create" ? "Tạo báo giá thành công" : "Cập nhật báo giá thành công");
                    setHasUnsavedChanges(false);
                    setInternalMode("view");
                    onSaveSuccess?.(response.data);
                } else {
                    toast.error((response.error as any)?.message || "Lưu đơn hàng thất bại");
                }
            } catch {
                toast.error("Lỗi kết nối server");
            }
        };

        useImperativeHandle(ref, () => ({ save: handleSave, export: handleExport, exportSampleRequest: handleExportSampleRequest, hasUnsavedChanges: () => hasUnsavedChanges }));

        return (
            <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
                <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
                    <div className="space-y-6">
                        {/* Quote Lookup (create mode only) */}
                        {!isReadOnly && mode === "create" && (
                            <div className="bg-card rounded-lg border border-border p-4 md:p-6">
                                <h3 className="mb-4 text-base font-semibold">Liên kết Báo giá</h3>
                                <div>
                                    <label className="block mb-2 text-sm font-medium text-foreground">Mã báo giá</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-1 px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                            value={quoteId}
                                            onChange={(e) => setQuoteId(e.target.value)}
                                            placeholder="Nhập mã báo giá để tự động điền thông tin"
                                            onKeyDown={(e) => { if (e.key === "Enter") handleLoadQuote(); }}
                                        />
                                        <button onClick={() => handleLoadQuote()} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium">
                                            <SearchIcon className="w-4 h-4" />Tải báo giá
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">Không bắt buộc. Nếu tạo từ báo giá, các thông tin sẽ được điền tự động.</p>
                                </div>
                            </div>
                        )}

                        {quoteId && mode !== "create" && (
                            <div className="bg-card rounded-lg border border-border p-4 flex items-center gap-3">
                                <label className="text-sm font-medium text-muted-foreground">Mã báo giá:</label>
                                <span className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-sm font-semibold text-primary">{quoteId}</span>
                            </div>
                        )}

                        {/* Order Metadata Sections */}
                        <div className="space-y-8 bg-card rounded-2xl border border-border p-8">
                            {/* Section 1: Basic Info & Contact Info */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Thông tin cơ bản</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên khách hàng</label>
                                            <input value={customerInfo?.clientName || ""} readOnly className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Mã số thuế</label>
                                            <input value={customerInfo?.legalId || ""} readOnly className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Số điện thoại</label>
                                            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ</label>
                                            <input value={clientAddress} onChange={(e) => setClientAddress(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                                            <input value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Thông tin liên hệ</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Người liên hệ <span className="text-destructive">*</span></label>
                                            <input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Căn cước công dân</label>
                                            <input value={contactId} onChange={(e) => setContactId(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Số điện thoại liên hệ <span className="text-destructive">*</span></label>
                                            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email liên hệ</label>
                                            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Report Recipient & Invoice Info */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8 pt-4">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Người nhận báo cáo</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên người nhận</label>
                                            <input value={reportRecipient.receiverName} onChange={(e) => setReportRecipient({...reportRecipient, receiverName: e.target.value})} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">SĐT người nhận</label>
                                            <input value={reportRecipient.receiverPhone} onChange={(e) => setReportRecipient({...reportRecipient, receiverPhone: e.target.value})} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email người nhận</label>
                                            <input value={reportRecipient.receiverEmail} onChange={(e) => setReportRecipient({...reportRecipient, receiverEmail: e.target.value})} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ nhận</label>
                                            <input value={reportRecipient.receiverAddress} onChange={(e) => setReportRecipient({...reportRecipient, receiverAddress: e.target.value})} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Thông tin hóa đơn</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên công ty (HĐ)</label>
                                            <input value={taxName} onChange={(e) => setTaxName(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Mã số thuế</label>
                                            <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ (HĐ)</label>
                                            <input value={taxAddress} onChange={(e) => setTaxAddress(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                        <div className="md:col-span-2">
                                            <label className="block text-xs font-semibold text-muted-foreground mb-1">Email nhận hóa đơn</label>
                                            <input value={taxEmail} onChange={(e) => setTaxEmail(e.target.value)} readOnly={isReadOnly} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Order Note */}
                            <div className="pt-4">
                                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">Ghi chú đơn hàng</label>
                                <textarea value={orderNote} onChange={(e) => setOrderNote(e.target.value)} readOnly={isReadOnly} rows={2} className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none resize-none" />
                            </div>
                        </div>
                        <OtherItemsSection otherItems={otherItems} onOtherItemsChange={setOtherItems} isReadOnly={isReadOnly} />

                        {/* Samples */}
                        <div className="space-y-4">
                            <h3 className="text-base font-semibold text-foreground">Danh sách mẫu</h3>
                            <DndProvider backend={HTML5Backend}>
                                {samples.map((sample, index) => (
                                    <div key={sample.id}>
                                        <CustomerSampleCard
                                            sample={sample}
                                            sampleIndex={index}
                                            onRemoveSample={() => handleRemoveSample(sample.id)}
                                            onDuplicateSample={(count) => handleDuplicateSample(sample.id, count)}
                                            onUpdateSample={(updates) => handleUpdateSample(sample.id, updates)}
                                            onAddAnalysis={() => handleOpenModal(index)}
                                            onRemoveAnalysis={(analysisId) => handleRemoveAnalysis(sample.id, analysisId)}
                                            isReadOnly={isReadOnly}
                                            showSampleQuantity={true}
                                        />
                                    </div>
                                ))}
                            </DndProvider>

                            {!isReadOnly && (
                                <button
                                    onClick={handleAddSample}
                                    className="w-full py-3 border-2 border-dashed border-border rounded-lg text-primary hover:border-primary hover:bg-primary/10 transition-colors text-sm font-medium"
                                >
                                    <Plus className="w-5 h-5 inline-block mr-2" />
                                    {t("order.addSample")}
                                </button>
                            )}
                        </div>

                        {samples.length > 0 && (
                            <div className="flex flex-col md:flex-row gap-8 items-start justify-between">
                                <div className="flex-1 w-full">
                                    <label className="block text-sm font-medium mb-2 text-foreground">{t("order.note", "Ghi chú")}</label>
                                    <textarea
                                        value={orderNote}
                                        onChange={(e) => {
                                            setOrderNote(e.target.value);
                                            if (!isReadOnly) setHasUnsavedChanges(true);
                                        }}
                                        disabled={isReadOnly}
                                        placeholder={t("order.notePlaceholder", "Nhập ghi chú cho đơn hàng...")}
                                        className="w-full min-h-[150px] p-3 rounded-lg border border-border bg-input text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-y"
                                    />
                                </div>
                                <div className="w-full md:w-[600px] shrink-0">
                                    <PricingSummary
                                        subtotal={pricing.subtotal}
                                        discountRate={discountRate}
                                        discountAmount={pricing.discountAmount}
                                        feeBeforeTax={pricing.feeBeforeTax}
                                        tax={pricing.tax}
                                        total={pricing.total}
                                        commission={0}
                                        otherItems={otherItems}
                                        onDiscountRateChange={setDiscountRate}
                                        onCommissionChange={() => {}}
                                        isReadOnly={isReadOnly}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <AnalysisModalNew isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleAddAnalyses} />
                {previewData && (
                    <CustomerOrderPrintPreviewModal
                        isOpen={isPreviewOpen}
                        onClose={() => setIsPreviewOpen(false)}
                        data={previewData}
                    />
                )}
                {previewData && (
                    <CustomerSampleRequestPrintPreviewModal
                        isOpen={isSampleRequestPreviewOpen}
                        onClose={() => setIsSampleRequestPreviewOpen(false)}
                        data={previewData}
                        onUpdateData={() => {}}
                    />
                )}
            </div>
        );
    }
);

CustomerOrderEditor.displayName = "CustomerOrderEditor";
