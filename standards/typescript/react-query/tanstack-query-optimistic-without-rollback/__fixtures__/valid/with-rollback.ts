useMutation({
  onMutate() {
    const previous = queryClient.getQueryData(['x']);
    return { previous };
  },
  onError(_err, _vars, context) {
    queryClient.setQueryData(['x'], context.previous);
  },
});
