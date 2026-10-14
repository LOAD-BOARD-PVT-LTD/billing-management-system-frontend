'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { LoaderCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { SearchableComboboxItem } from '@/components/ui/SearchableCombobox/SearchableComboboxItem';

type SearchableComboboxProps<T> = {
	id: string;
	value: string;
	open: boolean;
	items: T[];
	selectedKey?: string | null;
	placeholder: string;
	emptyMessage: string;
	isLoading?: boolean;
	errorMessage?: string | null;
	filterItems?: boolean;
	minimumQueryLength?: number;
	className?: string;
	inputClassName?: string;
	getKey: (item: T) => string;
	getSearchText: (item: T) => string;
	onValueChange: (value: string) => void;
	onOpenChange: (open: boolean) => void;
	onSelect: (item: T) => void;
	renderItem: (item: T, isSelected: boolean) => ReactNode;
};

export function SearchableCombobox<T>({
	id,
	value,
	open,
	items,
	selectedKey = null,
	placeholder,
	emptyMessage,
	isLoading = false,
	errorMessage = null,
	filterItems = true,
	minimumQueryLength = 2,
	className = '',
	inputClassName = '',
	getKey,
	getSearchText,
	onValueChange,
	onOpenChange,
	onSelect,
	renderItem,
}: SearchableComboboxProps<T>) {
	const [activeIndex, setActiveIndex] = useState(0);
	const query = value.trim().toLocaleLowerCase();
	const results = useMemo(() => {
		if (query.length < minimumQueryLength) return [];
		if (!filterItems) return items;
		return items.filter((item) => getSearchText(item).toLocaleLowerCase().includes(query));
	}, [filterItems, getSearchText, items, minimumQueryLength, query]);
	const expanded = open && query.length >= minimumQueryLength;
	const listId = `${id}-listbox`;
	const activeOptionId = expanded && results[activeIndex] ? `${id}-option-${activeIndex}` : undefined;

	const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
		if (event.key === 'Escape') {
			onOpenChange(false);
			return;
		}

		if (event.key === 'ArrowDown' && results.length > 0) {
			event.preventDefault();
			onOpenChange(true);
			setActiveIndex((index) => (index + 1) % results.length);
			return;
		}

		if (event.key === 'ArrowUp' && results.length > 0) {
			event.preventDefault();
			onOpenChange(true);
			setActiveIndex((index) => (index - 1 + results.length) % results.length);
			return;
		}

		if (event.key === 'Enter' && expanded && results[activeIndex]) {
			event.preventDefault();
			onSelect(results[activeIndex]);
		}
	};

	return (
		<div
			className={`relative min-w-0 ${className}`}
			onBlur={(event) => {
				if (!event.currentTarget.contains(event.relatedTarget as Node | null)) onOpenChange(false);
			}}
		>
			<Input
				id={id}
				value={value}
				onChange={(event) => {
					onValueChange(event.target.value);
					setActiveIndex(0);
					onOpenChange(true);
				}}
				onFocus={() => onOpenChange(true)}
				onKeyDown={handleKeyDown}
				placeholder={placeholder}
				className={inputClassName}
				autoComplete="off"
				role="combobox"
				aria-expanded={expanded}
				aria-controls={listId}
				aria-activedescendant={activeOptionId}
				aria-autocomplete="list"
			/>
			{expanded && (
				<div
					id={listId}
					role="listbox"
					className="absolute inset-x-0 top-[calc(100%+6px)] z-50 max-h-72 overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-lg"
				>
					{isLoading ? (
						<div className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted-foreground" role="status">
							<LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
							<span>खोजी हुँदैछ...</span>
						</div>
					) : errorMessage ? (
						<p role="alert" className="px-3 py-4 text-center text-sm text-destructive">{errorMessage}</p>
					) : results.length > 0 ? results.map((item, index) => {
						const key = getKey(item);
						const isSelected = key === selectedKey;
						return (
							<SearchableComboboxItem
								key={key}
								id={`${id}-option-${index}`}
								isActive={activeIndex === index}
								isSelected={isSelected}
								onActivate={() => setActiveIndex(index)}
								onSelect={() => onSelect(item)}
							>
								{renderItem(item, isSelected)}
							</SearchableComboboxItem>
						);
					}) : (
						<p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyMessage}</p>
					)}
				</div>
			)}
		</div>
	);
}
