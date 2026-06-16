import { TemplateSummaryProvider } from '../src/engine/summary/TemplateSummaryProvider.js';
import { defaultConfig } from '../src/config/defaultMapping.js';

const provider = new TemplateSummaryProvider();

describe('TemplateSummaryProvider', () => {
  it('matches the brief example structure', () => {
    const metrics = {
      towed: 42,
      paid: 97,
      encoded: 158,
      csCases: 34,
      netRemit: 185000,
      refundsProcessedCount: 3,
      refundsPendingCount: 2,
      expenses: 25000,
    };
    const text = provider.generate(metrics, defaultConfig);
    expect(text).toContain('42 illegal parkers were towed');
    expect(text).toContain('158 violations were encoded into Parkpliant');
    expect(text).toContain('97 successfully paid');
    expect(text).toContain('Customer service handled 34 inquiries');
    expect(text).toContain('Net remittance reached $185,000');
    expect(text).toContain('3 refunds were approved and processed while 2 remain pending');
    expect(text).toContain('Total operating expenses amounted to $25,000');
  });

  it('omits zero-value clauses and pluralizes correctly', () => {
    const metrics = {
      towed: 1,
      paid: 0,
      encoded: 1,
      csCases: 0,
      netRemit: 0,
      refundsProcessedCount: 1,
      refundsPendingCount: 0,
      expenses: 0,
    };
    const text = provider.generate(metrics, defaultConfig);
    expect(text).toContain('1 illegal parker was towed');
    expect(text).not.toMatch(/0 /);
    expect(text).not.toContain('Customer service');
    expect(text).not.toContain('Net remittance');
    expect(text).toContain('1 refund was approved and processed');
    expect(text).not.toContain('pending');
  });

  it('handles empty data gracefully', () => {
    const text = provider.generate({}, defaultConfig);
    expect(text).toMatch(/No reportable activity/);
  });
});
