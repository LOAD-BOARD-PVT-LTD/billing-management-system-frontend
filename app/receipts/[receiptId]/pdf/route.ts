import { readFile } from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import { NextRequest, NextResponse } from 'next/server';
import { endpoints } from '@/lib/api/endpoints';
import { parseBillResource } from '@/features/receipts/api/bill-resource.api';
import { createReceiptPdfBytes } from '@/features/receipts/services/receipt-pdf-generator';
import { resolveBillBranding } from '@/shared/document-generation/utils/resolve-bill-branding';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type RouteContext = {
  params: Promise<{ receiptId: string }>;
};

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Accept',
} as const;

let cachedServiceToken: { token: string; expiresAt: number } | null = null;

function buildBackendUrl(endpointPath: string): URL {
  const target = process.env.API_PROXY_TARGET?.trim();
  if (!target) {
    throw new Error('API_PROXY_TARGET is not configured.');
  }
  const url = new URL(target);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('API_PROXY_TARGET must use HTTP or HTTPS.');
  }
  const cleanEndpoint = endpointPath.replace(/^\/+/u, '');
  url.pathname = `${url.pathname.replace(/\/+$/u, '')}/${cleanEndpoint}`;
  url.search = '';
  return url;
}

const allowSelfSignedCertificates = (
  process.env.NODE_ENV === 'development'
  && process.env.API_PROXY_ALLOW_SELF_SIGNED === 'true'
);

async function backendRequest(
  url: URL,
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
): Promise<{ status: number; text: string }> {
  const method = init.method ?? 'GET';
  const headers = init.headers ?? {};

  if (!allowSelfSignedCertificates) {
    const response = await fetch(url.toString(), {
      method,
      headers,
      body: init.body,
      cache: 'no-store',
    });
    return { status: response.status, text: await response.text() };
  }

  return new Promise((resolve, reject) => {
    const req = https.request(url, {
      method,
      headers,
      rejectUnauthorized: false,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 502,
          text: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

async function getServiceAuthHeader(forceRefresh = false): Promise<string | null> {
  const staticToken = process.env.RECEIPT_PDF_API_TOKEN?.trim();
  if (staticToken) {
    return staticToken.startsWith('Bearer ') ? staticToken : `Bearer ${staticToken}`;
  }

  const email = process.env.RECEIPT_PDF_API_EMAIL?.trim();
  const password = process.env.RECEIPT_PDF_API_PASSWORD;
  if (!email || !password) {
    return null;
  }

  const now = Date.now();
  if (!forceRefresh && cachedServiceToken && cachedServiceToken.expiresAt > now + 30_000) {
    return `Bearer ${cachedServiceToken.token}`;
  }

  const loginUrl = buildBackendUrl(endpoints.auth.login);
  const response = await backendRequest(loginUrl, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (response.status < 200 || response.status >= 300) {
    cachedServiceToken = null;
    return null;
  }

  try {
    const parsed = JSON.parse(response.text) as { token?: string; access_token?: string };
    const token = (parsed.token ?? parsed.access_token ?? '').trim();
    if (!token) return null;
    cachedServiceToken = {
      token,
      expiresAt: now + 15 * 60 * 1000,
    };
    return `Bearer ${token}`;
  } catch {
    return null;
  }
}

async function fetchBackendJson(
  endpointPath: string,
  callerAuthHeader: string | null,
): Promise<{ status: number; data: unknown }> {
  const url = buildBackendUrl(endpointPath);
  const authHeader = callerAuthHeader ?? await getServiceAuthHeader(false);
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (authHeader) headers.Authorization = authHeader;

  let response = await backendRequest(url, { method: 'GET', headers });

  if (response.status === 401 && !callerAuthHeader && process.env.RECEIPT_PDF_API_EMAIL && process.env.RECEIPT_PDF_API_PASSWORD) {
    const refreshed = await getServiceAuthHeader(true);
    if (refreshed) {
      response = await backendRequest(url, {
        method: 'GET',
        headers: { Accept: 'application/json', Authorization: refreshed },
      });
    }
  }

  let data: unknown = null;
  if (response.text) {
    try {
      data = JSON.parse(response.text) as unknown;
    } catch {
      data = response.text;
    }
  }
  return { status: response.status, data };
}

function extractBrandingEntities(payload: unknown): Array<{
  id: string;
  registrationNumber: string;
  panNumber: string;
}> {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === 'object'
      ? (
        (payload as Record<string, unknown>).data
        ?? (payload as Record<string, unknown>).items
        ?? (payload as Record<string, unknown>).results
        ?? []
      )
      : [];

  if (!Array.isArray(rows)) return [];

  const entities: Array<{ id: string; registrationNumber: string; panNumber: string }> = [];
  for (const row of rows) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const id = record.id !== undefined && record.id !== null ? String(record.id).trim() : '';
    if (!id) continue;
    const rawInner = record.inner_content ?? record.innerContent;
    const inner = typeof rawInner === 'string'
      ? (() => {
        try {
          return JSON.parse(rawInner) as Record<string, unknown>;
        } catch {
          return null;
        }
      })()
      : rawInner && typeof rawInner === 'object'
        ? rawInner as Record<string, unknown>
        : null;
    if (!inner) continue;
    const registrationNumber = String(inner.registrationNumber ?? inner.registration_number ?? '').trim();
    const panNumber = String(inner.panNumber ?? inner.pan_number ?? inner.pan ?? '').trim();
    entities.push({ id, registrationNumber, panNumber });
  }
  return entities;
}

async function loadServerAsset(requestUrl: string, assetPath: string, name: string): Promise<Uint8Array> {
  try {
    const response = await fetch(new URL(assetPath, requestUrl));
    if (response.ok) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      if (bytes.length > 0) return bytes;
    }
  } catch {
    // Fall back to local filesystem in Node.js environments.
  }

  const relativePath = assetPath.replace(/^\/+/u, '');
  const fullPath = path.join(process.cwd(), 'public', relativePath);
  const buffer = await readFile(fullPath);
  if (!buffer.length) {
    throw new Error(`${name} is empty.`);
  }
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
}

function parsePositiveInt(value: string | null, fallback: number, min: number, max: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: NextRequest, context: RouteContext): Promise<Response> {
  const { receiptId } = await context.params;
  const cleanId = receiptId?.trim();
  if (!cleanId) {
    return NextResponse.json(
      { message: 'Receipt ID is required.' },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const searchParams = request.nextUrl.searchParams;
  const copies = parsePositiveInt(searchParams.get('copies'), 1, 1, 5);
  const copyStart = parsePositiveInt(searchParams.get('copyStart'), 1, 1, 999);
  const download = searchParams.get('download') === '1' || searchParams.get('download') === 'true';
  const showCopyLabelParam = searchParams.get('showCopyLabel');
  const showCopyLabel = showCopyLabelParam === null
    ? !download
    : showCopyLabelParam !== '0' && showCopyLabelParam !== 'false';

  const callerAuthHeader = request.headers.get('authorization');

  try {
    const billResponse = await fetchBackendJson(endpoints.resources.bill.read(cleanId), callerAuthHeader);

    if (billResponse.status === 404) {
      return NextResponse.json(
        { message: `Receipt ${cleanId} was not found.` },
        { status: 404, headers: CORS_HEADERS },
      );
    }

    if (billResponse.status === 401 || billResponse.status === 403) {
      return NextResponse.json(
        {
          message: 'Backend rejected public receipt access. Configure RECEIPT_PDF_API_TOKEN (or RECEIPT_PDF_API_EMAIL / RECEIPT_PDF_API_PASSWORD) on the server, or allow public read access for BillResource.',
        },
        { status: billResponse.status, headers: CORS_HEADERS },
      );
    }

    if (billResponse.status < 200 || billResponse.status >= 300) {
      return NextResponse.json(
        { message: `Could not load receipt ${cleanId} from backend (${billResponse.status}).` },
        { status: 502, headers: CORS_HEADERS },
      );
    }

    const receipt = parseBillResource(billResponse.data);

    let branding = {};
    try {
      const entityResponse = await fetchBackendJson(endpoints.resources.billingEntity.list(), callerAuthHeader);
      if (entityResponse.status >= 200 && entityResponse.status < 300) {
        const entities = extractBrandingEntities(entityResponse.data);
        branding = resolveBillBranding(receipt.bill, entities);
      }
    } catch {
      // Fall back to default organization branding if BillingEntityResource is unavailable.
    }

    const pdfBytes = await createReceiptPdfBytes(receipt.bill, copies, {
      voided: receipt.status === 'CANCELLED',
      branding,
      showCopyLabel,
      copyNumberStart: copyStart,
      loadAsset: (assetPath, name) => loadServerAsset(request.url, assetPath, name),
    });

    const safeFilename = `receipt-${receipt.receiptNumber.replace(/[^\w.-]+/gu, '-')}.pdf`;
    const disposition = download ? 'attachment' : 'inline';
    const responseBody = new Uint8Array(pdfBytes.length);
    responseBody.set(pdfBytes);

    return new Response(responseBody, {
      status: 200,
      headers: {
        ...CORS_HEADERS,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `${disposition}; filename="${safeFilename}"`,
        'Cache-Control': 'no-store, max-age=0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not generate receipt PDF.';
    return NextResponse.json(
      { message },
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
