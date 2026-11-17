import { decodeHtml } from "../html";
import type { LinkedInJobDetails, LinkedInSearchResult } from "./types";
import { canonicalLinkedInJobUrl } from "./url";

function matchFirst(html: string, pattern: RegExp): string {
  return pattern.exec(html)?.[1] ?? "";
}

/** Converts a LinkedIn HTML fragment to readable text, preserving blocks. */
export function textFromHtml(html: string): string {
  if (!html) return "";
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<[^>]*>/g, "");
  return decodeHtml(withBreaks)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function oneLine(html: string): string {
  return textFromHtml(html).replace(/\s+/g, " ").trim();
}

/**
 * Returns the inner HTML of the first <div class="...className...">,
 * balancing nested divs so a description that contains a div is not cut off
 * at the first closing tag.
 */
function extractBalancedDiv(html: string, className: string): string {
  const opening = new RegExp(
    `<div[^>]*class="[^"]*${className}[^"]*"[^>]*>`,
    "i",
  );
  const match = opening.exec(html);
  if (!match) return "";

  const start = match.index + match[0].length;
  let depth = 1;
  const tagPattern = /<\/?div\b[^>]*>/gi;
  tagPattern.lastIndex = start;

  for (let tag = tagPattern.exec(html); tag; tag = tagPattern.exec(html)) {
    depth += tag[0].startsWith("</") ? -1 : 1;
    if (depth === 0) return html.slice(start, tag.index);
  }

  return html.slice(start);
}

const ALLOWED_TAGS = new Set([
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "blockquote",
  "a",
  "span",
  "div",
  "hr",
]);

/**
 * Conservatively strips active content from LinkedIn's description HTML before
 * it reaches the Tiptap editor. Tiptap already ignores unknown tags on parse,
 * but the stored value is also read by PDFs and AI prompts, so remove scripts,
 * event handlers and javascript: URLs here rather than relying on one renderer.
 */
export function sanitizeLinkedInHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[\s\S]*?<\/\1>/gi,
      "",
    )
    .replace(
      /<(script|style|iframe|object|embed|form|input|button|textarea|select|option|link|meta)\b[^>]*\/?>/gi,
      "",
    )
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "")
    .replace(/\sstyle\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(
      /\s(href|src)\s*=\s*("|')\s*javascript:[^"']*\2/gi,
      ' $1="#"',
    )
    .replace(/<\/?([a-z0-9]+)(?:\s[^>]*)?>/gi, (tag, name: string) =>
      ALLOWED_TAGS.has(name.toLowerCase()) ? tag : "",
    )
    .trim();
}

function inferWorkplaceType(
  location: string,
  title: string,
  description: string,
): LinkedInJobDetails["workplaceType"] {
  const sources = [
    location.toLowerCase(),
    title.toLowerCase(),
    description.slice(0, 600).toLowerCase(),
  ];
  for (const source of sources) {
    if (/\bhybrid\b/.test(source)) return "Hybrid";
    // Ignore benefit phrases such as "remote workspace stipend" while still
    // recognizing a genuine "remote role" elsewhere in the same text.
    const withoutRemoteBenefits = source.replace(
      /\bremote\s+(?:workspace|stipend|office|team|employees?|benefits?)\b/g,
      " ",
    );
    if (/\bremote\b/.test(withoutRemoteBenefits)) return "Remote";
    if (/\bon[- ]?site\b|\bin[- ]office\b/.test(source)) return "Onsite";
  }
  return undefined;
}

interface TechnologyPattern {
  label: string;
  pattern: RegExp;
}

// Curated languages/frameworks/platforms that commonly appear in job
// requirements. Patterns avoid generic words and use case-sensitive matching
// where a lowercase word would otherwise match ordinary prose (e.g. Go, Rust).
const TECHNOLOGY_PATTERNS: TechnologyPattern[] = [
  { label: "JavaScript", pattern: /\bJavaScript\b/i },
  { label: "TypeScript", pattern: /\bTypeScript\b/i },
  { label: "Python", pattern: /\bPython\b/i },
  { label: "Java", pattern: /\bJava\b/i },
  { label: "Kotlin", pattern: /\bKotlin\b/i },
  { label: "Swift", pattern: /\bSwift\b/ },
  { label: "Objective-C", pattern: /\bObjective-C\b/i },
  { label: "C++", pattern: /\bC\+\+/ },
  { label: "C#", pattern: /\bC#/ },
  { label: "Go", pattern: /\bGo(?:lang)?\b/ },
  { label: "Rust", pattern: /\bRust\b/i },
  { label: "Ruby", pattern: /\bRuby\b/i },
  { label: "PHP", pattern: /\bPHP\b/i },
  { label: "Scala", pattern: /\bScala\b/i },
  { label: "Elixir", pattern: /\bElixir\b/i },
  { label: "Erlang", pattern: /\bErlang\b/i },
  { label: "Haskell", pattern: /\bHaskell\b/i },
  { label: "Clojure", pattern: /\bClojure\b/i },
  { label: "Dart", pattern: /\bDart\b/ },
  { label: "Perl", pattern: /\bPerl\b/i },
  { label: "Lua", pattern: /\bLua\b/i },
  { label: "MATLAB", pattern: /\bMATLAB\b/i },
  { label: "Julia", pattern: /\bJulia\b/i },
  { label: "SQL", pattern: /\bSQL\b/i },
  { label: "HTML", pattern: /\bHTML\b/i },
  { label: "CSS", pattern: /\bCSS\b/i },
  { label: "Sass", pattern: /\b(?:Sass|SCSS)\b/i },
  { label: "Bash", pattern: /\bBash\b/i },
  { label: "PowerShell", pattern: /\bPowerShell\b/i },
  { label: "React Native", pattern: /\bReact\s+Native\b/i },
  { label: "React", pattern: /\bReact\b/i },
  { label: "Next.js", pattern: /\bNext\.js\b|\bNextJS\b/i },
  { label: "Vue.js", pattern: /\bVue(?:\.js|JS)?\b/i },
  { label: "Nuxt", pattern: /\bNuxt(?:\.js|JS)?\b/i },
  { label: "Angular", pattern: /\bAngular(?:JS)?\b/i },
  { label: "SvelteKit", pattern: /\bSvelteKit\b/i },
  { label: "Svelte", pattern: /\bSvelte\b/i },
  { label: "Redux", pattern: /\bRedux\b/i },
  { label: "Tailwind CSS", pattern: /\bTailwind(?:\s*CSS)?\b/i },
  { label: "Bootstrap", pattern: /\bBootstrap\b/ },
  { label: "jQuery", pattern: /\bjQuery\b/i },
  { label: "Webpack", pattern: /\bWebpack\b/i },
  { label: "Vite", pattern: /\bVite\b/i },
  { label: "Storybook", pattern: /\bStorybook\b/i },
  { label: "Node.js", pattern: /\bNode\.js\b|\bNodeJS\b/i },
  { label: "Express", pattern: /\bExpress(?:\.js|JS)?\b/ },
  { label: "NestJS", pattern: /\bNest(?:\.js|JS)\b/i },
  { label: "Django", pattern: /\bDjango\b/i },
  { label: "Flask", pattern: /\bFlask\b/ },
  { label: "FastAPI", pattern: /\bFastAPI\b/i },
  { label: "Spring Boot", pattern: /\bSpring\s*Boot\b/i },
  { label: "Spring Framework", pattern: /\bSpring\s+Framework\b/i },
  { label: "Ruby on Rails", pattern: /\b(?:Ruby\s+on\s+)?Rails\b/i },
  { label: "Laravel", pattern: /\bLaravel\b/i },
  { label: "ASP.NET", pattern: /\bASP\.NET\b/i },
  { label: ".NET", pattern: /\.NET\b/i },
  { label: "GraphQL", pattern: /\bGraphQL\b/i },
  { label: "REST", pattern: /\bREST(?:ful)?\b/ },
  { label: "gRPC", pattern: /\bgRPC\b/i },
  { label: "Kafka", pattern: /\b(?:Apache\s+)?Kafka\b/i },
  { label: "RabbitMQ", pattern: /\bRabbitMQ\b/i },
  { label: "Flutter", pattern: /\bFlutter\b/i },
  { label: "SwiftUI", pattern: /\bSwiftUI\b/i },
  { label: "Jetpack Compose", pattern: /\bJetpack\s+Compose\b/i },
  { label: "Android", pattern: /\bAndroid\b/ },
  { label: "iOS", pattern: /\biOS\b/ },
  { label: "TensorFlow", pattern: /\bTensorFlow\b/i },
  { label: "PyTorch", pattern: /\bPyTorch\b/i },
  { label: "scikit-learn", pattern: /\bscikit-learn\b/i },
  { label: "Pandas", pattern: /\bPandas\b/i },
  { label: "NumPy", pattern: /\bNumPy\b/i },
  { label: "Spark", pattern: /\bSpark\b/ },
  { label: "Hadoop", pattern: /\bHadoop\b/i },
  { label: "Airflow", pattern: /\bAirflow\b/i },
  { label: "dbt", pattern: /\bdbt\b/i },
  { label: "Snowflake", pattern: /\bSnowflake\b/i },
  { label: "BigQuery", pattern: /\bBigQuery\b/i },
  { label: "Redshift", pattern: /\bRedshift\b/i },
  { label: "Databricks", pattern: /\bDatabricks\b/i },
  { label: "Tableau", pattern: /\bTableau\b/i },
  { label: "Power BI", pattern: /\bPower\s*BI\b/i },
  { label: "AWS", pattern: /\bAWS\b|\bAmazon\s+Web\s+Services\b/ },
  { label: "Azure", pattern: /\bAzure\b/i },
  { label: "GCP", pattern: /\bGCP\b|\bGoogle\s+Cloud\b/ },
  { label: "Docker", pattern: /\bDocker\b/i },
  { label: "Kubernetes", pattern: /\bKubernetes\b|\bK8s\b/i },
  { label: "Terraform", pattern: /\bTerraform\b/i },
  { label: "Ansible", pattern: /\bAnsible\b/i },
  { label: "Jenkins", pattern: /\bJenkins\b/i },
  { label: "GitHub Actions", pattern: /\bGitHub\s+Actions\b/i },
  { label: "GitLab CI", pattern: /\bGitLab\s+CI\b/i },
  { label: "CI/CD", pattern: /\bCI\/CD\b/i },
  { label: "Linux", pattern: /\bLinux\b/i },
  { label: "Git", pattern: /\bGit\b/ },
  { label: "Nginx", pattern: /\bNginx\b/i },
  { label: "Prometheus", pattern: /\bPrometheus\b/i },
  { label: "Grafana", pattern: /\bGrafana\b/i },
  { label: "PostgreSQL", pattern: /\bPostgre(?:SQL|s)\b/i },
  { label: "MySQL", pattern: /\bMySQL\b/i },
  { label: "MongoDB", pattern: /\bMongo(?:DB)?\b/i },
  { label: "Redis", pattern: /\bRedis\b/i },
  { label: "DynamoDB", pattern: /\bDynamoDB\b/i },
  { label: "Cassandra", pattern: /\bCassandra\b/i },
  { label: "Elasticsearch", pattern: /\bElasticsearch\b/i },
  { label: "SQLite", pattern: /\bSQLite\b/i },
  { label: "SQL Server", pattern: /\bSQL\s*Server\b/i },
];

const MAX_TECHNOLOGIES = 8;

/**
 * Extracts the languages/frameworks/platforms mentioned in a posting. The
 * result is ordered by first mention so the stack the posting leads with is
 * shown first, and is capped so a card stays readable.
 */
export function extractTechnologies(text: string): string[] {
  if (!text) return [];

  const found: { label: string; index: number }[] = [];
  for (const { label, pattern } of TECHNOLOGY_PATTERNS) {
    const match = pattern.exec(text);
    if (match) found.push({ label, index: match.index });
  }

  // Drop a generic match when the text names a more specific sibling, e.g.
  // "React" when "React Native" is present or "Ruby" for "Ruby on Rails".
  const specific = found.filter(
    (entry) =>
      !found.some(
        (other) =>
          other !== entry &&
          (other.label.startsWith(`${entry.label} `) ||
            other.label.endsWith(` ${entry.label}`)),
      ),
  );

  const seen = new Set<string>();
  return specific
    .sort((a, b) => a.index - b.index)
    .filter((entry) => {
      if (seen.has(entry.label)) return false;
      seen.add(entry.label);
      return true;
    })
    .slice(0, MAX_TECHNOLOGIES)
    .map((entry) => entry.label);
}

function inferSalary(description: string): string | undefined {
  if (!/\b(salary|compensation|pay range|base pay)\b/i.test(description)) {
    return undefined;
  }
  const match = description.match(
    /\$[\d,]+(?:\.\d+)?(?:\s*[-–]\s*\$?[\d,]+(?:\.\d+)?)?/,
  );
  return match?.[0];
}

export function parseLinkedInJobHtml(
  html: string,
  id: string,
): LinkedInJobDetails | null {
  const title = oneLine(
    matchFirst(
      html,
      /<h[12][^>]*class="[^"]*top-card-layout__title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i,
    ) ||
      matchFirst(
        html,
        /<h[12][^>]*class="[^"]*topcard__title[^"]*"[^>]*>([\s\S]*?)<\/h[12]>/i,
      ),
  );
  const company = oneLine(
    matchFirst(
      html,
      /<a[^>]*class="[^"]*topcard__org-name-link[^"]*"[^>]*>([\s\S]*?)<\/a>/i,
    ),
  );
  if (!title || !company) return null;

  const location = oneLine(
    matchFirst(
      html,
      /<span[^>]*class="[^"]*topcard__flavor[^"]*topcard__flavor--bullet[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
    ),
  );

  const descriptionHtml = sanitizeLinkedInHtml(
    extractBalancedDiv(html, "show-more-less-html__markup") ||
      extractBalancedDiv(html, "description__text"),
  );
  const descriptionText = textFromHtml(descriptionHtml);

  const employmentType = oneLine(
    matchFirst(
      html,
      /Employment type[\s\S]{0,500}?<span[^>]*description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/i,
    ),
  );

  const postedDate =
    oneLine(
      matchFirst(
        html,
        /<span[^>]*class="[^"]*posted-time-ago__text[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      ),
    ) ||
    oneLine(
      matchFirst(
        html,
        /<time[^>]*class="[^"]*posted-time-ago[^"]*"[^>]*>([\s\S]*?)<\/time>/i,
      ),
    ) ||
    undefined;

  return {
    id,
    url: canonicalLinkedInJobUrl(id),
    title,
    company,
    location,
    descriptionHtml,
    descriptionText,
    employmentType: employmentType || undefined,
    workplaceType: inferWorkplaceType(location, title, descriptionText),
    postedDate,
    salary: inferSalary(descriptionText),
  };
}

export function parseLinkedInSearchResults(
  html: string,
): LinkedInSearchResult[] {
  const results: LinkedInSearchResult[] = [];
  const seen = new Set<string>();
  const cardPattern = /<li\b[^>]*>([\s\S]*?)<\/li>/gi;

  for (let card = cardPattern.exec(html); card; card = cardPattern.exec(html)) {
    const block = card[1];
    const id = matchFirst(
      block,
      /data-entity-urn="urn:li:jobPosting:(\d+)"/i,
    );
    const title = oneLine(
      matchFirst(
        block,
        /<h3[^>]*class="[^"]*base-search-card__title[^"]*"[^>]*>([\s\S]*?)<\/h3>/i,
      ),
    );
    if (!id || !title || seen.has(id)) continue;

    const company = oneLine(
      matchFirst(
        block,
        /<h4[^>]*class="[^"]*base-search-card__subtitle[^"]*"[^>]*>([\s\S]*?)<\/h4>/i,
      ),
    );
    const location = oneLine(
      matchFirst(
        block,
        /<span[^>]*class="[^"]*job-search-card__location[^"]*"[^>]*>([\s\S]*?)<\/span>/i,
      ),
    );
    const postedDate =
      matchFirst(block, /<time[^>]*datetime="([^"]+)"/i) ||
      oneLine(matchFirst(block, /<time[^>]*>([\s\S]*?)<\/time>/i)) ||
      undefined;
    const workplaceType = inferWorkplaceType(location, title, "");

    seen.add(id);
    results.push({
      id,
      url: canonicalLinkedInJobUrl(id),
      title,
      company,
      location,
      postedDate,
      ...(workplaceType ? { workplaceType } : {}),
    });
  }

  return results;
}
