import { ExternalLink } from "lucide-react";
import { companyBoardUrl } from "@/lib/atsBoardUrl";
import { PROVIDER_META } from "@/components/automations/ats-search-step/types";
import type { Company } from "@/models/job.model";
import type { JobBoard, LeverHost } from "@/models/automation.model";

// A watched row may have no board (a company watched from the Library), so the
// cell degrades to an em dash rather than building a URL from a null token.
export function BoardCell({ company }: { company: Company }) {
  if (!company.atsToken || !company.atsProvider) {
    return <span className="text-muted-foreground">—</span>;
  }
  const provider = company.atsProvider as JobBoard;
  return (
    <span className="flex items-center gap-1.5">
      <span className="text-muted-foreground">
        {PROVIDER_META[provider].label} {company.atsToken}
      </span>
      <a
        href={companyBoardUrl(provider, {
          token: company.atsToken,
          host: (company.atsHost as LeverHost) ?? undefined,
        })}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${company.label} job board`}
        title="Open job board"
        className="text-muted-foreground hover:text-foreground"
      >
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </span>
  );
}
