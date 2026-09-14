// Barrel for the profile/resume server actions, split into src/actions/profile/.
// Each module below carries its own "use server"; this file only re-exports so
// the long-standing "@/actions/profile.actions" import path keeps working.

export {
  getResumeList,
  getResumeById,
  saveResumeReviewResult,
  createResumeProfile,
  editResume,
  deleteResumeById,
} from "./profile/resume";

export { getDefaultResumeId, setDefaultResume } from "./profile/defaultResume";

export {
  getResumeCopyTitleSuggestion,
  copyResume,
} from "./profile/resumeCopy";

export { deleteFile } from "./profile/files";

export {
  addContactInfo,
  updateContactInfo,
  getDefaultContactInfo,
} from "./profile/contactInfo";

export { addResumeSummary, updateResumeSummary } from "./profile/summary";

export { addExperience, updateExperience } from "./profile/experience";

export { addEducation, updateEducation } from "./profile/education";

export { addCertification, updateCertification } from "./profile/certification";

export {
  addSkillsSection,
  updateSkillsSection,
  deleteSkillsSection,
} from "./profile/skills";
