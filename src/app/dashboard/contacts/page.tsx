import { Metadata } from "next";
import { getContactsDirectory } from "@/actions/contact.actions";
import { ContactProfileCard } from "@/components/osui/profile/contact-profile-card";
import { CopyEmail } from "@/components/osui/contact/copy-email";

export const metadata: Metadata = {
  title: "Directory | JobSync",
};

export default async function ContactsPage() {
  const rows = ((await getContactsDirectory().catch(() => [])) ?? []) as unknown as {
    id: string;
    name: string;
    title: string | null;
    email: string | null;
    phone: string | null;
    relationship: string | null;
    notes: string | null;
    Company: { label: string } | null;
    _count: { outreach: number };
  }[];
  return (
    <div className="col-span-3 font-sans">
      <div className="mb-4 flex items-baseline justify-between px-1">
        <div>
          <p className="text-sm font-semibold text-neutral-900">Directory</p>
          <p className="text-xs text-neutral-500">{`${rows.length} people · professors, recruiters, referees`}</p>
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-neutral-200 bg-white px-4 py-8 text-center text-sm text-neutral-500">
          No contacts yet — they appear here when you log outreach or add them to an application.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="flex flex-col gap-2">
              <ContactProfileCard
                name={c.name}
                title={[c.title, c.Company?.label].filter(Boolean).join(" · ") || undefined}
                email={c.email ?? undefined}
                phone={c.phone ?? undefined}
                catalogRef={c.relationship ?? undefined}
              />
              {c.email ? <CopyEmail email={c.email} /> : null}
              <p className="px-1 text-xs text-neutral-500">
                {c._count.outreach > 0
                  ? `${c._count.outreach} outreach ${c._count.outreach === 1 ? "email" : "emails"} logged`
                  : "No outreach logged yet"}
                {c.notes ? ` · ${c.notes.slice(0, 120)}` : ""}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
