import { Spinner } from "@/components/ui/spinner";

const Loading = () => (
  <span className="inline-flex items-center justify-center text-primary" data-testid="loader">
    <Spinner />
  </span>
);

export default Loading;
