'use client';

import { useRef, useState } from 'react';
import { FileText, Info, Loader2, Upload, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/components/ui/use-toast';
import { organizationConfig } from '@/constants/organization';
import {
  buildAcceptAttributeFromMimeTypes,
  getMeetingDocumentsUploadPolicy,
  type MeetingDocumentsUploadPolicy,
  toFileSizeBytes,
} from '@/lib/file-upload-policy';
import { authenticatedFetch, cn } from '@/utils/cn';
import type { MeetingDocumentAttachment } from '@/types/billing';

type UploadResponse = {
  success?: boolean;
  data?: MeetingDocumentAttachment[];
  error?: { message?: string };
};

function formatFileSize(size: number): string {
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function normalizeDocumentUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '#';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return encodeURI(trimmed);
  return encodeURI(`/${trimmed}`);
}

export function FileUploadSimple(props: {
  value: MeetingDocumentAttachment[];
  onChange: (files: MeetingDocumentAttachment[]) => void;
  uploadEndpoint: string;
  maxFiles?: number;
  policy?: MeetingDocumentsUploadPolicy;
  multiple?: boolean;
  disabled?: boolean;
  className?: string;
  buttonLabel: string;
  infoLabel: string;
  uploadingLabel: string;
  removeLabel: string;
}) {
  const { toast } = useToast();
  const uploadPolicy = props.policy ?? getMeetingDocumentsUploadPolicy(organizationConfig);
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const maxFiles = Math.min(props.maxFiles ?? uploadPolicy.maxFilesTotal, uploadPolicy.maxFilesTotal);
  const maxFileSizeBytes = toFileSizeBytes(uploadPolicy.maxFileSizeMb);
  const allowedMimeTypes = new Set(uploadPolicy.allowedMimeTypes);
  const accept = buildAcceptAttributeFromMimeTypes(uploadPolicy.allowedMimeTypes);
  const multiple = props.multiple ?? true;
  const replacesExistingFile = (props.maxFiles ?? uploadPolicy.maxFilesTotal) === 1 || multiple === false;

  const pickFiles = () => inputRef.current?.click();

  const removeFile = (url: string) => {
    props.onChange(props.value.filter((file) => file.url !== url));
  };

  const uploadFiles = async (selectedFiles: File[]) => {
    const formData = new FormData();
    for (const file of selectedFiles) {
      formData.append('files', file);
    }
    formData.set('existingCount', String(replacesExistingFile ? 0 : props.value.length));

    const response = await authenticatedFetch(props.uploadEndpoint, {
      method: 'POST',
      body: formData,
    });
    const result = (await response.json().catch(() => null)) as UploadResponse | null;

    if (!response.ok || !result?.success || !Array.isArray(result.data)) {
      throw new Error(result?.error?.message ?? 'Meeting documents upload failed');
    }

    if ((props.maxFiles ?? uploadPolicy.maxFilesTotal) === 1 || multiple === false) {
      props.onChange(result.data.slice(0, 1));
      return;
    }

    const map = new Map<string, MeetingDocumentAttachment>();
    for (const existing of props.value) {
      map.set(existing.url, existing);
    }
    for (const uploaded of result.data) {
      map.set(uploaded.url, uploaded);
    }
    props.onChange(Array.from(map.values()));
  };

  const handleChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (selectedFiles.length === 0) return;
    if (inputRef.current) {
      inputRef.current.value = '';
    }

    const existingCount = replacesExistingFile ? 0 : props.value.length;
    if (existingCount + selectedFiles.length > maxFiles) {
      toast({
        title: 'त्रुटि',
        description: `अधिकतम ${maxFiles} वटा फाइल मात्र अपलोड गर्न मिल्छ।`,
        variant: 'destructive',
      });
      return;
    }
    if (selectedFiles.length > uploadPolicy.maxFilesPerUpload) {
      toast({
        title: 'त्रुटि',
        description: `एकपटकमा अधिकतम ${uploadPolicy.maxFilesPerUpload} वटा फाइल मात्र अपलोड गर्न मिल्छ।`,
        variant: 'destructive',
      });
      return;
    }

    const invalidType = selectedFiles.find((file) => !allowedMimeTypes.has(file.type as (typeof uploadPolicy.allowedMimeTypes)[number]));
    if (invalidType) {
      toast({
        title: 'त्रुटि',
        description: `${invalidType.name}: यो फाइल प्रकार अनुमति छैन।`,
        variant: 'destructive',
      });
      return;
    }

    const tooLarge = selectedFiles.find((file) => file.size > maxFileSizeBytes);
    if (tooLarge) {
      toast({
        title: 'त्रुटि',
        description: `${tooLarge.name}: फाइल साइज ${uploadPolicy.maxFileSizeMb}MB भन्दा बढी हुन मिल्दैन।`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    try {
      await uploadFiles(selectedFiles);
    } catch (error) {
      toast({
        title: 'त्रुटि',
        description: error instanceof Error ? error.message : 'फाइल अपलोड असफल भयो।',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const disabled = props.disabled || uploading;

  return (
    <div className={cn('space-y-2', props.className)}>
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={accept}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={pickFiles}
          disabled={disabled}
          className="h-11 rounded-xl px-4 text-sm"
        >
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          {uploading ? props.uploadingLabel : props.buttonLabel}
        </Button>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground sm:text-sm">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p className="leading-relaxed">{props.infoLabel}</p>
        </div>
      </div>

      {props.value.length > 0 ? (
        <div className="space-y-2">
          {props.value.map((file) => {
            const documentUrl = normalizeDocumentUrl(file.url);
            const hasValidLink = documentUrl !== '#';
            return (
              <div key={file.url} className="flex items-center gap-2 rounded-md border px-3 py-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <a
                  href={documentUrl}
                  target={hasValidLink ? '_blank' : undefined}
                  rel={hasValidLink ? 'noopener noreferrer' : undefined}
                  className={cn(
                    'min-w-0 flex-1 truncate text-sm',
                    hasValidLink ? 'text-primary hover:underline' : 'cursor-not-allowed text-muted-foreground',
                  )}
                >
                  {file.name}
                </a>
                <span className="text-xs text-muted-foreground">{formatFileSize(file.size)}</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeFile(file.url)}
                        aria-label={props.removeLabel}
                        disabled={disabled}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>{props.removeLabel}</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
