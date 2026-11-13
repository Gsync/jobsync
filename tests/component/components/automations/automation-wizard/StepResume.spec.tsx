import { render, screen } from "@testing-library/react";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { StepResume } from "@/components/automations/automation-wizard/StepResume";
import type { WizardResume } from "@/components/automations/automation-wizard/wizardConfig";

function Harness({ resumes }: { resumes: WizardResume[] }) {
  const form = useForm<any>({ defaultValues: { resumeId: "" } });
  return (
    <Form {...form}>
      <StepResume form={form} resumes={resumes} />
    </Form>
  );
}

describe("StepResume", () => {
  it("says no resumes exist when the list is empty", () => {
    render(<Harness resumes={[]} />);

    expect(screen.getByText(/No resumes found/)).toBeInTheDocument();
  });

  it("explains that resumes need more content when all are incomplete", () => {
    render(
      <Harness resumes={[{ id: "r1", title: "Draft", sectionCount: 0 }]} />,
    );

    expect(screen.queryByText(/No resumes found/)).not.toBeInTheDocument();
    expect(screen.getByText(/needs at least 2 sections/)).toBeInTheDocument();
  });

  it("shows no warning when every resume is complete", () => {
    render(<Harness resumes={[{ id: "r1", title: "CV", sectionCount: 3 }]} />);

    expect(screen.queryByText(/needs at least/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No resumes found/)).not.toBeInTheDocument();
  });
});
