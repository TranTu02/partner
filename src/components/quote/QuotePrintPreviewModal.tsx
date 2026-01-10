import { useRef } from "react";
import { X, FileDown, Eye } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
// @ts-ignore
import { formatMoneyToWords } from "../../utils/textUtils";
import type { QuotePrintData } from "./QuotePrintTemplate";
import { useTranslation } from "react-i18next";
// @ts-ignore
import html2pdf from "html2pdf.js";
import { format } from "date-fns";

import logoFull from "../../assets/LOGO-FULL.png";

interface QuotePrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: QuotePrintData;
}

export function QuotePrintPreviewModal({ isOpen, onClose, data }: QuotePrintPreviewModalProps) {
    const { t, i18n } = useTranslation();
    const editorRef = useRef<any>(null);

    if (!isOpen) return null;

    const generateQuoteHtml = (data: QuotePrintData) => {
        const samplesHtml = data.samples
            .map((sample) => {
                let sampleTotalUnitPrice = 0;
                let sampleTotalDiscount = 0;
                let sampleTotalBeforeTax = 0;
                let sampleTotalAfterTax = 0;

                sample.analyses.forEach((a) => {
                    const quantity = Number(a.quantity) || 1;
                    const unitPrice = Number(a.unitPrice) || 0;
                    const discountRate = Number(a.discountRate) || 0;
                    const taxRate = Number(a.taxRate) || 0;

                    // Calculate locally to ensure consistency with user requirements
                    const lineGross = unitPrice * quantity;
                    const lineDiscount = lineGross * (discountRate / 100);
                    const lineNet = lineGross - lineDiscount;
                    const lineTax = lineNet * (taxRate / 100);
                    const lineAfterTax = lineNet + lineTax;

                    sampleTotalUnitPrice += lineGross;
                    sampleTotalDiscount += lineDiscount;

                    // User Request: Sample Total Pre-tax = Sum(Net)
                    sampleTotalBeforeTax += lineNet;

                    sampleTotalAfterTax += lineAfterTax;
                });

                return `
            <div style="margin-bottom: 20px;">
                <div style="background-color: #f0f0f0; padding: 5px 10px; font-weight: bold; margin-bottom: 5px;">
                     ${t("order.print.sample")} ${data.samples.indexOf(sample) + 1}: ${sample.sampleName}
                     ${sample.sampleNote ? `<span style="font-weight: normal; font-style: italic;"> - ${sample.sampleNote}</span>` : ""}
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #e6e6e6;">
                            <th style="border: 1px solid black; padding: 3px; text-align: center; width: 50px;">${t("order.print.stt")}</th>
                            <th style="border: 1px solid black; padding: 3px; text-align: left;">${t("order.print.parameter")}</th>
                            <th style="border: 1px solid black; padding: 3px; text-align: right;">${t("order.print.amount")}</th>
                            <th style="border: 1px solid black; padding: 3px; text-align: center; width: 80px;">${t("order.print.tax", "Thuế")} (%)</th>
                            <th style="border: 1px solid black; padding: 3px; text-align: right;">${t("order.print.total")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sample.analyses
                            .map((analysis, i) => {
                                const price = analysis.feeBeforeTaxAndDiscount ?? analysis.feeBeforeTax ?? 0;
                                const rate = analysis.discountRate || 0;

                                return `
                            <tr>
                                <td style="border: 1px solid black; padding: 3px; text-align: center;">${i + 1}</td>
                                <td style="border: 1px solid black; padding: 3px;">${analysis.parameterName}</td>
                                <td style="border: 1px solid black; padding: 3px; text-align: right;">
                                    ${price.toLocaleString("vi-VN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                    })}
                                    ${rate > 0 ? `<div style="font-size: 11px; color: #16a34a;">(-${rate}%)</div>` : ""}
                                </td>
                                <td style="border: 1px solid black; padding: 3px; text-align: center;">${analysis.taxRate || 0}%</td>
                                <td style="border: 1px solid black; padding: 3px; text-align: right;">
                                    ${analysis.feeAfterTax.toLocaleString("vi-VN", {
                                        minimumFractionDigits: 0,
                                        maximumFractionDigits: 2,
                                    })} đ
                                </td>
                            </tr>
                        `;
                            })
                            .join("")}
                         <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${t("parameter.sumUnitPrice", "Tổng đơn giá")}</td>
                            <td style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${sampleTotalUnitPrice.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${t("parameter.totalDiscount", "Giảm giá")}</td>
                            <td style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${sampleTotalDiscount.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${t("parameter.sumBeforeTax", "Tiền trước thuế")}</td>
                            <td style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${sampleTotalBeforeTax.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                        <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${t("parameter.sumAfterTax", "Tổng tiền sau thuế")}</td>
                            <td style="border: 1px solid black; padding: 3px; text-align: right; font-weight: bold;">${sampleTotalAfterTax.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;
            })
            .join("");

        return `
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px; border: none;">
                <tr>
                    <td style="width: 30%; vertical-align: top; border: none !important; padding: 0;">
                        <img src="${logoFull}" alt="Logo" style="width: 100%; max-width: 150px;" />
                    </td>
                    <td style="vertical-align: top; text-align: left; padding-left: 10px; border: none !important;">
                        <div style="font-weight: bold; font-size: 14px; margin-bottom: 2px; text-transform: uppercase;">
                            ${t("order.print.header.lines.line1")}
                        </div>
                        <div style="margin-bottom: 1px;">
                            ${t("order.print.header.lines.line2")}
                        </div>
                        <div>
                            ${t("order.print.header.lines.line3")}
                        </div>
                    </td>
                </tr>
            </table>

            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="font-size: 24px; font-weight: bold; margin-bottom: 5px;">${t("quote.print.title")}</h1>
                <p>Quote ID: ${data.quoteId}</p>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">1. ${t("order.print.client")}</h3>
                <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                    <tbody>
                        <tr>
                            <td style="width: 150px; font-weight: bold; border: none !important;">${t("order.print.customer")}:</td>
                            <td style="border: none !important;">${data.client?.clientName || ""}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border: none !important;">${t("client.clientId")}:</td>
                            <td style="border: none !important;">${data.client?.clientId || ""}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border: none !important;">${t("order.print.address")}:</td>
                            <td style="border: none !important;">${data.clientAddress}</td>
                        </tr>
                         <tr>
                            <td style="font-weight: bold; border: none !important;">${t("order.print.taxCode")}:</td>
                             <td style="border: none !important;">${data.client?.legalId || ""}</td>
                        </tr>
                         <tr>
                            <td style="font-weight: bold; border: none !important;">${t("order.print.contact")}:</td>
                            <td style="border: none !important;">${data.contactPerson}</td>
                        </tr>
                        <tr>
                            <td style="font-weight: bold; border: none !important;">${t("client.contactPhone")}:</td>
                            <td style="border: none !important;">${data.contactPhone}</td>
                        </tr>

                        <tr>
                            <td style="font-weight: bold; border: none !important;">${t("order.print.email")}:</td>
                            <td style="border: none !important;">${data.reportEmail}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div style="margin-bottom: 20px;">
                <h3 style="font-size: 16px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">2. ${t("order.print.provider")}</h3>
                <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
                     <tbody>
                        <tr>
                            <td style="font-weight: bold; width: 150px; border: none !important;">${t("order.print.unit")}:</td>
                            <td style="border: none !important;">${t("organization.data.organizationName")}</td>
                        </tr>
                        <tr>
                             <td style="font-weight: bold; border: none !important;">${t("order.print.address")}:</td>
                             <td style="border: none !important;">${t("organization.data.address")}</td>
                        </tr>
                        <tr>
                             <td style="font-weight: bold; border: none !important;">${t("organization.email")}:</td>
                             <td style="border: none !important;">${t("organization.data.email")}</td>
                        </tr>

                    </tbody>
                </table>
            </div>

            <div>
                <h3 style="font-size: 16px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">3. ${t("order.print.samplesAndAnalysis")}</h3>
                ${samplesHtml}
            </div>

             <div style="margin-top: 20px; page-break-inside: avoid;">
                <h3 style="font-size: 16px; font-weight: bold; border-bottom: 1px solid black; padding-bottom: 5px; margin-bottom: 10px;">4. ${t("order.print.total")}</h3>
                 <table class="total-table" style="width: 100%; margin-top: 10px;">
                    <tbody>
                        <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important;">${t("parameter.sumUnitPrice", "Tổng đơn giá")}:</td>
                            <td style="width: 150px; text-align: right; font-weight: bold; border: none !important;">${data.pricing.subtotal.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                        ${
                            (data.pricing.discountAmount || 0) > 0 || data.discountRate > 0
                                ? `<tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important; margin-right: 0px !important;">${t("parameter.totalDiscount", "Giảm giá")} (${
                                      data.discountRate
                                  }%):</td>
                            <td style="text-align: right; border: none !important;">- ${(data.pricing.discountAmount || (data.pricing.subtotal * data.discountRate) / 100).toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>`
                                : ""
                        }
                         <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important;">${t("parameter.sumBeforeTax", "Tiền trước thuế")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important;">${(data.pricing.feeBeforeTax || 0).toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                        <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important;">${t("order.print.vat")}:</td>
                            <td style="text-align: right; border: none !important;">${data.pricing.tax.toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                         <tr style="font-size: 16px;">
                            <td style="text-align: right; padding-right: 20px; font-weight: bold; border: none !important;">${t("parameter.sumAfterTax", "Tổng tiền sau thuế")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important;">${Math.ceil(data.pricing.total).toLocaleString("vi-VN", {
                                minimumFractionDigits: 0,
                                maximumFractionDigits: 2,
                            })} đ</td>
                        </tr>
                    </tbody>
                 </table>
                 <div style="font-weight: bold; margin-top: 10px; font-style: italic;">
                    ${t("order.print.amountInWords")}: ${formatMoneyToWords(Math.ceil(data.pricing.total), i18n.language)}
                 </div>
                 <div style="font-style: italic; margin-top: 5px;">
                    <p style="font-weight: bold; margin-bottom: 2px;">${t("order.print.notePrefix")}</p>
                    <div style="margin-left: 10px;">
                        <p style="margin-bottom: 2px;">${t("quote.print.validityNote")} ${data.createdAt ? `${format(new Date(data.createdAt), "dd/MM/yyyy")}` : ""}</p>
                    </div>
                 </div>
            </div>
            <div style="margin-top: 40px; display: flex; justify-content: flex-end;">
                <div style="text-align: center; width: 40%;">
                    <p style="font-weight: bold; margin-bottom: 5px;">${t("order.print.customerConfirmation")}</p>
                    <p style="font-style: italic;">(${t("order.print.signName")})</p>
                </div>
            </div>
            </div>
        `;
    };

    const handleProcessPdf = (action: "save" | "view") => {
        const content = editorRef.current.getContent();
        const container = document.createElement("div");
        // FIX: Set width to 718px (approx 190mm at 96 DPI) to match the PRINTABLE area (210mm - 20mm margins)
        // This ensures 1:1 mapping without scaling down
        container.style.width = "718px";
        container.style.padding = "0";
        container.style.backgroundColor = "white";

        const style = document.createElement("style");
        style.innerHTML = `
            body { 
                font-family: "Times New Roman", Times, serif; 
                font-size: 13px; 
                line-height: 1.4; 
                color: #000;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                border-spacing: 0;
                margin-bottom: 10px; 
                font-size: 13px;
                page-break-inside: auto;
            }
            tr { page-break-inside: auto; page-break-after: auto; }
            th, td { 
                padding: 5px !important; 
                word-break: break-word; 
                vertical-align: middle !important;
                font-family: "Times New Roman", Times, serif;
            }
            .data-table th, .data-table td {
                border: 1px solid #000 !important;
                vertical-align: middle !important;
                padding-top: 5px !important;
                padding-bottom: 5px !important;
            }
            .info-table td, .total-table td {
                border: none !important;
            }
            h1 { font-size: 24px; font-weight: bold; margin-bottom: 5px; }
            h3 { font-size: 16px; font-weight: bold; }
            p { margin-bottom: 3px; }
        `;
        container.appendChild(style);

        const contentDiv = document.createElement("div");
        contentDiv.innerHTML = content;

        container.appendChild(contentDiv);

        const opt: any = {
            margin: [10, 10, 20, 10],
            filename: `Quote_${data.quoteId}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                windowWidth: 718, // 96 DPI Printable Width
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: { mode: ["css", "legacy"] },
        };

        html2pdf()
            .from(container)
            .set(opt)
            .toPdf()
            .get("pdf")
            .then((pdf: any) => {
                const totalPages = pdf.internal.getNumberOfPages();
                for (let i = 1; i <= totalPages; i++) {
                    pdf.setPage(i);
                    pdf.setFont("times", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(0, 0, 0);

                    // Left: Quote ID
                    pdf.text(`Quote ID: ${data.quoteId}`, 10, 297 - 10);

                    // Right: Page X/Y
                    const pageStr = `${t("common.page")} ${i}/${totalPages}`;
                    const textWidth = (pdf.getStringUnitWidth(pageStr) * 10) / pdf.internal.scaleFactor;
                    pdf.text(pageStr, 210 - 10 - textWidth, 297 - 10);
                }

                if (action === "save") {
                    pdf.save(opt.filename);
                } else {
                    const pdfBlob = pdf.output("blob");
                    const pdfUrl = URL.createObjectURL(pdfBlob);
                    window.open(pdfUrl, "_blank");
                }
            });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-5xl min-w-[900px] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">{t("quote.print.previewTitle")}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleProcessPdf("view")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium text-sm"
                            title={t("common.preview")}
                        >
                            <Eye className="w-4 h-4" />
                            {t("common.preview")}
                        </button>
                        <button
                            onClick={() => handleProcessPdf("save")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 rounded-lg transition-colors font-medium text-sm"
                            title={t("common.exportPdf")}
                        >
                            <FileDown className="w-4 h-4" />
                            {t("common.exportPdf")}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow bg-muted/50 overflow-hidden p-4 flex justify-center">
                    <Editor
                        tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                        onInit={(_evt: any, editor: any) => (editorRef.current = editor)}
                        initialValue={generateQuoteHtml(data)}
                        init={{
                            height: "100%",
                            width: "100%",
                            menubar: false,
                            statusbar: false,
                            plugins: "table lists code print",
                            toolbar: "table | bold italic | alignleft aligncenter alignright | code print",
                            content_style: `
                                /* 1. Reset */
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                
                                body { 
                                    width: 210mm; /* A4 width */
                                    margin: 20px auto !important; 
                                    padding: 10mm !important; 
                                    background-color: white; 
                                    font-family: "Times New Roman", Times, serif; 
                                    font-size: 13px;
                                    line-height: 1.3;
                                    min-height: 297mm; /* A4 height */
                                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                }

                                /* 2. Paragraph spacing */
                                p { margin-bottom: 3px !important; }

                                /* 3. Table config */
                                table { 
                                    width: 100% !important; 
                                    border-collapse: collapse; 
                                    page-break-inside: auto !important; 
                                    margin-bottom: 10px;
                                }

                                th, td { 
                                    border: 1px solid black !important; 
                                    padding: 4px !important; 
                                    word-break: break-word;
                                    vertical-align: top;
                                }

                                tr { 
                                    page-break-inside: auto !important; 
                                    page-break-after: auto !important; 
                                }

                                thead { 
                                    display: table-header-group !important; 
                                }

                                /* 4. Editor view background */
                                html { background-color: #f0f0f0; display: flex; justify-content: center; }

                                /* Print Styles */
                                @media print {
                                    body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                    html { background: none; display: block; }
                                    @page {
                                        margin: 10mm;
                                        size: A4 portrait;
                                        @bottom-right {
                                            content: "Page " counter(page);
                                        }
                                    }
                                }
                            `,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
