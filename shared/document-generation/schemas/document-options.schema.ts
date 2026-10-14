import type { DocumentOptions } from '../types/document.types';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseDocumentOptions(value: unknown): DocumentOptions {
  if (!isRecord(value)) {
    throw new Error('Document options must be an object.');
  }
  const options = value;

  if (options.orientation !== 'portrait' && options.orientation !== 'landscape') {
    throw new Error('Document orientation must be portrait or landscape.');
  }
  if (typeof options.copies !== 'number' || !Number.isInteger(options.copies) || options.copies < 1 || options.copies > 5) {
    throw new Error('Document copies must be an integer between 1 and 5.');
  }
  if (options.filename !== undefined && typeof options.filename !== 'string') {
    throw new Error('Document filename must be a string.');
  }
  if (options.pageFormat !== undefined && options.pageFormat !== 'a4' && options.pageFormat !== 'receipt') {
    throw new Error('Document page format must be a4 or receipt.');
  }

  return {
    orientation: options.orientation,
    copies: options.copies,
    ...(options.pageFormat === 'receipt' ? { pageFormat: 'receipt' as const } : {}),
    ...(typeof options.filename === 'string' ? { filename: options.filename } : {}),
  };
}
