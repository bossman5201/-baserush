"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const RECIPIENT_ADDRESS = "0xbd14b65e9c6e767f02d1900894261735f5f48a57"; 
const RETRY_FEE = "0.0001"; 

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("SYSTEM READY");
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef(null);

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
    const { data } = await supabase.from('rounds').select('id').eq('player_id', address).gte('created_at', today).eq('is_paid', false);
    setCanPlayFree(!(data && data.length > 0));
  }

  const handleStartRequest = async () => {
    if (!isConnected) return;
    if (canPlayFree) startGame(false);
    else handlePayment();
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStatus("AUTHORIZING...");
    try {
      await sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) });
      startGame(true);
    } catch (err) {
      setStatus("RETRY CANCELED");
      setIsProcessing(false);
    }
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    setStatus(isPaidRound ? "PAID ATTEMPT" : "DAILY FREE ATTEMPT");
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    setScore(s => s + 1);
  };

  async function endGame() {
    setIsPlaying(false);
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    fetchLeaderboard();
    checkFreeChance();
  }

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace' }}>
      
      {/* HEADER */}
      <div style={{ width: '100%', maxWidth: '600px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxSizing: 'border-box' }}>
        <div style={{ fontWeight: '900', color: '#0052FF', fontSize: '1.2rem' }}>BASERUSH</div>
        
        <div className="ock-dark-theme"> 
          <Wallet>
            <ConnectWallet className="bg-[#0052FF] rounded-lg border-none py-2 px-4">
              <span className="text-white font-bold text-sm">{isConnected ? 'PLAYER ACTIVE' : 'SIGN IN'}</span>
            </ConnectWallet>
            <WalletDropdown />
          </Wallet>
        </div>
      </div>

      <div style={{ padding: '0 20px 40px 20px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '5px' }}>TOTAL_TAPS</div>
            <div style={{ fontSize: '7rem', fontWeight: '900', color: '#fff', margin: '10px 0', lineHeight: '1' }}>{score}</div>
            <div style={{ color: '#0052FF', fontSize: '0.9rem', fontWeight: 'bold' }}>{isPlaying ? `${timeLeft}s` : status}</div>
        </div>

        {/* TAP AREA */}
        <div 
          onPointerDown={handleTap}
          style={{
            width: '240px', height: '240px', borderRadius: '50%',
            background: isPlaying ? 'radial-gradient(circle, #0052FF44 0%, #000 100%)' : '#050505',
            border: `6px solid ${isPlaying ? '#0052FF' : '#111'}`,
            margin: '30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.1s', userSelect: 'none', touchAction: 'none'
          }}
        >
          {!isPlaying && isConnected && (
            <button onClick={handleStartRequest} style={{ background: 'none', border: 'none', color: '#0052FF', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer' }}>
               {canPlayFree ? 'PLAY FREE' : 'PAY TO RETRY'}
            </button>
          )}
          {isPlaying && <div style={{ fontSize: '2rem', fontWeight: '900', opacity: 0.1 }}>TAP!</div>}
        </div>

        {/* RANKINGS */}
        <div style={{ width: '100%', background: '#050505', borderRadius: '20px', padding: '20px', border: '1px solid #111' }}>
          <div style={{ fontSize: '0.6rem', color: '#333', marginBottom: '15px', textAlign: 'center', letterSpacing: '2px' }}>RANKINGS</div>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111' }}>
              <span style={{ color: i === 0 ? '#00FF88' : '#666', fontSize: '0.8rem' }}>{i + 1}. {entry.player_id.slice(0,10)}</span>
              <span style={{ fontWeight: 'bold', fontSize: '0.8rem' }}>{entry.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
