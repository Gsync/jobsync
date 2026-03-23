"use client";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tag } from "@/models/job.model";
import { MoreHorizontal, Trash } from "lucide-react";
import { useState } from "react";
import { deleteTagById } from "@/actions/tag.actions";
import { toast } from "../ui/use-toast";
import { DeleteAlertDialog } from "../DeleteAlertDialog";
import { AlertDialog } from "@/models/alertDialog.model";
import { useTranslations } from "@/i18n";

type TagsTableProps = {
  tags: Tag[];
  reloadTags: () => void;
};

function TagsTable({ tags, reloadTags }: TagsTableProps) {
  const { t } = useTranslations();
  const [alert, setAlert] = useState<AlertDialog>({
    openState: false,
    deleteAction: false,
  });

  const onDeleteTag = (tag: Tag) => {
    const jobCount = tag._count?.jobs ?? 0;
    const questionCount = tag._count?.questions ?? 0;

    if (jobCount > 0 || questionCount > 0) {
      setAlert({
        openState: true,
        title: t("admin.skillInUse"),
        description: t("admin.skillInUseDesc"),
        deleteAction: false,
      });
    } else {
      setAlert({
        openState: true,
        deleteAction: true,
        itemId: tag.id,
      });
    }
  };

  const deleteTag = async (tagId: string | undefined) => {
    if (!tagId) return;
    const { success, message } = await deleteTagById(tagId);
    if (success) {
      toast({
        variant: "success",
        description: t("admin.skillDeleted"),
      });
      reloadTags();
    } else {
      toast({
        variant: "destructive",
        title: t("common.error"),
        description: message,
      });
    }
  };

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("admin.skillLabel")}</TableHead>
            <TableHead className="hidden sm:table-cell">{t("admin.value")}</TableHead>
            <TableHead>{t("admin.numJobs")}</TableHead>
            <TableHead>{t("admin.numQuestions")}</TableHead>
            <TableHead>{t("common.actions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tags.map((tag: Tag) => (
            <TableRow key={tag.id}>
              <TableCell className="font-medium">{tag.label}</TableCell>
              <TableCell className="font-medium hidden sm:table-cell">
                {tag.value}
              </TableCell>
              <TableCell className="font-medium">
                {tag._count?.jobs ?? 0}
              </TableCell>
              <TableCell className="font-medium">
                {tag._count?.questions ?? 0}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button aria-haspopup="true" size="icon" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Toggle menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("common.actions")}</DropdownMenuLabel>
                    <DropdownMenuItem
                      className="text-red-600 cursor-pointer"
                      onClick={() => onDeleteTag(tag)}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <DeleteAlertDialog
        pageTitle="skill"
        open={alert.openState}
        onOpenChange={() => setAlert({ openState: false, deleteAction: false })}
        onDelete={() => deleteTag(alert.itemId)}
        alertTitle={alert.title}
        alertDescription={alert.description}
        deleteAction={alert.deleteAction}
      />
    </>
  );
}

export default TagsTable;
