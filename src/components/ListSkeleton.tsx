import { Skeleton } from "@/components/ui/skeleton";

export default function ListSkeleton() {
  return (
    <div role="status" aria-label="Loading records" className="grid gap-3 py-4">
      <span className="sr-only">Loading records</span>
      {Array.from({ length: 5 }, (_, index) => (
        <div
          key={index}
          aria-hidden="true"
          className="flex h-12 items-center gap-4 border-b pb-3"
        >
          <Skeleton className="size-8 shrink-0 rounded-md" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="ml-auto h-5 w-20" />
        </div>
      ))}
    </div>
  );
}
