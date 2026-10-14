import { createDocumentFilename } from '../utils/filename';
import { parseDocumentOptions } from '../schemas/document-options.schema';
import type { DocumentOptions } from '../types/document.types';

const MODERN_COLOR_FUNCTION = /\b(?:lab|lch|oklab|oklch|color|color-mix)\(/iu;
const COLOR_PROPERTIES = [
  'color',
  'background-color',
  'border-top-color',
  'border-right-color',
  'border-bottom-color',
  'border-left-color',
  'outline-color',
  'text-decoration-color',
  'column-rule-color',
  'caret-color',
  '-webkit-text-stroke-color',
  'fill',
  'stroke',
] as const;

const COLOR_IMAGE_PROPERTIES = ['background-image', 'list-style-image'] as const;
const COLOR_EFFECT_PROPERTIES = ['box-shadow', 'text-shadow'] as const;

function toRgbColor(value: string, context: CanvasRenderingContext2D): string {
  const sentinel = 'rgb(1, 2, 3)';
  context.fillStyle = sentinel;
  const serializedSentinel = context.fillStyle;
  context.fillStyle = value;
  context.clearRect(0, 0, 1, 1);
  context.fillRect(0, 0, 1, 1);
  const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;

  if (context.fillStyle === serializedSentinel) {
    throw new Error(`Could not convert PDF color "${value}" to RGB.`);
  }

  return `rgba(${red}, ${green}, ${blue}, ${alpha / 255})`;
}

function normalizePdfColors(clonedDocument: HTMLDocument): void {
  const context = clonedDocument.createElement('canvas').getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not initialize PDF color conversion.');

  const elements = Array.from(clonedDocument.querySelectorAll<HTMLElement>('*'));
  const pseudoRules: string[] = [];
  elements.forEach((element, index) => {
    const normalizeStyle = (style: CSSStyleDeclaration, pseudo?: '::before' | '::after') => {
      const declarations: string[] = [];
      for (const property of COLOR_PROPERTIES) {
        const value = style.getPropertyValue(property);
        if (MODERN_COLOR_FUNCTION.test(value)) {
          const converted = toRgbColor(value, context);
          if (pseudo) declarations.push(`${property}: ${converted} !important`);
          else element.style.setProperty(property, converted, 'important');
        }
      }
      for (const property of COLOR_IMAGE_PROPERTIES) {
        if (MODERN_COLOR_FUNCTION.test(style.getPropertyValue(property))) {
          if (pseudo) declarations.push(`${property}: none !important`);
          else element.style.setProperty(property, 'none', 'important');
        }
      }
      for (const property of COLOR_EFFECT_PROPERTIES) {
        if (MODERN_COLOR_FUNCTION.test(style.getPropertyValue(property))) {
          if (pseudo) declarations.push(`${property}: none !important`);
          else element.style.setProperty(property, 'none', 'important');
        }
      }
      if (pseudo && declarations.length) {
        pseudoRules.push(`[data-pdf-color-node="${index}"]${pseudo} { ${declarations.join('; ')}; }`);
      }
    };

    const computed = clonedDocument.defaultView?.getComputedStyle(element);
    if (computed) normalizeStyle(computed);

    element.setAttribute('data-pdf-color-node', String(index));
    for (const pseudo of ['::before', '::after'] as const) {
      const pseudoStyle = clonedDocument.defaultView?.getComputedStyle(element, pseudo);
      if (pseudoStyle) normalizeStyle(pseudoStyle, pseudo);
    }
  });

  if (pseudoRules.length) {
    const style = clonedDocument.createElement('style');
    style.textContent = pseudoRules.join('\n');
    clonedDocument.head.append(style);
  }
}

export async function renderPdf(element: HTMLElement, inputOptions: DocumentOptions): Promise<Blob> {
  const options = parseDocumentOptions(inputOptions);
  await document.fonts.ready;
  await Promise.all(Array.from(element.querySelectorAll('img'), async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve, reject) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => reject(new Error('Could not load an image in the document.')), { once: true });
      });
    }
    if (!image.naturalWidth) throw new Error('Could not load an image in the document.');
  }));

  const { jsPDF } = await import('jspdf');
  const pageWidth = options.pageFormat === 'receipt'
    ? 210
    : options.orientation === 'landscape' ? 297 : 210;
  const pageHeight = options.pageFormat === 'receipt'
    ? Math.max(148.5, (element.scrollHeight * 25.4) / 96)
    : undefined;
  const pageFormat = pageHeight ? [pageWidth, pageHeight] : 'a4';
  const pdf = new jsPDF({
    orientation: options.orientation,
    unit: 'mm',
    format: pageFormat,
    compress: true,
  });
  for (let copy = 0; copy < options.copies; copy += 1) {
    if (copy > 0) pdf.addPage(pageFormat, options.orientation);
    await pdf.html(element, {
      x: 0,
      y: 0,
      width: pageWidth,
      windowWidth: element.offsetWidth,
      autoPaging: false,
      html2canvas: {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        scrollX: 0,
        scrollY: 0,
        onclone: (clonedDocument) => normalizePdfColors(clonedDocument),
      },
    });
  }
  return pdf.output('blob');
}

export async function renderPdfUrl(element: HTMLElement, options: DocumentOptions): Promise<string> {
  return URL.createObjectURL(await renderPdf(element, options));
}

export function downloadDocument(blobUrl: string, name: string): void {
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = createDocumentFilename(name, 'pdf');
  link.click();
}
