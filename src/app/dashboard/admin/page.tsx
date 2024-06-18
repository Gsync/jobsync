import CompaniesContainer from "@/components/CompaniesContainer";
import JobLocationsContainer from "@/components/JobLocationsContainer";
import JobTitlesContainer from "@/components/JobTitlesContainer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

async function AdminPage() {
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
          <CompaniesContainer />
        </TabsContent>
        <TabsContent value="titles">
          <JobTitlesContainer />
        </TabsContent>
        <TabsContent value="locations">
          <JobLocationsContainer />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AdminPage;
