// Barrel for the company server actions, split into src/actions/company/.
// Each module below carries its own "use server"; this file only re-exports so
// the long-standing "@/actions/company.actions" import path keeps working.

export {
  getCompanyList,
  getAllCompanies,
  getCompanyById,
} from "./company/queries";

export {
  addCompany,
  updateCompany,
  deleteCompanyById,
} from "./company/mutations";

export {
  watchBoardCompany,
  setCompanyWatched,
  getWatchedBoards,
} from "./company/watch";
