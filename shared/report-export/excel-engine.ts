import type { ReportExportColumn, ReportExportTemplate } from './types';

const encoder = new TextEncoder();

// Standard IEEE 802.3 CRC32 table for ZIP archive entries.
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) {
    crc = CRC_TABLE[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function buildZipStore(entries: Array<{ name: string; content: Uint8Array }>): Uint8Array {
  const localChunks: Uint8Array[] = [];
  const centralChunks: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const data = entry.content;
    const crc = crc32(data);

    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const lv = new DataView(localHeader);
    lv.setUint32(0, 0x04034b50, true);
    lv.setUint16(4, 20, true);
    lv.setUint16(6, 0, true);
    lv.setUint16(8, 0, true); // STORE
    lv.setUint16(10, 0, true);
    lv.setUint16(12, 0, true);
    lv.setUint32(14, crc, true);
    lv.setUint32(18, data.length, true);
    lv.setUint32(22, data.length, true);
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);
    new Uint8Array(localHeader, 30).set(nameBytes);

    const localBytes = new Uint8Array(localHeader);
    localChunks.push(localBytes, data);

    const centralHeader = new ArrayBuffer(46 + nameBytes.length);
    const cv = new DataView(centralHeader);
    cv.setUint32(0, 0x02014b50, true);
    cv.setUint16(4, 20, true);
    cv.setUint16(6, 20, true);
    cv.setUint16(8, 0, true);
    cv.setUint16(10, 0, true);
    cv.setUint16(12, 0, true);
    cv.setUint16(14, 0, true);
    cv.setUint32(16, crc, true);
    cv.setUint32(20, data.length, true);
    cv.setUint32(24, data.length, true);
    cv.setUint16(28, nameBytes.length, true);
    cv.setUint16(30, 0, true);
    cv.setUint16(32, 0, true);
    cv.setUint16(34, 0, true);
    cv.setUint16(36, 0, true);
    cv.setUint32(38, 0, true);
    cv.setUint32(42, offset, true);
    new Uint8Array(centralHeader, 46).set(nameBytes);

    centralChunks.push(new Uint8Array(centralHeader));
    offset += localBytes.length + data.length;
  }

  const centralSize = centralChunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const eocd = new ArrayBuffer(22);
  const ev = new DataView(eocd);
  ev.setUint32(0, 0x06054b50, true);
  ev.setUint16(4, 0, true);
  ev.setUint16(6, 0, true);
  ev.setUint16(8, entries.length, true);
  ev.setUint16(10, entries.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);
  ev.setUint16(20, 0, true);

  const totalSize = offset + centralSize + 22;
  const output = new Uint8Array(totalSize);
  let cursor = 0;
  for (const chunk of localChunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  for (const chunk of centralChunks) {
    output.set(chunk, cursor);
    cursor += chunk.length;
  }
  output.set(new Uint8Array(eocd), cursor);
  return output;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFormula(value: string): string {
  return /^[=+\-@]/u.test(value) ? `'${value}` : value;
}

function colLetter(colIndexZeroBased: number): string {
  let n = colIndexZeroBased + 1;
  let result = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    result = String.fromCharCode(65 + rem) + result;
    n = Math.floor((n - 1) / 26);
  }
  return result;
}

function cellRef(rowNumber: number, colIndex: number): string {
  return `${colLetter(colIndex)}${rowNumber}`;
}

function inlineStringCell(rowNumber: number, colIndex: number, value: string, styleIndex: number): string {
  const safe = escapeXml(sanitizeFormula(value));
  return `<c r="${cellRef(rowNumber, colIndex)}" t="inlineStr" s="${styleIndex}"><is><t xml:space="preserve">${safe}</t></is></c>`;
}

function numberCell(rowNumber: number, colIndex: number, value: number, styleIndex: number): string {
  return `<c r="${cellRef(rowNumber, colIndex)}" t="n" s="${styleIndex}"><v>${value}</v></c>`;
}

function emptyStyledCell(rowNumber: number, colIndex: number, styleIndex: number): string {
  return `<c r="${cellRef(rowNumber, colIndex)}" s="${styleIndex}"/>`;
}

function defaultExcelValue<TRow>(col: ReportExportColumn<TRow>, row: TRow, index: number): string | number {
  if (col.excelValue) return col.excelValue(row, index);
  const raw = col.pdfValue(row, index);
  return Array.isArray(raw) ? raw.join('\n') : raw;
}

// Style indices in styles.xml:
// 0: default
// 1: title (bold 14pt center)
// 2: subtitle (10pt center)
// 3: table header (bold 10pt center, #DCE6F1 fill, thin border, wrap)
// 4: body left (9.5pt, thin border, wrap)
// 5: body center (9.5pt, thin border, wrap)
// 6: body right (9.5pt, thin border, wrap)
// 7: body number right (9.5pt, #,##0.00, thin border)
// 8: summary footer (bold 10pt center, #DCE6F1 fill, thin border, wrap)
// 9: meta left (9.5pt)
const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="4">
    <font><sz val="10"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
    <font><b/><sz val="10"/><name val="Calibri"/></font>
    <font><sz val="9.5"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFDCE6F1"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FF334155"/></left>
      <right style="thin"><color rgb="FF334155"/></right>
      <top style="thin"><color rgb="FF334155"/></top>
      <bottom style="thin"><color rgb="FF334155"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="10">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top" wrapText="1"/></xf>
    <xf numFmtId="4" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="top"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
  </cellXfs>
</styleSheet>`;

export function generateReportExcelBytes<TRow>(
  template: ReportExportTemplate<TRow>,
  rows: TRow[],
): Uint8Array {
  const colCount = Math.max(1, template.columns.length);
  const lastCol = colCount - 1;
  const sheetRows: string[] = [];
  const merges: string[] = [];
  let rowNum = 1;

  if (template.includeHeader !== false) {
    const { header } = template;
    if (header.organizationName) {
      sheetRows.push(`<row r="${rowNum}" ht="22" customHeight="1">${inlineStringCell(rowNum, 0, header.organizationName, 1)}</row>`);
      if (lastCol > 0) merges.push(`${cellRef(rowNum, 0)}:${cellRef(rowNum, lastCol)}`);
      rowNum += 1;
    }
    if (header.subtitle) {
      sheetRows.push(`<row r="${rowNum}">${inlineStringCell(rowNum, 0, header.subtitle, 2)}</row>`);
      if (lastCol > 0) merges.push(`${cellRef(rowNum, 0)}:${cellRef(rowNum, lastCol)}`);
      rowNum += 1;
    }
    if (header.title) {
      sheetRows.push(`<row r="${rowNum}" ht="20" customHeight="1">${inlineStringCell(rowNum, 0, header.title, 1)}</row>`);
      if (lastCol > 0) merges.push(`${cellRef(rowNum, 0)}:${cellRef(rowNum, lastCol)}`);
      rowNum += 1;
    }
    if (header.leftMeta || header.rightMeta) {
      const metaLine = [header.leftMeta, header.rightMeta].filter(Boolean).join('   |   ');
      sheetRows.push(`<row r="${rowNum}">${inlineStringCell(rowNum, 0, metaLine, 9)}</row>`);
      if (lastCol > 0) merges.push(`${cellRef(rowNum, 0)}:${cellRef(rowNum, lastCol)}`);
      rowNum += 1;
    }
    if (header.metaPairs?.length) {
      const pairLine = header.metaPairs.map((pair) => `${pair.label}: ${pair.value || '—'}`).join('   |   ');
      sheetRows.push(`<row r="${rowNum}">${inlineStringCell(rowNum, 0, pairLine, 9)}</row>`);
      if (lastCol > 0) merges.push(`${cellRef(rowNum, 0)}:${cellRef(rowNum, lastCol)}`);
      rowNum += 1;
    }
    rowNum += 1; // Blank separator row.
  }

  const hasGroups = template.columns.some((col) => col.group);
  if (hasGroups) {
    const groupCells: string[] = [];
    let colIdx = 0;
    while (colIdx < colCount) {
      const group = template.columns[colIdx].group ?? '';
      let span = 1;
      if (group) {
        while (colIdx + span < colCount && template.columns[colIdx + span].group === group) {
          span += 1;
        }
      }
      groupCells.push(inlineStringCell(rowNum, colIdx, group, 3));
      for (let k = 1; k < span; k += 1) {
        groupCells.push(emptyStyledCell(rowNum, colIdx + k, 3));
      }
      if (span > 1) {
        merges.push(`${cellRef(rowNum, colIdx)}:${cellRef(rowNum, colIdx + span - 1)}`);
      }
      colIdx += span;
    }
    sheetRows.push(`<row r="${rowNum}" ht="20" customHeight="1">${groupCells.join('')}</row>`);
    rowNum += 1;
  }

  const headerCells = template.columns.map((col, idx) => inlineStringCell(rowNum, idx, col.label, 3));
  sheetRows.push(`<row r="${rowNum}" ht="22" customHeight="1">${headerCells.join('')}</row>`);
  rowNum += 1;

  rows.forEach((row, rowIndex) => {
    const cells = template.columns.map((col, colIdx) => {
      const val = defaultExcelValue(col, row, rowIndex);
      if (typeof val === 'number' && Number.isFinite(val)) {
        return numberCell(rowNum, colIdx, val, 7);
      }
      const alignStyle = col.align === 'center' ? 5 : col.align === 'right' ? 6 : 4;
      return inlineStringCell(rowNum, colIdx, String(val ?? ''), alignStyle);
    });
    sheetRows.push(`<row r="${rowNum}">${cells.join('')}</row>`);
    rowNum += 1;
  });

  const summaryBoxes = template.summaryFooter?.(rows) ?? [];
  if (summaryBoxes.length > 0) {
    rowNum += 1; // Blank separator row.
    const boxCount = summaryBoxes.length;
    const baseSpan = Math.floor(colCount / boxCount);
    let remainder = colCount % boxCount;
    const summaryCells: string[] = [];
    let colIdx = 0;

    summaryBoxes.forEach((box) => {
      const span = Math.max(1, baseSpan + (remainder > 0 ? 1 : 0));
      if (remainder > 0) remainder -= 1;
      const text = box.value !== undefined ? `${box.label}\n${box.value}` : box.label;
      summaryCells.push(inlineStringCell(rowNum, colIdx, text, 8));
      for (let k = 1; k < span && colIdx + k < colCount; k += 1) {
        summaryCells.push(emptyStyledCell(rowNum, colIdx + k, 8));
      }
      const endCol = Math.min(lastCol, colIdx + span - 1);
      if (endCol > colIdx) {
        merges.push(`${cellRef(rowNum, colIdx)}:${cellRef(rowNum, endCol)}`);
      }
      colIdx = endCol + 1;
    });
    sheetRows.push(`<row r="${rowNum}" ht="30" customHeight="1">${summaryCells.join('')}</row>`);
  }

  const totalWeight = template.columns.reduce((sum, col) => sum + Math.max(1, col.width), 0);
  const colsXml = template.columns
    .map((col, idx) => {
      const widthChars = Math.max(8, Math.round((Math.max(1, col.width) / totalWeight) * 165));
      return `<col min="${idx + 1}" max="${idx + 1}" width="${widthChars}" customWidth="1"/>`;
    })
    .join('');

  const mergeXml = merges.length
    ? `<mergeCells count="${merges.length}">${merges.map((ref) => `<mergeCell ref="${ref}"/>`).join('')}</mergeCells>`
    : '';

  const safeSheetName = escapeXml((template.sheetName || template.header.title || 'Report').replace(/[\\/?*[\]:]/gu, ' ').trim().slice(0, 31) || 'Report');

  const sheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetViews><sheetView workbookViewId="0"/></sheetViews>
  <cols>${colsXml}</cols>
  <sheetData>${sheetRows.join('')}</sheetData>
  ${mergeXml}
</worksheet>`;

  const workbookXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="${safeSheetName}" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

  const rootRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

  const workbookRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  return buildZipStore([
    { name: '[Content_Types].xml', content: encoder.encode(contentTypesXml) },
    { name: '_rels/.rels', content: encoder.encode(rootRelsXml) },
    { name: 'xl/workbook.xml', content: encoder.encode(workbookXml) },
    { name: 'xl/_rels/workbook.xml.rels', content: encoder.encode(workbookRelsXml) },
    { name: 'xl/styles.xml', content: encoder.encode(STYLES_XML) },
    { name: 'xl/worksheets/sheet1.xml', content: encoder.encode(sheetXml) },
  ]);
}

export function exportReportExcel<TRow>(
  template: ReportExportTemplate<TRow>,
  rows: TRow[],
): void {
  const bytes = generateReportExcelBytes(template, rows);
  const copy = new ArrayBuffer(bytes.length);
  new Uint8Array(copy).set(bytes);
  const blob = new Blob([copy], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${template.filename}.xlsx`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
