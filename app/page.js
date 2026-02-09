"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  ConnectWallet, 
  Wallet, 
  WalletDropdown, 
  WalletDropdownDisconnect, 
  WalletDropdownLink 
} from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("READY?");
  const [timeLeft, setTimeLeft] = useState(10);
  const [leaderboard, setLeaderboard] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => { fetchLeaderboard(); }, []);

  async function fetchLeaderboard() {
    const { data } = await supabase.from('rounds').select('score, player_id').order('score', { ascending: false }).limit(5);
    setLeaderboard(data || []);
  }

  const handleTap = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      setScore(0);
      setTimeLeft(10);
      setStatus("GO!");
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timerRef.current); return 0; }
          return prev - 1;
        });
      }, 1000);
      return;
    }
    setScore(s => s + 100);
  };

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) endGame();
  }, [timeLeft]);

  async function endGame() {
    setIsPlaying(false);
    setStatus("SAVING...");
    const playerId = isConnected ? address : "Guest_" + Math.floor(Math.random() * 100);
    await supabase.from('rounds').insert([{ player_id: playerId, score: score }]);
    setStatus("SCORE SAVED!");
    fetchLeaderboard();
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      
      {/* IMPROVED WALLET CONNECTOR */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <Wallet>
          <ConnectWallet text="Sign In" className="bg-[#0052FF] text-white px-4 py-2 rounded-lg font-bold">
            {/* This is where the magic happens: showing the address if connected */}
            {isConnected ? (
              <span className="text-white">{address.slice(0,6)}...{address.slice(-4)}</span>
            ) : (
              "Connect Wallet"
            )}
          </ConnectWallet>
          <WalletDropdown>
            <WalletDropdownLink icon="wallet" href="https://wallet.coinbase.com">
              Go to Wallet
            </WalletDropdownLink>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>

      <h1 style={{ color: '#0052FF', fontSize: '3rem', margin: '10px 0', letterSpacing: '2px' }}>BASERUSH</h1>
      
      <div onClick={handleTap} style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none', padding: '20px' }}>
        <div style={{ fontSize: '1.5rem', color: '#0052FF', fontWeight: 'bold' }}>{timeLeft}s</div>
        <div style={{ fontSize: '6rem', fontWeight: '900', margin: '0' }}>{score}</div>
        <div style={{ color: '#0052FF', fontWeight: 'bold', height: '30px' }}>{status}</div>
        
        <div style={{
          width: '180px', height: '180px', borderRadius: '50%',
          border: '12px solid #0052FF', margin: '20px auto',
          boxShadow: isPlaying ? '0 0 50px #0052FF66' : '0 0 0 0 transparent',
          backgroundColor: isPlaying ? '#0052FF11' : 'transparent',
          transition: 'all 0.1s'
        }} />
      </div>

      <div style={{ marginTop: '20px', width: '100%', maxWidth: '350px', backgroundColor: '#111', padding: '20px', borderRadius: '20px', border: '1px solid #222' }}>
        <h3 style={{ margin: '0 0 15px 0', textAlign: 'center', color: '#0052FF', letterSpacing: '1px' }}>LEADERBOARD</h3>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === leaderboard.length -1 ? 'none' : '1px solid #222' }}>
            <span style={{ color: '#888', fontFamily: 'monospace' }}>
               {entry.player_id.startsWith('0x') ? `${entry.player_id.slice(0,6)}...${entry.player_id.slice(-4)}` : entry.player_id}
            </span>
            <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
