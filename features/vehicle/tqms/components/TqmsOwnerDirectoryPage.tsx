'use client';

import { Fragment, useMemo, useState } from 'react';
import { CarFront, Download, ExternalLink, RefreshCw, Search, Users } from 'lucide-react';
import { DataTablePagination } from '@/components/data-tables/DataTablePagination';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMemberVehicles } from '@/features/members/hooks/use-member-vehicles';
import type { MemberVehicleDetails } from '@/features/members/api/member-vehicle.api';
import { toNepaliDigits } from '@/utils/numbers';

const DIRECTORY_BRANCH = 'Narayani Sangh Hetauda';

type OwnerGroup = {
  key: string;
  name: string;
  type: string;
  phone: string;
  identityNumber: string;
  address: string;
  vehicles: MemberVehicleDetails[];
};

function ownerKey(vehicle: MemberVehicleDetails) {
  const name = vehicle.sawariDhaniName.trim().toLocaleLowerCase();
  const identity = vehicle.identityNumber.trim().toLocaleLowerCase();
  if (identity) return `identity:${identity}`;

  const phone = vehicle.phone.trim().toLocaleLowerCase();
  if (phone) return `phone:${name}:${phone}`;

  return `name:${name}:${vehicle.address.trim().toLocaleLowerCase()}`;
}

function groupVehicles(vehicles: MemberVehicleDetails[]): OwnerGroup[] {
  const groups = new Map<string, OwnerGroup>();
  for (const vehicle of vehicles) {
    const key = ownerKey(vehicle);
    const group = groups.get(key);
    if (group) {
      group.vehicles.push(vehicle);
      if (!group.phone && vehicle.phone) group.phone = vehicle.phone;
      if (!group.identityNumber && vehicle.identityNumber) group.identityNumber = vehicle.identityNumber;
      if (!group.address && vehicle.address) group.address = vehicle.address;
      if (!group.type && vehicle.ownerType) group.type = vehicle.ownerType;
      continue;
    }

    groups.set(key, {
      key,
      name: vehicle.sawariDhaniName || '—',
      type: vehicle.ownerType,
      phone: vehicle.phone,
      identityNumber: vehicle.identityNumber,
      address: vehicle.address,
      vehicles: [vehicle],
    });
  }

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name, 'ne'));
}

function downloadOwnerCsv(owners: OwnerGroup[]) {
  const headers = ['नाम', 'धनी प्रकार', 'फोन नम्बर', 'पहिचान नम्बर', 'ठेगाना', 'कुल सवारी', 'सवारी नम्बरहरू'];
  const escape = (value: string) => `"${value.replaceAll('"', '""')}"`;
  const rows = owners.map((owner) => [
    owner.name,
    owner.type || '—',
    owner.phone || '—',
    owner.identityNumber || '—',
    owner.address || '—',
    String(owner.vehicles.length),
    owner.vehicles.map((vehicle) => vehicle.vehicleNumber || vehicle.vehicleId).join(', '),
  ]);
  const csv = [headers, ...rows].map((row) => row.map(escape).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tqms-owner-directory.csv';
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function lastSyncLabel(date: Date | null) {
  if (!date) return 'अहिलेसम्म sync भएको छैन';
  return `अन्तिम sync: ${date.toLocaleString('en-GB')}`;
}

export function TqmsOwnerDirectoryPage() {
  const { vehicles, isLoading, isRefreshing, lastSyncedAt, error, reload } = useMemberVehicles();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [expandedOwner, setExpandedOwner] = useState<string | null>(null);
  const pageSize = 25;

  const sanghVehicles = useMemo(
    () => vehicles.filter((vehicle) => vehicle.branch.trim().toLocaleLowerCase() === DIRECTORY_BRANCH.toLocaleLowerCase()),
    [vehicles],
  );
  const ownerGroups = useMemo(() => groupVehicles(sanghVehicles), [sanghVehicles]);
  const filteredOwners = useMemo(() => {
    const term = search.trim().toLocaleLowerCase();
    if (!term) return ownerGroups;
    return ownerGroups.filter((owner) => [
      owner.name,
      owner.type,
      owner.phone,
      owner.identityNumber,
      owner.address,
      ...owner.vehicles.flatMap((vehicle) => [vehicle.vehicleNumber, vehicle.tqmsVehicleType]),
    ].join(' ').toLocaleLowerCase().includes(term));
  }, [ownerGroups, search]);

  const pageCount = Math.max(1, Math.ceil(filteredOwners.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageOwners = filteredOwners.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const vehicleCount = sanghVehicles.length;

  return (
    <section className="space-y-4 pb-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">सवारी धनी विवरण</h1>
        <p className="mt-1 text-sm text-muted-foreground">TQMS मा भएका धनी र उनीहरूसँग सम्बन्धित सवारी हेर्नुहोस्।</p>
      </header>

      <Card className="space-y-3 rounded-lg border-border/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 font-semibold">
            <Users aria-hidden="true" className="size-4 text-primary" />
            सवारी धनी विवरण
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-right">
              <Button type="button" disabled variant="secondary" size="sm" className="h-9 gap-2">
                <ExternalLink aria-hidden="true" className="size-4" /> Add Owner
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">धनी अपडेट लिंक उपलब्ध छैन।</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-2"
              onClick={() => downloadOwnerCsv(filteredOwners)}
              disabled={filteredOwners.length === 0}
            >
              <Download aria-hidden="true" className="size-4" /> Excel निकाल्नुहोस्
            </Button>
            <Button type="button" variant="outline" size="sm" className="h-9 gap-2" onClick={() => void reload()} disabled={isRefreshing}>
              <RefreshCw aria-hidden="true" className={`size-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              ताजा गर्नुहोस्
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="नाम वा फोन नम्बरबाट धनी खोज्नुहोस्"
            aria-label="नाम वा फोन नम्बरबाट धनी खोज्नुहोस्"
            className="h-10 pl-9"
          />
        </div>
        <div className="border-t border-border pt-2 text-xs text-muted-foreground">
          <p aria-live="polite">
            कुल धनी: <span className="font-semibold text-foreground">{toNepaliDigits(ownerGroups.length)}</span>
            {search.trim() ? ` · खोज नतिजा: ${toNepaliDigits(filteredOwners.length)}` : ''}
            {' · सवारी: '}{toNepaliDigits(vehicleCount)}
          </p>
          <p className="mt-1">स्रोत: TQMS synced VehicleResource · Narayani Sangh Hetauda · {lastSyncLabel(lastSyncedAt)}</p>
        </div>
      </Card>

      {error ? (
        <Card role="alert" className="p-4 text-sm text-destructive">
          सवारी धनी विवरण लोड गर्न सकिएन: {error}
          <Button type="button" variant="link" size="sm" onClick={() => void reload()}>फेरि प्रयास गर्नुहोस्</Button>
        </Card>
      ) : isLoading ? (
        <Card className="flex min-h-40 items-center justify-center p-6">
          <LoadingSpinner
            label="सवारी धनी विवरण लोड हुँदैछ..."
            description="TQMS synced data पढिँदैछ।"
          />
        </Card>
      ) : (
        <Card className="space-y-3 overflow-hidden rounded-lg border-border/80 p-3 shadow-sm sm:p-4">
          <Table className="min-w-[980px]">
              <TableHeader>
                <TableRow>
                  <TableHead>नाम</TableHead>
                  <TableHead>धनी प्रकार</TableHead>
                  <TableHead>फोन नम्बर</TableHead>
                  <TableHead>ठेगाना</TableHead>
                  <TableHead className="text-center">कुल सवारी</TableHead>
                  <TableHead className="text-right">कार्य</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageOwners.map((owner) => (
                  <Fragment key={owner.key}>
                    <TableRow className="align-middle">
                      <TableCell className="max-w-64 font-medium">{owner.name}</TableCell>
                      <TableCell>{owner.type || '—'}</TableCell>
                      <TableCell className="whitespace-nowrap">{owner.phone || '—'}</TableCell>
                      <TableCell className="max-w-72">{owner.address || '—'}</TableCell>
                      <TableCell className="text-center tabular-nums">{toNepaliDigits(owner.vehicles.length)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 gap-2"
                          aria-expanded={expandedOwner === owner.key}
                          onClick={() => setExpandedOwner((current) => current === owner.key ? null : owner.key)}
                        >
                          <CarFront aria-hidden="true" className="size-4" />
                          {expandedOwner === owner.key ? 'लुकाउनुहोस्' : 'सवारी हेर्नुहोस्'}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedOwner === owner.key ? (
                      <TableRow className="bg-muted/20 hover:bg-muted/20">
                        <TableCell colSpan={6} className="p-3">
                          <h3 className="mb-2 text-xs font-semibold">{owner.name} का सवारीहरू</h3>
                          <Table className="text-xs">
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="h-9 text-xs">सवारी नम्बर</TableHead>
                                  <TableHead className="h-9 text-xs">सवारी प्रकार</TableHead>
                                  <TableHead className="h-9 text-xs">सवारी ID</TableHead>
                                  <TableHead className="h-9 text-right text-xs">TQMS</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {owner.vehicles.map((vehicle) => (
                                  <TableRow key={vehicle.vehicleId}>
                                    <TableCell className="py-2 font-medium">{vehicle.vehicleNumber || '—'}</TableCell>
                                    <TableCell className="py-2">{vehicle.tqmsVehicleType || '—'}</TableCell>
                                    <TableCell className="py-2">{vehicle.vehicleId}</TableCell>
                                    <TableCell className="py-2 text-right">
                                      <a
                                        href={`https://tqms.bitspanda.com/admin/vehicle/view/${encodeURIComponent(vehicle.vehicleId)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1 text-primary hover:underline"
                                      >
                                        <ExternalLink aria-hidden="true" className="size-3.5" /> हेर्नुहोस्
                                      </a>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                          </Table>
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </Fragment>
                ))}
                {pageOwners.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                      {search ? 'खोजसँग मिल्ने सवारी धनी भेटिएन।' : 'TQMS मा सवारी धनी उपलब्ध छैन।'}
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
          </Table>
          <DataTablePagination
            page={currentPage}
            pageSize={pageSize}
            total={filteredOwners.length}
            onPageChange={setPage}
            formatNumber={toNepaliDigits}
            labels={{
              ariaLabel: 'सवारी धनी सूची पृष्ठ नेभिगेसन',
              showing: 'देखाइँदै',
              of: 'मध्ये',
              page: 'पृष्ठ',
              previousPage: 'अघिल्लो पृष्ठ',
              nextPage: 'अर्को पृष्ठ',
            }}
          />
        </Card>
      )}
    </section>
  );
}
