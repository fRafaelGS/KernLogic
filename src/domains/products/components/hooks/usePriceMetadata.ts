import { useState, useEffect } from 'react';
import { productService } from '@/services/productService';

export interface PriceType   { id: number; code: string; label: string }
export interface Currency    { iso_code: string; symbol: string; name: string; decimals: number }
export interface SalesChannel{ id: number; name: string }

export function usePriceMetadata() {
  const [priceTypes, setPriceTypes]       = useState<PriceType[]>([]);
  const [currencies, setCurrencies]       = useState<Currency[]>([]);
  const [channels, setChannels]           = useState<SalesChannel[]>([]);
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState<Error|null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      productService.getPriceTypes(), 
      productService.getCurrencies(), 
      productService.getSalesChannels()
    ])
      .then(([pt, cur, ch]) => {
        setPriceTypes(Array.isArray(pt) ? pt : []);
        setCurrencies(Array.isArray(cur) ? cur : []);
        setChannels(Array.isArray(ch) ? ch : []);
      })
      .catch((err) => {
        console.error("Error loading price metadata:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(() => setLoading(false));
  }, []);

  return { priceTypes, currencies, channels, loading, error };
} 