import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type QuestionTagBadgeProps = {
  variant?: "default" | "secondary";
  className?: string;
  children: React.ReactNode;
};

export function QuestionTagBadge({
  variant = "secondary",
  className,
  children,
}: QuestionTagBadgeProps) {
  return (
    <Badge variant={variant} className={cn("text-xs", className)}>
      {children}
    </Badge>
  );
}
