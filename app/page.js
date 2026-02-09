"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 120 Seconds
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("CONNECT WALLET TO START");

  useEffect(() => {
    fetchLeaderboard();
    if (isConnected) checkFreeChance();
  }, [isConnected, address]);

  async function fetchLeaderboard() {
    const { data } = await supabase.from('rounds').select('score, player_id').order('score', { ascending: false }).limit(10);
    setLeaderboard(data || []);
  }

  async function checkFreeChance() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('rounds')
      .select('id')
      .eq('player_id', address)
      .gte('created_at', today);

    if (data && data.length > 0) {
      setCanPlayFree(false);
      setStatus("DAILY FREE CHANCE USED");
    } else {
      setCanPlayFree(true);
      setStatus("FREE DAILY CHANCE READY");
    }
  }

  const startGame = () => {
    if (!isConnected) return alert("Connect Wallet First!");
    if (!canPlayFree) return alert("You used your free chance! Pay to retry (Feature coming next).");

    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    setStatus("TAP FAST!");

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = () => {
    if (!isPlaying) return;
    setScore(s => s + 1);
  };

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) endGame();
  }, [timeLeft]);

  async function endGame() {
    setIsPlaying(false);
    setStatus("SAVING SCORE...");
    await supabase.from('rounds').insert([{ player_id: address, score: score }]);
    setStatus("GAME OVER!");
    checkFreeChance();
    fetchLeaderboard();
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      
      <div style={{ alignSelf: 'flex-end' }}>
        <Wallet>
          <ConnectWallet><span className="text-white">Sign In</span></ConnectWallet>
          <WalletDropdown><WalletDropdownDisconnect /></WalletDropdown>
        </Wallet>
      </div>

      <h1 style={{ color: '#0052FF', fontSize: '3rem', margin: '20px 0' }}>BASERUSH</h1>
      
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: '1.5rem', color: timeLeft < 10 ? 'red' : '#fff' }}>TIME: {timeLeft}s</div>
        <div style={{ fontSize: '7rem', fontWeight: '900', margin: '0' }}>{score}</div>
        <div style={{ color: '#0052FF', fontWeight: 'bold', marginBottom: '20px' }}>{status}</div>

        {!isPlaying ? (
          <button 
            onClick={startGame}
            style={{
              padding: '20px 40px', fontSize: '1.5rem', borderRadius: '50px', border: 'none',
              backgroundColor: canPlayFree ? '#0052FF' : '#333', color: '#fff', cursor: 'pointer',
              fontWeight: 'bold', boxShadow: '0 10px 20px rgba(0,82,255,0.3)'
            }}
          >
            {canPlayFree ? 'PLAY FREE CHANCE' : 'RETRY (0.0001 ETH)'}
          </button>
        ) : (
          <div 
            onPointerDown={handleTap}
            style={{
              width: '250px', height: '250px', borderRadius: '50%',
              backgroundColor: '#0052FF', margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', fontWeight: 'bold', userSelect: 'none',
              active: { transform: 'scale(0.95)' }, transition: 'transform 0.05s'
            }}
          >
            TAP!
          </div>
        )}
      </div>

      <div style={{ marginTop: '40px', width: '100%', maxWidth: '400px', backgroundColor: '#111', padding: '20px', borderRadius: '20px' }}>
        <h3 style={{ textAlign: 'center', color: '#0052FF', marginTop: 0 }}>GLOBAL RANKING</h3>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #222' }}>
            <span style={{ color: '#888' }}>{entry.player_id.slice(0,6)}...</span>
            <span style={{ fontWeight: 'bold' }}>{entry.score} Taps</span>
          </div>
        ))}
      </div>
    </div>
  );
}
