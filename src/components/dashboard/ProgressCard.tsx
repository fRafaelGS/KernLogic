
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ProgressCardProps {
  title: string;
  description: string;
  progress: number;
  className?: string;
}

export function ProgressCard({ title, description, progress, className }: ProgressCardProps) {
  return (
    <div className={cn("rounded-lg border bg-card p-6 shadow-sm", className)}>
      <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
      <p className="mt-1 text-2xl font-semibold">{progress}%</p>
      <Progress value={progress} className="mt-3 h-2" />
      <p className="mt-3 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
