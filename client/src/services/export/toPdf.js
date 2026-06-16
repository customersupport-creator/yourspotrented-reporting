import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

/**
 * WYSIWYG PDF export.
 *
 * Instead of rebuilding a separate, simplified document, this captures the
 * actual rendered report DOM (charts, tables, KPIs, colors, typography — exactly
 * as shown) at high resolution and lays it into a multi-page PDF.
 *
 * Page breaks are "smart": the report marks its components with
 * `data-pdf-block`, and pages are only cut at those component boundaries, so a
 * chart, table, or KPI card is never split across two pages.
 */

const A4 = { w: 595.28, h: 841.89 }; // pt (portrait)
const MARGIN = 18; // pt
const GAP = 6; // pt of breathing room kept below the last block on a page

/**
 * @param {HTMLElement} element  the live report container (#report-capture)
 * @param {Object} [opts]
 * @param {string} [opts.fileName]
 * @param {number} [opts.pixelRatio]  capture scale (default 2 = retina/hi-res)
 */
export async function exportToPdf(element, opts = {}) {
  if (!element) throw new Error('Nothing to export — the report element was not found.');
  const fileName = opts.fileName || 'weekly-report.pdf';
  const pixelRatio = opts.pixelRatio || 2;

  // Make sure web fonts are ready so text isn't missing in the capture.
  if (document.fonts && document.fonts.ready) {
    try {
      await document.fonts.ready;
    } catch {
      /* ignore */
    }
  }

  // Expand any collapsed sections (<details>) so the PDF captures their full
  // content — a WYSIWYG export should include everything, even if collapsed
  // on screen. Restore original state afterward.
  const collapsibles = Array.from(element.querySelectorAll('details'));
  const wasOpen = collapsibles.map((d) => d.open);
  collapsibles.forEach((d) => {
    d.open = true;
  });
  // Let layout settle after expanding before measuring/capturing.
  await new Promise((r) => requestAnimationFrame(() => r()));

  // Full CSS dimensions of the report (including content below the fold).
  const cssWidth = element.scrollWidth;
  const cssHeight = element.scrollHeight;

  const captureOpts = {
    pixelRatio,
    backgroundColor: '#f8fafc', // slate-50, matches the app background
    width: cssWidth,
    height: cssHeight,
    cacheBust: true,
    style: { margin: '0' },
  };

  // html-to-image can produce a blank/partial image on the very first call
  // (SVG charts not yet inlined). Render once to warm up, then capture for real.
  await toCanvas(element, captureOpts);
  const canvas = await toCanvas(element, captureOpts);
  const ratio = canvas.width / cssWidth; // device px per CSS px

  // Collect safe break positions (in CSS px from the top of the report): the
  // bottom edge of every marked block. Cutting at these never splits a block.
  const rootTop = element.getBoundingClientRect().top;
  const blocks = Array.from(element.querySelectorAll('[data-pdf-block]'));
  const breaks = blocks
    .map((b) => b.getBoundingClientRect().bottom - rootTop + element.scrollTop)
    .filter((y) => y > 0 && y <= cssHeight);
  breaks.push(cssHeight);
  const safe = [...new Set(breaks.map((y) => Math.round(y)))].sort((a, b) => a - b);

  // PDF geometry.
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
  const contentW = A4.w - MARGIN * 2;
  const contentH = A4.h - MARGIN * 2;
  const cssToPt = contentW / cssWidth; // scale to fit width
  const cssPageH = contentH / cssToPt; // how many CSS px fit on one page

  let top = 0;
  let first = true;
  // Reused scratch canvas for slicing.
  const slice = document.createElement('canvas');
  const sctx = slice.getContext('2d');

  let guard = 0;
  while (top < cssHeight - 1 && guard++ < 1000) {
    const limit = top + cssPageH;
    // Largest safe break that fits on this page (and makes progress).
    let cut = safe.filter((y) => y > top + 1 && y <= limit).pop();
    if (cut == null) {
      // No block boundary fits — a single block is taller than a page. Force a
      // full-page cut so we keep advancing (rare; only huge blocks).
      cut = Math.min(limit, cssHeight);
    }
    const sliceCssH = cut - top;

    // Copy the corresponding band out of the master canvas.
    slice.width = canvas.width;
    slice.height = Math.max(1, Math.round(sliceCssH * ratio));
    sctx.fillStyle = '#f8fafc';
    sctx.fillRect(0, 0, slice.width, slice.height);
    sctx.drawImage(
      canvas,
      0, Math.round(top * ratio), canvas.width, Math.round(sliceCssH * ratio),
      0, 0, slice.width, slice.height
    );

    if (!first) pdf.addPage();
    first = false;
    // Fill the whole page with the app background so margins blend seamlessly.
    pdf.setFillColor(248, 250, 252); // slate-50
    pdf.rect(0, 0, A4.w, A4.h, 'F');
    const imgH = sliceCssH * cssToPt;
    pdf.addImage(slice.toDataURL('image/png'), 'PNG', MARGIN, MARGIN, contentW, imgH, undefined, 'FAST');

    top = cut + (cut < cssHeight ? GAP * 0 : 0); // continue exactly from the cut
  }

  pdf.save(fileName);

  // Restore each collapsible to its original (collapsed) state.
  collapsibles.forEach((d, i) => {
    d.open = wasOpen[i];
  });
}

export default exportToPdf;
