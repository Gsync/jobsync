// FOLLOWING IS AN EXAMPLE OF ROUTE HANDLER APPROACH (FOR API refer to api/company/route.ts)
// FUNCTION IS REPLACED BY SERVER ACTION IN job.action.ts
// ========================================================
// export const upsertCompanyName = async (label: string) => {
//   const value = label.trim().toLowerCase();
//   const response = await fetch("/api/company", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({ label, value }),
//   });

//   if (!response.ok) {
//     throw new Error(`HTTP error! status: ${response.status}`);
//   }

//   const data = await response.json();
//   return data;
// };
