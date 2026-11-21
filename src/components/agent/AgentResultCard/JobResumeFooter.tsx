import Link from "next/link";
import type { AgentCoverLetterResult, AgentMatchJobResult } from "@/models/agent.model";

type Props = {
  output: Extract<AgentMatchJobResult | AgentCoverLetterResult, { status: "ok" }>;
  relation: "matched against" | "drawn from";
};

export function JobResumeFooter({ output, relation }: Props) {
  const linkClass = "font-medium underline hover:text-foreground";

  return (
    <p className="mt-2 text-xs text-muted-foreground">
      <Link href={`/dashboard/myjobs/${output.jobId}`} className={linkClass}>
        {output.jobTitle}
      </Link>
      {output.company ? ` at ${output.company}` : ""} · {relation}{" "}
      <Link href={`/dashboard/profile/resume/${output.resumeId}`} className={linkClass}>
        {output.resumeTitle}
      </Link>
    </p>
  );
}
