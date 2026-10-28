'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Eye, LoaderCircle, Plus, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import type { SavedBill } from '@/features/billing/model/bill.types';
import type { CompanyBrandingOptions } from '@/shared/document-generation/types/document.types';
import { createReceiptPdfBlob } from '@/features/receipts/services/receipt-document.service';
import { recordReceiptPrint } from '@/features/receipts/api/bill-resource.api';
import { receiptsKeys } from '@/lib/query/query-keys';
import { downloadDocument } from '@/shared/document-generation';

type PdfState =
  | { status: 'generating' }
  | { status: 'ready'; url: string }
  | { status: 'error'; message: string };

export function PrintableBillReceipt({
  bill,
  onBack,
  backLabel = 'Нयाँ बिल',
  backAction = 'new-bill',
  copies = 1,
  voided = false,
  branding,
  resourceContent,
  externalContent = null,
}: {
  bill: SavedBill;
  onBack: () => void;
  backLabel?: string;
  backAction?: 'new-bill' | 'return';
  copies?: number;
  voided?: boolean;
  branding?: Partial<CompanyBrandingOptions>;
  resourceContent?: Record<string, unknown>;
  externalContent?: unknown;
}) {
  const [pdfState, setPdfState] = useState<PdfState>({ status: 'generating' });
  const [generationAttempt, setGenerationAttempt] = useState(0);
  const [isRecordingPrint, setIsRecordingPrint] = useState(false);
  const [printResourceContent, setPrintResourceContent] = useState<unknown>(resourceContent ?? bill.content);
  const printFrame = useRef<HTMLIFrameElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const copyCount = Math.max(1, Math.min(5, Math.floor(copies)));

  const generatePdf = useCallback(async () => {
    try {
      const blob = await createReceiptPdfBlob(bill, copyCount, { voided, branding });
      if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('रसिद PDF तयार भएन।');
      const url = URL.createObjectURL(blob);
      setPdfState({ status: 'ready', url });
    } catch (error) {
      setPdfState({
        status: 'error',
        message: error instanceof Error ? error.message : 'रसिदको PDF बनाउन सकिएन।',
      });
    }
  }, [bill, copyCount, voided, branding]);

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

  const downloadPdf = async () => {
    try {
      const blob = await createReceiptPdfBlob(bill, 1, { voided, branding, showCopyLabel: false });
      if (blob.type !== 'application/pdf' || blob.size === 0) throw new Error('रसिद PDF तयार भएन।');
      const url = URL.createObjectURL(blob);
      downloadDocument(url, `receipt-${bill.receiptNumber}`);
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (error) {
      toast({
        title: 'रसिद डाउनलोड गर्न सकिएन',
        description: error instanceof Error ? error.message : 'कृपया पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
    }
  };

  const recordPrint = async () => {
    setIsRecordingPrint(true);
    try {
      const updatedContent = await recordReceiptPrint(bill.id, printResourceContent, externalContent, copyCount);
      setPrintResourceContent(updatedContent);
      await queryClient.invalidateQueries({ queryKey: receiptsKeys.lists() });
      toast({
        title: 'प्रतिलिपि प्रिन्ट अभिलेख सुरक्षित भयो',
        description: `${copyCount} प्रति अभिलेखमा थपियो।`,
      });
    } catch (error) {
      toast({
        title: 'प्रिन्ट अभिलेख सुरक्षित भएन',
        description: error instanceof Error ? error.message : 'प्रिन्ट अभिलेख राख्न सकिएन।',
        variant: 'destructive',
      });
    } finally {
      setIsRecordingPrint(false);
    }
  };

  const printPdf = () => {
    const printWindow = printFrame.current?.contentWindow;
    if (!printWindow || pdfState.status !== 'ready') {
      toast({
        title: 'रसिद प्रिन्ट गर्न सकिएन',
        description: 'रसिद PDF तयार भएपछि पुनः प्रयास गर्नुहोस्।',
        variant: 'destructive',
      });
      return;
    }
    printWindow.focus();
    printWindow.print();
    void recordPrint();
  };

  return (
    <section className="receipt-shell mx-auto max-w-5xl space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onBack}>
          {backAction === 'return' ? (
            <ArrowLeft aria-hidden="true" className="mr-2 size-4" />
          ) : (
            <Plus aria-hidden="true" className="mr-2 size-4" />
          )}
          {backLabel}
        </Button>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={openPreview} disabled={pdfState.status !== 'ready'}>
            <Eye aria-hidden="true" className="mr-2 size-4" />Preview receipt
          </Button>
          <Button type="button" variant="outline" onClick={printPdf} disabled={pdfState.status !== 'ready' || isRecordingPrint}>
            <Printer aria-hidden="true" className="mr-2 size-4" />Print {copyCount > 1 ? `(${copyCount})` : ''}
          </Button>
          <Button type="button" variant="outline" onClick={downloadPdf} disabled={pdfState.status !== 'ready' || isRecordingPrint}>
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
            ref={printFrame}
            title={`रसिद PDF ${bill.receiptNumber}`}
            src={pdfState.url}
            className="h-[75vh] w-full rounded-md border-0 bg-neutral-800"
          />
        )}
      </section>

    </section>
  );
}
