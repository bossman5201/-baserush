"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount, useSendTransaction, useDisconnect } from 'wagmi';
import { parseEther } from 'viem';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const RECIPIENT_ADDRESS = "0xbd14b65e9c6e767f02d1900894261735f5f48a57"; 
const RETRY_FEE = "0.0001"; 

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { sendTransactionAsync } = useSendTransaction();
  
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("SYSTEM ONLINE");
  const [isFever, setIsFever] = useState(false);
  
  // Anti-Cheat & Fever Refs
  const lastTapTime = useRef(0);
  const tapIntervals = useRef([]);
  const recentTaps = useRef([]);
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

  const handleTap = (e) => {
    e.preventDefault();
    if (!isPlaying) return;

    const now = Date.now();
    const interval = now - lastTapTime.current;
    
    // --- ANTI-CHEAT: Consistency Check ---
    // If the last 10 taps have exactly the same millisecond delay, it's a bot.
    tapIntervals.current.push(interval);
    if (tapIntervals.current.length > 10) tapIntervals.current.shift();
    const isBot = tapIntervals.current.length === 10 && new Set(tapIntervals.current).size <= 2;

    // --- FEVER MODE: Speed Check ---
    recentTaps.current.push(now);
    recentTaps.current = recentTaps.current.filter(t => now - t < 1000); // Only keep taps from the last 1 second
    
    const tapsPerSecond = recentTaps.current.length;
    if (tapsPerSecond > 8) setIsFever(true);
    else setIsFever(false);

    // --- SCORING ---
    if (!isBot && tapsPerSecond < 25) { // Real humans rarely cross 25 taps/sec
        const points = isFever ? 2 : 1;
        setScore(s => s + points);
    }

    lastTapTime.current = now;
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    tapIntervals.current = [];
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStartRequest = async () => {
    if (!isConnected) return;
    if (canPlayFree) startGame(false);
    else handlePayment();
  };

  const handlePayment = async () => {
    try {
      await sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) });
      startGame(true);
    } catch (err) { console.error(err); }
  };

  async function endGame() {
    setIsPlaying(false);
    setIsFever(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    fetchLeaderboard();
    checkFreeChance();
  }

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft]);

  return (
    <div style={{ 
        backgroundColor: isFever ? '#221100' : '#000', 
        color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace',
        transition: 'background-color 0.3s ease' 
    }}>
      
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '900', color: isFever ? '#FF8800' : '#0052FF' }}>BASERUSH</div>
        <ConnectWallet className="bg-[#0052FF] text-white rounded-lg px-4 py-2" />
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <div style={{ fontSize: '10rem', fontWeight: '900', color: isFever ? '#FF8800' : '#fff', lineHeight: '0.8' }}>{score}</div>
        <div style={{ color: isFever ? '#FF8800' : '#0052FF', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '10px' }}>
            {isFever ? "🔥 FEVER MODE 2X 🔥" : isPlaying ? `${timeLeft}s` : status}
        </div>
      </div>

      <div 
        onPointerDown={handleTap}
        style={{
          width: '260px', height: '260px', borderRadius: '50%',
          background: isFever ? 'radial-gradient(circle, #FF880044 0%, #000 100%)' : 'radial-gradient(circle, #0052FF22 0%, #000 100%)',
          border: `6px solid ${isFever ? '#FF8800' : isPlaying ? '#0052FF' : '#111'}`,
          margin: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all 0.1s', userSelect: 'none', touchAction: 'none'
        }}
      >
        {!isPlaying && isConnected && (
            <button onClick={handleStartRequest} style={{ background: '#0052FF', border: 'none', color: '#fff', fontWeight: 'bold', padding: '15px 30px', borderRadius: '12px', cursor: 'pointer' }}>
                {canPlayFree ? 'START FREE' : `RETRY (${RETRY_FEE} ETH)`}
            </button>
        )}
      </div>

      {/* Leaderboard Simplified for Speed */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#050505', padding: '20px', borderRadius: '20px', border: '1px solid #111' }}>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #111' }}>
            <span style={{ color: '#666' }}>{i + 1}. {entry.player_id.slice(0,10)}</span>
            <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
