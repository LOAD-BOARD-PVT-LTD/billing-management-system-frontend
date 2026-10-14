'use client';

import 'regenerator-runtime/runtime';
import fontkit from '@pdf-lib/fontkit';
import { degrees, PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from 'pdf-lib';
import type { SavedBill } from '@/features/billing/model/bill.types';
import { formatReceiptNumberWithFiscalYear } from '@/lib/receipts/receipt-number-display';
import { toNepaliDigits } from '@/utils/numbers';
import { formatAmountInNepaliWords, formatDocumentCount, formatDocumentCurrency } from '@/shared/document-generation/utils/format-currency';
import { DEFAULT_COMPANY_BRANDING } from '@/shared/document-generation/components/CompanyBranding';
import { formatDocumentEnglishDate, formatDocumentNepaliDate, formatDocumentTime } from '@/shared/document-generation/utils/format-date';

const PAGE_WIDTH = 841.89;
const PAGE_HEIGHT = 595.28;
const MARGIN = 32;
const BODY_COLOR = rgb(0.08, 0.08, 0.08);
const LINE_COLOR = rgb(0.12, 0.12, 0.12);
const DEVANAGARI_SCRIPT = /\p{Script=Devanagari}/u;

type ReceiptFonts = {
  nepali: PDFFont;
  nepaliBold: PDFFont;
  latin: PDFFont;
  latinBold: PDFFont;
};

type TextSegment = { text: string; font: PDFFont };

function segments(text: string, fonts: ReceiptFonts, bold = false): TextSegment[] {
  const result: TextSegment[] = [];
  let current = '';
  let devanagari: boolean | null = null;

  for (const character of text) {
    const isDevanagari = DEVANAGARI_SCRIPT.test(character);
    if (devanagari !== null && isDevanagari !== devanagari) {
      result.push({
        text: current,
        font: devanagari ? (bold ? fonts.nepaliBold : fonts.nepali) : (bold ? fonts.latinBold : fonts.latin),
      });
      current = '';
    }
    current += character;
    devanagari = isDevanagari;
  }
  if (current) {
    result.push({
      text: current,
      font: devanagari ? (bold ? fonts.nepaliBold : fonts.nepali) : (bold ? fonts.latinBold : fonts.latin),
    });
  }
  return result;
}

function textWidth(text: string, size: number, fonts: ReceiptFonts, bold = false): number {
  return segments(text, fonts, bold).reduce((width, segment) => width + segment.font.widthOfTextAtSize(segment.text, size), 0);
}

function wrapText(text: string, maxWidth: number, size: number, fonts: ReceiptFonts, bold = false): string[] {
  const words = text.trim().split(/\s+/u).filter(Boolean);
  if (!words.length) return [''];

  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (!line || textWidth(candidate, size, fonts, bold) <= maxWidth) {
      line = candidate;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function drawLineText(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  size: number,
  fonts: ReceiptFonts,
  bold = false,
  color = BODY_COLOR,
): void {
  let cursorX = x;
  for (const segment of segments(text, fonts, bold)) {
    page.drawText(segment.text, {
      x: cursorX,
      y: page.getHeight() - top - size,
      size,
      font: segment.font,
      color,
    });
    cursorX += segment.font.widthOfTextAtSize(segment.text, size);
  }
}

function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  maxWidth: number,
  size: number,
  fonts: ReceiptFonts,
  bold = false,
  color = BODY_COLOR,
): number {
  const lines = wrapText(text, maxWidth, size, fonts, bold);
  lines.forEach((line, index) => drawLineText(page, line, x, top + index * (size + 4), size, fonts, bold, color));
  return lines.length * (size + 4);
}

function drawRightText(page: PDFPage, text: string, rightX: number, top: number, size: number, fonts: ReceiptFonts, bold = false): void {
  drawLineText(page, text, rightX - textWidth(text, size, fonts, bold), top, size, fonts, bold);
}

function drawCenteredText(page: PDFPage, text: string, centerX: number, top: number, size: number, fonts: ReceiptFonts, bold = false, color = BODY_COLOR): void {
  drawLineText(page, text, centerX - textWidth(text, size, fonts, bold) / 2, top, size, fonts, bold, color);
}

async function fetchAsset(path: string, name: string): Promise<Uint8Array> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${name} (${response.status}).`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length) throw new Error(`${name} is empty.`);
  return bytes;
}

async function loadFonts(pdf: PDFDocument): Promise<ReceiptFonts> {
  const [nepali, nepaliBold, latin, latinBold] = await Promise.all([
    fetchAsset('/fonts/noto-sans-devanagari-devanagari-400-normal.woff', 'Nepali font'),
    fetchAsset('/fonts/noto-sans-devanagari-devanagari-700-normal.woff', 'Nepali bold font'),
    fetchAsset('/fonts/noto-sans-devanagari-latin-400-normal.woff', 'Latin font'),
    fetchAsset('/fonts/noto-sans-devanagari-latin-700-normal.woff', 'Latin bold font'),
  ]);
  pdf.registerFontkit(fontkit);
  return {
    nepali: await pdf.embedFont(nepali, { subset: true }),
    nepaliBold: await pdf.embedFont(nepaliBold, { subset: true }),
    latin: await pdf.embedFont(latin, { subset: true }),
    latinBold: await pdf.embedFont(latinBold, { subset: true }),
  };
}

async function loadLogo(pdf: PDFDocument): Promise<PDFImage> {
  const bytes = await fetchAsset('/narayani-logo.jpeg', 'receipt logo');
  return pdf.embedJpg(bytes);
}

function drawRule(page: PDFPage, yFromTop: number, color = LINE_COLOR, thickness = 0.8): void {
  page.drawLine({
    start: { x: MARGIN, y: page.getHeight() - yFromTop },
    end: { x: PAGE_WIDTH - MARGIN, y: page.getHeight() - yFromTop },
    thickness,
    color,
  });
}

function drawLogo(page: PDFPage, logo: PDFImage, x: number, top: number, size: number): void {
  const scale = Math.min(size / logo.width, size / logo.height);
  const width = logo.width * scale;
  const height = logo.height * scale;
  page.drawImage(logo, {
    x: x + (size - width) / 2,
    y: page.getHeight() - top - size + (size - height) / 2,
    width,
    height,
  });
}

function drawCellText(
  page: PDFPage,
  text: string,
  x: number,
  top: number,
  width: number,
  height: number,
  size: number,
  fonts: ReceiptFonts,
  align: 'left' | 'center' | 'right' = 'left',
  bold = false,
): void {
  const lines = wrapText(text, width - 10, size, fonts, bold);
  const lineHeight = size + 3;
  const textHeight = lines.length * lineHeight;
  const verticalOffset = Math.max(3, (height - textHeight) / 2);
  lines.forEach((line, index) => {
    const lineWidth = textWidth(line, size, fonts, bold);
    const textX = align === 'center'
      ? x + (width - lineWidth) / 2
      : align === 'right'
        ? x + width - lineWidth - 6
        : x + 6;
    drawLineText(page, line, textX, top + verticalOffset + index * lineHeight, size, fonts, bold);
  });
}

function drawTableRow(
  page: PDFPage,
  top: number,
  height: number,
  widths: number[],
  values: Array<{ text: string; align?: 'left' | 'center' | 'right'; bold?: boolean }>,
  fonts: ReceiptFonts,
  header = false,
): number {
  let x = MARGIN;
  widths.forEach((width, index) => {
    page.drawRectangle({
      x,
      y: page.getHeight() - top - height,
      width,
      height,
      borderColor: LINE_COLOR,
      borderWidth: 0.6,
    });
    const value = values[index];
    if (value) drawCellText(page, value.text, x, top, width, height, header ? 10 : 9.5, fonts, value.align, header || value.bold);
    x += width;
  });
  return top + height;
}

function receiptLayout(bill: SavedBill, fonts: ReceiptFonts) {
  const innerWidth = PAGE_WIDTH - MARGIN * 2;
  const leftDetailWidth = innerWidth * 0.54;
  const rightDetailWidth = innerWidth - leftDetailWidth;
  const detailRows = [
    [
      `सदस्यको नाम: ${bill.content.vehicle.ownerName || '—'}${bill.content.vehicle.phone ? ` (${bill.content.vehicle.phone})` : ''}`,
      `ठेगाना: ${bill.content.vehicle.address || '—'}`,
      leftDetailWidth,
      rightDetailWidth,
    ],
    [
      `सवारी नं.: ${bill.content.vehicle.vehicleNumber || '—'}${bill.content.vehicle.vehicleType ? ` (${bill.content.vehicle.vehicleType})` : ''}`,
      '',
      innerWidth,
      0,
    ],
    [
      `आर्थिक वर्ष: ${bill.content.fiscalYearName}${bill.content.periodStart || bill.content.periodEnd
        ? ` को लागि मिति ${formatDocumentNepaliDate(bill.content.periodStart)} देखि ${formatDocumentNepaliDate(bill.content.periodEnd)} सम्म`
        : ''}`,
      '',
      innerWidth,
      0,
    ],
  ] as const;

  let top = 158;
  for (const [leftText, rightText, leftWidth, rightWidth] of detailRows) {
    const leftHeight = wrapText(leftText, leftWidth - 12, 10, fonts).length * 14;
    const rightHeight = rightText ? wrapText(rightText, rightWidth - 12, 10, fonts).length * 14 : 0;
    top += Math.max(16, leftHeight, rightHeight) + 3;
  }
  const tableTop = top + 1;
  const widths = [42, innerWidth - 42 - 95 - 95 - 110, 95, 95, 110];
  const itemRows = bill.content.items.map((item) => Math.max(
    23,
    wrapText(item.title, widths[1] - 12, 10, fonts).length * 14 + 8,
  ));
  const tableEnd = tableTop + 22
    + itemRows.reduce((sum, height) => sum + height, 0)
    + (bill.content.discount > 0 ? 23 : 0)
    + 24;
  const noteText = `कैफियत: ${bill.content.note || bill.content.paymentMethod || '—'}`;
  const remarkRows = [
    `अक्षरमा: ${formatAmountInNepaliWords(bill.content.total)}`,
    noteText,
  ].map((text) => Math.max(18, wrapText(text, innerWidth - 12, 9.5, fonts).length * 13 + 4));
  const remarksEnd = tableEnd + remarkRows.reduce((sum, height) => sum + height, 0);
  const signatureTop = Math.max(remarksEnd + 70, PAGE_HEIGHT - 145);
  return { widths, detailRows, tableTop, itemRows, remarkRows, signatureTop, pageHeight: Math.max(PAGE_HEIGHT, signatureTop + 74) };
}

function drawReceipt(
  page: PDFPage,
  bill: SavedBill,
  fonts: ReceiptFonts,
  logo: PDFImage,
  copyNumber: number,
  copyCount: number,
  voided: boolean,
): void {
  const content = bill.content;
  const innerWidth = PAGE_WIDTH - MARGIN * 2;
  const fiscalReceiptNumber = formatReceiptNumberWithFiscalYear(bill.receiptNumber, content.fiscalYearName);
  const layout = receiptLayout(bill, fonts);
  const centerX = PAGE_WIDTH / 2;
  drawLineText(page, `र.नं. ${toNepaliDigits(fiscalReceiptNumber || bill.receiptNumber)}`, MARGIN, 24, 9.5, fonts);
  drawLogo(page, logo, MARGIN + 40, 43, 62);

  const contactX = PAGE_WIDTH - MARGIN - 120;
  const contactWidth = 118;
  drawLineText(page, 'सम्पर्क नम्बरहरू:', contactX, 31, 9, fonts, true);
  const contacts = [content.branch.contactPerson, content.branch.phone, content.branch.address].filter(Boolean);
  contacts.slice(0, 3).forEach((line, index) => drawWrappedText(page, line, contactX, 45 + index * 13, contactWidth, 8.5, fonts));

  const brand = DEFAULT_COMPANY_BRANDING;
  drawCenteredText(page, brand.name, centerX, 22, 19, fonts, true);
  drawCenteredText(page, brand.officeAddress, centerX, 46, 11, fonts, true);
  drawCenteredText(page, brand.regionalOfficeText, centerX, 62, 9.5, fonts);
  drawCenteredText(page, brand.organizationPurpose, centerX, 78, 11, fonts);
  drawCenteredText(page, 'नगदी रसिद', centerX, 96, 14, fonts, true);
  drawRule(page, 120, LINE_COLOR, 1);

  const receiptRowTop = 126;
  const branchLabel = `शाखा: ${content.branch.name || '—'}${content.branch.BranchCode ? ` (${content.branch.BranchCode})` : ''}`;
  const receiptDate = `मिति ${formatDocumentNepaliDate(content.billingDate)}`;
  drawLineText(page, branchLabel, MARGIN + 8, receiptRowTop, 10, fonts, true);
  if (brand.panNumber) drawCenteredText(page, `PAN नं. ${toNepaliDigits(brand.panNumber)}`, centerX, receiptRowTop, 9.5, fonts, true);
  drawRightText(page, receiptDate, PAGE_WIDTH - MARGIN - 8, receiptRowTop, 10, fonts);
  drawRule(page, 147, LINE_COLOR, 0.8);

  let detailTop = 157;
  for (const [leftText, rightText, leftWidth, rightWidth] of layout.detailRows) {
    drawWrappedText(page, leftText, MARGIN + 10, detailTop, leftWidth - 20, 10, fonts);
    if (rightText) drawWrappedText(page, rightText, MARGIN + leftWidth + 4, detailTop, rightWidth - 10, 10, fonts);
    const leftHeight = wrapText(leftText, leftWidth - 20, 10, fonts).length * 14;
    const rightHeight = rightText ? wrapText(rightText, rightWidth - 10, 10, fonts).length * 14 : 0;
    detailTop += Math.max(16, leftHeight, rightHeight) + 3;
  }

  const labels = ['सि.नं.', 'रसिद विवरण', 'रकम दर', 'जम्मा रकम', 'कैफियत'];
  let top = layout.tableTop;
  top = drawTableRow(page, top, 22, layout.widths, labels.map((text) => ({
    text,
    align: 'center',
  })), fonts, true);

  content.items.forEach((item, index) => {
    const rowHeight = layout.itemRows[index];
    top = drawTableRow(page, top, rowHeight, layout.widths, [
      { text: formatDocumentCount(index + 1), align: 'center' },
      { text: item.title },
      { text: formatDocumentCurrency(item.amount), align: 'right' },
      { text: formatDocumentCurrency(item.amount), align: 'right' },
      { text: '' },
    ], fonts);
  });

  if (content.discount > 0) {
    top = drawTableRow(page, top, 23, layout.widths, [
      { text: 'छुट:', align: 'center' },
      { text: '' },
      { text: `-${formatDocumentCurrency(content.discount)}`, align: 'right' },
      { text: `-${formatDocumentCurrency(content.discount)}`, align: 'right' },
      { text: '' },
    ], fonts);
  }
  top = drawTableRow(page, top, 24, layout.widths, [
    { text: '' },
    { text: '' },
    { text: 'जम्मा रु.', align: 'right', bold: true },
    { text: formatDocumentCurrency(content.total), align: 'right', bold: true },
    { text: `प्रतिलिपि ${toNepaliDigits(String(copyNumber))}`, align: 'center', bold: copyCount > 1 },
  ], fonts);

  const remarks = [
    `अक्षरमा: ${formatAmountInNepaliWords(content.total)}`,
    `कैफियत: ${content.note || content.paymentMethod || '—'}`,
  ];
  remarks.forEach((text, index) => {
    const height = layout.remarkRows[index];
    page.drawRectangle({
      x: MARGIN,
      y: page.getHeight() - top - height,
      width: innerWidth,
      height,
      borderColor: LINE_COLOR,
      borderWidth: 0.6,
    });
    drawCellText(page, text, MARGIN, top, innerWidth, height, 9.5, fonts);
    top += height;
  });

  const signatureY = page.getHeight() - layout.signatureTop - 10;
  const signatureWidth = 92;
  const rightSignatureX = PAGE_WIDTH - MARGIN - signatureWidth;
  page.drawLine({ start: { x: MARGIN + 10, y: signatureY }, end: { x: MARGIN + 10 + signatureWidth, y: signatureY }, thickness: 0.7, color: LINE_COLOR });
  page.drawLine({ start: { x: rightSignatureX, y: signatureY }, end: { x: rightSignatureX + signatureWidth, y: signatureY }, thickness: 0.7, color: LINE_COLOR });
  drawLineText(page, 'बुझाउनेको सही', MARGIN + 10, layout.signatureTop, 10, fonts, true);
  drawRightText(page, 'बुझिलिनेको सही', PAGE_WIDTH - MARGIN - 10, layout.signatureTop, 10, fonts, true);
  drawLineText(page, formatDocumentEnglishDate(bill.createdAt.slice(0, 10)), MARGIN + 10, layout.signatureTop + 18, 8.5, fonts);
  drawCenteredText(page, formatDocumentTime(bill.createdAt), centerX, layout.signatureTop + 18, 9, fonts);
  drawRightText(page, content.branch.contactPerson || content.branch.name || '—', PAGE_WIDTH - MARGIN - 10, layout.signatureTop + 18, 8.5, fonts);
  if (voided) {
    const watermark = 'रद्द';
    const watermarkSize = 72;
    page.drawText(watermark, {
      x: centerX - fonts.nepali.widthOfTextAtSize(watermark, watermarkSize) / 2,
      y: page.getHeight() - layout.tableTop - 108,
      size: watermarkSize,
      font: fonts.nepali,
      color: rgb(0.68, 0.68, 0.68),
      opacity: 0.55,
      rotate: degrees(-25),
    });
  }
}

export async function createReceiptPdfBlob(
  bill: SavedBill,
  copies: number,
  options: { voided?: boolean } = {},
): Promise<Blob> {
  const copyCount = Math.max(1, Math.min(5, Math.floor(copies)));
  if (!bill.id || !bill.receiptNumber || !bill.content.items.length) {
    throw new Error('रसिद PDF बनाउन आवश्यक विवरण उपलब्ध छैन।');
  }

  const pdf = await PDFDocument.create();
  const fonts = await loadFonts(pdf);
  const logo = await loadLogo(pdf);
  const layout = receiptLayout(bill, fonts);
  for (let copy = 0; copy < copyCount; copy += 1) {
    const page = pdf.addPage([PAGE_WIDTH, layout.pageHeight]);
    drawReceipt(page, bill, fonts, logo, copy + 1, copyCount, options.voided === true);
  }

  const bytes = await pdf.save();
  if (bytes.length < 8 || String.fromCharCode(...bytes.slice(0, 5)) !== '%PDF-') {
    throw new Error('Receipt PDF generation returned an invalid PDF document.');
  }
  const pdfBytes = new ArrayBuffer(bytes.length);
  new Uint8Array(pdfBytes).set(bytes);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}
