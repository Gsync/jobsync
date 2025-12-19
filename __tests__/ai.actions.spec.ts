// @ts-nocheck - Mocking LangChain classes properly is complex, tests work correctly
// Mock LangChain modules BEFORE any imports
jest.mock("@langchain/openai");
jest.mock("@langchain/ollama");

// Mock AI utility functions
jest.mock("@/utils/ai.utils", () => ({
  convertResumeToText: jest.fn(),
  convertJobToText: jest.fn(),
}));

// Mock AI prompts
jest.mock("@/lib/ai.prompts", () => ({
  resumeReviewPrompt: {
    format: jest.fn(),
  },
  jobMatchPrompt: {
    format: jest.fn(),
  },
}));

import {
  getResumeReviewByOllama,
  getResumeReviewByOpenAi,
  getJobMatchByOllama,
  getJobMatchByOpenAi,
} from "@/actions/ai.actions";
import { Resume, SectionType } from "@/models/profile.model";
import { JobResponse } from "@/models/job.model";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { convertResumeToText, convertJobToText } from "@/utils/ai.utils";
import { resumeReviewPrompt, jobMatchPrompt } from "@/lib/ai.prompts";

// Type helpers for mocked classes
const MockedChatOllama = ChatOllama as unknown as jest.MockedClass<
  typeof ChatOllama
>;
const MockedChatOpenAI = ChatOpenAI as unknown as jest.MockedClass<
  typeof ChatOpenAI
>;
const MockedResumeReviewPrompt = resumeReviewPrompt as jest.Mocked<
  typeof resumeReviewPrompt
>;
const MockedJobMatchPrompt = jobMatchPrompt as jest.Mocked<
  typeof jobMatchPrompt
>;

describe("AI Actions", () => {
  // Mock data
  const mockResume: Resume = {
    id: "resume-1",
    profileId: "profile-1",
    title: "Software Engineer Resume",
    ContactInfo: {
      id: "contact-1",
      createdAt: new Date(),
      updatedAt: new Date(),
      resumeId: "resume-1",
      firstName: "John",
      lastName: "Doe",
      headline: "Senior Software Engineer",
      email: "john.doe@example.com",
      phone: "+1234567890",
      address: "123 Main St, City, State",
    },
    ResumeSections: [
      {
        id: "section-1",
        resumeId: "resume-1",
        sectionTitle: "Summary",
        sectionType: SectionType.SUMMARY,
        summary: {
          id: "summary-1",
          content: "Experienced software engineer with 5+ years",
        },
      },
    ],
  };

  const mockJob: JobResponse = {
    id: "job-1",
    userId: "user-1",
    JobTitle: {
      id: "jt-1",
      label: "Senior Developer",
      value: "senior-developer",
      createdBy: "user-1",
    },
    Company: {
      id: "c-1",
      label: "Tech Corp",
      value: "tech-corp",
      createdBy: "user-1",
    },
    Status: { id: "s-1", label: "Applied", value: "applied" },
    Location: {
      id: "l-1",
      label: "San Francisco, CA",
      value: "sf-ca",
      createdBy: "user-1",
    },
    JobSource: { id: "js-1", label: "LinkedIn", value: "linkedin" },
    jobType: "Full-time",
    createdAt: new Date(),
    appliedDate: new Date(),
    dueDate: new Date(),
    salaryRange: "$100k-$150k",
    description: "<p>Looking for an experienced developer</p>",
    jobUrl: "https://example.com/job",
    applied: true,
  };

  const mockResumeText =
    "John Doe - Senior Software Engineer\nExperience: 5+ years";
  const mockJobText = "Senior Developer at Tech Corp\nSan Francisco, CA";

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock implementations
    (convertResumeToText as jest.Mock).mockResolvedValue(mockResumeText);
    (convertJobToText as jest.Mock).mockResolvedValue(mockJobText);

    // Setup prompt mocks
    MockedResumeReviewPrompt.format.mockResolvedValue(
      "formatted resume prompt"
    );
    MockedJobMatchPrompt.format.mockResolvedValue("formatted job match prompt");

    // Mock environment variables
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  });

  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
    delete process.env.OLLAMA_BASE_URL;
  });

  describe("getResumeReviewByOllama", () => {
    it("should create ChatOllama model with correct configuration", async () => {
      const mockStream = createMockAsyncIterator([
        '{"summary": "Good resume"',
        ', "score": 85}',
      ]);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getResumeReviewByOllama(mockResume, "llama3.1");

      expect(ChatOllama).toHaveBeenCalledWith({
        baseUrl: "http://localhost:11434",
        model: "llama3.1",
        temperature: 0,
        format: "json",
      });
    });

    it("should use default baseUrl when OLLAMA_BASE_URL is not set", async () => {
      delete process.env.OLLAMA_BASE_URL;

      const mockStream = createMockAsyncIterator(['{"summary": "test"}']);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getResumeReviewByOllama(mockResume, "llama3.1");

      expect(ChatOllama).toHaveBeenCalledWith(
        expect.objectContaining({
          baseUrl: "http://127.0.0.1:11434",
        })
      );
    });

    it("should return a ReadableStream with encoded chunks", async () => {
      const mockChunkStrings = [
        '{"summary":',
        ' "Good resume",',
        ' "score": 85}',
      ];
      const mockChunks = mockChunkStrings.map((content) => ({ content }));
      const mockStream = createMockAsyncIterator(mockChunks);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      const result = await getResumeReviewByOllama(mockResume, "llama3.1");

      expect(result).toBeInstanceOf(ReadableStream);

      // Verify streaming functionality
      const reader = result!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      expect(fullText).toBe(mockChunkStrings.join(""));
    });

    it("should convert resume to text before processing", async () => {
      const mockStream = createMockAsyncIterator(['{"summary": "test"}']);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getResumeReviewByOllama(mockResume, "llama3.1");

      expect(convertResumeToText).toHaveBeenCalledWith(mockResume);
    });
  });

  describe("getResumeReviewByOpenAi", () => {
    it("should create ChatOpenAI model with correct configuration", async () => {
      const mockStream = createMockAsyncIterator(['{"summary": "test"}']);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getResumeReviewByOpenAi(mockResume, "gpt-4");

      expect(ChatOpenAI).toHaveBeenCalledWith({
        model: "gpt-4",
        openAIApiKey: "test-openai-key",
        temperature: 0,
        maxConcurrency: 1,
        maxTokens: 3000,
      });
    });

    it("should return a ReadableStream with encoded chunks", async () => {
      const mockChunkStrings = ['{"summary":', ' "Excellent resume"}'];
      const mockChunks = mockChunkStrings.map((content) => ({ content }));
      const mockStream = createMockAsyncIterator(mockChunks);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      const result = await getResumeReviewByOpenAi(mockResume, "gpt-4");

      expect(result).toBeInstanceOf(ReadableStream);

      const reader = result!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      expect(fullText).toBe(mockChunkStrings.join(""));
    });
  });

  describe("getJobMatchByOllama", () => {
    it("should create ChatOllama model with correct configuration", async () => {
      const mockStream = createMockAsyncIterator(['{"matching_score": 75}']);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getJobMatchByOllama(mockResume, mockJob, "llama3.1");

      expect(ChatOllama).toHaveBeenCalledWith({
        baseUrl: "http://localhost:11434",
        model: "llama3.1",
        temperature: 0,
        format: "json",
        maxConcurrency: 1,
        numCtx: 3000,
      });
    });

    it("should convert both resume and job to text", async () => {
      const mockStream = createMockAsyncIterator(['{"matching_score": 80}']);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getJobMatchByOllama(mockResume, mockJob, "llama3.1");

      expect(convertResumeToText).toHaveBeenCalledWith(mockResume);
      expect(convertJobToText).toHaveBeenCalledWith(mockJob);
    });

    it("should return a ReadableStream with job match results", async () => {
      const mockChunkStrings = [
        '{"matching_score":',
        " 85,",
        ' "suggestions": []}',
      ];
      const mockChunks = mockChunkStrings.map((content) => ({ content }));
      const mockStream = createMockAsyncIterator(mockChunks);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      const result = await getJobMatchByOllama(mockResume, mockJob, "llama3.1");

      expect(result).toBeInstanceOf(ReadableStream);

      const reader = result!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      expect(fullText).toBe(mockChunkStrings.join(""));
    });
  });

  describe("getJobMatchByOpenAi", () => {
    it("should create ChatOpenAI model with correct configuration", async () => {
      const mockStream = createMockAsyncIterator(['{"matching_score": 90}']);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getJobMatchByOpenAi(mockResume, mockJob, "gpt-4");

      expect(ChatOpenAI).toHaveBeenCalledWith({
        model: "gpt-4",
        openAIApiKey: "test-openai-key",
        temperature: 0,
        maxConcurrency: 1,
        maxTokens: 3000,
      });
    });

    it("should convert both resume and job to text", async () => {
      const mockStream = createMockAsyncIterator(['{"matching_score": 88}']);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getJobMatchByOpenAi(mockResume, mockJob, "gpt-4");

      expect(convertResumeToText).toHaveBeenCalledWith(mockResume);
      expect(convertJobToText).toHaveBeenCalledWith(mockJob);
    });

    it("should format prompt with resume and job description", async () => {
      const mockStream = createMockAsyncIterator(['{"matching_score": 92}']);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      await getJobMatchByOpenAi(mockResume, mockJob, "gpt-4");

      expect(MockedJobMatchPrompt.format).toHaveBeenCalledWith({
        resume: mockResumeText,
        job_description: mockJobText,
      });
    });

    it("should return a ReadableStream with job match results", async () => {
      const mockChunkStrings = [
        '{"matching_score": 95,',
        ' "detailed_analysis": [],',
        ' "suggestions": []}',
      ];
      const mockChunks = mockChunkStrings.map((content) => ({ content }));
      const mockStream = createMockAsyncIterator(mockChunks);

      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      const result = await getJobMatchByOpenAi(mockResume, mockJob, "gpt-4");

      expect(result).toBeInstanceOf(ReadableStream);

      const reader = result!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value);
      }

      expect(fullText).toBe(mockChunkStrings.join(""));
    });
  });

  describe("Prompt Template Usage", () => {
    it("should format prompts for all functions", async () => {
      const mockStream = createMockAsyncIterator(['{"test": "data"}']);

      MockedChatOllama.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));
      MockedChatOpenAI.mockImplementation(() => ({
        stream: jest.fn().mockResolvedValue(mockStream),
      }));

      // Test all four functions
      await getResumeReviewByOllama(mockResume, "llama3.1");
      await getResumeReviewByOpenAi(mockResume, "gpt-4");
      await getJobMatchByOllama(mockResume, mockJob, "llama3.1");
      await getJobMatchByOpenAi(mockResume, mockJob, "gpt-4");

      // Resume review should be called 2 times (Ollama and OpenAI)
      expect(MockedResumeReviewPrompt.format).toHaveBeenCalledTimes(2);
      // Job match should be called 2 times (Ollama and OpenAI)
      expect(MockedJobMatchPrompt.format).toHaveBeenCalledTimes(2);
    });
  });
});

/**
 * Helper function to create async iterator for mocking LangChain streams
 */
function createMockAsyncIterator<T>(items: T[]): AsyncIterable<T> {
  return {
    [Symbol.asyncIterator]: async function* () {
      for (const item of items) {
        yield item;
      }
    },
  };
}
