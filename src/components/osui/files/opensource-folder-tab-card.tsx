"use client";

import Image from "next/image";
import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

export type OpensourceFolderTabCardProps = Readonly<
  {
    appName?: string;
    cardLabel?: string;
    title?: string;
    subtitle?: string;
    primaryValue?: string;
    primaryLabel?: string;
    secondaryValue?: string;
    secondaryLabel?: string;
    imageSrc?: string;
    imageAlt?: string;
  } & ComponentPropsWithoutRef<"div">
>;

export const OpensourceFolderTabCard = forwardRef<
  HTMLDivElement,
  OpensourceFolderTabCardProps
>(function OpensourceFolderTabCard(
  {
    className,
    appName = "Opensource App",
    cardLabel = "Card Design",
    title = "UI blocks",
    subtitle = "Copy & paste ready",
    primaryValue = "116",
    primaryLabel = "Components",
    secondaryValue = "Free",
    secondaryLabel = "Open source",
    imageSrc = "/background1.webp",
    imageAlt = "Card preview",
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      data-slot="opensource-folder-tab-card"
      className={cn(
        "relative size-[22rem] overflow-hidden rounded-[3rem] border-[8px] border-black bg-black font-sans",
        className,
      )}
      {...props}
    >
      <div className="absolute inset-x-1 top-1 h-[42%] overflow-hidden rounded-t-[2.35rem]">
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes="300px"
          className="object-cover object-top"
        />

        <div className="absolute top-4 right-4 z-20 text-right leading-snug">
          <p className="text-xs font-medium text-neutral-600">{appName}</p>
          <p className="sr-only">{cardLabel}</p>
        </div>
      </div>

      <div
        className="absolute inset-x-1 top-[28%] bottom-1 z-10 overflow-hidden"
        style={{
          borderBottomLeftRadius: "2.35rem",
          borderBottomRightRadius: "2.35rem",
        }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div
            className="absolute inset-x-0 top-[10%] bottom-0 bg-neutral-800"
            style={{
              borderBottomLeftRadius: "2.35rem",
              borderBottomRightRadius: "2.35rem",
              borderTopRightRadius: "1.35rem",
            }}
          />
          <div className="absolute top-0 left-0 h-[22%] w-[42%] rounded-tl-[1.35rem] rounded-tr-[1.15rem] bg-neutral-800" />
          <svg
            className="absolute top-0 left-[36%] h-[22%] w-[22%] text-neutral-800"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path
              d="M0 0H20C30 0 36 6 42 18L80 82C86 94 92 100 100 100V100H0Z"
              fill="currentColor"
            />
          </svg>
        </div>

        <div className="relative z-30 flex h-full flex-col justify-between px-6 pt-[18%] pb-7">
          <div>
            <h2 className="text-lg leading-tight font-medium text-white">
              {title}
            </h2>
            <p className="mt-1 text-sm text-neutral-400">{subtitle}</p>
          </div>

          <div className="flex items-end justify-between gap-3">
            <p className="flex items-baseline gap-2 text-white">
              <span className="text-xl leading-none font-bold">
                {primaryValue}
              </span>
              <span className="text-sm font-normal">{primaryLabel}</span>
            </p>
            <p className="pb-1 text-sm text-neutral-400">
              <span className="font-normal">{secondaryValue}</span>{" "}
              <span className="font-normal">{secondaryLabel}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

OpensourceFolderTabCard.displayName = "OpensourceFolderTabCard";
