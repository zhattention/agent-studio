import '@/styles/globals.css';
import 'reactflow/dist/style.css';
import type { AppProps } from 'next/app';
import { StoreProvider } from '@/stores/StoreContext';

export default function App({ Component, pageProps }: AppProps) {
  return (
    <StoreProvider>
      <Component {...pageProps} />
    </StoreProvider>
  );
} 