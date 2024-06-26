import { Resume } from "@/models/profile.model";
import { Card, CardDescription, CardHeader, CardTitle } from "./ui/card";
import AddResumeSection from "./AddResumeSection";
import ContactInfoCard from "./ContactInfoCard";

function ResumeContainer({ resume }: { resume: Resume }) {
  console.log("RESUME: ", resume);
  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <CardTitle>Resume</CardTitle>
          <CardDescription>{resume.title}</CardDescription>
          <div className="flex items-center">
            <AddResumeSection resume={resume} />
          </div>
        </CardHeader>
      </Card>
      <ContactInfoCard contactInfo={resume.ContactInfo} />
    </>
  );
}

export default ResumeContainer;
