"use client";
import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { useAccount, useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// 🚨 PASTE YOUR WALLET ADDRESS BELOW 🚨
const RECIPIENT_ADDRESS =0xbd14b65e9c6e767f02d1900894261735f5f48a57 "; 
const RETRY_FEE = "0.0001"; // Amount in ETH (approx $0.25)

export default function BaseRush() {
  const { address, isConnected } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120);
  const [canPlayFree, setCanPlayFree] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [status, setStatus] = useState("READY TO RUSH?");
  const [isProcessing, setIsProcessing] = useState(false);

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
    if (data && data.length > 0) {
      setCanPlayFree(false);
      setStatus("FREE CHANCE USED");
    } else {
      setCanPlayFree(true);
      setStatus("FREE DAILY CHANCE READY");
    }
  }

  const handleStartRequest = async () => {
    if (!isConnected) return alert("Connect Wallet First!");
    
    if (canPlayFree) {
      startGame(false);
    } else {
      handlePayment();
    }
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    setStatus("WAITING FOR PAYMENT...");
    try {
      // This pops up the wallet to pay the fee
      const tx = await sendTransactionAsync({
        to: RECIPIENT_ADDRESS,
        value: parseEther(RETRY_FEE),
      });
      
      console.log("Transaction Sent:", tx);
      setStatus("PAYMENT SUCCESS! GET READY...");
      setTimeout(() => startGame(true), 2000); // Start paid game
    } catch (err) {
      console.error(err);
      setStatus("PAYMENT FAILED OR CANCELED");
    } finally {
      setIsProcessing(false);
    }
  };

  const startGame = (isPaidRound) => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(120);
    setStatus(isPaidRound ? "PAID RETRY - GO!" : "FREE CHANCE - GO!");

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

  async function endGame() {
    setIsPlaying(false);
    setStatus("SAVING SCORE...");
    
    // Check if this was a paid round
    const isPaidRound = !canPlayFree;

    await supabase.from('rounds').insert([{ 
      player_id: address, 
      score: score,
      is_paid: isPaidRound 
    }]);

    setStatus("FINAL SCORE: " + score);
    checkFreeChance();
    fetchLeaderboard();
  }

  useEffect(() => {
    if (timeLeft === 0 && isPlaying) endGame();
  }, [timeLeft]);

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'sans-serif', padding: '20px' }}>
      
      <div style={{ alignSelf: 'flex-end' }}>
        <Wallet>
          <ConnectWallet><span className="text-white">Sign In</span></ConnectWallet>
          <WalletDropdown><WalletDropdownDisconnect /></WalletDropdown>
        </Wallet>
      </div>

      <h1 style={{ color: '#0052FF', fontSize: '3.5rem', margin: '20px 0', fontWeight: '900' }}>BASERUSH</h1>
      
      <div style={{ textAlign: 'center', width: '100%' }}>
        <div style={{ fontSize: '1.5rem', color: timeLeft < 10 ? '#FF3B30' : '#888' }}>
          {isPlaying ? `TIME LEFT: ${timeLeft}s` : '120 SECOND CHALLENGE'}
        </div>
        
        <div style={{ fontSize: '8rem', fontWeight: '900', margin: '10px 0', lineHeight: 1 }}>{score}</div>
        <div style={{ color: '#0052FF', fontWeight: 'bold', marginBottom: '30px', letterSpacing: '1px' }}>{status}</div>

        {!isPlaying ? (
          <button 
            disabled={isProcessing}
            onClick={handleStartRequest}
            style={{
              padding: '25px 50px', fontSize: '1.2rem', borderRadius: '15px', border: 'none',
              backgroundColor: isProcessing ? '#333' : '#0052FF', color: '#fff', cursor: 'pointer',
              fontWeight: 'bold', transition: 'transform 0.2s'
            }}
          >
            {isProcessing ? 'PROCESSING...' : canPlayFree ? 'PLAY FREE CHANCE' : `RETRY FOR ${RETRY_FEE} ETH`}
          </button>
        ) : (
          <div 
            onPointerDown={handleTap}
            style={{
              width: '280px', height: '280px', borderRadius: '50%',
              backgroundColor: '#0052FF', margin: '0 auto',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '3rem', fontWeight: '900', userSelect: 'none',
              cursor: 'pointer', boxShadow: '0 0 50px rgba(0,82,255,0.5)',
              active: { transform: 'scale(0.95)' }
            }}
          >
            TAP!
          </div>
        )}
      </div>

      <div style={{ marginTop: '50px', width: '100%', maxWidth: '400px', backgroundColor: '#111', padding: '25px', borderRadius: '25px', border: '1px solid #222' }}>
        <h3 style={{ textAlign: 'center', color: '#0052FF', marginTop: 0, fontSize: '0.8rem', letterSpacing: '2px' }}>TOP RUSHERS</h3>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #222' }}>
            <span style={{ color: '#666', fontFamily: 'monospace' }}>{entry.player_id.slice(0,6)}...</span>
            <span style={{ fontWeight: 'bold' }}>{entry.score} TAPS</span>
          </div>
        ))}
      </div>
    </div>
  );
}
