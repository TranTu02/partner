import { useRef } from "react";
import { X, Link as LinkIcon, Printer } from "lucide-react";
import { Editor } from "@tinymce/tinymce-react";
import type { OrderPrintData } from "./OrderPrintTemplate";
import { useTranslation } from "react-i18next";
import { generateOrderUri } from "@/api/index";
import { toast } from "sonner";
import logoFullUrl from "@/assets/LOGO-FULL.png";

interface SampleRequestPrintPreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: OrderPrintData;
    onUpdateData?: (data: Partial<OrderPrintData>) => void;
}

export function SampleRequestPrintPreviewModal({ isOpen, onClose, data, onUpdateData }: SampleRequestPrintPreviewModalProps) {
    const { t } = useTranslation();
    const editorRef = useRef<any>(null);

    if (!isOpen) return null;

    console.log("SampleRequestPrintPreviewModal rendering. Data:", data);

    let initialHtml = "";
    // Priority: 1. data.requestForm (saved content), 2. Generate from data
    if (data.requestForm && data.requestForm.trim().length > 0) {
        initialHtml = data.requestForm;
    } else {
        try {
            initialHtml = generateSampleRequestHtml(data, t);
        } catch (error) {
            console.error("Error generating HTML:", error);
            return <div>Error generating preview: {String(error)}</div>;
        }
    }

    const handlePrint = () => {
        if (editorRef.current) {
            editorRef.current.execCommand("mcePrint");
        }
    };

    const handleGenerateLink = async () => {
        if (!data?.orderId) return;

        // Confirmation dialog
        if (!window.confirm("CẢNH BÁO: Việc tạo link mới sẽ đặt lại nội dung phiếu về mặc định ban đầu. Bạn có chắc chắn muốn tiếp tục?")) {
            return;
        }

        try {
            const res: any = await generateOrderUri({ body: { orderId: data.orderId } });
            if (res?.success && res?.data?.uri) {
                const link = `${window.location.origin}/form/request-sample?orderId=${data.orderId}&uri=${res.data.uri}`;
                navigator.clipboard.writeText(link);
                toast.success("Đã tạo và sao chép liên kết mới thành công");
                if (onUpdateData) {
                    onUpdateData({ orderUri: res.data.uri, requestForm: "" });
                }
            } else {
                toast.error("Không thể tạo liên kết");
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi tạo liên kết");
        }
    };

    const handleGetCurrentLink = () => {
        if (!data?.orderUri) return;
        const link = `${window.location.origin}/form/request-sample?orderId=${data.orderId}&uri=${data.orderUri}`;
        navigator.clipboard.writeText(link);
        toast.success("Đã sao chép liên kết hiện tại");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-card w-full max-w-5xl min-w-[900px] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-border">
                <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
                    <h2 className="text-lg font-bold text-foreground flex items-center gap-2">{t("sampleRequest.header", "Phiếu gửi mẫu thử nghiệm")}</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium"
                            title="In Phiếu"
                        >
                            <Printer className="w-4 h-4" />
                            <span>{t("common.print") || "In"}</span>
                        </button>

                        <button
                            onClick={handleGetCurrentLink}
                            disabled={!data.orderUri}
                            className={`flex items-center gap-2 px-3 py-2 border border-border rounded-lg transition-colors text-sm font-medium ${
                                !data.orderUri ? "bg-muted text-muted-foreground cursor-not-allowed opacity-50" : "hover:bg-accent text-foreground"
                            }`}
                            title="Lấy link hiện tại để gửi khách"
                        >
                            <LinkIcon className="w-4 h-4" />
                            {t("Lấy Link")}
                        </button>

                        <button
                            onClick={handleGenerateLink}
                            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-destructive/10 text-destructive border-destructive/20 transition-colors text-sm font-medium"
                            title="Tạo lại link mới (Reset phiếu)"
                        >
                            <LinkIcon className="w-4 h-4" />
                            {t("Tạo Link Mới")}
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-destructive/10 text-destructive rounded-lg transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-grow bg-muted/50 overflow-hidden p-4 flex justify-center">
                    <Editor
                        key={data.orderId}
                        tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                        onInit={(_evt: any, editor: any) => (editorRef.current = editor)}
                        initialValue={initialHtml}
                        init={{
                            height: "100%",
                            width: "100%",
                            menubar: false,
                            statusbar: false,
                            plugins: "table lists code print noneditable",
                            toolbar: "table | bold italic | alignleft aligncenter alignright | code print",
                            noneditable_noneditable_class: "mceNonEditable",
                            noneditable_editable_class: "mceEditable",
                            visual: false,
                            visual_table_manager: false,
                            table_toolbar: "",
                            table_context_toolbar: "",
                            content_style: `
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                    width: 210mm;
                                    margin: 10px auto !important; 
                                    padding: 5mm !important; 
                                    background-color: white; 
                                    font-size: 13px;
                                    line-height: 1.3;
                                    min-height: 297mm;
                                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                                }
                                table[data-mce-selected="1"] {
                                    outline: none !important;
                                    box-shadow: none !important;
                                }
                                .mce-resizehandle {
                                    display: none !important;
                                }   
                                .mceNonEditable { color: #64748b; }
                                 .mceEditable { border-bottom: 1px dotted #64748b !important; padding-bottom: 2px !important; line-height: 1.6 !important; }
                                table { width: 100% !important; border-collapse: collapse; margin-bottom: 10px; }
                                table:not(.layout-table) th, table:not(.layout-table) td { border: 1px solid black !important; padding: 4px !important; vertical-align: top; }
                                
                                /* Hide TinyMCE visual aids */
                                .mce-visual-caret, .mce-visual-guide { display: none !important; }
                                table[border="0"], table[style*="border: none"], table[style*="border:none"] { border: 0 !important; }
                                table[border="0"] td, table[style*="border: none"] td { border: 0 !important; }
                                
                                .layout-table td, .layout-table th { border: none !important; }
                                
                                html { background-color: #f0f0f0; display: flex; justify-content: center; }
                                @media print {
                                    body { margin: 0 !important; box-shadow: none !important; width: 100% !important; padding: 0 !important; }
                                    html { background: none; display: block; }
                                    @page { margin: 5mm; size: A4 portrait; }
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

function generateSampleRequestHtml(data: OrderPrintData, t: any) {
    let globalStt = 0;

    const rulesItems = t("sampleRequest.rules.items", {
        returnObjects: true,
    }) as string[];
    const rulesListHtml = Array.isArray(rulesItems)
        ? rulesItems
              .map(
                  (text, index) => `
        <div style="display: flex; align-items: flex-start; margin-bottom: 6px;">
            <div style="min-width: 26px; font-weight: 700;">${index + 1}.</div>
            <div style="text-align: justify;">${text}</div>
        </div>
    `,
              )
              .join("")
        : "";

    const samplesHtml = data.samples
        .map((sample, sampleIdx) => {
            const analyses = sample.analyses && sample.analyses.length > 0 ? sample.analyses : [{ parameterName: "", protocolCode: "", id: "dummy" }];

            const rowCount = analyses.length;

            const rowsHtml = analyses
                .map((analysis: any, index: number) => {
                    globalStt++;

                    const isFirst = index === 0;

                    const sampleCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:top !important;">
                <div style="margin-bottom:2px;"><span style="font-weight:400;">${t("sampleRequest.sampleInfo.sampleName")}</span><strong>:</strong> <span style="font-weight:700;">${sample.sampleName || ""}</span></div>
                <div style="font-size:13px; line-height:1.2;">
                  <div><span style="font-weight:400;">${t("sampleRequest.sampleInfo.lotNo")}</span><strong>:</strong></div>
                  <div><span style="font-weight:400;">${t("sampleRequest.sampleInfo.mfgDate")}</span><strong>:</strong></div>
                  <div><span style="font-weight:400;">${t("sampleRequest.sampleInfo.expDate")}</span><strong>:</strong></div>
                  <div><span style="font-weight:400;">${t("sampleRequest.sampleInfo.placeOfOrigin")}</span><strong>:</strong></div>
                </div>
              </td>
            `
                        : "";

                    const descCell = isFirst
                        ? `
              <td rowspan="${rowCount}" style="padding:5px; border: 1px solid #000 !important ; vertical-align:middle !important;">
             
              </td>
            `
                        : "";

                    return `
          <tr>
            <td style="text-align:center; padding:5px; border: 1px solid #000 !important;">${globalStt}</td>
            ${sampleCell}
            ${descCell}
            <td style="padding:5px; border: 1px solid #000 !important;">${analysis.parameterName || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important;">${analysis.protocolCode || ""}</td>
            <td style="padding:5px; border: 1px solid #000 !important;"></td>
          </tr>
        `;
                })
                .join("");

            const groupClass = sampleIdx === 0 ? "sample-group first-sample-group" : "sample-group";

            return `<tbody class="${groupClass}">${rowsHtml}</tbody>`;
        })
        .join("");

    const headerHtml = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        <!-- Left: logo + info -->
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:6px; flex: 1;">
          <img
            src="${logoFullUrl}"
            style="height:28px; width:auto; object-fit:contain;"
            draggable="false"
          />
          <div style="font-size:10.5px; line-height:1.3; color:#0f172a; text-align:left; align-self: center;">
            <div style="font-weight:900;">
              ${t("sampleRequest.institute.name")}
            </div>
            <div>
              ${t("sampleRequest.institute.address")} - ${t("sampleRequest.institute.tel")}   -   ${t("sampleRequest.institute.email")}
            </div>
          </div>
          <div style="flex:1;">
            <div style="text-align:right; font-size:9px; font-weight:700; white-space:nowrap; text-transform:uppercase;">
              ${t("sampleRequest.title")}
            </div>
            <div style="text-align:right; font-size:9px; font-weight:700; margin-top:2px;">
               ${data.orderId}
            </div>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid #cbd5e1; margin-top:10px; margin-bottom: 0px;"></div>
  `;

    const bodyHtml = `
      <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 6px;">
      <div style="flex:1;"></div>
      
      <div style="width:100%; margin-bottom: 12px;">
       <div style="text-align:center; font-size:20px; font-weight:900; white-space:nowrap; text-transform:uppercase;">
         ${t("sampleRequest.title")}
       </div>
       <div style="text-align:right; font-size:14px; font-weight:900; margin-top:4px;">
         ${t("sampleRequest.order")} ${data.orderId}
       </div>
     </div>
      </div>

      <div class="section">
        <div style="font-size: 15px; font-weight: 900; margin-bottom: 6px;">
            ${t("sampleRequest.section1.title")}
        </div>

        <div style="font-size: 14px; font-weight: 900; margin: 6px 0 2px;">
            ${t("sampleRequest.section1.title2")}
        </div>
        <div style="font-size: 12px; font-style: italic; margin: 0 0 8px;">
            ${t("sampleRequest.section1.subtitle")}
        </div>

        <div style="display: flex; flex-direction: column; gap: 2px;">
          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">  ${t("sampleRequest.clientName").replace(":", "")}<strong>:</strong></span>
            <span class="field-dotted" style="flex-grow: 1; font-weight: bold;">${data.client?.clientName || ""}</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></span>
            <span class="field-dotted" style="flex-grow: 1; font-weight: bold;">${data.clientAddress || ""}</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
            ${t("sampleRequest.section2.title")}
        </div>
        
        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section2.contactPerson").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.contactPerson || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.identity").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.contactIdentity || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
                 <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
        ${t("sampleRequest.section3.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
             <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
                <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: bold;" class="field-dotted">${data.clientAddress || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
        ${t("sampleRequest.section4.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
            <colgroup>
                <col style="width: 110px;">
                <col style="width: 290px;">
                <col style="width: 50px;">
                <col style="width: 300px;">
            </colgroup>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.section4.taxName").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: bold;" class="field-dotted">${data.client?.invoiceInfo?.taxName || ""}</td>
            </tr>
           <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.address").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: bold;" class="field-dotted">${
                   (data.client as any)?.invoiceAddress || data.client?.invoiceInfo?.taxAddress || ""
               }</td>
            </tr>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.taxId").replace(":", "")}<strong>:</strong></td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word; font-weight: bold;" class="field-dotted">${data.client?.legalId || data.taxCode || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 110px;" class="label-text">${t("sampleRequest.contactPhone").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 290px; word-break: break-word; font-weight: bold;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 50px;" class="label-text">${t("sampleRequest.email").replace(":", "")}<strong>:</strong></td>
                <td style="padding: 2px 5px; border: 0 !important; width: 300px; word-break: break-word; font-weight: bold;" class="field-dotted">${
                    (data.client as any)?.invoiceEmail || data.client?.invoiceInfo?.taxEmail || ""
                }</td>
            </tr>
        </table>
      </div>


      <div class="section">
        <div style="font-size: 13px; margin-top: 8px;">
        ${t("sampleRequest.section4.request")}
        </div>
        <table class="content-table" style="width: 100%; border-collapse: collapse; border: none; margin: 10px 0; table-layout: fixed;">
          <thead>
            <tr>
              <th style="border: 1px solid #1e293b; padding: 8px 8px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 40px;">
                ${t("table.stt")}
              </th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 195px;">
                ${t("sample.name")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 90px;">
                ${t("sampleRequest.table.sampleDesc")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 115px;">
                ${t("table.method")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 70px;">
                ${t("sample.note")}</th>
            </tr>
          </thead>
          ${samplesHtml}
        </table>

        <div style="font-size: 12px; font-style: italic;">
        ${t("sampleRequest.section4.quote")}</div>

       <div class="section sign-block" style="margin-top:15px; page-break-inside: avoid; break-inside: avoid;">
        <!-- Cột Khách Hàng (Nằm trên) -->
        <div style="width:100%; display:flex; justify-content:center; margin-bottom: 50px;">
             <div style="width:80%; text-align:center;">
                <div class="sign-title" style="font-weight: 900; font-size: 14px;">${t("sampleRequest.signer.customer")}</div>
                <div class="sign-confirm" style="margin-top:4px; font-style:italic; font-size:12px;">${t("sampleRequest.signer.confirm")}</div>
                <div class="sign-confirm" style="margin-top:2px; font-size: 12px;">${t("sampleRequest.signer.signNote")}</div>
                <div class="sign-space" style="height:100px;"></div>
             </div>
        </div>

        <!-- Cột IRDOP (Nằm dưới) -->
        <table style="width:100%; border:1px solid #000; border-collapse:collapse;">
          <tr>
            <td style="width:55%; vertical-align:top; text-align:left; padding:8px; border-right:1px solid #000 !important; border-bottom:0 !important;">
              <div style="font-size:13px; font-weight:900; text-transform:uppercase; margin-bottom:6px;">
                ${t("sampleRequest.signer.receiptTitle")} - <span style="font-weight:900; text-transform:none;">${t("sampleRequest.signer.labOnly")}</span>
              </div>
              <div style="font-size:13px; line-height:1.5;">
                <div>${t("sampleRequest.signer.receivedDate")} ..................................................</div>
                <div>${t("sampleRequest.signer.receivedLocation")} &#9633; ${t("sampleRequest.signer.atInstitute")}</div>
                <div>&#9633; ${t("sampleRequest.signer.other")} ....................................................................</div>
                <div>${t("sampleRequest.signer.retention")} &#9633; ${t("sampleRequest.signer.noRetention")}&nbsp;&nbsp;&nbsp;&nbsp;&#9633; ${t("sampleRequest.signer.retainSample")}</div>
              </div>
            </td>
             <td style="vertical-align:top; text-align:center; padding:8px; border-bottom:0 !important;">
              <div style="font-size:13px; font-weight:900; text-transform:uppercase; margin-bottom:6px;">
                ${t("sampleRequest.signer.receiver")}
              </div>
               <div style="height:80px;"></div>
            </td>
          </tr>
        </table>
       </div>


       <div class="rules-section" style="page-break-before: always; break-before: page;">
         <div style="text-align:center; font-weight:900; font-size:15px; text-transform:uppercase; margin-bottom:4px;">
           ${t("sampleRequest.rules.header.title")}
         </div>
         <div style="text-align:center; font-style:italic; font-size:14px; margin-bottom:10px;">
           ${t("sampleRequest.rules.header.attached")}<br/>
           ${t("sampleRequest.rules.header.archived")}
         </div>
         <div class="rules-list" style="font-size:14px; line-height:1.3;">
            ${rulesListHtml}
         </div>
          <div style="margin-top:16px; font-size:14px; line-height:1.3;">
            <div style="font-weight:900; margin-bottom:4px;">
              ${t("sampleRequest.rules.contact.title")}
            </div>
            <div style="font-weight:900;">
              ${t("sampleRequest.rules.contact.orgName")}
            </div>
            <div>${t("sampleRequest.rules.contact.address")}</div>
            <div>${t("sampleRequest.rules.contact.phone")}</div>
            <div>${t("sampleRequest.rules.contact.email")}</div>
          </div>
       </div>
    `;

    return `
    <div style="font-family: 'Reddit Mono', monospace !important; color: #1e293b; max-width: 794px; margin: 0 auto; position: relative;">
       <link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Reddit+Mono:wght@200..900&family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap" rel="stylesheet">
    <style>
        /* Global Font Settings */
        body, div, table, td, th, span {
            font-family: "Reddit Mono", monospace !important;
            font-weight: 500;
            line-height: 1.3;
        }
        b, strong, th, .bold, .font-weight-bold {
            font-weight: 700 !important;
        }

        .layout-table, .layout-table th, .layout-table td { border: none; border-collapse: collapse; }
        .field-dotted {
          border-bottom: 1px dotted #64748b !important;
          padding-bottom: 2px !important;
          line-height: 1.4 !important;
          display: inline-block;
          min-width: 50px;
          font-weight: 700 !important;
        }
        .section { margin-bottom: 25px; }
        .label-text { color: #64748b; font-weight: 400 !important; white-space: nowrap; margin-right: 5px; }

        .rules-section {
             margin-top: 40px;
             page-break-before: always;
             break-before: page;
        }

        /* Ensure content-table has borders */
        table.content-table { border-collapse: collapse !important; border: 1px solid black !important; }
        table.content-table th, table.content-table td { border: 1px solid black !important; padding: 5px !important; }
        /* Remove focus outline for all elements */
        *:focus { outline: none !important; }
      </style>

      <table class="layout-table" style="border: none !important;">
        <thead>
            <tr style="border: none !important;">
                <th style="border: none !important;">
                    ${headerHtml}
                </th>
            </tr>
        </thead>
        <tbody>
            <tr style="border: none !important;">
                <td style="border: none !important;">
                    ${bodyHtml}
                </td>
            </tr>
        </tbody>
      </table>
    </div>
  `;
}
