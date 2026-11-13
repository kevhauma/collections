// CSV for the export (TICKET-BAK-01): RFC 4180 quoting, CRLF rows, and a UTF-8 BOM so Excel reads accents. No
// dependency for a few lines.

const bom = "﻿";

// A cell starting with one of these is a formula to a spreadsheet, so it gets a leading ' (CSV injection). Restore
// reads data.json, never the CSVs, so the altered text doesn't matter.
const formulaStart = /^[=+\-@]/;

const cell = (value: string): string => {
  const text = formulaStart.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

export const toCsv = (rows: string[][]): string => bom + rows.map((row) => row.map(cell).join(",")).join("\r\n") + "\r\n";
