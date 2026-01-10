import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus } from "lucide-react";
import { ClientSectionNew } from "@/components/client/ClientSectionNew";
import { SampleCard } from "@/components/order/SampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { AddClientModal } from "@/components/client/AddClientModal";
import { QuotePrintPreviewModal } from "@/components/quote/QuotePrintPreviewModal";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";
import type { Client } from "@/types/client";
import type { Matrix } from "@/types/parameter";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import type { EditorMode } from "../order/OrderEditor";
import type { SampleWithQuantity, AnalysisWithQuantity } from "@/components/order/SampleCard";
import { getClients, createClient } from "@/api/index";
import { toast } from "sonner";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

interface QuoteEditorProps {
    mode: EditorMode;
    initialData?: any; // Quote
    onSaveSuccess?: (data?: any) => void;
    onBack?: () => void;
}

export interface QuoteEditorRef {
    save: () => void;
    export: () => void;
    hasUnsavedChanges: () => boolean;
}

export const QuoteEditor = forwardRef<QuoteEditorRef, QuoteEditorProps>(({ mode, initialData, onSaveSuccess }, ref) => {
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
                const res = await getClients({ query: { itemsPerPage: 100 } });
                if (res.success && res.data) {
                    setClients(res.data as Client[]);
                }
            } catch (err) {
                console.error("Failed to load clients", err);
            }
        };
        fetchClients();
    }, []);

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

    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discountRate, setDiscountRate] = useState(initialData?.discountRate || 0);
    const [commission, setCommission] = useState(0);

    // UI State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [currentSampleIndex, setCurrentSampleIndex] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const quoteId = initialData?.quoteId;

    // Populate From Initial Data
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
                const mappedSamples = initialData.samples.map((s: any) => ({
                    ...s,
                    id: s.id || `restored-sample-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    analyses: (s.analyses || []).map((a: any) => ({
                        ...a,
                        id: a.id || `restored-analysis-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                    })),
                }));
                setSamples(mappedSamples);
            }
            // Ensure discountRate is synced from initialData
            if (initialData.discountRate !== undefined) {
                setDiscountRate(initialData.discountRate);
            }
        }
    }, [initialData]);

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
                setContactPerson("");
                setContactPhone("");
                setContactIdentity("");
                setContactEmail("");
                setContactPosition("");
                setContactAddress("");
                setReportEmail("");
            }
        } else if (selectedClient && initialData && selectedClient.clientId !== initialData.client?.clientId) {
            // Overwrite on client change
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

    const handleAddClient = async (newClientData: any) => {
        try {
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
        } catch (e) {
            toast.error("Error creating client");
        }
    };

    const handleAddSample = () => {
        if (isReadOnly) return;
        const timestamp = Date.now();
        const newSample: SampleWithQuantity = {
            id: `S${timestamp}`,
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

        const timestamp = Date.now();
        const duplicatedSample: SampleWithQuantity = {
            ...sampleToDuplicate,
            id: `S${timestamp}`,
            sampleId: undefined,
            analyses: sampleToDuplicate.analyses.map((a, idx) => ({ ...a, id: `${a.parameterId}_copy_${timestamp}_${idx}` })),
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
        const timestamp = Date.now();
        const newAnalyses: AnalysisWithQuantity[] = selectedMatrixItems.map((matrixItem, index) => {
            const feeAfterTax = Number((matrixItem as any).feeAfterTax || 0);
            const taxRate = Number(matrixItem.taxRate || 0); // usage of taxRate from matrix if available

            // Calculate unitPrice from feeAfterTax if available
            // unitPrice = feeAfterTax / (1 + taxRate/100)
            let unitPrice = matrixItem.feeBeforeTax || 0;
            if (feeAfterTax) {
                unitPrice = feeAfterTax / (1 + taxRate / 100);
            }

            return {
                ...matrixItem,
                id: `A${timestamp}_${index}_${matrixItem.matrixId}`,
                unitPrice: unitPrice,
                taxRate: taxRate,
                feeAfterTax: feeAfterTax,
                quantity: 1,
                groupId: (matrixItem as any).groupId,
                groupDiscount: (matrixItem as any).groupDiscount,
                discountRate: (matrixItem as any).discountRate,
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

    const calculatePricing = () => {
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

        let totalFeeBeforeTax = 0; // Sum of Analysis Net Prices
        let sumVAT = 0; // Sum of Analysis VATs

        samples.forEach((sample) => {
            sample.analyses.forEach((analysis) => {
                const quantity = Number(analysis.quantity || 1);
                const unitPrice = Number(analysis.unitPrice || 0);
                const lineDiscountRate = Number(analysis.discountRate || 0);
                const taxRate = Number(analysis.taxRate || 0);

                const lineTotalGross = unitPrice * quantity;
                const lineTotalNet = lineTotalGross * (1 - lineDiscountRate / 100);

                totalFeeBeforeTax += lineTotalNet;

                const lineVAT = lineTotalNet * (taxRate / 100);
                sumVAT += lineVAT;
            });
        });

        const discountAmount = totalFeeBeforeTax * (discountRate / 100);
        const totalFeeBeforeTaxAndDiscount = totalFeeBeforeTax - discountAmount;

        // Final VAT (Reduced by Quote Discount)
        const totalTax = sumVAT * (1 - discountRate / 100);

        const total = totalFeeBeforeTaxAndDiscount + totalTax;

        return {
            subtotal: totalFeeBeforeTax,
            discountAmount: discountAmount,
            feeBeforeTax: totalFeeBeforeTaxAndDiscount,
            tax: totalTax,
            total,
        };
    };

    const pricing = calculatePricing();

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
            const { createQuote, updateQuote } = await import("@/api/index");

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

            // Exclude legacy 'discount' field if it exists in initialData
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { discount, ...restInitialData } = initialData || {};

            const quoteData = {
                ...restInitialData,
                ...(mode === "create" ? {} : { quoteId: initialData?.quoteId }),
                quoteStatus: mode === "create" ? "draft" : initialData?.quoteStatus || "draft",
                salePersonId: mode === "create" ? user?.identityId : initialData?.salePersonId,
                salePerson: mode === "create" ? user?.identityName : initialData?.salePerson,
                clientId: selectedClient.clientId,
                client: clientSnapshot,

                samples: samples.map((s) => ({
                    ...s,
                    analyses: s.analyses.map((a) => {
                        const quantity = a.quantity || 1;
                        const unitPrice = a.unitPrice || 0;
                        const lineList = unitPrice * quantity;
                        const discountRate = a.discountRate || 0;
                        const discountValue = lineList * (discountRate / 100);
                        const feeNet = lineList - discountValue;

                        return {
                            ...a,
                            parameterPrice: a.unitPrice,
                            feeBeforeTax: feeNet,
                            discountRate: a.discountRate,
                            parameterTaxRate: a.taxRate,
                            tax: (feeNet * (a.taxRate || 0)) / 100, // Tax on net
                        };
                    }),
                })),

                discountRate,
                // commission, // Quote might not have commission in backend schema? Adding just in case.

                totalFeeBeforeTax: pricing.subtotal,
                totalDiscountValue: pricing.discountAmount,
                totalFeeBeforeTaxAndDiscount: pricing.feeBeforeTax,
                totalTaxValue: pricing.tax,
                totalAmount: pricing.total,
            };

            let response;
            if (mode === "create") {
                response = await createQuote({ body: quoteData });
            } else {
                response = await updateQuote({ body: quoteData });
            }

            if (response.success) {
                toast.success(mode === "create" ? t("quote.createSuccess") : t("quote.updateSuccess"));
                setHasUnsavedChanges(false);
                if (onSaveSuccess) {
                    onSaveSuccess(response.data);
                }
            } else {
                toast.error((response.error as any)?.message || "Failed to save quote");
            }
        } catch (error) {
            console.error("Save Quote Error", error);
            toast.error("An error occurred while saving");
        }
    };

    const handleExport = () => {
        // Construct a client snapshot with updated fields for print
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
                                ...selectedClient.clientContacts[0],
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

        const data: QuotePrintData = {
            quoteId,
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
                    const quantity = a.quantity || 1;
                    const unitPrice = a.unitPrice || 0;
                    const lineList = unitPrice * quantity;
                    const discountRate = a.discountRate || 0;
                    const lineNet = lineList * (1 - discountRate / 100);
                    const taxRate = a.taxRate || 0;
                    const feeAfterTax = lineNet * (1 + taxRate / 100);

                    return {
                        parameterName: a.parameterName,
                        parameterId: a.parameterId,
                        feeBeforeTax: lineNet,
                        feeBeforeTaxAndDiscount: lineList,
                        taxRate: taxRate,
                        feeAfterTax: feeAfterTax,
                        discountRate: discountRate,
                        quantity: quantity,
                        unitPrice: unitPrice,
                    };
                }),
            })),
            pricing,
            discountRate,
            commission: 0,
        };
        setPrintData(data);
        setIsPrintModalOpen(true);
    };

    useImperativeHandle(ref, () => ({
        save: handleSave,
        export: handleExport,
        hasUnsavedChanges: () => hasUnsavedChanges,
    }));

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-background text-foreground">
            <div className="flex-1 overflow-auto p-8 bg-background">
                <div className="space-y-6">
                    <div>
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
                    </div>

                    <div className="space-y-4">
                        <h3 className="text-base font-semibold text-foreground">{t("order.samples")}</h3>

                        <DndProvider backend={HTML5Backend}>
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
                onConfirm={handleAddClient}
                currentIdentityId={user?.identityId}
                currentIdentityName={user?.identityName}
            />
            {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </div>
    );
});
