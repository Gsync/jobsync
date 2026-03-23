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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "../ui/use-toast";
import { Button } from "../ui/button";
import { useTheme } from "next-themes";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { getUserSettings, updateDisplaySettings } from "@/actions/userSettings.actions";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import { useTranslations } from "@/i18n";

const appearanceFormSchema = z.object({
  theme: z.enum(["light", "dark", "system"], {
    error: "Please select a theme.",
  }),
  locale: z.string().min(2),
});

type AppearanceFormValues = z.infer<typeof appearanceFormSchema>;

function DisplaySettings() {
  const { setTheme, theme, systemTheme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { t } = useTranslations();

  const form = useForm<AppearanceFormValues>({
    resolver: zodResolver(appearanceFormSchema),
    defaultValues: {
      theme: "system",
      locale: DEFAULT_LOCALE,
    },
  });

  useEffect(() => {
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const result = await getUserSettings();
        if (result.success && result.data?.settings?.display) {
          const display = result.data.settings.display;
          form.reset({
            theme: display.theme || "system",
            locale: display.locale || DEFAULT_LOCALE,
          });
          if (display.theme) setTheme(display.theme);
        } else if (theme) {
          form.reset({ theme: theme as "light" | "dark" | "system", locale: DEFAULT_LOCALE });
        }
      } catch (error) {
        console.error("Error fetching display settings:", error);
        if (theme) {
          form.reset({ theme: theme as "light" | "dark" | "system" });
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
      const result = await updateDisplaySettings({ theme: data.theme, locale: data.locale });
      if (result.success) {
        setTheme(data.theme);
        toast({
          variant: "success",
          title: t("settings.themeSaved"),
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: result.message || t("settings.saveFailed"),
        });
      }
    } catch (error) {
      console.error("Error saving display settings:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: t("settings.saveFailed"),
      });
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium">{t("settings.appearance")}</h3>
          <p className="text-sm text-muted-foreground">
            {t("settings.appearanceDesc")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t("settings.loadingSettings")}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg font-medium">{t("settings.appearance")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.appearanceDesc")}
        </p>
      </div>
      <div>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <FormField
                control={form.control}
                name="theme"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel>{t("settings.theme")}</FormLabel>
                    <FormDescription>
                      {t("settings.themeDesc")}
                    </FormDescription>
                    <FormMessage />
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="grid max-w-lg md:grid-cols-3 gap-8 pt-2"
                    >
                      <FormItem>
                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                          <FormControl>
                            <RadioGroupItem value="light" className="sr-only" />
                          </FormControl>
                          <LightThemeElement />
                          <span className="block w-full p-2 text-center font-normal">
                            {t("settings.light")}
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
                            {t("settings.dark")}
                          </span>
                        </FormLabel>
                      </FormItem>
                      <FormItem>
                        <FormLabel className="[&:has([data-state=checked])>div]:border-primary">
                          <FormControl>
                            <RadioGroupItem
                              value="system"
                              className="sr-only"
                            />
                          </FormControl>
                          {systemTheme === "dark" ? (
                            <DarkThemeElement />
                          ) : (
                            <LightThemeElement />
                          )}
                          <span className="block w-full p-2 text-center font-normal">
                            {t("settings.system")}
                          </span>
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locale"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("settings.language")}</FormLabel>
                    <FormDescription>
                      {t("settings.languageDesc")}
                    </FormDescription>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-[240px]">
                          <SelectValue placeholder={t("settings.selectLanguage")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SUPPORTED_LOCALES.map((loc) => (
                          <SelectItem key={loc.code} value={loc.code}>
                            <span className="flex items-center gap-2">
                              <Image
                                src={`/flags/${loc.flag}.svg`}
                                alt={loc.code}
                                width={16}
                                height={16}
                                className="inline-block"
                              />
                              {loc.nativeName}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t("settings.updatePreferences")}
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
        <div className="space-y-2 rounded-md bg-white p-2 shadow-sm">
          <div className="h-2 w-[80px] rounded-lg bg-[#ecedef]" />
          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-white p-2 shadow-sm">
          <div className="h-4 w-4 rounded-full bg-[#ecedef]" />
          <div className="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
        </div>
      </div>
    </div>
  );
}
function DarkThemeElement() {
  return (
    <div className="cursor-pointer items-center rounded-md border-2 border-muted bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
      <div className="space-y-2 rounded-sm bg-slate-950 p-2">
        <div className="space-y-2 rounded-md bg-slate-800 p-2 shadow-sm">
          <div className="h-2 w-[80px] rounded-lg bg-slate-400" />
          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
          <div className="h-4 w-4 rounded-full bg-slate-400" />
          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
        </div>
        <div className="flex items-center space-x-2 rounded-md bg-slate-800 p-2 shadow-sm">
          <div className="h-4 w-4 rounded-full bg-slate-400" />
          <div className="h-2 w-[100px] rounded-lg bg-slate-400" />
        </div>
      </div>
    </div>
  );
}
