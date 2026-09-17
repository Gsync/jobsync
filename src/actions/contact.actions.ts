export {
  getContactList,
  getAllContacts,
  getContactById,
  getContactsDirectory,
} from "./contact/queries";

export {
  createContact,
  updateContact,
  deleteContactById,
} from "./contact/mutations";

export {
  getJobContacts,
  addJobContact,
  removeJobContact,
} from "./contact/jobLinks";
