import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * The button is where craft is judged first. Text sits at 15px medium
 * with a hair of negative tracking; the primary is a solid plum plate
 * that darkens rather than glows; the secondary is a hairline that
 * fills, never a grey box. Press gives 1.5% — enough to feel mass,
 * too little to read as bounce.
 */
const buttonVariants = cva(
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-full text-[0.9375rem] font-medium tracking-[-0.01em] transition-[background-color,color,box-shadow,transform] duration-200 ease-calm active:scale-[0.985] disabled:pointer-events-none disabled:opacity-40",
  {
    variants: {
      variant: {
        primary:
          "bg-plum-900 text-surface-0 hover:bg-plum-950 dark:bg-surface-0 dark:text-ink-900 dark:hover:bg-mist-200",
        secondary:
          "bg-transparent text-ink-900 hairline hover:bg-ink-900/[0.035] dark:text-surface-0 dark:hover:bg-surface-0/[0.06]",
        tertiary:
          "bg-transparent px-0 text-ink-900 underline-offset-[6px] hover:underline dark:text-surface-0",
        accent: "bg-ink-900 text-surface-0 hover:bg-ink-900/90",
        destructive: "bg-error-700 text-surface-0 hover:bg-error-800",
      },
      size: {
        sm: "h-9 px-4 text-sm",
        md: "h-11 px-5",
        lg: "h-[50px] px-7",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
