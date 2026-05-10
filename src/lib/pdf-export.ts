import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

/**
 * Export a DOM element to a downloadable PDF file (A4).
 * Renders with html2canvas-pro (supports modern oklch colors), then paginates
 * the resulting bitmap across A4 pages.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
    logging: false,
  });

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 10;
  const contentWidth = pageWidth - margin * 2;
  const imgHeight = (canvas.height * contentWidth) / canvas.width;

  const imgData = canvas.toDataURL("image/png");

  if (imgHeight <= pageHeight - margin * 2) {
    pdf.addImage(imgData, "PNG", margin, margin, contentWidth, imgHeight);
  } else {
    // Slice canvas into page-sized chunks
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
      pdf.addImage(sliceData, "PNG", margin, margin, contentWidth, sliceMm);
      isFirst = false;
      renderedPx += sliceHeightPx;
    }
  }

  pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

export function buildReportFilename(base: string, suffix?: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const slug = base
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  return `${slug}${suffix ? `-${suffix}` : ""}-${stamp}.pdf`;
}
