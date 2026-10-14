import { OrganizationDirectory } from '@/features/platform/components/OrganizationDirectory';

export default async function OrganizationsPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search = '' } = await searchParams;
  return <OrganizationDirectory initialSearch={search} />;
}