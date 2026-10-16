'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useOrganization } from '@/contexts/organization-context';
import { useBranches } from '@/features/administration/branches/hooks/useBranches';
import { useUsers } from '@/features/administration/users/hooks/useUsers';
import { createReportHeaderDetails } from '@/features/reports/utils/report-header';
import { formatReportDate } from '@/features/reports/utils/report-format';

export function useReportHeaderDetails(
  reportTitle: string,
  dateFrom = '',
  dateTo = '',
) {
  const { user: authUser } = useAuth();
  const { organization } = useOrganization();
  const { records: users, error: userError } = useUsers();
  const { records: branches, loadError: branchError } = useBranches();

  return useMemo(() => {
    const user = users.find((record) => record.email.toLowerCase() === authUser?.email.toLowerCase());
    const branch = branches.find((record) => record.id === user?.branchId);
    const branchName = branch?.name ?? '—';
    const dateFromText = dateFrom ? formatReportDate(dateFrom) : '';
    const dateToText = dateTo ? formatReportDate(dateTo) : '';
    const reportDateRange = dateFromText && dateToText
      ? `${dateFromText} - ${dateToText}`
      : dateFromText || dateToText || 'सबै मिति';
    const reportDateLine = dateFromText && dateToText
      ? `${dateFromText} देखि ${dateToText} सम्म`
      : dateFromText
        ? `${dateFromText} देखि हालसम्म`
        : dateToText
          ? `सुरुदेखि ${dateToText} सम्म`
          : 'सबै मिति';

    return {
      details: createReportHeaderDetails({
        branchName,
        officeAddress: branch ? `${branch.name}, हेटौंडा -४, पारिजातपथ` : '—',
        reportTitle,
        reportDateRange,
        reportDateLine,
      }, organization.nameNepali),
      error: userError || branchError ? 'प्रयोगकर्ताको शाखा विवरण लोड हुन सकेन।' : undefined,
    };
  }, [authUser?.email, branches, branchError, dateFrom, dateTo, organization.nameNepali, reportTitle, userError, users]);
}
