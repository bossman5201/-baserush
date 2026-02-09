"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
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
      setStatus("TAP TAP TAP!");
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
    setStatus("SAVING TO BASE...");
    
    // If wallet is connected, use address. If not, use Guest.
    const playerId = isConnected ? address : "Guest_" + Math.floor(Math.random() * 100);

    await supabase.from('rounds').insert([{ player_id: playerId, score: score }]);
    setStatus("SCORE SAVED!");
    fetchLeaderboard();
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      
      {/* WALLET BUTTON */}
      <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
        <Wallet>
          <ConnectWallet>
            <span style={{ color: 'white' }}>Connect Wallet</span>
          </ConnectWallet>
          <WalletDropdown>
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>

      <h1 style={{ color: '#0052FF', fontSize: '2.5rem', marginBottom: '0' }}>BASERUSH</h1>
      <p style={{ opacity: 0.5, marginBottom: '20px' }}>{isConnected ? "Connected" : "Play as Guest"}</p>
      
      <div onClick={handleTap} style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ fontSize: '1.2rem', color: '#0052FF' }}>{timeLeft}s</div>
        <div style={{ fontSize: '5rem', fontWeight: 'bold', margin: '10px 0' }}>{score}</div>
        <div style={{ color: '#0052FF', fontWeight: 'bold', minHeight: '30px' }}>{status}</div>
        
        <div style={{
          width: '160px', height: '160px', borderRadius: '50%',
          border: '10px solid #0052FF', margin: '20px auto',
          boxShadow: isPlaying ? '0 0 30px #0052FF' : 'none',
          transition: 'all 0.1s'
        }} />
      </div>

      <div style={{ marginTop: '30px', width: '100%', maxWidth: '350px', backgroundColor: '#111', padding: '20px', borderRadius: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0052FF', textAlign: 'center' }}>LEADERBOARD</h3>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #222', fontSize: '0.8rem' }}>
            <span style={{ color: '#888' }}>
              {entry.player_id.includes('0x') ? `${entry.player_id.slice(0,6)}...${entry.player_id.slice(-4)}` : entry.player_id}
            </span>
            <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
