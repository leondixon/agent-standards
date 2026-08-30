const { data } = useQuery({ queryKey: ['x'], queryFn });
const [value, setValue] = useState(data);
