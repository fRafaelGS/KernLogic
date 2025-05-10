import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function ProcessingOptions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Processing Options</CardTitle>
        <CardDescription>
          Select how you want the AI to process your data
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cleaning">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="cleaning">Data Cleaning</TabsTrigger>
            <TabsTrigger value="description">Description Generation</TabsTrigger>
            <TabsTrigger value="categorization">Categorization</TabsTrigger>
          </TabsList>
          
          <TabsContent value="cleaning" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="clean-format" />
                <Label htmlFor="clean-format">Format consistency</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="clean-missing" defaultChecked />
                <Label htmlFor="clean-missing">Fill missing data</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="clean-duplicates" defaultChecked />
                <Label htmlFor="clean-duplicates">Remove duplicates</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="clean-normalize" />
                <Label htmlFor="clean-normalize">Normalize values</Label>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="description" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="desc-short" defaultChecked />
                <Label htmlFor="desc-short">Short descriptions (~50 words)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="desc-long" />
                <Label htmlFor="desc-long">Long descriptions (~150 words)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="desc-technical" defaultChecked />
                <Label htmlFor="desc-technical">Technical specifications</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="desc-marketing" />
                <Label htmlFor="desc-marketing">Marketing highlights</Label>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="categorization" className="space-y-4 pt-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox id="cat-auto" defaultChecked />
                <Label htmlFor="cat-auto">Auto-categorize products</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="cat-tags" defaultChecked />
                <Label htmlFor="cat-tags">Generate tags</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="cat-hierarchy" />
                <Label htmlFor="cat-hierarchy">Create category hierarchy</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="cat-relations" />
                <Label htmlFor="cat-relations">Map related products</Label>
              </div>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 flex justify-end">
          <Button variant="primary">Apply Settings</Button>
        </div>
      </CardContent>
    </Card>
  );
}
