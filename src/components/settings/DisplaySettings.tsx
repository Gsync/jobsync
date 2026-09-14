"use client";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toastSuccess, toastError } from "@/lib/toast";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import {
  getUserSettings,
  updateDisplaySettings,
} from "@/actions/userSettings.actions";

import { useUserSettings } from "@/context/UserSettingsContext";
import { Clock } from "lucide-react";

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    error: "Please select a theme.",
  }),
  clockFormat: z.enum(["12h", "24h"], {
    error: "Please select a clock format.",
  }),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

function DisplaySettings() {
  const { setTheme, theme, systemTheme } = useTheme();
  const { updateDisplay } = useUserSettings();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
      clockFormat: "12h",
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await getUserSettings();
        const display = result.data?.settings?.display;
        if (result.success && display) {
          const savedTheme = display.theme || "system";
          const savedClock = display.clockFormat || "12h";
          form.reset({ theme: savedTheme, clockFormat: savedClock });
          setTheme(savedTheme);
        } else if (theme) {
          form.reset({
            theme: theme as "light" | "dark" | "system",
            clockFormat: "12h",
          });
        }
      } catch (error) {
        console.error("Error fetching display settings:", error);
        if (theme) {
          form.reset({
            theme: theme as "light" | "dark" | "system",
            clockFormat: "12h",
          });
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(data: AppearanceFormValues) {
    setIsSaving(true);
    try {
      const result = await updateDisplaySettings({
        theme: data.theme,
        clockFormat: data.clockFormat,
      });
      if (result.success) {
        setTheme(data.theme);
        updateDisplay({
          theme: data.theme,
          clockFormat: data.clockFormat,
        });
        toastSuccess("Display settings have been saved.");
      } else {
        toastError(result.message || "Failed to save display settings.");
      }
    } catch (error) {
      console.error("Error saving display settings:", error);
      toastError("Failed to save display settings.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">Appearance & Display</h3>
          <p className="text-sm text-muted-foreground">
            Customize the look and feel and time preferences of the application.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">Appearance & Display</h3>
        <p className="text-sm text-muted-foreground">
          Customize the look and feel and time preferences of the application.
        </p>
      </div>
      <div className="@container">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="theme"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Theme</FormLabel>
                  <FormDescription>
                    Select the theme for the app.
                  </FormDescription>
                  <FormMessage />
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid max-w-lg @md:grid-cols-3 gap-8 pt-2"
                  >
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="light" className="sr-only" />
                        </FormControl>
                        <LightThemeElement />
                        <span className="block w-full p-2 text-center font-normal">
                          Light
                        </span>
                      </FormLabel>
                    </FormItem>
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="dark" className="sr-only" />
                        </FormControl>
                        <DarkThemeElement />
                        <span className="block w-full p-2 text-center font-normal">
                          Dark
                        </span>
                      </FormLabel>
                    </FormItem>
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                        <FormControl>
                          <RadioGroupItem value="system" className="sr-only" />
                        </FormControl>
                        {systemTheme === "dark" ? (
                          <DarkThemeElement />
                        ) : (
                          <LightThemeElement />
                        )}
                        <span className="block w-full p-2 text-center font-normal">
                          System
                        </span>
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="clockFormat"
              render={({ field }) => (
                <FormItem className="space-y-1">
                  <FormLabel>Clock Format</FormLabel>
                  <FormDescription>
                    Choose between 12-hour (AM/PM) and 24-hour time format.
                  </FormDescription>
                  <FormMessage />
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid max-w-lg @md:grid-cols-2 gap-4 pt-2"
                  >
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary block cursor-pointer">
                        <FormControl>
                          <RadioGroupItem value="12h" className="sr-only" />
                        </FormControl>
                        <div className="flex items-center gap-3 rounded-md border-2 border-muted p-4 hover:border-accent">
                          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <span className="block font-medium">12-hour</span>
                            <span className="block text-xs text-muted-foreground">
                              e.g. 02:30 PM
                            </span>
                          </div>
                        </div>
                      </FormLabel>
                    </FormItem>
                    <FormItem>
                      <FormLabel className="[&:has([data-state=checked])>div]:border-primary block cursor-pointer">
                        <FormControl>
                          <RadioGroupItem value="24h" className="sr-only" />
                        </FormControl>
                        <div className="flex items-center gap-3 rounded-md border-2 border-muted p-4 hover:border-accent">
                          <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                          <div>
                            <span className="block font-medium">24-hour</span>
                            <span className="block text-xs text-muted-foreground">
                              e.g. 14:30
                            </span>
                          </div>
                        </div>
                      </FormLabel>
                    </FormItem>
                  </RadioGroup>
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSaving}>
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default DisplaySettings;

function LightThemeElement() {
  return (
    <div className="cursor-pointer items-center rounded-md border-2 border-muted p-1 hover:border-accent">
      <div className="space-y-2 rounded-sm bg-[#ecedef] p-2">
        <div className="space-y-2 rounded-md bg-white p-2 shadow-xs">
          <div className="h-2 w-4/5 rounded-lg bg-[#ecedef]" />
          <div className="h-2 w-full rounded-lg bg-[#ecedef]" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs">
          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
          <div className="h-2 w-full rounded-lg bg-[#ecedef]" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-xs">
          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
          <div className="h-2 w-full rounded-lg bg-[#ecedef]" />
        </div>
      </div>
    </div>
  );
}
function DarkThemeElement() {
  return (
    <div className="cursor-pointer items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-2 rounded-sm bg-slate-950 p-2">
        <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-xs">
          <div className="h-2 w-4/5 rounded-lg bg-slate-400" />
          <div className="h-2 w-full rounded-lg bg-slate-400" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
          <div className="h-4 w-4 rounded-full bg-slate-400" />
          <div className="h-2 w-full rounded-lg bg-slate-400" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-xs">
          <div className="h-4 w-4 rounded-full bg-slate-400" />
          <div className="h-2 w-full rounded-lg bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
