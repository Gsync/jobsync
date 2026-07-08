import { CardHeader } from "./ui/card";
import { cn } from "@/lib/utils";

function ResponsiveCardHeader({
  className,
  ...props
}: React.ComponentProps<typeof CardHeader>) {
  return (
    <CardHeader
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      {...props}
    />
  );
}

export { ResponsiveCardHeader };
