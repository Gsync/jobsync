"use client";

import Image from "next/image";
import {
  forwardRef,
  useCallback,
  useState,
  type ComponentPropsWithoutRef,
} from "react";

import { cn } from "@/lib/utils";

type LayerIndex = 0 | 1 | 2;
type StackPosition = "front" | "middle" | "back";

const TRANSITION =
  "transition-[top,left,width,height,transform,box-shadow] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]";

const POSITION_LAYOUT: Record<StackPosition, string> = {
  front:
    "top-0 left-9 z-30 h-[17rem] w-[15.75rem] rotate-0 shadow-[0_20px_44px_-14px_rgba(0,0,0,0.38)]",
  middle:
    "top-4 left-4 z-20 h-[16rem] w-[15rem] -rotate-[3.5deg] shadow-[0_12px_28px_-10px_rgba(0,0,0,0.3)]",
  back: "top-9 left-0.5 z-10 h-[15.5rem] w-[14.5rem] -rotate-[7deg] shadow-[0_10px_24px_-10px_rgba(0,0,0,0.28)]",
};

// [front, middle, back] — hovered card goes front, previous front goes back, other stays middle.
const STACK_ORDER: Record<
  LayerIndex,
  readonly [LayerIndex, LayerIndex, LayerIndex]
> = {
  0: [0, 1, 2],
  1: [1, 0, 2],
  2: [2, 1, 0],
};

function positionForLayer(
  layer: LayerIndex,
  active: LayerIndex,
): StackPosition {
  const [front, middle] = STACK_ORDER[active];
  if (layer === front) return "front";
  if (layer === middle) return "middle";
  return "back";
}

type LayerConfig = Readonly<{
  index: LayerIndex;
  src?: string;
  alt: string;
  surfaceClassName: string;
}>;

export type StackedFolderCardProps = Readonly<
  {
    imageSrc?: string;
    imageAlt?: string;
    backImageSrc?: string;
    middleImageSrc?: string;
    backClassName?: string;
    middleClassName?: string;
  } & ComponentPropsWithoutRef<"div">
>;

// Three-layer folder stack · fixed hit zones · hover rotates front → back.
export const StackedFolderCard = forwardRef<
  HTMLDivElement,
  StackedFolderCardProps
>(function StackedFolderCard(
  {
    className,
    imageSrc = "/background1.webp",
    imageAlt = "Folder cover",
    backImageSrc,
    middleImageSrc,
    backClassName = "bg-[#e28a8a]",
    middleClassName = "bg-[#5a675e]",
    ...props
  },
  ref,
) {
  const [active, setActive] = useState<LayerIndex>(2);

  const [frontLayer, middleLayer, backLayer] = STACK_ORDER[active];

  const bringToFront = useCallback((layer: LayerIndex) => {
    setActive((current) => (current === layer ? current : layer));
  }, []);

  const layers: LayerConfig[] = [
    {
      index: 0,
      src: backImageSrc,
      alt: "",
      surfaceClassName: backClassName,
    },
    {
      index: 1,
      src: middleImageSrc,
      alt: "",
      surfaceClassName: middleClassName,
    },
    {
      index: 2,
      src: imageSrc,
      alt: imageAlt,
      surfaceClassName: "",
    },
  ];

  return (
    <div
      ref={ref}
      data-slot="stacked-folder-card"
      className={cn("relative h-[20rem] w-[19rem] font-sans", className)}
      {...props}
    >
      {layers.map((layer) => {
        const position = positionForLayer(layer.index, active);

        return (
          <div
            key={layer.index}
            aria-hidden
            className={cn(
              "pointer-events-none absolute overflow-hidden rounded-[2rem] border-[7px] border-white",
              TRANSITION,
              POSITION_LAYOUT[position],
              layer.surfaceClassName,
            )}
          >
            {layer.src ? (
              <Image
                src={layer.src}
                alt={layer.alt}
                fill
                sizes="280px"
                className="object-cover"
                draggable={false}
              />
            ) : null}
          </div>
        );
      })}

      <button
        type="button"
        tabIndex={-1}
        aria-label="Show back card"
        onMouseEnter={() => bringToFront(backLayer)}
        onFocus={() => bringToFront(backLayer)}
        className="absolute top-0 bottom-0 left-0 z-40 w-4 cursor-default border-0 bg-transparent p-0"
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Show middle card"
        onMouseEnter={() => bringToFront(middleLayer)}
        onFocus={() => bringToFront(middleLayer)}
        className="absolute top-0 bottom-0 left-4 z-40 w-5 cursor-default border-0 bg-transparent p-0"
      />

      <button
        type="button"
        tabIndex={-1}
        aria-label="Show front card"
        onMouseEnter={() => bringToFront(frontLayer)}
        onFocus={() => bringToFront(frontLayer)}
        className="absolute top-0 right-0 bottom-0 left-9 z-40 cursor-default border-0 bg-transparent p-0"
      />
    </div>
  );
});

StackedFolderCard.displayName = "StackedFolderCard";
