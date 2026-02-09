"use client";
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { coinbaseWallet, injected } from 'wagmi/connectors';

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient());

  // This config tells the app to look for Zerion/MetaMask (injected) + Coinbase Wallet
  const [wagmiConfig] = useState(() => 
    createConfig({
      chains: [base],
      connectors: [
        coinbaseWallet({ appName: 'BaseRush', preference: 'all' }),
        injected(), // This is the line that finds Zerion!
      ],
      ssr: true,
      transports: { [base.id]: http() },
    })
  );

  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://unpkg.com/@coinbase/onchainkit@latest/dist/index.css" />
      </head>
      <body style={{ margin: 0, backgroundColor: '#000' }}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <OnchainKitProvider 
              chain={base} 
              apiKey={process.env.NEXT_PUBLIC_CDP_API_KEY}
            >
              {children}
            </OnchainKitProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </body>
    </html>
  );
}
