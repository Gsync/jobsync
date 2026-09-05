"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toastSuccess, toastError } from "@/lib/toast";
import {
  pauseAutomation,
  resumeAutomation,
  deleteAutomation,
} from "@/actions/automation.actions";
import type { AutomationWithResume } from "@/models/automation.model";

// Pause/resume and delete for the automation being viewed.
export function useAutomationLifecycle(
  automation: AutomationWithResume | null,
  loadData: (showLoading?: boolean) => Promise<void>,
) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePauseResume = async () => {
    if (!automation) return;

    setActionLoading(true);
    const result =
      automation.status === "active"
        ? await pauseAutomation(automation.id)
        : await resumeAutomation(automation.id);
    setActionLoading(false);

    if (result.success) {
      toastSuccess(
        automation.status === "active"
          ? "Automation paused"
          : "Automation resumed",
      );
      loadData();
    } else {
      toastError(result.message);
    }
  };

  const handleDelete = async () => {
    if (!automation) return;
    setIsDeleting(true);
    const result = await deleteAutomation(automation.id);
    setIsDeleting(false);
    setDeleteConfirmOpen(false);

    if (result.success) {
      toastSuccess("Automation deleted");
      router.push("/dashboard/automations");
    } else {
      toastError(result.message);
    }
  };

  return {
    actionLoading,
    handlePauseResume,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    isDeleting,
    handleDelete,
  };
}
