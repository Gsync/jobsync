"use client";
import { AddCertificationFormSchema } from "@/models/addCertificationForm.schema";
import { LicenseOrCertification, ResumeSection } from "@/models/profile.model";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { DatePicker } from "../DatePicker";
import { Switch } from "../ui/switch";
import { Button } from "../ui/button";
import { useEffect, useTransition } from "react";
import { toast } from "../ui/use-toast";
import { Loader } from "lucide-react";
import {
  addCertification,
  updateCertification,
} from "@/actions/profile.actions";

type AddCertificationProps = {
  resumeId: string | undefined;
  sectionId: string | undefined;
  dialogOpen: boolean;
  setDialogOpen: (e: boolean) => void;
  certificationToEdit?: ResumeSection;
};

function AddCertification({
  resumeId,
  sectionId,
  dialogOpen,
  setDialogOpen,
  certificationToEdit,
}: AddCertificationProps) {
  const pageTitle = certificationToEdit
    ? "Edit Certification / License"
    : "Add Certification / License";
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof AddCertificationFormSchema>>({
    resolver: zodResolver(AddCertificationFormSchema),
    defaultValues: {
      resumeId,
      sectionId,
      noExpiration: false,
    },
  });

  const { watch, reset, formState, resetField } = form;
  const noExpirationValue = watch("noExpiration");

  useEffect(() => {
    if (certificationToEdit) {
      const cert: LicenseOrCertification =
        certificationToEdit?.licenseOrCertifications?.at(0)!;
      reset(
        {
          id: cert?.id,
          title: cert?.title,
          organization: cert?.organization,
          issueDate: cert?.issueDate ? new Date(cert.issueDate) : undefined,
          expirationDate: cert?.expirationDate
            ? new Date(cert.expirationDate)
            : undefined,
          credentialUrl: cert?.credentialUrl ?? "",
          noExpiration: !cert?.expirationDate,
        },
        { keepDefaultValues: true },
      );
    } else {
      reset(
        {
          resumeId,
          sectionId,
        },
        { keepDefaultValues: true },
      );
    }
  }, [certificationToEdit, resumeId, sectionId, reset]);

  const onNoExpirationChange = (checked: boolean) => {
    if (checked) {
      resetField("expirationDate");
    }
  };

  const onSubmit = (data: z.infer<typeof AddCertificationFormSchema>) => {
    startTransition(async () => {
      const res = certificationToEdit?.licenseOrCertifications?.length
        ? await updateCertification(data)
        : await addCertification(data);
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
          description: `Certification has been ${
            certificationToEdit ? "updated" : "added"
          } successfully`,
        });
      }
    });
  };

  const closeDialog = () => setDialogOpen(false);

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent className="h-full md:h-[85%] lg:max-h-screen md:max-w-[40rem] overflow-y-scroll">
        <DialogHeader>
          <DialogTitle>{pageTitle}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 p-2"
          >
            {/* SECTION TITLE */}
            {!sectionId && (
              <>
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="sectionTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Section Title</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            placeholder="Ex: Certifications"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <hr className="md:col-span-2" />
              </>
            )}

            {/* CERTIFICATION TITLE */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Certification / License Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex: AWS Certified Solutions Architect"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ORGANIZATION */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="organization"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issuing Organization</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="Ex: Amazon Web Services"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* ISSUE DATE */}
            <div className="flex flex-col">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Issue Date</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled={true}
                      captionLayout={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* EXPIRATION DATE */}
            <div className="flex flex-col">
              <FormField
                control={form.control}
                name="expirationDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expiration Date</FormLabel>
                    <DatePicker
                      field={field}
                      presets={false}
                      isEnabled={!noExpirationValue}
                      captionLayout={true}
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* NO EXPIRATION */}
            <div className="flex items-center">
              <FormField
                control={form.control}
                name="noExpiration"
                render={({ field }) => (
                  <FormItem className="flex flex-row">
                    <Switch
                      checked={field.value}
                      onCheckedChange={(c) => {
                        field.onChange(c);
                        onNoExpirationChange(c);
                      }}
                    />
                    <FormLabel className="flex items-center ml-4 mb-2">
                      {field.value ? "No Expiration" : "Has Expiration Date"}
                    </FormLabel>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* CREDENTIAL URL */}
            <div className="md:col-span-2">
              <FormField
                control={form.control}
                name="credentialUrl"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Credential URL (optional)</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ""}
                        placeholder="https://www.credly.com/badges/..."
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="md:col-span-2 mt-4">
              <DialogFooter>
                <div>
                  <Button
                    type="reset"
                    variant="outline"
                    className="mt-2 md:mt-0 w-full"
                    onClick={closeDialog}
                  >
                    Cancel
                  </Button>
                </div>
                <Button type="submit" disabled={!formState.isDirty}>
                  Save
                  {isPending && <Loader className="h-4 w-4 shrink-0 spinner" />}
                </Button>
              </DialogFooter>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export default AddCertification;
