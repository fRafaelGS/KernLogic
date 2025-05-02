import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkEnrichmentVelocity } from '@/lib/queryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

interface EnrichmentVelocityData {
  daily_edits: {
    date: string;
    count: number;
  }[];
}

interface DailyData {
  date: string;
  dayOfWeek: number;
  dayName: string;
  hour: number;
  count: number;
}

const EnrichmentVelocityReport: React.FC = () => {
  const [timeRange, setTimeRange] = useState<number>(30);
  
  const { data, isLoading, error } = useQuery({
    queryKey: qkEnrichmentVelocity(timeRange),
    queryFn: () => axiosInstance.get<EnrichmentVelocityData>(paths.analytics.enrichmentVelocity(timeRange))
      .then(res => res.data)
  });

  // Create mock data for heatmap if no real data
  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
  };

  const getDayOfWeek = (dateStr: string) => {
    return new Date(dateStr).getDay();
  };

  const formatData = () => {
    if (!data) return [];
    
    return data.daily_edits.map(item => ({
      ...item,
      dayOfWeek: getDayOfWeek(item.date),
      dayName: getDayName(item.date),
    }));
  };
  
  // Calculate additional stats
  const totalEdits = data?.daily_edits.reduce((sum, item) => sum + item.count, 0) || 0;
  const avgEditsPerDay = totalEdits / (data?.daily_edits.length || 1);
  const maxEditsPerDay = data?.daily_edits.reduce((max, item) => Math.max(max, item.count), 0) || 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium">Enrichment Velocity</h2>
        <Select
          value={timeRange.toString()}
          onValueChange={(value) => setTimeRange(parseInt(value))}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 border rounded">
          Error loading enrichment velocity data. Please try again later.
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Edits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalEdits}</div>
                <p className="text-xs text-muted-foreground">
                  In the last {timeRange} days
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Average Edits/Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{avgEditsPerDay.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">
                  Daily average
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Peak Edits/Day</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{maxEditsPerDay}</div>
                <p className="text-xs text-muted-foreground">
                  Highest in a single day
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Edits Over Time</CardTitle>
              <CardDescription>Number of attribute edits per day</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={formatData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => {
                        const date = new Date(value);
                        return `${date.getMonth()+1}/${date.getDate()}`;
                      }}
                    />
                    <YAxis />
                    <Tooltip 
                      labelFormatter={(label) => {
                        const date = new Date(label);
                        return `${date.toLocaleDateString()} (${getDayName(label)})`;
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#0088FE" 
                      name="Edits"
                      strokeWidth={2}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Day of Week Analysis */}
          <Card>
            <CardHeader>
              <CardTitle>Edits by Day of Week</CardTitle>
              <CardDescription>Which days see the most activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={
                      // Group by day of week and sum
                      [0, 1, 2, 3, 4, 5, 6].map(day => {
                        const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
                        const items = formatData().filter(d => d.dayOfWeek === day);
                        const count = items.reduce((sum, item) => sum + item.count, 0);
                        return { day, dayName, count };
                      })
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="dayName" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`${value} edits`, 'Count']}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Bar dataKey="count" fill="#00C49F" name="Edits" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default EnrichmentVelocityReport; 