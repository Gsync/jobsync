import { RadialChartComponent } from "../RadialChart";
import { SheetDescription } from "../ui/sheet";
import { JobMatchResponse } from "@/models/ai.model";
import type { DeepPartial } from "ai";
import { Badge } from "../ui/badge";

const SectionHeader = ({ title }: { title: string }) => (
  <h2 className="font-semibold mb-2 mt-4">{title}</h2>
);

const ListItem = ({ children }: { children: React.ReactNode }) => (
  <li className="ml-4 mb-1">{children}</li>
);

export const AiJobMatchResponseContent = ({
  content,
  isStreaming,
}: {
  content: DeepPartial<JobMatchResponse> | null | undefined;
  isStreaming?: boolean;
}) => {
  if (!content) return null;

  const {
    matchScore,
    recommendation,
    requirements,
    skills,
    experience,
    keywords,
    dealBreakers,
    tailoringTips,
    summary,
  } = content;

  return (
    <>
      {matchScore !== undefined && (
        <div className="pt-2 flex flex-col items-center">
          <RadialChartComponent score={matchScore} />
          {recommendation && (
            <Badge
              variant={
                recommendation === "strong match"
                  ? "default"
                  : recommendation === "good match"
                    ? "secondary"
                    : recommendation === "partial match"
                      ? "outline"
                      : "destructive"
              }
              className="mt-2 capitalize"
            >
              {recommendation}
            </Badge>
          )}
        </div>
      )}

      {summary && (
        <div>
          <SectionHeader title="Summary" />
          <SheetDescription>{summary}</SheetDescription>
        </div>
      )}

      {requirements && (
        <>
          {requirements.met && requirements.met.length > 0 && (
            <>
              <SectionHeader title="Requirements Met" />
              <ul className="text-sm text-muted-foreground">
                {requirements.met.map(
                  (req, i) =>
                    req && (
                      <ListItem key={i}>
                        <strong>{req.requirement}</strong>: {req.evidence}
                      </ListItem>
                    ),
                )}
              </ul>
            </>
          )}
          {requirements.partial && requirements.partial.length > 0 && (
            <>
              <SectionHeader title="Partial Matches" />
              <ul className="text-sm text-muted-foreground">
                {requirements.partial.map(
                  (req, i) =>
                    req && (
                      <ListItem key={i}>
                        <strong>{req.requirement}</strong>: {req.evidence}{" "}
                        <span className="text-amber-600">(Gap: {req.gap})</span>
                      </ListItem>
                    ),
                )}
              </ul>
            </>
          )}
          {requirements.missing && requirements.missing.length > 0 && (
            <>
              <SectionHeader title="Missing Requirements" />
              <ul className="text-sm text-muted-foreground">
                {requirements.missing.map(
                  (req, i) =>
                    req && (
                      <ListItem key={i}>
                        <strong>{req.requirement}</strong>{" "}
                        <Badge
                          variant={
                            req.importance === "required"
                              ? "destructive"
                              : "outline"
                          }
                          className="text-xs mx-1"
                        >
                          {req.importance}
                        </Badge>
                        <br />
                        <span className="text-muted-foreground text-sm">
                          Suggestion: {req.suggestion}
                        </span>
                      </ListItem>
                    ),
                )}
              </ul>
            </>
          )}
        </>
      )}

      {skills && (
        <>
          <SectionHeader title="Skills Analysis" />
          <div className="text-sm text-muted-foreground">
            {skills.matched && skills.matched.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Matched: </span>
                {skills.matched.filter(Boolean).join(", ")}
              </div>
            )}
            {skills.transferable && skills.transferable.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Transferable: </span>
                {skills.transferable.filter(Boolean).join(", ")}
              </div>
            )}
            {skills.missing && skills.missing.length > 0 && (
              <div className="mb-2 text-amber-600">
                <span className="font-medium">Missing: </span>
                {skills.missing.filter(Boolean).join(", ")}
              </div>
            )}
            {skills.bonus && skills.bonus.length > 0 && (
              <div className="mb-2 text-green-600">
                <span className="font-medium">Bonus Skills: </span>
                {skills.bonus.filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </>
      )}

      {experience && (
        <>
          <SectionHeader title="Experience" />
          <div className="text-sm text-muted-foreground space-y-1">
            {experience.levelMatch && (
              <div>
                <span className="font-medium">Level: </span>
                <span className="capitalize">{experience.levelMatch}</span>
              </div>
            )}
            {experience.yearsRequired !== undefined && (
              <div>
                <span className="font-medium">Years Required: </span>
                {experience.yearsRequired ?? "Not specified"}
              </div>
            )}
            {experience.yearsApparent !== undefined && (
              <div>
                <span className="font-medium">Your Experience: </span>
                {experience.yearsApparent} years
              </div>
            )}
            {experience.relevance && (
              <div>
                <span className="font-medium">Relevance: </span>
                <span className="capitalize">{experience.relevance}</span>
              </div>
            )}
          </div>
        </>
      )}

      {keywords && (
        <>
          <SectionHeader title="Keywords" />
          <div className="text-sm text-muted-foreground">
            {keywords.matched && keywords.matched.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Found: </span>
                {keywords.matched.filter(Boolean).join(", ")}
              </div>
            )}
            {keywords.missing && keywords.missing.length > 0 && (
              <div className="mb-2 text-amber-600">
                <span className="font-medium">Missing: </span>
                {keywords.missing.filter(Boolean).join(", ")}
              </div>
            )}
            {keywords.addToResume && keywords.addToResume.length > 0 && (
              <div className="mb-2">
                <span className="font-medium">Add to Resume: </span>
                {keywords.addToResume.filter(Boolean).join(", ")}
              </div>
            )}
          </div>
        </>
      )}

      {dealBreakers && dealBreakers.length > 0 && (
        <>
          <SectionHeader title="Deal Breakers" />
          <ul className="text-sm text-red-600">
            {dealBreakers.map(
              (item, i) => item && <ListItem key={i}>{item}</ListItem>,
            )}
          </ul>
        </>
      )}

      {tailoringTips && tailoringTips.length > 0 && (
        <>
          <SectionHeader title="Tailoring Tips" />
          <ul className="text-sm text-muted-foreground">
            {tailoringTips.map(
              (tip, i) =>
                tip && (
                  <ListItem key={i}>
                    <strong>{tip.section}:</strong> {tip.action}
                  </ListItem>
                ),
            )}
          </ul>
        </>
      )}

      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Streaming response...</span>
        </div>
      )}
    </>
  );
};
