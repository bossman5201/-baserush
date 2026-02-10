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
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef(null);

  // --- AUDIO SYNTH (NO FILES NEEDED) ---
  const playSound = (freq, type, duration) => {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
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
    if (!isConnected) return;
    if (canPlayFree) startGame(false);
    else handlePayment();
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    try {
      await sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) });
      playSound(880, 'sine', 0.5); // Success chime
      startGame(true);
    } catch (err) {
      setIsProcessing(false);
    }
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    playSound(440, 'square', 0.2); // Start beep
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
    playSound(150 + (score % 500), 'sine', 0.05); // Pitch increases slightly as you score
    setScore(s => s + 1);
  };

  async function endGame() {
    setIsPlaying(false);
    playSound(220, 'sawtooth', 0.5); // Game over sound
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    fetchLeaderboard();
    checkFreeChance();
  }

  // --- VIRAL SHARING FUNCTION ---
  const shareToFarcaster = () => {
    const text = `I just RUSHED ${score} taps in 120 seconds on BaseRush! 🚀\n\nCan you beat my score on @base?`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank');
  };

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace' }}>
      
      {/* HEADER */}
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '900', color: '#0052FF', fontSize: '1.2rem', letterSpacing: '2px' }}>BASERUSH</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          {!isConnected ? (
            <ConnectWallet className="bg-[#0052FF] text-white rounded-lg px-4 py-2" />
          ) : (
            <div style={{ background: '#111', padding: '5px 15px', borderRadius: '12px', border: '1px solid #222' }}>
              <span style={{ fontSize: '0.8rem' }}>{address.slice(0,6)}...</span>
              <button onClick={() => disconnect()} style={{ background: 'none', border: 'none', color: '#ff4444', fontSize: '0.7rem', cursor: 'pointer', marginLeft: '10px' }}>[EXIT]</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '20px', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* SCORE BOARD */}
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '5px' }}>TAPS_SYNCED</div>
            <div style={{ fontSize: '9rem', fontWeight: '900', color: '#fff', margin: '10px 0', lineHeight: '0.8' }}>{score}</div>
            <div style={{ color: '#0052FF', fontSize: '1rem', fontWeight: 'bold' }}>
                {isPlaying ? `${timeLeft}s` : status}
            </div>
        </div>

        {/* INTERACTION AREA */}
        <div 
          onPointerDown={handleTap}
          style={{
            width: '260px', height: '260px', borderRadius: '50%',
            background: isPlaying ? 'radial-gradient(circle, #0052FF22 0%, #000 100%)' : '#050505',
            border: `4px solid ${isPlaying ? '#0052FF' : '#111'}`,
            margin: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.1s', userSelect: 'none', touchAction: 'none'
          }}
        >
          {!isPlaying && isConnected && (
            <>
              <button onClick={handleStartRequest} style={{ background: '#0052FF', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '15px 30px', borderRadius: '12px', cursor: 'pointer', marginBottom: '10px' }}>
                 {canPlayFree ? 'START FREE' : 'PAY TO RETRY'}
              </button>
              {!canPlayFree && score > 0 && (
                <button onClick={shareToFarcaster} style={{ background: '#7C65C1', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', padding: '8px 15px', borderRadius: '8px', cursor: 'pointer' }}>
                  SHARE TO FARCASTER
                </button>
              )}
            </>
          )}
        </div>

        {/* RANKINGS */}
        <div style={{ width: '100%', background: '#050505', borderRadius: '24px', padding: '25px', border: '1px solid #111' }}>
          <div style={{ fontSize: '0.6rem', color: '#333', marginBottom: '20px', textAlign: 'center', letterSpacing: '4px' }}>TOP_RUSHERS</div>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111' }}>
              <span style={{ color: i === 0 ? '#00FF88' : '#555', fontSize: '0.8rem' }}>
                {i + 1}. {entry.player_id.slice(0,12)}
              </span>
              <span style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{entry.score}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
