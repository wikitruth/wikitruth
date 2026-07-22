jest.mock('../../server/src/app', () => ({ db: { models: {} } }));

import { hashRecoveryCode } from '../../server/src/services/recoveryCodeService';

describe('recovery-code hashing', () => {
  it('normalizes presentation separators without weakening case handling', () => {
    const formatted = hashRecoveryCode('WT-ABCD-EFGH-IJKL-MNOP');
    expect(formatted).toMatch(/^[a-f\d]{64}$/);
    expect(formatted).toBe(hashRecoveryCode('wtabcdefghijklmnop'));
    expect(formatted).not.toBe(hashRecoveryCode('WT-ABCD-EFGH-IJKL-MNOQ'));
  });
});
