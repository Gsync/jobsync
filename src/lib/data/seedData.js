const STATUS_DATA = [
  { label: "Draft", value: "draft" },
  { label: "Applied", value: "applied" },
  { label: "Interview", value: "interview" },
  { label: "Offer", value: "offer" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
  { label: "Archived", value: "archived" },
];

const JOB_SOURCES = [
  { label: "Indeed", value: "indeed" },
  { label: "Linkedin", value: "linkedin" },
  { label: "Monster", value: "monster" },
  { label: "Glassdoor", value: "glassdoor" },
  { label: "Company Career page", value: "careerpage" },
  { label: "Google", value: "google" },
  { label: "ZipRecruiter", value: "ziprecruiter" },
  { label: "Job Street", value: "jobstreet" },
  { label: "Other", value: "other" },
];

module.exports = {
  STATUS_DATA,
  JOB_SOURCES,
};
