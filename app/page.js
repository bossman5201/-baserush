
"use client";
import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function BaseRush() {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("READY?");
  const [timeLeft, setTimeLeft] = useState(10); // Shortened to 10 seconds for testing
  const [leaderboard, setLeaderboard] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  async function fetchLeaderboard() {
    const { data, error } = await supabase
      .from('rounds')
      .select('score, player_id')
      .order('score', { ascending: false })
      .limit(5);
    if (error) console.error("Leaderboard Error:", error);
    setLeaderboard(data || []);
  }

  const startGame = () => {
    setIsPlaying(true);
    setScore(0);
    setTimeLeft(10);
    setStatus("TAP!");
    
    // Automatic countdown timer
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

  // End game automatically when timer hits 0
  useEffect(() => {
    if (timeLeft === 0 && isPlaying) {
      endGame();
    }
  }, [timeLeft]);

  const handleTap = () => {
    if (!isPlaying) {
      startGame();
      return;
    }
    setScore(s => s + 100);
  };

  async function endGame() {
    setIsPlaying(false);
    setStatus("COMMUNICATING WITH DATABASE...");
    
    const guestId = "Tester_" + Math.floor(Math.random() * 100);

    const { error } = await supabase
      .from('rounds')
      .insert([{ player_id: guestId, score: score }]);

    if (error) {
      setStatus("DATABASE ERROR: " + error.message);
      console.error(error);
    } else {
      setStatus("SCORE SAVED!");
      fetchLeaderboard();
    }
  }

  return (
    <div style={{ backgroundColor: '#000', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#0052FF' }}>BASERUSH DEBUG</h1>
      
      <div onClick={handleTap} style={{ textAlign: 'center', cursor: 'pointer', padding: '40px' }}>
        <div style={{ fontSize: '1rem', color: '#aaa' }}>TIMER: {timeLeft}s</div>
        <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{score}</div>
        <div style={{ color: '#0052FF', fontWeight: 'bold' }}>{status}</div>
        
        <div style={{
          width: '150px', height: '150px', borderRadius: '50%',
          border: '10px solid #0052FF', margin: '20px auto',
          backgroundColor: isPlaying ? '#0052FF22' : 'transparent'
        }} />
      </div>

      <div style={{ marginTop: '20px', width: '300px', backgroundColor: '#111', padding: '20px', borderRadius: '15px' }}>
        <h3 style={{ margin: '0 0 10px 0', color: '#0052FF' }}>LEADERBOARD</h3>
        {leaderboard.length === 0 ? <p>Loading or No Scores...</p> : leaderboard.map((entry, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
            <span>{entry.player_id}</span>
            <span>{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
