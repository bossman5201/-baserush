"use client";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/@coinbase/onchainkit@latest/dist/index.css" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#000' }}>
        <QueryClientProvider client={queryClient}>
          <OnchainKitProvider chain={base}>
            {children}
          </OnchainKitProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
