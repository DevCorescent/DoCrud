import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-black text-white shadow-[10px_10px_24px_rgba(15,23,42,0.18),-6px_-6px_16px_rgba(255,255,255,0.4)] hover:-translate-y-0.5 hover:bg-black/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[10px_10px_24px_rgba(239,68,68,0.18),-6px_-6px_16px_rgba(255,255,255,0.36)] hover:-translate-y-0.5 hover:bg-destructive/90",
        outline:
          "border border-white/70 bg-white/70 text-black backdrop-blur shadow-[8px_8px_18px_rgba(148,163,184,0.14),-6px_-6px_14px_rgba(255,255,255,0.85)] hover:-translate-y-0.5 hover:bg-black hover:text-white",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[8px_8px_18px_rgba(148,163,184,0.12),-6px_-6px_14px_rgba(255,255,255,0.82)] hover:-translate-y-0.5 hover:bg-secondary/80",
        ghost: "hover:bg-black/5 hover:text-black hover:-translate-y-0.5",
        link: "text-black underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
