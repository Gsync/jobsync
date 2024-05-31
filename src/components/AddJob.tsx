import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function AddJob() {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Add Job</DialogTitle>
      </DialogHeader>
      <form className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {/* Job Title */}
        <div className="flex flex-col">
          <Label htmlFor="title" className="mb-1">
            Job Title
          </Label>
          <Input
            id="title"
            name="title"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Company */}
        <div className="flex flex-col">
          <Label htmlFor="company" className="mb-1">
            Company
          </Label>
          <Input
            id="company"
            name="company"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Location */}
        <div className="flex flex-col">
          <Label htmlFor="location" className="mb-1">
            Location
          </Label>
          <Input
            id="location"
            name="location"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Job Source */}
        <div className="flex flex-col">
          <Label htmlFor="source" className="mb-1">
            Source
          </Label>
          <Input
            id="source"
            name="source"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Status */}
        <div className="flex flex-col">
          <Label htmlFor="status" className="mb-1">
            Status
          </Label>
          <Select defaultValue="draft">
            <SelectTrigger
              id="status"
              aria-label="Select status"
              className="w-[180px]"
            >
              <SelectValue placeholder="Select job status" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {/* Due Date */}
        <div className="flex flex-col">
          <Label htmlFor="due_date" className="mb-1">
            Due Date
          </Label>
          <Input
            id="due_date"
            name="due_date"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Date Applied */}
        <div className="flex flex-col">
          <Label htmlFor="date_applied" className="mb-1">
            Date Applied
          </Label>
          <Input
            id="date_applied"
            name="date_applied"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Salary Range */}
        <div className="flex flex-col">
          <Label htmlFor="salary_range" className="mb-1">
            Salary Range
          </Label>
          <Input
            id="salary_range"
            name="salary_range"
            type="text"
            className="p-2 border rounded"
          />
        </div>

        {/* Job Description */}
        <div className="flex flex-col md:col-span-2">
          <Label htmlFor="message" className="mb-1">
            Job Description
          </Label>
          <Textarea
            className="h-36 overflow-auto"
            placeholder="Paste you job description here."
            id="message"
          />
        </div>
      </form>
      {/* <div className="grid gap-4 py-4">
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="title" className="text-right">
            Job Title
          </Label>
          <Input id="title" className="col-span-3" />
        </div>
        <div className="grid grid-cols-4 items-center gap-4">
          <Label htmlFor="company" className="text-right">
            Company
          </Label>
          <Input id="company" className="col-span-3" />
        </div>
      </div> */}
      <DialogFooter>
        <DialogClose>
          <Button variant="outline">Cancel</Button>
        </DialogClose>
        <Button type="submit">Save</Button>
      </DialogFooter>
    </>
  );
}
