export const MAHASANGH_REPORT_MODE = 'mahasangh';

type IncomeReportMode = typeof MAHASANGH_REPORT_MODE | null;

function parseIncomeReportUrl(currentUrl: string): URL {
  return new URL(currentUrl, 'https://billing.example.test');
}

function toRelativeUrl(url: URL): string {
  const query = url.searchParams.toString();
  return query ? `${url.pathname}?${query}` : url.pathname;
}

export function resolveIncomeReportRoute(currentUrl: string): {
  reportMode: IncomeReportMode;
} {
  const url = parseIncomeReportUrl(currentUrl);
  const reportMode =
    url.searchParams.get('reportMode') === MAHASANGH_REPORT_MODE
      ? MAHASANGH_REPORT_MODE
      : null;

  return { reportMode };
}

export function updateIncomeReportBillingTitle(currentUrl: string, billingTitle: string): string {
  const route = resolveIncomeReportRoute(currentUrl);
  const url = parseIncomeReportUrl(currentUrl);

  if (billingTitle === 'all') {
    if (route.reportMode === MAHASANGH_REPORT_MODE) {
      url.searchParams.set('billingTitle', 'all');
    } else {
      url.searchParams.delete('billingTitle');
    }
  } else {
    url.searchParams.set('billingTitle', billingTitle);
  }

  return toRelativeUrl(url);
}
