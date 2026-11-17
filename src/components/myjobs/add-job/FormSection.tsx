import { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FormSectionProps = {
  id: string;
  title: string;
  muted?: boolean;
  children: ReactNode;
};

export function FormSection({ id, title, muted, children }: FormSectionProps) {
  return (
    <section
      aria-labelledby={`${id}-heading`}
      className={cn("space-y-4", muted && "rounded-lg border bg-muted/40 p-5")}
    >
      <h3
        id={`${id}-heading`}
        className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}
