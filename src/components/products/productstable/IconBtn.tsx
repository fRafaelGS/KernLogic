import React from "react";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface IconBtnProps {
  icon: LucideIcon;
  tooltip: string;
  onClick: () => void;
}

/**
 * Reusable round ghost button with an icon.
 */
export function IconBtn({ icon: Icon, tooltip, onClick }: IconBtnProps) {
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
    >
      <Icon className="h-4 w-4 text-slate-600" />
      <span className="sr-only">{tooltip}</span>
    </Button>
  );
}