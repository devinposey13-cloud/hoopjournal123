import { useRef, useCallback } from 'react';

interface WebSpeechFallback {
  isSupported: boolean;
  start: () => void;
  stop: () => void;
  getTranscript: () => string;
  cleanup: () => void;
}

export function useWebSpeechFallback(): WebSpeechFallback {
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const transcriptRef = useRef<string>('');
  
  const SpeechRecognitionClass = typeof window !== 'undefined' 
    ? (window.SpeechRecognition || window.webkitSpeechRecognition) 
    : undefined;
  
  const isSupported = !!SpeechRecognitionClass;

  const start = useCallback(() => {
    if (!SpeechRecognitionClass) return;
    
    transcriptRef.current = '';
    
    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.maxAlternatives = 1;
      
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        
        // Store the best transcript available
        transcriptRef.current = finalTranscript || interimTranscript;
      };
      
      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        // Silently handle - this is a background fallback
        console.log('Web Speech fallback error (non-critical):', event.error);
      };
      
      recognition.onend = () => {
        // Recognition ended naturally, that's fine
      };
      
      recognition.start();
      recognitionRef.current = recognition;
    } catch (error) {
      console.log('Web Speech fallback failed to start (non-critical):', error);
    }
  }, [SpeechRecognitionClass]);

  const stop = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Already stopped
      }
    }
  }, []);

  const getTranscript = useCallback(() => {
    return transcriptRef.current.trim();
  }, []);

  const cleanup = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // Already cleaned up
      }
      recognitionRef.current = null;
    }
    transcriptRef.current = '';
  }, []);

  return { isSupported, start, stop, getTranscript, cleanup };
}
