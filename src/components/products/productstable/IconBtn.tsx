import React from "react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import { config } from "@/config/config";

interface IconBtnProps {
  icon: LucideIcon;
  tooltip: string;
  onClick: () => void;
}

/**
 * Reusable round ghost button with an icon.
 */
export function IconBtn({ icon: Icon, tooltip, onClick }: IconBtnProps) {
  // Get reference to the config
  const tableConfig = config.productsTable;
  
  return (
    <Button
      variant="ghost"
      size="icon"
      title={tooltip}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="h-7 w-7 rounded-full hover:bg-slate-100"
      aria-label={tooltip}
    >
      <Icon className="h-4 w-4 text-slate-600" />
      <span className="sr-only">{tooltip}</span>
    </Button>
  );
}