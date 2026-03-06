'use client';

import * as XLSX from 'xlsx';

type Column = { key: string; label: string };

/**
 * Download an array of row objects as an XLSX file.
 *
 * - Photo/array columns are joined as comma-separated URLs.
 * - A "Sl No." column is auto-prepended.
 */
export function downloadXlsx<T extends object>(
    rows: T[],
    columns: Column[],
    filename: string,
) {
    const headers = ['Sl No.', ...columns.map((c) => c.label)];

    const data = rows.map((row, idx) => {
        const r = row as Record<string, unknown>;
        const mapped: Record<string, unknown> = { 'Sl No.': idx + 1 };
        for (const col of columns) {
            const value = r[col.key];
            if (Array.isArray(value)) {
                mapped[col.label] = (value as string[]).join(', ');
            } else {
                mapped[col.label] = value ?? '';
            }
        }
        return mapped;
    });

    const ws = XLSX.utils.json_to_sheet(data, { header: headers });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Data');
    XLSX.writeFile(wb, `${filename}.xlsx`);
}
