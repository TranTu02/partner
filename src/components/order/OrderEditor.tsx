import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { ClientSectionNew } from "@/components/client/ClientSectionNew";
import { SampleCard } from "@/components/order/SampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { AddClientModal } from "@/components/client/AddClientModal";
import type { Client } from "@/types/client";
import type { Matrix } from "@/types/parameter";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { getClients, getQuotes } from "@/api/index";
import { toast } from "sonner";

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
    const [contactPhone, setContactPhone] = useState("");
    const [contactIdentity, setContactIdentity] = useState("");
    const [contactEmail, setContactEmail] = useState("");
    const [contactPosition, setContactPosition] = useState("");
    const [contactAddress, setContactAddress] = useState("");
    const [reportEmail, setReportEmail] = useState("");

    // Invoice Info
    const [taxName, setTaxName] = useState("");
    const [taxCode, setTaxCode] = useState("");
    const [taxAddress, setTaxAddress] = useState("");
    const [taxEmail, setTaxEmail] = useState("");

    const [quoteId, setQuoteId] = useState(initialData?.quoteId || initialQuoteId || "");
    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discount, setDiscount] = useState(0);
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

            // Populate Contact from Snapshot
            if (initialData.client?.clientContacts?.[0]) {
                const contact = initialData.client.clientContacts[0];
                setContactPerson(contact.contactName || (contact as any).name || "");
                setContactPhone(contact.contactPhone || (contact as any).phone || "");
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactPosition(contact.contactPosition || (contact as any).position || "");
                setContactAddress(contact.contactAddress || "");
                setReportEmail(contact.contactEmail || (contact as any).email || "");
            }

            if (initialData.samples && initialData.samples.length > 0) {
                // Map API data keys to internal Editor keys if they differ
                const mappedSamples = initialData.samples.map((s: any) => ({
                    ...s,
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
        }
    }, [initialData]);

    const [previewData, setPreviewData] = useState<OrderPrintData | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const [isSampleRequestPreviewOpen, setIsSampleRequestPreviewOpen] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
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
                setContactIdentity(contact.identityId || "");
                setContactEmail(contact.contactEmail || (contact as any).email || "");
                setContactPosition(contact.contactPosition || (contact as any).position || "");
                setContactAddress(contact.contactAddress || "");
                setReportEmail(contact.contactEmail || (contact as any).email || "");
            } else {
                // Clear contact fields if no contact
                setContactPerson("");
                setContactPhone("");
                setContactIdentity("");
                setContactEmail("");
                setContactPosition("");
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
                setContactPosition(contact.contactPosition || (contact as any).position || "");
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
            // User specified query "quoteId=<value>" returns a single object
            const response = await getQuotes({ query: { quoteId: idToUse } });

            let foundQuote: any = null;
            if (response.success && response.data) {
                if (Array.isArray(response.data)) {
                    // unexpected but handle list
                    foundQuote = response.data[0];
                } else if ((response.data as any).data && Array.isArray((response.data as any).data)) {
                    // unexpected pagination
                    foundQuote = (response.data as any).data[0];
                } else {
                    // Expected single object
                    foundQuote = response.data;
                }
            }

            if (foundQuote && foundQuote.client) {
                setSelectedClient(foundQuote.client);
                // Map quote client data to form state (similar to selectedClient)
                const qClient = foundQuote.client;

                setClientAddress(qClient.clientAddress);
                setClientPhone(qClient.clientPhone || "");
                setClientEmail(qClient.clientEmail || "");

                setTaxName(qClient.invoiceInfo?.taxName || qClient.clientName);
                setTaxCode(qClient.invoiceInfo?.taxCode || qClient.legalId);
                setTaxAddress(qClient.invoiceInfo?.taxAddress || qClient.clientAddress);
                setTaxEmail(qClient.invoiceInfo?.taxEmail || "");

                if (qClient.clientContacts?.[0]) {
                    const contact = qClient.clientContacts[0];
                    setContactPerson(contact.contactName || (contact as any).name || "");
                    setContactPhone(contact.contactPhone || (contact as any).phone || "");
                    setContactIdentity(contact.identityId || "");
                    setContactEmail(contact.contactEmail || (contact as any).email || "");
                    setContactPosition(contact.contactPosition || (contact as any).position || "");
                    setContactAddress(contact.contactAddress || "");
                    setReportEmail(contact.contactEmail || (contact as any).email || "");
                }

                setDiscount(foundQuote.discount || 0);

                const convertedSamples: SampleWithQuantity[] = (foundQuote.samples || []).map((s: any) => ({
                    id: s.sampleId || `temp-sample-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    sampleId: s.sampleId,
                    sampleName: s.sampleName || s.name || "Sample",
                    sampleMatrix: s.sampleMatrix || s.matrix || "Water",
                    sampleNote: s.sampleNote || "",
                    analyses: (s.analyses || []).map((a: any) => ({
                        ...a,
                        id: a.id || `temp-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        unitPrice: a.unitPrice || a.feeBeforeTax || 0, // Quote might use feeBeforeTax or unitPrice
                        quantity: a.quantity || 1,
                        taxRate: a.taxRate || 0,
                    })),
                }));

                setSamples(convertedSamples);
                toast.success(t("order.loadQuoteSuccess"));
            } else {
                toast.error(t("order.errorQuoteNotFound"));
            }
        } catch (error) {
            console.error(error);
            toast.error("Error loading quote");
        }
    };

    const calculatePricing = () => {
        // If in view mode and we have initial data, prefer stored totals to avoid rounding diffs or recalculation issues
        // BUT only if we don't have unsaved changes. If we have changes, we want to see the live calc.
        if (isReadOnly && !hasUnsavedChanges && initialData?.totalAmount !== undefined) {
            // Retrieve stored values or fallback to 0
            // Note: totalFeeBeforeTax usually means Sum of Item Prices (Subtotal) in this codebase context?
            // Or does it mean Net?
            // Looking at types: totalFeeBeforeTax, totalFeeBeforeTaxAndDiscount.

            // If the backend stores:
            // totalFeeBeforeTax (Gross)
            // totalDiscountValue
            // totalFeeBeforeTaxAndDiscount (Net)
            // totalTaxValue
            // totalAmount

            // We should map them:
            const storedSubtotal = Number(initialData.totalFeeBeforeTax) || 0;
            const storedDiscount = Number(initialData.totalDiscountValue) || 0;
            const storedNet = Number(initialData.totalFeeBeforeTaxAndDiscount) || storedSubtotal - storedDiscount;
            const storedTotal = Number(initialData.totalAmount) || 0;

            // "khi view thì giá trị thuế lấy theo (totalAmount - totalFeeBeforeTax) / totalFeeBeforeTax"
            // The user likely meant: Tax Value = Total Amount - Net Fee.
            // (The formula in prompt was division, usually implication of Rate, but context says "giá trị thuế" -> Value).
            // Let's assume they want Tax Value = storedTotal - storedNet.
            const storedTax = storedTotal - storedNet;

            return {
                subtotal: storedSubtotal,
                discountAmount: storedDiscount,
                feeBeforeTax: storedNet,
                tax: storedTax,
                total: storedTotal,
            };
        }

        let subtotal = 0;
        let totalTax = 0;

        samples.forEach((sample) => {
            sample.analyses.forEach((analysis) => {
                const lineSubtotal = (analysis.unitPrice || 0) * (analysis.quantity || 1);
                subtotal += lineSubtotal;
                totalTax += lineSubtotal * ((analysis.taxRate || 0) / 100);
            });
        });

        const discountAmount = (subtotal * discount) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;

        // "taxRate ... tính bằng Tổng tiền thuế tất cả chỉ tiêu / tổng giá trị trước thuế toàn bộ chỉ tiêu * 100"
        // This implies effective tax calculation might be needed if we were saving a single rate.
        // But for display of 'Tax Value', we typically just sum the tax.
        // However, if the Tax is also discounted?:
        // Previous logic: const taxAfterDiscount = totalTax * (1 - discount / 100);
        // If the user wants specific logic, we stick to standard: Tax is usually calculated on the discounted base if the discount is "pre-tax".
        // Let's assume standard behavior unless the user's formula implies otherwise.
        // The user says "Total Tax Value ... (after discount)".

        const taxAfterDiscount = totalTax * (1 - discount / 100);
        const total = subtotalAfterDiscount + taxAfterDiscount;

        return { subtotal, discountAmount, feeBeforeTax: subtotalAfterDiscount, tax: taxAfterDiscount, total };
    };

    const pricing = calculatePricing();

    const handleExport = () => {
        // Construct a client snapshot with updated fields
        const clientSnapshot = selectedClient
            ? {
                  ...selectedClient,
                  clientAddress,
                  clientPhone,
                  clientEmail,
                  invoiceInfo: {
                      taxName,
                      taxCode,
                      taxAddress,
                      taxEmail,
                  },
                  clientContacts: selectedClient.clientContacts
                      ? [
                            {
                                ...(selectedClient.clientContacts[0] || {}),
                                contactName: contactPerson,
                                contactPhone: contactPhone,
                                contactEmail: contactEmail,
                                contactPosition: contactPosition,
                                contactAddress: contactAddress,
                                identityId: contactIdentity,
                            },
                        ]
                      : [],
              }
            : null;

        const data: OrderPrintData = {
            orderId,
            client: clientSnapshot,

            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail,
            contactEmail,
            contactPosition,
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
                    const feeAfter = a.feeAfterTax || (a.unitPrice || 0) * (a.quantity || 1) * (1 + (a.taxRate || 0) / 100);
                    const feeBefore = a.feeBeforeTax || (a.unitPrice || 0) * (a.quantity || 1) || feeAfter / (1 + (a.taxRate || 0) / 100);
                    return {
                        parameterName: a.parameterName,
                        parameterId: a.parameterId,
                        feeBeforeTax: feeBefore,
                        taxRate: a.taxRate || 0,
                        feeAfterTax: feeAfter,
                    };
                }),
            })),

            pricing,
            discount,
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

    const handleDuplicateSample = (sampleId: string) => {
        if (isReadOnly) return;
        const sampleToDuplicate = samples.find((s) => s.id === sampleId);
        if (!sampleToDuplicate) return;

        const newSampleId = `temp-sample-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const duplicatedSample: SampleWithQuantity = {
            ...sampleToDuplicate,
            id: newSampleId,
            sampleId: undefined,
            analyses: sampleToDuplicate.analyses.map((a) => ({ ...a, id: `temp-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}` })),
        };
        setSamples([...samples, duplicatedSample]);
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
                ...selectedClient,
                clientAddress,
                clientPhone,
                clientEmail,
                invoiceInfo: {
                    taxName,
                    taxCode,
                    taxAddress,
                    taxEmail,
                },
                clientContacts: selectedClient.clientContacts
                    ? [
                          {
                              ...(selectedClient.clientContacts[0] || {}),
                              contactName: contactPerson,
                              contactPhone: contactPhone,
                              contactEmail: contactEmail,
                              contactPosition: contactPosition,
                              contactAddress: contactAddress,
                              identityId: contactIdentity,
                          },
                      ]
                    : [],
            };

            const orderData = {
                ...(initialData || {}), // Keep existing fields if edit, but overwrite with new
                // orderId: mode === "create" ? undefined : initialData?.orderId, // Exclude orderId on create
                ...(mode === "create" ? {} : { orderId: initialData?.orderId }), // Only include if edit
                orderStatus: mode === "create" ? "pending" : initialData?.orderStatus || "pending",
                salePersonId: mode === "create" ? user?.identityId : initialData?.salePersonId,
                salePerson: mode === "create" ? user?.identityName : initialData?.salePerson,
                clientId: selectedClient.clientId || selectedClient.clientId,
                client: clientSnapshot,
                quoteId,

                samples: samples.map((s) => {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const { id, ...rest } = s;
                    return {
                        ...rest,
                        analyses: s.analyses.map((a) => ({
                            parameterName: a.parameterName,
                            parameterId: a.parameterId,
                            unitPrice: Number(a.unitPrice) || 0, // Ensure unitPrice is saved
                            feeBeforeTax: (a.unitPrice || 0) * (a.quantity || 1),
                            taxRate: a.taxRate || 0,
                            feeAfterTax: (a.unitPrice || 0) * (a.quantity || 1) * (1 + (a.taxRate || 0) / 100),
                        })),
                    };
                }),

                discount,
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
                        contactPhone={contactPhone}
                        contactIdentity={contactIdentity}
                        contactEmail={contactEmail}
                        contactPosition={contactPosition}
                        contactAddress={contactAddress}
                        reportEmail={reportEmail}
                        taxName={taxName}
                        taxCode={taxCode}
                        taxAddress={taxAddress}
                        taxEmail={taxEmail}
                        onClientChange={setSelectedClient}
                        onAddressChange={setClientAddress}
                        onContactPersonChange={setContactPerson}
                        onContactPhoneChange={setContactPhone}
                        onContactIdentityChange={setContactIdentity}
                        onReportEmailChange={setReportEmail}
                        onContactEmailChange={setContactEmail}
                        onContactPositionChange={setContactPosition}
                        onContactAddressChange={setContactAddress}
                        onClientPhoneChange={setClientPhone}
                        onClientEmailChange={setClientEmail}
                        onTaxNameChange={setTaxName}
                        onTaxCodeChange={setTaxCode}
                        onTaxAddressChange={setTaxAddress}
                        onTaxEmailChange={setTaxEmail}
                        onAddNewClient={() => setIsClientModalOpen(true)}
                        isReadOnly={isReadOnly}
                    />

                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-foreground">{t("order.samples")}</h3>

                        {samples.map((sample, index) => (
                            <div key={sample.id}>
                                <SampleCard
                                    sample={sample}
                                    sampleIndex={index}
                                    onRemoveSample={() => handleRemoveSample(sample.id)}
                                    onDuplicateSample={() => handleDuplicateSample(sample.id)}
                                    onUpdateSample={(updates) => handleUpdateSample(sample.id, updates)}
                                    onAddAnalysis={() => handleOpenModal(index)}
                                    onRemoveAnalysis={(analysisId) => handleRemoveAnalysis(sample.id, analysisId)}
                                    isReadOnly={isReadOnly}
                                />
                            </div>
                        ))}

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
                            <div className="w-96">
                                <PricingSummary
                                    subtotal={pricing.subtotal}
                                    discount={discount}
                                    discountAmount={pricing.discountAmount}
                                    feeBeforeTax={pricing.feeBeforeTax}
                                    tax={pricing.tax}
                                    total={pricing.total}
                                    commission={commission}
                                    onDiscountChange={setDiscount}
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
            {previewData && <OrderPrintPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={previewData} />}
            {previewData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestPreviewOpen} onClose={() => setIsSampleRequestPreviewOpen(false)} data={previewData} />}
        </div>
    );
});
