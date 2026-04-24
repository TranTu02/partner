import { useRef, useState } from "react";
import { X, FileDown, Printer } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
// @ts-ignore
import { formatMoneyToWords } from "../../utils/textUtils";
import type { QuotePrintData } from "@/components/quote/QuotePrintTemplate";
import type { OtherItem } from "@/types/order";
import { useTranslation } from "react-i18next";
import { convertHtmlToPdfForm2 } from "@/api/index";
import { toast } from "sonner";
const LOGO_URL = "https://documents-sea.bildr.com/rc19670b8d48b4c5ba0f89058aa6e7e4b/doc/IRDOP%20LOGO%20with%20Name.w8flZn8NnkuLrYinAamIkw.PAAKeAHDVEm9mFvCFtA46Q.svg";

interface CustomerQuotePrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: QuotePrintData;
}

export function CustomerQuotePrintPreviewModal({ isOpen, onClose, data }: CustomerQuotePrintPreviewModalProps) {
    const { t, i18n } = useTranslation();
    const editorRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);

    if (!isOpen) return null;

    const fmtMoney = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const otherItems: OtherItem[] = (data as any).otherItems || [];
    const otherFeeAfterTax = otherItems.reduce((s, i) => s + Number(i.feeAfterTax || 0), 0);

    const generateQuoteHtml = (data: QuotePrintData) => {
        const samplesHtml = data.samples
            .map((sample, index) => {
                let sampleTotalAfterTax = 0;

                sample.analyses.forEach((a) => {
                    const quantity = Number(a.quantity) || 1;
                    const unitPrice = Number(a.unitPrice) || 0;
                    const discountRate = Number(a.discountRate) || 0;
                    const taxRate = Number(a.taxRate) || 0;

                    const lineGross = unitPrice * quantity;
                    const lineDiscount = lineGross * (discountRate / 100);
                    const lineNet = lineGross - lineDiscount;
                    const lineTax = lineNet * (taxRate / 100);
                    const lineAfterTax = lineNet + lineTax;

                    sampleTotalAfterTax += lineAfterTax;
                });

                return `
            <div style="margin-bottom: 10px; page-break-inside: auto;">
                <div style="background-color: #f8fafc; padding: 6px 10px; border: 1px solid #e2e8f0; border-bottom: none; margin-top: 10px;">
                    <div style="font-weight: bold; font-size: 13px; color: #1e293b;">
                        ${t("order.print.sample")} ${index + 1}: ${sample.sampleName}
                    </div>
                    <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                        <b>Loại mẫu:</b> ${sample.sampleTypeName || "--"}
                    </div>
                    ${
                        sample.sampleNote
                            ? `
                    <div style="font-size: 11px; color: #475569; margin-top: 1px;">
                        <b>Ghi chú:</b> ${sample.sampleNote}
                    </div>`
                            : ""
                    }
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse; table-layout: fixed;">
                    <thead>
                        <tr style="background-color: #e6e6e6;">
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: center; width: 4%; vertical-align: top; font-size: 11px;">${t("order.print.stt")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: left; vertical-align: top; width: 32%; font-size: 11px;">${t("order.print.parameter")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: left; vertical-align: top; width: 24%; font-size: 11px;">Phương pháp</th>
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: right; vertical-align: top; width: 15%; font-size: 11px;">${fmtMoney(0).includes(",") ? t("order.print.amount") : "Số tiền"}</th>
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: center; width: 10%; vertical-align: top; font-size: 11px;">${t("order.print.tax", "Thuế")} (%)</th>
                            <th style="border: 1px solid black; padding: 2px 5px; text-align: right; vertical-align: top; width: 15%; font-size: 11px;">${t("order.print.total")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sample.analyses
                            .map((analysis, i) => {
                                return `
                            <tr style="page-break-inside: avoid;">
                                <td style="border: 1px solid black; padding: 2px 5px; text-align: center; vertical-align: top; font-size: 10px;">${i + 1}</td>
                                <td style="border: 1px solid black; padding: 2px 5px; vertical-align: top; font-size: 10px;">${analysis.parameterName}</td>
                                <td style="border: 1px solid black; padding: 2px 5px; vertical-align: top; font-size: 10px;">
                                    <div style="font-weight: bold;">${analysis.protocolCode || "--"}</div>
                                    ${(() => {
                                        const s = sample as any;
                                        const a = analysis as any;
                                        let acc = a.protocolAccreditation;
                                        if (typeof acc === "string" && acc.startsWith("{")) {
                                            try {
                                                acc = JSON.parse(acc);
                                            } catch {
                                                acc = null;
                                            }
                                        }

                                        const sFullType = (s.sampleTypeName || "").toString().normalize("NFC").toLowerCase().trim();
                                        const aFullType = (a.sampleTypeName || "").toString().normalize("NFC").toLowerCase().trim();
                                        const isMatch = !sFullType || !aFullType || sFullType === aFullType;

                                        let accKeys = "";
                                        if (acc && isMatch) {
                                            accKeys =
                                                typeof acc === "object"
                                                    ? Object.entries(acc)
                                                          .filter(([, v]) => v)
                                                          .map(([k]) => k)
                                                          .join(", ")
                                                    : acc.toString();
                                        }

                                        if (!a.protocolSource && !accKeys) return "";

                                        return `
                                            <div style="font-size: 9px; margin-top: 4px; font-style: italic; color: #475569; line-height: 1.2;">
                                                ${[a.protocolSource, accKeys].filter(Boolean).join(" ")}
                                            </div>
                                        `;
                                    })()}
                                </td>
                                <td style="border: 1px solid black; padding: 2px 5px; text-align: right; vertical-align: top; font-size: 10px;">
                                    <div>${fmtMoney(analysis.feeBeforeTaxAndDiscount ?? analysis.feeBeforeTax ?? 0)}</div>
                                    ${
                                        analysis.discountRate && analysis.discountRate > 0
                                            ? `<div style="text-decoration: line-through; color: #64748b; font-size: 8px; margin-top: 1px;">${fmtMoney(analysis.unitPrice || 0)}</div>`
                                            : ""
                                    }
                                </td>
                                <td style="border: 1px solid black; padding: 2px 5px; text-align: center; vertical-align: top; font-size: 10px;">${analysis.taxRate || 0}%</td>
                                <td style="border: 1px solid black; padding: 2px 5px; text-align: right; vertical-align: top; font-size: 10px;">
                                    ${fmtMoney(analysis.feeAfterTax || 0)} 
                                </td>
                            </tr>
                        `;
                            })
                            .join("")}
                        
                        <tr style="background-color: #f8fafc;">
                            <td colspan="5" style="border: 1px solid black; padding: 4px 8px; text-align: right; font-weight: bold; vertical-align: middle; font-size: 11px;">${t("parameter.sumUnitPrice", "Tổng đơn giá")}</td>
                            <td style="border: 1px solid black; padding: 4px 8px; text-align: right; font-weight: bold; vertical-align: middle; font-size: 11px;">${fmtMoney(sampleTotalAfterTax)} </td>
                        </tr>
                        ${
                            data.samples.length > 0 && Number(sample.quantity) > 1
                                ? `
                        <tr>
                            <td colspan="5" style="border: 1px solid black; padding: 2px 5px; text-align: right; font-weight: bold; vertical-align: top; font-size: 11px;">
                                ${t("sample.grandTotal", "Tổng cộng (x{{qty}} mẫu)", { qty: sample.quantity })}
                            </td>
                            <td style="border: 1px solid black; padding: 2px 5px; text-align: right; font-weight: bold; vertical-align: top; color: #2563eb; font-size: 11px;">
                                ${fmtMoney(sampleTotalAfterTax * Number(sample.quantity))} VNĐ
                            </td>
                        </tr>
                        `
                                : ""
                        }
                    </tbody>
                </table>
            </div>
        `;
            })
            .join("");

        // Other Items (phụ phí) section
        const otherItemsHtml =
            otherItems.length > 0
                ? `
            <div style="margin-bottom: 10px;">
                <div style="background-color: #f0f0f0; padding: 3px 8px; font-weight: bold; margin-bottom: 3px; font-size: 12px;">
                    ${t("order.otherItems.title", "Phụ phí")}
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #e6e6e6;">
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; width: 50px; vertical-align: top;">${t("order.print.stt")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: left; vertical-align: top;">${t("order.otherItems.itemName", "Tên phụ phí")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${t("order.otherItems.feeBeforeTax", "Phí trước thuế")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; width: 80px; vertical-align: top;">${t("order.print.tax", "Thuế")} (%)</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${t("order.otherItems.feeAfterTax", "Phí sau thuế")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${otherItems
                            .map(
                                (item, i) => `
                            <tr>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; vertical-align: top;">${i + 1}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; vertical-align: top;">${item.itemName || ""}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${fmtMoney(Number(item.feeBeforeTax || 0))}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; vertical-align: top;">${item.taxRate || 0}%</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${fmtMoney(Number(item.feeAfterTax || 0))}</td>
                            </tr>
                        `,
                            )
                            .join("")}
                        <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${t("order.otherItems.totalLabel", "Tổng phụ phí")}</td>
                            <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${fmtMoney(otherFeeAfterTax)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `
                : "";

        // Use layout-table so header repeats on every printed page
        return `
            <table style="width: 100%; border-collapse: collapse; border: none;">
                <thead style="display: table-header-group;">
                    <tr>
                        <th style="border: none !important; padding: 0; text-align: left; font-weight: normal;">
                            <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding-bottom: 5px; margin-bottom: 5px; border-bottom: 1px solid #cbd5e1;">
                                <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px; flex: 1;">
                                    <img
                                        src="${LOGO_URL}"
                                        alt="Logo"
                                        style="height:28px; width:auto; object-fit:contain;"
                                        draggable="false"
                                    />
                                    <div style="font-size:10.5px !important; line-height:1.3 !important; color:#0f172a; text-align:left; align-self: center;">
                                        <div style="font-weight:700 !important; text-transform: uppercase;">
                                            ${t("order.print.header.lines.line1")}
                                        </div>
                                        <div>
                                            ${t("order.print.header.lines.line2")}
                                        </div>
                                    </div>
                                    <div style="flex:1;">
                                        <div style="text-align:right; font-size:9px !important; font-weight:700 !important; margin-top:2px; white-space:nowrap; text-transform:uppercase;">
                                            Quote ID: ${data.quoteId}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td style="border: none !important; padding: 0; vertical-align: top;">

            <div style="text-align: center; margin-bottom: 8px;">
                <h1 style="font-size: 16px; font-weight: bold; margin-bottom: 1px;">${t("quote.print.title")}</h1>
                <p style="font-size: 12px;">Quote ID: ${data.quoteId}</p>
            </div>

            <div style="margin-bottom: 10px;">
                <h3 style="font-size: 14px; font-weight: bold; padding-bottom: 2px; margin-bottom: 6px;">1. ${t("order.print.client")}</h3>
                <table class="info-table" style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <td style="width: 150px; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.print.customer")}:</td>
                            <td style="border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;" colspan="3">${data.client?.clientName || ""}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.print.address")}:</td>
                            <td style="border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;" colspan="3">${data.clientAddress}</td>
                        </tr>
                         <tr>
                            <td style="font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.print.taxCode")}:</td>
                             <td style="border: none !important; width: 170px; padding: 2px 5px 8px 5px; vertical-align: top;">${data.client?.legalId || ""}</td>
                            <td style="font-weight: bold; border: none !important; width: 130px; padding: 2px 5px 8px 5px; vertical-align: top;">${t("client.taxEmail")}:</td>
                            <td style="border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${data.client?.invoiceInfo?.taxEmail || ""}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.print.contact")}:</td>
                            <td style="border: none !important; width: 170px; padding: 2px 5px 8px 5px; vertical-align: top;">${data.contactPerson}</td>
                            <td style="font-weight: bold; border: none !important; width: 130px; padding: 2px 5px 8px 5px; vertical-align: top;">${t("client.contactPhone")}:</td>
                            <td style="border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${data.contactPhone}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div>
                <h3 style="font-size: 14px; font-weight: bold; padding-bottom: 2px; margin-bottom: 6px;">2. ${t("order.print.samplesAndAnalysis")}</h3>
                ${samplesHtml}
                <div style="margin-top: 8px; margin-bottom: 12px; font-size: 11px; color: #333; border-top: 1px solid #ccc; padding-top: 6px;">
                    <span style="font-weight: bold;">Chú thích:</span>
                    <br/><span style="margin-left: 8px;"><b>IRDOP</b>: Chỉ tiêu được thực hiện tại IRDOP.</span>
                    <br/><span style="margin-left: 8px;"><b>EX</b>: Chỉ tiêu được thực hiện bởi nhà thầu phụ.</span>
                    <br/><span style="margin-left: 8px;"><b>VILAS997</b>: Chỉ tiêu được công nhận ISO/IEC 17025:2017.</span>
                    <br/><span style="margin-left: 8px;"><b>TDC</b>: Chỉ tiêu được công nhận đánh giá sự phù hợp theo NĐ 107/2016/NĐ-CP.</span>
                </div>
            </div>

            ${otherItemsHtml}

             <div style="margin-top: 10px; page-break-inside: avoid;">
                <h3 style="font-size: 14px; font-weight: bold; padding-bottom: 2px; margin-bottom: 6px;">3. ${t("order.print.total")}</h3>
                 <table class="total-table" style="width: 100%; margin-top: 5px; border-collapse: collapse;">
                    <tbody>
                         <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${t("parameter.sumUnitPrice", "Tổng đơn giá")}:</td>
                            <td style="width: 150px; text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${fmtMoney(data.pricing.subtotal)} VNĐ</td>
                        </tr>
                        ${
                            data.otherItems && data.otherItems.length > 0
                                ? `
                        <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.otherItems.title", "Phụ phí")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${fmtMoney(
                                data.otherItems.reduce((acc, curr) => acc + curr.feeBeforeTax, 0),
                            )} đ</td>
                        </tr>
                        `
                                : ""
                        }
                        <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">{"Chiết khấu toàn đơn(VND)"}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">- ${fmtMoney((data.pricing as any).globalDiscountAmount || 0)} đ</td>
                        </tr>
                        <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">{"Tổng chiết khấu"}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">- ${fmtMoney((data.pricing as any).totalDiscount || data.pricing.discountAmount || 0)} đ</td>
                        </tr>
                        <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${t("parameter.sumBeforeTax", "Tiền trước thuế")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${fmtMoney(data.pricing.feeBeforeTax || 0)} đ</td>
                        </tr>
                        <tr style="page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${t("order.print.vat")}:</td>
                            <td style="text-align: right; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${fmtMoney(data.pricing.tax)} VNĐ</td>
                        </tr>
                        <tr style="font-size: 14px; page-break-inside: avoid;">
                            <td style="text-align: right; padding-right: 20px; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${t("quote.total", "Tổng thanh toán")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 4px 5px; vertical-align: top;">${fmtMoney(Math.ceil(data.pricing.total))} VNĐ</td>
                        </tr>
                    </tbody>
                 </table>
                 <div style="font-weight: bold; margin-top: 8px; font-style: italic; font-size: 12px;">
                    ${t("order.print.amountInWords")}: ${formatMoneyToWords(Math.ceil(data.pricing.total), i18n.language)}
                 </div>
                 <div style="font-style: italic; margin-top: 5px; font-size: 12px; height: 20px;">
                    <p style="margin-bottom: 1px;">
                        ${t("quote.print.validityNote")} ${new Date().toLocaleDateString("vi-VN")}
                    </p>
                 </div>
            </div>

                        </td>
                    </tr>
                </tbody>
            </table>
        `;
    };

    const handlePrint = () => {
        if (!editorRef.current) return;
        editorRef.current.execCommand("mcePrint");
    };

    const handleExportPdf = async () => {
        if (!editorRef.current) return;
        const toastId = toast.loading("Đang xuất file PDF...");

        try {
            const content = editorRef.current.getContent();
            const blob = await convertHtmlToPdfForm2({
                body: {
                    requestForm: content,
                    orderId: data.quoteId,
                },
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Quote_${data.quoteId || "export"}.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode?.removeChild(link);
            window.URL.revokeObjectURL(url);

            toast.success("Xuất PDF thành công", { id: toastId });
        } catch (error: any) {
            console.error(error);
            toast.error("Lỗi khi xuất PDF", { id: toastId });
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-5xl md:min-w-[900px] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">{t("quote.print.previewTitle")}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportPdf}
                            className="flex items-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors shadow-sm"
                            title="Xuất PDF"
                        >
                            <FileDown className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">PDF</span>
                        </button>
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm"
                            title={t("common.print") || "In"}
                        >
                            <Printer className="w-4 h-4" />
                            <span className="text-sm font-medium hidden sm:inline">{t("common.print") || "In"}</span>
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow bg-gray-100/50 overflow-auto p-4 flex justify-center">
                    <div className="w-[794px] min-w-[794px] mx-auto bg-white shadow-lg relative">
                        {!editorReady && <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">{t("common.loading")}</div>}
                        <div style={{ visibility: editorReady ? "visible" : "hidden" }}>
                            <Editor
                                tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                                onInit={(_evt: any, editor: any) => {
                                    editorRef.current = editor;
                                    setEditorReady(true);
                                }}
                                initialValue={generateQuoteHtml(data)}
                                init={{
                                    width: "100%",
                                    menubar: false,
                                    statusbar: false,
                                    plugins: "table lists code print autoresize",
                                    toolbar: "bold italic | alignleft aligncenter alignright | table tablemergecells tablesplitcells | code print",
                                    toolbar_mode: "wrap",
                                    entity_encoding: "raw",
                                    paste_as_text: true,
                                    min_height: 1123,
                                    autoresize_bottom_margin: 0,
                                    content_style: `
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                         html { 
                                            background-color: #f0f0f0; 
                                            display: block; 
                                            overflow: hidden; 
                                            text-align: left; 
                                        }
                                        body { 
                                            width: 100%;
                                            margin: 0 auto !important; 
                                            padding: 5mm !important; 
                                            background-color: white; 
                                            font-family: "Times New Roman", Times, serif; 
                                            font-size: 13px;
                                            line-height: 1.3;
                                            overflow: hidden;
                                        }
                                        table { width: 100% !important; border-collapse: collapse; margin-bottom: 8px; }
                                        .data-table th, .data-table td { border: 1px solid black !important; padding: 2px 5px 8px 5px !important; vertical-align: top; }
                                        .info-table td, .total-table td { border: none !important; padding: 2px 5px 8px 5px !important; vertical-align: top !important; }
                                        p { margin-bottom: 2px !important; }
                                        h1 { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
                                        h3 { font-size: 14px; font-weight: bold; }
                                        thead { display: table-header-group !important; }
                                        tr { page-break-inside: avoid !important; }
                                        @media print {
                                            body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                            html { background: none; display: block; }
                                            @page { size: A4 portrait !important; margin: 8mm !important; }
                                        }
                                    `,
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
