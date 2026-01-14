import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Editor } from "@tinymce/tinymce-react";
import { Eye, FileDown, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getOrderDetail } from "@/api/index";
import type { OrderPrintData } from "@/components/order/OrderPrintTemplate";
import type { Client } from "@/types/client";
import { toast } from "sonner";
// @ts-ignore
import html2pdf from "html2pdf.js";
import logoFullUrl from "@/assets/LOGO-FULL.png";
import interRegularUrl from "@/assets/font/Inter-Regular.ttf?url";
import interBoldUrl from "@/assets/font/Inter-Bold.ttf?url";

export function SampleRequestFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const orderId = params.get("orderId") || "";

  const editorRef = useRef<any>(null);

  const [data, setData] = useState<OrderPrintData | null>(null);
  const [loading, setLoading] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!orderId.trim()) {
        toast.error(
          "Thiếu orderId. Ví dụ: /orders/form/request?orderId=DH26C0011"
        );
        return;
      }

      setLoading(true);
      try {
        const res: any = await getOrderDetail({ query: { orderId } });
        if (!res?.success || !res?.data) {
          toast.error(res?.error?.message || "Không lấy được dữ liệu order");
          setData(null);
          return;
        }

        // res.data có thể là {success,statusCode,data:{...}}
        const printData = mapOrderDetailResponseToPrintData(res.data);
        setData(printData);
      } catch (e: any) {
        toast.error(e?.message || "Lỗi khi gọi getOrderDetail");
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [orderId]);

  useEffect(() => {
    setEditorReady(false);
  }, [data?.orderId]);

  const initialHtml = useMemo(() => {
    if (!data) return "";
    return generateSampleRequestHtml(data, t);
  }, [data, t]);

  const toDataURL = async (url: string) => {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  };

  const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
    let binary = "";
    const bytes = new Uint8Array(buffer);
    const chunkSize = 0x8000;
    for (let i = 0; i < bytes.length; i += chunkSize) {
      binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
    }
    return btoa(binary);
  };

  const ensureVietnameseFont = async (pdf: any) => {
    if ((pdf as any).__vnFontLoaded) return;

    const [regBuf, boldBuf] = await Promise.all([
      fetch(interRegularUrl).then((r) => r.arrayBuffer()),
      fetch(interBoldUrl).then((r) => r.arrayBuffer()),
    ]);

    pdf.addFileToVFS("Inter-Regular.ttf", arrayBufferToBase64(regBuf));
    pdf.addFileToVFS("Inter-Bold.ttf", arrayBufferToBase64(boldBuf));

    pdf.addFont("Inter-Regular.ttf", "Inter", "normal");
    pdf.addFont("Inter-Bold.ttf", "Inter", "bold");

    (pdf as any).__vnFontLoaded = true;
  };

  const handleProcessPdf = async (action: "save" | "view") => {
    if (!data) return;

    const content = editorRef.current?.getContent?.() || "";

    const logoDataUrl = await toDataURL(logoFullUrl);

    const container = document.createElement("div");
    container.className = "pdf-root";
    container.style.width = "718px";
    container.style.padding = "0";
    container.style.backgroundColor = "white";

    const style = document.createElement("style");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  
      .pdf-root {
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        font-size: 13px;
        line-height: 1.4;
        color: #1e293b;
      }
  
      [data-doc-header] { display: none !important; }
  
     table {
        width: 100%;
        border-collapse: separate !important;
        border-spacing: 0 !important;
        margin-bottom: 10px;
        font-size: 12px;
        page-break-inside: auto;
      }
      tr { page-break-inside: avoid; page-break-after: auto; }

      th, td {
        border: 0 !important;
        border-right: 1px solid #1e293b !important;
        border-bottom: 1px solid #1e293b !important;
        margin-bottom: 4px !important;
        padding: 6px 4px !important;
        word-break: break-word;
        vertical-align: top !important;
      }

      th:first-child, td:first-child {
        border-left: 1px solid #1e293b !important;
      }
      thead th {
        border-top: 1px solid #1e293b !important;
      }

      td.merge-top { border-bottom: 0 !important; }
      td.merge-mid { border-top: 0 !important; border-bottom: 0 !important; }
      td.merge-bottom { border-top: 0 !important; }
      td.merge-mid, td.merge-bottom { color: transparent; }
      h1 { font-size: 24px; font-weight: 800; margin: 25px 0 35px; text-transform: uppercase; text-align: center; }
      .field-dotted {
        border-bottom: 1px dotted #64748b !important;
        padding-bottom: 2px !important;
        line-height: 1.6 !important;
        display: inline-block;
        min-width: 50px;
        font-weight: 700;
      }
      ol { padding-left: 0 !important; margin-left: 0 !important; }
      li { list-style: none !important; }

      ol > li{
        display: flex;
        align-items: flex-start;
        gap: 6px;
      }

      .__li-no{
        flex: 0 0 auto;
        min-width: 16px;
      }

      .__li-text{
        flex: 1 1 auto;
        text-align: justify;
        text-justify: inter-word;
      }
      .contact-block > div:last-child { padding-bottom: 2px; }
      .sample-group {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }
      .sample-group tr {
        page-break-inside: avoid !important;
        break-inside: avoid !important;
      }

      .sign-block{
        margin-top: 8px;
        text-align: center;
        break-inside: avoid !important;
        page-break-inside: avoid !important;
        min-height: 110px;
      }

      .sign-title{
        font-size: 13px;
        font-weight: 800;
        text-transform: uppercase;
      }

      .sign-confirm{
        font-size: 11px;
        margin-top: 2px;
      }

      .sign-space{
        height: 70px;
      }
  
      .label-text { color: #64748b; font-weight: 400; white-space: nowrap; margin-right: 5px; }
    `;
    container.appendChild(style);

    const contentDiv = document.createElement("div");
    contentDiv.innerHTML = content;
    container.appendChild(contentDiv);
    contentDiv.querySelectorAll("ol").forEach((ol) => {
      const lis = ol.querySelectorAll(":scope > li");

      lis.forEach((li, idx) => {
        if (li.querySelector(":scope > .__li-no")) return;
        const no = document.createElement("span");
        no.className = "__li-no";
        no.textContent = `${idx + 1}.`;

        const textWrap = document.createElement("span");
        textWrap.className = "__li-text";

        while (li.firstChild) textWrap.appendChild(li.firstChild);

        li.appendChild(no);
        li.appendChild(textWrap);
      });
    });

    const FOOTER_H = 12;
    const opt: any = {
      margin: [28, 10, FOOTER_H, 10],
      filename: `Phieu_Gui_Mau_${data.orderId}.pdf`,
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: {
        scale: 2,
        useCORS: true,
        letterRendering: true,
        windowWidth: 718,
      },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: {
        mode: ["css", "legacy"],
        before: ".page-break",
        avoid: [".sample-group", "tr"],
      },
    };

    html2pdf()
      .from(container)
      .set(opt)
      .toPdf()
      .get("pdf")
      .then(async (pdf: any) => {
        await ensureVietnameseFont(pdf);

        const totalPages = pdf.internal.getNumberOfPages();

        for (let i = 1; i <= totalPages; i++) {
          pdf.setPage(i);

          const pageWidth = 210;
          const marginRight = 10;

          const xRight = pageWidth - marginRight;

          const left = 10;
          const top = 8;

          const logoH = 10;
          const logoW = 32;

          pdf.addImage(logoDataUrl, "PNG", left, top, logoW, logoH);

          const textX = left + logoW + 4;

          const rightColWidth = 40;
          const rightColLeftX = xRight - rightColWidth;

          const leftColWidth = rightColLeftX - textX - 4;

          pdf.setTextColor(15, 23, 42);
          pdf.setFont("Inter", "bold");
          pdf.setFontSize(10);

          const leftTitle =
            "VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN";
          const leftTitleLines = pdf.splitTextToSize(leftTitle, leftColWidth);
          pdf.text(leftTitleLines, textX, top + 4);

          pdf.setFont("Inter", "normal");
          pdf.setFontSize(9);

          const line2 =
            "Add: 12 Phùng Khoang 2, P. Đại Mỗ, TP. Hà Nội  -  Tel: 024 355 35 355";
          const line3 = "Email: cskh@irdop.org";

          pdf.text(pdf.splitTextToSize(line2, leftColWidth), textX, top + 9);
          pdf.text(pdf.splitTextToSize(line3, leftColWidth), textX, top + 14);

          const rawTitle = t("sampleRequest.order") + " " + data.orderId;

          const titleUpper = String(rawTitle).toUpperCase();

          pdf.setFont("Inter", "bold");

          let fontSize = 9;
          let titleLines: string[] = [];

          while (fontSize >= 8) {
            pdf.setFontSize(fontSize);
            titleLines = pdf.splitTextToSize(titleUpper, rightColWidth);
            if (titleLines.length <= 2) break;
            fontSize -= 1;
          }

          pdf.text(titleLines, xRight, top + 4, { align: "right" });

          pdf.setDrawColor(203, 213, 225);
          pdf.setLineWidth(0.3);
          pdf.line(10, 26, 200, 26);

          pdf.setFont("Inter", "normal");
          pdf.setFontSize(10);
          pdf.setTextColor(100, 116, 139);

          for (let i = 1; i <= totalPages; i++) {
            pdf.setPage(i);

            const pageWidth = 210;
            const pageHeight = 297;

            const yFooterText = 287;
            const padTop = 4;
            const yFooterTop = yFooterText - padTop;

            pdf.setFillColor(255, 255, 255);
            pdf.rect(0, yFooterTop, pageWidth, pageHeight - yFooterTop, "F");

            pdf.setFont("Inter", "normal");
            pdf.setFontSize(10);
            pdf.setTextColor(100, 116, 139);
            pdf.text(`Trang ${i}/${totalPages}`, 200, yFooterText, {
              align: "right",
            });
          }
        }

        if (action === "save") {
          pdf.save(opt.filename);
        } else {
          const pdfBlob = pdf.output("blob");
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, "_blank", "noopener,noreferrer");
        }
      });
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 hover:bg-accent rounded-full text-muted-foreground transition-colors"
            title="Back">
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <div className="text-lg font-semibold">
              {t("sampleRequest.header")}
            </div>
            <div className="text-xs text-muted-foreground">
              {orderId
                ? `Order ID: ${orderId}`
                : "/orders/form/request?orderId=..."}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => handleProcessPdf("view")}
            disabled={!data}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50">
            <Eye className="w-4 h-4" />
            {t("common.preview")}
          </button>

          <button
            onClick={() => handleProcessPdf("save")}
            disabled={!data}
            className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm font-medium disabled:opacity-50">
            <FileDown className="w-4 h-4" />
            {t("common.exportPdf")}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-4 bg-muted/50">
        {loading && <div className="p-4">{t("common.loading")}</div>}

        {data && (
          <div className="relative h-full">
            {!editorReady && (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
                {t("common.loading")}
              </div>
            )}

            <div
              style={{
                visibility: editorReady ? "visible" : "hidden",
                height: "100%",
              }}>
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
                  toolbar:
                    "table | bold italic | alignleft aligncenter alignright | print",

                  noneditable_class: "mceNonEditable",
                  editable_class: "mceEditable",

                  setup: (editor) => {
                    editor.on("init", () => setEditorReady(true));

                    editor.on("keydown", (e) => {
                      if (e.key !== "Backspace" && e.key !== "Delete") return;
                      const node = editor.selection.getNode();
                      const protectedBlock = node.closest?.(".mceNonEditable");
                      if (protectedBlock) {
                        e.preventDefault();
                        e.stopPropagation();
                      }
                    });
                  },

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
              table {
                width: 100%;
                border-collapse: separate !important;
                border-spacing: 0 !important;
                margin-bottom: 20px; /* Tăng từ 10px lên 20px */
                font-size: 12px;
                page-break-inside: avoid !important; /* Thêm dòng này */
              }
              th, td {
                border: 0 !important;
                border-right: 1px solid #000 !important;
                border-bottom: 1px solid #000 !important;
                padding: 4px !important;
                vertical-align: top !important;
              }
              th:first-child, td:first-child { border-left: 1px solid #000 !important; }
              thead th { border-top: 1px solid #000 !important; }
              td.merge-top { border-bottom: 0 !important; }
              td.merge-mid { border-top: 0 !important; border-bottom: 0 !important; }
              td.merge-bottom { border-top: 0 !important; }
              td.merge-mid, td.merge-bottom { color: transparent; }

              html { background-color: #f0f0f0; display: flex; justify-content: center; }

              .rules-page .rules-header,
              .rules-page .rules-header *{
                text-align: center !important;
              }

              .rules-page .rules-body,
              .rules-page .rules-body p,
              .rules-page .rules-body div,
              .rules-page .rules-body li{
                text-align: justify !important;
                text-justify: inter-word;
              }

              .rules-page .rules-ol{
                padding-left: 18px !important;
                margin-left: 0 !important;
              }
              .rules-page .rules-ol > li{ margin: 0 0 4px 0 !important; }
              tr.__print-break td{
                border: 0 !important;
                padding: 0 !important;
                height: 0 !important;
              }
              tr.__print-break .__pb{
                display:block;
                height:0;
              }

              .sign-block{
                margin-top: 8px;
                text-align: center;
                break-inside: avoid;
                page-break-inside: avoid;
              }

              .sign-title{
                font-size: 13px;
                font-weight: 800;
                text-transform: uppercase;
              }

              .sign-confirm{
                font-size: 11px;
                margin-top: 2px;
              }

              .sign-space{
                height: 70px;
              }
              @media print {
                [data-doc-header]{
                  display: block !important;
                  top: 0 !important;
                  left: 0 !important;
                  right: 0 !important;
                  background: #fff !important;
                  z-index: 9999 !important;
                }

                html { background: #fff !important; display: block !important; }
                body{
                  margin: 0 !important;
                  padding: 0 !important;
                  box-shadow: none !important;
                  width: 100% !important;
                }  

                @page{
                  margin: 10mm;
                  size: A4 portrait;
                }

                table { page-break-inside: auto !important; }
                tbody.sample-group { break-inside: avoid; page-break-inside: avoid; }
                tr { break-inside: avoid; page-break-inside: avoid; }

                .page-break{
                  display:block;
                  height:0;
                  page-break-before: always;
                  break-before: page;
                }
                .rules-page .rules-header,
                .rules-page .rules-header *{ text-align:center !important; }
                .rules-page .rules-body,
                .rules-page .rules-body p,
                .rules-page .rules-body div,
                .rules-page .rules-body li{
                  text-align: justify !important;
                  text-justify: inter-word;
                }
              }
            `,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function mapOrderDetailResponseToPrintData(resp: any): OrderPrintData {
  const order = resp?.data ?? resp;
  const client: Client | null = order?.client ?? null;

  const firstContact = client?.clientContacts?.[0];

  const contactPerson = order?.contactPerson ?? firstContact?.contactName ?? "";
  const contactPhone = order?.contactPhone ?? firstContact?.contactPhone ?? "";
  const contactIdentity =
    order?.contactIdentity ?? firstContact?.identityId ?? "";
  const reportEmail = order?.reportEmail ?? firstContact?.contactEmail ?? "";

  const contactEmail = order?.contactEmail ?? firstContact?.contactEmail ?? "";
  const contactPosition =
    order?.contactPosition ?? firstContact?.contactPosition ?? "";
  const contactAddress =
    order?.contactAddress ?? firstContact?.contactAddress ?? "";

  const invoice = client?.invoiceInfo;

  return {
    orderId: String(order?.orderId ?? order?.id ?? ""),
    client,

    contactPerson,
    contactPhone,
    contactIdentity,
    reportEmail,

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

    discount: Number(order?.discount ?? 0),
  };
}

function generateSampleRequestHtml(data: OrderPrintData, t: any) {
  let globalStt = 0;

  const rulesItems = t("sampleRequest.rules.items", {
    returnObjects: true,
  }) as string[];

  const rulesListHtml = rulesItems.map((text) => `<li>${text}</li>`).join("");

  const samplesHtml = data.samples
    .map((sample, sampleIdx) => {
      const analyses =
        sample.analyses && sample.analyses.length > 0
          ? sample.analyses
          : [{ parameterName: "", protocolCode: "", id: "dummy" }];

      const rowCount = analyses.length;

      const rowsHtml = analyses
        .map((analysis: any, index: number) => {
          globalStt++;

          const isFirst = index === 0;

          const sampleCell = isFirst
            ? `
              <td rowspan="${rowCount}" style="padding:5px; vertical-align:middle !important;">
                <div style="font-weight:700; margin-bottom:2px;">Tên mẫu: ${
                  sample.sampleName || ""
                }</div>
                <div style="font-size:13px; line-height:1.4;">
                  <div><span style="font-weight:700;">Số lô:</span></div>
                  <div><span style="font-weight:700;">NSX:</span></div>
                  <div><span style="font-weight:700;">HSD:</span></div>
                  <div><span style="font-weight:700;">Nơi SX:</span></div>
                </div>
              </td>
            `
            : "";

          const descCell = isFirst
            ? `
              <td rowspan="${rowCount}" style="padding:5px; vertical-align:middle !important;">
                <span>${t("sample.matrix")}:</span>
                <span style="font-weight:700;">${
                  sample.sampleMatrix || ""
                }</span><br/>
                ${
                  sample.sampleNote
                    ? `<span>${t("sample.desc")}:</span>
                       <span style="font-weight:700;">${
                         sample.sampleNote
                       }</span>`
                    : ""
                }
              </td>
            `
            : "";

          return `
          <tr>
            <td style="text-align:center; padding:5px;">${globalStt}</td>
            ${sampleCell}
            ${descCell}
            <td style="padding:5px;">${analysis.parameterName || ""}</td>
            <td style="padding:5px;">${analysis.protocolCode || ""}</td>
            <td style="padding:5px;"></td>
          </tr>
        `;
        })
        .join("");

      const groupClass =
        sampleIdx === 0 ? "sample-group first-sample-group" : "sample-group";

      return `<tbody class="${groupClass}">${rowsHtml}</tbody>`;
    })
    .join("");

  const headerHtml = `
    <div
      data-doc-header
      class="mceNonEditable"
      contenteditable="false"
      data-mce-contenteditable="false"
      style="margin-bottom: 12px;"
    >
      <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:12px;">
        
        <!-- Left: logo + info -->
        <div style="display:flex; align-items:flex-start; gap:12px; flex: 1;">
          <img
            src="${logoFullUrl}"
            style="height:40px; width:auto; object-fit:contain;"
            draggable="false"
          />
          <div style="font-size:12px; line-height:1.5; color:#0f172a;">
            <div style="font-weight:800;">
              VIỆN NGHIÊN CỨU VÀ PHÁT TRIỂN SẢN PHẨM THIÊN NHIÊN
            </div>
            <div>
              Add: 12 Phùng Khoang 2, P. Đại Mỗ, TP. Hà Nội  -  Tel: 024 355 35 355    Email: cskh@irdop.org
            </div>
          </div>
        </div>
  
        <!-- Right: Title -->
       <div style="flex: 0 0 200px; text-align:right; color:#0f172a;">
          <div style="font-weight:800; font-size:12px; line-height:1.2; white-space:nowrap;">
            ${t("sampleRequest.order")} ${data.orderId}
          </div>
      </div>
      </div>
  
      <div style="border-top:1px solid #cbd5e1; margin-top:8px;"></div>
    </div>
  `;

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
        .page-break{
          display: block;
          height: 0;
          page-break-before: always;
          break-before: page;
        }
      </style>

      ${headerHtml}

     <div style="display:flex; align-items:flex-start; justify-content:space-between; margin-bottom: 6px;">
      <div style="flex:1;"></div>

     <div style="width:100%; margin-bottom: 12px;">
      <div style="text-align:center; font-size:20px; font-weight:800; white-space:nowrap; text-transform:uppercase;">
        ${t("sampleRequest.title")}
      </div>
    </div>
      </div>

      <div class="section">
        <div style="font-size: 15px; font-weight: 700; margin-bottom: 6px;">
            ${t("sampleRequest.section1.title")}
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 6px 0 2px;">
            ${t("sampleRequest.section1.title2")}
        </div>
        <div style="font-size: 12px; font-style: italic; margin: 0 0 8px;">
            ${t("sampleRequest.section1.subtitle")}        
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">  ${t(
              "sampleRequest.clientName"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.client?.clientName || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.address"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.clientAddress || ""
            }</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
            ${t("sampleRequest.section2.title")}
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 40px; row-gap: 4px;">
          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 105px;">${t(
              "sampleRequest.section2.contactPerson"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.contactPerson || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 60px;">${t(
              "sampleRequest.identity"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.contactIdentity || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 105px;">${t(
              "sampleRequest.contactPhone"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.contactPhone || data.client?.clientPhone || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 60px;">${t(
              "sampleRequest.email"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.reportEmail || ""
            }</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
        ${t("sampleRequest.section3.title")}
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 60px;">${t(
              "sampleRequest.address"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.clientAddress || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 60px;">${t(
              "sampleRequest.section3.clientPhone"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.contactPhone || data.client?.clientPhone || ""
            }</span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 60px;">${t(
              "sampleRequest.email"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">${
              data.reportEmail || ""
            }</span>
          </div>
        </div>

        <div style="font-size: 14px; font-weight: 700; margin: 8px 0 4px;">
        ${t("sampleRequest.section4.title")}
        </div>

        <div style="display: flex; flex-direction: column; gap: 4px;">
          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.section4.taxName"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">
              ${data.client?.invoiceInfo?.taxName || ""}
            </span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.address"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">
              ${
                (data.client as any)?.invoiceAddress ||
                data.client?.invoiceInfo?.taxAddress ||
                ""
              }
            </span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.taxId"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">
              ${data.client?.legalId || data.taxCode || ""}
            </span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.section4.contactPhone"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">
              ${data.contactPhone || data.client?.clientPhone || ""}
            </span>
          </div>

          <div style="display: flex; align-items: baseline; font-size: 13px; margin-bottom: 4px;">
            <span class="label-text" style="min-width: 120px;">${t(
              "sampleRequest.email"
            )}</span>
            <span class="field-dotted" style="flex-grow: 1;">
              ${
                (data.client as any)?.invoiceEmail ||
                data.client?.invoiceInfo?.taxEmail ||
                ""
              }
            </span>
          </div>
        </div>
      </div>


      <div class="section">
        <div style="font-size: 13px; margin-top: 8px;">
        ${t("sampleRequest.section4.request")}
        </div>
        <table style="width: 100%; border-collapse: collapse; border: none; margin: 10px 0; table-layout: fixed;">
          <thead>
            <tr>
              <th style="border: 1px solid #1e293b; padding: 8px 8px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 40px;">
                ${t("table.stt")}
              </th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 130px;">
                ${t("sample.name")}(*)</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 140px;">
                ${t("sampleRequest.table.sampleDesc")}(*)</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700;">
                ${t("sampleRequest.table.parameters")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 100px;">
                ${t("table.method")}</th>
              <th style="border: 1px solid #1e293b; padding: 8px 5px; font-size: 11.5px; background-color: #f8fafc; font-weight: 700; width: 70px;">
                ${t("sample.note")}</th>
            </tr>
          </thead>
      ${samplesHtml}

        </table>

        <div style="font-size: 11px; font-style: italic;">
        ${t("sampleRequest.section4.quote")}</div>

        <div class="sign-block">
          <div class="sign-title">${t("sampleRequest.signer.customer")}</div>
          <div class="sign-confirm">${t("sampleRequest.signer.confirm")}</div>
          <div class="sign-space"></div>
        </div>
      <table
        role="presentation"
        cellpadding="0"
        cellspacing="0"
        style="width:100%; border-collapse:collapse; border:0 !important; outline:0 !important; box-shadow:none !important; margin-top:18px;"
      >
        <tr style="border:0 !important;">
          <td
            style="width:55%; vertical-align:top; padding-right:20px; border:0 !important; outline:0 !important;"
          >
            <div style="font-size:12px; font-weight:800; text-transform:uppercase; margin-bottom:6px;">
              ${t(
                "sampleRequest.signer.receiptTitle"
              )} - <span style="font-weight:600; text-transform:none;">${t(
    "sampleRequest.signer.labOnly"
  )}</span>
            </div>

            <div style="font-size:12px; line-height:1.6;">
              <div>${t(
                "sampleRequest.signer.receivedDate"
              )} ..................................................</div>
              <div>${t("sampleRequest.signer.receivedLocation")} &#9633; ${t(
    "sampleRequest.signer.atInstitute"
  )}</div>
              <div>&#9633; ${t(
                "sampleRequest.signer.other"
              )} ....................................................................</div>
              <div>${t("sampleRequest.signer.retention")} &#9633; ${t(
    "sampleRequest.signer.noRetention"
  )}&nbsp;&nbsp;&nbsp;&nbsp;&#9633; ${t(
    "sampleRequest.signer.retainSample"
  )}</div>
            </div>
          </td>

          <td
            style="width:45%; vertical-align:top; padding-left:20px; border:0 !important; outline:0 !important;"
          >
            <div style="font-size:12px; text-align: center; font-weight:800; text-transform:uppercase; margin-bottom:6px;">
             ${t("sampleRequest.signer.receiverTitle")}
            </div>

            <div style="height:70px;"></div>
          </td>
        </tr>
      </table>
      </div>
      </div>
      <div class="page-break"></div>
    <div class="rules-page mceNonEditable" style="font-family:'Inter', sans-serif; color:#1e293b; max-width:794px; margin:0 auto;">
      <div class="rules-header" style="text-align:center">
        <div style="font-weight:800; font-size:16px; text-transform:uppercase;">
          ${t("sampleRequest.rules.header.title")}
        </div>
        <div style="font-size:12px">
          ${t("sampleRequest.rules.header.attached")}
        </div>
        <div style="font-size:12px">
          ${t("sampleRequest.rules.header.archived")}
        </div>
      </div>

      <div class="rules-body">
        <ol class="rules-ol" style="margin: 14px 0 0 18px; padding:0; font-size:14px; line-height:1.6;">
          ${rulesListHtml}
        </ol>

        <div style="margin-top: 14px; margin-bottom: 4px; font-size:12px; line-height:1.6;">
          <div style="font-weight:700;">${t(
            "sampleRequest.rules.contact.title"
          )}</div>
          <div>${t("sampleRequest.rules.contact.orgName")}</div>
          <div>${t("sampleRequest.rules.contact.address")}</div>
          <div>${t("sampleRequest.rules.contact.phone")}</div>
          <div>${t("sampleRequest.rules.contact.email")}</div>
        </div>
      </div>
    </div>
  </div>
  `;
}
