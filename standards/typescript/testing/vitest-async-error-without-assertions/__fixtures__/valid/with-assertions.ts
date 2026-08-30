it('fails', async () => {
  expect.assertions(1);
  try {
    await fn();
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
  }
});
