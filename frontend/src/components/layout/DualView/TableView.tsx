import React from 'react';
import { Card, CardContent } from '@/components/common';

export interface TableColumn<T> {
  key: string;
  label: string;
  width?: string;
  className?: string;
  render?: (item: T, index: number) => React.ReactNode;
  headerClassName?: string;
}

export interface TableViewProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  rowKey: (item: T) => string | number;
  onRowClick?: (item: T) => void;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  rowClassName?: (item: T) => string;
}

// TableView.tsx modifications
export function TableView<T>({
  data,
  columns,
  rowKey,
  onRowClick,
  className = '',
  rowClassName,
}: TableViewProps<T>) {
  return (
    <div className={`bg-white border border-[#dfe1e6] rounded-md overflow-x-auto shadow-sm ${className}`}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-[#fafbfc] border-b border-[#dfe1e6]">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`text-left py-2 px-4 font-bold text-[12px] text-[#5e6c84] uppercase tracking-wider border-r border-[#dfe1e6] last:border-r-0 ${column.headerClassName || ''}`}
                style={column.width ? { width: column.width } : undefined}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr
              key={rowKey(item)}
              onClick={() => onRowClick?.(item)}
              className={`group border-b border-[#dfe1e6] last:border-b-0 hover:bg-[#f4f5f7] transition-colors cursor-pointer ${rowClassName ? rowClassName(item) : ''}`}
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={`py-3 px-4 text-[13px] border-r border-[#f4f5f7] group-hover:border-[#dfe1e6] last:border-r-0 ${column.className || ''}`}
                >
                  {column.render ? column.render(item, index) : (item as any)[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}