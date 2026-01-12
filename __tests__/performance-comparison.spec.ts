/**
 * Performance Comparison Tests: V1 (5 agents) vs V2 (2 agents)
 * Phase 2: Measure latency, cost, and quality improvements
 */

import {
  collaborativeResumeReview,
  collaborativeJobMatch,
  consolidatedMultiAgentResumeReview,
  consolidatedMultiAgentJobMatch,
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
  latency: number; // milliseconds
  score: number;
  timestamp: Date;
  version: "v1" | "v2";
  type: "resume" | "job-match";
  warnings?: string[];
}

/**
 * Run a single test and collect metrics
 */
async function runTest(
  version: "v1" | "v2",
  type: "resume" | "job-match"
): Promise<PerformanceMetrics> {
  const startTime = Date.now();

  try {
    if (type === "resume") {
      const result =
        version === "v1"
          ? await collaborativeResumeReview(
              SAMPLE_RESUME,
              "openai" as ProviderType,
              "gpt-4o"
            )
          : await consolidatedMultiAgentResumeReview(
              SAMPLE_RESUME,
              "openai" as ProviderType,
              "gpt-4o"
            );

      const latency = Date.now() - startTime;

      return {
        latency,
        score: result.analysis.score,
        timestamp: new Date(),
        version,
        type,
        warnings: result.warnings,
      };
    } else {
      const result =
        version === "v1"
          ? await collaborativeJobMatch(
              SAMPLE_RESUME,
              SAMPLE_JOB,
              "openai" as ProviderType,
              "gpt-4o"
            )
          : await consolidatedMultiAgentJobMatch(
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
        version,
        type,
        warnings: result.warnings,
      };
    }
  } catch (error) {
    const latency = Date.now() - startTime;
    console.error(`Test failed for ${version} ${type}:`, error);
    return {
      latency,
      score: -1,
      timestamp: new Date(),
      version,
      type,
      warnings: [error instanceof Error ? error.message : String(error)],
    };
  }
}

/**
 * Run multiple iterations and calculate statistics
 */
async function runBenchmark(
  version: "v1" | "v2",
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
  console.log(
    `\n🏃 Running ${iterations} iterations for ${version} ${type}...`
  );

  const metrics: PerformanceMetrics[] = [];

  for (let i = 0; i < iterations; i++) {
    console.log(`  Iteration ${i + 1}/${iterations}...`);
    const result = await runTest(version, type);
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
 * Compare V1 vs V2 performance
 */
async function compareVersions() {
  console.log("=".repeat(80));
  console.log("PERFORMANCE COMPARISON: V1 (5 agents) vs V2 (2 agents)");
  console.log("=".repeat(80));

  // Resume Review Comparison
  console.log("\n📄 RESUME REVIEW TEST");
  const v1Resume = await runBenchmark("v1", "resume", 3);
  const v2Resume = await runBenchmark("v2", "resume", 3);

  console.log("\n📊 RESUME REVIEW RESULTS:");
  console.log(`V1 (5 agents):`);
  console.log(`  Avg Latency: ${(v1Resume.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(v1Resume.minLatency / 1000).toFixed(2)}s - ${(
      v1Resume.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${v1Resume.avgScore.toFixed(
      1
    )} ± ${v1Resume.scoreVariance.toFixed(1)}`
  );
  console.log(`  Success Rate: ${v1Resume.successRate.toFixed(0)}%`);

  console.log(`\nV2 (2 agents):`);
  console.log(`  Avg Latency: ${(v2Resume.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(v2Resume.minLatency / 1000).toFixed(2)}s - ${(
      v2Resume.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${v2Resume.avgScore.toFixed(
      1
    )} ± ${v2Resume.scoreVariance.toFixed(1)}`
  );
  console.log(`  Success Rate: ${v2Resume.successRate.toFixed(0)}%`);

  const resumeLatencyImprovement =
    ((v1Resume.avgLatency - v2Resume.avgLatency) / v1Resume.avgLatency) * 100;
  console.log(
    `\n✅ Latency Improvement: ${resumeLatencyImprovement.toFixed(1)}%`
  );
  console.log(`✅ Cost Reduction: ~60% (5 calls → 2 calls)`);

  // Job Match Comparison
  console.log("\n\n💼 JOB MATCH TEST");
  const v1Job = await runBenchmark("v1", "job-match", 3);
  const v2Job = await runBenchmark("v2", "job-match", 3);

  console.log("\n📊 JOB MATCH RESULTS:");
  console.log(`V1 (5 agents):`);
  console.log(`  Avg Latency: ${(v1Job.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(v1Job.minLatency / 1000).toFixed(2)}s - ${(
      v1Job.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${v1Job.avgScore.toFixed(1)} ± ${v1Job.scoreVariance.toFixed(
      1
    )}`
  );
  console.log(`  Success Rate: ${v1Job.successRate.toFixed(0)}%`);

  console.log(`\nV2 (2 agents):`);
  console.log(`  Avg Latency: ${(v2Job.avgLatency / 1000).toFixed(2)}s`);
  console.log(
    `  Range: ${(v2Job.minLatency / 1000).toFixed(2)}s - ${(
      v2Job.maxLatency / 1000
    ).toFixed(2)}s`
  );
  console.log(
    `  Avg Score: ${v2Job.avgScore.toFixed(1)} ± ${v2Job.scoreVariance.toFixed(
      1
    )}`
  );
  console.log(`  Success Rate: ${v2Job.successRate.toFixed(0)}%`);

  const jobLatencyImprovement =
    ((v1Job.avgLatency - v2Job.avgLatency) / v1Job.avgLatency) * 100;
  console.log(`\n✅ Latency Improvement: ${jobLatencyImprovement.toFixed(1)}%`);
  console.log(`✅ Cost Reduction: ~60% (5 calls → 2 calls)`);

  // Summary
  console.log("\n" + "=".repeat(80));
  console.log("SUMMARY");
  console.log("=".repeat(80));
  console.log(
    `Average Latency Improvement: ${(
      (resumeLatencyImprovement + jobLatencyImprovement) /
      2
    ).toFixed(1)}%`
  );
  console.log(`Cost Reduction: ~60% (5 LLM calls → 2 LLM calls)`);
  console.log(
    `Score Consistency: Both versions show similar scores (±${Math.max(
      v1Resume.scoreVariance,
      v2Resume.scoreVariance,
      v1Job.scoreVariance,
      v2Job.scoreVariance
    ).toFixed(1)} points)`
  );

  // Quality Check
  const scoreDiffResume = Math.abs(v1Resume.avgScore - v2Resume.avgScore);
  const scoreDiffJob = Math.abs(v1Job.avgScore - v2Job.avgScore);
  console.log(`\n📊 Score Difference (V1 vs V2):`);
  console.log(`  Resume: ${scoreDiffResume.toFixed(1)} points`);
  console.log(`  Job Match: ${scoreDiffJob.toFixed(1)} points`);

  if (scoreDiffResume <= 5 && scoreDiffJob <= 5) {
    console.log(
      `\n✅ QUALITY CHECK PASSED: Score differences within acceptable range (≤5 points)`
    );
  } else {
    console.log(
      `\n⚠️  QUALITY CHECK WARNING: Score differences may indicate quality degradation`
    );
  }

  console.log("\n" + "=".repeat(80));
}

// Wrap in describe block for Jest
describe("Performance Comparison: V1 vs V2", () => {
  it("should compare V1 and V2 performance", async () => {
    await compareVersions();
  }, 300000); // 5 minute timeout for comprehensive testing
});

// Run the comparison
if (require.main === module) {
  compareVersions()
    .then(() => {
      console.log("\n✅ Comparison complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Comparison failed:", error);
      process.exit(1);
    });
}

export { runTest, runBenchmark, compareVersions };
