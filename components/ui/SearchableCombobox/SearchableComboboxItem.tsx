'use client';

import type { ReactNode } from 'react';

type SearchableComboboxItemProps = {
	id: string;
	isActive: boolean;
	isSelected: boolean;
	onSelect: () => void;
	onActivate: () => void;
	children: ReactNode;
};

export function SearchableComboboxItem({
	id,
	isActive,
	isSelected,
	onSelect,
	onActivate,
	children,
}: SearchableComboboxItemProps) {
	return (
		<button
			id={id}
			type="button"
			role="option"
			aria-selected={isSelected}
			onMouseDown={(event) => event.preventDefault()}
			onMouseEnter={onActivate}
			onClick={onSelect}
			className={`flex w-full items-center justify-between gap-3 rounded-sm px-3 py-2.5 text-left text-sm outline-none transition-colors ${
				isActive ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/60'
			}`}
		>
			{children}
		</button>
	);
}
