"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ConnectWallet } from '@coinbase/onchainkit/wallet';
import { Name, Avatar, Identity, Badge } from '@coinbase/onchainkit/identity'; // Identity tools
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
  const [status, setStatus] = useState("SYSTEM READY");
  const [isFever, setIsFever] = useState(false);
  
  const audioCtx = useRef(null);
  const timerRef = useRef(null);
  const recentTaps = useRef([]);

  const initAudio = () => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
  };

  const playTapSound = () => {
    if (!audioCtx.current) return;
    const osc = audioCtx.current.createOscillator();
    const g = audioCtx.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200 + (score % 400), audioCtx.current.currentTime);
    g.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 0.05);
    osc.connect(g);
    g.connect(audioCtx.current.destination);
    osc.start();
    osc.stop(audioCtx.current.currentTime + 0.05);
  };

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

  const handleTap = () => {
    if (!isPlaying) return;
    
    // Fever Mode Logic (Tapping faster than 10 taps/sec)
    const now = Date.now();
    recentTaps.current.push(now);
    recentTaps.current = recentTaps.current.filter(t => now - t < 1000);
    setIsFever(recentTaps.current.length > 10);

    setScore(s => s + (isFever ? 2 : 1)); // Double points in Fever Mode
    playTapSound();
  };

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timerRef.current); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  async function endGame() {
    setIsPlaying(false);
    setIsFever(false);
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    fetchLeaderboard();
    checkFreeChance();
  }

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft, isPlaying]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace' }}>
      
      {/* PROFESSIONAL HEADER */}
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '900', color: isFever ? '#00FF88' : '#0052FF', fontSize: '1.2rem', transition: '0.3s' }}>BASERUSH</div>
        
        {isConnected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#111', padding: '5px 12px', borderRadius: '12px', border: '1px solid #222' }}>
            <Identity address={address} schemaId="0xf8b... (optional)">
              <Avatar address={address} className="w-6 h-6 rounded-full" />
              <Name address={address} className="text-white text-xs ml-2" />
            </Identity>
            <button onClick={() => disconnect()} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>[EXIT]</button>
          </div>
        ) : (
          <ConnectWallet className="bg-[#0052FF] text-white rounded-lg px-4 py-2 font-bold border-none" />
        )}
      </div>

      {/* SCORE AREA */}
      <div style={{ textAlign: 'center', marginTop: '20px' }}>
        <div style={{ fontSize: '10rem', fontWeight: '900', color: isFever ? '#00FF88' : '#fff', lineHeight: '1', transition: '0.3s', textShadow: isFever ? '0 0 50px #00FF88' : 'none' }}>
            {score}
        </div>
        <div style={{ color: isFever ? '#00FF88' : '#0052FF', fontSize: '1.5rem', fontWeight: 'bold', marginTop: '10px' }}>
            {isFever ? "🔥 FEVER MODE 2X 🔥" : isPlaying ? `${timeLeft}s` : status}
        </div>
      </div>

      {/* TAP BUTTON */}
      <div 
        onClick={handleTap}
        style={{
          width: '240px', height: '240px', borderRadius: '50%',
          background: isFever ? 'radial-gradient(circle, #00FF8822 0%, #000 100%)' : 'radial-gradient(circle, #0052FF22 0%, #000 100%)',
          border: `6px solid ${isFever ? '#00FF88' : isPlaying ? '#0052FF' : '#111'}`,
          margin: '30px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', userSelect: 'none', touchAction: 'none', transition: '0.2s'
        }}
      >
        {!isPlaying && isConnected && (
            <button onClick={() => { initAudio(); canPlayFree ? startGame() : sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) }).then(startGame); }} 
                    style={{ background: '#0052FF', border: 'none', color: '#fff', fontWeight: 'bold', padding: '15px 30px', borderRadius: '12px', cursor: 'pointer' }}>
                {canPlayFree ? 'START FREE' : `RETRY (0.0001 ETH)`}
            </button>
        )}
      </div>

      {/* LEADERBOARD WITH NAMES */}
      <div style={{ width: '100%', maxWidth: '400px', background: '#050505', padding: '20px', borderRadius: '24px', border: '1px solid #111', marginBottom: '40px' }}>
        <div style={{ fontSize: '0.6rem', color: '#333', textAlign: 'center', marginBottom: '20px', letterSpacing: '4px' }}>TOP RUSHERS</div>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ color: '#444', fontSize: '0.8rem' }}>{i + 1}</span>
                <Avatar address={entry.player_id} className="w-5 h-5 rounded-full" />
                <Name address={entry.player_id} className="text-white text-sm" />
            </div>
            <span style={{ fontWeight: 'bold', color: i === 0 ? '#00FF88' : '#fff' }}>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
