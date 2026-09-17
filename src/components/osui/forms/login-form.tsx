"use client";

import {
  forwardRef,
  useCallback,
  useId,
  useState,
  type ComponentPropsWithoutRef,
  type FormEvent,
  type ReactNode,
} from "react";

import Link from "next/link";

import { AlertCircle, ChevronRight, Eye, EyeOff, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type FormLinkProps = Readonly<{
  href: string;
  className?: string;
  children: ReactNode;
}>;

function isPlaceholderHref(href: string): boolean {
  return !href || href === "#";
}

function FormLink({ href, className, children }: FormLinkProps) {
  if (isPlaceholderHref(href)) {
    return (
      <button type="button" className={cn("cursor-pointer", className)}>
        {children}
      </button>
    );
  }

  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

type LoginFormValues = Readonly<{
  email: string;
  password: string;
  remember: boolean;
}>;

type LoginFormErrors = Partial<Record<keyof LoginFormValues, string>>;

export type LoginFormProps = Readonly<
  {
    title?: string;
    subtitle?: string;
    submitLabel?: string;
    forgotPasswordLabel?: string;
    forgotPasswordHref?: string;
    signupPrompt?: string;
    signupHref?: string;
    signupLabel?: string;
    submitErrorMessage?: string;
    loading?: boolean;
    onSubmit?: (values: LoginFormValues) => void | Promise<void>;
  } & Omit<ComponentPropsWithoutRef<"form">, "onSubmit">
>;

function validateLogin(values: LoginFormValues): LoginFormErrors {
  const errors: LoginFormErrors = {};
  const email = values.email.trim();
  const password = values.password;

  if (!email) errors.email = "Email is required.";
  else if (!EMAIL_RE.test(email)) errors.email = "Enter a valid email address.";

  if (!password) errors.password = "Password is required.";

  return errors;
}

export const LoginForm = forwardRef<HTMLFormElement, LoginFormProps>(
  function LoginForm(
    {
      className,
      title = "Welcome back",
      subtitle = "Sign in to continue to your account.",
      submitLabel = "Sign in",
      forgotPasswordLabel = "Forgot password?",
      forgotPasswordHref = "/components/forgot-password-form",
      signupPrompt = "Don't have an account?",
      signupHref = "/components/signup-form",
      signupLabel = "Create one",
      submitErrorMessage = "We couldn't sign you in. Please try again.",
      loading = false,
      onSubmit,
      onReset,
      ...props
    },
    ref,
  ) {
    const formId = useId();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [remember, setRemember] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState<LoginFormErrors>({});
    const [submitError, setSubmitError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const busy = loading || submitting;

    const handleSubmit = useCallback(
      async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (busy) return;

        const values: LoginFormValues = { email, password, remember };
        const nextErrors = validateLogin(values);
        setErrors(nextErrors);
        if (Object.keys(nextErrors).length > 0) return;

        setSubmitting(true);
        setSubmitError("");
        try {
          await onSubmit?.({
            email: email.trim(),
            password,
            remember,
          });
        } catch {
          setSubmitError(submitErrorMessage);
        } finally {
          setSubmitting(false);
        }
      },
      [busy, email, onSubmit, password, remember, submitErrorMessage],
    );

    const handleReset = useCallback(
      (event: FormEvent<HTMLFormElement>) => {
        onReset?.(event);
        if (event.defaultPrevented) return;
        setEmail("");
        setPassword("");
        setRemember(false);
        setShowPassword(false);
        setErrors({});
        setSubmitError("");
      },
      [onReset],
    );

    return (
      <form
        ref={ref}
        data-slot="login-form"
        aria-busy={busy}
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        className={cn(
          "w-full max-w-md rounded-3xl bg-white p-6 font-sans md:p-8",
          className,
        )}
        {...props}
      >
        <div className="mb-7">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
            {subtitle}
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label
              htmlFor={`${formId}-email`}
              className="mb-1.5 block text-sm font-medium text-neutral-900"
            >
              Email
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              disabled={busy}
              value={email}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={
                errors.email ? `${formId}-email-error` : undefined
              }
              onChange={(event) => {
                setEmail(event.target.value);
                setSubmitError("");
                if (errors.email)
                  setErrors((prev) => ({ ...prev, email: undefined }));
              }}
              className={cn(
                "h-11 w-full rounded-md border bg-white px-3.5 text-sm text-neutral-900 ring-0 transition-[border-color,background-color] duration-200 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50",
                errors.email
                  ? "border-rose-300 focus:border-rose-400"
                  : "border-neutral-200 focus:border-neutral-900",
              )}
              placeholder="you@company.com"
            />
            {errors.email ? (
              <p
                id={`${formId}-email-error`}
                role="alert"
                className="mt-1.5 text-xs text-rose-600"
              >
                {errors.email}
              </p>
            ) : null}
          </div>

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label
                htmlFor={`${formId}-password`}
                className="text-sm font-medium text-neutral-900"
              >
                Password
              </label>
              <FormLink
                href={forgotPasswordHref}
                className="text-xs font-medium text-neutral-600 underline underline-offset-2 hover:text-neutral-900"
              >
                {forgotPasswordLabel}
              </FormLink>
            </div>
            <div className="relative">
              <input
                id={`${formId}-password`}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                disabled={busy}
                value={password}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={
                  errors.password ? `${formId}-password-error` : undefined
                }
                onChange={(event) => {
                  setPassword(event.target.value);
                  setSubmitError("");
                  if (errors.password)
                    setErrors((prev) => ({ ...prev, password: undefined }));
                }}
                className={cn(
                  "h-11 w-full rounded-md border bg-white py-2 pr-10 pl-3.5 text-sm text-neutral-900 ring-0 transition-[border-color,background-color] duration-200 outline-none placeholder:text-neutral-400 focus:ring-0 disabled:cursor-not-allowed disabled:bg-neutral-50",
                  errors.password
                    ? "border-rose-300 focus:border-rose-400"
                    : "border-neutral-200 focus:border-neutral-900",
                )}
                placeholder="Enter your password"
              />
              <button
                type="button"
                disabled={busy}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute top-1/2 right-2.5 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center text-neutral-400 transition-colors hover:text-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-neutral-900 disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={16} aria-hidden />
                ) : (
                  <Eye size={16} aria-hidden />
                )}
              </button>
            </div>
            {errors.password ? (
              <p
                id={`${formId}-password-error`}
                role="alert"
                className="mt-1.5 text-xs text-rose-600"
              >
                {errors.password}
              </p>
            ) : null}
          </div>

          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              name="remember"
              disabled={busy}
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="size-4 cursor-pointer rounded border-neutral-300 text-neutral-900 accent-neutral-900 disabled:cursor-not-allowed"
            />
            <span className="text-sm text-neutral-700">
              Remember me for 30 days
            </span>
          </label>
        </div>

        {submitError ? (
          <div
            role="alert"
            className="mt-5 flex items-start gap-2.5 border-l-2 border-rose-500 bg-rose-50 px-3 py-2.5 text-sm text-rose-700"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>{submitError}</span>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-6 flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-md bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? (
            <Loader2 size={16} className="animate-spin" aria-hidden />
          ) : null}
          {busy ? "Signing in…" : submitLabel}
          {!busy ? <ChevronRight size={15} aria-hidden /> : null}
        </button>

        <p className="mt-5 text-center text-sm text-neutral-500">
          {signupPrompt}{" "}
          <FormLink
            href={signupHref}
            className="font-medium text-neutral-900 underline underline-offset-2"
          >
            {signupLabel}
          </FormLink>
        </p>
      </form>
    );
  },
);

LoginForm.displayName = "LoginForm";
