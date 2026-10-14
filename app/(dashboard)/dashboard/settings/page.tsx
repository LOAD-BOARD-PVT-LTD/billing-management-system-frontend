import { Suspense } from 'react';

import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { AdminSettingsPage } from '@/features/settings/components/AdminSettingsPage';

export default function SettingsRoute() {
	return (
		<Suspense fallback={<LoadingSpinner label="सेटिङ लोड हुँदैछ" />}>
			<AdminSettingsPage />
		</Suspense>
	);
}
