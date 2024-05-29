"use client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useFormStatus } from "react-dom";
import { authenticate } from "@/actions/auth.actions";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FormSchema = z.object({
  email: z
    .string({
      required_error: "Email is required.",
    })
    .min(3, {
      message: "Email must be at least 3 characters.",
    })
    .email("Please enter a valid email."),
  password: z
    .string({
      required_error: "Please enter your password.",
    })
    .min(1),
});

function SigninForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    mode: "onChange",
  });

  const [errorMessage, setError] = useState("");
  const router = useRouter();

  const { pending } = useFormStatus();

  const getFormData = (object: Object) =>
    Object.keys(object).reduce((formData, key) => {
      formData.append(key, object[key as keyof object]);
      return formData;
    }, new FormData());

  const onSubmit = async (data: z.infer<typeof FormSchema>) => {
    const formData = getFormData(data);
    const errorResponse = await authenticate("", formData);
    if (!!errorResponse) {
      setError(errorResponse);
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          // className="w-2/3 space-y-6"
        >
          <div className="grid gap-4">
            <div className="grid gap-2">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="id@example.com" {...field} />
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
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* <div className="flex items-center"> */}
              {/* <Label htmlFor="password">Password</Label> */}
              {/* <Link href="#" className="ml-auto inline-block text-sm underline">
                Forgot your password?
              </Link> */}
              {/* </div> */}
              {/* <Input id="password" type="password" required /> */}
            </div>
            <Button type="submit" aria-disabled={pending} className="w-full">
              Login
            </Button>
            <div
              className="flex h-8 items-end space-x-1"
              aria-live="polite"
              aria-atomic="true"
            >
              {errorMessage && (
                <>
                  <p className="text-sm text-red-500">{errorMessage}</p>
                </>
              )}
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default SigninForm;
