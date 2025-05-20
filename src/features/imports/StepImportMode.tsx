import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { config } from '@/config/config'

export type ImportMode = 'products' | 'structure'

interface StepImportModeProps {
  onModeSelected: (mode: ImportMode) => void
}

// Define type for import mode options
export interface ImportModeOption {
  value: ImportMode
  label: string
  description: string
  tooltip?: string
  isRecommended?: boolean
}

// Default import mode options if not in configuration
const DEFAULT_IMPORT_MODES: ImportModeOption[] = [
  {
    value: 'products',
    label: 'Products only',
    description: 'Import product data without modifying your attribute structure',
    isRecommended: true
  },
  {
    value: 'structure',
    label: 'Structure only',
    description: 'Import attribute groups, attributes, and product families',
    tooltip: 'This will import attribute groups, attributes, and/or product families without product data'
  }
]

export function StepImportMode({ onModeSelected }: StepImportModeProps) {
  // Use config value if available, otherwise use default
  const importModes = (config.imports?.display?.importModes as ImportModeOption[]) || DEFAULT_IMPORT_MODES
  const [selectedMode, setSelectedMode] = React.useState<ImportMode>(importModes[0]?.value || 'products')

  const handleContinue = () => {
    onModeSelected(selectedMode)
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">
          {config.imports.display.importModeStep?.title || 'Choose Import Mode'}
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          {config.imports.display.importModeStep?.subtitle || 'Select how you want to import your data'}
        </p>

        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as ImportMode)}
          className="space-y-4"
        >
          {importModes.map((mode: ImportModeOption) => (
            <Card 
              key={mode.value}
              className={`border-2 p-4 ${selectedMode === mode.value ? 'border-primary' : 'border-muted'}`}
            >
              <CardContent className="p-0">
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value={mode.value} id={mode.value} className="mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center">
                      <Label htmlFor={mode.value} className="font-medium text-base cursor-pointer">
                        {mode.label}
                      </Label>
                      {mode.isRecommended && (
                        <span className="ml-2 text-xs bg-primary-foreground text-primary px-2 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                      {mode.tooltip && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="ml-2">
                              <InfoIcon className="h-4 w-4 text-muted-foreground" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs">{mode.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {mode.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </RadioGroup>

        <div className="mt-6">
          <Button onClick={handleContinue}>
            {config.imports.display.importModeStep?.continueButton || 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default StepImportMode 