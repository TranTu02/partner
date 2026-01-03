import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Plus, Search as SearchIcon } from "lucide-react";
import { ClientSectionNew } from "@/components/client/ClientSectionNew";
import { SampleCard } from "@/components/order/SampleCard";
import { PricingSummary } from "@/components/quote/PricingSummary";
import { AnalysisModalNew } from "@/components/parameter/AnalysisModalNew";
import { AddClientModal } from "@/components/client/AddClientModal";
import type { Client } from "@/types/client";
import type { Matrix } from "@/types/parameter";
// Assuming Order definition is needed, we can import it or define interface locally if unrelated to full type
// import type { Order } from "@/types/order";
// Using basic types or 'any' for Order to match usage if type definition is partial in files
// For now, let's substitute Order with any or a minimal interface to avoid conflict if types/order.ts is not fully aligned.
// Actually, let's check input 'initialData?: Order'.
// I'll define Order locally or import if available. I'll use 'any' for now for Order to facilitate refactor without type hell.
// import { useAuth } from "../../contexts/AuthContext";
// @ts-ignore
import { createRoot } from "react-dom/client";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import { OrderPrintPreviewModal } from "@/components/order/OrderPrintPreviewModal";
import { SampleRequestPrintPreviewModal } from "@/components/order/SampleRequestPrintPreviewModal";
import { useTranslation } from "react-i18next";
import { getClients, getQuotes } from "@/api/index";
import { toast } from "sonner";

export type EditorMode = "view" | "edit" | "create";

// Omit strict audit fields from Matrix for the UI editor to avoid conflicts with child components
export interface AnalysisWithQuantity extends Omit<Matrix, "createdAt" | "createdById" | "modifiedAt" | "modifiedById"> {
    id: string; // analysisId or temp ID for frontend key
    unitPrice: number;
    quantity: number;
    userQuantity?: number;

    // Optional audit fields if needed
    createdAt?: string;
    createdById?: string;
}

export interface SampleWithQuantity {
    id: string;
    sampleId?: string;
    sampleName: string;
    sampleMatrix: string;
    sampleNote?: string;
    analyses: AnalysisWithQuantity[];
}

interface OrderEditorProps {
    mode: EditorMode;
    initialData?: any; // Order
    onSaveSuccess?: () => void;
    onBack?: () => void;
}

export interface OrderEditorRef {
    save: () => void;
    export: () => void;
    exportSampleRequest: () => void;
    hasUnsavedChanges: () => boolean;
}

export const OrderEditor = forwardRef<OrderEditorRef, OrderEditorProps>(({ mode, initialData, onSaveSuccess }, ref) => {
    const { t } = useTranslation();
    // const { user } = useAuth();
    const isReadOnly = mode === "view";

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
    const [contactPerson, setContactPerson] = useState("");
    const [contactPhone, setContactPhone] = useState("");
    const [contactIdentity, setContactIdentity] = useState("");
    const [reportEmail, setReportEmail] = useState("");
    const [clientAddress, setClientAddress] = useState(initialData?.client?.clientAddress || "");
    const [quoteId, setQuoteId] = useState(initialData?.quoteId || "");
    const [samples, setSamples] = useState<SampleWithQuantity[]>([]);
    const [discount, setDiscount] = useState(0);
    const [commission, setCommission] = useState(0);

    // Initial Data Population
    useEffect(() => {
        if (initialData) {
            setSelectedClient(initialData.client || null);
            setClientAddress(initialData.client?.clientAddress || "");
            if (initialData.client?.contacts?.[0]) {
                setContactPerson(initialData.client.contacts[0].name);
                setContactPhone(initialData.client.contacts[0].phone || "");
                setContactIdentity(initialData.client.contacts[0].identityId || "");
                setReportEmail(initialData.client.contacts[0].email || "");
            }
            if (initialData.samples && initialData.samples.length > 0) {
                // Determine if samples need mapping
                setSamples(initialData.samples);
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

    const orderId = initialData?.orderId || `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-01`;

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
        } else if (selectedClient && initialData && selectedClient.clientId !== initialData.client?.clientId) {
            setClientAddress(selectedClient.clientAddress);
        }
    }, [selectedClient, initialData]);

    const handleLoadQuote = async () => {
        if (isReadOnly) return;
        if (!quoteId.trim()) {
            alert(t("order.errorQuoteCode"));
            return;
        }

        try {
            // Try fetching by ID first (if valid UUID), then search?
            // Or just search by code.
            const response = await getQuotes({ query: { search: quoteId } });

            let foundQuote: any = null;
            if (response.success && response.data && (response.data as any[]).length > 0) {
                // Assume first match or exact match on quoteId/Code
                foundQuote = (response.data as any[]).find((q) => q.quoteId === quoteId || q.paramCode === quoteId);
                if (!foundQuote) foundQuote = (response.data as any[])[0];
            }

            if (foundQuote) {
                // Fetch detailed quote if needed, or use list data if sufficient.
                // Ideally getQuoteDetail(foundQuote.id)

                setSelectedClient(foundQuote.client);
                if (foundQuote.client.contacts?.[0]) {
                    setContactPerson(foundQuote.client.contacts[0].name);
                    setContactPhone(foundQuote.client.contacts[0].phone || "");
                    setContactIdentity(foundQuote.client.contacts[0].identityId || "");
                    setReportEmail(foundQuote.client.contacts[0].email || "");
                }
                setClientAddress(foundQuote.client.clientAddress);
                setDiscount(foundQuote.discount);

                const convertedSamples: SampleWithQuantity[] = (foundQuote.samples || []).map((s: any) => ({
                    id: s.sampleId || crypto.randomUUID(),
                    sampleId: s.sampleId,
                    sampleName: s.sampleName || s.name || "Sample",
                    sampleMatrix: s.sampleMatrix || s.matrix || "Water",
                    sampleNote: s.sampleNote || "",
                    analyses: (s.analyses || []).map((a: any) => ({
                        ...a,
                        id: a.id || crypto.randomUUID(),
                        unitPrice: a.feeBeforeTax || 0,
                        quantity: 1,
                        // Ensure other Matrix fields are present if available or default them
                        matrixId: a.matrixId || "UNKNOWN",
                        parameterId: a.parameterId || "",
                        protocolId: a.protocolId || "",
                        sampleTypeId: a.sampleTypeId || "",
                        parameterName: a.parameterName || "",
                        protocolCode: a.protocolCode || "",
                        sampleTypeName: a.sampleTypeName || "",
                        feeBeforeTax: a.feeBeforeTax || 0,
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

    const handleExport = () => {
        const data: OrderPrintData = {
            orderId,
            client: selectedClient,
            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail,
            clientAddress,
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
        };
        setPreviewData(data);
        setIsPreviewOpen(true);
    };

    const handleExportSampleRequest = () => {
        const data: OrderPrintData = {
            orderId,
            client: selectedClient,
            contactPerson,
            contactPhone,
            contactIdentity,
            reportEmail,
            clientAddress,
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
        };
        setPreviewData(data);
        setIsSampleRequestPreviewOpen(true);
    };

    // Replacing handleAddClient with API version
    const handleAddClientAPI = async (newClientData: any) => {
        try {
            // We need to import createClient
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
        } catch (e) {
            toast.error("Error creating client");
        }
    };

    const handleAddSample = () => {
        if (isReadOnly) return;
        const timestamp = Date.now();
        const newSample: SampleWithQuantity = {
            id: `S${timestamp}`,
            sampleId: `S${timestamp}`,
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
            sampleId: `S${timestamp}`,
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
            // Audit fields if needed can be skipped or added here
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

    const handleSave = () => {
        if (isReadOnly) return;
        // In real app, call API to save order here.
        alert(t("order.saveSuccess"));
        setHasUnsavedChanges(false);
        if (onSaveSuccess) {
            onSaveSuccess();
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

                    <div>
                        <ClientSectionNew
                            clients={clients}
                            selectedClient={selectedClient}
                            contactPerson={contactPerson}
                            contactPhone={contactPhone}
                            contactIdentity={contactIdentity}
                            reportEmail={reportEmail}
                            address={clientAddress}
                            onClientChange={setSelectedClient}
                            onContactPersonChange={setContactPerson}
                            onContactPhoneChange={setContactPhone}
                            onContactIdentityChange={setContactIdentity}
                            onReportEmailChange={setReportEmail}
                            onAddressChange={setClientAddress}
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
            <AddClientModal isOpen={isClientModalOpen} onClose={() => setIsClientModalOpen(false)} onConfirm={handleAddClientAPI} />
            {previewData && <OrderPrintPreviewModal isOpen={isPreviewOpen} onClose={() => setIsPreviewOpen(false)} data={previewData} />}
            {previewData && <SampleRequestPrintPreviewModal isOpen={isSampleRequestPreviewOpen} onClose={() => setIsSampleRequestPreviewOpen(false)} data={previewData} />}
        </div>
    );
});
