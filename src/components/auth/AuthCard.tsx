import Link from "next/link";
import { BriefcaseBusiness } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import SigninForm from "./SigninForm";
import SignupForm from "./SignupForm";

type AuthMode = "signin" | "signup";

export default function AuthCard({ mode }: { mode: AuthMode }) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6">
      <div className="text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-sm focus-visible:outline-2 focus-visible:outline-ring"
        >
          <BriefcaseBusiness
            className="size-6 text-primary"
            aria-hidden="true"
          />
          <h1 className="text-2xl font-semibold tracking-tight">JobSync</h1>
        </Link>
        <p className="mt-2 text-sm text-muted-foreground">
          Track your job search, powered by AI
        </p>
      </div>
      <nav aria-label="Authentication" className="grid grid-cols-2 gap-2">
        <Button variant={mode === "signin" ? "secondary" : "ghost"} asChild>
          <Link
            href="/signin"
            aria-current={mode === "signin" ? "page" : undefined}
          >
            Sign In
          </Link>
        </Button>
        <Button variant={mode === "signup" ? "secondary" : "ghost"} asChild>
          <Link
            href="/signup"
            aria-current={mode === "signup" ? "page" : undefined}
          >
            Create Account
          </Link>
        </Button>
      </nav>
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "signin" ? "Welcome back" : "Get started"}
          </CardTitle>
          <CardDescription>
            {mode === "signin"
              ? "Enter your credentials to access your account"
              : "Create a free account to start tracking your applications"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mode === "signin" ? <SigninForm /> : <SignupForm />}
        </CardContent>
      </Card>
    </div>
  );
}
