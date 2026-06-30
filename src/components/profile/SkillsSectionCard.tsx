"use client";
import { ResumeSection, Skill } from "@/models/profile.model";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Edit, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";

interface SkillsSectionCardProps {
  skillsSection: ResumeSection;
  openDialogForEdit: () => void;
  onDelete: () => void;
}

function groupByCategory(skills: Skill[]): Map<string, Skill[]> {
  const map = new Map<string, Skill[]>();
  const sorted = [...skills].sort((a, b) => a.order - b.order);
  for (const skill of sorted) {
    const key = skill.category ?? "";
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(skill);
  }
  return map;
}

function SkillsSectionCard({
  skillsSection,
  openDialogForEdit,
  onDelete,
}: SkillsSectionCardProps) {
  const skills = skillsSection.skills ?? [];
  const grouped = groupByCategory(skills);
  const hasCategories = Array.from(grouped.keys()).some((k) => k !== "");

  return (
    <>
      <CardTitle className="pl-6 py-3">{skillsSection.sectionTitle}</CardTitle>
      <Card>
        <CardHeader className="p-2 pb-0 flex-row justify-end items-center">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1"
              onClick={openDialogForEdit}
            >
              <Edit className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                Edit
              </span>
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
                    Delete
                  </span>
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete skills section?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will remove the entire skills section and all skills in
                    it. The skill tags themselves are not deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDelete}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {hasCategories ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
              {Array.from(grouped.entries()).map(([category, items]) => (
                <div
                  key={category || "__flat"}
                  className={`flex gap-2 text-sm${category ? "" : " col-span-2"}`}
                >
                  {category && (
                    <span className="text-muted-foreground uppercase text-xs font-medium w-28 shrink-0 pt-0.5">
                      {category}
                    </span>
                  )}
                  <span>
                    {items.map((s) => s.Tag?.label).filter(Boolean).join(" · ")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm">
              {skills.map((s) => s.Tag?.label).filter(Boolean).join(" · ")}
            </p>
          )}
        </CardContent>
      </Card>
    </>
  );
}

export default SkillsSectionCard;
