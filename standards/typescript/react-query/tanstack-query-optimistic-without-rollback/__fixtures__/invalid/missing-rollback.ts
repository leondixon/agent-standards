useMutation({
  onMutate() {
    queryClient.setQueryData(['x'], next);
  },
});
