'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download, Eye, LoaderCircle, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SavedBill } from '@/features/billing/model/bill.types';
import { createReceiptPdfBlob } from '@/features/receipts/services/receipt-document.service';
import { downloadDocument } from '@/shared/document-generation';

type PdfState =
  | { status: 'generating' }
  | { status: 'ready'; url: string }
  | { status: 'error'; message: string };

export function PrintableBillReceipt({
  bill,
  onCreateAnother,
  copies = 1,
}: {
  bill: SavedBill;
  onCreateAnother: () => void;
  copies?: number;
}) {
  const [pdfState, setPdfState] = useState<PdfState>({ status: 'generating' });
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const copyCount = Math.max(1, Math.min(5, Math.floor(copies)));

  const generatePdf = useCallback(async () => {
    try {
      const blob = await createReceiptPdfBlob(bill, copyCount);
      if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('रसिद PDF तयार भएन।');
      const url = URL.createObjectURL(blob);
      setPdfState({ status: 'ready', url });
    } catch (error) {
      setPdfState({
        status: 'error',
        message: error instanceof Error ? error.message : 'रसिदको PDF बनाउन सकिएन।',
      });
    }
  }, [bill, copyCount]);

  useEffect(() => {
    const timeout = window.setTimeout(() => void generatePdf(), 0);
    return () => window.clearTimeout(timeout);
  }, [generatePdf, generationAttempt]);

  useEffect(() => () => {
    if (pdfState.status === 'ready') URL.revokeObjectURL(pdfState.url);
  }, [pdfState]);

  const openPreview = () => {
    if (pdfState.status === 'ready') window.open(pdfState.url, '_blank', 'noopener,noreferrer');
  };

  const downloadPdf = () => {
    if (pdfState.status === 'ready') downloadDocument(pdfState.url, `receipt-${bill.receiptNumber}`);
  };

  return (
    <section className="receipt-shell mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onCreateAnother}>
          <Plus aria-hidden="true" className="mr-2 size-4" />Нयाँ बिल
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={openPreview} disabled={pdfState.status !== 'ready'}>
            <Eye aria-hidden="true" className="mr-2 size-4" />Preview receipt
          </Button>
          <Button type="button" variant="outline" onClick={downloadPdf} disabled={pdfState.status !== 'ready'}>
            <Download aria-hidden="true" className="mr-2 size-4" />Download PDF
          </Button>
        </div>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <h1 className="mb-2 text-lg font-semibold">रसिद पूर्वावलोकन</h1>
        {pdfState.status === 'generating' ? (
          <div role="status" className="grid h-[70vh] place-items-center rounded-md bg-neutral-800 text-white">
            <span className="flex items-center gap-2"><LoaderCircle aria-hidden="true" className="size-5 animate-spin" />PDF तयार हुँदैछ...</span>
          </div>
        ) : pdfState.status === 'error' ? (
          <div role="alert" className="grid min-h-48 place-items-center rounded-md border border-destructive/30 bg-destructive/5 p-6 text-center">
            <div>
              <p className="text-sm text-destructive">{pdfState.message}</p>
              <Button type="button" variant="outline" className="mt-3" onClick={() => {
                setPdfState({ status: 'generating' });
                setGenerationAttempt((attempt) => attempt + 1);
              }}>
                <RefreshCw aria-hidden="true" className="mr-2 size-4" />पुनः प्रयास
              </Button>
            </div>
          </div>
        ) : (
          <iframe
            title={`रसिद PDF ${bill.receiptNumber}`}
            src={pdfState.url}
            className="h-[75vh] w-full rounded-md border-0 bg-neutral-800"
          />
        )}
      </section>

    </section>
  );
}
