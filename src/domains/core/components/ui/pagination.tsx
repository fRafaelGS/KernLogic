import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/domains/core/components/ui/button"

const Pagination = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn("flex w-full items-center justify-center gap-2", className)}
    role="navigation"
    aria-label="pagination"
    {...props}
  />
))
Pagination.displayName = "Pagination"

const PaginationContent = React.forwardRef<
  HTMLUListElement,
  React.HTMLAttributes<HTMLUListElement>
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    className={cn("flex flex-row items-center gap-1", className)}
    {...props}
  />
))
PaginationContent.displayName = "PaginationContent"

type PaginationItemProps = {
  className?: string
  isActive?: boolean
} & React.ComponentProps<"li">

const PaginationItem = React.forwardRef<HTMLLIElement, PaginationItemProps>(
  ({ className, isActive, ...props }, ref) => (
    <li ref={ref} className={cn(className)} {...props} />
  )
)
PaginationItem.displayName = "PaginationItem"

type PaginationLinkProps = {
  isActive?: boolean
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  disabled?: boolean
}

const PaginationLink = ({
  className,
  isActive,
  children,
  disabled,
  onClick,
  ...props
}: PaginationLinkProps) => (
  <Button
    variant={isActive ? "primary" : "outline"}
    size="sm"
    onClick={onClick}
    disabled={disabled}
    className={cn(className)}
    {...props}
  >
    {children}
  </Button>
)
PaginationLink.displayName = "PaginationLink"

const PaginationPrevious = ({
  className,
  onClick,
  disabled,
  ...props
}: PaginationLinkProps) => (
  <Button
    aria-label="Go to previous page"
    size="sm"
    variant="outline"
    disabled={disabled}
    onClick={onClick}
    className={cn("gap-1", className)}
    {...props}
  >
    <ChevronLeft className="h-4 w-4" />
    <span>Previous</span>
  </Button>
)
PaginationPrevious.displayName = "PaginationPrevious"

const PaginationNext = ({
  className,
  onClick,
  disabled,
  ...props
}: PaginationLinkProps) => (
  <Button
    aria-label="Go to next page"
    size="sm"
    variant="outline"
    disabled={disabled}
    onClick={onClick}
    className={cn("gap-1", className)}
    {...props}
  >
    <span>Next</span>
    <ChevronRight className="h-4 w-4" />
  </Button>
)
PaginationNext.displayName = "PaginationNext"

const PaginationEllipsis = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => (
  <span
    aria-hidden
    className={cn("flex h-9 w-9 items-center justify-center", className)}
    {...props}
  >
    <MoreHorizontal className="h-4 w-4" />
    <span className="sr-only">More pages</span>
  </span>
)
PaginationEllipsis.displayName = "PaginationEllipsis"

export {
  Pagination,
  PaginationContent,
  PaginationLink,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
}
