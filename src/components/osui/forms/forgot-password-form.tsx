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

import { AlertCircle, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

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

export type ForgotPasswordFormProps = Readonly<
  {
    title?: string;
    subtitle?: string;
    submitLabel?: string;
    successTitle?: string;
    successMessage?: string;
    backLabel?: string;
    backHref?: string;
    submitErrorMessage?: string;
    loading?: boolean;
    onSubmit?: (email: string) => void | Promise<void>;
  } & Omit<ComponentPropsWithoutRef<"form">, "onSubmit">
>;

export const ForgotPasswordForm = forwardRef<
  HTMLDivElement,
  ForgotPasswordFormProps
>(function ForgotPasswordForm(
  {
    className,
    title = "Reset your password",
    subtitle = "Enter the email linked to your account and we'll send a reset link.",
    submitLabel = "Send reset link",
    successTitle = "Check your inbox",
    successMessage = "If an account exists for that email, you'll receive reset instructions shortly.",
    backLabel = "Back to sign in",
    backHref = "/components/login-form",
    submitErrorMessage = "We couldn't send the reset email. Please try again.",
    loading = false,
    onSubmit,
    onReset,
    ...props
  },
  ref,
) {
  const formId = useId();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [sentTo, setSentTo] = useState("");

  const busy = loading || submitting;

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (busy || success) return;

      const trimmed = email.trim();
      if (!trimmed) {
        setError("Email is required.");
        return;
      }
      if (!EMAIL_RE.test(trimmed)) {
        setError("Enter a valid email address.");
        return;
      }

      setError("");
      setSubmitError("");
      setSubmitting(true);
      try {
        await onSubmit?.(trimmed);
        setSentTo(trimmed);
        setSuccess(true);
      } catch {
        setSubmitError(submitErrorMessage);
      } finally {
        setSubmitting(false);
      }
    },
    [busy, email, onSubmit, submitErrorMessage, success],
  );

  const handleReset = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      onReset?.(event);
      if (event.defaultPrevented) return;
      setEmail("");
      setError("");
      setSubmitError("");
    },
    [onReset],
  );

  if (success) {
    return (
      <div
        ref={ref}
        data-slot="forgot-password-form"
        data-success
        role="status"
        aria-live="polite"
        className={cn(
          "w-full max-w-md rounded-3xl bg-white p-6 font-sans md:p-8",
          className,
        )}
      >
        <h2 className="font-sans text-2xl font-semibold tracking-tight text-neutral-950">
          {successTitle}
        </h2>
        <p className="mt-3 text-sm leading-6 text-neutral-500">
          {successMessage}
        </p>
        {sentTo ? (
          <p className="mt-4 border-l-2 border-emerald-500 bg-emerald-50 px-3 py-2.5 font-mono text-xs text-neutral-700">
            {sentTo}
          </p>
        ) : null}
        <FormLink
          href={backHref}
          className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 underline underline-offset-2"
        >
          <ChevronLeft size={14} aria-hidden />
          {backLabel}
        </FormLink>
      </div>
    );
  }

  return (
    <div ref={ref} className={cn("w-full max-w-md", className)}>
      <form
        data-slot="forgot-password-form"
        noValidate
        onSubmit={handleSubmit}
        onReset={handleReset}
        aria-busy={busy}
        className="rounded-3xl bg-white p-6 font-sans md:p-8"
        {...props}
      >
        <FormLink
          href={backHref}
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-neutral-500 underline underline-offset-2 transition-colors hover:text-neutral-900"
        >
          <ChevronLeft size={14} aria-hidden />
          {backLabel}
        </FormLink>

        <div className="mb-7">
          <h2 className="font-sans text-2xl font-semibold tracking-tight text-neutral-950">
            {title}
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-6 text-neutral-500">
            {subtitle}
          </p>
        </div>

        <div>
          <label
            htmlFor={`${formId}-email`}
            className="mb-1.5 block text-sm font-medium text-neutral-900"
          >
            Email address
          </label>
          <input
            id={`${formId}-email`}
            name="email"
            type="email"
            autoComplete="email"
            disabled={busy}
            value={email}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `${formId}-email-error` : undefined}
            onChange={(event) => {
              setEmail(event.target.value);
              setSubmitError("");
              if (error) setError("");
            }}
            className={cn(
              "h-11 w-full rounded-md border bg-white px-3.5 text-sm ring-0 transition-colors outline-none focus:ring-0 disabled:bg-neutral-50",
              error
                ? "border-rose-300"
                : "border-neutral-200 focus:border-neutral-900",
            )}
            placeholder="you@company.com"
          />
          {error ? (
            <p
              id={`${formId}-email-error`}
              role="alert"
              className="mt-1.5 text-xs text-rose-600"
            >
              {error}
            </p>
          ) : null}
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
          {busy ? "Sending…" : submitLabel}
          {!busy ? <ChevronRight size={15} aria-hidden /> : null}
        </button>
      </form>
    </div>
  );
});

ForgotPasswordForm.displayName = "ForgotPasswordForm";
