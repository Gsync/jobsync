import { Loader } from "lucide-react";

const Loading = () => {
  return (
    <div className="flex items-center justify-center">
      <Loader className="animate-spin text-blue-500" size={48} />
    </div>
  );
};

export default Loading;
