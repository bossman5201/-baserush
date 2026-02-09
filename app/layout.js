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
      connectors: [
        coinbaseWallet({ 
          appName: 'BaseRush Arcade',
          preference: 'smartWalletOnly', 
        }),
      ],
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
        
        {/* THIS SECTION FIXES THE WHITE BOX */}
        <style>{`
          :root {
            --ock-bg-default: #111111;
            --ock-bg-secondary: #1a1a1a;
            --ock-text-primary: #ffffff;
            --ock-text-secondary: #888888;
            --ock-border-radius: 16px;
            --ock-font-family: monospace;
          }
          /* This hides the big white background of the dropdown */
          [data-testid="ockWalletDropdown"] {
            background-color: #111 !important;
            border: 1px solid #222 !important;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5) !important;
          }
          /* This styles the disconnect button inside the box */
          button[data-testid="ockWalletDropdownDisconnect"] {
            background-color: #222 !important;
            color: #ff4444 !important;
          }
          button[data-testid="ockWalletDropdownDisconnect"]:hover {
            background-color: #333 !important;
          }
        `}</style>
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
