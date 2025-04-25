import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { AnimatedValue } from '@/components/ui/animated-value';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
  formatter?: (value: number) => string;
  className?: string;
  onClick?: () => void;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  icon: Icon,
  trend,
  formatter = (val: number) => val.toString(),
  className,
  onClick,
}) => {
  return (
    <Card 
      className={cn("overflow-hidden transition-all hover:shadow-md", 
        onClick ? "cursor-pointer hover:border-primary/50" : "", 
        className)}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="w-4 h-4 text-muted-foreground" />
      </CardHeader>
      
      <CardContent>
        <div className="text-2xl font-bold">
          <AnimatedValue value={value} formatter={formatter} />
        </div>
      </CardContent>
      
      {trend && (
        <CardFooter className="pt-0">
          <Badge variant={trend.isPositive ? "success" : "destructive"} className="h-5 px-2 text-xs">
            {trend.isPositive ? '↑' : '↓'} {trend.value}% {trend.label}
          </Badge>
        </CardFooter>
      )}
    </Card>
  );
}; 