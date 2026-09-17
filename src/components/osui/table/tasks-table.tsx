"use client";

import Image from "next/image";
import { forwardRef, useState, type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

type Task = Readonly<{
  id: string;
  title: string;
  assignee: string;
  avatar: string;
  due: string;
  done: boolean;
}>;

const TASKS: Task[] = [
  {
    id: "tk1",
    title: "Ship table components",
    assignee: "Bidyut Kundu",
    avatar: "/profile-picture.png",
    due: "Today",
    done: true,
  },
  {
    id: "tk2",
    title: "Review notification polish",
    assignee: "Rupam Sen",
    avatar: "/woman.png",
    due: "Tomorrow",
    done: false,
  },
  {
    id: "tk3",
    title: "Update showcase copy",
    assignee: "Ava Chen",
    avatar: "/profile-picture.png",
    due: "Mar 12",
    done: false,
  },
  {
    id: "tk4",
    title: "Fix mobile layout",
    assignee: "Sofia Ortiz",
    avatar: "/woman.png",
    due: "Mar 14",
    done: false,
  },
];

type TasksTableProps = ComponentPropsWithoutRef<"div">;

// Project tasks table — tap checkbox to mark done. Assignee avatars, due dates.
export const TasksTable = forwardRef<HTMLDivElement, TasksTableProps>(
  function TasksTable({ className, ...props }, ref) {
    const [doneIds, setDoneIds] = useState<Set<string>>(() => new Set(["tk1"]));

    function toggleDone(id: string) {
      setDoneIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }

    const completed = doneIds.size;

    return (
      <div
        ref={ref}
        className={cn(
          "w-full max-w-lg overflow-hidden rounded-xl border border-neutral-200 bg-white",
          className,
        )}
        {...props}
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Tasks</p>
            <p className="text-xs text-neutral-500">
              {`${completed} of ${TASKS.length} done`}
            </p>
          </div>
        </div>

        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-neutral-500">
              <th className="w-10 px-4 py-2.5" />
              <th className="px-2 py-2.5 font-medium">Task</th>
              <th className="hidden px-3 py-2.5 font-medium md:table-cell">
                Assignee
              </th>
              <th className="px-4 py-2.5 font-medium">Due</th>
            </tr>
          </thead>
          <tbody>
            {TASKS.map((task) => {
              const done = doneIds.has(task.id);
              return (
                <tr
                  key={task.id}
                  className="border-t border-neutral-100 transition-colors hover:bg-neutral-50/80"
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleDone(task.id)}
                      aria-label={done ? "Mark incomplete" : "Mark complete"}
                      className={cn(
                        "flex size-4 items-center justify-center rounded border transition-colors",
                        done
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300 bg-white hover:border-neutral-400",
                      )}
                    >
                      {done ? (
                        <Check
                          className="size-2.5 text-white"
                          strokeWidth={3}
                        />
                      ) : null}
                    </button>
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        "font-medium transition-colors",
                        done
                          ? "text-neutral-400 line-through"
                          : "text-neutral-900",
                      )}
                    >
                      {task.title}
                    </span>
                  </td>
                  <td className="hidden px-3 py-3 md:table-cell">
                    <div className="flex items-center gap-2">
                      <Image
                        src={task.avatar}
                        alt={task.assignee}
                        width={24}
                        height={24}
                        className="size-6 shrink-0 rounded-full object-cover"
                      />
                      <span className="text-neutral-600">{task.assignee}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-neutral-500">{task.due}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  },
);

TasksTable.displayName = "TasksTable";
