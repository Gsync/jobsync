"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { getAutomationsList } from "@/actions/automation.actions";
import type { AutomationWithResume } from "@/models/automation.model";
import { AutomationList } from "./AutomationList";
import { AutomationWizard } from "./AutomationWizard";
import Loading from "@/components/Loading";

interface Resume {
  id: string;
  title: string;
}

interface AutomationContainerProps {
  resumes: Resume[];
}

export function AutomationContainer({ resumes }: AutomationContainerProps) {
  const [automations, setAutomations] = useState<AutomationWithResume[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editAutomation, setEditAutomation] =
    useState<AutomationWithResume | null>(null);

  const loadAutomations = useCallback(async () => {
    setLoading(true);
    const result = await getAutomationsList();

    if (result.success && result.data) {
      setAutomations(result.data);
    } else {
      toast({
        title: "Error",
        description: result.message || "Failed to load automations",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAutomations();
  }, [loadAutomations]);

  const handleEdit = (automation: AutomationWithResume) => {
    setEditAutomation(automation);
    setWizardOpen(true);
  };

  const handleWizardClose = (open: boolean) => {
    setWizardOpen(open);
    if (!open) {
      setEditAutomation(null);
    }
  };

  const handleSuccess = () => {
    loadAutomations();
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Job Discovery Automations</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={loadAutomations}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setWizardOpen(true)}
              disabled={resumes.length === 0}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Automation
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {resumes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>You need to create a resume before setting up automations.</p>
              <p className="text-sm mt-2">
                Go to your Profile to create a resume first.
              </p>
            </div>
          ) : loading ? (
            <Loading />
          ) : (
            <AutomationList
              automations={automations}
              onEdit={handleEdit}
              onRefresh={loadAutomations}
            />
          )}
        </CardContent>
      </Card>

      <AutomationWizard
        open={wizardOpen}
        onOpenChange={handleWizardClose}
        resumes={resumes}
        onSuccess={handleSuccess}
        editAutomation={editAutomation}
      />
    </>
  );
}
