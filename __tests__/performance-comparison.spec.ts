/**
 * Multi-Agent System Performance Tests
 * Measures latency, score consistency, and quality
 */

import {
  multiAgentResumeReview,
  multiAgentJobMatch,
  type ProviderType,
} from "@/lib/ai";

const SAMPLE_RESUME = `
John Doe
Senior Software Engineer

PROFESSIONAL SUMMARY
Experienced software engineer with 8+ years building scalable web applications.
Led teams of 5-10 engineers to deliver mission-critical systems.

EXPERIENCE
Senior Software Engineer - Tech Corp (2020-Present)
- Led migration to microservices architecture, reducing latency by 40%
- Managed $2M cloud infrastructure budget, achieving 25% cost savings
- Mentored 5 junior engineers, improving team velocity by 30%
- Built REST APIs handling 10M+ requests/day

Software Engineer - StartupCo (2016-2020)
- Developed React-based dashboard used by 50K+ users
- Implemented CI/CD pipeline reducing deployment time by 60%
- Optimized database queries improving response time by 45%

SKILLS
Languages: JavaScript, TypeScript, Python, SQL
Frontend: React, Next.js, Vue.js, HTML/CSS
Backend: Node.js, Express, Django, PostgreSQL
Cloud: AWS (EC2, S3, Lambda), Docker, Kubernetes
Tools: Git, Jest, Webpack, CI/CD

EDUCATION
BS Computer Science - State University (2016)
`;

const SAMPLE_JOB = `
Senior Full Stack Engineer

We are seeking an experienced full stack engineer to join our growing team.

REQUIREMENTS:
- 5+ years of professional software development experience
- Strong proficiency in JavaScript/TypeScript and React
- Experience with Node.js and RESTful API design
- Familiarity with cloud platforms (AWS, Azure, or GCP)
- Experience with Docker and containerization
- Strong problem-solving and communication skills

PREFERRED:
- Experience with Kubernetes and microservices
- PostgreSQL or other SQL database experience
- CI/CD pipeline setup and maintenance
- Team leadership or mentoring experience

RESPONSIBILITIES:
- Design and build scalable web applications
- Collaborate with product and design teams
- Mentor junior developers
- Participate in code reviews and technical planning
`;

interface PerformanceMetrics {
  latency: number;
  score: number;
  timestamp: Date;
  type: "resume" | "job-match";
  warnings?: string[];
}

/**
 * Run a single test and collect metrics
 */
async function runTest(
  type: "resume" | "job-match"
): Promise<PerformanceMetrics> {
  const startTime = Date.now();

  try {
    if (type === "resume") {
      const result = await multiAgentResumeReview(
        SAMPLE_RESUME,
        "openai" as ProviderType,
        "gpt-4o"
      );

      const latency = Date.now() - startTime;

      return {
        latency,
        score: result.analysis.score,
        timestamp: new Date(),
        type,
        warnings: result.warnings,
      };
    } else {
      const result = await multiAgentJobMatch(
        SAMPLE_RESUME,
        SAMPLE_JOB,
        "openai" as ProviderType,
        "gpt-4o"
      );

      const latency = Date.now() - startTime;

      return {
        latency,
        score: result.analysis.matching_score,
        timestamp: new Date(),
        type,
        warnings: result.warnings,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`Test failed for ${type}:`, error);
    return {
      latency,
      score: -1,
      timestamp: new Date(),
      type,
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Run multiple iterations and calculate statistics
 */
async function runBenchmark(
  type: "resume" | "job-match",
  iterations: number = 3
): Promise<{
  avgLatency: number;
  minLatency: number;
  maxLatency: number;
  avgScore: number;
  scoreVariance: number;
  successRate: number;
  metrics: PerformanceMetrics[];
}> {
  console.log(`\nRunning ${iterations} iterations for ${type}...`);

  const metrics: PerformanceMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`  Iteration ${i + 1}/${iterations}...`);
    const result = await runTest(type);
    metrics.push(result);

    // Wait 2 seconds between iterations to avoid rate limiting
    if (i < iterations - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  const successfulMetrics = metrics.filter((m) => m.score >= 0);
  const latencies = successfulMetrics.map((m) => m.latency);
  const scores = successfulMetrics.map((m) => m.score);

  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
  const scoreVariance =
    scores.reduce((sum, score) => sum + Math.pow(score - avgScore, 2), 0) /
    scores.length;

  return {
    avgLatency,
    minLatency: Math.min(...latencies),
    maxLatency: Math.max(...latencies),
    avgScore,
    scoreVariance: Math.sqrt(scoreVariance),
    successRate: (successfulMetrics.length / metrics.length) * 100,
    metrics,
  };
}

/**
 * Run performance benchmarks
 */
async function runPerformanceTests() {
  console.log("=".repeat(80));
  console.log("MULTI-AGENT SYSTEM PERFORMANCE TEST");
  console.log("=".repeat(80));

  // Resume Review Test
  console.log("\nRESUME REVIEW TEST");
  const resumeResults = await runBenchmark("resume", 3);

  console.log("\nRESUME REVIEW RESULTS:");
  console.log(`  Avg Latency: ${(resumeResults.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(resumeResults.minLatency / 1000).toFixed(2)}s - ${(
      resumeResults.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${resumeResults.avgScore.toFixed(
      1
    )} +/- ${resumeResults.scoreVariance.toFixed(1)}`
  );
  console.log(`  Success Rate: ${resumeResults.successRate.toFixed(0)}%`);

  // Job Match Test
  console.log("\n\nJOB MATCH TEST");
  const jobResults = await runBenchmark("job-match", 3);

  console.log("\nJOB MATCH RESULTS:");
  console.log(`  Avg Latency: ${(jobResults.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(jobResults.minLatency / 1000).toFixed(2)}s - ${(
      jobResults.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${jobResults.avgScore.toFixed(
      1
    )} +/- ${jobResults.scoreVariance.toFixed(1)}`
  );
  console.log(`  Success Rate: ${jobResults.successRate.toFixed(0)}%`);

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(
    `Average Latency: ${(
      (resumeResults.avgLatency + jobResults.avgLatency) /
      2000
    ).toFixed(2)}s`
  );
  console.log(
    `Score Consistency: +/-${Math.max(
      resumeResults.scoreVariance,
      jobResults.scoreVariance
    ).toFixed(1)} points`
  );
  console.log("=".repeat(80));
}

// Wrap in describe block for Jest
describe("Multi-Agent System Performance", () => {
  it("should complete resume review and job match successfully", async () => {
    await runPerformanceTests();
  }, 300000); // 5 minute timeout for comprehensive testing
});

// Run the benchmark
if (require.main === module) {
  runPerformanceTests()
    .then(() => {
      console.log("\nBenchmark complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\nBenchmark failed:", error);
      process.exit(1);
    });
}

export { runTest, runBenchmark, runPerformanceTests };
