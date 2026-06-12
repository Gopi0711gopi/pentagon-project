'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export default function useSpeechSynthesis() {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState([]);
    const synthRef = useRef(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            synthRef.current = window.speechSynthesis;

            const loadVoices = () => {
                setVoices(window.speechSynthesis.getVoices());
            };

            loadVoices();
            if (window.speechSynthesis.onvoiceschanged !== undefined) {
                window.speechSynthesis.onvoiceschanged = loadVoices;
            }
        }
    }, []);

    const speak = useCallback((text, voiceName = null) => {
        if (!synthRef.current) return;

        // Cancel any existing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Select voice - prefer a good English voice
        const preferredVoice = voices.find(v =>
            (voiceName && v.name === voiceName) ||
            v.name.includes('Google US English') ||
            v.name.includes('Samantha') ||
            v.lang === 'en-US'
        );

        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthRef.current.speak(utterance);
    }, [voices]);

    const cancel = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
    }, []);

    return { isSpeaking, speak, cancel, hasSupport: !!synthRef.current };
}
