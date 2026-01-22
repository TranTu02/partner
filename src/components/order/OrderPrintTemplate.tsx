import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import logoFull from "../../assets/LOGO-FULL.png";

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
    orderUri?: string;
    requestForm?: string;
}

export const OrderPrintTemplate = ({ data }: { data: OrderPrintData }) => {
    const { t } = useTranslation();

    return (
        <div id="order-print-template" style={{ width: "210mm", padding: "10mm 10mm 12mm 10mm", backgroundColor: "white", fontSize: "12px", fontFamily: "Times New Roman, serif", lineHeight: "1.3" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "5px", border: "none" }}>
                <tbody>
                    <tr>
                        <td style={{ width: "20%", verticalAlign: "top", border: "none" }}>
                            <img src={logoFull} alt="Logo" style={{ height: "28px", width: "auto" }} />
                        </td>
                        <td style={{ verticalAlign: "top", textAlign: "left", paddingLeft: "10px", border: "none" }}>
                            <div style={{ fontWeight: "bold", fontSize: "10px", marginBottom: "1px", textTransform: "uppercase" }}>{t("order.print.header.lines.line1")}</div>
                            <div style={{ fontSize: "10px", marginBottom: "0px" }}>{t("order.print.header.lines.line2")}</div>
                        </td>
                    </tr>
                </tbody>
            </table>

            <div style={{ textAlign: "center", marginBottom: "8px" }}>
                <h1 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "1px" }}>{t("order.print.title")}</h1>
                <p style={{ fontSize: "12px" }}>
                    {t("order.print.orderId")}: {data.orderId}
                </p>
            </div>

            <div style={{ marginBottom: "10px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "2px", marginBottom: "5px" }}>1. {t("order.print.clientInfo")}</h3>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr>
                            <td style={{ width: "150px", fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.customer")}:</td>
                            <td colSpan={3} style={{ padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                {data.client?.clientName}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.address")}:</td>
                            <td colSpan={3} style={{ padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                {data.clientAddress}
                            </td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.taxCode")}:</td>
                            <td style={{ width: "170px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{data.client?.legalId}</td>
                            <td style={{ fontWeight: "bold", width: "130px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("client.taxEmail")}:</td>
                            <td style={{ padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{data.client?.invoiceInfo?.taxEmail || ""}</td>
                        </tr>
                        <tr>
                            <td style={{ fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.contact")}:</td>
                            <td style={{ width: "170px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{data.contactPerson}</td>
                            <td style={{ fontWeight: "bold", width: "130px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.phone")}:</td>
                            <td style={{ padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{data.contactPhone}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "2px", marginBottom: "5px" }}>2. {t("order.print.samplesAndAnalysis")}</h3>

                {data.samples.map((sample, index) => (
                    <div key={index} style={{ marginBottom: "10px", pageBreakInside: "auto" }}>
                        <div style={{ backgroundColor: "#f0f0f0", padding: "3px 8px", fontWeight: "bold", marginBottom: "3px", fontSize: "12px" }}>
                            {t("order.print.sample")} {index + 1}: {sample.sampleName} ({sample.sampleMatrix})
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#e6e6e6" }}>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "left", verticalAlign: "top" }}>{t("order.print.stt")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "left", verticalAlign: "top" }}>{t("order.print.parameter")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "right", verticalAlign: "top" }}>{t("order.print.amount")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "center", verticalAlign: "top" }}>{t("order.print.tax")} (%)</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "right", verticalAlign: "top" }}>{t("order.print.total")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sample.analyses.map((analysis, i) => (
                                    <tr key={i} style={{ pageBreakInside: "avoid" }}>
                                        <td style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "center", width: "40px", verticalAlign: "top" }}>{i + 1}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{analysis.parameterName}</td>
                                        <td style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "right", width: "100px", verticalAlign: "top" }}>
                                            {analysis.feeBeforeTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </td>
                                        <td style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "center", width: "70px", verticalAlign: "top" }}>{analysis.taxRate || 0}%</td>
                                        <td style={{ border: "1px solid #ccc", padding: "2px 5px 8px 5px", textAlign: "right", width: "120px", verticalAlign: "top" }}>
                                            {analysis.feeAfterTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <div style={{ marginTop: "10px" }}>
                <h3 style={{ fontSize: "14px", fontWeight: "bold", paddingBottom: "2px" }}>3. {t("order.print.total")}</h3>
                <table style={{ width: "100%", marginTop: "5px", borderCollapse: "collapse" }}>
                    <tbody>
                        <tr style={{ pageBreakInside: "avoid" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.subtotal")}:</td>
                            <td style={{ width: "150px", textAlign: "right", fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                {data.pricing.subtotal.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                            </td>
                        </tr>
                        {(data.pricing.discountAmount || 0) > 0 && (
                            <tr style={{ pageBreakInside: "avoid" }}>
                                <td style={{ textAlign: "right", paddingRight: "20px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                    {t("order.print.discount")} ({data.discountRate}%):
                                </td>
                                <td style={{ textAlign: "right", color: "red", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                    -{" "}
                                    {(data.pricing.discountAmount || (data.pricing.subtotal * data.discountRate) / 100).toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                                    đ
                                </td>
                            </tr>
                        )}
                        {data.pricing.feeBeforeTax !== undefined && (
                            <tr style={{ pageBreakInside: "avoid" }}>
                                <td style={{ textAlign: "right", paddingRight: "20px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.pricing.feeBeforeTax")}:</td>
                                <td style={{ textAlign: "right", fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                    {data.pricing.feeBeforeTax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                                </td>
                            </tr>
                        )}
                        <tr style={{ pageBreakInside: "avoid" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.vat")}:</td>
                            <td style={{ textAlign: "right", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                {data.pricing.tax.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                            </td>
                        </tr>
                        <tr style={{ fontSize: "14px", pageBreakInside: "avoid" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "bold", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>{t("order.print.grandTotal")}:</td>
                            <td style={{ textAlign: "right", fontWeight: "bold", color: "#1890FF", padding: "2px 5px 8px 5px", verticalAlign: "top" }}>
                                {data.pricing.total.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} đ
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
            <div style={{ pageBreakInside: "avoid" }}>
                <div style={{ marginTop: "10px", display: "flex", justifyContent: "space-between" }}>
                    <div style={{ textAlign: "center", width: "40%" }}>
                        <p style={{ fontWeight: "bold" }}>{t("order.print.clientRep")}</p>
                        <p>({t("order.print.signName")})</p>
                        <div style={{ height: "25mm" }}></div>
                    </div>
                    <div style={{ textAlign: "center", width: "40%" }}>
                        <p style={{ fontWeight: "bold" }}>{t("order.print.companyRep")}</p>
                        <p>({t("order.print.signName")})</p>
                        <div style={{ height: "25mm" }}></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
