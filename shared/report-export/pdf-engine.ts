import fontkit from '@pdf-lib/fontkit';
import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from 'pdf-lib';
import { fontasyFromUnicode } from '@/utils/fontasy-himali/fromUnicode';
import type {
  ReportAssetLoader,
  ReportCellAlign,
  ReportExportColumn,
  ReportExportTemplate,
  ReportSummaryBox,
} from './types';

const A4_SHORT = 595.28;
const A4_LONG = 841.89;
const MARGIN_X = 24;
const MARGIN_TOP = 26;
const MARGIN_BOTTOM = 26;
const HEADER_FILL = rgb(0.87, 0.91, 0.95);
const BORDER_COLOR = rgb(0.22, 0.26, 0.31);
const TEXT_COLOR = rgb(0.08, 0.08, 0.08);
const MUTED_TEXT_COLOR = rgb(0.28, 0.32, 0.36);
// Include full Devanagari block (U+0900–U+097F, including Danda `।` U+0964 and Double Danda `॥` U+0965) plus ZWJ/ZWNJ.
const DEVANAGARI_CHAR = /[\u0900-\u097F\u200C\u200D]/u;

type ReportFonts = {
  nepali: PDFFont;
  latin: PDFFont;
  latinBold: PDFFont;
};

type TextSegment = { text: string; font: PDFFont };

function sanitizeLatinForWinAnsi(text: string): string {
  return text
    .replace(/\u00A0/gu, ' ')
    .replace(/[\u2013\u2014]/gu, '-')
    .replace(/[\u2018\u2019]/gu, "'")
    .replace(/[\u201C\u201D]/gu, '"')
    .replace(/\u2026/gu, '...')
    .replace(/\u20B9/gu, 'Rs.')
    .replace(/[\u200B-\u200F\uFEFF]/gu, '')
    .replace(/[^\x20-\x7E\xA0-\xFF]/gu, '-');
}

function splitSegments(text: string, fonts: ReportFonts, bold = false): TextSegment[] {
  const result: TextSegment[] = [];
  let current = '';
  let isCurrentDevanagari: boolean | null = null;

  for (const ch of text) {
    const isDevanagari = DEVANAGARI_CHAR.test(ch);
    if (isCurrentDevanagari !== null && isDevanagari !== isCurrentDevanagari) {
      result.push({
        text: isCurrentDevanagari ? fontasyFromUnicode(current) : sanitizeLatinForWinAnsi(current),
        font: isCurrentDevanagari ? fonts.nepali : (bold ? fonts.latinBold : fonts.latin),
      });
      current = '';
    }
    current += ch;
    isCurrentDevanagari = isDevanagari;
  }

  if (current) {
    result.push({
      text: isCurrentDevanagari ? fontasyFromUnicode(current) : sanitizeLatinForWinAnsi(current),
      font: isCurrentDevanagari ? fonts.nepali : (bold ? fonts.latinBold : fonts.latin),
    });
  }
  return result;
}

function measureText(text: string, size: number, fonts: ReportFonts, bold = false): number {
  if (!text) return 0;
  return splitSegments(text, fonts, bold).reduce(
    (sum, segment) => sum + segment.font.widthOfTextAtSize(segment.text, size),
    0,
  );
}

function breakLongToken(token: string, maxWidth: number, size: number, fonts: ReportFonts, bold: boolean): string[] {
  if (measureText(token, size, fonts, bold) <= maxWidth) return [token];
  // Prefer breaking after hyphens when possible (e.g. PROVINCE-2-03-001-KHA-0522).
  if (token.includes('-')) {
    const parts = token.split(/(?<=-)/u);
    const lines: string[] = [];
    let current = '';
    for (const part of parts) {
      const candidate = `${current}${part}`;
      if (!current || measureText(candidate, size, fonts, bold) <= maxWidth) {
        current = candidate;
      } else {
        lines.push(current);
        current = part;
      }
    }
    if (current) lines.push(current);
    if (lines.every((line) => measureText(line, size, fonts, bold) <= maxWidth)) {
      return lines;
    }
  }

  const lines: string[] = [];
  let current = '';
  for (const ch of token) {
    const candidate = `${current}${ch}`;
    if (!current || measureText(candidate, size, fonts, bold) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function wrapSingleLine(text: string, maxWidth: number, size: number, fonts: ReportFonts, bold = false): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [''];
  const effectiveMax = Math.max(12, maxWidth);
  const words = trimmed.split(/\s+/u).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current) {
      if (measureText(word, size, fonts, bold) <= effectiveMax) {
        current = word;
      } else {
        const broken = breakLongToken(word, effectiveMax, size, fonts, bold);
        lines.push(...broken.slice(0, -1));
        current = broken[broken.length - 1] ?? '';
      }
      continue;
    }

    if (measureText(candidate, size, fonts, bold) <= effectiveMax) {
      current = candidate;
    } else {
      lines.push(current);
      if (measureText(word, size, fonts, bold) <= effectiveMax) {
        current = word;
      } else {
        const broken = breakLongToken(word, effectiveMax, size, fonts, bold);
        lines.push(...broken.slice(0, -1));
        current = broken[broken.length - 1] ?? '';
      }
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function wrapCellValue(
  value: string | string[],
  maxWidth: number,
  size: number,
  fonts: ReportFonts,
  bold = false,
): string[] {
  const rawLines = Array.isArray(value)
    ? value.flatMap((line) => String(line ?? '').split(/\r?\n/u))
    : String(value ?? '').split(/\r?\n/u);
  const wrapped: string[] = [];
  for (const raw of rawLines) {
    wrapped.push(...wrapSingleLine(raw, maxWidth, size, fonts, bold));
  }
  return wrapped.length ? wrapped : [''];
}

function drawTextLine(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  size: number,
  fonts: ReportFonts,
  bold = false,
  color = TEXT_COLOR,
): void {
  let cursorX = x;
  const baselineY = page.getHeight() - top - size;
  for (const segment of splitSegments(text, fonts, bold)) {
    page.drawText(segment.text, {
      x: cursorX,
      y: baselineY,
      size,
      font: segment.font,
      color,
    });
    cursorX += segment.font.widthOfTextAtSize(segment.text, size);
  }
}

function drawAlignedCell(
  page: PDFPage,
  lines: string[],
  x: number,
  top: number,
  width: number,
  height: number,
  size: number,
  lineHeight: number,
  fonts: ReportFonts,
  align: ReportCellAlign = 'left',
  bold = false,
  verticalCenter = false,
  fill?: ReturnType<typeof rgb>,
): void {
  const bottomY = page.getHeight() - top - height;
  page.drawRectangle({
    x,
    y: bottomY,
    width,
    height,
    color: fill,
    borderColor: BORDER_COLOR,
    borderWidth: 0.5,
  });

  const padX = 3.5;
  const textBlockHeight = lines.length * lineHeight;
  const startTop = verticalCenter
    ? top + Math.max(3, (height - textBlockHeight) / 2)
    : top + 3.5;

  lines.forEach((line, index) => {
    const lineWidth = measureText(line, size, fonts, bold);
    const textX = align === 'center'
      ? x + Math.max(padX, (width - lineWidth) / 2)
      : align === 'right'
        ? x + Math.max(padX, width - lineWidth - padX)
        : x + padX;
    drawTextLine(page, line, textX, startTop + index * lineHeight, size, fonts, bold);
  });
}

async function fetchBrowserAsset(assetPath: string, name: string): Promise<Uint8Array> {
  const response = await fetch(assetPath);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`${name} is empty.`);
  return bytes;
}

async function loadFonts(pdf: PDFDocument, loadAsset: ReportAssetLoader): Promise<ReportFonts> {
  const fontasy = await loadAsset('/fonts/Fontasy_Himali_TT.ttf', 'Fontasy Nepali font');
  pdf.registerFontkit(fontkit);
  const nepali = await pdf.embedFont(fontasy, { subset: true });
  return {
    nepali,
    latin: await pdf.embedFont(StandardFonts.Helvetica),
    latinBold: await pdf.embedFont(StandardFonts.HelveticaBold),
  };
}

function normalizeColumnWidths<TRow>(columns: ReportExportColumn<TRow>[], totalWidth: number): number[] {
  const totalWeight = columns.reduce((sum, col) => sum + Math.max(1, col.width), 0);
  const widths = columns.map((col) => (Math.max(1, col.width) / totalWeight) * totalWidth);
  const sum = widths.reduce((acc, w) => acc + w, 0);
  if (widths.length > 0 && Math.abs(sum - totalWidth) > 0.01) {
    widths[widths.length - 1] += totalWidth - sum;
  }
  return widths;
}

interface HeaderGroupSpan {
  label: string;
  startIndex: number;
  span: number;
}

function computeHeaderGroups<TRow>(columns: ReportExportColumn<TRow>[]): HeaderGroupSpan[] | null {
  if (!columns.some((col) => col.group)) return null;
  const groups: HeaderGroupSpan[] = [];
  let index = 0;
  while (index < columns.length) {
    const groupLabel = columns[index].group ?? '';
    let span = 1;
    if (groupLabel) {
      while (index + span < columns.length && columns[index + span].group === groupLabel) {
        span += 1;
      }
    }
    groups.push({ label: groupLabel, startIndex: index, span });
    index += span;
  }
  return groups;
}

function drawFirstPageBanner<TRow>(
  page: PDFPage,
  template: ReportExportTemplate<TRow>,
  pageWidth: number,
  fonts: ReportFonts,
): number {
  const { header } = template;
  const centerX = pageWidth / 2;
  let top = MARGIN_TOP;

  if (template.includeHeader !== false) {
    if (header.organizationName) {
      const orgWidth = measureText(header.organizationName, 14, fonts, true);
      drawTextLine(page, header.organizationName, centerX - orgWidth / 2, top, 14, fonts, true);
      top += 17;
    }
    if (header.subtitle) {
      const subWidth = measureText(header.subtitle, 9.5, fonts, false);
      drawTextLine(page, header.subtitle, centerX - subWidth / 2, top, 9.5, fonts, false, MUTED_TEXT_COLOR);
      top += 13;
    }
    if (header.title) {
      const titleWidth = measureText(header.title, 12, fonts, true);
      drawTextLine(page, header.title, centerX - titleWidth / 2, top, 12, fonts, true);
      top += 16;
    }
    if (header.leftMeta || header.rightMeta) {
      if (header.leftMeta) {
        drawTextLine(page, header.leftMeta, MARGIN_X, top, 8.5, fonts, false, MUTED_TEXT_COLOR);
      }
      if (header.rightMeta) {
        const rightWidth = measureText(header.rightMeta, 8.5, fonts, false);
        drawTextLine(page, header.rightMeta, pageWidth - MARGIN_X - rightWidth, top, 8.5, fonts, false, MUTED_TEXT_COLOR);
      }
      top += 14;
    }
  } else if (header.title) {
    const titleWidth = measureText(header.title, 12, fonts, true);
    drawTextLine(page, header.title, centerX - titleWidth / 2, top, 12, fonts, true);
    top += 16;
  }

  if (header.metaPairs?.length) {
    const innerWidth = pageWidth - MARGIN_X * 2;
    const colsPerRow = 3;
    const cellW = innerWidth / colsPerRow;
    const cellH = 16;
    for (let i = 0; i < header.metaPairs.length; i += colsPerRow) {
      const slice = header.metaPairs.slice(i, i + colsPerRow);
      slice.forEach((pair, colIndex) => {
        const text = `${pair.label}: ${pair.value || '—'}`;
        const lines = wrapSingleLine(text, cellW - 8, 8, fonts, false);
        drawAlignedCell(
          page,
          [lines[0] ?? text],
          MARGIN_X + colIndex * cellW,
          top,
          cellW,
          cellH,
          8,
          10,
          fonts,
          'left',
          false,
          true,
          rgb(0.96, 0.97, 0.99),
        );
      });
      top += cellH;
    }
    top += 6;
  }

  return top + 2;
}

function drawContinuationHeader<TRow>(
  page: PDFPage,
  template: ReportExportTemplate<TRow>,
  fonts: ReportFonts,
): number {
  const { header } = template;
  const line = header.continuationLine
    || [header.organizationName, header.title, header.rightMeta].filter(Boolean).join(' | ');
  if (line) {
    drawTextLine(page, line, MARGIN_X, MARGIN_TOP, 8, fonts, false, MUTED_TEXT_COLOR);
    return MARGIN_TOP + 13;
  }
  return MARGIN_TOP;
}

function drawTableHeader<TRow>(
  page: PDFPage,
  top: number,
  columns: ReportExportColumn<TRow>[],
  widths: number[],
  groups: HeaderGroupSpan[] | null,
  fonts: ReportFonts,
): number {
  const headerFontSize = 8;
  const lineHeight = 10;
  let currentTop = top;

  if (groups) {
    const groupRowHeight = 16;
    let x = MARGIN_X;
    for (const group of groups) {
      const spanWidth = widths.slice(group.startIndex, group.startIndex + group.span).reduce((a, b) => a + b, 0);
      drawAlignedCell(
        page,
        group.label ? [group.label] : [''],
        x,
        currentTop,
        spanWidth,
        groupRowHeight,
        headerFontSize,
        lineHeight,
        fonts,
        'center',
        true,
        true,
        HEADER_FILL,
      );
      x += spanWidth;
    }
    currentTop += groupRowHeight;
  }

  const wrappedLabels = columns.map((col, idx) => wrapSingleLine(col.label, widths[idx] - 7, headerFontSize, fonts, true));
  const maxLines = Math.max(1, ...wrappedLabels.map((lines) => lines.length));
  const subHeaderHeight = Math.max(19, maxLines * lineHeight + 7);

  let x = MARGIN_X;
  columns.forEach((col, idx) => {
    drawAlignedCell(
      page,
      wrappedLabels[idx],
      x,
      currentTop,
      widths[idx],
      subHeaderHeight,
      headerFontSize,
      lineHeight,
      fonts,
      'center',
      true,
      true,
      HEADER_FILL,
    );
    x += widths[idx];
  });

  return currentTop + subHeaderHeight;
}

function drawSummaryFooter(
  page: PDFPage,
  top: number,
  summaryBoxes: ReportSummaryBox[],
  innerWidth: number,
  fonts: ReportFonts,
): number {
  const totalWeight = summaryBoxes.reduce((sum, box) => sum + Math.max(1, box.widthWeight ?? 1), 0);
  const boxHeight = 34;
  let x = MARGIN_X;

  summaryBoxes.forEach((box) => {
    const width = (Math.max(1, box.widthWeight ?? 1) / totalWeight) * innerWidth;
    const lines = box.value !== undefined ? [box.label, box.value] : [box.label];
    drawAlignedCell(
      page,
      lines,
      x,
      top,
      width,
      boxHeight,
      8.5,
      12.5,
      fonts,
      'center',
      true,
      true,
      HEADER_FILL,
    );
    x += width;
  });

  return top + boxHeight;
}

export async function generateReportPdfBytes<TRow>(
  template: ReportExportTemplate<TRow>,
  rows: TRow[],
  options: { loadAsset?: ReportAssetLoader } = {},
): Promise<Uint8Array> {
  const orientation = template.orientation ?? 'landscape';
  const pageWidth = orientation === 'landscape' ? A4_LONG : A4_SHORT;
  const pageHeight = orientation === 'landscape' ? A4_SHORT : A4_LONG;
  const innerWidth = pageWidth - MARGIN_X * 2;
  const maxBottomY = pageHeight - MARGIN_BOTTOM;

  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf, options.loadAsset ?? fetchBrowserAsset);
  const widths = normalizeColumnWidths(template.columns, innerWidth);
  const groups = computeHeaderGroups(template.columns);

  const cellFontSize = 7.6;
  const cellLineHeight = 10;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let top = drawFirstPageBanner(page, template, pageWidth, fonts);
  top = drawTableHeader(page, top, template.columns, widths, groups, fonts);

  if (rows.length === 0) {
    drawAlignedCell(
      page,
      [template.emptyMessage || 'कुनै विवरण भेटिएन।'],
      MARGIN_X,
      top,
      innerWidth,
      24,
      8.5,
      11,
      fonts,
      'center',
      false,
      true,
    );
    top += 24;
  } else {
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      const row = rows[rowIndex];
      const cellLines = template.columns.map((col, colIdx) => {
        const raw = col.pdfValue(row, rowIndex);
        return wrapCellValue(raw, widths[colIdx] - 7, cellFontSize, fonts, false);
      });
      const maxLines = Math.max(1, ...cellLines.map((lines) => lines.length));
      const rowHeight = Math.max(16, maxLines * cellLineHeight + 6);

      if (top + rowHeight > maxBottomY) {
        page = pdf.addPage([pageWidth, pageHeight]);
        top = drawContinuationHeader(page, template, fonts);
        top = drawTableHeader(page, top, template.columns, widths, groups, fonts);
      }

      let x = MARGIN_X;
      template.columns.forEach((col, colIdx) => {
        drawAlignedCell(
          page,
          cellLines[colIdx],
          x,
          top,
          widths[colIdx],
          rowHeight,
          cellFontSize,
          cellLineHeight,
          fonts,
          col.align ?? 'left',
          false,
          false,
        );
        x += widths[colIdx];
      });
      top += rowHeight;
    }
  }

  const summaryBoxes = template.summaryFooter?.(rows) ?? [];
  if (summaryBoxes.length > 0) {
    const summaryHeight = 42;
    if (top + summaryHeight > maxBottomY) {
      page = pdf.addPage([pageWidth, pageHeight]);
      top = drawContinuationHeader(page, template, fonts);
    } else {
      top += 8;
    }
    drawSummaryFooter(page, top, summaryBoxes, innerWidth, fonts);
  }

  const bytes = await pdf.save();
  if (bytes.length < 8 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('Report PDF generation returned an invalid PDF document.');
  }
  return bytes;
}

export async function exportReportPdf<TRow>(
  template: ReportExportTemplate<TRow>,
  rows: TRow[],
  options: { openInNewTab?: boolean; loadAsset?: ReportAssetLoader } = {},
): Promise<void> {
  const bytes = await generateReportPdfBytes(template, rows, { loadAsset: options.loadAsset });
  const copy = new ArrayBuffer(bytes.length);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  if (options.openInNewTab) {
    const tab = window.open(url, '_blank', 'noopener,noreferrer');
    if (!tab) {
      const link = document.createElement('a');
      link.href = url;
      link.download = `${template.filename}.pdf`;
      link.click();
    }
  } else {
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.filename}.pdf`;
    link.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
