"use client";

import { formatDistanceToNow } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { BoardCell } from "@/components/admin/BoardCell";
import { formatUrl } from "@/lib/utils";
import type { Company } from "@/models/job.model";
import { hostnameOf } from "./hostname";

type CompanySummaryCardProps = {
  company: Company;
  jobsCount: number;
  appliedCount: number;
  contactsCount: number;
};

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <div className="mt-1 font-medium">{children}</div>
    </div>
  );
}

function HostLink({ url }: { url?: string | null }) {
  const host = hostnameOf(url);
  if (!url || !host) return <>—</>;
  return (
    <a
      href={formatUrl(url)}
      target="_blank"
      rel="noopener noreferrer"
      className="hover:underline underline-offset-4"
    >
      {host}
    </a>
  );
}

export function CompanySummaryCard({
  company,
  jobsCount,
  appliedCount,
  contactsCount,
}: CompanySummaryCardProps) {
  return (
    <Card data-testid="company-summary">
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Fact label="Watchlist">
            {company.watched ? (
              <>
                Watched
                {company.watchedAt && (
                  <span className="block text-sm font-normal text-muted-foreground">
                    {formatDistanceToNow(new Date(company.watchedAt), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </>
            ) : (
              "Not watched"
            )}
          </Fact>
          <Fact label="Board">
            <BoardCell company={company} />
          </Fact>
          <Fact label="Industry">{company.industry || "—"}</Fact>
          <Fact label="Website">
            <HostLink url={company.websiteUrl} />
          </Fact>
          <Fact label="Careers page">
            <HostLink url={company.careersUrl} />
          </Fact>
          <Fact label="Jobs">{jobsCount}</Fact>
          <Fact label="Applied">{appliedCount}</Fact>
          <Fact label="Contacts">{contactsCount}</Fact>
        </div>
      </CardContent>
    </Card>
  );
}
