import * as React from 'react'
import { ChevronsUpDown, ChevronUp, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

const Table = React.forwardRef<HTMLTableElement, React.HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="relative w-full overflow-auto">
      <table ref={ref} className={cn('app-table caption-bottom text-sm', className)} {...props} />
    </div>
  )
)
Table.displayName = 'Table'

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn('[&_tr]:border-b [&_tr]:border-border', className)} {...props} />
))
TableHeader.displayName = 'TableHeader'

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />
))
TableBody.displayName = 'TableBody'

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn('border-t border-border bg-muted/50 font-medium [&>tr]:last:border-b-0', className)}
    {...props}
  />
))
TableFooter.displayName = 'TableFooter'

export interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  clickable?: boolean
  selected?: boolean
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, clickable = false, selected = false, ...props }, ref) => (
    <tr
      ref={ref}
      data-clickable={clickable ? '' : undefined}
      data-selected={selected ? 'true' : undefined}
      className={cn(
        'border-b border-border/50',
        className
      )}
      {...props}
    />
  )
)
TableRow.displayName = 'TableRow'

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      'h-9 px-4 text-start align-middle text-xs font-semibold text-muted-foreground [&:has([role=checkbox])]:pe-0',
      className
    )}
    {...props}
  />
))
TableHead.displayName = 'TableHead'

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn('px-4 py-3 align-middle text-sm [&:has([role=checkbox])]:pe-0', className)}
    {...props}
  />
))
TableCell.displayName = 'TableCell'

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn('mt-4 text-sm text-muted-foreground', className)}
    {...props}
  />
))
TableCaption.displayName = 'TableCaption'

export type SortDirection = 'asc' | 'desc' | null

interface TableSortHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  sortable?: boolean
  sortDirection?: SortDirection
  onSort?: () => void
}

const TableSortHead = React.forwardRef<HTMLTableCellElement, TableSortHeadProps>(
  ({ className, sortable, sortDirection, onSort, children, ...props }, ref) => (
    <th
      ref={ref}
      data-sortable={sortable ? '' : undefined}
      data-sort={sortDirection ?? undefined}
      className={cn(
        'h-9 px-4 text-start align-middle text-xs font-semibold text-muted-foreground',
        sortable && 'select-none',
        sortDirection && 'text-primary/90',
        '[&:has([role=checkbox])]:pe-0',
        className
      )}
      {...props}
    >
      {sortable ? (
        <button type="button" className="table-sort-button" onClick={onSort}>
          {children}
          {sortDirection === 'asc' ? (
            <ChevronUp className="h-3 w-3 text-primary" />
          ) : sortDirection === 'desc' ? (
            <ChevronDown className="h-3 w-3 text-primary" />
          ) : (
            <ChevronsUpDown className="h-3 w-3 opacity-35" />
          )}
        </button>
      ) : (
        <span className="inline-flex items-center gap-1">{children}</span>
      )}
    </th>
  )
)
TableSortHead.displayName = 'TableSortHead'

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, TableSortHead }
