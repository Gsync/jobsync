import {
  BriefcaseBusiness,
  Bot,
  FileText,
  Search,
  Server,
  Users,
} from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const features = [
  {
    icon: BriefcaseBusiness,
    title: "Application tracking",
    description:
      "Keep opportunities, application stages, and follow-ups in one workspace.",
  },
  {
    icon: Bot,
    title: "AI assistant",
    description:
      "Review resumes, match opportunities, and prepare with an assistant alongside your work.",
  },
  {
    icon: FileText,
    title: "Resume management",
    description:
      "Organize your resumes and cover letters for each opportunity.",
  },
  {
    icon: Search,
    title: "Automated job discovery",
    description:
      "Set up automations to discover opportunities and bring them into your search.",
  },
  {
    icon: Users,
    title: "People and preparation",
    description:
      "Keep companies, contacts, interview questions, and tasks close to your applications.",
  },
  {
    icon: Server,
    title: "Self-hosting + MCP",
    description:
      "Run JobSync on your own infrastructure and connect your tools through MCP.",
  },
];

export default function FeaturesSection() {
  return (
    <section aria-labelledby="features-title" className="flex flex-col gap-6">
      <div>
        <h2
          id="features-title"
          className="text-2xl font-semibold tracking-tight"
        >
          One workspace, from discovery to interview.
        </h2>
        <p className="mt-2 text-muted-foreground">
          Keep the details together so you can focus on the next step.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ icon: Icon, title, description }) => (
          <Card key={title}>
            <CardHeader>
              <Icon className="mb-2 size-5 text-primary" aria-hidden="true" />
              <CardTitle asChild><h3>{title}</h3></CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </div>
    </section>
  );
}
