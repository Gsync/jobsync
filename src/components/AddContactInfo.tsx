"use client";
import { Loader } from "lucide-react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { AddContactInfoFormSchema } from "@/models/addContactInfoForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect, useTransition } from "react";
import { toast } from "./ui/use-toast";
import { ContactInfo } from "@/models/profile.model";
import { addContactInfo, updateContactInfo } from "@/actions/profile.actions";

interface AddContactInfoProps {
  dialogOpen: boolean;
  setDialogOpen: (e: boolean) => void;
  contactInfoToEdit?: ContactInfo | null;
  resumeId: string | undefined;
}

function AddContactInfo({
  dialogOpen,
  setDialogOpen,
  contactInfoToEdit,
  resumeId,
}: AddContactInfoProps) {
  const [isPending, startTransition] = useTransition();

  const pageTitle = contactInfoToEdit
    ? "Edit Contact Info"
    : "Add Contact Info";

  const form = useForm<z.infer<typeof AddContactInfoFormSchema>>({
    resolver: zodResolver(AddContactInfoFormSchema),
    defaultValues: {
      resumeId,
    },
  });

  const { setValue, reset, formState, clearErrors } = form;

  useEffect(() => {
    if (contactInfoToEdit) {
      clearErrors();
      setValue("id", contactInfoToEdit.id);
      setValue("resumeId", contactInfoToEdit.resumeId);
      setValue("firstName", contactInfoToEdit.firstName);
      setValue("lastName", contactInfoToEdit.lastName);
      setValue("headline", contactInfoToEdit.headline);
      setValue("email", contactInfoToEdit.email);
      setValue("phone", contactInfoToEdit.phone);
      setValue("address", contactInfoToEdit.address);
    } else {
      reset();
    }
  }, [contactInfoToEdit, setValue, clearErrors, reset, dialogOpen]);

  const onSubmit = (data: z.infer<typeof AddContactInfoFormSchema>) => {
    startTransition(async () => {
      const res = contactInfoToEdit
        ? await updateContactInfo(data)
        : await addContactInfo(data);
      if (!res.success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: res.message,
        });
      } else {
        reset();
        setDialogOpen(false);
        toast({
          variant: "success",
          description: `Contact Info has been ${
            contactInfoToEdit ? "updated" : "created"
          } successfully`,
        });
      }
    });
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="lg:max-h-screen overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* FIRST NAME */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* LAST NAME */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* HEADLINE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="headline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Headline</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* EMAIL */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* PHONE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ADDRESS */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address</FormLabel>
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
  );
}

export default AddContactInfo;
