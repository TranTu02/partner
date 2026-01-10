import { useRef } from "react";
import { X, FileDown, Eye } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import type { OrderPrintData } from "./OrderPrintTemplate";
import { useTranslation } from "react-i18next";
// @ts-ignore
import html2pdf from "html2pdf.js";

interface SampleRequestPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: OrderPrintData;
}

export function SampleRequestPrintPreviewModal({ isOpen, onClose, data }: SampleRequestPrintPreviewModalProps) {
    const { t } = useTranslation();
    const editorRef = useRef<any>(null);

    if (!isOpen) return null;

    const generateSampleRequestHtml = (data: OrderPrintData) => {
        let globalStt = 0;
        const samplesHtml = data.samples
            .map((sample) => {
                const rowCount = sample.analyses && sample.analyses.length > 0 ? sample.analyses.length : 1;
                const analyses = sample.analyses && sample.analyses.length > 0 ? sample.analyses : [{ parameterName: "", protocolCode: "", id: "dummy" }];

                return analyses
                    .map((analysis: any, index: number) => {
                        globalStt++;
                        const isFirst = index === 0;

                        const sampleCells = isFirst
                            ? `
                            <td rowspan="${rowCount}" style="border: 1px solid black; padding: 5px; vertical-align: middle;"><span style="font-weight: 700;">${sample.sampleName}</span></td>
                            <td rowspan="${rowCount}" style="border: 1px solid black; padding: 5px; vertical-align: middle;">
                                <span>${t("sample.matrix")}:</span> <span style="font-weight: 700;">${sample.sampleMatrix}</span><br/>
                                ${sample.sampleNote ? `<span>${t("sample.desc")}:</span> <span style="font-weight: 700;">${sample.sampleNote}</span>` : ""}
                            </td>
                        `
                            : "";

                        return `
                        <tr>
                            <td style="text-align: center; border: 1px solid black; padding: 5px;">${globalStt}</td>
                            ${sampleCells}
                            <td style="border: 1px solid black; padding: 5px;">${analysis.parameterName || ""}</td>
                            <td style="border: 1px solid black; padding: 5px;">${analysis.protocolCode || ""}</td>
                            <td style="border: 1px solid black; padding: 5px;"></td>
                        </tr>
                    `;
                    })
                    .join("");
            })
            .join("");

        return `
            <div style="font-family: 'Inter', sans-serif; color: #1e293b; max-width: 794px; margin: 0 auto; position: relative;">
                <style>
                    .field-dotted { 
                        border-bottom: 1px dotted #64748b !important; 
                        padding-bottom: 2px !important; 
                        line-height: 1.6 !important;
                        display: inline-block;
                        min-width: 50px;
                        font-weight: 700;
                    }
                    .section { margin-bottom: 25px; }
                    .label-text { color: #64748b; font-weight: 400; white-space: nowrap; margin-right: 5px; }
                </style>
                <div style="position: absolute; top: 0; right: 0; font-size: 13px; font-weight: 700; color: #64748b;">${data.orderId}</div>

                <div style="text-align: center; margin-bottom: 25px;">
                    <h2 style="margin: 0; font-size: 14px; font-weight: 800; letter-spacing: 0.5px; text-transform: uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h2>
                    <p style="margin: 4px 0; font-size: 13px; font-weight: 600;">Độc lập - Tự do - Hạnh phúc</p>
                    <div style="width: 160px; height: 1.5px; background: #1e293b; margin: 8px auto;"></div>
                </div>

                <div style="text-align: right; font-style: italic; font-size: 13px; margin-bottom: 15px; color: #64748b;">
                    ..., Ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}
                </div>

                <h1 style="text-align: center; font-size: 24px; font-weight: 800; margin: 25px 0 35px; text-transform: uppercase; letter-spacing: 1px;">
                    ${t("sampleRequest.title")}
                </h1>

                <div class="section">
                    <div style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">${t("sampleRequest.section1.title")}</div>
                    
                    <div style="font-size: 14px; font-weight: 700; margin: 10px 0 8px 20px;">${t("sampleRequest.section1.clientInfo")}</div>
                    <div style="margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="grid-column: span 2; display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.clientName")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.client?.clientName || ""}</span>
                        </div>
                        <div style="grid-column: span 2; display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.address")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.clientAddress}</span>
                        </div>
                        <div style="grid-column: span 2; display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.phone")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.client?.clientContacts?.[0]?.contactPhone || ""}</span>
                        </div>
                        <div style="grid-column: span 2; display: flex; flex-direction: column; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text" style="margin-bottom: 2px;">${t("sampleRequest.invoiceInfo")}</span>
                            <span class="field-dotted" style="flex-grow: 1; margin-bottom: 4px;">${data.client?.invoiceInfo || ""}</span>
                            <span class="field-dotted" style="flex-grow: 1;"></span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.taxId")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.client?.legalId || ""}</span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.invoiceEmail")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.client?.invoiceEmail || ""}</span>
                        </div>
                    </div>

                    <div style="font-size: 14px; font-weight: 700; margin: 10px 0 8px 20px;">${t("sampleRequest.section1.contactInfo")}</div>
                    <div style="margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.contactPerson")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.contactPerson}</span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.identity")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.contactIdentity}</span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.contactPhone")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.contactPhone}</span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.email")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.reportEmail}</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">${t("sampleRequest.section2.title")}</div>
                    <div style="margin-left: 20px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div style="grid-column: span 2; display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.hardCopy")}</span>
                            <span class="label-text" style="margin-left: 15px;">${t("sampleRequest.address")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.clientAddress}</span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text" style="margin-left: 80px;">${t("sampleRequest.contactPhone")}</span>
                            <span class="field-dotted" style="flex-grow: 1;"></span>
                        </div>
                        <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.email")}</span>
                            <span class="field-dotted" style="flex-grow: 1;"></span>
                        </div>
                        <div style="grid-column: span 2; display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
                            <span class="label-text">${t("sampleRequest.softCopy")}</span>
                            <span class="field-dotted" style="flex-grow: 1;">${data.reportEmail}</span>
                        </div>
                    </div>
                </div>

                <div class="section">
                    <div style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">${t("sampleRequest.section3.title")}</div>
                    <table style="width: 100%; border-collapse: collapse; margin: 15px 0; table-layout: fixed;">
                        <thead>
                            <tr>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 30px;">${t("table.stt")}</th>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 130px;">${t("sample.name")}(*)</th>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 140px;">${t(
                                    "sampleRequest.table.sampleDesc",
                                )}(*)</th>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700;">${t("sampleRequest.table.parameters")}</th>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 100px;">${t("table.method")}</th>
                                <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 70px;">${t("sample.note")}</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${samplesHtml}
                        </tbody>
                    </table>

                    <div style="font-size: 11px; color: #475569; line-height: 1.6; margin-top: 15px;">
                        <p><strong>${t("sample.note")}:</strong></p>
                        <p>- ${t("sampleRequest.note1")}</p>
                        <p>- ${t("sampleRequest.note2")}</p>
                        <p>- ${t("sampleRequest.note3")}</p>
                        <p>- ${t("sampleRequest.note4")}</p>
                    </div>

                    <div style="font-size: 11px; font-weight: 500; text-align: justify; margin-top: 15px; padding: 10px; background: #f8fafc; border-radius: 4px; border-left: 3px solid #64748b;">
                        ${t("sampleRequest.disclaimer")}
                    </div>
                </div>

                <div class="footer-section">
                    <div style="margin-bottom: 20px;">
                        <div style="font-size: 15px; font-weight: 700; margin-bottom: 10px;">${t("sampleRequest.section4.title")}</div>
                        <div style="padding-top: 5px; font-size: 12px;">
                            <div style="font-weight: 800; font-size: 13px; margin-bottom: 5px; text-transform: uppercase;">${t("organization.data.organizationName")}</div>
                            <div style="margin-bottom: 3px;"><strong>${t("organization.address")}:</strong> ${t("organization.data.address")}</div>
                            <div style="margin-bottom: 3px;"><strong>${t("organization.phone")}:</strong> ${t("organization.data.phone")}</div>
                            <div style="margin-bottom: 3px;"><strong>${t("organization.email")}:</strong> ${t("organization.data.email")}</div>
                        </div>
                    </div>

                    <div style="display: grid; grid-template-columns: 1fr 1fr; margin-top: 40px;">
                        <div style="text-align: center;">
                            <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px;">${t("sampleRequest.receiver")}</div>
                            <div style="font-size: 11px; font-style: italic; color: #64748b; margin-bottom: 80px;">${t("sampleRequest.sign1")}</div>
                            <div style="font-weight: 600; font-size: 13px;">................................................</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-weight: 700; font-size: 14px; margin-bottom: 5px;">${t("sampleRequest.customer")}</div>
                            <div style="font-size: 11px; font-style: italic; color: #64748b; margin-bottom: 80px;">${t("sampleRequest.sign2")}</div>
                            <div style="font-weight: 600; font-size: 13px;">................................................</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    const handleProcessPdf = (action: "save" | "view") => {
        const content = editorRef.current.getContent();
        const container = document.createElement("div");
        container.style.width = "718px";
        container.style.padding = "0";
        container.style.backgroundColor = "white";

        const style = document.createElement("style");
        style.innerHTML = `
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
                font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                font-size: 13px; 
                line-height: 1.4; 
                color: #1e293b;
            }
            table { 
                width: 100%; 
                border-collapse: collapse; 
                border-spacing: 0;
                margin-bottom: 10px; 
                font-size: 12px;
                page-break-inside: auto;
            }
            tr { page-break-inside: auto; page-break-after: auto; }
            th, td { 
                border: 1px solid #1e293b !important; 
                padding: 6px 4px !important; 
                word-break: break-word; 
                vertical-align: top !important;
            }
            h1 { font-size: 24px; font-weight: 800; margin: 25px 0 35px; text-transform: uppercase; text-align: center; }
            .field-dotted { 
                border-bottom: 1px dotted #64748b !important; 
                padding-bottom: 2px !important; 
                line-height: 1.6 !important;
                display: inline-block;
                min-width: 50px;
                font-weight: 700;
            }
            .label-text { color: #64748b; font-weight: 400; white-space: nowrap; margin-right: 5px; }
        `;
        container.appendChild(style);

        const contentDiv = document.createElement("div");
        contentDiv.innerHTML = content;
        container.appendChild(contentDiv);

        const opt: any = {
            margin: [10, 10, 20, 10],
            filename: `Phieu_Gui_Mau_${data.orderId}.pdf`,
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                letterRendering: true,
                windowWidth: 718,
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
                    pdf.setFont("helvetica", "normal");
                    pdf.setFontSize(10);
                    pdf.setTextColor(100, 116, 139);

                    pdf.text(`Order ID: ${data.orderId}`, 10, 297 - 10);
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
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">Phiếu gửi mẫu thử nghiệm</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => handleProcessPdf("view")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors font-medium text-sm"
                        >
                            <Eye className="w-4 h-4" />
                            {t("common.preview")}
                        </button>
                        <button
                            onClick={() => handleProcessPdf("save")}
                            className="flex items-center gap-2 px-3 py-1.5 bg-success/10 text-success hover:bg-success/20 rounded-lg transition-colors font-medium text-sm"
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
                        initialValue={generateSampleRequestHtml(data)}
                        init={{
                            height: "100%",
                            width: "100%",
                            menubar: false,
                            statusbar: false,
                            plugins: "table lists code print noneditable",
                            toolbar: "table | bold italic | alignleft aligncenter alignright | code print",
                            noneditable_noneditable_class: "mceNonEditable",
                            noneditable_editable_class: "mceEditable",
                            content_style: `
                                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                    width: 210mm;
                                    margin: 20px auto !important; 
                                    padding: 10mm !important; 
                                    background-color: white; 
                                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
                                    font-size: 13px;
                                    line-height: 1.3;
                                    min-height: 297mm;
                                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                }
                                .mceNonEditable { color: #64748b; }
                                 .mceEditable { border-bottom: 1px dotted #64748b !important; padding-bottom: 2px !important; line-height: 1.6 !important; }
                                table { width: 100% !important; border-collapse: collapse; margin-bottom: 10px; }
                                th, td { border: 1px solid black !important; padding: 4px !important; vertical-align: top; }
                                html { background-color: #f0f0f0; display: flex; justify-content: center; }
                                @media print {
                                    body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                    html { background: none; display: block; }
                                    @page { margin: 10mm; size: A4 portrait; }
                                    .mceEditable { border-bottom: none !important; }
                                    .mceNonEditable { color: inherit; }
                                }
                            `,
                        }}
                    />
                </div>
            </div>
        </div>
    );
}
