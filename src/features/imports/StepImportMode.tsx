import React from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { InfoIcon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

export type ImportMode = 'products' | 'structure' | 'structure-products'

interface StepImportModeProps {
  onModeSelected: (mode: ImportMode) => void
}

export function StepImportMode({ onModeSelected }: StepImportModeProps) {
  const [selectedMode, setSelectedMode] = React.useState<ImportMode>('products')

  const handleContinue = () => {
    onModeSelected(selectedMode)
  }

  return (
    <div className="space-y-6">
      <div className="bg-muted p-4 rounded-md mb-4">
        <h3 className="font-medium mb-2">Choose Import Mode</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Select how you want to import your data
        </p>

        <RadioGroup
          value={selectedMode}
          onValueChange={(value) => setSelectedMode(value as ImportMode)}
          className="space-y-4"
        >
          <Card className={`border-2 p-4 ${selectedMode === 'products' ? 'border-primary' : 'border-muted'}`}>
            <CardContent className="p-0">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="products" id="products" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <Label htmlFor="products" className="font-medium text-base cursor-pointer">
                      Products only
                    </Label>
                    <span className="ml-2 text-xs bg-primary-foreground text-primary px-2 py-0.5 rounded-full">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import product data without modifying your attribute structure
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 p-4 ${selectedMode === 'structure' ? 'border-primary' : 'border-muted'}`}>
            <CardContent className="p-0">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="structure" id="structure" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <Label htmlFor="structure" className="font-medium text-base cursor-pointer">
                      Structure only
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="ml-2">
                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            This will import attribute groups, attributes, and/or product families without product data
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import attribute groups, attributes, and product families
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={`border-2 p-4 ${selectedMode === 'structure-products' ? 'border-primary' : 'border-muted'}`}>
            <CardContent className="p-0">
              <div className="flex items-start space-x-2">
                <RadioGroupItem value="structure-products" id="structure-products" className="mt-1" />
                <div className="flex-1">
                  <div className="flex items-center">
                    <Label htmlFor="structure-products" className="font-medium text-base cursor-pointer">
                      Structure → Products
                    </Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger className="ml-2">
                          <InfoIcon className="h-4 w-4 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs">
                            First import your attribute structure, then import products that use those attributes
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Import both structure and products in a sequential process
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </RadioGroup>

        <div className="mt-6">
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </div>
    </div>
  )
}

export default StepImportMode 