import type { Client } from "@/types/client";
import { useTranslation } from "react-i18next";
import logoFull from "../../assets/LOGO-FULL.png";

export interface QuotePrintData {
    quoteId: string;
    createdAt?: string;
    client: Client | null;

    // Contact Info Snapshot
    contactPerson: string;
    contactPhone: string;
    contactIdentity: string;
    contactEmail?: string;
    contactPosition?: string;
    contactAddress?: string;
    reportEmail: string;

    // Address & Invoice Info Snapshot
    clientAddress: string;
    taxName?: string;
    taxCode?: string;
    taxAddress?: string;
    samples: {
        sampleName: string;
        sampleTypeName?: string;
        sampleTypeId?: string;
        sampleNote: string;
        quantity?: number;
        sampleInfo?: { label: string; value: string }[];
        analyses: {
            parameterName: string;
            parameterId?: string;
            protocolCode?: string;
            sampleTypeName?: string;
            sampleTypeId?: string;
            protocolAccreditation?: any;
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
        lineDiscount?: number;
        orderDiscount?: number;
        feeBeforeTax?: number;
        tax: number;
        total: number;
    };
    discountRate: number;
    commission?: number;
    otherItems?: {
        itemName: string;
        feeBeforeTax: number;
        taxRate: number;
        feeAfterTax: number;
    }[];
}

export const QuotePrintTemplate = ({ data }: { data: QuotePrintData }) => {
    const { t } = useTranslation();

    return (
        <div id="quote-print-template" style={{ width: "210mm", padding: "10mm 10mm 12mm 10mm", backgroundColor: "white", fontSize: "12px", fontFamily: "Times New Roman, serif", lineHeight: "1.3" }}>
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
                <h1 style={{ fontSize: "16px", fontWeight: "bold", marginBottom: "1px" }}>{t("quote.print.title")}</h1>
                <p style={{ fontSize: "12px" }}>Quote ID: {data.quoteId}</p>
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
                        <div style={{ backgroundColor: "#f0f0f0", padding: "3px 8px", fontWeight: "bold", marginBottom: "3px", fontSize: "12px", display: "flex", justifyContent: "space-between" }}>
                            <span>
                                {t("order.print.sample")} {index + 1}: {sample.sampleName} ({sample.sampleTypeName || "--"})
                            </span>
                            {sample.quantity && sample.quantity > 1 ? (
                                <span>
                                    x {sample.quantity} {t("order.print.sample").toLowerCase()}
                                </span>
                            ) : null}
                        </div>
                        <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                            <thead>
                                <tr style={{ backgroundColor: "#e6e6e6" }}>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "center", fontSize: "11px", width: "4%" }}>{t("order.print.stt")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "left", fontSize: "11px", width: "31%" }}>{t("order.print.parameter")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "left", fontSize: "11px", width: "24%" }}>{t("table.method", "Phương pháp")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontSize: "11px", width: "14%" }}>{t("order.print.amount")}</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "center", fontSize: "11px", width: "10%" }}>{t("order.print.tax")} (%)</th>
                                    <th style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontSize: "11px", width: "17%" }}>{t("order.print.total")}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sample.analyses.map((analysis, i) => {
                                    const globalDiscountRate = data.discountRate || 0;
                                    const lineDiscountRate = analysis.discountRate || 0;
                                    const taxRate = analysis.taxRate || 0;
                                    const quantity = analysis.quantity || 1;

                                    const originalUP = (analysis as any).unitPrice || (analysis.feeBeforeTaxAndDiscount ? analysis.feeBeforeTaxAndDiscount / quantity : 0) || 0;
                                    const actualUP = originalUP * (1 - lineDiscountRate / 100);
                                    const discountedUP = actualUP * (1 - globalDiscountRate / 100);
                                    const hasDiscount = discountedUP < originalUP - 0.1;

                                    const originalTotal = originalUP * quantity * (1 + taxRate / 100);
                                    const finalTotal = discountedUP * quantity * (1 + taxRate / 100);
                                    const hasLineDiscount = finalTotal < originalTotal - 0.1;

                                    return (
                                        <tr key={i} style={{ pageBreakInside: "avoid" }}>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "center", fontSize: "10px" }}>{i + 1}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", fontSize: "10px" }}>{analysis.parameterName}</td>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", fontSize: "10px" }}>
                                                <div style={{ fontWeight: "bold" }}>{analysis.protocolCode || "--"}</div>
                                                <div style={{ fontSize: "9px", marginTop: "2px" }}>{((analysis as any).protocolSource || "").trim() || ""}</div>
                                            </td>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontSize: "10px" }}>
                                                {hasDiscount ? (
                                                    <>
                                                        <div style={{ fontWeight: "bold" }}>{discountedUP.toLocaleString("vi-VN")}</div>
                                                        <div style={{ textDecoration: "line-through", fontSize: "8px", color: "#666" }}>{originalUP.toLocaleString("vi-VN")}</div>
                                                    </>
                                                ) : (
                                                    discountedUP.toLocaleString("vi-VN")
                                                )}
                                            </td>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "center", fontSize: "10px" }}>{analysis.taxRate || 0}%</td>
                                            <td style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontSize: "10px" }}>
                                                {hasLineDiscount ? (
                                                    <>
                                                        <div style={{ fontWeight: "bold" }}>{finalTotal.toLocaleString("vi-VN")}</div>
                                                        <div style={{ textDecoration: "line-through", fontSize: "8px", color: "#666" }}>{originalTotal.toLocaleString("vi-VN")}</div>
                                                    </>
                                                ) : (
                                                    finalTotal.toLocaleString("vi-VN")
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr>
                                    <td colSpan={7} style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontWeight: "bold", verticalAlign: "top", fontSize: "11px" }}>
                                        {t("parameter.sumAfterTax", "Tổng cộng mẫu")}
                                    </td>
                                    <td style={{ border: "1px solid #ccc", padding: "2px 5px", textAlign: "right", fontWeight: "bold", verticalAlign: "top", fontSize: "11px" }}>
                                        {sample.analyses
                                            .reduce((sum, a) => {
                                                const globalDR = data.discountRate || 0;
                                                const lineDR = a.discountRate || 0;
                                                const taxR = a.taxRate || 0;
                                                const qty = a.quantity || 1;
                                                const originalUP = (a as any).unitPrice || (a.feeBeforeTaxAndDiscount ? a.feeBeforeTaxAndDiscount / qty : 0) || 0;
                                                const actualUP = originalUP * (1 - lineDR / 100);
                                                const discountedUP = actualUP * (1 - globalDR / 100);
                                                const subFinalTotal = discountedUP * qty * (1 + taxR / 100);
                                                return sum + Math.round(subFinalTotal);
                                            }, 0)
                                            .toLocaleString("vi-VN")}
                                    </td>
                                </tr>
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
                            <td style={{ textAlign: "right", paddingRight: "20px", padding: "4px 5px", verticalAlign: "top" }}>{t("order.print.subtotal")}:</td>
                            <td style={{ width: "150px", textAlign: "right", fontWeight: "bold", padding: "4px 5px", verticalAlign: "top" }}>{data.pricing.subtotal.toLocaleString("vi-VN")} đ</td>
                        </tr>
                        {data.otherItems && data.otherItems.length > 0 && (
                            <tr style={{ pageBreakInside: "avoid" }}>
                                <td style={{ textAlign: "right", paddingRight: "20px", padding: "4px 5px", verticalAlign: "top" }}>
                                    {t("order.otherItems.title", "Phụ phí")} ({t("order.pricing.feeBeforeTax")}):
                                </td>
                                <td style={{ textAlign: "right", fontWeight: "bold", padding: "4px 5px", verticalAlign: "top" }}>
                                    {data.otherItems.reduce((acc, current) => acc + current.feeBeforeTax, 0).toLocaleString("vi-VN")} đ
                                </td>
                            </tr>
                        )}
                        {(data.pricing.discountAmount || 0) > 0 && (
                            <>
                                <tr style={{ pageBreakInside: "avoid" }}>
                                    <td style={{ textAlign: "right", paddingRight: "20px", padding: "4px 5px", verticalAlign: "top" }}>{t("order.print.discount")}:</td>
                                    <td style={{ textAlign: "right", color: "#16a34a", padding: "4px 5px", verticalAlign: "top" }}>- {data.pricing.discountAmount?.toLocaleString("vi-VN")} VNĐ</td>
                                </tr>
                                <tr style={{ pageBreakInside: "avoid" }}>
                                    <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "bold", padding: "4px 5px", verticalAlign: "top" }}>Tổng chiết khấu:</td>
                                    <td style={{ textAlign: "right", color: "#16a34a", fontWeight: "bold", padding: "4px 5px", verticalAlign: "top" }}>
                                        - {data.pricing.discountAmount?.toLocaleString("vi-VN")} VNĐ
                                    </td>
                                </tr>
                            </>
                        )}
                        <tr style={{ pageBreakInside: "avoid" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", padding: "4px 5px", verticalAlign: "top" }}>{t("order.print.vat")}:</td>
                            <td style={{ textAlign: "right", padding: "4px 5px", verticalAlign: "top" }}>{data.pricing.tax.toLocaleString("vi-VN")} đ</td>
                        </tr>
                        <tr style={{ fontSize: "14px", pageBreakInside: "avoid" }}>
                            <td style={{ textAlign: "right", paddingRight: "20px", fontWeight: "bold", padding: "4px 5px", verticalAlign: "top" }}>{t("order.print.grandTotal")}:</td>
                            <td style={{ textAlign: "right", fontWeight: "bold", color: "#1890FF", padding: "4px 5px", verticalAlign: "top" }}>{data.pricing.total.toLocaleString("vi-VN")} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style={{ marginTop: "10px", marginBottom: "12px", fontSize: "11px", color: "#333", borderTop: "1px solid #ccc", paddingTop: "6px" }}>
                <span style={{ fontWeight: "bold" }}>Chú thích:</span>
                <br />
                <span style={{ marginLeft: "8px" }}>
                    <b>IRDOP</b>: Chỉ tiêu được thực hiện tại IRDOP.
                </span>
                <br />
                <span style={{ marginLeft: "8px" }}>
                    <b>EX</b>: Chỉ tiêu được thực hiện bởi nhà thầu phụ.
                </span>
                <br />
                <span style={{ marginLeft: "8px" }}>
                    <b>VILAS997</b>: Chỉ tiêu được công nhận ISO/IEC 17025:2017.
                </span>
                <br />
                <span style={{ marginLeft: "8px" }}>
                    <b>TDC</b>: Chỉ tiêu được công nhận đánh giá sự phù hợp theo NĐ 107/2016/NĐ-CP.
                </span>
            </div>

            <div style={{ marginTop: "20px", textAlign: "center" }}>
                <p style={{ fontStyle: "italic", fontSize: "11px" }}>
                    {t("quote.print.validityNote")} {new Date().toLocaleDateString("vi-VN")}
                </p>
            </div>
        </div>
    );
};
