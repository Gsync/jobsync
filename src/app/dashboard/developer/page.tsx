import { Metadata } from "next";
import {
  MockActivitiesCard,
  MockProfileCard,
} from "@/components/developer/DeveloperContainer";

export const metadata: Metadata = {
  title: "Developer Options | JobSync",
  description: "Developer tools and utilities for development mode",
};

export default function DeveloperPage() {
  return (
    <>
      <div className="col-span-3">
        <h1 className="text-3xl font-bold tracking-tight">Developer Options</h1>
        <p className="text-muted-foreground mt-2">
          Tools for development and testing. Only available in development mode.
        </p>
      </div>
      <div className="col-start-1 self-start">
        <MockActivitiesCard />
      </div>
      <div className="col-start-2 self-start">
        <MockProfileCard />
      </div>
    </>
  );
}
