import { parseCsv, CsvParseError } from '../src/services/csvParser.js';

describe('parseCsv', () => {
  it('parses a clean CSV into headers + row objects', () => {
    const { headers, rows, warnings } = parseCsv('Date,Status\n2026-06-01,Encoded');
    expect(headers).toEqual(['Date', 'Status']);
    expect(rows).toEqual([{ Date: '2026-06-01', Status: 'Encoded' }]);
    expect(warnings).toEqual([]);
  });

  it('strips a UTF-8 BOM from the first header', () => {
    const { headers } = parseCsv('﻿Date,Status\n2026-06-01,Encoded');
    expect(headers[0]).toBe('Date');
  });

  it('drops blank (trailing-comma) header columns', () => {
    const { headers, rows } = parseCsv('Date,Status,,\n2026-06-01,Encoded,,');
    expect(headers).toEqual(['Date', 'Status']);
    expect(Object.keys(rows[0])).toEqual(['Date', 'Status']);
  });

  it('de-duplicates repeated headers (keeps the first) and warns', () => {
    const { headers, rows, warnings } = parseCsv('Amount,Amount\n10,20');
    expect(headers).toEqual(['Amount']);
    expect(rows[0]).toEqual({ Amount: '10' });
    expect(warnings[0]).toMatch(/Duplicate column header/);
  });

  it('throws on an empty file', () => {
    expect(() => parseCsv('')).toThrow(CsvParseError);
  });

  it('throws when there are headers but no data rows', () => {
    expect(() => parseCsv('Date,Status')).toThrow(/no data rows/i);
  });
});
