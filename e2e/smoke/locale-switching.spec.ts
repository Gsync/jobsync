import { test, expect, type BrowserContext, type Page } from "@playwright/test";

/**
 * Expected translations for the signin page, keyed by locale.
 * Values sourced from src/i18n/dictionaries.ts (core dict, auth namespace).
 */
const LOCALE_STRINGS = {
  en: {
    signIn: "Sign In",
    welcomeBack: "Welcome back",
    email: "Email",
    password: "Password",
    login: "Login",
    emailPlaceholder: "id@example.com",
    subtitle: "Track your job search, powered by AI",
    createAccount: "Create Account",
  },
  de: {
    signIn: "Anmelden",
    welcomeBack: "Willkommen zurück",
    email: "E-Mail",
    password: "Passwort",
    login: "Einloggen",
    emailPlaceholder: "id@beispiel.de",
    subtitle: "Verfolge deine Jobsuche, unterstützt durch KI",
    createAccount: "Konto erstellen",
  },
  fr: {
    signIn: "Se connecter",
    welcomeBack: "Bon retour",
    email: "E-mail",
    password: "Mot de passe",
    login: "Connexion",
    emailPlaceholder: "id@exemple.com",
    subtitle: "Suivez votre recherche d'emploi, propulsé par l'IA",
    createAccount: "Créer un compte",
  },
  es: {
    signIn: "Iniciar sesión",
    welcomeBack: "Bienvenido de nuevo",
    email: "Correo electrónico",
    password: "Contraseña",
    login: "Entrar",
    emailPlaceholder: "id@ejemplo.com",
    subtitle: "Gestiona tu búsqueda de empleo, impulsado por IA",
    createAccount: "Crear cuenta",
  },
} as const;

/**
 * Dashboard nav items per locale, from core dict nav namespace.
 */
const DASHBOARD_NAV = {
  en: { myJobs: "My Jobs", dashboard: "Dashboard" },
  de: { myJobs: "Meine Jobs", dashboard: "Dashboard" },
  fr: { myJobs: "Mes emplois", dashboard: "Tableau de bord" },
  es: { myJobs: "Mis empleos", dashboard: "Panel" },
} as const;

/** Set the NEXT_LOCALE cookie on the browser context before navigation. */
async function setLocaleCookie(context: BrowserContext, locale: string) {
  await context.addCookies([
    {
      name: "NEXT_LOCALE",
      value: locale,
      domain: "localhost",
      path: "/",
    },
  ]);
}

/** Log in via the signin form. Locale-aware: uses the provided label/button strings. */
async function login(
  page: Page,
  strings: { emailPlaceholder: string; password: string; login: string },
) {
  await page.getByPlaceholder(strings.emailPlaceholder).click();
  await page
    .getByPlaceholder(strings.emailPlaceholder)
    .fill("admin@example.com");
  await page.getByLabel(strings.password).click();
  await page.getByLabel(strings.password).fill("password123");
  await page.getByRole("button", { name: strings.login }).click();
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("Locale switching", () => {
  test("default locale is English", async ({ page }) => {
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.en;

    // The root layout should set <html lang="en">
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    // Verify English heading and auth UI text
    await expect(
      page.getByRole("heading", { name: "JobSync" }),
    ).toBeVisible();
    await expect(page.getByText(strings.subtitle)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    // Tab buttons
    await expect(
      page.getByRole("button", { name: strings.signIn }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.createAccount }),
    ).toBeVisible();

    // Form labels
    await expect(page.getByLabel(strings.email)).toBeVisible();
    await expect(page.getByLabel(strings.password)).toBeVisible();

    // Placeholder
    await expect(
      page.getByPlaceholder(strings.emailPlaceholder),
    ).toBeVisible();

    // Submit button
    await expect(
      page.getByRole("button", { name: strings.login }),
    ).toBeVisible();
  });

  test("German locale via cookie", async ({ page, context }) => {
    await setLocaleCookie(context, "de");
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.de;

    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    await expect(
      page.getByRole("heading", { name: "JobSync" }),
    ).toBeVisible();
    await expect(page.getByText(strings.subtitle)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: strings.signIn }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.createAccount }),
    ).toBeVisible();

    await expect(page.getByLabel(strings.email)).toBeVisible();
    await expect(page.getByLabel(strings.password)).toBeVisible();
    await expect(
      page.getByPlaceholder(strings.emailPlaceholder),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.login }),
    ).toBeVisible();
  });

  test("French locale via cookie", async ({ page, context }) => {
    await setLocaleCookie(context, "fr");
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.fr;

    await expect(page.locator("html")).toHaveAttribute("lang", "fr");

    await expect(
      page.getByRole("heading", { name: "JobSync" }),
    ).toBeVisible();
    await expect(page.getByText(strings.subtitle)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: strings.signIn }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.createAccount }),
    ).toBeVisible();

    await expect(page.getByLabel(strings.email)).toBeVisible();
    await expect(page.getByLabel(strings.password)).toBeVisible();
    await expect(
      page.getByPlaceholder(strings.emailPlaceholder),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.login }),
    ).toBeVisible();
  });

  test("Spanish locale via cookie", async ({ page, context }) => {
    await setLocaleCookie(context, "es");
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.es;

    await expect(page.locator("html")).toHaveAttribute("lang", "es");

    await expect(
      page.getByRole("heading", { name: "JobSync" }),
    ).toBeVisible();
    await expect(page.getByText(strings.subtitle)).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    await expect(
      page.getByRole("button", { name: strings.signIn }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.createAccount }),
    ).toBeVisible();

    await expect(page.getByLabel(strings.email)).toBeVisible();
    await expect(page.getByLabel(strings.password)).toBeVisible();
    await expect(
      page.getByPlaceholder(strings.emailPlaceholder),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.login }),
    ).toBeVisible();
  });

  test("locale persists across navigation (DE)", async ({
    page,
    context,
    baseURL,
  }) => {
    await setLocaleCookie(context, "de");
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.de;

    // Verify German on signin page
    await expect(page.locator("html")).toHaveAttribute("lang", "de");
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    // Log in using German labels
    await login(page, strings);
    await expect(page).toHaveURL(baseURL + "/dashboard");

    // After login, the html lang should still be "de"
    await expect(page.locator("html")).toHaveAttribute("lang", "de");

    // Verify German nav items are present in the dashboard sidebar/nav
    const nav = DASHBOARD_NAV.de;
    await expect(page.getByText(nav.myJobs).first()).toBeVisible();
  });

  test("invalid locale falls back to English", async ({ page, context }) => {
    await setLocaleCookie(context, "zz");
    await page.goto("/signin");

    const strings = LOCALE_STRINGS.en;

    // Invalid locale should fall back to "en"
    await expect(page.locator("html")).toHaveAttribute("lang", "en");

    await expect(
      page.getByRole("heading", { name: "JobSync" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: strings.welcomeBack }),
    ).toBeVisible();

    await expect(page.getByLabel(strings.email)).toBeVisible();
    await expect(page.getByLabel(strings.password)).toBeVisible();
    await expect(
      page.getByRole("button", { name: strings.login }),
    ).toBeVisible();
  });
});
