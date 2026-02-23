// Prefix used to tag all mock profile records for easy identification/cleanup
export const MOCK_PROFILE_IDENTIFIER = "[MOCK_DATA]";
export const MOCK_VALUE_PREFIX = "__mock__";

export const mockCompanies = [
  { label: "Amazon", value: "__mock__amazon" },
  { label: "Google", value: "__mock__google" },
  { label: "Apple", value: "__mock__apple" },
  { label: "Netflix", value: "__mock__netflix" },
  { label: "Meta", value: "__mock__meta" },
  { label: "Microsoft", value: "__mock__microsoft" },
  { label: "X (Twitter)", value: "__mock__twitter" },
  { label: "LinkedIn", value: "__mock__linkedin" },
  { label: "Salesforce", value: "__mock__salesforce" },
  { label: "Uber", value: "__mock__uber" },
  { label: "Airbnb", value: "__mock__airbnb" },
  { label: "Spotify", value: "__mock__spotify" },
];

export const mockLocations = [
  {
    label: "San Francisco, CA",
    value: "__mock__san_francisco",
    stateProv: "CA",
    country: "US",
  },
  {
    label: "Seattle, WA",
    value: "__mock__seattle",
    stateProv: "WA",
    country: "US",
  },
  {
    label: "New York, NY",
    value: "__mock__new_york",
    stateProv: "NY",
    country: "US",
  },
  {
    label: "Austin, TX",
    value: "__mock__austin",
    stateProv: "TX",
    country: "US",
  },
  {
    label: "Boston, MA",
    value: "__mock__boston",
    stateProv: "MA",
    country: "US",
  },
  {
    label: "Chicago, IL",
    value: "__mock__chicago",
    stateProv: "IL",
    country: "US",
  },
  {
    label: "Los Angeles, CA",
    value: "__mock__los_angeles",
    stateProv: "CA",
    country: "US",
  },
  {
    label: "Denver, CO",
    value: "__mock__denver",
    stateProv: "CO",
    country: "US",
  },
  {
    label: "Toronto, ON",
    value: "__mock__toronto",
    stateProv: "ON",
    country: "Canada",
  },
  {
    label: "Vancouver, BC",
    value: "__mock__vancouver",
    stateProv: "BC",
    country: "Canada",
  },
  {
    label: "Calgary, AB",
    value: "__mock__calgary",
    stateProv: "AB",
    country: "Canada",
  },
  {
    label: "Waterloo, ON",
    value: "__mock__waterloo",
    stateProv: "ON",
    country: "Canada",
  },
];

export const mockJobTitles = [
  // Junior
  {
    label: "Junior Frontend Developer",
    value: "__mock__junior_frontend_developer",
  },
  {
    label: "Junior Software Engineer",
    value: "__mock__junior_software_engineer",
  },
  // Intermediate
  { label: "Full Stack Developer", value: "__mock__full_stack_developer" },
  { label: "Software Engineer", value: "__mock__software_engineer" },
  { label: "Frontend Developer", value: "__mock__frontend_developer" },
  { label: "Backend Developer", value: "__mock__backend_developer" },
  { label: "DevOps Engineer", value: "__mock__devops_engineer" },
  { label: "Data Engineer", value: "__mock__data_engineer" },
  { label: "Cloud Architect", value: "__mock__cloud_architect" },
  // Senior
  {
    label: "Senior Software Engineer",
    value: "__mock__senior_software_engineer",
  },
  {
    label: "Senior Frontend Developer",
    value: "__mock__senior_frontend_developer",
  },
  {
    label: "Senior Backend Developer",
    value: "__mock__senior_backend_developer",
  },
  {
    label: "Senior Full Stack Developer",
    value: "__mock__senior_full_stack_developer",
  },
  { label: "Staff DevOps Engineer", value: "__mock__staff_devops_engineer" },
  {
    label: "Principal Cloud Architect",
    value: "__mock__principal_cloud_architect",
  },
];

export type ResumeLevel = "junior" | "intermediate" | "senior";

export interface WorkHistoryEntry {
  company: string;
  jobTitleValue: string;
  location: string;
  // how many years ago this role started (larger = further in the past)
  startYearsAgo: number;
  // how many years ago this role ended; null = currently employed here
  endYearsAgo: number | null;
  description: string;
}

export interface MockResumePerson {
  level: ResumeLevel;
  firstName: string;
  lastName: string;
  headline: string;
  email: string;
  phone: string;
  address: string;
  resumeTitle: string;
  summary: string;
  workHistory: WorkHistoryEntry[];
  education: {
    institution: string;
    degree: string;
    fieldOfStudy: string;
    location: string;
    startYear: number;
    endYear: number;
  };
}

// ─── JUNIOR (1-2 years, 1 job) ────────────────────────────────────────────

const alexChen: MockResumePerson = {
  level: "junior",
  firstName: "Alex",
  lastName: "Chen",
  headline: "Junior Frontend Developer",
  email: "alex.chen@mockmail.com",
  phone: "555-200-0001",
  address: "22 Birchwood Ave, San Francisco, CA",
  resumeTitle: "[MOCK_DATA] Alex Chen - Junior Frontend Developer",
  summary:
    "Motivated Junior Frontend Developer with 1 year of professional experience building responsive web " +
    "applications using React and TypeScript. Passionate about UI/UX and delivering pixel-perfect interfaces. " +
    "Eager to grow within a collaborative engineering team and take on increasingly complex front-end challenges.",
  workHistory: [
    {
      company: "__mock__spotify",
      jobTitleValue: "__mock__junior_frontend_developer",
      location: "__mock__san_francisco",
      startYearsAgo: 1,
      endYearsAgo: null,
      description:
        "Contribute to the Spotify Web Player's playlist and discovery UI using React 18 and TypeScript. " +
        "Implemented a new 'Recently Played' carousel component adopted by 12M+ monthly active users. " +
        "Collaborated with senior engineers in daily standups and bi-weekly design reviews. " +
        "Wrote unit tests with Jest and React Testing Library, increasing feature coverage from 62% to 78%. " +
        "Participated in accessibility audits resulting in WCAG 2.1 AA compliance for three key flows.",
    },
  ],
  education: {
    institution: "San Francisco State University",
    degree: "Bachelor of Science",
    fieldOfStudy: "Computer Science",
    location: "__mock__san_francisco",
    startYear: 2020,
    endYear: 2024,
  },
};

const priyaPatel: MockResumePerson = {
  level: "junior",
  firstName: "Priya",
  lastName: "Patel",
  headline: "Junior Software Engineer",
  email: "priya.patel@mockmail.com",
  phone: "555-200-0002",
  address: "88 Lakeview Blvd, San Francisco, CA",
  resumeTitle: "[MOCK_DATA] Priya Patel - Junior Software Engineer",
  summary:
    "Recent computer science graduate and Junior Software Engineer with 1 year of experience at a high-growth " +
    "tech company. Solid foundation in Python, Java, and REST API design gained through coursework and hands-on " +
    "professional work. Quick learner with a strong interest in distributed systems and backend services.",
  workHistory: [
    {
      company: "__mock__uber",
      jobTitleValue: "__mock__junior_software_engineer",
      location: "__mock__san_francisco",
      startYearsAgo: 1,
      endYearsAgo: null,
      description:
        "Work on the Driver Earnings team, maintaining and extending Java microservices that process " +
        "real-time trip-fare calculations for 5M+ weekly active drivers. " +
        "Fixed 18 production bugs in the first quarter, reducing P1 error rate by 9%. " +
        "Built an internal dashboard endpoint using Python/Flask that surfaces earnings anomaly alerts to the ops team. " +
        "Onboarded to the team's CI/CD pipeline (Jenkins + Docker) and contributed to deployment runbooks. " +
        "Received 'Emerging Engineer' recognition in Q3 2025 peer review cycle.",
    },
  ],
  education: {
    institution: "San Jose State University",
    degree: "Bachelor of Science",
    fieldOfStudy: "Computer Science",
    location: "__mock__san_francisco",
    startYear: 2020,
    endYear: 2024,
  },
};

// ─── INTERMEDIATE (3-6 years, 2-3 jobs) ──────────────────────────────────

const johnDoe: MockResumePerson = {
  level: "intermediate",
  firstName: "John",
  lastName: "Doe",
  headline: "Full Stack Developer",
  email: "john.doe@mockmail.com",
  phone: "555-100-0001",
  address: "123 Main St, Seattle, WA",
  resumeTitle: "[MOCK_DATA] John Doe - Full Stack Developer",
  summary:
    "Full Stack Developer with 5 years of experience designing and delivering end-to-end web applications " +
    "across e-commerce and streaming domains. Proficient in React, Node.js, TypeScript, and AWS. " +
    "Known for bridging product requirements and engineering execution, and for mentoring junior developers. " +
    "Passionate about clean architecture, test-driven development, and performance optimization.",
  workHistory: [
    {
      company: "__mock__amazon",
      jobTitleValue: "__mock__full_stack_developer",
      location: "__mock__seattle",
      startYearsAgo: 2,
      endYearsAgo: null,
      description:
        "Lead full-stack development for Amazon's Seller Central dashboard, serving 2M+ third-party sellers worldwide. " +
        "Re-architected a legacy AngularJS inventory module to React + TypeScript, cutting load time by 40%. " +
        "Designed and shipped three RESTful Node.js microservices integrated with DynamoDB and SQS, reducing " +
        "order processing latency by 25%. " +
        "Mentored two junior developers through code reviews and pair programming sessions. " +
        "Collaborated with PMs and UX designers to translate Figma mockups into production-ready features. " +
        "Maintained 90%+ unit/integration test coverage using Jest and Supertest.",
    },
    {
      company: "__mock__netflix",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__los_angeles",
      startYearsAgo: 5,
      endYearsAgo: 2,
      description:
        "Contributed to Netflix's content discovery platform, building React components for the browse and " +
        "search experiences used by 200M+ subscribers. " +
        "Developed a server-rendered personalization API in Node.js that improved recommendation click-through " +
        "rate by 12% in A/B testing. " +
        "Championed adoption of Storybook for component documentation, adopted team-wide. " +
        "Participated in on-call rotations, resolving two SEV-1 incidents with root-cause analysis write-ups. " +
        "Achieved 'Exceeds Expectations' in annual performance review.",
    },
  ],
  education: {
    institution: "University of Washington",
    degree: "Bachelor of Science",
    fieldOfStudy: "Computer Science",
    location: "__mock__seattle",
    startYear: 2016,
    endYear: 2020,
  },
};

const janeSmith: MockResumePerson = {
  level: "intermediate",
  firstName: "Jane",
  lastName: "Smith",
  headline: "Software Engineer",
  email: "jane.smith@mockmail.com",
  phone: "555-100-0002",
  address: "456 Oak Ave, San Francisco, CA",
  resumeTitle: "[MOCK_DATA] Jane Smith - Software Engineer",
  summary:
    "Software Engineer with 5 years of experience in social platforms and enterprise software, specialising in " +
    "scalable backend services and data pipelines. Deep expertise in Python, Go, and Kafka-based event-driven " +
    "architectures. Holds an M.S. in Computer Science from Stanford. Passionate about reliability engineering " +
    "and data integrity at scale.",
  workHistory: [
    {
      company: "__mock__meta",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__san_francisco",
      startYearsAgo: 2,
      endYearsAgo: null,
      description:
        "Build and maintain backend services for Meta's Feed Ranking infrastructure, handling 1B+ daily active user events. " +
        "Redesigned a Kafka consumer pipeline in Go, improving throughput by 35% and reducing lag spikes. " +
        "Drove migration of Python 2 batch jobs to Python 3 async workers, eliminating a class of memory leaks. " +
        "Authored internal RFC for a shared rate-limiting library now used across four product teams. " +
        "Reduced oncall alert noise by 30% through metric tuning and alert consolidation in Datadog. " +
        "Received 'Above Expectations' in the semi-annual performance review.",
    },
    {
      company: "__mock__microsoft",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__seattle",
      startYearsAgo: 5,
      endYearsAgo: 2,
      description:
        "Worked on the Azure DevOps Pipelines engine team, developing features for the YAML pipeline editor " +
        "and run-history API in C# and TypeScript. " +
        "Shipped a live-validation feature for YAML syntax that reduced pipeline misconfiguration errors by 22%. " +
        "Wrote integration tests against a local Kubernetes cluster using Kind, cutting manual QA effort by 50%. " +
        "Supported a global user base by triaging and resolving 40+ GitHub issues per release cycle.",
    },
  ],
  education: {
    institution: "Stanford University",
    degree: "Master of Science",
    fieldOfStudy: "Computer Science",
    location: "__mock__san_francisco",
    startYear: 2016,
    endYear: 2018,
  },
};

const marcusLee: MockResumePerson = {
  level: "intermediate",
  firstName: "Marcus",
  lastName: "Lee",
  headline: "Backend Developer",
  email: "marcus.lee@mockmail.com",
  phone: "555-100-0007",
  address: "77 Queens Quay W, Toronto, ON",
  resumeTitle: "[MOCK_DATA] Marcus Lee - Backend Developer",
  summary:
    "Backend Developer with 6 years of experience building high-availability APIs and data services across " +
    "professional networking, CRM, and hospitality platforms. Proficient in Java, Kotlin, PostgreSQL, and " +
    "Kubernetes. Strong track record of improving system reliability and streamlining CI/CD workflows. " +
    "Based in Toronto with full remote-work experience across distributed teams.",
  workHistory: [
    {
      company: "__mock__linkedin",
      jobTitleValue: "__mock__backend_developer",
      location: "__mock__toronto",
      startYearsAgo: 2,
      endYearsAgo: null,
      description:
        "Develop backend services for LinkedIn's Job Recommendations engine in Kotlin/Spring Boot, surfacing " +
        "relevant postings to 50M+ weekly active job seekers. " +
        "Introduced async job-index refresh using Kafka, cutting recommendation staleness from 4 hours to 15 minutes. " +
        "Led a cross-team effort to migrate three PostgreSQL schemas to a new sharded cluster with zero downtime. " +
        "Implemented canary release process in Kubernetes, enabling safer weekly deployments. " +
        "Mentored one junior developer and conducted regular architecture discussions within the team.",
    },
    {
      company: "__mock__salesforce",
      jobTitleValue: "__mock__backend_developer",
      location: "__mock__san_francisco",
      startYearsAgo: 4,
      endYearsAgo: 2,
      description:
        "Built REST and GraphQL APIs for the Salesforce Flow automation engine using Java 11 and Spring Data JPA. " +
        "Optimised slow N+1 query patterns, reducing average API response time from 320ms to 85ms. " +
        "Designed a webhook delivery retry system with exponential back-off, improving reliability to 99.97%. " +
        "Collaborated with the security team to remediate OWASP Top-10 vulnerabilities in two quarterly audits.",
    },
    {
      company: "__mock__airbnb",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__san_francisco",
      startYearsAgo: 6,
      endYearsAgo: 4,
      description:
        "Contributed to Airbnb's Payments platform, building Ruby on Rails services handling $1B+ in annual " +
        "host payouts. " +
        "Implemented multi-currency payout reconciliation logic, reducing accounting discrepancies by 18%. " +
        "Worked closely with fraud and risk teams to integrate signals from the trust-and-safety ML pipeline. " +
        "Participated in quarterly hackathons; winning hack resulted in a shipped feature for instant payout confirmation.",
    },
  ],
  education: {
    institution: "University of Toronto",
    degree: "Bachelor of Engineering",
    fieldOfStudy: "Software Engineering",
    location: "__mock__toronto",
    startYear: 2014,
    endYear: 2018,
  },
};

// ─── SENIOR / ADVANCED (8-15 years, 3-4 jobs) ────────────────────────────

const sarahWilliams: MockResumePerson = {
  level: "senior",
  firstName: "Sarah",
  lastName: "Williams",
  headline: "Senior Software Engineer",
  email: "sarah.williams@mockmail.com",
  phone: "555-100-0004",
  address: "321 Pine Rd, New York, NY",
  resumeTitle: "[MOCK_DATA] Sarah Williams - Senior Software Engineer",
  summary:
    "Senior Software Engineer with 11 years of experience across distributed systems, developer tooling, and " +
    "cloud-native infrastructure. Proven leader who has shaped technical strategy, led teams of up to 8 engineers, " +
    "and driven organisational engineering standards at Google, Amazon, and Microsoft. " +
    "Deep expertise in Go, Java, and Kubernetes. MIT alumna passionate about mentorship, system design, " +
    "and building products that scale to hundreds of millions of users.",
  workHistory: [
    {
      company: "__mock__google",
      jobTitleValue: "__mock__senior_software_engineer",
      location: "__mock__new_york",
      startYearsAgo: 3,
      endYearsAgo: null,
      description:
        "Technical lead for a 6-engineer squad within Google Cloud's Compute Engine networking team, responsible for " +
        "the virtual network control plane serving 3M+ VMs across 35 global regions. " +
        "Designed and shipped a zero-downtime live migration protocol for VPC routing tables, eliminating a class " +
        "of network brownouts that affected ~0.3% of workloads. " +
        "Defined quarterly OKRs, conducted bi-annual performance reviews, and ran structured interview loops. " +
        "Co-authored three internal design documents adopted as org-wide standards for distributed consensus. " +
        "Reduced mean time to detect (MTTD) production anomalies by 45% by implementing ML-based alerting in Monarch. " +
        "Presented engineering work at two internal Google TechTalks with an audience of 500+ engineers.",
    },
    {
      company: "__mock__amazon",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__seattle",
      startYearsAgo: 7,
      endYearsAgo: 3,
      description:
        "Senior engineer on the AWS Lambda execution environment team, building the micro-VM isolation layer " +
        "(Firecracker-based) that now underpins millions of daily function invocations. " +
        "Led a cross-organisational effort to reduce cold-start latency by 60% through snapshot-and-restore optimisations. " +
        "Collaborated with hardware teams to qualify new Graviton2 instance types for Lambda workloads. " +
        "Established the team's first chaos engineering practice using AWS Fault Injection Simulator. " +
        "Promoted to SDE III (equivalent to Senior SWE) within 2 years of joining; achieved L6 bar.",
    },
    {
      company: "__mock__microsoft",
      jobTitleValue: "__mock__junior_software_engineer",
      location: "__mock__seattle",
      startYearsAgo: 11,
      endYearsAgo: 7,
      description:
        "Started career on the Visual Studio Code remote development extensions team, contributing to the " +
        "SSH and Dev Containers features in TypeScript and C++. " +
        "Shipped the initial 'Reopen in Container' workflow used by 4M+ developers. " +
        "Resolved 60+ community-filed GitHub issues per release cycle; maintained a public-facing changelog. " +
        "Grew from entry-level to SDE II level over 4 years through strong performance reviews and expanded scope.",
    },
  ],
  education: {
    institution: "Massachusetts Institute of Technology",
    degree: "Bachelor of Science",
    fieldOfStudy: "Computer Science and Engineering",
    location: "__mock__boston",
    startYear: 2011,
    endYear: 2015,
  },
};

const robertBrown: MockResumePerson = {
  level: "senior",
  firstName: "Robert",
  lastName: "Brown",
  headline: "Staff DevOps Engineer",
  email: "robert.brown@mockmail.com",
  phone: "555-100-0005",
  address: "654 Maple Dr, Vancouver, BC",
  resumeTitle: "[MOCK_DATA] Robert Brown - Staff DevOps Engineer",
  summary:
    "Staff DevOps / Platform Engineer with 12 years of experience designing, operating, and evolving large-scale " +
    "infrastructure platforms at Microsoft, Apple, and Uber. Deep expertise in Kubernetes, Terraform, Helm, " +
    "ArgoCD, and multi-cloud architecture (AWS + Azure + GCP). Known for building self-service developer platforms " +
    "that dramatically reduce time-to-production and cognitive load for engineering teams. " +
    "Frequent speaker at internal and external engineering conferences.",
  workHistory: [
    {
      company: "__mock__microsoft",
      jobTitleValue: "__mock__staff_devops_engineer",
      location: "__mock__vancouver",
      startYearsAgo: 4,
      endYearsAgo: null,
      description:
        "Lead architect for Azure's internal developer platform (IDP), enabling 20,000+ engineers to " +
        "self-provision infrastructure and deploy services via a Backstage-based portal. " +
        "Drove adoption of GitOps with ArgoCD and Flux across 150+ production Kubernetes clusters, reducing " +
        "drift incidents by 70%. " +
        "Defined the company's multi-cloud cost optimisation strategy, saving $14M annually through right-sizing " +
        "and spot-instance scheduling. " +
        "Line-managed a team of 4 junior/intermediate SREs; established bi-weekly knowledge-sharing sessions. " +
        "Co-authored Microsoft's internal Platform Engineering Handbook, now used company-wide. " +
        "Received 'Impact Award' at org-level recognition ceremony in 2024.",
    },
    {
      company: "__mock__apple",
      jobTitleValue: "__mock__devops_engineer",
      location: "__mock__san_francisco",
      startYearsAgo: 8,
      endYearsAgo: 4,
      description:
        "Senior DevOps Engineer on Apple's iCloud Infrastructure team, responsible for CI/CD, observability, " +
        "and release automation for 50+ backend services serving 1B+ iCloud users. " +
        "Designed a zero-downtime blue-green deployment pipeline in Jenkins + Spinnaker that reduced release " +
        "risk incidents by 55%. " +
        "Built a Terraform module library standardising provisioning of 90% of team infrastructure on AWS. " +
        "Integrated distributed tracing (Jaeger) across the iCloud Photos upload pipeline, cutting P99 " +
        "latency investigations from days to hours. " +
        "Achieved Apple's Distinguished Individual Contributor designation.",
    },
    {
      company: "__mock__uber",
      jobTitleValue: "__mock__software_engineer",
      location: "__mock__san_francisco",
      startYearsAgo: 12,
      endYearsAgo: 8,
      description:
        "Infrastructure engineer on Uber's Marketplace platform, building and scaling the real-time " +
        "dispatch system that matched drivers and riders in 400+ cities. " +
        "Migrated core dispatch services from bare-metal to Mesos/Marathon, enabling 10× vertical scale. " +
        "Implemented automated capacity planning tooling in Python, avoiding three major capacity-related " +
        "outages during surge periods. " +
        "Built foundational deployment tooling used by 50+ engineers daily.",
    },
  ],
  education: {
    institution: "University of British Columbia",
    degree: "Bachelor of Science",
    fieldOfStudy: "Computer Engineering",
    location: "__mock__vancouver",
    startYear: 2010,
    endYear: 2014,
  },
};

const emilyDavis: MockResumePerson = {
  level: "senior",
  firstName: "Emily",
  lastName: "Davis",
  headline: "Principal Cloud Architect",
  email: "emily.davis@mockmail.com",
  phone: "555-100-0006",
  address: "987 Cedar Ln, Austin, TX",
  resumeTitle: "[MOCK_DATA] Emily Davis - Principal Cloud Architect",
  summary:
    "Principal Cloud Architect with 15 years of experience spanning music streaming, social media, advertising " +
    "technology, and e-commerce. Proven ability to define and execute multi-year cloud strategy for organisations " +
    "scaling from thousands to hundreds of millions of users. Expert in AWS, GCP, multi-region active-active " +
    "architectures, FinOps, and zero-trust security. Frequent conference speaker (re:Invent, KubeCon) and author " +
    "of two widely-cited cloud architecture whitepapers. Holds AWS Certified Solutions Architect – Professional, " +
    "GCP Professional Cloud Architect, and CKA certifications.",
  workHistory: [
    {
      company: "__mock__spotify",
      jobTitleValue: "__mock__principal_cloud_architect",
      location: "__mock__new_york",
      startYearsAgo: 3,
      endYearsAgo: null,
      description:
        "Principal architect accountable for Spotify's global cloud strategy across AWS and GCP, covering " +
        "3,500+ microservices and $600M+ annual cloud spend. " +
        "Led a 2-year initiative to migrate Spotify's remaining on-premise data pipelines to GCP Dataflow and " +
        "BigQuery, reducing batch processing costs by 38% and enabling near-real-time analytics. " +
        "Established a FinOps practice that identified and realised $85M in annualised cloud savings in year one. " +
        "Authored the Spotify Cloud Security Baseline, now the mandatory compliance framework for all new services. " +
        "Defined the Backstage-based Internal Developer Portal architecture used by 4,000+ engineers. " +
        "Presented 'Scaling Microservices at Spotify' at AWS re:Invent 2024, rated 4.8/5 by 900+ attendees. " +
        "Serve on the architecture review board, approving all projects with >$1M cloud footprint.",
    },
    {
      company: "__mock__twitter",
      jobTitleValue: "__mock__cloud_architect",
      location: "__mock__san_francisco",
      startYearsAgo: 8,
      endYearsAgo: 3,
      description:
        "Cloud Architect for Twitter's Infrastructure organisation, responsible for the AWS-based platform " +
        "serving Tweet ingestion (500M tweets/day) and real-time timeline delivery. " +
        "Designed the multi-region active-active architecture for the Timeline Service, achieving 99.995% " +
        "availability SLA and surviving two major AWS regional outages without user impact. " +
        "Led the Snowflake ID generator service re-architecture, supporting Twitter's growth to 3× previous " +
        "peak traffic. " +
        "Defined cloud cost governance policies that reduced infrastructure spend by $28M over 3 years. " +
        "Managed a 6-person cloud engineering guild spanning infra, security, and data platform teams.",
    },
    {
      company: "__mock__meta",
      jobTitleValue: "__mock__senior_backend_developer",
      location: "__mock__san_francisco",
      startYearsAgo: 12,
      endYearsAgo: 8,
      description:
        "Senior Backend Engineer on Meta's Ads Delivery infrastructure, building high-throughput auction and " +
        "targeting services processing 5M+ bid requests per second in C++ and Hack. " +
        "Designed a distributed rate-limiting service that prevented abuse-induced overload events, " +
        "protecting $200M+ in quarterly ad revenue. " +
        "Migrated the targeting eligibility service to a streaming architecture using Apache Flink, " +
        "cutting staleness from 30 minutes to under 60 seconds. " +
        "Promoted twice: E4 → E5 → E6 (equivalent to Staff Engineer) over 4 years.",
    },
    {
      company: "__mock__amazon",
      jobTitleValue: "__mock__backend_developer",
      location: "__mock__seattle",
      startYearsAgo: 15,
      endYearsAgo: 12,
      description:
        "Engineer on the AWS S3 Durability team, developing the erasure-coding and replication subsystems " +
        "that underpin 11-nines durability guarantees for exabytes of customer data. " +
        "Implemented a self-healing background scrubber in Java that auto-detected and repaired bit-rot " +
        "at scale, contributing to a published Amazon reliability whitepaper. " +
        "Began career as SDE I; promoted to SDE II within 18 months based on technical output and " +
        "cross-team collaboration.",
    },
  ],
  education: {
    institution: "University of Texas at Austin",
    degree: "Master of Science",
    fieldOfStudy: "Computer Science",
    location: "__mock__austin",
    startYear: 2009,
    endYear: 2011,
  },
};

export const mockResumePeople: MockResumePerson[] = [
  // Junior
  alexChen,
  priyaPatel,
  // Intermediate
  johnDoe,
  janeSmith,
  marcusLee,
  // Senior
  sarahWilliams,
  robertBrown,
  emilyDavis,
];
