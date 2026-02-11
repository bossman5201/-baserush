"use client";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { coinbaseWallet } from 'wagmi/connectors';

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());
  const [wagmiConfig] = useState(() => 
    createConfig({
      chains: [base],
      connectors: [coinbaseWallet({ appName: 'BaseRush Arcade', preference: 'smartWalletOnly' })],
      ssr: true,
      transports: { [base.id]: http() },
    })
  );

  return (
    <html lang="en">
      <head>
        <title>BaseRush | 120s Tap Challenge</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0"/> 
        <link rel="stylesheet" href="https://unpkg.com/@coinbase/onchainkit@latest/dist/index.css" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#000', color: '#fff' }}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <OnchainKitProvider chain={base} apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY}>
              {children}
            </OnchainKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
