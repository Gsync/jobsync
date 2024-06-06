import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (n: number) => void;
};

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
}: PaginationProps) {
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const nextDisabled = currentPage === totalPages;
  const prevDisabled = currentPage === 1;

  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={() => {
              if (!prevDisabled) {
                onPageChange(currentPage - 1);
              }
            }}
            className={cn(
              "cursor-pointer",
              prevDisabled && "cursor-default text-muted-foreground"
            )}
          />
        </PaginationItem>
        {pages.map((page) => {
          return (
            <PaginationItem key={page}>
              <PaginationLink
                onClick={() => onPageChange(page)}
                className={page === currentPage ? "active" : ""}
              >
                {page}
              </PaginationLink>
            </PaginationItem>
          );
        })}
        {/* <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem> */}
        <PaginationItem>
          <PaginationNext
            onClick={() => {
              if (!nextDisabled) {
                onPageChange(currentPage + 1);
              }
            }}
            className={cn(
              "cursor-pointer",
              nextDisabled && "cursor-default text-muted-foreground"
            )}
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
