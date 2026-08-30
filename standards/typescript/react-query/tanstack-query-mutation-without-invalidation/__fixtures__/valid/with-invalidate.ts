useMutation({
  mutationFn,
  onSuccess() {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  },
});
