import React from 'react';
import { useQuery } from '@tanstack/react-query';
import axiosInstance from '@/lib/axiosInstance';
import { paths } from '@/lib/apiPaths';
import { qkLocalizationQuality } from '@/lib/queryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface LocalizationQualityData {
  locale_stats: {
    locale: string;
    translated_pct: number;
    total_attributes: number;
    translated_attributes: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#A4DE6C', '#8884D8'];

const LocalizationQualityReport: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: qkLocalizationQuality(),
    queryFn: () => axiosInstance.get<LocalizationQualityData>(paths.analytics.localizationQuality())
      .then(res => res.data),
    // Fallback mock data for development
    placeholderData: {
      locale_stats: [
        { locale: 'fr_FR', translated_pct: 76.2, total_attributes: 450, translated_attributes: 343 },
        { locale: 'es_ES', translated_pct: 82.0, total_attributes: 450, translated_attributes: 369 },
        { locale: 'de_DE', translated_pct: 68.5, total_attributes: 450, translated_attributes: 308 },
        { locale: 'it_IT', translated_pct: 45.3, total_attributes: 450, translated_attributes: 204 },
        { locale: 'nl_NL', translated_pct: 31.8, total_attributes: 450, translated_attributes: 143 }
      ]
    }
  });

  // Helper to get locale display name
  const getLocaleName = (localeCode: string) => {
    const localeMap: Record<string, string> = {
      'fr_FR': 'French',
      'es_ES': 'Spanish',
      'de_DE': 'German',
      'it_IT': 'Italian',
      'nl_NL': 'Dutch',
      'pt_BR': 'Portuguese',
      'ja_JP': 'Japanese',
      'zh_CN': 'Chinese',
      'ru_RU': 'Russian'
    };
    return localeMap[localeCode] || localeCode;
  };

  // Calculate overall translation rate
  const overallTranslationRate = data 
    ? data.locale_stats.reduce((sum, stat) => sum + stat.translated_attributes, 0) / 
      (data.locale_stats.reduce((sum, stat) => sum + stat.total_attributes, 0) || 1) * 100
    : 0;

  // Sort and get locales needing most work (lowest translation %)
  const mostNeededLocales = data 
    ? [...data.locale_stats].sort((a, b) => a.translated_pct - b.translated_pct)
    : [];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">Localization Quality</h2>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-[300px] w-full" />
        </div>
      ) : error ? (
        <div className="text-red-500 p-4 border rounded">
          Error loading localization quality data. Please try again later.
        </div>
      ) : (
        <>
          {/* Overall Progress */}
          <Card>
            <CardHeader>
              <CardTitle>Overall Translation Progress</CardTitle>
              <CardDescription>Percentage of all attributes translated across all locales</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="w-full max-w-md">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-700">Translation Progress</span>
                    <span className="text-sm font-medium">{overallTranslationRate.toFixed(1)}%</span>
                  </div>
                  <Progress value={overallTranslationRate} className="h-2 w-full" />
                  <div className="mt-4 text-sm text-gray-600">
                    {overallTranslationRate < 50 ? (
                      <p>Your localization efforts need significant work. Focus on key languages first.</p>
                    ) : overallTranslationRate < 80 ? (
                      <p>Your localization is progressing well but has room for improvement.</p>
                    ) : (
                      <p>Your localization is largely complete. Great job!</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Translation by Locale */}
          <Card>
            <CardHeader>
              <CardTitle>Translation by Locale</CardTitle>
              <CardDescription>Percentage of attributes translated for each language</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.locale_stats}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis 
                      dataKey="locale" 
                      type="category" 
                      width={80} 
                      tickFormatter={(value) => getLocaleName(value)}
                    />
                    <Tooltip 
                      formatter={(value) => [`${value}%`, 'Translated']}
                      labelFormatter={(value) => getLocaleName(value)}
                    />
                    <Bar dataKey="translated_pct" name="Translated">
                      {data.locale_stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Missing Translations Table */}
          <Card>
            <CardHeader>
              <CardTitle>Locales Needing Attention</CardTitle>
              <CardDescription>Prioritized list of locales with lowest translation rates</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Locale</TableHead>
                    <TableHead>Translated</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mostNeededLocales.slice(0, 5).map((locale, index) => (
                    <TableRow key={locale.locale}>
                      <TableCell className="font-medium">{getLocaleName(locale.locale)}</TableCell>
                      <TableCell>{locale.translated_attributes} / {locale.total_attributes}</TableCell>
                      <TableCell>{locale.translated_pct.toFixed(1)}%</TableCell>
                      <TableCell className="text-right">
                        <Badge variant={
                          locale.translated_pct >= 80 ? "success" : 
                          locale.translated_pct >= 50 ? "outline" : 
                          "destructive"
                        }>
                          {locale.translated_pct >= 80 ? "Good" : 
                           locale.translated_pct >= 50 ? "Needs work" : 
                           "Critical"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default LocalizationQualityReport; 