/**
 * Resume Review Calibration Examples
 *
 * Diverse examples across industries and score ranges to anchor AI scoring.
 */

export const RESUME_CALIBRATION_EXAMPLES = `## FEW-SHOT CALIBRATION EXAMPLES (memorize these score anchors)

### Example 1: Senior Software Engineer → Score: 72/100 (Above Average)
**Resume Summary:** 6 years experience, FAANG background, 7 quantified achievements
**Scoring Breakdown:**
• Keywords (16/20): React, TypeScript, AWS, Docker, Kubernetes, PostgreSQL, GraphQL, CI/CD, Agile, REST APIs, microservices, Redis (12 strong technical terms)
• Quantified (20/25): 7 achievements with metrics: "Reduced API latency 60%", "Led team of 8", "Processed 2M daily transactions", "$500K annual savings", "99.9% uptime", "40% faster deployments", "3x improvement in test coverage"
• Action Verbs (8/10): Architected, Optimized, Led, Spearheaded, Implemented, Mentored, Streamlined
• Formatting (12/15): Clean sections, consistent bullets, good whitespace, minor date alignment issues
• Summary (7/10): States role target and key strengths, could add unique value proposition
• Clarity (9/10): Crystal clear progression, excellent STAR-format bullets
• Skills (4/5): Well-organized technical skills, missing soft skills section
• Grammar (5/5): Flawless
**Total: 16+20+8+12+7+9+4+5 = 81** → Adjusted to 72 (top of above average)
**Why not higher:** Missing cover letter synergy, summary could be punchier, no portfolio/GitHub links

### Example 2: Marketing Manager → Score: 54/100 (Average)
**Resume Summary:** 4 years experience, agency background, 3 quantified achievements
**Scoring Breakdown:**
• Keywords (11/20): Digital marketing, SEO, content strategy, social media, Google Analytics, brand management, campaign management (7 terms, missing specific tools like HubSpot, Marketo, Salesforce)
• Quantified (14/25): 3 achievements: "Grew social following 150%", "Managed $200K budget", "Increased engagement 45%". Missing: conversion rates, ROI, revenue impact
• Action Verbs (6/10): Managed, Created, Developed, Led - but also weak verbs: "Responsible for", "Helped with"
• Formatting (10/15): Clean but basic, inconsistent bullet lengths, no visual hierarchy
• Summary (5/10): Generic objective statement, doesn't differentiate from other candidates
• Clarity (7/10): Job duties clear but accomplishments buried in responsibilities
• Skills (3/5): Lists skills but no proficiency levels or categorization
• Grammar (4/5): Two minor typos ("their" vs "there", missing comma)
**Total: 11+14+6+10+5+7+3+4 = 60** → Adjusted to 54 (middle of average)
**Why lower:** Too responsibility-focused vs achievement-focused, weak differentiation

### Example 3: Recent Graduate (Entry-Level) → Score: 41/100 (Below Average - but normal for new grads)
**Resume Summary:** New CS graduate, 2 internships, 1 project
**Scoring Breakdown:**
• Keywords (8/20): Python, Java, SQL, Git, Agile, AWS (6 terms - good for entry level)
• Quantified (8/25): 1 achievement: "Reduced data processing time by 30%". Academic projects lack metrics.
• Action Verbs (5/10): Developed, Built, Created - but limited variety
• Formatting (11/15): Very clean, good use of sections for Education, Projects, Experience
• Summary (4/10): Lists skills but no career narrative or unique value
• Clarity (6/10): Internship descriptions vague, projects need more technical depth
• Skills (3/5): Good technical section but missing any soft skills
• Grammar (5/5): Perfect
**Total: 8+8+5+11+4+6+3+5 = 50** → Adjusted to 41 (entry-level appropriate)
**Important Context:** This is NORMAL for new grads. Score reflects room to grow, not failure.

### Example 4: Healthcare Professional (Registered Nurse) → Score: 63/100 (Above Average for field)
**Resume Summary:** 8 years RN experience, specialty certifications
**Scoring Breakdown:**
• Keywords (14/20): ICU, patient care, EMR systems, Epic, medication administration, wound care, patient advocacy, HIPAA, BLS, ACLS, charge nurse, precepting (12 healthcare-specific terms)
• Quantified (12/25): 2 strong achievements: "Managed care for 6 patients simultaneously", "Reduced medication errors 25% through new protocol", but healthcare metrics are harder to quantify
• Action Verbs (7/10): Administered, Coordinated, Assessed, Advocated, Trained, Mentored
• Formatting (13/15): Clean, professional, appropriate sections for certifications and licensure
• Summary (8/10): Strong summary highlighting specialty and years of experience
• Clarity (8/10): Clear facility names, units, responsibilities - industry-appropriate format
• Skills (4/5): Comprehensive clinical skills with certifications properly listed
• Grammar (5/5): Perfect
**Total: 14+12+7+13+8+8+4+5 = 71** → Adjusted to 63 (strong for healthcare)
**Industry Note:** Healthcare resumes prioritize certifications, licensure, and clinical skills over quantified metrics. This is an excellent healthcare resume despite fewer numbers.

### Example 5: Career Changer (Sales to Product Management) → Score: 48/100 (Fair - transition penalty)
**Resume Summary:** 5 years sales, pursuing PM transition
**Scoring Breakdown:**
• Keywords (9/20): Customer success, stakeholder management, roadmap, user research, Agile, JIRA (6 PM-adjacent terms, but heavy on sales terminology)
• Quantified (16/25): 5 strong sales achievements: "$1.2M annual quota", "125% of target", "45 client accounts", "30% upsell rate", "$500K pipeline"
• Action Verbs (7/10): Drove, Negotiated, Built, Managed, Exceeded, Presented
• Formatting (11/15): Clean, but experience section doesn't highlight transferable PM skills
• Summary (4/10): States transition desire but doesn't bridge sales-to-PM narrative
• Clarity (6/10): Sales role clear, but PM relevance of each bullet unclear
• Skills (3/5): Missing PM tools (Figma, analytics platforms, A/B testing)
• Grammar (5/5): Perfect
**Total: 9+16+7+11+4+6+3+5 = 61** → Adjusted to 48 (transition gap)
**Transition Feedback:** Strong foundation, but resume doesn't translate sales wins to PM language. Needs skill mapping and PM project experience.`;

export const SCORING_PHASES = `## YOUR ANALYTICAL PROCESS (follow precisely)

### PHASE 1: RECONNAISSANCE (30 seconds)
1. **Identify Resume Type:** What industry/role? What career stage (entry/mid/senior/executive)?
2. **Set Expectations:** A new grad CANNOT have 8 quantified achievements. A nurse WON'T have GitHub links. Adjust mental baseline.
3. **First Impression:** What jumps out as strongest? What's obviously missing?

### PHASE 2: FORENSIC COUNTING (be exact)
Count these elements LITERALLY - no estimating:

**Quantified Achievements** (0-25 pts) - COUNT each number/percentage/dollar amount:
- Tip: Look for %, $, #, "increased", "reduced", "managed", "led team of"
- Format: "Found X quantified achievements: [list each one]"

**Technical Keywords** (0-20 pts) - COUNT industry-specific terms:
- Tip: Technologies, tools, methodologies, certifications, domain terms
- Format: "Found X keywords: [list them]"

**Action Verbs** (0-10 pts) - Note strong vs weak:
- Strong: Led, Architected, Transformed, Spearheaded, Delivered, Optimized
- Weak: Responsible for, Helped with, Assisted in, Worked on, Did
- Format: "Found X strong verbs, Y weak verbs"

### PHASE 3: QUALITATIVE ASSESSMENT

**Formatting Quality** (0-15 pts):
- Visual hierarchy (headings, subheadings, bullets)
- Consistent spacing and alignment
- Appropriate length (1 page for <10 yrs, 2 pages for >10 yrs)
- ATS-friendly (no tables, columns, graphics)

**Professional Summary** (0-10 pts):
- Does it answer: "What do you do? What are you great at? What value do you bring?"
- Is it customizable for target roles?
- Does it avoid clichés ("hardworking team player")?

**Experience Clarity** (0-10 pts):
- Clear company names, titles, dates
- STAR format (Situation, Task, Action, Result)
- Progression visible (increasing responsibility)

**Skills Section** (0-5 pts):
- Organized by category (languages, frameworks, tools)
- Relevant to target role
- No fluff skills ("Microsoft Word" for a developer)

**Grammar/Spelling** (0-5 pts):
- Any errors at all?
- Consistent tense (past for old roles, present for current)
- Professional tone

### PHASE 4: CALCULATE TOTAL
Show your math explicitly:
"Keywords: X + Quantified: Y + Verbs: Z + Formatting: A + Summary: B + Clarity: C + Skills: D + Grammar: E = TOTAL"

### PHASE 5: SELF-CRITIQUE CHECKLIST
Before submitting, verify:
□ Did I COUNT actual elements or just estimate?
□ Is my score within realistic range for this career stage?
□ Would a human recruiter agree with my assessment?
□ Are my suggestions SPECIFIC with examples from THIS resume?
□ Did I reference actual text from the resume in my feedback?
□ Is at least one suggestion about the HIGHEST-IMPACT improvement?`;

export const SCORE_INTERPRETATION_GUIDE = `## SCORE INTERPRETATION GUIDE
- **85-100:** Exceptional - Top 5% of resumes. Ready for FAANG/top-tier companies.
- **70-84:** Above Average - Strong resume, minor polish needed. Competitive for good roles.
- **55-69:** Average - Serviceable but doesn't stand out. Needs work to compete.
- **40-54:** Below Average - Significant gaps. Major revision recommended.
- **25-39:** Weak - Fundamental issues. Needs substantial rewrite.
- **<25:** Critical - Only for nearly blank or severely problematic resumes.

## REALITY CHECK
- Most resumes score 45-65
- Entry-level resumes typically score 35-50
- Even excellent resumes rarely exceed 80
- A score of 50 is NOT bad - it's genuinely average`;
