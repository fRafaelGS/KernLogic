import * as React from "react";
import { ChevronRight, ChevronLast } from "lucide-react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/domains/core/lib/utils";

export interface BreadcrumbProps extends React.ComponentPropsWithoutRef<"nav"> {
  separator?: React.ReactNode;
}

const Breadcrumb = React.forwardRef<
  HTMLElement,
  BreadcrumbProps
>(({ className, separator = <ChevronRight className="h-4 w-4" />, ...props }, ref) => (
  <nav
    ref={ref}
    className={cn(
      "flex flex-wrap items-center text-sm text-muted-foreground",
      className
    )}
    aria-label="Breadcrumb"
    {...props}
  />
));
Breadcrumb.displayName = "Breadcrumb";

export interface BreadcrumbListProps extends React.ComponentPropsWithoutRef<"ol"> {}

const BreadcrumbList = React.forwardRef<
  HTMLOListElement,
  BreadcrumbListProps
>(({ className, ...props }, ref) => (
  <ol
    ref={ref}
    className={cn("flex flex-wrap items-center gap-1.5", className)}
    {...props}
  />
));
BreadcrumbList.displayName = "BreadcrumbList";

export interface BreadcrumbItemProps extends React.ComponentPropsWithoutRef<"li"> {
  isCurrent?: boolean;
}

const BreadcrumbItem = React.forwardRef<
  HTMLLIElement,
  BreadcrumbItemProps
>(({ className, isCurrent, ...props }, ref) => (
  <li
    ref={ref}
    className={cn("inline-flex items-center gap-1.5", className)}
    aria-current={isCurrent ? "page" : undefined}
    {...props}
  />
));
BreadcrumbItem.displayName = "BreadcrumbItem";

export interface BreadcrumbLinkProps
  extends React.ComponentPropsWithoutRef<"a"> {
  asChild?: boolean;
}

const BreadcrumbLink = React.forwardRef<
  HTMLAnchorElement,
  BreadcrumbLinkProps
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      ref={ref}
      className={cn(
        "transition-colors hover:text-foreground",
        className
      )}
      {...props}
    />
  );
});
BreadcrumbLink.displayName = "BreadcrumbLink";

export interface BreadcrumbSeparatorProps
  extends React.ComponentPropsWithoutRef<"li"> {
  children?: React.ReactNode;
}

const BreadcrumbSeparator = React.forwardRef<
  HTMLLIElement,
  BreadcrumbSeparatorProps
>(({ className, children = <ChevronRight className="h-4 w-4" />, ...props }, ref) => (
  <li
    ref={ref}
    role="separator"
    aria-hidden="true"
    className={cn("flex items-center", className)}
    {...props}
  >
    {children}
  </li>
));
BreadcrumbSeparator.displayName = "BreadcrumbSeparator";

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
};
