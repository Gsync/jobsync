"use client";
import { useTransition, useState, useEffect } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Loader, PlusCircle } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { AddCompanyFormSchema } from "@/models/addCompanyForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { toast } from "../ui/use-toast";
import { addCompany, updateCompany } from "@/actions/company.actions";
import { Company } from "@/models/job.model";

type AddCompanyProps = {
  reloadCompanies: () => void;
  editCompany?: Company | null;
  resetEditCompany: () => void;
};

function AddCompany({
  reloadCompanies,
  editCompany,
  resetEditCompany,
}: AddCompanyProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const pageTitle = editCompany ? "Edit Company" : "Add Company";

  const form = useForm<z.infer<typeof AddCompanyFormSchema>>({
    resolver: zodResolver(AddCompanyFormSchema),
  });

  const { setValue, reset, formState, clearErrors } = form;

  useEffect(() => {
    if (editCompany) {
      clearErrors();
      setValue("id", editCompany.id);
      setValue("company", editCompany.label);
      setValue("createdBy", editCompany.createdBy);
      if (editCompany.logoUrl) {
        setValue("logoUrl", editCompany?.logoUrl);
      }

      setDialogOpen(true);
    }
  }, [editCompany, setValue, clearErrors]);

  const addCompanyForm = () => {
    reset();
    resetEditCompany();
    setDialogOpen(true);
  };

  const onSubmit = (data: z.infer<typeof AddCompanyFormSchema>) => {
    startTransition(async () => {
      const res = editCompany
        ? await updateCompany(data)
        : await addCompany(data);
      if (!res?.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: res?.message,
        });
      } else {
        reset();
        setDialogOpen(false);
        reloadCompanies();
        toast({
          variant: "success",
          description: `Company has been ${
            editCompany ? "updated" : "created"
          } successfully`,
        });
      }
    });
  };

  return (
    <>
      <Button
        size="sm"
        className="h-8 gap-1"
        onClick={addCompanyForm}
        data-testid="add-company-btn"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add Company
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="lg:max-h-screen overflow-y-scroll">
          <DialogHeader>
            <DialogTitle>{pageTitle}</DialogTitle>
            <DialogDescription className="text-primary">
              Caution: Editing name of the company will affect all the related
              job records.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
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
                  <Button type="submit" disabled={!formState.isDirty}>
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
