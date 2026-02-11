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
  const [status, setStatus] = useState("SYSTEM READY");
  
  // Audio Refs
  const audioCtx = useRef(null);
  const masterGain = useRef(null);
  const timerRef = useRef(null);

  // Initialize Audio on the FIRST click
  const initAudio = () => {
    if (audioCtx.current) return;
    audioCtx.current = new (window.AudioContext || window.webkitAudioContext)();
    masterGain.current = audioCtx.current.createGain();
    masterGain.current.gain.value = 0;
    masterGain.current.connect(audioCtx.current.destination);
  };

  const playTapSound = () => {
    if (!audioCtx.current || !masterGain.current) return;
    if (audioCtx.current.state === 'suspended') audioCtx.current.resume();

    const osc = audioCtx.current.createOscillator();
    const g = audioCtx.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200 + (score % 300), audioCtx.current.currentTime);
    
    g.gain.setValueAtTime(0.1, audioCtx.current.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.current.currentTime + 0.05);
    
    osc.connect(g);
    g.connect(masterGain.current.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.05);
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

  const handleStartRequest = async () => {
    initAudio(); // Unlocks audio on button click
    if (!isConnected) return;
    if (canPlayFree) startGame();
    else handlePayment();
  };

  const handlePayment = async () => {
    setStatus("PAYING...");
    try {
      await sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) });
      startGame();
    } catch (err) { setStatus("CANCELED"); }
  };

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    setStatus("RUSHING!");
    if (timerRef.current) clearInterval(timerRef.current);
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
    playTapSound();
    setScore(s => s + 1);
  };

  async function endGame() {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    fetchLeaderboard();
    checkFreeChance();
  }

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace' }}>
      
      {/* CLEAN HEADER - NO WHITE BOXES */}
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '900', color: '#0052FF' }}>BASERUSH</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {!isConnected ? (
            <ConnectWallet className="bg-[#0052FF] text-white rounded-lg px-4 py-2 font-bold border-none" />
          ) : (
            <div style={{ background: '#111', padding: '5px 15px', borderRadius: '12px', border: '1px solid #222', display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', marginRight: '10px' }}>{address.slice(0,6)}...</span>
              <button onClick={() => disconnect()} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer', fontWeight: 'bold' }}>[EXIT]</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '40px' }}>
        <div style={{ fontSize: '9rem', fontWeight: '900', color: '#fff', lineHeight: '0.8' }}>{score}</div>
        <div style={{ color: '#0052FF', fontSize: '1.2rem', fontWeight: 'bold', marginTop: '20px' }}>
            {isPlaying ? `${timeLeft}s` : status}
        </div>
      </div>

      <div 
        onPointerDown={handleTap}
        style={{
          width: '260px', height: '260px', borderRadius: '50%',
          background: isPlaying ? 'radial-gradient(circle, #0052FF33 0%, #000 100%)' : '#050505',
          border: `6px solid ${isPlaying ? '#0052FF' : '#111'}`,
          margin: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', userSelect: 'none', touchAction: 'none'
        }}
      >
        {!isPlaying && isConnected && (
            <button onClick={handleStartRequest} style={{ background: '#0052FF', border: 'none', color: '#fff', fontWeight: 'bold', padding: '20px 40px', borderRadius: '15px', cursor: 'pointer', fontSize: '1.2rem' }}>
                {canPlayFree ? 'START FREE' : `RETRY (0.0001 ETH)`}
            </button>
        )}
        {isPlaying && <div style={{ fontSize: '2rem', fontWeight: '900', color: '#0052FF', opacity: 0.3 }}>TAP!</div>}
      </div>

      <div style={{ width: '100%', maxWidth: '400px', background: '#050505', padding: '25px', borderRadius: '24px', border: '1px solid #111' }}>
        <div style={{ fontSize: '0.6rem', color: '#333', textAlign: 'center', marginBottom: '20px', letterSpacing: '4px' }}>TOP RUSHERS</div>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111' }}>
            <span style={{ color: i === 0 ? '#00FF88' : '#555', fontSize: '0.8rem' }}>{i + 1}. {entry.player_id.slice(0,10)}</span>
            <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
