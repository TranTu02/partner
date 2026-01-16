import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { ArrowLeft, Save, Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getOrderDetail, checkOrderUri, updateOrder } from "@/api/index";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import type { Client } from "@/types/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
// @ts-ignore
import html2pdf from "html2pdf.js";
import logoFullUrl from "@/assets/LOGO-FULL.png";

export function SampleRequestFormPage() {
    const { t } = useTranslation();
    const {} = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const orderId = params.get("orderId") || "";
    const uri = params.get("uri");

    const editorRef = useRef<any>(null);

    const [data, setData] = useState<OrderPrintData | null>(null);
    const [loading, setLoading] = useState(false);
    const [editorReady, setEditorReady] = useState(false);
    const [savedContent, setSavedContent] = useState<string>("");

    // Removed URI verification effect here, combined below

    useEffect(() => {
        const run = async () => {
            if (!orderId.trim()) {
                toast.error("Thiếu orderId. Ví dụ: /orders/form/request?orderId=DH26C0011");
                return;
            }

            setLoading(true);
            try {
                let printData: OrderPrintData | null = null;
                let requestFormContent = "";

                if (uri) {
                    // Public access flow verify URI and get order data
                    const res: any = await checkOrderUri({ body: { uri, orderId } });
                    if (!res?.success || !res?.data) {
                        toast.error("Liên kết không hợp lệ hoặc đã hết hạn");
                        setData(null);
                        return; // Stop if invalid
                    }
                    // res.data is the order object
                    printData = mapOrderDetailResponseToPrintData(res.data);
                    requestFormContent = res.data.requestForm || "";
                } else {
                    // Internal access flow
                    const res: any = await getOrderDetail({ query: { orderId } });
                    if (!res?.success || !res?.data) {
                        toast.error(res?.error?.message || "Không lấy được dữ liệu order");
                        setData(null);
                        return;
                    }
                    printData = mapOrderDetailResponseToPrintData(res.data);
                }

                if (printData) {
                    setData(printData);
                    if (requestFormContent) {
                        setSavedContent(requestFormContent);
                    }
                }
            } catch (e: any) {
                console.error(e);
                toast.error(e?.message || "Lỗi khi tải dữ liệu");
                setData(null);
            } finally {
                setLoading(false);
            }
        };

        run();
    }, [orderId, uri]);

    useEffect(() => {
        setEditorReady(false);
    }, [data?.orderId]);

    const initialHtml = useMemo(() => {
        if (savedContent) return savedContent;
        if (!data) return "";
        return generateSampleRequestHtml(data, t);
    }, [data, t, savedContent]);

    const handleSave = async () => {
        if (!editorRef.current) return;

        const content = editorRef.current.getContent();
        const toastId = toast.loading(t("common.saving") || "Đang lưu...");

        try {
            const res = await updateOrder({
                body: {
                    orderId,
                    requestForm: content,
                    orderUri: uri || undefined,
                },
            });

            if (res.success) {
                toast.success(t("common.saveSuccess") || "Lưu thành công", { id: toastId });
                setSavedContent(content);
            } else {
                toast.error(res.error?.message || "Lỗi khi lưu", { id: toastId });
            }
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi lưu", { id: toastId });
        }
    };

    const handlePrint = () => {
        if (editorRef.current) {
            editorRef.current.execCommand("mcePrint");
        }
    };

    // handleProcessPdf removed

    return (
        <div className="h-screen flex flex-col bg-background">
            <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors" title="Back">
                        <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col">
                        <div className="text-lg font-semibold">{t("sampleRequest.header")}</div>
                        <div className="text-xs text-muted-foreground">{orderId ? `Order ID: ${orderId}` : "/orders/form/request?orderId=..."}</div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors shadow-sm">
                        <Printer className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("common.print") || "In"}</span>
                    </button>
                    <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors shadow-sm">
                        <Save className="w-4 h-4" />
                        <span className="text-sm font-medium">{t("common.save") || "Lưu"}</span>
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden">
                {loading && <div className="p-4">{t("common.loading")}</div>}

                {data && (
                    <div className="relative h-full">
                        {!editorReady && <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">{t("common.loading")}</div>}

                        <div
                            style={{
                                visibility: editorReady ? "visible" : "hidden",
                                height: "100%",
                            }}
                        >
                            <Editor
                                key={data.orderId}
                                tinymceScriptSrc="https://cdnjs.cloudflare.com/ajax/libs/tinymce/6.8.2/tinymce.min.js"
                                onInit={(_evt: any, editor: any) => {
                                    editorRef.current = editor;
                                    setEditorReady(true);
                                }}
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
                                    @page { margin: 8mm; size: A4 portrait; }
                                    .mceEditable { border-bottom: none !important; }
                                    .mceNonEditable { color: inherit; }
                                }
                            `,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                .tox-tinymce {
                    border-radius: 0 !important;
                    border: none !important;
                }
            `}</style>
        </div>
    );
}

function mapOrderDetailResponseToPrintData(resp: any): OrderPrintData {
    const order = resp?.data ?? resp;
    const client: Client | null = order?.client ?? null;

    const cp = order?.contactPerson;
    const isCpObj = cp && typeof cp === "object";

    const contactPerson = isCpObj ? cp.contactName || "" : typeof cp === "string" ? cp : "";
    const contactPhone = isCpObj ? cp.contactPhone || "" : "";
    const contactIdentity = isCpObj ? cp.contactId || "" : "";
    const contactEmail = isCpObj ? cp.contactEmail || "" : "";
    const contactAddress = isCpObj ? cp.contactAddress || "" : "";
    const contactPosition = isCpObj ? cp.contactPosition || "" : "";

    const invoice = client?.invoiceInfo;

    return {
        orderId: String(order?.orderId ?? order?.id ?? ""),
        client,

        contactPerson,
        contactPhone,
        contactIdentity,
        reportEmail: contactEmail,

        contactEmail,
        contactPosition,
        contactAddress,

        clientAddress: client?.clientAddress ?? "",
        taxName: invoice?.taxName,
        taxCode: invoice?.taxCode,
        taxAddress: invoice?.taxAddress,

        samples: (order?.samples ?? []).map((s: any) => ({
            sampleName: s?.sampleName ?? "",
            sampleMatrix: s?.sampleMatrix ?? "",
            sampleNote: s?.sampleNote ?? "",
            analyses: (s?.analyses ?? []).map((a: any) => ({
                parameterName: a?.parameterName ?? "",
                parameterId: a?.parameterId ?? undefined,
                feeBeforeTax: Number(a?.feeBeforeTax ?? 0),
                taxRate: Number(a?.taxRate ?? 0),
                feeAfterTax: Number(a?.feeAfterTax ?? 0),
            })),
        })),

        pricing: {
            subtotal: Number(order?.totalFeeBeforeTax ?? 0),
            discountAmount: Number(order?.totalDiscountValue ?? 0),
            feeBeforeTax: Number(order?.totalFeeBeforeTaxAndDiscount ?? 0),
            tax: Number(order?.totalTaxValue ?? 0),
            total: Number(order?.totalAmount ?? 0),
        },

        discountRate: Number(order?.discountRate ?? 0),
    };
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
                <div style="font-weight:900; margin-bottom:2px;">${t("sampleRequest.sampleInfo.sampleName")}: ${sample.sampleName || ""}</div>
                <div style="font-size:14px; line-height:1.2;">
                  <div><span style="font-weight:900;">${t("sampleRequest.sampleInfo.lotNo")}</span></div>
                  <div><span style="font-weight:900;">${t("sampleRequest.sampleInfo.mfgDate")}</span></div>
                  <div><span style="font-weight:900;">${t("sampleRequest.sampleInfo.expDate")}</span></div>
                  <div><span style="font-weight:900;">${t("sampleRequest.sampleInfo.placeOfOrigin")}</span></div>
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
            <span class="label-text" style="min-width: 120px;">  ${t("sampleRequest.clientName")}</span>
            <span class="field-dotted" style="flex-grow: 1;">${data.client?.clientName || ""}</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 14px; margin-bottom: 2px;">
            <span class="label-text" style="min-width: 120px;">${t("sampleRequest.address")}</span>
            <span class="field-dotted" style="flex-grow: 1;">${data.clientAddress || ""}</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
            ${t("sampleRequest.section2.title")}
        </div>
        
        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 125px;">
                <col style="width: 275px;">
                <col style="width: 75px;">
                <col style="width: 275px;">
            </colgroup>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.section2.contactPerson")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.contactPerson || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 75px;" class="label-text">${t("sampleRequest.identity")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.contactIdentity || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 75px;" class="label-text">${t("sampleRequest.email")}</td>
                 <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
        ${t("sampleRequest.section3.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
             <colgroup>
                <col style="width: 125px;">
                <col style="width: 275px;">
                <col style="width: 75px;">
                <col style="width: 275px;">
            </colgroup>
             <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.address")}</td>
                <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word;" class="field-dotted">${data.clientAddress || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 75px;" class="label-text">${t("sampleRequest.email")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.reportEmail || ""}</td>
            </tr>
        </table>

        <div style="font-size: 14px; font-weight: 900; margin: 8px 0 4px;">
        ${t("sampleRequest.section4.title")}
        </div>

        <table class="layout-table" style="width: 100%; border-collapse: collapse; margin-bottom: 2px; border: 0 !important;" border="0">
            <colgroup>
                <col style="width: 125px;">
                <col style="width: 275px;">
                <col style="width: 75px;">
                <col style="width: 275px;">
            </colgroup>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.section4.taxName")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word;" class="field-dotted">${data.client?.invoiceInfo?.taxName || ""}</td>
            </tr>
           <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.address")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word;" class="field-dotted">${
                   (data.client as any)?.invoiceAddress || data.client?.invoiceInfo?.taxAddress || ""
               }</td>
            </tr>
            <tr>
               <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.taxId")}</td>
               <td colspan="3" style="padding: 2px 5px; border: 0 !important; word-break: break-word;" class="field-dotted">${data.client?.legalId || data.taxCode || ""}</td>
            </tr>
            <tr>
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 125px;" class="label-text">${t("sampleRequest.contactPhone")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${data.contactPhone || data.client?.clientPhone || ""}</td>
                
                <td style="white-space: nowrap; padding: 2px 5px; border: 0 !important; width: 75px;" class="label-text">${t("sampleRequest.email")}</td>
                <td style="padding: 2px 5px; border: 0 !important; width: 275px; word-break: break-word;" class="field-dotted">${
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
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 200px;">
                ${t("sample.name")}(*)</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 140px;">
                ${t("sampleRequest.table.sampleDesc")}(*)</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 12.5px; background-color: #f8fafc; font-weight: 900; width: 100px;">
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
            font-weight: 900 !important;
        }

        .layout-table, .layout-table th, .layout-table td { border: none; border-collapse: collapse; }
        .field-dotted {
          border-bottom: 1px dotted #64748b !important;
          padding-bottom: 2px !important;
          line-height: 1.4 !important;
          display: inline-block;
          min-width: 50px;
          font-weight: 900 !important;
        }
        .section { margin-bottom: 25px; }
        .label-text { color: #64748b; font-weight: 500 !important; white-space: nowrap; margin-right: 5px; }

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
