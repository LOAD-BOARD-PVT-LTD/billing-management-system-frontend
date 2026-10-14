import { EmptyState, type EmptyStateProps } from '@/components/feedback/EmptyState';

export type DataTableEmptyProps = Omit<EmptyStateProps, 'title'> & {
	title?: string;
};

export function DataTableEmpty({ title = 'No results found', ...props }: DataTableEmptyProps) {
	return <EmptyState title={title} {...props} />;
}
