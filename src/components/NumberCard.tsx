import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface NumberCardProps {
  label: string;
  num: number;
  desc: string;
  progress: number;
}

export default function NumberCard({
  label,
  num,
  desc,
  progress,
}: NumberCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-4xl">{num}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </CardContent>
      <CardFooter>
        <Progress value={progress} aria-label="25% increase" />
      </CardFooter>
    </Card>
  );
}
