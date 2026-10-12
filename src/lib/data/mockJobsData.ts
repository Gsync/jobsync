import { MOCK_DATA_IDENTIFIER } from "@/lib/data/mockActivities";

import type { JobMatchRecommendation } from "@/models/ai.schemas";

export { MOCK_DATA_IDENTIFIER };

export const mockJobDescriptions = [
  "<p>We are looking for an engineer to help build scalable, high-performance web applications used by thousands of customers every day. You will work closely with product and design to take features from idea to production.</p><h3>Responsibilities</h3><ul><li>Design, build and ship new features end to end</li><li>Write clean, tested and maintainable code</li><li>Review pull requests and share knowledge with the team</li><li>Monitor production and help resolve incidents</li></ul><h3>Requirements</h3><ul><li>3+ years of professional software engineering experience</li><li>Strong TypeScript and modern web framework skills</li><li>Experience with SQL databases and REST APIs</li></ul><h3>Nice to have</h3><ul><li>Experience with CI/CD and cloud hosting</li><li>Prior startup experience</li></ul>",
  "<p>Join our backend team to design and operate the services that power our platform. You will work with distributed systems, databases and APIs where reliability and performance matter.</p><h3>Responsibilities</h3><ul><li>Build and maintain high-throughput APIs and background workers</li><li>Model data and tune queries for performance</li><li>Improve observability with metrics, logs and tracing</li><li>Take part in the on-call rotation</li></ul><h3>Requirements</h3><ul><li>4+ years of backend development experience</li><li>Solid grasp of relational databases and caching</li><li>Experience designing and versioning APIs</li></ul><h3>Nice to have</h3><ul><li>Experience with message queues or event streaming</li><li>Familiarity with Docker and Kubernetes</li></ul>",
  "<p>We are seeking a front-end developer who cares about polished, accessible and responsive interfaces. You will collaborate with designers and backend engineers to build the product our users see and touch.</p><h3>Responsibilities</h3><ul><li>Build reusable components and maintain our design system</li><li>Turn mockups into pixel-accurate, responsive UI</li><li>Improve page performance and accessibility</li><li>Write unit and end-to-end tests for UI flows</li></ul><h3>Requirements</h3><ul><li>3+ years of experience with React and TypeScript</li><li>Strong HTML, CSS and browser fundamentals</li><li>Familiarity with accessibility standards (WCAG)</li></ul><h3>Nice to have</h3><ul><li>Experience with Next.js or server-side rendering</li><li>An eye for motion and interaction design</li></ul>",
  "<p>Help us build and run the cloud infrastructure behind our platform. You will own the tooling that lets product teams ship quickly and safely.</p><h3>Responsibilities</h3><ul><li>Manage infrastructure as code and cloud environments</li><li>Maintain CI/CD pipelines and release automation</li><li>Set up monitoring, alerting and capacity planning</li><li>Lead post-incident reviews and reliability improvements</li></ul><h3>Requirements</h3><ul><li>3+ years in DevOps, SRE or platform engineering</li><li>Hands-on experience with AWS, GCP or Azure</li><li>Proficiency with Terraform and containers</li></ul><h3>Nice to have</h3><ul><li>Experience with Kubernetes in production</li><li>Security and compliance exposure (SOC 2)</li></ul>",
  "<p>We need an engineer to scale our data pipeline and analytics platform. You will work with large datasets and streaming systems that feed reporting and machine learning features.</p><h3>Responsibilities</h3><ul><li>Build and maintain batch and streaming data pipelines</li><li>Ensure data quality, lineage and freshness</li><li>Partner with analysts and ML engineers on data models</li><li>Optimize warehouse cost and query performance</li></ul><h3>Requirements</h3><ul><li>4+ years of data engineering experience</li><li>Strong SQL and Python skills</li><li>Experience with a workflow orchestrator such as Airflow</li></ul><h3>Nice to have</h3><ul><li>Experience with Kafka or similar streaming tools</li><li>Familiarity with dbt and a cloud data warehouse</li></ul>",
  "<p>Join our platform team to build shared services and internal tools used by dozens of engineering teams. You will improve developer productivity and treat your colleagues as customers.</p><h3>Responsibilities</h3><ul><li>Design APIs and libraries that other teams adopt</li><li>Write documentation and support internal users</li><li>Reduce build times and flaky tests across the codebase</li><li>Gather feedback and shape the platform roadmap</li></ul><h3>Requirements</h3><ul><li>5+ years of software engineering experience</li><li>Track record of building widely used internal tooling</li><li>Clear written and verbal communication</li></ul><h3>Nice to have</h3><ul><li>Experience leading cross-team technical projects</li><li>Open source contributions</li></ul>",
  "<p>We are looking for someone to help modernize our legacy systems. You will migrate services to modern architectures while keeping the product available and the data intact.</p><h3>Responsibilities</h3><ul><li>Plan and execute incremental migrations with zero downtime</li><li>Refactor legacy code and add missing test coverage</li><li>Document system behavior and architecture decisions</li><li>Mentor teammates on safe refactoring practices</li></ul><h3>Requirements</h3><ul><li>5+ years of experience, including work on large legacy codebases</li><li>Comfort reading unfamiliar code and untangling dependencies</li><li>Experience with database migrations at scale</li></ul><h3>Nice to have</h3><ul><li>Experience with the strangler fig pattern</li><li>Knowledge of both older and current web stacks</li></ul>",
  "<p>We are seeking a full-stack engineer to own features from database schema to user interface. You will have significant autonomy and a direct impact on the product.</p><h3>Responsibilities</h3><ul><li>Ship features across the stack, from schema design to UI</li><li>Work with product to scope and prioritize work</li><li>Keep the codebase healthy through tests and reviews</li><li>Contribute to technical decisions and planning</li></ul><h3>Requirements</h3><ul><li>3+ years of full-stack development experience</li><li>Proficiency in TypeScript, Node.js and React</li><li>Experience with SQL and an ORM</li></ul><h3>Nice to have</h3><ul><li>Experience integrating third-party APIs and payments</li><li>Comfort working in a small, fast-moving team</li></ul>",
];

export const mockMatchTiers: {
  min: number;
  max: number;
  recommendation: JobMatchRecommendation;
  body: string;
}[] = [
  {
    min: 80,
    max: 96,
    recommendation: "strong match",
    body: "## Summary\n\nYour background lines up closely with this role. Most of the core requirements are covered by recent, relevant experience.\n\n## Strengths\n\n- Years of experience meet or exceed the stated minimum\n- Core stack in the posting appears in your recent roles\n- Shipped work comparable to the listed responsibilities\n\n## Gaps\n\n- One or two nice-to-have items are not mentioned on your resume",
  },
  {
    min: 60,
    max: 79,
    recommendation: "good match",
    body: "## Summary\n\nYou meet most of the requirements, with a few areas worth strengthening before you apply.\n\n## Strengths\n\n- Relevant experience with the main technologies\n- Comparable scope and team environment\n\n## Gaps\n\n- Seniority expectations are slightly above what your resume shows\n- Limited evidence of the infrastructure skills listed\n\n## Suggestions\n\n- Add measurable outcomes to your most relevant role",
  },
];

export const mockJobTypes = ["FT", "FT", "FT", "PT", "C"];

// Weighted status distribution — values are cumulative thresholds out of 100
export const STATUS_WEIGHTS: { value: string; weight: number }[] = [
  { value: "applied", weight: 35 },
  { value: "rejected", weight: 25 },
  { value: "interview", weight: 20 },
  { value: "draft", weight: 10 },
  { value: "offer", weight: 5 },
  { value: "expired", weight: 3 },
  { value: "archived", weight: 2 },
];
