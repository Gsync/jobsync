import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { BADGE_COLORS, BadgeColor } from "@/lib/badge-colors";

interface StatusBadgeProps {
  label: string;
  color: BadgeColor;
  className?: string;
}

// Reusable colored badge; color values are centralized in @/lib/badge-colors
export function StatusBadge({ label, color, className }: StatusBadgeProps) {
  return (
    <Badge className={cn(BADGE_COLORS[color], className)}>{label}</Badge>
  );
}
