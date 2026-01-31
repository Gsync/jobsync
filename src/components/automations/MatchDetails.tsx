"use client";

import { format } from "date-fns";
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
  if (!matchData) return null;

  const metadata = matchData as unknown as MatchMetadata;

  return (
    <div className="space-y-4">
      <Accordion type="single" collapsible className="w-full">
        <AccordionItem value="summary">
          <AccordionTrigger>Match Summary</AccordionTrigger>
          <AccordionContent>
            <p className="text-sm">{matchData.summary}</p>
            <Badge className="mt-2" variant="outline">
              {matchData.recommendation}
            </Badge>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="skills">
          <AccordionTrigger>Skills Analysis</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {matchData.skills.matched.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-green-600">Matched Skills</h5>
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
                  <h5 className="text-sm font-medium text-amber-600">Missing Skills</h5>
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
                  <h5 className="text-sm font-medium text-blue-600">Transferable Skills</h5>
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
          <AccordionTrigger>Requirements Analysis</AccordionTrigger>
          <AccordionContent>
            <div className="space-y-3">
              {matchData.requirements.met.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-green-600">Met Requirements</h5>
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
                  <h5 className="text-sm font-medium text-red-600">Missing Requirements</h5>
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
            <AccordionTrigger>Tailoring Tips</AccordionTrigger>
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
            <AccordionTrigger>Potential Deal Breakers</AccordionTrigger>
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
            Matched with resume:{" "}
            <span className="font-medium">{metadata.resumeTitle}</span>
          </p>
        )}
        <p>
          {metadata.matchedAt
            ? `Matched on ${format(new Date(metadata.matchedAt), "MMM d, yyyy 'at' h:mm a")}`
            : discoveredAt
              ? `Discovered on ${format(new Date(discoveredAt), "MMM d, yyyy 'at' h:mm a")}`
              : null}
        </p>
      </div>
    </div>
  );
}
