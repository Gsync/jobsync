"use client";

import { useTranslations } from "@/i18n";
import { formatDateTime } from "@/i18n";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import type { JobMatchResponse } from "@/models/ai.schemas";

interface MatchMetadata {
  resumeId?: string;
  resumeTitle?: string;
  matchedAt?: string;
}

interface MatchDetailsProps {
  matchData: JobMatchResponse | null;
  discoveredAt?: Date;
}

export function MatchDetails({ matchData, discoveredAt }: MatchDetailsProps) {
  const { t, locale } = useTranslations();
  if (!matchData) return null;

  const metadata = matchData as unknown as MatchMetadata;

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="summary">
          <AccordionTrigger>{t("automations.matchSummary")}</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{matchData.summary}</p>
            <Badge className="mt-2" variant="outline">
              {matchData.recommendation}
            </Badge>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>{t("automations.skillsAnalysis")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {matchData.skills.matched.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-green-600">{t("automations.matchedSkills")}</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {matchData.skills.matched.map((skill, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {matchData.skills.missing.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-amber-600">{t("automations.missingSkills")}</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {matchData.skills.missing.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
              {matchData.skills.transferable.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-blue-600">{t("automations.transferableSkills")}</h5>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {matchData.skills.transferable.map((skill, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="requirements">
          <AccordionTrigger>{t("automations.requirementsAnalysis")}</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {matchData.requirements.met.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-green-600">{t("automations.metRequirements")}</h5>
                  <ul className="text-sm mt-1 space-y-1">
                    {matchData.requirements.met.map((req, i) => (
                      <li key={i}>
                        <span className="font-medium">{req.requirement}</span>:{" "}
                        <span className="text-muted-foreground">{req.evidence}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {matchData.requirements.missing.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-red-600">{t("automations.missingRequirements")}</h5>
                  <ul className="text-sm mt-1 space-y-1">
                    {matchData.requirements.missing.map((req, i) => (
                      <li key={i}>
                        <span className="font-medium">{req.requirement}</span>{" "}
                        <Badge variant="outline" className="text-xs">{req.importance}</Badge>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </AccordionContent>
        </AccordionItem>

        {matchData.tailoringTips.length > 0 && (
          <AccordionItem value="tips">
            <AccordionTrigger>{t("automations.tailoringTips")}</AccordionTrigger>
            <AccordionContent>
              <ul className="text-sm space-y-2">
                {matchData.tailoringTips.map((tip, i) => (
                  <li key={i}>
                    <span className="font-medium">{tip.section}:</span>{" "}
                    {tip.action}
                  </li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}

        {matchData.dealBreakers.length > 0 && (
          <AccordionItem value="dealbreakers">
            <AccordionTrigger>{t("automations.dealBreakers")}</AccordionTrigger>
            <AccordionContent>
              <ul className="text-sm text-red-600 space-y-1">
                {matchData.dealBreakers.map((db, i) => (
                  <li key={i}>{db}</li>
                ))}
              </ul>
            </AccordionContent>
          </AccordionItem>
        )}
      </Accordion>

      <div className="text-xs text-muted-foreground space-y-1">
        {metadata.resumeTitle && (
          <p>
            {t("automations.matchedWithResume")}:{" "}
            <span className="font-medium">{metadata.resumeTitle}</span>
          </p>
        )}
        <p>
          {metadata.matchedAt
            ? `${t("automations.matchedOn")} ${formatDateTime(new Date(metadata.matchedAt), locale)}`
            : discoveredAt
              ? `${t("automations.discoveredOn")} ${formatDateTime(new Date(discoveredAt), locale)}`
              : null}
        </p>
      </div>
    </div>
  );
}
