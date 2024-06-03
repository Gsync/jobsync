export interface MyJobs {
  id: number;
  company: string;
  companyLogo: string;
  jobTitle: string;
  location: string;
  status: string;
  jobSource: string;
  dateApplied: string;
}
export const MY_JOBS_DATA: { data: MyJobs[] } = {
  data: [
    {
      id: 1,
      company: "Microsoft",
      companyLogo: "/icons/microsoft-logo.svg",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 2,
      company: "Amazon",
      companyLogo: "/icons/amazon-logo.svg",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 3,
      company: "Google",
      companyLogo: "/icons/google-logo.svg",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 4,
      company: "Facebook",
      companyLogo: "/icons/facebook-logo.svg",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 5,
      company: "Netflix",
      companyLogo: "/icons/netflix-logo.svg",
      jobTitle: "Full Stack Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Linkedin",
      dateApplied: "2024-04-19",
    },
    {
      id: 6,
      company: "Apple",
      companyLogo: "/icons/apple-logo.svg",
      jobTitle: "Frontend Developer",
      location: "San Francisco",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 7,
      company: "Amazon",
      companyLogo: "/icons/amazon-logo.svg",
      jobTitle: "DevOps Engineer",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 8,
      company: "Microsoft",
      companyLogo: "/icons/microsoft-logo.svg",
      jobTitle: "Software Architect",
      location: "Remote",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 9,
      company: "Netflix",
      companyLogo: "/icons/netflix-logo.svg",
      jobTitle: "Frontend Developer",
      location: "Los Angeles",
      status: "Applied",
      jobSource: "Indeed",
      dateApplied: "2024-04-19",
    },
    {
      id: 10,
      company: "Apple",
      companyLogo: "/icons/apple-logo.svg",
      jobTitle: "Backend Developer",
      location: "Remote",
      status: "Applied",
      jobSource: "Linkedin",
      dateApplied: "2024-04-19",
    },
  ],
};
