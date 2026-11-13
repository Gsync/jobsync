import { pageContextFor, pageLocationOf } from "@/lib/agent/pageContext";
import { buildPageContextMessage } from "@/lib/agent/prompt";

describe("pageContextFor", () => {
  it("extracts the resume id from a resume detail route", () => {
    expect(pageContextFor("/dashboard/profile/resume/abc-123")).toEqual({
      route: "/dashboard/profile/resume/abc-123",
      resumeId: "abc-123",
    });
  });

  it("extracts the job id from a job detail route", () => {
    expect(pageContextFor("/dashboard/myjobs/job-9")).toEqual({
      route: "/dashboard/myjobs/job-9",
      jobId: "job-9",
    });
  });

  it("omits both ids everywhere else", () => {
    expect(pageContextFor("/dashboard/myjobs")).toEqual({
      route: "/dashboard/myjobs",
    });
    expect(pageContextFor("/dashboard/profile/resume")).toEqual({
      route: "/dashboard/profile/resume",
    });
  });
});

describe("pageLocationOf", () => {
  // The ids decide, not the route: jobId is what match_job actually reads,
  // and a label that disagreed with the tool would be worse than none.
  it("reports a job page from the job id alone", () => {
    expect(pageLocationOf({ jobId: "job-9" })).toBe("job");
    expect(pageLocationOf(pageContextFor("/dashboard/myjobs/job-9"))).toBe("job");
  });

  it("reports a resume page from the resume id", () => {
    expect(pageLocationOf(pageContextFor("/dashboard/profile/resume/r1"))).toBe(
      "resume",
    );
  });

  it("distinguishes the jobs list from anywhere else", () => {
    expect(pageLocationOf(pageContextFor("/dashboard/myjobs"))).toBe("jobs-list");
    expect(pageLocationOf(pageContextFor("/dashboard/myjobs/"))).toBe("jobs-list");
    expect(pageLocationOf(pageContextFor("/dashboard/tasks"))).toBe("elsewhere");
  });

  it("falls back to elsewhere for a missing or empty context", () => {
    expect(pageLocationOf(undefined)).toBe("elsewhere");
    expect(pageLocationOf({})).toBe("elsewhere");
  });
});

describe("buildPageContextMessage", () => {
  it("names a job page so the model knows the tools will work", () => {
    const message = buildPageContextMessage({
      route: "/dashboard/myjobs/job-9",
      jobId: "job-9",
    });
    expect(message).toMatch(/viewing a specific job/i);
  });

  // The tag is what separates an app-supplied fact from user prose in a
  // role: "user" message. Every branch carries it, not just this one.
  it("delimits every line as an app-supplied block", () => {
    for (const context of [
      { jobId: "j" },
      { route: "/dashboard/myjobs" },
      { resumeId: "r" },
      undefined,
    ]) {
      const message = buildPageContextMessage(context);
      expect(message.startsWith("<page-context>")).toBe(true);
      expect(message.endsWith("</page-context>")).toBe(true);
    }
  });

  // Defect B: "no job is currently active in JobSync" means nothing to a user
  // looking at a screen full of jobs. The line has to name the page.
  it("names the jobs list rather than reporting an internal condition", () => {
    const message = buildPageContextMessage({ route: "/dashboard/myjobs" });
    expect(message).toMatch(/jobs list/i);
    expect(message).toMatch(/open/i);
  });

  it("says no job is open on a resume page and everywhere else", () => {
    expect(buildPageContextMessage({ resumeId: "r1" })).toMatch(/resume/i);
    expect(buildPageContextMessage(undefined)).toMatch(/not viewing a job/i);
  });

  // The security property: route, jobId and resumeId are all client-supplied,
  // so only the fixed table may reach the model.
  it("never echoes any client-supplied value", () => {
    const message = buildPageContextMessage({
      route: "/dashboard/myjobs/SECRET_ROUTE",
      jobId: "SECRET_ID",
      resumeId: "SECRET_RESUME",
    });
    expect(message).not.toContain("SECRET_ROUTE");
    expect(message).not.toContain("SECRET_ID");
    expect(message).not.toContain("SECRET_RESUME");
  });
});
