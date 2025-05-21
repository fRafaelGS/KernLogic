import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/domains/core/components/ui/card'
import { Progress } from '@/domains/core/components/ui/progress'
import { LucideIcon } from 'lucide-react'

interface ProgressCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  className?: string
}

export function ProgressCard({ title, value, icon: Icon, description, className }: ProgressCardProps) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between mb-2">
          <div className="text-2xl font-bold">{value}%</div>
        </div>
        <Progress value={value} className="h-2" />
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
      </CardContent>
    </Card>
  )
} 