import { Metadata } from "next";
import DeveloperContainer from "@/components/developer/DeveloperContainer";

export const metadata: Metadata = {
  title: "Developer Options | JobSync",
  description: "Developer tools and utilities for development mode",
};

export default function DeveloperPage() {
  return (
    <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
      <div className="mx-auto w-full max-w-6xl">
        <DeveloperContainer />
      </div>
    </main>
  );
}
