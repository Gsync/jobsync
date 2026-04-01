import { MOCK_DATA_IDENTIFIER } from "@/lib/data/mockActivities";

export { MOCK_DATA_IDENTIFIER };

export const mockJobDescriptions = [
  "We are looking for a talented engineer to join our team and help build scalable, high-performance web applications. You will work closely with product and design teams to deliver features that delight our users.",
  "Join our engineering team to design and implement robust backend services. You'll work with distributed systems, databases, and APIs to power our platform's core functionality.",
  "We're seeking a developer passionate about creating beautiful, responsive user interfaces. You'll collaborate with designers and backend engineers to build seamless user experiences across web and mobile.",
  "Help us build and maintain our cloud infrastructure. You'll work with containerization, CI/CD pipelines, and monitoring systems to ensure our platform is reliable and performant.",
  "We need an engineer to help us scale our data pipeline and analytics platform. You'll work with large datasets, streaming systems, and machine learning models to drive insights.",
  "Join our team to build next-generation developer tools and internal platforms. You'll improve engineering productivity and create tools that other teams rely on daily.",
  "We're looking for someone to help modernize our legacy systems. You'll work on migrating services to modern architectures while ensuring zero downtime and backward compatibility.",
  "Help us build secure, compliant systems that handle sensitive user data. You'll work with authentication, authorization, encryption, and audit logging across our platform.",
  "Join our growth engineering team to build and optimize user acquisition and onboarding flows. You'll run experiments, analyze results, and ship features that drive key metrics.",
  "We need an engineer to help build our real-time collaboration features. You'll work with WebSockets, conflict resolution algorithms, and state synchronization across clients.",
  "We're seeking a full-stack engineer to own features end-to-end, from database schema design to pixel-perfect UI implementation. You'll have significant autonomy and impact.",
  "Join our platform team to build shared services and libraries used by dozens of engineering teams. You'll design APIs, write documentation, and support internal customers.",
];

export const mockJobTypes = [
  "Full-time",
  "Full-time",
  "Full-time",
  "Contract",
  "Remote",
  "Hybrid",
];

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
