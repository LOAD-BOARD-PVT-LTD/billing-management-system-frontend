import {
  TableBody as TableBodyRaw,
  TableCell as TableCellRaw,
  TableHeader as TableHeaderRaw,
  TableHead as TableHeadRaw,
  Table as TableRaw,
  TableRow as TableRowRaw,
} from '@/components/ui/table';
import { cn } from '@/utils/cn';
import type {
  Cell,
  Column,
  ColumnDef,
  Header,
  HeaderGroup,
  Row,
  SortingState,
  Table,
} from '@tanstack/react-table';
import {
  functionalUpdate,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import { atom, useAtom } from 'jotai';
import { ArrowDownIcon, ArrowUpDownIcon, ArrowUpIcon } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';
import { createContext, useCallback, useContext } from 'react';

export type { ColumnDef } from '@tanstack/react-table';

const sortingAtom = atom<SortingState>([]);

export const TableContext = createContext<{
  data: unknown[];
  columns: ColumnDef<unknown, unknown>[];
  table: Table<unknown> | null;
}>({
  data: [],
  columns: [],
  table: null,
});

export type TableProviderProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  children: ReactNode;
  className?: string;
};

export function TableProvider<TData, TValue>({
  columns,
  data,
  children,
  className,
}: TableProviderProps<TData, TValue>) {
  const [sorting, setSorting] = useAtom(sortingAtom);
                                                              
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: (updater) => {
      setSorting((prev) => functionalUpdate(updater, prev));
    },
    state: {
      sorting,
    },
  });

  return (
    <TableContext.Provider
      value={{
        data,
        columns: columns as never,
        table: table as never,
      }}
    >
      <TableRaw className={className}>{children}</TableRaw>
    </TableContext.Provider>
  );
}

export type TableHeadProps = {
  header: Header<unknown, unknown>;
  className?: string;
};

export function TableHead({ header, className }: TableHeadProps) {
  return (
  <TableHeadRaw className={className} key={header.id}>
    {header.isPlaceholder
      ? null
      : flexRender(header.column.columnDef.header, header.getContext())}
  </TableHeadRaw>
  );
}

TableHead.displayName = 'TableHead';

export type TableHeaderGroupProps = {
  headerGroup: HeaderGroup<unknown>;
  children: (props: { header: Header<unknown, unknown> }) => ReactNode;
};

export const TableHeaderGroup = ({
  headerGroup,
  children,
}: TableHeaderGroupProps) => (
  <TableRowRaw key={headerGroup.id}>
    {headerGroup.headers.map((header) => children({ header }))}
  </TableRowRaw>
);

export type TableHeaderProps = {
  className?: string;
  children: (props: { headerGroup: HeaderGroup<unknown> }) => ReactNode;
};

export const TableHeader = ({ className, children }: TableHeaderProps) => {
  const { table } = useContext(TableContext);

  return (
    <TableHeaderRaw className={className}>
      {table?.getHeaderGroups().map((headerGroup) => children({ headerGroup }))}
    </TableHeaderRaw>
  );
};

export interface TableColumnHeaderProps<TData, TValue>
  extends HTMLAttributes<HTMLDivElement> {
  column: Column<TData, TValue>;
  title: string;
}

export function TableColumnHeader<TData, TValue>({
  column,
  title,
  className,
}: TableColumnHeaderProps<TData, TValue>) {
  const handleSortToggle = useCallback(() => {
    const isSortedAsc = column.getIsSorted() === 'asc';
    column.toggleSorting(isSortedAsc);
  }, [column]);

  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <button
      type="button"
      onClick={handleSortToggle}
      className={cn(
        'flex items-center text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:text-foreground',
        className,
      )}
      aria-label={`Sort by ${title}`}
    >
      <span>{title}</span>
      {column.getIsSorted() === 'desc' ? (
        <ArrowDownIcon className="ml-2 h-4 w-4" />
      ) : column.getIsSorted() === 'asc' ? (
        <ArrowUpIcon className="ml-2 h-4 w-4" />
      ) : (
        <ArrowUpDownIcon className="ml-2 h-4 w-4 opacity-50" />
      )}
    </button>
  );
}

export type TableCellProps = {
  cell: Cell<unknown, unknown>;
  className?: string;
};

export const TableCell = ({ cell, className }: TableCellProps) => (
  <TableCellRaw className={className}>
    {flexRender(cell.column.columnDef.cell, cell.getContext())}
  </TableCellRaw>
);

export type TableRowProps = {
  row: Row<unknown>;
  children: (props: { cell: Cell<unknown, unknown> }) => ReactNode;
  className?: string;
};

export const TableRow = ({ row, children, className }: TableRowProps) => (
  <TableRowRaw
    className={className}
    data-state={row.getIsSelected() && 'selected'}
    key={row.id}
  >
    {row.getVisibleCells().map((cell) => children({ cell }))}
  </TableRowRaw>
);

export type TableBodyProps = {
  children: (props: { row: Row<unknown> }) => ReactNode;
  className?: string;
};

export const TableBody = ({ children, className }: TableBodyProps) => {
  const { columns, table } = useContext(TableContext);
  const rows = table?.getRowModel().rows;

  return (
    <TableBodyRaw className={className}>
      {rows?.length ? (
        rows.map((row) => children({ row }))
      ) : (
        <TableRowRaw>
          <TableCellRaw className="h-24 text-center" colSpan={columns.length}>
            No results.
          </TableCellRaw>
        </TableRowRaw>
      )}
    </TableBodyRaw>
  );
};

