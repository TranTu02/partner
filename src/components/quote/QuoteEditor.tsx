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
import type { EditorMode, SampleWithQuantity, AnalysisWithQuantity } from "../order/OrderEditor";
import { getClients, createClient } from "@/api/index";
import { toast } from "sonner";

interface QuoteEditorProps {
    mode: EditorMode;
    initialData?: any; // Quote
    onSaveSuccess?: () => void;
    onBack?: () => void;
}

export interface QuoteEditorRef {
    save: () => void;
    export: () => void;
    hasUnsavedChanges: () => boolean;
}

export const QuoteEditor = forwardRef<QuoteEditorRef, QuoteEditorProps>(({ mode, initialData, onSaveSuccess }, ref) => {
    const { t } = useTranslation();
    const isReadOnly = mode === "view";

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
    const [discount, setDiscount] = useState(initialData?.discount || 0);
    const [commission, setCommission] = useState(0);

    // UI State
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
    const [printData, setPrintData] = useState<QuotePrintData | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [currentSampleIndex, setCurrentSampleIndex] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    const quoteId = initialData?.quoteId || `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`;

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
                setSamples(initialData.samples);
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
            sampleId: `SAM-${timestamp}`,
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
        const newAnalyses: AnalysisWithQuantity[] = selectedMatrixItems.map((matrixItem, index) => ({
            ...matrixItem,
            id: `A${timestamp}_${index}_${matrixItem.matrixId}`,
            unitPrice: matrixItem.feeBeforeTax || 0,
            quantity: 1,
        }));

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
        let subtotal = 0;
        samples.forEach((sample) => {
            sample.analyses.forEach((analysis) => {
                subtotal += (analysis.unitPrice || 0) * (analysis.quantity || 1);
            });
        });

        const discountAmount = (subtotal * discount) / 100;
        const subtotalAfterDiscount = subtotal - discountAmount;

        let totalTax = 0;
        samples.forEach((sample) => {
            sample.analyses.forEach((analysis) => {
                const lineSubtotal = (analysis.unitPrice || 0) * (analysis.quantity || 1);
                totalTax += lineSubtotal * ((analysis.taxRate || 0) / 100);
            });
        });

        const taxAfterDiscount = totalTax * (1 - discount / 100);
        const total = subtotalAfterDiscount + taxAfterDiscount;

        return { subtotal, tax: taxAfterDiscount, total };
    };

    const pricing = calculatePricing();

    const handleSave = () => {
        if (isReadOnly) return;
        alert(t("order.saveSuccess"));
        setHasUnsavedChanges(false);
        if (onSaveSuccess) {
            onSaveSuccess();
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
                analyses: s.analyses.map((a) => ({
                    parameterName: a.parameterName,
                    protocolCode: a.protocolCode || "",
                    unitPrice: a.unitPrice || 0,
                    quantity: a.quantity || 1,
                })),
            })),
            pricing,
            discount,
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
            <AddClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleAddClient} />
            {printData && <QuotePrintPreviewModal isOpen={isPrintModalOpen} onClose={() => setIsPrintModalOpen(false)} data={printData} />}
        </div>
    );
});
