import DisplaySettings from "@/components/DisplaySettings";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import React from "react";

function Settings() {
  return (
    <div className="flex flex-col col-span-3">
      <h3 className="text-2xl font-semibold leading-none tracking-tight mb-4">
        Settings
      </h3>
      <Tabs defaultValue="display">
        <TabsList>
          <TabsTrigger value="display">Display</TabsTrigger>
        </TabsList>
        <TabsContent value="display">
          <DisplaySettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Settings;
