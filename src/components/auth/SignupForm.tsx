"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { signup, authenticate } from "@/actions/auth.actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignupFormSchema } from "@/models/signupForm.schema";
import Loading from "../Loading";
import { useTranslations } from "@/i18n/use-translations";

function SignupForm() {
  const { t } = useTranslations();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof SignupFormSchema>>({
    resolver: zodResolver(SignupFormSchema),
    mode: "onChange",
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  const [errorMessage, setError] = useState("");
  const router = useRouter();

  const onSubmit = async (data: z.infer<typeof SignupFormSchema>) => {
    startTransition(async () => {
      setError("");
      const result = await signup(data);
      if (result.error) {
        setError(result.error);
        return;
      }
      const formData = new FormData();
      formData.set("email", data.email);
      formData.set("password", data.password);
      const authError = await authenticate("", formData);
      if (authError) {
        setError(authError);
      } else {
        router.push("/dashboard");
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.fullName")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("auth.fullNamePlaceholder")} autoComplete="name" suppressHydrationWarning {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.email")}</FormLabel>
                  <FormControl>
                    <Input placeholder={t("auth.emailPlaceholder")} autoComplete="email" suppressHydrationWarning {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <div className="grid gap-2">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password")}</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" suppressHydrationWarning {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? <Loading /> : t("auth.createAnAccount")}
          </Button>
          <div
            className="flex h-8 items-end space-x-1"
            aria-live="polite"
            aria-atomic="true"
          >
            {errorMessage && (
              <p className="text-sm text-red-500">{errorMessage}</p>
            )}
          </div>
        </div>
      </form>
    </Form>
  );
}

export default SignupForm;
