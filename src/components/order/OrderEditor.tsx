import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { ClientSectionNew } from "@/components/client/ClientSectionNew";
import { SampleCard } from "@/components/order/SampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { AddClientModal } from "@/components/client/AddClientModal";
import { EditClientModal } from "@/components/client/EditClientModal";
import type { Client } from "@/types/client";
import type { Matrix } from "@/types/parameter";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getClients, getQuoteDetail } from "@/api/index";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

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
    const [reportEmail, setReportEmail] = useState("");

    // Invoice Info
    const [taxName, setTaxName] = useState("");
    const [taxCode, setTaxCode] = useState("");
    const [taxAddress, setTaxAddress] = useState("");
    const [taxEmail, setTaxEmail] = useState("");

    const [quoteId, setQuoteId] = useState(initialData?.quoteId || initialQuoteId || "");
    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0);
    const [commission, setCommission] = useState(0);

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
                setReportEmail(contact.contactEmail || (contact as any).email || "");
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
                        // Fallback: If still 0, try feeBeforeTax. Note: feeBeforeTax might be string "100.000 đ" or number
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
            if (initialData.commission !== undefined) {
                setCommission(initialData.commission);
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
        if (!isReadOnly && (selectedClient || contactPerson || samples.length > 0)) {
            setHasUnsavedChanges(true);
        }
    }, [selectedClient, contactPerson, samples, isReadOnly]);

    // Update form when Client is selected (outside of initial load)
    useEffect(() => {
        if (selectedClient && !initialData) {
            setClientAddress(selectedClient.clientAddress);
            setClientPhone(selectedClient.clientPhone || "");
            setClientEmail(selectedClient.clientEmail || "");

            // Invoice
            setTaxName(selectedClient.invoiceInfo?.taxName || selectedClient.clientName);
            setTaxCode(selectedClient.invoiceInfo?.taxCode || selectedClient.legalId);
            setTaxAddress(selectedClient.invoiceInfo?.taxAddress || selectedClient.clientAddress);
            setTaxEmail(selectedClient.invoiceInfo?.taxEmail || "");

            // Contact
            if (selectedClient.clientContacts?.[0]) {
                const contact = selectedClient.clientContacts[0];
                setContactPerson(contact.contactName || (contact as any).name || "");
                setContactPhone(contact.contactPhone || (contact as any).phone || "");
                setContactId(contact.contactId || "");
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactAddress(contact.contactAddress || "");
                setReportEmail(contact.contactEmail || (contact as any).email || "");
            } else {
                // Clear contact fields if no contact
                setContactPerson("");
                setContactId("");
                setContactPhone("");
                setContactIdentity("");
                setContactEmail("");
                setContactAddress("");
                setReportEmail("");
            }
        } else if (selectedClient && initialData && selectedClient.clientId !== initialData.client?.clientId) {
            // If user changes client while editing an order, overwrite fields
            setClientAddress(selectedClient.clientAddress);
            setClientPhone(selectedClient.clientPhone || "");
            setClientEmail(selectedClient.clientEmail || "");

            setTaxName(selectedClient.invoiceInfo?.taxName || selectedClient.clientName);
            setTaxCode(selectedClient.invoiceInfo?.taxCode || selectedClient.legalId);
            setTaxAddress(selectedClient.invoiceInfo?.taxAddress || selectedClient.clientAddress);
            setTaxEmail(selectedClient.invoiceInfo?.taxEmail || "");

            if (selectedClient.clientContacts?.[0]) {
                const contact = selectedClient.clientContacts[0];
                setContactPerson(contact.contactName || (contact as any).name || "");
                setContactPhone(contact.contactPhone || (contact as any).phone || "");
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactAddress(contact.contactAddress || "");
                setReportEmail(contact.contactEmail || (contact as any).email || "");
            }
        }
    }, [selectedClient, initialData]);

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

                    setClientAddress(qClient.clientAddress);
                    setClientPhone(qClient.clientPhone || "");
                    setClientEmail(qClient.clientEmail || "");

                    setTaxName(qClient.invoiceInfo?.taxName || qClient.clientName);
                    setTaxCode(qClient.invoiceInfo?.taxCode || qClient.legalId);
                    setTaxAddress(qClient.invoiceInfo?.taxAddress || qClient.clientAddress);
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
                        setReportEmail(contact.contactEmail || (contact as any).email || "");
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
                                sampleMatrix: s.sampleMatrix || s.matrix || "Water",
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
        // If in view mode and we have initial data, prefer stored totals
        // We assume stored data matches the calculation model at the time of saving
        if (isReadOnly && !hasUnsavedChanges && initialData?.totalAmount !== undefined) {
            const storedSubtotal = Number(initialData.totalFeeBeforeTax) || 0;
            const storedDiscount = Number(initialData.totalDiscountValue) || 0;
            const storedNet = Number(initialData.totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
            const storedTax = Number(initialData.totalTaxValue) || 0;
            const storedTotal = Number(initialData.totalAmount) || 0;

            return {
                subtotal: storedSubtotal,
                discountAmount: storedDiscount,
                feeBeforeTax: storedNet,
                tax: storedTax,
                total: storedTotal,
            };
        }

        let totalFeeBeforeTax = 0; // Sum of Analysis Net Prices (after item discount)
        let sumVAT = 0; // Sum of Analysis VATs (calculated on item net price)

        samples.forEach((sample) => {
            sample.analyses.forEach((analysis) => {
                const quantity = Number(analysis.quantity || 1);
                const unitPrice = Number(analysis.unitPrice || 0); // List Price per unit
                const lineDiscountRate = Number(analysis.discountRate || 0);
                const taxRate = Number(analysis.taxRate || 0);

                const lineTotalGross = unitPrice * quantity;
                // Net Price for this analysis line
                const lineTotalNet = lineTotalGross * (1 - lineDiscountRate / 100);

                totalFeeBeforeTax += lineTotalNet;

                // VAT for this analysis line
                const lineVAT = lineTotalNet * (taxRate / 100);
                sumVAT += lineVAT;
            });
        });

        // Order Level Discount (applied to the Sum of Net Prices)
        const discountAmount = totalFeeBeforeTax * (discountRate / 100);

        // Fee After Order Discount (The new "Net" for the Order)
        const totalFeeBeforeTaxAndDiscount = totalFeeBeforeTax - discountAmount;

        // Final VAT (Sum of Analysis VATs, reduced by Order Discount Rate)
        // Formula: SumVAT * (1 - OrderDiscount%)
        const totalTax = sumVAT * (1 - discountRate / 100);

        // Grand Total
        const total = totalFeeBeforeTaxAndDiscount + totalTax;

        return {
            subtotal: totalFeeBeforeTax,
            discountAmount,
            feeBeforeTax: totalFeeBeforeTaxAndDiscount,
            tax: totalTax,
            total,
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
            reportEmail,
            contactEmail,
            contactAddress,

            clientAddress,
            taxName,
            taxCode,
            taxAddress,

            samples: samples.map((s) => ({
                sampleName: s.sampleName || "",
                sampleMatrix: s.sampleMatrix || "",
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
                        parameterName: a.parameterName,
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
        };
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
            const { createClient } = await import("@/api/index");
            const response = await createClient({ body: newClientData });
            if (response.success && response.data) {
                toast.success("Client created");
                const created = response.data as Client;
                setClients((prev) => [...prev, created]);
                setSelectedClient(created);
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
            sampleMatrix: "",
            sampleNote: "",
            analyses: [],
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
            const taxRate = Number(matrixItem.taxRate || 0);
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
            const { createOrder, updateOrder } = await import("@/api/index");

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
                quoteId,

                samples: samples.map((s) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, ...rest } = s;
                    return {
                        ...rest,
                        analyses: s.analyses.map((a) => ({
                            ...a, // Preserve all original properties from quote/loaded data
                            parameterName: a.parameterName,
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
    }));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
            <div className="flex-1 overflow-auto p-8 bg-background">
                <div className="space-y-6">
                    {!isReadOnly && mode === "create" && (
                        <div className="bg-card rounded-lg border border-border p-6">
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
                                        // TODO: Add loading state
                                    >
                                        <SearchIcon className="w-4 h-4" />
                                        {t("order.loadQuote")}
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{t("order.quoteNote")}</p>
                            </div>
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
                        reportEmail={reportEmail}
                        taxName={taxName}
                        taxCode={taxCode}
                        taxAddress={taxAddress}
                        taxEmail={taxEmail}
                        onClientChange={setSelectedClient}
                        onAddressChange={setClientAddress}
                        onContactPersonChange={setContactPerson}
                        onContactIdChange={setContactId}
                        onContactPhoneChange={setContactPhone}
                        onContactIdentityChange={setContactIdentity}
                        onReportEmailChange={setReportEmail}
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
                        <div className="flex justify-end">
                            <div className="w-[600px]">
                                <PricingSummary
                                    subtotal={pricing.subtotal}
                                    discountRate={discountRate}
                                    discountAmount={pricing.discountAmount}
                                    feeBeforeTax={pricing.feeBeforeTax}
                                    tax={pricing.tax}
                                    total={pricing.total}
                                    commission={commission}
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
                            const { updateClient } = await import("@/api/index");
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
                                setTaxName(updated.invoiceInfo?.taxName || updated.clientName);
                                setTaxCode(updated.invoiceInfo?.taxCode || updated.legalId);
                                setTaxAddress(updated.invoiceInfo?.taxAddress || updated.clientAddress);
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
                                    setReportEmail(contact.contactEmail || "");
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
            {previewData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestPreviewOpen} onClose={() => setIsSampleRequestPreviewOpen(false)} data={previewData} />}
        </div>
    );
});
