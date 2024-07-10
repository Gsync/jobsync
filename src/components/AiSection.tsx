import { PlusCircle } from "lucide-react";
import { Button } from "./ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetOverlay,
  SheetPortal,
  SheetTitle,
} from "./ui/sheet";
import Loading from "./Loading";

interface AiSectionProps {
  aISectionOpen: boolean;
  setAiSectionOpen: (o: boolean) => void;
  getAiResponse: () => void;
  aIContent: string;
  isPending: boolean;
}

const AiSection = ({
  aISectionOpen,
  setAiSectionOpen,
  getAiResponse,
  aIContent,
  isPending,
}: AiSectionProps) => {
  return (
    <Sheet open={aISectionOpen} onOpenChange={setAiSectionOpen}>
      <div className="ml-2">
        <Button
          size="sm"
          className="h-8 gap-1 cursor-pointer"
          onClick={getAiResponse}
          disabled={isPending}
        >
          <PlusCircle className="h-3.5 w-3.5" />
          <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
            Review
          </span>
        </Button>
      </div>
      <SheetPortal>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>AI Review</SheetTitle>
            <SheetDescription>
              {isPending ? (
                <div className="flex items-center flex-col">
                  <Loading />
                  <div>Loading...</div>
                </div>
              ) : (
                aIContent
              )}
            </SheetDescription>
          </SheetHeader>
        </SheetContent>
      </SheetPortal>
    </Sheet>
  );
};

export default AiSection;
