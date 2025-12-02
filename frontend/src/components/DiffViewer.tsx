import { useMemo } from 'react';

interface DiffViewerProps {
  oldData: Record<string, unknown>;
  newData: Record<string, unknown>;
  oldLabel?: string;
  newLabel?: string;
}

interface DiffResult {
  key: string;
  type: 'added' | 'removed' | 'changed' | 'unchanged';
  oldValue?: unknown;
  newValue?: unknown;
}

export function DiffViewer({
  oldData,
  newData,
  oldLabel = 'Previous',
  newLabel = 'Current',
}: DiffViewerProps) {
  const diff = useMemo(() => {
    const results: DiffResult[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    allKeys.forEach((key) => {
      const oldValue = oldData[key];
      const newValue = newData[key];

      if (!(key in oldData)) {
        results.push({ key, type: 'added', newValue });
      } else if (!(key in newData)) {
        results.push({ key, type: 'removed', oldValue });
      } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        results.push({ key, type: 'changed', oldValue, newValue });
      } else {
        results.push({ key, type: 'unchanged', oldValue, newValue });
      }
    });

    return results.sort((a, b) => {
      const order = { removed: 0, changed: 1, added: 2, unchanged: 3 };
      return order[a.type] - order[b.type];
    });
  }, [oldData, newData]);

  const stats = useMemo(() => {
    return {
      added: diff.filter((d) => d.type === 'added').length,
      removed: diff.filter((d) => d.type === 'removed').length,
      changed: diff.filter((d) => d.type === 'changed').length,
      unchanged: diff.filter((d) => d.type === 'unchanged').length,
    };
  }, [diff]);

  const formatValue = (value: unknown): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  return (
    <div className="space-y-4">
      {/* Stats Summary */}
      <div className="flex gap-4 text-sm">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-green-500"></span>
          {stats.added} added
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          {stats.removed} removed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
          {stats.changed} changed
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded-full bg-gray-300"></span>
          {stats.unchanged} unchanged
        </span>
      </div>

      {/* Diff Table */}
      <div className="border rounded-lg overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-3 bg-muted/50 border-b">
          <div className="px-4 py-2 font-medium text-sm">Field</div>
          <div className="px-4 py-2 font-medium text-sm border-l">{oldLabel}</div>
          <div className="px-4 py-2 font-medium text-sm border-l">{newLabel}</div>
        </div>

        {/* Rows */}
        <div className="divide-y">
          {diff.map((item) => (
            <div
              key={item.key}
              className={`grid grid-cols-3 ${
                item.type === 'added'
                  ? 'bg-green-50'
                  : item.type === 'removed'
                  ? 'bg-red-50'
                  : item.type === 'changed'
                  ? 'bg-yellow-50'
                  : ''
              }`}
            >
              {/* Key */}
              <div className="px-4 py-2 font-mono text-sm flex items-center gap-2">
                {item.type === 'added' && (
                  <span className="text-green-600 font-bold">+</span>
                )}
                {item.type === 'removed' && (
                  <span className="text-red-600 font-bold">−</span>
                )}
                {item.type === 'changed' && (
                  <span className="text-yellow-600 font-bold">~</span>
                )}
                {item.key}
              </div>

              {/* Old Value */}
              <div className="px-4 py-2 font-mono text-sm border-l break-all">
                {item.type !== 'added' && (
                  <span className={item.type === 'removed' ? 'text-red-600' : ''}>
                    {formatValue(item.oldValue)}
                  </span>
                )}
              </div>

              {/* New Value */}
              <div className="px-4 py-2 font-mono text-sm border-l break-all">
                {item.type !== 'removed' && (
                  <span className={item.type === 'added' ? 'text-green-600' : ''}>
                    {formatValue(item.newValue)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {diff.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          No differences found
        </div>
      )}
    </div>
  );
}