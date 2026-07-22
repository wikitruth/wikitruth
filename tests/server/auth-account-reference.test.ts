jest.mock('../../server/src/app', () => ({ db: { models: {} } }));

import { getAccountIdFromUser } from '../../server/src/controllers/api/authHelpers';

describe('authentication account references', () => {
  it('uses ObjectId hex text rather than its internal Buffer id', () => {
    const objectId = {
      id: Buffer.from('6a60e1869512ca624c9ece9b', 'hex'),
      toHexString: () => '6a60e1869512ca624c9ece9b',
    };

    expect(getAccountIdFromUser({ roles: { account: objectId } })).toBe(
      '6a60e1869512ca624c9ece9b'
    );
  });

  it('supports populated account documents and legacy string references', () => {
    expect(getAccountIdFromUser({
      roles: { account: { _id: { toHexString: () => '6a60e1869512ca624c9ece9c' } } },
    })).toBe('6a60e1869512ca624c9ece9c');
    expect(getAccountIdFromUser({ roles: { account: 'account-1' } })).toBe('account-1');
  });
});
