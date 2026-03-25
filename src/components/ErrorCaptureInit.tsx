"use client";
import { useEffect } from "react";
import { initClientErrorCapture } from "@/lib/error-reporter";

export function ErrorCaptureInit() {
  useEffect(() => {
    initClientErrorCapture();
  }, []);
  return null;
}
