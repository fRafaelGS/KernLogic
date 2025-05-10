import type { AppProps } from 'next/app';
import '@/styles/globals.css';
import { FeatureFlagsProvider } from '@/contexts/FeatureFlagsContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <FeatureFlagsProvider>
      <Component {...pageProps} />
    </FeatureFlagsProvider>
  );
} 