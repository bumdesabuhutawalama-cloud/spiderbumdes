import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Export a DOM element to a downloadable PDF file (A4 portrait).
 *
 * Strategy:
 * - Clone the element off-screen at a fixed A4 content width so the report
 *   fills the page (no large empty areas) and looks consistent regardless
 *   of the user's viewport.
 * - Inject a print stylesheet that enlarges fonts, normalises spacing and
 *   gives tables a clean financial-report look.
 * - Render at high scale (3x) for sharp output, then paginate across A4
 *   pages with small proportional margins.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  // A4 portrait content width target in CSS pixels (~ 1000px ≈ 190mm @ ~134dpi)
  const RENDER_WIDTH_PX = 1000;

  // Build an off-screen sandbox so the source UI is untouched.
  const sandbox = document.createElement("div");
  sandbox.style.position = "fixed";
  sandbox.style.left = "-10000px";
  sandbox.style.top = "0";
  sandbox.style.width = `${RENDER_WIDTH_PX}px`;
  sandbox.style.background = "#ffffff";
  sandbox.style.zIndex = "-1";
  sandbox.setAttribute("data-pdf-export-root", "true");

  // Print stylesheet — scoped via the data attribute on the sandbox root.
  const style = document.createElement("style");
  style.textContent = `
    [data-pdf-export-root] {
      font-family: "Inter", "Helvetica Neue", Arial, sans-serif;
      color: #111827;
      background: #ffffff;
    }
    [data-pdf-export-root] .pdf-export-target {
      width: 100% !important;
      max-width: 100% !important;
      min-width: 0 !important;
      margin: 0 !important;
      padding: 24px 28px !important;
      box-shadow: none !important;
      border: none !important;
      background: #ffffff !important;
      color: #111827 !important;
      border-radius: 0 !important;
      overflow: visible !important;
    }
    [data-pdf-export-root] .pdf-export-target * {
      box-shadow: none !important;
      text-shadow: none !important;
    }
    [data-pdf-export-root] table {
      width: 100% !important;
      border-collapse: collapse !important;
      font-size: 13px !important;
      line-height: 1.5 !important;
      table-layout: auto !important;
    }
    [data-pdf-export-root] thead tr {
      background: #f3f4f6 !important;
      color: #111827 !important;
    }
    [data-pdf-export-root] thead th {
      font-weight: 600 !important;
      font-size: 12px !important;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 10px 12px !important;
      border-top: 2px solid #111827 !important;
      border-bottom: 2px solid #111827 !important;
      color: #111827 !important;
    }
    [data-pdf-export-root] tbody td {
      padding: 8px 12px !important;
      border-bottom: 1px solid #e5e7eb !important;
      vertical-align: top;
      color: #111827 !important;
    }
    [data-pdf-export-root] tbody tr:nth-child(even) td {
      background: #fafafa !important;
    }
    [data-pdf-export-root] tfoot td,
    [data-pdf-export-root] .pdf-total-row td {
      font-weight: 700 !important;
      border-top: 2px solid #111827 !important;
      border-bottom: 2px solid #111827 !important;
      background: #f3f4f6 !important;
    }
    [data-pdf-export-root] h1,
    [data-pdf-export-root] h2,
    [data-pdf-export-root] h3 {
      color: #111827 !important;
      letter-spacing: 0.02em;
    }
    [data-pdf-export-root] .pdf-report-header {
      text-align: center;
      margin-bottom: 18px !important;
      padding-bottom: 12px !important;
      border-bottom: 2px solid #111827 !important;
    }
    [data-pdf-export-root] .pdf-report-header p {
      margin: 2px 0 !important;
    }
    /* Hide on-screen-only chrome inside the report */
    [data-pdf-export-root] [data-pdf-hide="true"] { display: none !important; }
  `;

  // Deep clone the report element so we can mutate freely.
  const clone = element.cloneNode(true) as HTMLElement;
  clone.classList.add("pdf-export-target");

  // Force any inner scroll containers to expand fully.
  clone.querySelectorAll<HTMLElement>("*").forEach((el) => {
    if (el.style) {
      if (el.style.maxHeight) el.style.maxHeight = "none";
      if (el.style.overflow) el.style.overflow = "visible";
    }
  });

  sandbox.appendChild(style);
  sandbox.appendChild(clone);
  document.body.appendChild(sandbox);

  try {
    // Wait a tick so fonts/layout settle.
    await new Promise((r) => requestAnimationFrame(() => r(null)));

    const canvas = await html2canvas(clone, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
      windowWidth: RENDER_WIDTH_PX,
    });

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth(); // 210
    const pageHeight = pdf.internal.pageSize.getHeight(); // 297
    const margin = 8; // mm — tight, professional
    const contentWidth = pageWidth - margin * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    if (imgHeight <= pageHeight - margin * 2) {
      const imgData = canvas.toDataURL("image/png");
      pdf.addImage(imgData, "PNG", margin, margin, contentWidth, imgHeight, undefined, "FAST");
    } else {
      const pageContentHeightPx = ((pageHeight - margin * 2) * canvas.width) / contentWidth;
      let renderedPx = 0;
      let isFirst = true;

      while (renderedPx < canvas.height) {
        const sliceHeightPx = Math.min(pageContentHeightPx, canvas.height - renderedPx);
        const sliceCanvas = document.createElement("canvas");
        sliceCanvas.width = canvas.width;
        sliceCanvas.height = sliceHeightPx;
        const ctx = sliceCanvas.getContext("2d");
        if (!ctx) break;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          renderedPx,
          canvas.width,
          sliceHeightPx,
          0,
          0,
          canvas.width,
          sliceHeightPx,
        );
        const sliceData = sliceCanvas.toDataURL("image/png");
        const sliceMm = (sliceHeightPx * contentWidth) / canvas.width;
        if (!isFirst) pdf.addPage();
        pdf.addImage(sliceData, "PNG", margin, margin, contentWidth, sliceMm, undefined, "FAST");
        isFirst = false;
        renderedPx += sliceHeightPx;
      }
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
  } finally {
    document.body.removeChild(sandbox);
  }
}

export function buildReportFilename(base: string, suffix?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}${suffix ? `-${suffix}` : ""}-${stamp}.pdf`;
}
