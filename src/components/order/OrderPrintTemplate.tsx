import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";

export interface OrderPrintData {
    createdAt?: string;
    orderId: string;
    client: Client | null;

    // Contact Info Snapshot
    contactPerson: string;
    contactPhone: string;
    contactIdentity: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
    reportEmail: string;
    salePerson?: string;

    // Address & Invoice Info Snapshot
    clientAddress: string;
    taxName?: string;
    taxCode?: string;
    taxAddress?: string;

    samples: {
        sampleName: string;
        sampleMatrix: string;
        sampleNote: string;
        analyses: {
            parameterName: string;
            parameterId?: string;
            feeBeforeTax: number;
            taxRate: number;
            feeAfterTax: number;
            discountRate?: number;
            unitPrice?: number;
            feeBeforeTaxAndDiscount?: number;
            quantity?: number;
        }[];
    }[];
    pricing: {
        subtotal: number;
        discountAmount?: number;
        feeBeforeTax?: number;
        tax: number;
        total: number;
    };
    discountRate: number;
}

export const OrderPrintTemplate = ({ data }: { data: OrderPrintData }) => {
    const { t } = useTranslation();

    return (
        <div id="order-print-template" style={{ width: "210mm", padding: "20mm", backgroundColor: "white", fontSize: "14px", fontFamily: "Arial, sans-serif" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <h1 style={{ fontSize: "24px", fontWeight: "bold" }}>{t("order.print.title")}</h1>
                <p>Order ID: {data.orderId}</p>
            </div>

            <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "5px" }}>1. {t("order.print.clientInfo")}</h3>
                <table style={{ width: "100%", marginTop: "10px" }}>
                    <tbody>
                        <tr>
                            <td style={{ width: "150px", fontWeight: "bold" }}>{t("order.print.customer")}:</td>
                            <td>{data.client?.clientName}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("order.print.address")}:</td>
                            <td>{data.clientAddress}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("order.print.taxCode")}:</td>
                            <td>{data.client?.legalId}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("order.print.contact")}:</td>
                            <td>{data.contactPerson}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("order.print.email")}:</td>
                            <td>{data.reportEmail}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* SECTION 2: SERVICE PROVIDER */}
            <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "5px" }}>2. {t("order.print.provider")}</h3>
                <table style={{ width: "100%", marginTop: "10px" }}>
                    <tbody>
                        <tr>
                            <td style={{ width: "150px", fontWeight: "bold" }}>{t("organization.name")}:</td>
                            <td>{t("organization.data.organizationName")}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("organization.address")}:</td>
                            <td>{t("organization.data.address")}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("organization.taxId")}:</td>
                            <td>{t("organization.data.taxId")}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("organization.phone")}:</td>
                            <td>{t("organization.data.phone")}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold" }}>{t("organization.email")}:</td>
                            <td>{t("organization.data.email")}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "5px", marginBottom: "10px" }}>3. {t("order.print.samplesAndAnalysis")}</h3>

                {data.samples.map((sample, index) => (
                    <div key={index} style={{ marginBottom: "20px", pageBreakInside: "avoid" }}>
                        <div style={{ backgroundColor: "#f0f0f0", padding: "5px 10px", fontWeight: "bold", marginBottom: "5px" }}>
                            {t("order.print.sample")} {index + 1}: {sample.sampleName} ({sample.sampleMatrix})
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#e6e6e6" }}>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>{t("order.print.stt")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "left" }}>{t("order.print.parameter")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>{t("order.print.amount")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center" }}>{t("order.print.tax")} (%)</th>
                                    <th style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>{t("order.print.total")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sample.analyses.map((analysis, i) => (
                                    <tr key={i}>
                                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", width: "50px" }}>{i + 1}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px" }}>{analysis.parameterName}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                                            {analysis.feeBeforeTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                                        </td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "center", width: "80px" }}>{analysis.taxRate || 0}%</td>
                                        <td style={{ border: "1px solid #ccc", padding: "8px", textAlign: "right" }}>
                                            {analysis.feeAfterTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "20px", pageBreakInside: "avoid" }}>
                <h3 style={{ fontSize: "16px", fontWeight: "bold", borderBottom: "1px solid #000", paddingBottom: "5px" }}>4. {t("order.print.total")}</h3>
                <table style={{ width: "100%", marginTop: "10px" }}>
                    <tbody>
                        <tr>
                            <td style={{ textAlign: "right", paddingRight: "20px" }}>{t("order.print.subtotal")}:</td>
                            <td style={{ width: "150px", textAlign: "right", fontWeight: "bold" }}>
                                {data.pricing.subtotal.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                            </td>
                        </tr>
                        {data.discountRate > 0 && (
                            <tr>
                                <td style={{ textAlign: "right", paddingRight: "20px" }}>
                                    {t("order.print.discount")} ({data.discountRate}%):
                                </td>
                                <td style={{ textAlign: "right", color: "red" }}>
                                    -{" "}
                                    {(data.pricing.discountAmount || (data.pricing.subtotal * data.discountRate) / 100).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                                    đ
                                </td>
                            </tr>
                        )}
                        {data.pricing.feeBeforeTax !== undefined && (
                            <tr>
                                <td style={{ textAlign: "right", paddingRight: "20px" }}>{t("order.pricing.feeBeforeTax")}:</td>
                                <td style={{ textAlign: "right", fontWeight: "bold" }}>
                                    {data.pricing.feeBeforeTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td style={{ textAlign: "right", paddingRight: "20px" }}>{t("order.print.vat")}:</td>
                            <td style={{ textAlign: "right" }}>{data.pricing.tax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ</td>
                        </tr>
                        <tr style={{ fontSize: "16px" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "bold" }}>{t("order.print.grandTotal")}:</td>
                            <td style={{ textAlign: "right", fontWeight: "bold", color: "#1890FF" }}>
                                {data.pricing.total.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{ marginTop: "40px", display: "flex", justifyContent: "space-between", pageBreakInside: "avoid" }}>
                <div style={{ textAlign: "center", width: "40%" }}>
                    <p style={{ fontWeight: "bold" }}>{t("order.print.clientRep")}</p>
                    <p>({t("order.print.signName")})</p>
                    <div style={{ height: "100px" }}></div>
                </div>
                <div style={{ textAlign: "center", width: "40%" }}>
                    <p style={{ fontWeight: "bold" }}>{t("order.print.companyRep")}</p>
                    <p>({t("order.print.signName")})</p>
                    <div style={{ height: "100px" }}></div>
                </div>
            </div>
        </div>
    );
};
