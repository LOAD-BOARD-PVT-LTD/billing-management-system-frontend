import https from 'node:https';
import type { IncomingMessage } from 'node:http';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

const allowSelfSignedCertificates = (
  process.env.NODE_ENV === 'development'
  && process.env.API_PROXY_ALLOW_SELF_SIGNED === 'true'
);

function backendUrl(path: string[], search: string): URL {
  const target = process.env.API_PROXY_TARGET;
  if (!target) throw new Error('API_PROXY_TARGET is not configured.');

  const url = new URL(target);
  if (url.protocol !== 'https:') {
    throw new Error('API_PROXY_TARGET must use HTTPS.');
  }

  const safePath = path.map((segment) => encodeURIComponent(segment)).join('/');
  url.pathname = `${url.pathname.replace(/\/+$/u, '')}/${safePath}`;
  url.search = search;
  return url;
}

function responseHeaders(response: IncomingMessage): Headers {
  const headers = new Headers();
  const contentType = response.headers['content-type'];
  const cacheControl = response.headers['cache-control'];
  if (contentType) headers.set('content-type', contentType);
  if (cacheControl) headers.set('cache-control', cacheControl);
  return headers;
}

async function proxyRequest(request: NextRequest, context: RouteContext): Promise<Response> {
  let url: URL;
  try {
    const { path } = await context.params;
    url = backendUrl(path, request.nextUrl.search);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid API proxy configuration.';
    return NextResponse.json({ message }, { status: 500 });
  }

  const body = request.method === 'GET' || request.method === 'HEAD'
    ? undefined
    : Buffer.from(await request.arrayBuffer());
  const headers: https.RequestOptions['headers'] = {};
  for (const name of ['accept', 'authorization', 'content-type'] as const) {
    const value = request.headers.get(name);
    if (value) headers[name] = value;
  }

  return new Promise<Response>((resolve) => {
    const upstream = https.request(url, {
      method: request.method,
      headers,
      agent: new https.Agent({ rejectUnauthorized: !allowSelfSignedCertificates }),
    }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer | string) => {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      });
      response.on('end', () => {
        resolve(new Response(Buffer.concat(chunks), {
          status: response.statusCode ?? 502,
          headers: responseHeaders(response),
        }));
      });
    });

    upstream.on('error', (error: NodeJS.ErrnoException) => {
      const code = error.code ?? 'BACKEND_CONNECTION_FAILED';
      const message = code === 'ECONNREFUSED'
        ? 'The backend refused the connection. Confirm the API service is running and listening on the configured port.'
        : code === 'ETIMEDOUT'
          ? 'The backend connection timed out. Check network routing and firewall rules.'
          : code.includes('CERT') || code.includes('TLS')
            ? 'The backend TLS certificate could not be verified.'
            : 'Could not connect to the backend API. Check its URL and network availability.';
      resolve(NextResponse.json(
        {
          message,
          code,
        },
        { status: 502 },
      ));
    });

    if (body) upstream.write(body);
    upstream.end();
  });
}

export const GET = proxyRequest;
export const HEAD = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
