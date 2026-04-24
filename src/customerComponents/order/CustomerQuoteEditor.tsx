import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus } from "lucide-react";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { CustomerSampleCard } from "./CustomerSampleCard";
import type { SampleWithQuantity, AnalysisWithQuantity } from "./CustomerSampleCard";
import { OtherItemsSection } from "@/components/order/OtherItemsSection";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { CustomerQuotePrintPreviewModal } from "./CustomerQuotePrintPreviewModal";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";
import type { Matrix } from "@/types/parameter";
import type { EditorMode } from "@/components/order/OrderEditor";
import { customerCreateQuote, customerUpdateQuote } from "@/api/customer";
import type { OtherItem } from "@/types/order";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface CustomerQuoteEditorProps {
    mode: EditorMode;
    initialData?: any;
    onSaveSuccess?: (data?: any) => void;
    onBack?: () => void;
}

export interface CustomerQuoteEditorRef {
    save: () => void;
    export: () => void;
    hasUnsavedChanges: () => boolean;
}

export const CustomerQuoteEditor = forwardRef<CustomerQuoteEditorRef, CustomerQuoteEditorProps>(({ mode, initialData, onSaveSuccess }, ref) => {
    const [internalMode, setInternalMode] = useState<EditorMode>(mode);
    const isReadOnly = internalMode === "view";

    useEffect(() => {
        setInternalMode(mode);
    }, [mode]);

    // Load customer profile from localStorage — no client picker for customers
    const customerInfo = (() => {
        try {
            return JSON.parse(localStorage.getItem("customer") || "{}");
        } catch {
            return {};
        }
    })();

    // Client snapshot derived from customer profile
    const [clientAddress, setClientAddress] = useState(initialData?.client?.clientAddress || customerInfo?.clientAddress || "");
    const [clientPhone, setClientPhone] = useState(initialData?.client?.clientPhone || customerInfo?.clientPhone || "");
    const [clientEmail, setClientEmail] = useState(initialData?.client?.clientEmail || customerInfo?.clientEmail || "");
    const [taxName, setTaxName] = useState(initialData?.client?.invoiceInfo?.taxName || customerInfo?.invoiceInfo?.taxName || customerInfo?.clientName || "");
    const [taxCode, setTaxCode] = useState(initialData?.client?.invoiceInfo?.taxCode || customerInfo?.invoiceInfo?.taxCode || customerInfo?.legalId || "");
    const [taxAddress, setTaxAddress] = useState(initialData?.client?.invoiceInfo?.taxAddress || customerInfo?.invoiceInfo?.taxAddress || customerInfo?.clientAddress || "");
    const [taxEmail, setTaxEmail] = useState(initialData?.client?.invoiceInfo?.taxEmail || customerInfo?.invoiceInfo?.taxEmail || "");

    // Contact person
    const defaultContact = initialData?.contactPerson || customerInfo?.clientContacts?.[0] || {};
    const [contactPerson, setContactPerson] = useState(defaultContact.contactName || "");
    const [contactPhone, setContactPhone] = useState(defaultContact.contactPhone || "");
    const [contactEmail, setContactEmail] = useState(defaultContact.contactEmail || "");
    const [contactAddress, setContactAddress] = useState(defaultContact.contactAddress || "");
    const [contactId, setContactId] = useState(defaultContact.contactId || "");

    // Report Recipient (optional for quotes but good for consistency)
    const [reportRecipient, setReportRecipient] = useState<any>(
        initialData?.reportRecipient || {
            receiverName: "",
            receiverPhone: "",
            receiverEmail: "",
            receiverAddress: "",
        },
    );

    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0);
    const [otherItems, setOtherItems] = useState<OtherItem[]>([]);

    // UI
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSampleIndex, setCurrentSampleIndex] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const quoteId = initialData?.quoteId;

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
            if (initialData.reportRecipient)
                setReportRecipient({
                    receiverName: initialData.reportRecipient.receiverName || "",
                    receiverPhone: initialData.reportRecipient.receiverPhone || "",
                    receiverEmail: initialData.reportRecipient.receiverEmail || "",
                    receiverAddress: initialData.reportRecipient.receiverAddress || "",
                });
            if (initialData.samples?.length > 0) {
                setSamples(
                    initialData.samples.map((s: any) => {
                        // Merge existing info with defaults
                        const existingInfo = s.sampleInfo || [];
                        const mergedInfo = [...defaultSampleInfo];

                        existingInfo.forEach((item: any) => {
                            const idx = mergedInfo.findIndex((m) => m.label === item.label);
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
                            analyses: (s.analyses || []).map((a: any) => ({
                                ...a,
                                id: a.id || `ra-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            })),
                        };
                    }),
                );
            }
            if (initialData.discountRate !== undefined) setDiscountRate(initialData.discountRate);
            if (Array.isArray(initialData.otherItems)) setOtherItems(initialData.otherItems);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialData]);

    useEffect(() => {
        if (!isReadOnly && samples.length > 0) setHasUnsavedChanges(true);
    }, [samples, isReadOnly]);

    // Pricing calculation
    const calculatePricing = () => {
        let totalListPrice = 0;
        let totalIndividualDiscount = 0;
        let totalFeeBeforeTaxNet = 0;
        let sumVAT = 0;

        samples.forEach((sample) => {
            let sampleListPrice = 0;
            let sampleIndividualDiscount = 0;
            let sampleSubtotalNet = 0;
            let sampleVAT = 0;

            sample.analyses.forEach((a) => {
                const qty = Number(a.quantity || 1);
                const unitPrice = Number(a.unitPrice || 0);
                const dr = Number(a.discountRate || 0);
                const tr = Number(a.taxRate || 0);

                const lineList = unitPrice * qty;
                const lineDiscount = lineList * (dr / 100);
                const lineNet = lineList - lineDiscount;

                sampleListPrice += lineList;
                sampleIndividualDiscount += lineDiscount;
                sampleSubtotalNet += lineNet;
                sampleVAT += lineNet * (tr / 100);
            });
            const sampleQty = Number(sample.quantity || 1);
            totalListPrice += sampleListPrice * sampleQty;
            totalIndividualDiscount += sampleIndividualDiscount * sampleQty;
            totalFeeBeforeTaxNet += sampleSubtotalNet * sampleQty;
            sumVAT += sampleVAT * sampleQty;
        });

        const globalDiscountAmount = totalFeeBeforeTaxNet * (discountRate / 100);
        const totalDiscount = totalIndividualDiscount + globalDiscountAmount;
        const feeBeforeTaxAfterGlobalDiscount = totalFeeBeforeTaxNet - globalDiscountAmount;
        const totalTax = sumVAT * (1 - discountRate / 100);

        let otherFee = 0,
            otherVAT = 0;
        otherItems.forEach((i) => {
            otherFee += Number(i.feeBeforeTax || 0);
            otherVAT += (Number(i.feeBeforeTax || 0) * Number(i.taxRate || 0)) / 100;
        });

        return {
            subtotal: totalListPrice,
            globalDiscountAmount,
            totalDiscount,
            feeBeforeTax: feeBeforeTaxAfterGlobalDiscount + otherFee,
            tax: totalTax + otherVAT,
            total: feeBeforeTaxAfterGlobalDiscount + totalTax + otherFee + otherVAT,
        };
    };
    const pricing = calculatePricing();

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
        setSamples([
            ...samples,
            {
                id: `S${Date.now()}`,
                sampleId: undefined,
                sampleName: "",
                sampleNote: "",
                sampleInfo: [...defaultSampleInfo],
                analyses: [],
                quantity: 1,
            },
        ]);
    };
    const handleRemoveSample = (id: string) => {
        if (!isReadOnly) setSamples(samples.filter((s) => s.id !== id));
    };
    const handleUpdateSample = (id: string, updates: Partial<SampleWithQuantity>) => {
        if (!isReadOnly) setSamples(samples.map((s) => (s.id === id ? { ...s, ...updates } : s)));
    };
    const handleDuplicateSample = (id: string, count: number = 1) => {
        if (isReadOnly) return;
        const src = samples.find((s) => s.id === id);
        if (!src) return;
        const copies: SampleWithQuantity[] = [];
        for (let i = 0; i < count; i++) {
            const ts = Date.now() + i;
            copies.push({ ...src, id: `S${ts}`, sampleId: undefined, analyses: src.analyses.map((a, idx) => ({ ...a, id: `${a.parameterId}_copy_${ts}_${idx}` })) });
        }
        setSamples([...samples, ...copies]);
    };
    const handleRemoveAnalysis = (sampleId: string, analysisId: string) => {
        if (isReadOnly) return;
        setSamples(samples.map((s) => (s.id === sampleId ? { ...s, analyses: s.analyses.filter((a) => a.parameterId !== analysisId && a.id !== analysisId) } : s)));
    };
    const handleOpenModal = (idx: number) => {
        if (!isReadOnly) {
            setCurrentSampleIndex(idx);
            setIsModalOpen(true);
        }
    };
    const handleAddAnalyses = (items: Matrix[]) => {
        if (currentSampleIndex === null) return;
        const sample = samples[currentSampleIndex];
        const ts = Date.now();
        const newAnalyses: AnalysisWithQuantity[] = items.map((m, i) => {
            const feeAfterTax = Number((m as any).feeAfterTax || 0);
            const taxRate = Number(m.taxRate || 0);
            let unitPrice = m.feeBeforeTax || 0;
            if (feeAfterTax) unitPrice = feeAfterTax / (1 + taxRate / 100);
            return {
                ...m,
                id: `A${ts}_${i}_${m.matrixId}`,
                unitPrice,
                taxRate,
                feeAfterTax,
                quantity: 1,
                groupId: (m as any).groupId,
                groupDiscount: (m as any).groupDiscount,
                discountRate: (m as any).discountRate,
            };
        });
        const updatedSamples = [...samples];
        updatedSamples[currentSampleIndex] = { ...sample, analyses: [...sample.analyses, ...newAnalyses] };
        setSamples(updatedSamples);
    };

    const handleSave = async () => {
        if (isReadOnly) return;
        if (samples.length === 0) {
            toast.error("Vui lòng thêm ít nhất một mẫu");
            return;
        }

        const clientSnapshot = {
            clientId: customerInfo?.clientId,
            clientName: customerInfo?.clientName,
            clientAddress,
            clientPhone,
            clientEmail,
            legalId: customerInfo?.legalId,
            invoiceInfo: { taxName, taxCode, taxAddress, taxEmail },
        };
        const contactData = { contactName: contactPerson, contactPhone, contactEmail, contactAddress, contactId };
        const { discount: _d, ...rest } = initialData || {};
        const quoteData = {
            ...rest,
            ...(mode === "create" ? {} : { quoteId }),
            quoteStatus: mode === "create" ? "draft" : initialData?.quoteStatus || "draft",
            clientId: customerInfo?.clientId,
            client: clientSnapshot,
            contactPerson: contactData,
            reportRecipient,
            samples: samples.map((s) => {
                // Filter out empty sample info
                const cleanInfo = (s.sampleInfo || []).filter((info) => info.label && info.value && info.value.trim() !== "");
                // Ensure "Tên mẫu thử" is always present and matches sampleName
                const finalInfo = [{ label: "Tên mẫu thử", value: s.sampleName || "" }, ...cleanInfo.filter((info) => info.label !== "Tên mẫu thử")];

                return {
                    ...s,
                    sampleInfo: finalInfo,
                    analyses: s.analyses.map((a) => {
                        const qty = a.quantity || 1;
                        const up = a.unitPrice || 0;
                        const lineList = up * qty;
                        const dr = a.discountRate || 0;
                        const feeNet = lineList * (1 - dr / 100);
                        return { ...a, parameterPrice: up, feeBeforeTax: feeNet, discountRate: dr, parameterTaxRate: a.taxRate, tax: (feeNet * (a.taxRate || 0)) / 100 };
                    }),
                };
            }),
            discountRate,
            otherItems,
            totalFeeBeforeTax: pricing.subtotal,
            totalDiscountValue: pricing.totalDiscount,
            totalFeeBeforeTaxAndDiscount: pricing.feeBeforeTax,
            totalTaxValue: pricing.tax,
            totalAmount: pricing.total,
        };

        try {
            const response = mode === "create" ? await customerCreateQuote({ body: quoteData }) : await customerUpdateQuote({ body: quoteData });

            if (response.success) {
                toast.success(mode === "create" ? "Tạo báo giá thành công" : "Cập nhật báo giá thành công");
                setHasUnsavedChanges(false);
                setInternalMode("view");
                onSaveSuccess?.(response.data);
            } else {
                toast.error((response.error as any)?.message || "Lưu báo giá thất bại");
            }
        } catch {
            toast.error("Lỗi kết nối server");
        }
    };

    const handleExport = () => {
        const clientSnapshot = {
            clientId: customerInfo?.clientId,
            clientName: customerInfo?.clientName,
            clientAddress,
            clientPhone,
            clientEmail,
            legalId: customerInfo?.legalId,
            invoiceInfo: { taxName, taxCode, taxAddress, taxEmail },
        };
        const data: QuotePrintData = {
            quoteId,
            client: clientSnapshot as any,
            contactPerson,
            contactPhone,
            contactId,
            contactEmail,
            contactAddress,
            clientAddress,
            taxName,
            taxCode,
            taxAddress,
            samples: samples.map((s) => {
                // Filter out empty sample info
                const cleanInfo = (s.sampleInfo || []).filter((info) => info.label && info.value && info.value.trim() !== "");
                // Ensure "Tên mẫu thử" is always present and matches sampleName
                const finalInfo = [{ label: "Tên mẫu thử", value: s.sampleName || "" }, ...cleanInfo.filter((info) => info.label !== "Tên mẫu thử")];

                return {
                    sampleName: s.sampleName || "",
                    sampleNote: s.sampleNote || "",
                    sampleTypeName: s.sampleTypeName || "",
                    sampleInfo: finalInfo,
                    quantity: s.quantity || 1,
                    analyses: s.analyses.map((a) => {
                        const qty = a.quantity || 1;
                        const up = a.unitPrice || 0;
                        const lineList = up * qty;
                        const dr = a.discountRate || 0;
                        const lineNet = lineList * (1 - dr / 100);
                        const tr = a.taxRate || 0;
                        return {
                            parameterName: a.parameterName,
                            parameterId: a.parameterId,
                            protocolCode: a.protocolCode || "",
                            protocolSource: (a as any).protocolSource || "",
                            protocolAccreditation: (a as any).protocolAccreditation || "",
                            sampleTypeName: (a as any).sampleTypeName || "",
                            feeBeforeTax: lineNet,
                            feeBeforeTaxAndDiscount: lineList,
                            taxRate: tr,
                            feeAfterTax: lineNet * (1 + tr / 100),
                            discountRate: dr,
                            quantity: qty,
                            unitPrice: up,
                        };
                    }),
                };
            }),
            pricing,
            discountRate,
            commission: 0,
            otherItems,
        } as any;
        setPrintData(data);
        setIsPrintModalOpen(true);
    };

    useImperativeHandle(ref, () => ({ save: handleSave, export: handleExport, hasUnsavedChanges: () => hasUnsavedChanges }));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
                <div className="space-y-6">
                    {/* Quote Metadata Sections */}
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
                                        <input
                                            value={clientPhone}
                                            onChange={(e) => setClientPhone(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ</label>
                                        <input
                                            value={clientAddress}
                                            onChange={(e) => setClientAddress(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Email</label>
                                        <input
                                            value={clientEmail}
                                            onChange={(e) => setClientEmail(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Thông tin liên hệ</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            Người liên hệ <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            value={contactPerson}
                                            onChange={(e) => setContactPerson(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Căn cước công dân</label>
                                        <input
                                            value={contactId}
                                            onChange={(e) => setContactId(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">
                                            Số điện thoại liên hệ <span className="text-destructive">*</span>
                                        </label>
                                        <input
                                            value={contactPhone}
                                            onChange={(e) => setContactPhone(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Email liên hệ</label>
                                        <input
                                            value={contactEmail}
                                            onChange={(e) => setContactEmail(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
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
                                        <input
                                            value={reportRecipient.receiverName}
                                            onChange={(e) => setReportRecipient({ ...reportRecipient, receiverName: e.target.value })}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">SĐT người nhận</label>
                                        <input
                                            value={reportRecipient.receiverPhone}
                                            onChange={(e) => setReportRecipient({ ...reportRecipient, receiverPhone: e.target.value })}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Email người nhận</label>
                                        <input
                                            value={reportRecipient.receiverEmail}
                                            onChange={(e) => setReportRecipient({ ...reportRecipient, receiverEmail: e.target.value })}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ nhận</label>
                                        <input
                                            value={reportRecipient.receiverAddress}
                                            onChange={(e) => setReportRecipient({ ...reportRecipient, receiverAddress: e.target.value })}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-primary uppercase tracking-wider border-b border-border pb-2">Thông tin hóa đơn</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Tên công ty (HĐ)</label>
                                        <input
                                            value={taxName}
                                            onChange={(e) => setTaxName(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Mã số thuế</label>
                                        <input
                                            value={taxCode}
                                            onChange={(e) => setTaxCode(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Địa chỉ (HĐ)</label>
                                        <input
                                            value={taxAddress}
                                            onChange={(e) => setTaxAddress(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="block text-xs font-semibold text-muted-foreground mb-1">Email nhận hóa đơn</label>
                                        <input
                                            value={taxEmail}
                                            onChange={(e) => setTaxEmail(e.target.value)}
                                            readOnly={isReadOnly}
                                            className="w-full px-3 py-2 text-sm bg-input border border-border rounded-lg focus:ring-1 focus:ring-primary outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <OtherItemsSection otherItems={otherItems} onOtherItemsChange={setOtherItems} isReadOnly={isReadOnly} />

                    {/* Samples */}
                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-foreground">Danh sách mẫu</h3>
                        <DndProvider backend={HTML5Backend}>
                            {samples.map((sample, index) => (
                                <CustomerSampleCard
                                    key={sample.id}
                                    sample={sample}
                                    sampleIndex={index}
                                    onRemoveSample={() => handleRemoveSample(sample.id)}
                                    onDuplicateSample={(count: number) => handleDuplicateSample(sample.id, count)}
                                    onUpdateSample={(updates: Partial<SampleWithQuantity>) => handleUpdateSample(sample.id, updates)}
                                    onAddAnalysis={() => handleOpenModal(index)}
                                    onRemoveAnalysis={(analysisId: string) => handleRemoveAnalysis(sample.id, analysisId)}
                                    isReadOnly={isReadOnly}
                                    isAnalysesReadOnly={true}
                                    isSamplesLocked={true}
                                    showSampleQuantity={true}
                                />
                            ))}
                        </DndProvider>
                        {/* Customers cannot add full new samples to existing quotes once created */}
                        {!isReadOnly && false && (
                            <button
                                onClick={handleAddSample}
                                className="w-full py-3 border-2 border-dashed border-border rounded-lg text-primary hover:border-primary hover:bg-primary/10 transition-colors text-sm font-medium"
                            >
                                <Plus className="w-5 h-5 inline-block mr-2" />
                                Thêm mẫu
                            </button>
                        )}
                    </div>

                    {samples.length > 0 && (
                        <div className="flex justify-end">
                            <div className="w-full md:w-[600px]">
                                <PricingSummary
                                    subtotal={pricing.subtotal}
                                    discountRate={discountRate}
                                    discountAmount={pricing.totalDiscount}
                                    lineDiscountAmount={pricing.totalDiscount - pricing.globalDiscountAmount}
                                    orderDiscountAmount={pricing.globalDiscountAmount}
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

            <AnalysisModalNew isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleAddAnalyses} isCustomer={true} />
            {printData && <CustomerQuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </div>
    );
});

CustomerQuoteEditor.displayName = "CustomerQuoteEditor";
