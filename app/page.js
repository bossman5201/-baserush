"use client";
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  const [hasShared, setHasShared] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("SYSTEM ONLINE");
  const [isProcessing, setIsProcessing] = useState(false);
  const [particles, setParticles] = useState([]); // For the floating +1s
  
  const timerRef = useRef(null);
  const audioContextRef = useRef(null);

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
    
    // If they played once, but haven't used their "Social Bonus" yet, they might still play free
    if (data && data.length > 0 && !hasShared) {
      setCanPlayFree(false);
      setStatus("FREE CHANCE USED");
    } else {
      setCanPlayFree(true);
      setStatus("CHANCE READY");
    }
  }

  const playTapSound = () => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioContextRef.current.state === 'suspended') audioContextRef.current.resume();
    
    const osc = audioContextRef.current.createOscillator();
    const gain = audioContextRef.current.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200 + (score % 400), audioContextRef.current.currentTime);
    gain.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.1);
    osc.connect(gain);
    gain.connect(audioContextRef.current.destination);
    osc.start();
    osc.stop(audioContextRef.current.currentTime + 0.1);
  };

  const handleStartRequest = async () => {
    if (!isConnected) return;
    if (canPlayFree) startGame(false);
    else handlePayment();
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStatus("PAYING...");
    try {
      await sendTransactionAsync({ to: RECIPIENT_ADDRESS, value: parseEther(RETRY_FEE) });
      startGame(true);
    } catch (err) {
      setStatus("CANCELED");
      setIsProcessing(false);
    }
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    setParticles([]);
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

    // Create a floating particle
    const id = Date.now();
    const newParticle = { id, x: Math.random() * 100 - 50, y: 0 };
    setParticles(prev => [...prev, newParticle]);
    setTimeout(() => {
        setParticles(prev => prev.filter(p => p.id !== id));
    }, 800);
  };

  async function endGame() {
    setIsPlaying(false);
    if (timerRef.current) clearInterval(timerRef.current);
    await supabase.from('rounds').insert([{ player_id: address, score: score, is_paid: !canPlayFree }]);
    setHasShared(false); // Reset social bonus after use
    fetchLeaderboard();
    checkFreeChance();
  }

  const shareToFarcaster = () => {
    const text = `I just RUSHED ${score} taps on BaseRush! 🚀\n\nCan you beat me?`;
    const shareUrl = `https://warpcast.com/~/compose?text=${encodeURIComponent(text)}&embeds[]=${encodeURIComponent(window.location.href)}`;
    window.open(shareUrl, '_blank');
    
    // Give them a bonus round for sharing
    setHasShared(true);
    setCanPlayFree(true);
    setStatus("BONUS CHANCE UNLOCKED!");
  };

  useEffect(() => { if (timeLeft === 0 && isPlaying) endGame(); }, [timeLeft]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'monospace' }}>
      
      <div style={{ width: '100%', maxWidth: '800px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: '900', color: '#0052FF', fontSize: '1.2rem' }}>BASERUSH</div>
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
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <div style={{ fontSize: '7rem', fontWeight: '900', color: '#fff', margin: '10px 0', lineHeight: '0.8' }}>{score}</div>
            <div style={{ color: '#0052FF', fontSize: '1rem', fontWeight: 'bold' }}>
                {isPlaying ? `${timeLeft}s` : status}
            </div>
        </div>

        <div 
          onPointerDown={handleTap}
          style={{
            width: '240px', height: '240px', borderRadius: '50%',
            background: isPlaying ? 'radial-gradient(circle, #0052FF33 0%, #000 100%)' : '#050505',
            border: `4px solid ${isPlaying ? '#0052FF' : '#111'}`,
            margin: '40px 0', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all 0.1s', userSelect: 'none', touchAction: 'none',
            position: 'relative'
          }}
        >
          {/* FLOATING PARTICLES */}
          {particles.map(p => (
            <div key={p.id} className="particle" style={{ left: `calc(50% + ${p.x}px)` }}>+1</div>
          ))}

          {!isPlaying && isConnected && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={handleStartRequest} style={{ background: '#0052FF', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '1.1rem', padding: '15px 30px', borderRadius: '12px', cursor: 'pointer' }}>
                 {canPlayFree ? 'START' : `RETRY (${RETRY_FEE} ETH)`}
              </button>
              {!canPlayFree && (
                <button onClick={shareToFarcaster} style={{ background: '#7C65C1', border: 'none', color: '#fff', fontWeight: 'bold', fontSize: '0.8rem', padding: '10px', borderRadius: '8px', cursor: 'pointer' }}>
                  SHARE FOR 1 FREE CHANCE
                </button>
              )}
            </div>
          )}
        </div>

        <div style={{ width: '100%', background: '#050505', borderRadius: '24px', padding: '25px', border: '1px solid #111' }}>
          <div style={{ fontSize: '0.6rem', color: '#333', marginBottom: '20px', textAlign: 'center', letterSpacing: '4px' }}>TOP_RUSHERS</div>
          {leaderboard.map((entry, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111' }}>
              <span style={{ color: i === 0 ? '#00FF88' : '#555', fontSize: '0.8rem' }}>{i + 1}. {entry.player_id.slice(0,12)}</span>
              <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        .particle {
          position: absolute;
          color: #0052FF;
          font-weight: bold;
          animation: floatUp 0.8s forwards;
          pointer-events: none;
        }
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-100px); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
