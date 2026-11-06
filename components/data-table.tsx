"use client"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
import {
  flexRender,
  tableFeatures,
  createCoreRowModel,
  useTable,
} from "@tanstack/react-table"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

// Must be outside component — v9 requirement
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _features = tableFeatures({ coreRowModel: createCoreRowModel() }) as any

interface DataTableProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  columns: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any[]
  isLoading?: boolean
}

export function DataTable({ columns, data, isLoading }: DataTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const table = useTable({
    _features,
    data,
    columns,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          {(table as any).getHeaderGroups().map((headerGroup: any) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header: any) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                {columns.map((_, j) => (
                  <TableCell key={j}>
                    <Skeleton className="h-4 w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ) : (table as any).getRowModel().rows?.length ? (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (table as any).getRowModel().rows.map((row: any) => (
              <TableRow key={row.id} data-state={row.getIsSelected() && "selected"}>
                {row.getVisibleCells().map((cell: any) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  )
}
