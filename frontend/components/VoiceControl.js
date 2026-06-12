'use client';

import { useEffect, useRef, useState } from 'react';
import useVoiceInput from '../hooks/useVoiceInput';
import useSpeechSynthesis from '../hooks/useSpeechSynthesis';

export default function VoiceControl({ onCommand, lastResponse }) {
    const [transcript, setTranscript] = useState('');
    const canvasRef = useRef(null);
    const animationRef = useRef(null);

    // Speak last response when it changes
    const { speak, isSpeaking, cancel } = useSpeechSynthesis();
    useEffect(() => {
        if (lastResponse) {
            // Strip markdown/code blocks for speech
            const cleanText = lastResponse.replace(/```[\s\S]*?```/g, 'Checking code blocks.').replace(/[*#_`]/g, '');
            speak(cleanText);
        }
    }, [lastResponse, speak]);

    // Handle voice input
    const { isListening, startListening, stopListening, hasSupport } = useVoiceInput((text, isFinal) => {
        setTranscript(text);
        if (isFinal) {
            onCommand(text); // Auto-submit on final result
            setTranscript('');
        }
    });

    // Audio Visualizer Animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');

        let phase = 0;
        const animate = () => {
            if (!isListening && !isSpeaking) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                cancelAnimationFrame(animationRef.current);
                return;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;
            const radius = 20;

            // Draw glowing core
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            ctx.fillStyle = isListening ? 'rgba(56, 189, 248, 0.8)' : 'rgba(74, 222, 128, 0.8)';
            ctx.shadowBlur = 15;
            ctx.shadowColor = isListening ? '#38bdf8' : '#4ade80';
            ctx.fill();

            // Draw waveform rings
            ctx.beginPath();
            ctx.strokeStyle = isListening ? 'rgba(56, 189, 248, 0.4)' : 'rgba(74, 222, 128, 0.4)';
            ctx.lineWidth = 2;

            // Animated rings
            const amplitude = isListening ? 10 : 15;
            const speed = isListening ? 0.1 : 0.05;
            phase += speed;

            for (let i = 0; i < 3; i++) {
                const r = radius + (Math.sin(phase + i) * amplitude) + (i * 10);
                ctx.beginPath();
                ctx.arc(centerX, centerY, Math.max(radius, r), 0, 2 * Math.PI);
                ctx.stroke();
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        if (isListening || isSpeaking) {
            animate();
        }

        return () => cancelAnimationFrame(animationRef.current);
    }, [isListening, isSpeaking]);

    if (!hasSupport) return null;

    return (
        <div className="voice-control" style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <canvas
                ref={canvasRef}
                width={80}
                height={80}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    zIndex: 0
                }}
            />

            <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`animate-icon-pop ${isListening ? 'listening' : ''}`}
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isListening ? '#38bdf8' : 'rgba(255, 255, 255, 0.1)',
                    color: isListening ? '#fff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '18px',
                    transition: 'all 0.3s ease',
                    zIndex: 1,
                    boxShadow: isListening ? '0 0 15px rgba(56, 189, 248, 0.5)' : 'none'
                }}
                title={isListening ? "Listening..." : "Voice Command"}
            >
                {isListening ? <span className="icon">🎙️</span> : <span className="icon">🎤</span>}
            </button>

            {/* Transcript Preview */}
            {isListening && transcript && (
                <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    whiteSpace: 'nowrap',
                    background: 'rgba(15, 23, 42, 0.9)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(56, 189, 248, 0.3)',
                    color: '#38bdf8',
                    fontSize: '14px',
                    pointerEvents: 'none',
                    animation: 'fade-in 0.2s ease-out'
                }}>
                    {transcript}
                </div>
            )}
        </div>
    );
}
