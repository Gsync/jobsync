import { RadialChartComponent } from "../RadialChart";
import { SheetDescription } from "../ui/sheet";
import { ResumeReviewResponse } from "@/models/ai.model";
import type { DeepPartial } from "ai";
import { Badge } from "../ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../ui/accordion";
import { CheckCircle, XCircle, AlertTriangle, ArrowRight } from "lucide-react";

// SECTION COMPONENTS

const ScoresSection = ({
  scores,
}: {
  scores?: DeepPartial<ResumeReviewResponse["scores"]>;
}) => {
  if (!scores) return null;

  const scoreItems = [
    { label: "Overall", value: scores.overall, color: "bg-blue-500" },
    { label: "Impact", value: scores.impact, color: "bg-green-500" },
    { label: "Clarity", value: scores.clarity, color: "bg-purple-500" },
    { label: "ATS", value: scores.atsCompatibility, color: "bg-orange-500" },
  ];

  return (
    <div className="pt-4">
      {scores.overall !== undefined && (
        <div className="flex justify-center">
          <RadialChartComponent score={scores.overall} />
        </div>
      )}
      <div className="grid grid-cols-4 gap-2 mt-[-40px]">
        {scoreItems.map(
          (item) =>
            item.value !== undefined && (
              <div key={item.label} className="text-center">
                <div className="text-xs text-muted-foreground">
                  {item.label}
                </div>
                <div className="font-semibold">{item.value}</div>
              </div>
            ),
        )}
      </div>
    </div>
  );
};

const SummarySection = ({ summary }: { summary?: string }) => {
  if (!summary) return null;
  return (
    <div className="pt-4">
      <h2 className="font-semibold text-sm">Summary</h2>
      <SheetDescription className="mt-1">{summary}</SheetDescription>
    </div>
  );
};

const AchievementsSection = ({
  achievements,
}: {
  achievements?: DeepPartial<ResumeReviewResponse["achievements"]>;
}) => {
  if (!achievements) return null;
  const { strong, weak, missingMetrics } = achievements;

  const hasContent =
    (strong && strong.length > 0) ||
    (weak && weak.length > 0) ||
    (missingMetrics && missingMetrics.length > 0);

  if (!hasContent) return null;

  return (
    <AccordionItem value="achievements">
      <AccordionTrigger className="text-sm font-semibold">
        Achievements
      </AccordionTrigger>
      <AccordionContent>
        {strong && strong.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-green-600 text-xs font-medium mb-1">
              <CheckCircle className="h-3 w-3" />
              Strong Achievements
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {strong.map((item, i) => item && <li key={i}>- {item}</li>)}
            </ul>
          </div>
        )}
        {weak && weak.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 text-amber-600 text-xs font-medium mb-1">
              <AlertTriangle className="h-3 w-3" />
              Needs Quantification
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {weak.map((item, i) => item && <li key={i}>- {item}</li>)}
            </ul>
          </div>
        )}
        {missingMetrics && missingMetrics.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Suggested Metrics to Add
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {missingMetrics.map(
                (item, i) => item && <li key={i}>- {item}</li>,
              )}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

const KeywordsSection = ({
  keywords,
}: {
  keywords?: DeepPartial<ResumeReviewResponse["keywords"]>;
}) => {
  if (!keywords) return null;
  const { found, missing, overused } = keywords;

  const hasContent =
    (found && found.length > 0) ||
    (missing && missing.length > 0) ||
    (overused && overused.length > 0);

  if (!hasContent) return null;

  return (
    <AccordionItem value="keywords">
      <AccordionTrigger className="text-sm font-semibold">
        Keywords
      </AccordionTrigger>
      <AccordionContent>
        {found && found.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-green-600 mb-1">Found</div>
            <div className="flex flex-wrap gap-1">
              {found.map(
                (kw, i) =>
                  kw && (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {kw}
                    </Badge>
                  ),
              )}
            </div>
          </div>
        )}
        {missing && missing.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-amber-600 mb-1">
              Consider Adding
            </div>
            <div className="flex flex-wrap gap-1">
              {missing.map(
                (kw, i) =>
                  kw && (
                    <Badge key={i} variant="outline" className="text-xs">
                      {kw}
                    </Badge>
                  ),
              )}
            </div>
          </div>
        )}
        {overused && overused.length > 0 && (
          <div>
            <div className="text-xs font-medium text-red-600 mb-1">
              Overused
            </div>
            <div className="flex flex-wrap gap-1">
              {overused.map(
                (kw, i) =>
                  kw && (
                    <Badge key={i} variant="destructive" className="text-xs">
                      {kw}
                    </Badge>
                  ),
              )}
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

const ActionVerbsSection = ({
  actionVerbs,
}: {
  actionVerbs?: DeepPartial<ResumeReviewResponse["actionVerbs"]>;
}) => {
  if (!actionVerbs) return null;
  const { strong, weak, suggestions } = actionVerbs;

  const hasContent =
    (strong && strong.length > 0) ||
    (weak && weak.length > 0) ||
    (suggestions && suggestions.length > 0);

  if (!hasContent) return null;

  return (
    <AccordionItem value="verbs">
      <AccordionTrigger className="text-sm font-semibold">
        Action Verbs
      </AccordionTrigger>
      <AccordionContent>
        {strong && strong.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-green-600 mb-1">
              Strong Verbs
            </div>
            <div className="flex flex-wrap gap-1">
              {strong.map(
                (v, i) =>
                  v && (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {v}
                    </Badge>
                  ),
              )}
            </div>
          </div>
        )}
        {weak && weak.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-amber-600 mb-1">
              Weak Verbs
            </div>
            <div className="flex flex-wrap gap-1">
              {weak.map(
                (v, i) =>
                  v && (
                    <Badge key={i} variant="outline" className="text-xs">
                      {v}
                    </Badge>
                  ),
              )}
            </div>
          </div>
        )}
        {suggestions && suggestions.length > 0 && (
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1">
              Suggestions
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {suggestions.map(
                (s, i) =>
                  s?.replace &&
                  s?.with && (
                    <li key={i} className="flex items-center gap-1">
                      <span className="line-through text-red-500">
                        {s.replace}
                      </span>
                      <ArrowRight className="h-3 w-3" />
                      <span className="text-green-600">{s.with}</span>
                    </li>
                  ),
              )}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

const SectionFeedbackSection = ({
  sectionFeedback,
}: {
  sectionFeedback?: DeepPartial<ResumeReviewResponse["sectionFeedback"]>;
}) => {
  if (!sectionFeedback || Object.keys(sectionFeedback).length === 0)
    return null;

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case "good":
        return <CheckCircle className="h-3 w-3 text-green-600" />;
      case "needsWork":
        return <AlertTriangle className="h-3 w-3 text-amber-600" />;
      case "missing":
        return <XCircle className="h-3 w-3 text-red-600" />;
      default:
        return null;
    }
  };

  return (
    <AccordionItem value="sections">
      <AccordionTrigger className="text-sm font-semibold">
        Section Feedback
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-2">
          {Object.entries(sectionFeedback).map(
            ([section, feedback]) =>
              feedback && (
                <div key={section} className="border-b pb-2 last:border-0">
                  <div className="flex items-center gap-1 font-medium text-sm">
                    {getStatusIcon(feedback.status)}
                    {section}
                  </div>
                  {feedback.feedback && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {feedback.feedback}
                    </p>
                  )}
                </div>
              ),
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

const ATSIssuesSection = ({
  atsIssues,
}: {
  atsIssues?: (string | undefined)[];
}) => {
  if (!atsIssues || atsIssues.length === 0) return null;

  return (
    <AccordionItem value="ats">
      <AccordionTrigger className="text-sm font-semibold">
        ATS Issues
      </AccordionTrigger>
      <AccordionContent>
        <ul className="text-sm text-muted-foreground space-y-1">
          {atsIssues.map(
            (issue, i) =>
              issue && (
                <li key={i} className="flex items-start gap-1">
                  <XCircle className="h-3 w-3 text-red-600 mt-0.5 flex-shrink-0" />
                  {issue}
                </li>
              ),
          )}
        </ul>
      </AccordionContent>
    </AccordionItem>
  );
};

const TopImprovementsSection = ({
  topImprovements,
}: {
  topImprovements?: DeepPartial<ResumeReviewResponse["topImprovements"]>;
}) => {
  if (!topImprovements || topImprovements.length === 0) return null;

  return (
    <AccordionItem value="improvements">
      <AccordionTrigger className="text-sm font-semibold">
        Top Improvements
      </AccordionTrigger>
      <AccordionContent>
        <div className="space-y-3">
          {topImprovements.map(
            (item, i) =>
              item && (
                <div key={i} className="border-l-2 border-primary pl-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      #{item.priority}
                    </Badge>
                    <span className="text-sm font-medium">{item.issue}</span>
                  </div>
                  {item.fix && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.fix}
                    </p>
                  )}
                </div>
              ),
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
};

const GrammarSection = ({
  grammarAndSpelling,
}: {
  grammarAndSpelling?: DeepPartial<ResumeReviewResponse["grammarAndSpelling"]>;
}) => {
  if (!grammarAndSpelling) return null;
  const { errors, punctuationIssues, consistencyIssues } = grammarAndSpelling;

  const hasContent =
    (errors && errors.length > 0) ||
    (punctuationIssues && punctuationIssues.length > 0) ||
    (consistencyIssues && consistencyIssues.length > 0);

  if (!hasContent) return null;

  return (
    <AccordionItem value="grammar">
      <AccordionTrigger className="text-sm font-semibold">
        Grammar & Spelling
      </AccordionTrigger>
      <AccordionContent>
        {errors && errors.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-red-600 mb-1">Errors</div>
            <div className="space-y-2">
              {errors.map(
                (err, i) =>
                  err && (
                    <div key={i} className="text-sm">
                      <span className="line-through text-red-500">
                        {err.text}
                      </span>
                      {err.correction && (
                        <>
                          <ArrowRight className="h-3 w-3 inline mx-1" />
                          <span className="text-green-600">
                            {err.correction}
                          </span>
                        </>
                      )}
                      {err.issue && (
                        <p className="text-xs text-muted-foreground">
                          {err.issue}
                        </p>
                      )}
                    </div>
                  ),
              )}
            </div>
          </div>
        )}
        {punctuationIssues && punctuationIssues.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-medium text-amber-600 mb-1">
              Punctuation
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {punctuationIssues.map((p, i) => p && <li key={i}>- {p}</li>)}
            </ul>
          </div>
        )}
        {consistencyIssues && consistencyIssues.length > 0 && (
          <div>
            <div className="text-xs font-medium text-amber-600 mb-1">
              Consistency
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              {consistencyIssues.map((c, i) => c && <li key={i}>- {c}</li>)}
            </ul>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
};

// MAIN COMPONENT

export const AiResumeReviewResponseContent = ({
  content,
  isStreaming,
}: {
  content: DeepPartial<ResumeReviewResponse> | null | undefined;
  isStreaming?: boolean;
}) => {
  if (!content) return null;

  const {
    scores,
    summary,
    achievements,
    keywords,
    actionVerbs,
    sectionFeedback,
    atsIssues,
    topImprovements,
    grammarAndSpelling,
  } = content;

  return (
    <div className="space-y-2">
      <ScoresSection scores={scores} />
      <SummarySection summary={summary} />

      <Accordion
        type="multiple"
        className="w-full"
        defaultValue={[
          "improvements",
          "achievements",
          "keywords",
          "verbs",
          "sections",
          "ats",
          "grammar",
        ]}
      >
        <TopImprovementsSection topImprovements={topImprovements} />
        <AchievementsSection achievements={achievements} />
        <KeywordsSection keywords={keywords} />
        <ActionVerbsSection actionVerbs={actionVerbs} />
        <SectionFeedbackSection sectionFeedback={sectionFeedback} />
        <ATSIssuesSection atsIssues={atsIssues} />
        <GrammarSection grammarAndSpelling={grammarAndSpelling} />
      </Accordion>

      {isStreaming && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm mt-4 animate-pulse">
          <div className="h-2 w-2 bg-primary rounded-full"></div>
          <span>Analyzing resume...</span>
        </div>
      )}
    </div>
  );
};
