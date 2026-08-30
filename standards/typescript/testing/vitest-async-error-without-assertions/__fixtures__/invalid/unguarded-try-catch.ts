it('fails', async () => {
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});
