import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3, 
  PieChart, 
  Users, 
  Globe, 
  Monitor, 
  Tag, 
  FileDown, 
  FileUp, 
  Clock, 
  Zap,
  Percent,
  AlertTriangle,
  CheckCircle2,
  Lightbulb
} from 'lucide-react';
import { Attribute, AttributeValue } from './AttributeValueRow';
import { AttributeGroup } from './index';

interface AttributeStat {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  change?: {
    value: number;
    trend: 'up' | 'down' | 'neutral';
  };
  color?: string;
}

interface AttributeDashboardProps {
  attributes: Attribute[];
  attributeGroups: AttributeGroup[];
  attributeValues: Record<string, AttributeValue>;
  completionPercentage: number;
}

/**
 * A dashboard component that displays attribute-related metrics, insights, and analytics
 * for an enterprise-grade PIM platform
 */
const AttributeDashboard: React.FC<AttributeDashboardProps> = ({
  attributes,
  attributeGroups,
  attributeValues,
  completionPercentage
}) => {
  // Calculate various attribute statistics
  const totalAttributes = attributes.length;
  const totalGroups = attributeGroups.length;
  const filledAttributes = Object.values(attributeValues).length;
  
  // Calculate attributes by type
  const attributesByType = attributes.reduce((acc, attr) => {
    acc[attr.data_type] = (acc[attr.data_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  // Calculate localized attributes
  const localizedAttributes = attributes.filter(attr => attr.is_localisable).length;
  const localizedPercentage = Math.round((localizedAttributes / totalAttributes) * 100) || 0;
  
  // Calculate channel-specific attributes
  const channelAttributes = attributes.filter(attr => attr.is_scopable).length;
  const channelPercentage = Math.round((channelAttributes / totalAttributes) * 100) || 0;
  
  // Calculate attribute completion by group
  const groupCompletion = attributeGroups.map(group => {
    const groupItems = group.items || [];
    const totalItems = groupItems.length;
    const filledItems = groupItems.filter(item => {
      return Object.values(attributeValues).some(val => 
        val.attribute === item.attribute &&
        val.value !== null && 
        val.value !== undefined
      );
    }).length;
    
    return {
      name: group.name,
      total: totalItems,
      filled: filledItems,
      percentage: totalItems ? Math.round((filledItems / totalItems) * 100) : 0
    };
  });
  
  // Key attribute statistics for display
  const stats: AttributeStat[] = [
    {
      label: 'Total Attributes',
      value: totalAttributes,
      icon: <Tag className="h-4 w-4" />,
      color: 'bg-blue-50 text-blue-600'
    },
    {
      label: 'Attribute Groups',
      value: totalGroups,
      icon: <PieChart className="h-4 w-4" />,
      color: 'bg-amber-50 text-amber-600'
    },
    {
      label: 'Completion Rate',
      value: `${completionPercentage}%`,
      icon: <Percent className="h-4 w-4" />,
      color: completionPercentage >= 90 
        ? 'bg-green-50 text-green-600' 
        : completionPercentage >= 50 
          ? 'bg-amber-50 text-amber-600' 
          : 'bg-red-50 text-red-600',
      change: {
        value: 5,
        trend: 'up'
      }
    },
    {
      label: 'Localized',
      value: `${localizedPercentage}%`,
      icon: <Globe className="h-4 w-4" />,
      color: 'bg-indigo-50 text-indigo-600'
    }
  ];
  
  // Data insights based on current attribute metrics
  const insights = [
    {
      title: 'Missing Required Attributes',
      description: 'Some products are missing essential attributes that might impact searchability.',
      icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
      action: 'Review'
    },
    {
      title: 'Localization Opportunity',
      description: 'Only 35% of product attributes have multilingual values. Consider adding more translations.',
      icon: <Lightbulb className="h-5 w-5 text-blue-500" />,
      action: 'Explore'
    },
    {
      title: 'Attribute Schema Complete',
      description: 'Your attribute schema is properly configured with appropriate data types and constraints.',
      icon: <CheckCircle2 className="h-5 w-5 text-green-500" />,
      action: 'View'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-bold">{stat.value}</h3>
                    {stat.change && (
                      <Badge 
                        variant="outline" 
                        className={
                          stat.change.trend === 'up' 
                            ? 'bg-green-50 text-green-600 border-green-200' 
                            : stat.change.trend === 'down'
                              ? 'bg-red-50 text-red-600 border-red-200'
                              : 'bg-slate-50 text-slate-600 border-slate-200'
                        }
                      >
                        {stat.change.trend === 'up' ? '+' : stat.change.trend === 'down' ? '-' : ''}
                        {stat.change.value}%
                      </Badge>
                    )}
                  </div>
                </div>
                <div className={`p-3 rounded-full ${stat.color}`}>
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Group Completion Status */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Attribute Group Completion
            </CardTitle>
            <CardDescription>
              Progress of attribute completion by group
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {groupCompletion.map((group, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{group.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {group.filled}/{group.total} ({group.percentage}%)
                    </span>
                  </div>
                  <div className="relative pt-1">
                    <Progress value={group.percentage} className="h-2" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4 flex justify-between">
            <p className="text-sm text-muted-foreground">
              {groupCompletion.filter(g => g.percentage === 100).length} of {groupCompletion.length} groups complete
            </p>
            <Button variant="outline" size="sm">
              <FileDown className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </CardFooter>
        </Card>
        
        {/* Insights Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              Data Insights
            </CardTitle>
            <CardDescription>
              Recommendations based on attribute analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {insights.map((insight, index) => (
                <div 
                  key={index} 
                  className="p-3 border rounded-lg flex items-start gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="mt-0.5">
                    {insight.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{insight.title}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{insight.description}</p>
                    <Button 
                      variant="link" 
                      size="sm" 
                      className="px-0 py-0 h-auto mt-1 text-xs text-primary"
                    >
                      {insight.action}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" className="w-full">
              <Lightbulb className="h-4 w-4 mr-2" />
              See All Insights
            </Button>
          </CardFooter>
        </Card>
      </div>
      
      {/* Activity & Statistics Tabs */}
      <Card>
        <Tabs defaultValue="activity" className="w-full">
          <CardHeader className="pb-0">
            <div className="flex items-center justify-between">
              <CardTitle>Attribute Analytics</CardTitle>
              <TabsList>
                <TabsTrigger value="activity" className="text-xs">
                  <Clock className="h-4 w-4 mr-1" />
                  Recent Activity
                </TabsTrigger>
                <TabsTrigger value="distribution" className="text-xs">
                  <PieChart className="h-4 w-4 mr-1" />
                  Distribution
                </TabsTrigger>
                <TabsTrigger value="users" className="text-xs">
                  <Users className="h-4 w-4 mr-1" />
                  User Engagement
                </TabsTrigger>
              </TabsList>
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <TabsContent value="activity" className="m-0">
              <div className="space-y-4">
                {/* Sample activity items */}
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                      <Tag className="h-4 w-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Product weight attribute added</p>
                      <p className="text-xs text-muted-foreground">Added by Sarah Johnson</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">2 hours ago</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">French translations updated</p>
                      <p className="text-xs text-muted-foreground">Updated by Thomas Weber</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">Yesterday</span>
                </div>
                
                <div className="flex items-center justify-between py-2 border-b">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                      <PieChart className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Technical Specs group modified</p>
                      <p className="text-xs text-muted-foreground">Modified by Alex Chen</p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground">2 days ago</span>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="distribution" className="m-0">
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Attributes by Type</h4>
                    <div className="space-y-2">
                      {Object.entries(attributesByType).map(([type, count]) => (
                        <div key={type} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="capitalize">
                              {type}
                            </Badge>
                          </div>
                          <span className="text-sm">{count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Attributes by Property</h4>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            <Globe className="h-3 w-3 mr-1" />
                            Localisable
                          </Badge>
                        </div>
                        <span className="text-sm">{localizedAttributes}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            <Monitor className="h-3 w-3 mr-1" />
                            Scopable
                          </Badge>
                        </div>
                        <span className="text-sm">{channelAttributes}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="users" className="m-0">
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <h4 className="text-sm font-medium mb-2">Most Active Users</h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium">SJ</span>
                        </div>
                        <span className="text-sm">Sarah Johnson</span>
                      </div>
                      <Badge variant="outline">
                        102 changes
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-b">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium">TW</span>
                        </div>
                        <span className="text-sm">Thomas Weber</span>
                      </div>
                      <Badge variant="outline">
                        87 changes
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                          <span className="text-xs font-medium">AC</span>
                        </div>
                        <span className="text-sm">Alex Chen</span>
                      </div>
                      <Badge variant="outline">
                        54 changes
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </CardContent>
          
          <CardFooter className="border-t pt-4">
            <Button variant="outline" size="sm" className="w-full">
              View Complete Analytics
            </Button>
          </CardFooter>
        </Tabs>
      </Card>
    </div>
  );
};

export default AttributeDashboard; 