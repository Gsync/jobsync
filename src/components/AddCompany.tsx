"use client";
import { useTransition, useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Loader, PlusCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { toast } from "./ui/use-toast";
import { createCompany } from "@/actions/company.actions";

type AddCompanyProps = {
  reloadCompanies: () => void;
};

function AddCompany({ reloadCompanies }: AddCompanyProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editJob = false;
  const pageTitle = "editJob" ? "Edit Company" : "Add Company";

  const form = useForm<z.infer<typeof AddCompanyFormSchema>>({
    resolver: zodResolver(AddCompanyFormSchema),
  });

  const { setValue, reset } = form;

  const addCompanyForm = () => {
    // reset();
    // resetEditJob();
    setDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof AddCompanyFormSchema>) => {
    console.log("form data: ", data);
    startTransition(async () => {
      const res = await createCompany(data.company, data.logoUrl);
      reset();
      setDialogOpen(false);
      reloadCompanies();
    });
    toast({
      description: `Company has been ${
        editJob ? "updated" : "created"
      } successfully`,
    });
  };

  return (
    <>
      <Button size="sm" className="h-8 gap-1" onClick={addCompanyForm}>
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add Company
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="lg:max-h-screen overflow-y-scroll">
          <DialogHeader>
            <DialogTitle>{pageTitle}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
            >
              {/* COMPANY NAME */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="company"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* COMPANY LOGO URL */}
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="logoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Logo URL</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="md:col-span-2 mt-4">
                <DialogFooter
                // className="md:col-span
                >
                  <DialogClose>
                    <Button
                      type="reset"
                      variant="outline"
                      className="mt-2 md:mt-0 w-full"
                    >
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button type="submit">
                    Save
                    {isPending ? (
                      <Loader className="h-4 w-4 shrink-0 spinner" />
                    ) : null}
                  </Button>
                </DialogFooter>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default AddCompany;
