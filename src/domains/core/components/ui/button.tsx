import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/domains/core/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Primary action buttons - for main actions (create, save, etc.)
        primary: "bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow active:bg-primary-800 active:shadow-inner",
        
        // Secondary action buttons - supporting actions, less emphasis
        secondary: "bg-enterprise-100 text-enterprise-800 hover:bg-enterprise-200 hover:text-enterprise-900 shadow-sm hover:shadow active:bg-enterprise-300 active:shadow-inner border border-enterprise-200",
        
        // Success - for confirming actions, positive outcomes
        success: "bg-success-600 text-white hover:bg-success-700 shadow-sm hover:shadow active:bg-success-800 active:shadow-inner",
        
        // Destructive - for delete, remove actions
        destructive: "bg-danger-600 text-white hover:bg-danger-700 shadow-sm hover:shadow active:bg-danger-800 active:shadow-inner",
        
        // Outline - bordered buttons for secondary options
        outline: "border border-enterprise-300 bg-white text-enterprise-700 hover:bg-enterprise-50 hover:text-enterprise-800 hover:border-enterprise-400 active:bg-enterprise-100 active:shadow-inner",
        
        // Ghost - minimally visible buttons
        ghost: "text-enterprise-600 hover:bg-enterprise-50 hover:text-enterprise-800 active:bg-enterprise-100 active:text-enterprise-900",
        
        // Link style - for very minimal actions or within text
        link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700",
      },
      size: {
        xs: "h-7 px-2 text-xs rounded",
        sm: "h-8 px-3 rounded",
        default: "h-10 px-4 py-2 rounded-md",
        lg: "h-11 px-6 rounded-md",
        xl: "h-12 px-8 rounded-md text-base",
        icon: "h-10 w-10 rounded-md",
        "icon-sm": "h-8 w-8 rounded-md",
      },
      fullWidth: {
        true: "w-full",
      },
      withIcon: {
        true: "justify-center items-center",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
      fullWidth: false,
      withIcon: false,
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
  isLoading?: boolean
  loadingText?: string
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ 
    className, 
    variant, 
    size, 
    fullWidth,
    withIcon,
    asChild = false, 
    isLoading = false,
    loadingText,
    children,
    disabled,
    ...props 
  }, ref) => {
    const Comp = asChild ? Slot : "button"
    
    const resolvedType = !asChild && !props.type ? 'button' : props.type

    return (
      <Comp
        className={cn(buttonVariants({ 
          variant, 
          size, 
          fullWidth,
          withIcon,
          className 
        }))}
        ref={ref}
        disabled={disabled || isLoading}
        type={resolvedType as any}
        {...props}
      >
        {isLoading ? (
          <>
            <svg 
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
              xmlns="http://www.w3.org/2000/svg" 
              fill="none" 
              viewBox="0 0 24 24"
            >
              <circle 
                className="opacity-25" 
                cx="12" 
                cy="12" 
                r="10" 
                stroke="currentColor" 
                strokeWidth="4"
              />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291a7.962 7.962 0 014-12.129V0c-4.418 0-8 3.582-8 8s3.582 8 8 8v-4a4 4 0 004-4h-4z"
              />
            </svg>
            {loadingText || children}
          </>
        ) : (
          children
        )}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
