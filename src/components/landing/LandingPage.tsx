import Link from "next/link";
import { ArrowRight, BriefcaseBusiness, Github } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import ProductPreview from "./ProductPreview";
import FeaturesSection from "./FeaturesSection";

const sourceUrl = "https://github.com/Gsync/jobsync";
export default function LandingPage({ hasUsers }: { hasUsers: boolean }) {
  const entryRoute = hasUsers ? "/signin" : "/signup";
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6">
      <header className="flex min-h-20 items-center justify-between gap-3 border-b">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BriefcaseBusiness
            className="size-5 text-primary"
            aria-hidden="true"
          />
          JobSync
        </Link>
        <nav
          aria-label="Public navigation"
          className="flex items-center gap-1 sm:gap-2"
        >
          <Button variant="ghost" size="icon" asChild>
            <a href={sourceUrl} aria-label="JobSync on GitHub">
              <Github />
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/signin">Sign in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href={entryRoute}>Get started</Link>
          </Button>
        </nav>
      </header>
      <main className="flex flex-col gap-16 py-12 sm:gap-20 sm:py-20">
        <section
          className="grid items-center gap-10 lg:grid-cols-2"
          aria-labelledby="hero-title"
        >
          <div className="flex flex-col items-start gap-6">
            <Badge variant="secondary">Open source. Self-hosted.</Badge>
            <h1
              id="hero-title"
              className="text-4xl font-semibold leading-tight tracking-tight sm:text-5xl"
            >
              Your self-hosted workspace for the job search.
            </h1>
            <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">
              Track applications, manage resumes, and prepare with AI. Discover
              opportunities automatically, with your job-search data under your
              control.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={entryRoute}>
                  Get started
                  <ArrowRight />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <a href={sourceUrl}>
                  <Github />
                  View source on GitHub
                </a>
              </Button>
            </div>
          </div>
          <ProductPreview />
        </section>
        <FeaturesSection />
        <section
          aria-labelledby="workflow-title"
          className="flex flex-col gap-6"
        >
          <h2
            id="workflow-title"
            className="text-2xl font-semibold tracking-tight"
          >
            A simpler search routine.
          </h2>
          <ol className="grid gap-6 sm:grid-cols-3">
            {[
              "Add or discover opportunities.",
              "Match and prepare with AI.",
              "Track applications and follow-ups.",
            ].map((step, index) => (
              <li key={step} className="flex items-start gap-3">
                <Badge variant="secondary">0{index + 1}</Badge>
                <p className="text-sm font-medium">{step}</p>
              </li>
            ))}
          </ol>
        </section>
        <section
          aria-labelledby="ownership-title"
          className="rounded-lg border bg-muted/40 p-6 sm:p-8"
        >
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div className="max-w-xl">
              <h2
                id="ownership-title"
                className="text-2xl font-semibold tracking-tight"
              >
                Your search. Your infrastructure.
              </h2>
              <p className="mt-3 leading-relaxed text-muted-foreground">
                Self-host JobSync to keep your applications, resumes, and
                contacts under your control. Choose the AI provider that fits
                your setup.
              </p>
            </div>
            <Button variant="outline" asChild>
              <a href={`${sourceUrl}#readme`}>
                Self-hosting guide
                <ArrowRight />
              </a>
            </Button>
          </div>
        </section>
        <section
          className="flex flex-col items-center gap-4 text-center"
          aria-labelledby="start-title"
        >
          <h2
            id="start-title"
            className="text-2xl font-semibold tracking-tight"
          >
            Give your next opportunity a home.
          </h2>
          <Button asChild>
            <Link href={entryRoute}>
              {hasUsers ? "Sign in to your workspace" : "Create account"}
              <ArrowRight />
            </Link>
          </Button>
        </section>
      </main>
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t py-6 text-sm text-muted-foreground">
        <span>JobSync · Your job search, organized.</span>
        <a
          href={sourceUrl}
          className="rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-ring"
        >
          Source on GitHub
        </a>
      </footer>
    </div>
  );
}
