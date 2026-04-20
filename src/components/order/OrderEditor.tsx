import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, Search as SearchIcon, Paperclip, Eye, X, Loader2, File } from "lucide-react";
import { ClientSectionNew } from "@/components/client/ClientSectionNew";
import { SampleCard } from "@/components/order/SampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { OtherItemsSection } from "@/components/order/OtherItemsSection";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { AddClientModal } from "@/components/client/AddClientModal";
import { EditClientModal } from "@/components/client/EditClientModal";
import type { Client } from "@/types/client";
import type { Matrix } from "@/types/parameter";
import type { OtherItem } from "@/types/order";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getClients, getQuoteDetail, createClient, updateClient, createOrder, updateOrder } from "@/api/index";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { CustomerFileUploadModal } from "../../customerComponents/order/CustomerFileUploadModal";
import { fileGetDetail, fileDelete, fileGetUrl } from "@/api/index";

export type EditorMode = "view" | "edit" | "create";

import type { SampleWithQuantity, AnalysisWithQuantity } from "@/components/order/SampleCard";

interface OrderEditorProps {
    mode: EditorMode;
    initialData?: any; // Order
    onSaveSuccess?: (data?: any) => void;
    onBack?: () => void;
    initialQuoteId?: string;
}

export interface OrderEditorRef {
    save: () => void;
    export: () => void;
    exportSampleRequest: () => void;
    hasUnsavedChanges: () => boolean;
}

export const OrderEditor = forwardRef<OrderEditorRef, OrderEditorProps>(({ mode, initialData, onSaveSuccess, initialQuoteId }, ref) => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const [internalMode, setInternalMode] = useState<EditorMode>(mode);
    const isReadOnly = internalMode === "view";

    useEffect(() => {
        setInternalMode(mode);
    }, [mode]);

    const [clients, setClients] = useState<Client[]>([]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await getClients({ query: { itemsPerPage: 100 } }); // optimized fetch
                if (res.success && res.data) {
                    setClients(res.data as Client[]);
                }
            } catch (err) {
                console.error("Failed to load clients", err);
            }
        };
        fetchClients();
    }, []);

    // Form State
    const [selectedClient, setSelectedClient] = useState<Client | null>(initialData?.client || null);

    // Basic Info
    const [clientAddress, setClientAddress] = useState(initialData?.client?.clientAddress || "");
    const [clientPhone, setClientPhone] = useState(initialData?.client?.clientPhone || "");
    const [clientEmail, setClientEmail] = useState(initialData?.client?.clientEmail || "");

    // Contact Info
    const [contactPerson, setContactPerson] = useState("");
    const [contactId, setContactId] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactIdentity, setContactIdentity] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactAddress, setContactAddress] = useState("");
    const [reportRecipient, setReportRecipient] = useState<{ receiverName?: string; receiverPhone?: string; receiverAddress?: string; receiverEmail?: string }>(initialData?.reportRecipient || {});

    // Invoice Info
    const [taxName, setTaxName] = useState("");
    const [taxCode, setTaxCode] = useState("");
    const [taxAddress, setTaxAddress] = useState("");
    const [taxEmail, setTaxEmail] = useState("");

    const [quoteId, setQuoteId] = useState(initialData?.quoteId || initialQuoteId || "");
    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0);
    const [commission, setCommission] = useState(0);

    const [orderUri, setOrderUri] = useState(initialData?.orderUri || "");
    const [requestForm, setRequestForm] = useState(initialData?.requestForm || "");
    const [orderNote, setOrderNote] = useState(initialData?.orderNote || "");
    const [otherItems, setOtherItems] = useState<OtherItem[]>([]);

    // File Attachments State
    const [orderCustomerFileIds, setOrderCustomerFileIds] = useState<string[]>(initialData?.orderCustomerFileIds || []);
    const [fileRecords, setFileRecords] = useState<Record<string, any>>({});
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [isDownloading, setIsDownloading] = useState<string | null>(null);

    const fetchFileDetails = async (fileIds: string[]) => {
        const newRecords: Record<string, any> = { ...fileRecords };
        let hasNew = false;
        for (const id of fileIds) {
            if (!newRecords[id]) {
                try {
                    const res = await fileGetDetail({ query: { id } });
                    if (res.success) {
                        newRecords[id] = res.data;
                        hasNew = true;
                    }
                } catch (e) {
                    console.error("Failed to fetch file detail", id, e);
                }
            }
        }
        if (hasNew) setFileRecords(newRecords);
    };

    useEffect(() => {
        if (orderCustomerFileIds.length > 0) {
            fetchFileDetails(orderCustomerFileIds);
        }
    }, [orderCustomerFileIds]);

    useEffect(() => {
        setOrderUri(initialData?.orderUri || "");
        setRequestForm(initialData?.requestForm || "");
    }, [initialData]);

    // Auto-load Quote if initialQuoteId is present and entering create mode
    useEffect(() => {
        if (mode === "create" && initialQuoteId && !initialData) {
            // We can reuse handleLoadQuote but need to ensure it uses the correct ID
            // Since handleLoadQuote uses state 'quoteId', and we set it in useState initializer, it should be fine?
            // No, useState initializer runs once. If component remounts or props change?
            // If navigating from one create to another, remount occurs? Yes.
            // But if specific Quote loading logic relies on state ...
            // Better to allow handleLoadQuote to accept an optional ID arg
            handleLoadQuote(initialQuoteId);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, initialQuoteId]);

    // Initial Data Population
    useEffect(() => {
        if (initialData) {
            setSelectedClient(initialData.client || null);
            setClientAddress(initialData.client?.clientAddress || "");
            setClientPhone(initialData.client?.clientPhone || "");
            setClientEmail(initialData.client?.clientEmail || "");

            // Populate Invoice Info from Snapshot
            if (initialData.client?.invoiceInfo) {
                setTaxName(initialData.client.invoiceInfo.taxName || "");
                setTaxCode(initialData.client.invoiceInfo.taxCode || "");
                setTaxAddress(initialData.client.invoiceInfo.taxAddress || "");
                setTaxEmail(initialData.client.invoiceInfo.taxEmail || "");
            }

            // Populate Contact from top-level contactPerson (Restructured) or fallback to Legacy Snapshot
            const contact = initialData.contactPerson || initialData.client?.clientContacts?.[0];
            if (contact) {
                setContactPerson(contact.contactName || (contact as any).name || "");
                setContactPhone(contact.contactPhone || (contact as any).phone || "");
                setContactId(contact.contactId || "");
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactAddress(contact.contactAddress || "");
            }

            // reportRecipient
            if (initialData.reportRecipient) {
                setReportRecipient(initialData.reportRecipient);
            }

            if (initialData.orderNote) {
                setOrderNote(initialData.orderNote);
            }

            if (initialData.samples && initialData.samples.length > 0) {
                // Map API data keys to internal Editor keys if they differ
                const mappedSamples = initialData.samples.map((s: any) => ({
                    ...s,
                    id: s.id || `restored-sample-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    analyses: (s.analyses || []).map((a: any) => {
                        const quantity = a.quantity || 1;
                        const taxRate = a.taxRate !== undefined ? a.taxRate : parseFloat(a.parameterTaxRate || "0");

                        // Try to get existing unitPrice. If 0/missing, recover it from feeAfterTax or feeBeforeTax
                        let unitPrice = a.unitPrice !== undefined ? Number(a.unitPrice) : Number(a.parameterPrice) || 0;

                        // If unitPrice is 0, try to calculate from feeAfterTax (most reliable usually)
                        if (!unitPrice && a.feeAfterTax) {
                            unitPrice = Number(a.feeAfterTax) / quantity / (1 + taxRate / 100);
                        }
                        // Fallback: If still 0, try feeBeforeTax. Note: feeBeforeTax might be string "100.000 Ä‘" or number
                        if (!unitPrice && a.feeBeforeTax) {
                            // If it's a simple number
                            if (typeof a.feeBeforeTax === "number") {
                                unitPrice = a.feeBeforeTax / quantity;
                            } else if (typeof a.feeBeforeTax === "string") {
                                // Try to parse if it looks like a number
                                const parsed = parseFloat(a.feeBeforeTax.replace(/[^0-9.-]+/g, ""));
                                if (!isNaN(parsed)) {
                                    unitPrice = parsed / quantity;
                                }
                            }
                        }

                        return {
                            ...a,
                            id: a.id || `restored-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            unitPrice: unitPrice,
                            feeBeforeTax: unitPrice * quantity, // Ensure this is consistent
                            feeAfterTax: a.feeAfterTax || unitPrice * quantity * (1 + taxRate / 100),
                            taxRate: taxRate,
                            quantity: quantity,
                        };
                    }),
                }));
                setSamples(mappedSamples);
            }
            // Ensure discountRate and commission are synced from initialData
            if (initialData.discountRate !== undefined) {
                setDiscountRate(initialData.discountRate);
            }
            if (initialData.commissionRate !== undefined) {
                setCommission(initialData.commissionRate);
            }
            if (initialData.commission !== undefined) {
                setCommission(initialData.commission);
            }
            if (initialData.otherItems && Array.isArray(initialData.otherItems)) {
                setOtherItems(initialData.otherItems);
            }
            if (initialData.orderCustomerFileIds) {
                setOrderCustomerFileIds(initialData.orderCustomerFileIds);
            }
        }
    }, [initialData]);

    const [previewData, setPreviewData] = useState<OrderPrintData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSampleRequestPreviewOpen, setIsSampleRequestPreviewOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isEditClientModalOpen, setIsEditClientModalOpen] = useState(false);
    const [currentSampleIndex, setCurrentSampleIndex] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const orderId = initialData?.orderId;

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (hasUnsavedChanges && !isReadOnly) {
                e.preventDefault();
                e.returnValue = "";
            }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [hasUnsavedChanges, isReadOnly]);

    useEffect(() => {
        if (!isReadOnly && (selectedClient || contactPerson || samples.length > 0 || orderCustomerFileIds.length > (initialData?.orderCustomerFileIds?.length || 0))) {
            setHasUnsavedChanges(true);
        }
    }, [selectedClient, contactPerson, samples, orderCustomerFileIds, isReadOnly]);

    const handleClientChange = (client: Client | null) => {
        setSelectedClient(client);

        if (client) {
            setClientAddress(client.clientAddress || "");
            setClientPhone(client.clientPhone || "");
            setClientEmail(client.clientEmail || "");

            // Invoice
            setTaxName(client.invoiceInfo?.taxName || client.clientName || "");
            setTaxCode(client.invoiceInfo?.taxCode || client.legalId || "");
            setTaxAddress(client.invoiceInfo?.taxAddress || client.clientAddress || "");
            setTaxEmail(client.invoiceInfo?.taxEmail || "");

            // Contact
            if (client.clientContacts && client.clientContacts.length > 0) {
                // Use the LAST contact in the array as default
                const contact = client.clientContacts[client.clientContacts.length - 1];
                setContactPerson(contact.contactName || (contact as any).name || "");
                setContactPhone(contact.contactPhone || (contact as any).phone || "");
                setContactId(contact.contactId || "");
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactAddress(contact.contactAddress || "");
            } else {
                // Clear contact fields if no contact
                setContactPerson("");
                setContactId("");
                setContactPhone("");
                setContactIdentity("");
                setContactEmail("");
                setContactAddress("");
            }
        }
    };

    const handleLoadQuote = async (arg?: string | React.MouseEvent) => {
        const idToUse = typeof arg === "string" ? arg : quoteId;
        if (isReadOnly) return;
        if (!idToUse?.trim()) {
            alert(t("order.errorQuoteCode"));
            return;
        }

        try {
            const response = await getQuoteDetail({ query: { quoteId: idToUse } });

            if (response.success && response.data) {
                const foundQuote: any = response.data;

                if (foundQuote && foundQuote.client) {
                    setSelectedClient(foundQuote.client);
                    const qClient = foundQuote.client;

                    setClientAddress(qClient.clientAddress || "");
                    setClientPhone(qClient.clientPhone || "");
                    setClientEmail(qClient.clientEmail || "");

                    setTaxName(qClient.invoiceInfo?.taxName || qClient.clientName || "");
                    setTaxCode(qClient.invoiceInfo?.taxCode || qClient.legalId || "");
                    setTaxAddress(qClient.invoiceInfo?.taxAddress || qClient.clientAddress || "");
                    setTaxEmail(qClient.invoiceInfo?.taxEmail || "");

                    // Populate Contact from top-level or snapshot
                    const contact = foundQuote.contactPerson || qClient.clientContacts?.[0];
                    if (contact) {
                        setContactPerson(contact.contactName || (contact as any).name || "");
                        setContactPhone(contact.contactPhone || (contact as any).phone || "");
                        setContactId(contact.contactId || "");
                        setContactIdentity(contact.identityId || "");
                        setContactEmail(contact.contactEmail || (contact as any).email || "");
                        setContactAddress(contact.contactAddress || "");
                    }

                    setDiscountRate(foundQuote.discountRate || 0);

                    const expandedSamples: SampleWithQuantity[] = [];
                    (foundQuote.samples || []).forEach((s: any) => {
                        const qty = Number(s.quantity) || 1;
                        for (let i = 0; i < qty; i++) {
                            expandedSamples.push({
                                id: `temp-sample-${Date.now()}-${Math.random().toString(36).slice(2)}-${i}`,
                                sampleId: undefined, // Create new sample for order
                                sampleName: s.sampleName || s.name || "Sample",
                                sampleTypeId: s.sampleTypeId,
                                sampleTypeName: s.sampleTypeName || s.matrix || "",
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
                    toast.success(t("order.loadQuoteSuccess"));
                } else {
                    // Should not happen if data is detail, but good check
                    toast.error(t("order.errorQuoteNotFound"));
                }
            } else {
                toast.error(t("order.errorQuoteNotFound"));
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading quote");
        }
    };

    const calculatePricing = () => {
        let grossSum = 0;
        let lineLevelDiscountAmount = 0;
        let runningNetBeforeOrderDiscount = 0;
        let runningVATBeforeOrderDiscount = 0;

        samples.forEach((sample) => {
            sample.analyses.forEach((a) => {
                const qty = Number(a.quantity || 1);
                const up = Number(a.unitPrice || 0);
                const dr = Number(a.discountRate || 0);
                const tr = Number(a.taxRate || 0);

                const lineGross = up * qty;
                const lineDiscount = lineGross * (dr / 100);
                const lineNet = lineGross - lineDiscount;
                const lineTax = lineNet * (tr / 100);

                grossSum += lineGross;
                lineLevelDiscountAmount += lineDiscount;
                runningNetBeforeOrderDiscount += lineNet;
                runningVATBeforeOrderDiscount += lineTax;
            });
        });

        const orderLevelDiscountAmount = runningNetBeforeOrderDiscount * (discountRate / 100);
        const finalDiscountValue = lineLevelDiscountAmount + orderLevelDiscountAmount;
        const subtotalAfterAllDiscounts = runningNetBeforeOrderDiscount - orderLevelDiscountAmount;
        const finalTaxValue = Math.round(runningVATBeforeOrderDiscount * (1 - discountRate / 100));

        let otherFeeBeforeTax = 0;
        let otherVAT = 0;
        otherItems.forEach((i) => {
            otherFeeBeforeTax += Number(i.feeBeforeTax || 0);
            otherVAT += (Number(i.feeBeforeTax || 0) * Number(i.taxRate || 0)) / 100;
        });

        const grandTotal = Math.round(subtotalAfterAllDiscounts + finalTaxValue + otherFeeBeforeTax + otherVAT);

        return {
            subtotal: grossSum, // Tổng đơn giá
            discountAmount: finalDiscountValue, // Chiết khấu
            feeBeforeTax: subtotalAfterAllDiscounts + otherFeeBeforeTax, // Tiền trước thuế
            tax: finalTaxValue + otherVAT, // Tiền thuế
            total: grandTotal, // Tổng cộng
        };
    };

    const pricing = calculatePricing();

    const handleExport = () => {
        // Construct a client snapshot with updated fields
        const clientSnapshot = selectedClient
            ? {
                  clientId: selectedClient.clientId,
                  clientName: selectedClient.clientName,
                  clientAddress,
                  clientPhone,
                  clientEmail,
                  legalId: selectedClient.legalId,
                  invoiceInfo: {
                      taxName,
                      taxCode,
                      taxAddress,
                      taxEmail,
                  },
              }
            : null;

        const data: OrderPrintData = {
            orderId,
            createdAt: initialData?.createdAt,
            salePerson: mode === "create" ? user?.identityName : initialData?.salePerson,
            client: clientSnapshot as any,

            contactPerson,
            contactPhone,
            contactIdentity,
            reportRecipient,
            contactEmail,
            contactAddress,

            clientAddress,
            taxName,
            taxCode,
            taxAddress,

            samples: samples.map((s) => ({
                sampleName: s.sampleName || "",
                sampleTypeId: s.sampleTypeId,
                sampleTypeName: s.sampleTypeName || "",
                sampleNote: s.sampleNote || "",
                analyses: s.analyses.map((a) => {
                    const unitPrice = Number(a.unitPrice) || 0;
                    const quantity = Number(a.quantity) || 1;
                    const taxRate = Number(a.taxRate) || 0;
                    const discountRate = Number(a.discountRate) || 0;

                    const feeBeforeTaxAndDiscount = unitPrice * quantity;
                    const feeBeforeTax = feeBeforeTaxAndDiscount * (1 - discountRate / 100);
                    const feeAfterTax = feeBeforeTax * (1 + taxRate / 100);

                    return {
                        ...a,
                        parameterName: a.parameterName,
                        sampleTypeId: a.sampleTypeId,
                        sampleTypeName: a.sampleTypeName,
                        protocolAccreditation: a.protocolAccreditation,
                        protocolCode: (a as any).protocolCode,
                        protocolSource: (a as any).protocolSource,
                        parameterId: a.parameterId,
                        feeBeforeTax: feeBeforeTax,
                        feeBeforeTaxAndDiscount: feeBeforeTaxAndDiscount,
                        taxRate: taxRate,
                        feeAfterTax: a.feeAfterTax || feeAfterTax,
                        discountRate: discountRate,
                        quantity: quantity,
                        unitPrice: unitPrice,
                    };
                }),
            })),

            pricing,
            discountRate,
            orderUri: orderUri,
            requestForm: requestForm,
            otherItems,
        } as any;
        setPreviewData(data);
        setIsPreviewOpen(true);
    };

    const handleExportSampleRequest = () => {
        // Similar to handleExport
        handleExport(); // Reuse logic or copy if slightly different
        // Reusing handleExport for preview data construction, just toggling different modal
        // Using the same setPreviewData logic
        // But need to open the other modal
        // The handleExport sets isPreviewOpen=true.
        setIsPreviewOpen(false); // Close the other one if it opened
        setIsSampleRequestPreviewOpen(true);
    };

    // Replacing handleAddClient with API version
    const handleAddClientAPI = async (newClientData: any) => {
        try {
            const response = await createClient({ body: newClientData });
            if (response.success && response.data) {
                toast.success("Client created");
                const created = response.data as Client;
                setClients((prev) => [...prev, created]);
                handleClientChange(created);
                setIsClientModalOpen(false);
            } else {
                toast.error("Failed to create client");
            }
        } catch {
            toast.error("Error creating client");
        }
    };

    const handleAddSample = () => {
        if (isReadOnly) return;
        const newId = `temp-sample-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const newSample: SampleWithQuantity = {
            id: newId,
            sampleId: undefined,
            sampleName: "",
            sampleTypeId: "",
            sampleTypeName: "",
            sampleNote: "",
            analyses: [],
            quantity: 1,
        };
        setSamples([...samples, newSample]);
    };

    const handleDuplicateSample = (sampleId: string, count: number = 1) => {
        if (isReadOnly) return;
        const sampleToDuplicate = samples.find((s) => s.id === sampleId);
        if (!sampleToDuplicate) return;

        const newSamples: SampleWithQuantity[] = [];
        for (let i = 0; i < count; i++) {
            const timestamp = Date.now() + i;
            const newSampleId = `temp-sample-${timestamp}-${Math.random().toString(36).slice(2)}`;
            newSamples.push({
                ...sampleToDuplicate,
                id: newSampleId,
                sampleId: undefined,
                analyses: sampleToDuplicate.analyses.map((a, aIdx) => ({
                    ...a,
                    id: `temp-analysis-${timestamp}-${Math.random().toString(36).slice(2)}-${aIdx}`,
                })),
            });
        }
        setSamples([...samples, ...newSamples]);
    };

    const handleRemoveSample = (sampleId: string) => {
        if (isReadOnly) return;
        setSamples(samples.filter((s) => s.id !== sampleId));
    };

    const handleUpdateSample = (sampleId: string, updates: Partial<SampleWithQuantity>) => {
        if (isReadOnly) return;
        setSamples(samples.map((s) => (s.id === sampleId ? { ...s, ...updates } : s)));
    };

    const handleOpenModal = (sampleIndex: number) => {
        if (isReadOnly) return;
        setCurrentSampleIndex(sampleIndex);
        setIsModalOpen(true);
    };

    const handleAddAnalyses = (selectedMatrixItems: Matrix[]) => {
        if (currentSampleIndex === null) return;
        const sample = samples[currentSampleIndex];
        const newAnalyses: AnalysisWithQuantity[] = selectedMatrixItems.map((matrixItem) => {
            const taxRate = Number(matrixItem.taxRate ?? (matrixItem as any).tax_rate ?? 0);
            const feeAfterTax = Number((matrixItem as any).feeAfterTax || 0);
            let unitPrice = Number(matrixItem.feeBeforeTax || (matrixItem as any).unitPrice || (matrixItem as any).price || 0);

            // Calculate unitPrice from feeAfterTax if not present
            if (!unitPrice && feeAfterTax) {
                unitPrice = feeAfterTax / (1 + taxRate / 100);
            }

            return {
                ...matrixItem,
                id: `temp-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                unitPrice: unitPrice,
                feeBeforeTax: unitPrice,
                taxRate: taxRate,
                feeAfterTax: feeAfterTax || unitPrice * (1 + taxRate / 100),
                quantity: 1,
            };
        });

        const updatedSample: SampleWithQuantity = {
            ...sample,
            analyses: [...sample.analyses, ...newAnalyses],
        };
        const updatedSamples = [...samples];
        updatedSamples[currentSampleIndex] = updatedSample;
        setSamples(updatedSamples);
    };

    const handleRemoveAnalysis = (sampleId: string, analysisId: string) => {
        if (isReadOnly) return;
        setSamples(
            samples.map((s) => {
                if (s.id === sampleId) {
                    return {
                        ...s,
                        analyses: s.analyses.filter((a) => a.parameterId !== analysisId && a.id !== analysisId),
                    };
                }
                return s;
            }),
        );
    };

    const handleBatchUploadSuccess = async (newFileIds: string[]) => {
        const updatedFileIds = [...orderCustomerFileIds, ...newFileIds];
        setOrderCustomerFileIds(updatedFileIds);

        // If in edit mode, auto-save the file linkage if order already exists
        if (mode === "view" || (mode === "edit" && orderId)) {
            try {
                await updateOrder({
                    body: {
                        orderId: orderId,
                        orderCustomerFileIds: updatedFileIds,
                    },
                });
                toast.success("ÄÃ£ cáº­p nháº­t danh sÃ¡ch tÃ i liá»‡u");
            } catch (e) {
                console.error("Auto-update file IDs failed", e);
            }
        }
    };

    const handleFileDownload = async (fileId: string) => {
        setIsDownloading(fileId);
        // Using fileGetUrl to get the latest signed URL
        try {
            const res = await fileGetUrl({ query: { id: fileId } });
            if (res.success && (res.data?.url || res.data?.fileUrl)) {
                let downloadUrl = res.data.url || res.data.fileUrl;
                if (downloadUrl.startsWith("/")) {
                    const baseUrl = import.meta.env.VITE_BACKEND_URL || "";
                    const cleanBase = baseUrl.replace(/\/$/, "");
                    downloadUrl = `${cleanBase}${downloadUrl}`;
                }
                window.open(downloadUrl, "_blank", "noopener,noreferrer");
            } else {
                toast.error("KhÃ´ng tÃ¬m tháº¥y Ä‘Æ°á»ng dáº«n táº£i file");
            }
        } catch (e) {
            toast.error("Lỗi khi tải file");
        } finally {
            setIsDownloading(null);
        }
    };

    const handleFileDelete = async (fileId: string) => {
        if (isReadOnly && mode !== "edit") return;
        if (!confirm("Báº¡n cÃ³ cháº¯c cháº¯n muá»‘n xÃ³a tÃ i liá»‡u nÃ y?")) return;

        try {
            const updatedFileIds = orderCustomerFileIds.filter((id) => id !== fileId);
            setOrderCustomerFileIds(updatedFileIds);

            // If in view/edit mode, persist immediately
            if (orderId) {
                await updateOrder({
                    body: {
                        orderId: orderId,
                        orderCustomerFileIds: updatedFileIds,
                    },
                });
            }

            // Optionally delete from storage
            await fileDelete({ body: { fileId } });
            toast.success("ÄÃ£ xÃ³a tÃ i liá»‡u");
        } catch (e) {
            toast.error("Lỗi khi xóa tài liệu");
        }
    };

    const handleSave = async () => {
        if (isReadOnly) return;

        if (!selectedClient) {
            toast.error(t("order.errorClientRequired") || "Client is required");
            return;
        }

        if (samples.length === 0) {
            toast.error(t("order.errorSamplesRequired") || "At least one sample is required");
            return;
        }

        try {
            // Construct client snapshot
            const clientSnapshot = {
                clientId: selectedClient.clientId,
                clientName: selectedClient.clientName,
                clientAddress: clientAddress,
                clientPhone: clientPhone,
                clientEmail: clientEmail,
                legalId: selectedClient.legalId,
                invoiceInfo: {
                    taxName,
                    taxCode,
                    taxAddress,
                    taxEmail,
                },
            };

            const contactData = {
                contactName: contactPerson,
                contactPhone: contactPhone,
                contactEmail: contactEmail,
                contactAddress: contactAddress,
                contactId: contactId,
                identityId: contactIdentity,
            };

            // Exclude legacy 'discount' field if it exists in initialData
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { discount, ...restInitialData } = initialData || {};

            const orderData = {
                ...restInitialData, // Keep existing fields if edit, but overwrite with new
                // orderId: mode === "create" ? undefined : initialData?.orderId, // Exclude orderId on create
                ...(mode === "create" ? {} : { orderId: initialData?.orderId }), // Only include if edit
                orderStatus: mode === "create" ? "pending" : initialData?.orderStatus || "pending",
                salePersonId: mode === "create" ? user?.identityId : initialData?.salePersonId,
                salePerson: mode === "create" ? user?.identityName : initialData?.salePerson,
                clientId: selectedClient.clientId,
                client: clientSnapshot as any,
                contactPerson: contactData,
                reportRecipient,

                quoteId,
                orderNote: orderNote?.trim() || null,

                samples: samples.map((s) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, ...rest } = s;
                    return {
                        ...rest,
                        analyses: s.analyses.map((a) => ({
                            ...a, // Preserve all original properties from quote/loaded data
                            parameterName: a.parameterName,
                            sampleTypeId: a.sampleTypeId,
                            sampleTypeName: a.sampleTypeName,
                            protocolAccreditation: a.protocolAccreditation,
                            parameterId: a.parameterId,
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
                commission,

                otherItems,
                orderCustomerFileIds,

                totalFeeBeforeTax: pricing.subtotal,
                totalDiscountValue: pricing.discountAmount,
                totalFeeBeforeTaxAndDiscount: pricing.feeBeforeTax,
                totalTaxValue: pricing.tax,
                totalAmount: pricing.total,
            };

            let response;
            if (mode === "create") {
                response = await createOrder({ body: orderData });
            } else {
                response = await updateOrder({ body: orderData });
            }

            if (response.success) {
                toast.success(mode === "create" ? t("order.createSuccess") : t("order.updateSuccess"));
                if (onSaveSuccess) onSaveSuccess(response.data);
            } else {
                toast.error((response.error as any)?.message || "Failed to save order");
            }
        } catch (err) {
            console.error("Save Order Error", err);
            toast.error("An error occurred while saving");
        }
    };

    useImperativeHandle(ref, () => ({
        save: handleSave,
        export: handleExport,
        exportSampleRequest: handleExportSampleRequest,
        hasUnsavedChanges: () => hasUnsavedChanges,
        triggerUpload: () => setIsUploadModalOpen(true),
    }));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
            <div className="flex-1 overflow-auto p-4 md:p-8 bg-background">
                <div className="space-y-6">
                    {/* Section 3: Attachments - Moved to Top */}
                    <div className="bg-card rounded-2xl border border-border p-8 space-y-4">
                        <div className="flex items-center justify-between border-b border-border pb-2">
                            <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2">
                                <Paperclip className="w-4 h-4" /> {t("order.customerAttachments")}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-all text-xs font-semibold"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    {t("order.addAttachment")}
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {orderCustomerFileIds.length === 0 ? (
                                <div className="col-span-full py-8 text-center border-2 border-dashed border-border rounded-xl bg-muted/30">
                                    <Paperclip className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-20" />
                                    <p className="text-xs text-muted-foreground">{t("order.noAttachments")}</p>
                                </div>
                            ) : (
                                orderCustomerFileIds.map((fileId) => {
                                    const file = fileRecords[fileId];
                                    const isThisDownloading = isDownloading === fileId;

                                    return (
                                        <div key={fileId} className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg group hover:border-primary/50 transition-colors">
                                            <div className="flex items-center gap-3 overflow-hidden flex-1">
                                                <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center shrink-0">
                                                    <File className="w-4 h-4 text-primary" />
                                                </div>
                                                <div className="overflow-hidden flex-1">
                                                    <p className="text-xs font-semibold text-foreground truncate" title={file?.fileName || fileId}>
                                                        {file?.fileName || t("order.loadingFileName")}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">ID: {fileId.slice(-8)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1 ml-2">
                                                <button
                                                    onClick={() => handleFileDownload(fileId)}
                                                    disabled={isThisDownloading}
                                                    title="Xem/Táº£i xuá»‘ng"
                                                    className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors disabled:opacity-50"
                                                >
                                                    {isThisDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                                                </button>
                                                <button
                                                    onClick={() => handleFileDelete(fileId)}
                                                    className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors"
                                                    title="XÃ³a"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                        <p className="text-[10px] text-muted-foreground italic">{t("order.attachmentNote")}</p>
                    </div>

                    {/* Quote search block â€“ create mode only */}
                    {!isReadOnly && mode === "create" && (
                        <div className="bg-card rounded-lg border border-border p-4 md:p-6">
                            <h3 className="mb-4 text-base font-semibold">{t("order.information")}</h3>
                            <div>
                                <label className="block mb-2 text-sm font-medium text-foreground">{t("order.quoteCode")}</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        className="flex-1 px-3 py-2 border border-border rounded-lg focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary bg-input text-foreground text-sm"
                                        value={quoteId}
                                        onChange={(e) => setQuoteId(e.target.value)}
                                        placeholder={t("order.quoteCodePlaceholder")}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") handleLoadQuote();
                                        }}
                                        disabled={isReadOnly}
                                    />
                                    <button
                                        onClick={handleLoadQuote}
                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium disabled:opacity-50"
                                        disabled={isReadOnly}
                                    >
                                        <SearchIcon className="w-4 h-4" />
                                        {t("order.loadQuote")}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{t("order.quoteNote")}</p>
                            </div>
                        </div>
                    )}

                    {/* Quote ID read-only display in view/edit mode */}
                    {quoteId && mode !== "create" && (
                        <div className="bg-card rounded-lg border border-border p-4 md:p-6 flex items-center gap-3">
                            <label className="text-sm font-medium text-muted-foreground whitespace-nowrap">{t("order.quoteCode", "MÃ£ bÃ¡o giÃ¡")}:</label>
                            <span className="px-3 py-1.5 bg-muted/50 border border-border rounded-lg text-sm font-semibold text-primary">{quoteId}</span>
                        </div>
                    )}

                    <ClientSectionNew
                        clients={clients}
                        selectedClient={selectedClient}
                        address={clientAddress}
                        clientPhone={clientPhone}
                        clientEmail={clientEmail}
                        contactPerson={contactPerson}
                        contactId={contactId}
                        contactPhone={contactPhone}
                        contactIdentity={contactIdentity}
                        contactEmail={contactEmail}
                        contactAddress={contactAddress}
                        reportRecipient={reportRecipient}
                        onReportRecipientChange={setReportRecipient}
                        taxName={taxName}
                        taxCode={taxCode}
                        taxAddress={taxAddress}
                        taxEmail={taxEmail}
                        onClientChange={handleClientChange}
                        onAddressChange={setClientAddress}
                        onContactPersonChange={setContactPerson}
                        onContactIdChange={setContactId}
                        onContactPhoneChange={setContactPhone}
                        onContactIdentityChange={setContactIdentity}
                        onContactEmailChange={setContactEmail}
                        onContactAddressChange={setContactAddress}
                        onClientPhoneChange={setClientPhone}
                        onClientEmailChange={setClientEmail}
                        onTaxNameChange={setTaxName}
                        onTaxCodeChange={setTaxCode}
                        onTaxAddressChange={setTaxAddress}
                        onTaxEmailChange={setTaxEmail}
                        onAddNewClient={() => setIsClientModalOpen(true)}
                        onEditClient={() => setIsEditClientModalOpen(true)}
                        isReadOnly={isReadOnly}
                    />

                    <OtherItemsSection otherItems={otherItems} onOtherItemsChange={setOtherItems} isReadOnly={isReadOnly} />

                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-foreground">{t("order.samples")}</h3>

                        <DndProvider backend={HTML5Backend}>
                            {samples.map((sample, index) => (
                                <div key={sample.id}>
                                    <SampleCard
                                        sample={sample}
                                        sampleIndex={index}
                                        onRemoveSample={() => handleRemoveSample(sample.id)}
                                        onDuplicateSample={(count) => handleDuplicateSample(sample.id, count)}
                                        onUpdateSample={(updates) => handleUpdateSample(sample.id, updates)}
                                        onAddAnalysis={() => handleOpenModal(index)}
                                        onRemoveAnalysis={(analysisId) => handleRemoveAnalysis(sample.id, analysisId)}
                                        isReadOnly={isReadOnly}
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
                                <label className="block text-sm font-medium mb-2 text-foreground">{t("order.note", "Ghi chÃº")}</label>
                                <textarea
                                    value={orderNote}
                                    onChange={(e) => {
                                        setOrderNote(e.target.value);
                                        if (!isReadOnly) setHasUnsavedChanges(true);
                                    }}
                                    disabled={isReadOnly}
                                    placeholder={t("order.notePlaceholder", "Nháº­p ghi chÃº cho Ä‘Æ¡n hÃ ng...")}
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
                                    commission={commission}
                                    otherItems={otherItems}
                                    onDiscountRateChange={setDiscountRate}
                                    onCommissionChange={setCommission}
                                    isReadOnly={isReadOnly}
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <AnalysisModalNew isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onConfirm={handleAddAnalyses} />
            <AddClientModal
                isOpen={isClientModalOpen}
                onClose={() => setIsClientModalOpen(false)}
                onConfirm={handleAddClientAPI}
                currentIdentityId={user?.identityId}
                currentIdentityName={user?.identityName}
            />
            {selectedClient && (
                <EditClientModal
                    isOpen={isEditClientModalOpen}
                    onClose={() => setIsEditClientModalOpen(false)}
                    client={selectedClient}
                    onConfirm={async (updatedClient) => {
                        try {
                            const response = await updateClient({ body: updatedClient });
                            if (response.success) {
                                toast.success("Client updated");
                                // Update local client list
                                const updated = response.data as Client;
                                setClients((prev) => prev.map((c) => (c.clientId === updated.clientId ? updated : c)));

                                // Update selected client and form fields
                                setSelectedClient(updated);

                                // Explicitly update form fields to reflect changes immediately
                                setClientAddress(updated.clientAddress || "");
                                setClientPhone(updated.clientPhone || "");
                                setClientEmail(updated.clientEmail || "");

                                // Update Invoice Info
                                setTaxName(updated.invoiceInfo?.taxName || updated.clientName || "");
                                setTaxCode(updated.invoiceInfo?.taxCode || updated.legalId || "");
                                setTaxAddress(updated.invoiceInfo?.taxAddress || updated.clientAddress || "");
                                setTaxEmail(updated.invoiceInfo?.taxEmail || "");

                                // Update Contact Info
                                if (updated.clientContacts?.[0]) {
                                    const contact = updated.clientContacts[0];
                                    setContactPerson(contact.contactName || "");
                                    setContactPhone(contact.contactPhone || "");
                                    setContactId(contact.contactId || "");
                                    setContactIdentity(contact.identityId || "");
                                    setContactEmail(contact.contactEmail || "");
                                    setContactAddress(contact.contactAddress || "");
                                }
                                setIsEditClientModalOpen(false);
                            } else {
                                toast.error("Failed to update client");
                            }
                        } catch {
                            toast.error("Error updating client");
                        }
                    }}
                />
            )}
            {previewData && <OrderPrintPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={previewData} />}
            {previewData && (
                <SampleRequestPrintPreviewModal
                    isOpen={isSampleRequestPreviewOpen}
                    onClose={() => setIsSampleRequestPreviewOpen(false)}
                    data={previewData}
                    onUpdateData={(newData) => {
                        if (newData.orderUri !== undefined) setOrderUri(newData.orderUri);
                        if (newData.requestForm !== undefined) setRequestForm(newData.requestForm);
                    }}
                />
            )}
            <CustomerFileUploadModal open={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUploadSuccess={handleBatchUploadSuccess} orderId={orderId || undefined} />
        </div>
    );
});

OrderEditor.displayName = "OrderEditor";
