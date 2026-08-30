it('fails', async () => {
  await expect(fn()).rejects.toThrow('boom');
});
