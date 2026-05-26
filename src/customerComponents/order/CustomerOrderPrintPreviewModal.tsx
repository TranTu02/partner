import { useRef, useState } from "react";
import { X, FileDown, Printer } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
// @ts-ignore
import { formatMoneyToWords } from "../../utils/textUtils";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import type { OtherItem } from "@/types/order";
import { useTranslation } from "react-i18next";
import { convertHtmlToPdfForm2 } from "@/api/index";
import { toast } from "sonner";
const LOGO_URL = "data:image/png;base64,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";
import { format } from "date-fns";

interface CustomerOrderPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: OrderPrintData;
}

export function CustomerOrderPrintPreviewModal({ isOpen, onClose, data }: CustomerOrderPrintPreviewModalProps) {
    const { t, i18n } = useTranslation();
    const editorRef = useRef<any>(null);
    const [editorReady, setEditorReady] = useState(false);

    if (!isOpen) return null;

    const fmtMoney = (v: number) => v.toLocaleString("vi-VN", { minimumFractionDigits: 0, maximumFractionDigits: 2 });

    const otherItems: OtherItem[] = (data as any).otherItems || [];
    const otherFeeAfterTax = otherItems.reduce((s, i) => s + Number(i.feeAfterTax || 0), 0);

    const generateOrderHtml = (data: OrderPrintData) => {
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

                // const sampleInfoHtml =
                //     sample.sampleInfo && sample.sampleInfo.length > 0
                //         ? `<div style="font-style: normal; font-size: 11px; margin-top: 4px; color: #444; line-height: 1.4;">
                //         ${(sample.sampleInfo || [])
                //             .filter((info) => info.label !== "Tên mẫu thử" && info.value)
                //             .map((info) => `<div style="margin-bottom: 2px;"><span style="color: #666;">${info.label}:</span> <b>${info.value}</b></div>`)
                //             .join("")}
                //       </div>`
                //         : "";

                return `
            <div style="margin-bottom: 20px;">
                <div style="background-color: #f0f0f0; padding: 5px 10px; margin-bottom: 5px;">
                    <div style="font-weight: bold;">${t("order.print.sample")} ${index + 1}: ${sample.sampleName}</div>
                    ${(() => {
                        const hasSampleInfo = sample.sampleInfo && sample.sampleInfo.some(info => info.label !== "Tên mẫu thử" && info.value && info.value.trim());
                        if (hasSampleInfo) {
                            return `<div style="font-style: normal; font-size: 11px; margin-top: 4px; color: #444; line-height: 1.4;">
                                ${(sample.sampleInfo || [])
                                    .filter((info) => info.label !== "Tên mẫu thử" && info.value && info.value.trim())
                                    .map((info) => `<div style="margin-bottom: 2px;"><span style="color: #666;">${info.label}:</span> <b>${info.value}</b></div>`)
                                    .join("")}
                            </div>`;
                        } else {
                            const s = sample as any;
                            const name = s.sampleTypeName || s.sampleMatrix || s.librarySampleType?.sampleTypeName || s.matrix?.matrixName;
                            const displayName = name || (s.analyses && s.analyses.length > 0 ? s.analyses[0].sampleTypeName || s.analyses[0].sampleMatrix || "--" : "--");
                            return `<div style="font-size: 11px; margin-bottom: 2px;">Loại mẫu: ${displayName}</div>`;
                        }
                    })()}
                    ${sample.sampleNote ? `<div style="font-style: italic; margin-top: 2px; color: #555;">${t("sample.note")}: ${sample.sampleNote}</div>` : ""}
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #e6e6e6;">
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; width: 30px; vertical-align: top;">${t("order.print.stt")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: left; vertical-align: top;">${t("order.print.parameter")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top; width: 100px;">${fmtMoney(0).includes(",") ? t("order.print.amount") : "S&#7889; ti&#7873;n"}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; width: 60px; vertical-align: top;">${t("order.print.tax", "Thu&#7871;")} (%)</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top; width: 130px;">${t("order.print.total")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${sample.analyses
                            .map((analysis, i) => {
                                const price = (analysis.unitPrice || 0) * (1 - (analysis.discountRate || 0) / 100);
                                return `
                            <tr>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; vertical-align: top;">${i + 1}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; vertical-align: top;">${analysis.parameterName}</td>
                                 <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">
                                    ${fmtMoney(price)}
                                    ${
                                        (analysis.discountRate || 0) > 0
                                            ? `<br/><span style="text-decoration: line-through; font-size: 10px; color: #666;">${fmtMoney(analysis.unitPrice || 0)}</span>`
                                            : ""
                                    }
                                 </td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; vertical-align: top;">${analysis.taxRate || 0}%</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">
                                    ${fmtMoney(analysis.feeAfterTax)} 
                                </td>
                            </tr>
                        `;
                            })
                            .join("")}
                        <tr>
                            <td colspan="4" style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${t("parameter.sumAfterTax", "Tổng tiền")}</td>
                            <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${fmtMoney(sampleTotalAfterTax)} </td>
                        </tr>
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
            <div style="margin-bottom: 20px;">
                <div style="background-color: #f0f0f0; padding: 5px 10px; margin-bottom: 5px;">
                    <div style="font-weight: bold;">${t("order.otherItems.title", "Phụ phí")}</div>
                </div>
                <table class="data-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #e6e6e6;">
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; width: 50px; vertical-align: top;">${t("order.print.stt")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: left; vertical-align: top;">${t("order.otherItems.itemName", "Loại phí")}</th>
                            <th style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${t("order.otherItems.value", "Giá trị")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${otherItems
                            .map(
                                (item, i) => `
                            <tr>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: center; vertical-align: top;">${i + 1}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; vertical-align: top;">${item.itemName || ""}</td>
                                <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; vertical-align: top;">${fmtMoney(Number(item.feeAfterTax || 0))}</td>
                            </tr>
                        `,
                            )
                            .join("")}
                        <tr>
                            <td colspan="2" style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${t("order.otherItems.totalLabel", "Tổng phụ phí")}</td>
                            <td style="border: 1px solid black; padding: 2px 5px 8px 5px; text-align: right; font-weight: bold; vertical-align: top;">${fmtMoney(otherFeeAfterTax)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `
                : "";
        const grandTotal = data.pricing.total;
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
                                            ${data.orderId}
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
                <h1 style="font-size: 16px; font-weight: bold; margin-bottom: 1px;">${t("order.print.title")}</h1>
                <p style="font-size: 12px;">${t("order.print.orderId")}: ${data.orderId}</p>
            </div>

            <div style="margin-bottom: 12px;">
                <h3 style="font-size: 14px; font-weight: bold; padding-bottom: 2px; margin-bottom: 6px;">1. ${t("order.print.client")}</h3>
                <table class="info-table" style="width: 100%; border-collapse: collapse; margin-bottom: 3px;">
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
            </div>

             ${otherItemsHtml}

             <div style="margin-top: 12px;">
                <h3 style="font-size: 14px; font-weight: bold; padding-bottom: 2px; margin-bottom: 6px;">3. ${t("order.print.total")}</h3>
                 <table class="total-table" style="width: 100%; margin-top: 10px; border-collapse: collapse;">
                    <tbody>
                        <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("parameter.sumUnitPrice", "Tổng đơn giá")}:</td>
                            <td style="width: 150px; text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${fmtMoney(data.pricing.subtotal || 0)} </td>
                        </tr>
                        ${
                            data.otherItems && data.otherItems.length > 0
                                ? `
                        <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.otherItems.title", "Phụ phí")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${fmtMoney(
                                data.otherItems.reduce((acc, curr) => acc + (curr.feeBeforeTax || 0), 0),
                            )}</td>
                        </tr>
                        `
                                : ""
                        }
                        ${
                            (data.pricing.discountAmount || 0) > 0
                                ? `<tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("parameter.totalDiscount", "Chiết khấu")}:</td>
                            <td style="text-align: right; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">- ${fmtMoney(data.pricing.discountAmount || 0)} </td>
                        </tr>`
                                : ""
                        }
                        <tr>
                            <td style="text-align: right; padding-right: 20px; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.print.vat", "Tiền thuế (VAT)")}:</td>
                            <td style="text-align: right; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${fmtMoney(data.pricing.tax || 0)} </td>
                        </tr>

                        <tr style="font-size: 16px;">
                            <td style="text-align: right; padding-right: 20px; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${t("order.total", "Tổng tiền")}:</td>
                            <td style="text-align: right; font-weight: bold; border: none !important; padding: 2px 5px 8px 5px; vertical-align: top;">${fmtMoney(Math.ceil(grandTotal))} </td>
                        </tr>
                    </tbody>
                 </table>
                 <div style="font-weight: bold; margin-top: 10px; font-style: italic;">
                    ${t("order.print.amountInWords")}: ${formatMoneyToWords(Math.ceil(grandTotal), i18n.language)}
                 </div>
                 <div style="font-style: italic; margin-top: 5px;">
                    <p style="font-weight: bold; margin-bottom: 2px;">${t("order.print.notePrefix")}</p>
                    <div style="margin-left: 10px;">
                        <p style="margin-bottom: 2px;">${t("order.print.validityNote")} ${(() => {
                            if (!data.createdAt) return "";
                            const d = new Date(data.createdAt);
                            return !isNaN(d.getTime()) ? format(d, "dd/MM/yyyy") : "";
                        })()}</p>
                        <p style="margin-bottom: 2px;">${t("order.print.disclaimer")}</p>
                    </div>
                 </div>
                </div>
            </div>

            <div style="page-break-inside: avoid !important;">
                <div style="margin-top: 10px;">
                    <p style="font-weight: bold;">${t("order.print.bankInfo.title")}</p>
                    <table style="width: 100%; border-collapse: collapse; border: none;">
                        <tr>
                            <td style="width: 60%; vertical-align: top; border: none !important; padding: 0;">
                                <p>${t("order.print.bankInfo.accountName")}</p>
                                <p>${t("order.print.bankInfo.accountNumber")}</p>
                                <p>${t("order.print.bankInfo.bankName")}</p>                                
                                <p>${t("order.print.bankInfo.transferContent")}: ${data.orderId}  ${t("order.print.customerContent")}</p>
                            </td>
                            <td style="width: 40%; vertical-align: top; text-align: center; border: none !important; padding: 0;">
                                <img src="https://img.vietqr.io/image/ACB-16356688-qr_only.png?amount=${Math.ceil(grandTotal)}&addInfo=${encodeURIComponent(
                                    `${data.orderId}`,
                                )}&accountName=Vien%20nghien%20cuu%20va%20phat%20trien%20san%20pham%20thien%20nhien" alt="QR Code" style="width: 105px;" />
                            </td>
                        </tr>
                    </table>
                </div>
                <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                    <div style="text-align: center; width: 40%;">
                        <p style="font-weight: bold; margin-bottom: 5px;">${t("order.print.customerConfirmation")}</p>
                        <p style="font-style: italic;">(${t("order.print.signName")})</p>
                        <div style="height: 30mm;"></div>
                    </div>
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
                    orderId: data.orderId,
                },
            });

            // Create download link
            const url = window.URL.createObjectURL(new Blob([blob]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Order_${data.orderId || "export"}.pdf`);
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
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">{t("order.print.previewTitle")}</h2>
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
                        <div style={{ visibility: editorReady ? "visible" : "hidden", height: "100%" }}>
                            <Editor
                                tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                                onInit={(_evt: any, editor: any) => {
                                    editorRef.current = editor;
                                    setEditorReady(true);
                                }}
                                initialValue={generateOrderHtml(data)}
                                init={{
                                    height: "100%",
                                    width: "100%",
                                    menubar: false,
                                    statusbar: false,
                                    plugins: "table lists code print autoresize",
                                    toolbar: "bold italic | alignleft aligncenter alignright | table tablemergecells tablesplitcells | code print",
                                    toolbar_mode: "wrap",
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
