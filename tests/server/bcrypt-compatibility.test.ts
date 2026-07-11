import bcrypt from 'bcrypt';

describe('bcrypt runtime compatibility', () => {
  it('hashes and verifies account passwords', async () => {
    const hash = await bcrypt.hash('correct horse battery staple', 4);

    await expect(bcrypt.compare('correct horse battery staple', hash)).resolves.toBe(true);
    await expect(bcrypt.compare('incorrect password', hash)).resolves.toBe(false);
  });
});
