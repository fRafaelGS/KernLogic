import React from 'react'
import { Grid2X2, List } from 'lucide-react'
import { Button } from '@/domains/core/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/domains/core/components/ui/tabs'

interface ViewToggleProps {
  view: 'list' | 'grid'
  onViewChange: (view: 'list' | 'grid') => void
}

export function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <Tabs
      value={view}
      onValueChange={(value) => onViewChange(value as 'list' | 'grid')}
      className="h-9"
    >
      <TabsList className="h-9">
        <TabsTrigger value="list" className="flex items-center gap-1 px-3">
          <List className="h-4 w-4" />
          <span className="hidden sm:inline">List</span>
        </TabsTrigger>
        <TabsTrigger value="grid" className="flex items-center gap-1 px-3">
          <Grid2X2 className="h-4 w-4" />
          <span className="hidden sm:inline">Grid</span>
        </TabsTrigger>
      </TabsList>
    </Tabs>
  )
} 