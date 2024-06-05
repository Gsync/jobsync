import { getCompanyList } from "@/actions/job.actions";
import CompaniesTable from "@/components/CompaniesTable";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function AdminPage() {
  const companies = await getCompanyList();
  return (
    <div className="flex flex-col col-span-3">
      <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">
        Administration
      </h3>
      <Tabs defaultValue="companies">
        <TabsList>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="titles">Job Titles</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>
        <TabsContent value="companies">
          <CompaniesTable companies={companies} />
        </TabsContent>
        <TabsContent value="titles">titles table here</TabsContent>
        <TabsContent value="locations">location table here</TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
