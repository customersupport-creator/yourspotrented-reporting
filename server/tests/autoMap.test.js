import { autoMapHeaders } from '../src/services/autoMap.js';
import { defaultConfig } from '../src/config/defaultMapping.js';

describe('autoMapHeaders — tow-log fields', () => {
  it('binds the real tow-log columns', () => {
    const headers = [
      'DATE', 'FACILITY', 'TOWING COMPANY', 'LICENSE PLATE',
      'TOW TIME REQUEST', 'TOWED TIME', 'REQUESTED BY', 'RESELL STATUS', 'REMARKS',
    ];
    const { columnMap } = autoMapHeaders(headers, defaultConfig.columnMap);
    expect(columnMap.towingCompany).toBe('TOWING COMPANY');
    expect(columnMap.licensePlate).toBe('LICENSE PLATE');
    expect(columnMap.date).toBe('DATE');
  });

  it('does not bind tow-log fields when absent', () => {
    const { columnMap } = autoMapHeaders(['Date', 'Violation Status', 'Payment Status'], defaultConfig.columnMap);
    expect(columnMap.towingCompany).toBe('');
    expect(columnMap.licensePlate).toBe('');
  });
});
