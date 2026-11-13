import { updateJobStatus } from "@/actions/job.actions";
import { getCurrentUser } from "@/utils/user.utils";
import { changeJobStatus, JobNotFoundError } from "@/lib/jobs/timeline";

vi.mock("@/lib/db", () => ({ default: {} }));
vi.mock("@/utils/user.utils", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/jobs/timeline", async (importOriginal) => ({
  ...((await importOriginal()) as object),
  changeJobStatus: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const user = { id: "user-1" };
const interview = { id: "s-int", label: "Interview", value: "interview" };

beforeEach(() => {
  vi.clearAllMocks();
  (getCurrentUser as any).mockResolvedValue(user);
});

describe("updateJobStatus", () => {
  it("delegates to changeJobStatus with the picked status id", async () => {
    (changeJobStatus as any).mockResolvedValue({ id: "j1" });

    const res = await updateJobStatus("j1", interview as any);

    expect(changeJobStatus).toHaveBeenCalledWith({
      jobId: "j1",
      userId: user.id,
      statusId: "s-int",
    });
    expect(res).toStrictEqual({ job: { id: "j1" }, success: true });
  });

  it('returns success:false with "Job not found" when the module refuses', async () => {
    (changeJobStatus as any).mockRejectedValue(new JobNotFoundError());

    const res = await updateJobStatus("someone-elses", interview as any);

    expect(res).toStrictEqual({ success: false, message: "Job not found" });
  });
});
