"use client";
import React, { useState, useEffect, useRef } from 'react';

export default function BaseRush() {
  const [score, setScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [status, setStatus] = useState("READY?");
  const startTime = useRef(null);

  const pulseRate = 60000 / 128; // 128 BPM

  const handleTap = () => {
    if (!isPlaying) {
      setIsPlaying(true);
      startTime.current = Date.now();
      setScore(0);
      setStatus("TAP TO THE BEAT!");
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
  };

  return (
    <div onClick={handleTap} style={{ backgroundColor: '#000', color: '#fff', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', userSelect: 'none' }}>
      <h1 style={{ color: '#0052FF', fontSize: '3rem', margin: 0 }}>BASERUSH</h1>
      <div style={{ fontSize: '4rem', fontWeight: 'bold' }}>{score}</div>
      <div style={{ color: '#0052FF', height: '40px', fontWeight: 'bold' }}>{status}</div>
      
      <div style={{
        width: '200px', height: '200px', borderRadius: '50%',
        border: '10px solid #0052FF',
        marginTop: '40px',
        animation: isPlaying ? 'pulse 0.468s infinite' : 'none'
      }} />

      <style jsx global>{`
        @keyframes pulse {
          0% { transform: scale(1); box-shadow: 0 0 0 0px #0052FF; }
          50% { transform: scale(1.05); box-shadow: 0 0 30px 10px #0052FF33; }
          100% { transform: scale(1); box-shadow: 0 0 0 0px #0052FF; }
        }
      `}</style>
    </div>
  );
}
