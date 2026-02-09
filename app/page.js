"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

// Connect to Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BaseRush() {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("READY?");
  const [leaderboard, setLeaderboard] = useState([]);
  const startTime = useRef(null);

  const pulseRate = 60000 / 128; // 128 BPM

  // Load Leaderboard on start
  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    const { data } = await supabase
      .from('rounds')
      .select('score, player_id')
      .order('score', { ascending: false })
      .limit(5);
    setLeaderboard(data || []);
  }

  const handleTap = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      startTime.current = Date.now();
      setScore(0);
      setStatus("GO!");
      return;
    }

    const tapTime = Date.now() - startTime.current;
    const beatOffset = tapTime % pulseRate;
    const accuracy = Math.abs(beatOffset - pulseRate / 2);

    if (accuracy < 45) {
      setScore(s => s + 100);
      setStatus("PERFECT!");
    } else if (accuracy < 90) {
      setScore(s => s + 50);
      setStatus("GREAT");
    } else {
      setStatus("LATE!");
    }

    // End game after 20 seconds
    if (tapTime > 20000) {
      endGame();
    }
  };

  async function endGame() {
    setIsPlaying(false);
    setStatus("SAVING SCORE...");
    
    // For now, we use a "Guest" ID. Later we will add Wallet login.
    const guestId = "Guest_" + Math.floor(Math.random() * 1000);

    const { error } = await supabase
      .from('rounds')
      .insert([{ player_id: guestId, score: score }]);

    if (error) {
      console.log(error);
      setStatus("ERROR SAVING");
    } else {
      setStatus("SCORE SAVED!");
      fetchLeaderboard();
    }
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0052FF', fontSize: '3rem', margin: '20px 0' }}>BASERUSH</h1>
      
      <div onClick={handleTap} style={{ textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
        <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{score}</div>
        <div style={{ color: '#0052FF', height: '40px', fontWeight: 'bold', fontSize: '1.5rem' }}>{status}</div>
        
        <div style={{
          width: '180px', height: '180px', borderRadius: '50%',
          border: '10px solid #0052FF', margin: '30px auto',
          animation: isPlaying ? 'pulse 0.468s infinite' : 'none'
        }} />
      </div>

      <div style={{ marginTop: '40px', width: '300px', backgroundColor: '#111', padding: '20px', borderRadius: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#0052FF' }}>TOP PLAYERS</h3>
        {leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #222' }}>
            <span>{entry.player_id}</span>
            <span style={{ fontWeight: 'bold' }}>{entry.score}</span>
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 20px #0052FF; }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
