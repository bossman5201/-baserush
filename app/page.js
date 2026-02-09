"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

// Initialize Database
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// CONFIGURATION
const RECIPIENT_ADDRESS = "0xbd14b65e9c6e767f02d1900894261735f5f48a57"; 
const RETRY_FEE = "0.0001"; // ETH on Base

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("CONNECT WALLET TO RUSH");
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef(null);

  // Load leaderboard and check daily status on start
  useEffect(() => {
    fetchLeaderboard();
    if (isConnected) checkFreeChance();
  }, [isConnected, address]);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('rounds')
      .select('score, player_id')
      .order('score', { ascending: false })
      .limit(10);
    setLeaderboard(data || []);
  }

  async function checkFreeChance() {
    const today = new Date().toISOString().split('T')[0];
    const { data } = await supabase
      .from('rounds')
      .select('id')
      .eq('player_id', address)
      .gte('created_at', today)
      .eq('is_paid', false);

    const hasUsedFree = data && data.length > 0;
    setCanPlayFree(!hasUsedFree);
    setStatus(hasUsedFree ? "DAILY FREE CHANCE USED" : "DAILY FREE CHANCE READY");
  }

  const handleStartRequest = async () => {
    if (!isConnected) return;
    if (canPlayFree) {
      startGame(false);
    } else {
      processPayment();
    }
  };

  const processPayment = async () => {
    setIsProcessing(true);
    setStatus("WAITING FOR PAYMENT...");
    try {
      const tx = await sendTransactionAsync({
        to: RECIPIENT_ADDRESS,
        value: parseEther(RETRY_FEE),
      });
      console.log("Tx Hash:", tx);
      setStatus("PAYMENT SUCCESS!");
      setTimeout(() => startGame(true), 1500);
    } catch (err) {
      console.error(err);
      setStatus("PAYMENT CANCELED");
      setIsProcessing(false);
    }
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setIsProcessing(false);
    setScore(0);
    setTimeLeft(120);
    setStatus(isPaidRound ? "PAID RETRY ACTIVE" : "FREE DAILY ATTEMPT");

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTap = (e) => {
    e.preventDefault();
    if (!isPlaying) return;
    
    // Haptic feedback for mobile users
    if (window.navigator.vibrate) window.navigator.vibrate(10);
    
    setScore(s => s + 1);
  };

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) endGame();
  }, [timeLeft]);

  async function endGame() {
    setIsPlaying(false);
    setStatus("ANCHORING SCORE...");
    
    const isPaidRound = !canPlayFree;

    await supabase.from('rounds').insert([{ 
      player_id: address, 
      score: score,
      is_paid: isPaidRound 
    }]);

    setStatus("FINAL SCORE: " + score);
    fetchLeaderboard();
    checkFreeChance();
  }

  return (
    <div style={{ 
      backgroundColor: '#000', 
      color: '#fff', 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      fontFamily: 'monospace', 
      padding: '20px',
      backgroundImage: 'radial-gradient(circle at top, #0052FF15 0%, #000 60%)'
    }}>
      
      {/* HEADER / WALLET */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px' }}>
        <div style={{ color: '#0052FF', fontWeight: '900', fontSize: '1.2rem', letterSpacing: '2px' }}>BASERUSH</div>
        <Wallet>
          <ConnectWallet className="bg-[#0052FF] rounded-full px-4 py-2">
            <span className="text-white text-sm font-bold">Account</span>
          </ConnectWallet>
          <WalletDropdown><WalletDropdownDisconnect /></WalletDropdown>
        </Wallet>
      </div>

      {/* GAME AREA */}
      {!isPlaying ? (
        <div style={{ 
          textAlign: 'center', 
          background: 'linear-gradient(180deg, #0A0A0A 0%, #000 100%)', 
          padding: '40px 20px', 
          borderRadius: '30px', 
          border: '1px solid #1a1a1a', 
          width: '100%', 
          maxWidth: '380px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.8)'
        }}>
          <div style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '3px', marginBottom: '10px' }}>CURRENT SESSION</div>
          <div style={{ color: canPlayFree ? '#00FF88' : '#0052FF', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '30px', textTransform: 'uppercase' }}>
            {status}
          </div>
          
          <div style={{ fontSize: '0.8rem', color: '#888', marginBottom: '30px', lineHeight: '1.5' }}>
            120 SECONDS TO TAP AS FAST AS YOU CAN.<br/>TOP RANKINGS WIN GLORY.
          </div>

          <button 
            disabled={isProcessing || !isConnected}
            onClick={handleStartRequest}
            style={{
              width: '100%', 
              padding: '20px', 
              fontSize: '1.1rem', 
              borderRadius: '16px', 
              border: 'none',
              backgroundColor: !isConnected ? '#111' : '#0052FF', 
              color: '#fff', 
              cursor: isConnected ? 'pointer' : 'not-allowed',
              fontWeight: '900',
              boxShadow: isConnected ? '0 10px 30px rgba(0,82,255,0.3)' : 'none',
              transition: 'all 0.2s'
            }}
          >
            {!isConnected ? 'CONNECT WALLET' : isProcessing ? 'PROCESSING...' : canPlayFree ? 'START FREE ATTEMPT' : `RETRY FOR ${RETRY_FEE} ETH`}
          </button>
        </div>
      ) : (
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div style={{ fontSize: '1.5rem', color: timeLeft < 10 ? '#FF3B30' : '#0052FF', fontWeight: 'bold', letterSpacing: '2px' }}>
            {timeLeft}s
          </div>
          <div style={{ fontSize: '10rem', fontWeight: '900', lineHeight: '1', margin: '10px 0', color: '#fff' }}>
            {score}
          </div>
          
          <div 
            onPointerDown={handleTap}
            style={{
              width: '280px', 
              height: '280px', 
              borderRadius: '50%',
              background: 'radial-gradient(circle, #0052FF 0%, #002B85 100%)',
              margin: '30px auto', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              fontSize: '3rem', 
              fontWeight: '900', 
              cursor: 'pointer',
              boxShadow: '0 0 80px rgba(0,82,255,0.4)', 
              border: '10px solid rgba(255,255,255,0.1)',
              userSelect: 'none',
              touchAction: 'manipulation'
            }}
          >
            TAP!
          </div>
        </div>
      )}

      {/* LEADERBOARD */}
      <div style={{ marginTop: '50px', width: '100%', maxWidth: '380px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
          <span style={{ fontSize: '0.7rem', color: '#444', letterSpacing: '2px' }}>GLOBAL RANKINGS</span>
          <span style={{ fontSize: '0.6rem', color: '#0052FF' }}>BASE MAINNET</span>
        </div>
        
        <div style={{ backgroundColor: '#050505', borderRadius: '20px', border: '1px solid #111', overflow: 'hidden' }}>
          {leaderboard.length === 0 ? (
             <div style={{ padding: '20px', textAlign: 'center', color: '#333', fontSize: '0.8rem' }}>NO RUSHERS YET</div>
          ) : leaderboard.map((entry, i) => (
            <div key={i} style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              padding: '15px 20px', 
              borderBottom: i === leaderboard.length - 1 ? 'none' : '1px solid #111',
              backgroundColor: entry.player_id === address ? '#0052FF11' : 'transparent'
            }}>
              <span style={{ color: i === 0 ? '#00FF88' : '#666', fontSize: '0.9rem' }}>
                {i + 1}. {entry.player_id.slice(0,6)}...{entry.player_id.slice(-4)}
              </span>
              <span style={{ fontWeight: 'bold', color: '#fff' }}>{entry.score}</span>
            </div>
          ))}
        </div>
      </div>

      <p style={{ marginTop: '40px', fontSize: '0.6rem', color: '#222', letterSpacing: '1px' }}>
        BUILT ON BASE / ONCHAINKIT SECURED
      </p>
    </div>
  );
}
