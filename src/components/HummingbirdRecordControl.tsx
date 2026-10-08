import React, { useState, useEffect, useRef } from 'react';
import { Volume2, RefreshCw, X } from 'lucide-react';
import { DitherVeil } from './DitherVeil';

interface HummingbirdRecordControlProps {
  isRecording: boolean;
  recordingSeconds: number;
  analyser: AnalyserNode | null;
  isAnalyzing: boolean;
  onStartRecording: () => void;
  onStopRecording: () => void;
  onCancelRecording: () => void;
}

interface Particle {
  id: number;
  angle: number;
  dist: number;
  baseDist: number;
  speed: number;
  size: number;
  alpha: number;
}

export const HummingbirdRecordControl: React.FC<HummingbirdRecordControlProps> = ({
  isRecording,
  recordingSeconds,
  analyser,
  isAnalyzing,
  onStartRecording,
  onStopRecording,
  onCancelRecording,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0 to 1
  const [peakDb, setPeakDb] = useState(-60);

  // Smooth audio amplitude tracker
  const smoothAmpRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  // Audio-reactive visual particle ring
  const particlesRef = useRef<Particle[]>(
    Array.from({ length: 18 }, (_, i) => ({
      id: i,
      angle: (i / 18) * Math.PI * 2,
      baseDist: 110 + (i % 3) * 20,
      dist: 110 + (i % 3) * 20,
      speed: 0.008 + (i % 4) * 0.003,
      size: 2 + (i % 3) * 1.5,
      alpha: 0.3 + (i % 3) * 0.25,
    }))
  );

  // Check prefers-reduced-motion
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener('change', listener);
      return () => mq.removeEventListener('change', listener);
    }
  }, []);

  // Web Audio API analysis loop during recording
  useEffect(() => {
    if (!isRecording || !analyser) {
      setAudioLevel(0);
      setPeakDb(-60);
      smoothAmpRef.current = 0;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const timeData = new Uint8Array(bufferLength);
    const freqData = new Uint8Array(bufferLength);

    const updateAudio = () => {
      analyser.getByteTimeDomainData(timeData);
      analyser.getByteFrequencyData(freqData);

      // Compute RMS amplitude
      let sumSquares = 0;
      let peak = 0;
      for (let i = 0; i < bufferLength; i++) {
        const val = (timeData[i] - 128) / 128;
        sumSquares += val * val;
        if (freqData[i] > peak) peak = freqData[i];
      }
      const rms = Math.sqrt(sumSquares / bufferLength);

      // Compute instant decibels
      const db = peak > 0 ? Math.round(20 * Math.log10(peak / 255)) : -60;
      setPeakDb(db);

      // Normalized amplitude (amplified for visual bioacoustic responsiveness)
      const instantAmp = Math.min(1, Math.max(0, rms * 4.5));
      smoothAmpRef.current += (instantAmp - smoothAmpRef.current) * 0.35;
      setAudioLevel(smoothAmpRef.current);

      animFrameRef.current = requestAnimationFrame(updateAudio);
    };

    updateAudio();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isRecording, analyser]);

  // Handle primary click / tap on hummingbird
  const handleBirdClick = () => {
    if (isAnalyzing) return;
    if (isRecording) {
      onStopRecording();
    } else {
      onStartRecording();
    }
  };

  // Keyboard accessibility (Space / Enter)
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleBirdClick();
    }
  };

  // Format timer as MM:SS
  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = Math.floor(totalSeconds % 60);
    const frac = Math.floor((totalSeconds % 1) * 10);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${frac}`;
  };

  // Compute dynamic scale and glow based on state and audio level
  const baseScale = isHovered ? 1.03 : 1.0;
  const audioScale = isRecording ? 1.0 + audioLevel * 0.08 : 1.0;
  const currentScale = prefersReducedMotion ? 1.0 : baseScale * audioScale;

  const glowOpacity = isRecording
    ? 0.55 + audioLevel * 0.45
    : isAnalyzing
    ? 0.7
    : isHovered
    ? 0.4
    : 0.15;

  return (
    <div className="relative flex flex-col items-center justify-center py-4 sm:py-6 select-none">
      {/* Background Bioacoustic Radial Sound Waves when recording */}
      {isRecording && !prefersReducedMotion && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
          {/* Concentric sound wave pulses expanding with audio volume */}
          <div
            className="absolute rounded-full border border-[#10b981]/40 transition-all duration-75"
            style={{
              width: `${240 + audioLevel * 140}px`,
              height: `${240 + audioLevel * 140}px`,
              opacity: 0.35 + audioLevel * 0.5,
              transform: `scale(${1 + audioLevel * 0.15})`,
              boxShadow: `0 0 ${20 + audioLevel * 40}px rgba(16, 185, 129, ${0.25 + audioLevel * 0.5})`,
            }}
          />
          <div
            className="absolute rounded-full border border-[#34d399]/30 transition-all duration-100"
            style={{
              width: `${300 + audioLevel * 200}px`,
              height: `${300 + audioLevel * 200}px`,
              opacity: 0.2 + audioLevel * 0.4,
              transform: `scale(${1 + audioLevel * 0.2})`,
            }}
          />
          <div
            className="absolute rounded-full border border-dashed border-[#6ee7b7]/20 animate-spin"
            style={{
              width: `${360 + audioLevel * 160}px`,
              height: `${360 + audioLevel * 160}px`,
              animationDuration: '30s',
              opacity: 0.25 + audioLevel * 0.35,
            }}
          />

          {/* Surrounding particle aura responding to amplitude */}
          {particlesRef.current.map((p) => {
            const currentDist = p.baseDist + audioLevel * 60;
            const x = Math.cos(p.angle) * currentDist;
            const y = Math.sin(p.angle) * currentDist;
            const pAlpha = Math.min(1, p.alpha + audioLevel * 0.5);
            return (
              <span
                key={p.id}
                className="absolute rounded-full bg-[#6ee7b7] transition-transform duration-75"
                style={{
                  width: `${p.size + audioLevel * 2}px`,
                  height: `${p.size + audioLevel * 2}px`,
                  transform: `translate(${x}px, ${y}px)`,
                  opacity: pAlpha,
                  boxShadow: '0 0 6px #10b981',
                }}
              />
            );
          })}
        </div>
      )}

      {/* Analyzing state scanning radar ring */}
      {isAnalyzing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="absolute h-64 w-64 rounded-full border border-[#10b981]/30 animate-ping opacity-30" />
          <div className="absolute h-56 w-56 rounded-full border border-t-[#34d399] border-r-transparent border-b-[#10b981]/20 border-l-transparent animate-spin duration-1000" />
          <div className="absolute h-72 w-72 rounded-full bg-radial from-[#10b981]/15 via-transparent to-transparent animate-pulse" />
        </div>
      )}

      {/* Bioluminescent aura behind hummingbird */}
      <div
        className="absolute w-60 h-60 sm:w-80 sm:h-80 rounded-full blur-3xl pointer-events-none transition-all duration-300"
        style={{
          background: isRecording
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.45) 0%, rgba(6, 78, 59, 0.25) 50%, transparent 75%)'
            : isAnalyzing
            ? 'radial-gradient(circle, rgba(52, 211, 153, 0.5) 0%, rgba(16, 185, 129, 0.2) 50%, transparent 75%)'
            : isHovered
            ? 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, rgba(6, 78, 59, 0.15) 55%, transparent 75%)'
            : 'radial-gradient(circle, rgba(16, 185, 129, 0.12) 0%, transparent 70%)',
          opacity: glowOpacity,
        }}
        aria-hidden="true"
      />

      {/* PRIMARY INTERACTIVE CONTROL: THE HUMMINGBIRD */}
      <div
        role="button"
        tabIndex={0}
        aria-label={
          isRecording
            ? 'Stop recording bird sound'
            : isAnalyzing
            ? 'Analyzing bird sound'
            : 'Start bird recording'
        }
        aria-pressed={isRecording}
        onClick={handleBirdClick}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`group relative z-10 flex flex-col items-center cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-[#10b981] focus-visible:ring-offset-4 focus-visible:ring-offset-[#0c140f] rounded-3xl p-3 transition-transform duration-300 ${
          isAnalyzing ? 'cursor-wait' : ''
        }`}
      >
        {/* Floating Hummingbird Container */}
        <div
          className={`relative transition-all duration-300 ease-out ${
            !prefersReducedMotion && !isRecording && !isAnalyzing ? 'animate-float' : ''
          }`}
          style={{
            transform: `scale(${currentScale}) translateY(${isHovered && !isRecording ? '-4px' : '0px'})`,
          }}
        >
          {!imageError ? (
            <div className="relative w-56 sm:w-72 md:w-80 max-w-full drop-shadow-[0_12px_24px_rgba(0,0,0,0.65)]">
              {/* DitherVeil wrapped Hummingbird */}
              <DitherVeil
                src="/hummingbird.webp"
                pattern="floyd"
                pixelSize={2}
                inkColor="#042313"
                paperColor="#6ee7b7"
                revealRadius={75}
                softness={0.6}
                linger={350}
                clickBurst={true}
                ditherRatio={isAnalyzing ? 0.35 : isRecording ? 0.08 : 0}
                audioLevel={audioLevel}
                interactive={!isRecording && !isAnalyzing}
                alt="Hummingbird hovering in flight"
                className="w-full h-auto"
              />

              {/* Bioacoustic scanning line in analyzing state */}
              {isAnalyzing && (
                <div
                  className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#6ee7b7] to-transparent shadow-[0_0_12px_#10b981] animate-pulse"
                  style={{
                    top: '45%',
                  }}
                />
              )}
            </div>
          ) : (
            /* Fallback Button if image fails to load */
            <div className="flex h-36 w-36 items-center justify-center rounded-full bg-[#14261b] border-2 border-[#10b981] shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <span className="text-sm font-semibold text-[#10b981]">
                {isRecording ? 'Listening...' : 'Tap to Record'}
              </span>
            </div>
          )}
        </div>

        {/* State Indicators & Dynamic Typography */}
        <div className="mt-4 flex flex-col items-center space-y-1 text-center">
          {isRecording ? (
            /* Recording State */
            <div className="space-y-1.5 animate-fade-in">
              <div className="flex items-center justify-center gap-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                </span>
                <span className="text-xs font-mono font-bold tracking-widest text-red-400 uppercase">
                  LISTENING...
                </span>
                <span className="text-xs text-[#52705b]">·</span>
                <span className="text-sm font-mono font-semibold text-[#f1f7f2]">
                  {formatTimer(recordingSeconds)}
                </span>
              </div>

              {/* Real-time amplitude and peak readout */}
              <div className="flex items-center justify-center gap-2 text-[11px] font-mono text-[#7e9985]">
                <Volume2 className="h-3 w-3 text-[#10b981] animate-pulse" />
                <span>
                  {peakDb > -60 ? `${peakDb} dB` : 'Ambient'}
                </span>
                <span className="text-[#3b5743]">·</span>
                <span className="text-[#a3bda9]">Tap bird to finish</span>
              </div>
            </div>
          ) : isAnalyzing ? (
            /* Analyzing State */
            <div className="space-y-1 animate-fade-in">
              <div className="flex items-center justify-center gap-2">
                <RefreshCw className="h-3.5 w-3.5 text-[#10b981] animate-spin" />
                <span className="text-xs font-mono font-bold tracking-widest text-[#10b981] uppercase">
                  ANALYZING VOCALIZATION...
                </span>
              </div>
              <p className="text-[11px] text-[#708c79]">
                Extracting acoustic harmonics · BirdNET Neural Model
              </p>
            </div>
          ) : (
            /* Idle State */
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-base sm:text-lg font-semibold tracking-tight text-[#f1f7f2] group-hover:text-[#34d399] transition-colors">
                  Tap the bird to listen
                </span>
              </div>
              <p className="text-xs text-[#769380] max-w-xs sm:max-w-sm">
                Point microphone toward the songbird · 3 to 10 seconds of clear call
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Optional Cancel action while recording */}
      {isRecording && (
        <div className="mt-3 flex items-center justify-center z-20">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onCancelRecording();
            }}
            className="flex items-center gap-1.5 rounded-lg border border-[#23442e]/80 bg-[#122017]/80 px-3 py-1.5 text-xs font-medium text-[#8ca393] hover:text-[#f1f7f2] hover:bg-[#1a2e21] transition-colors"
          >
            <X className="h-3.5 w-3.5" />
            <span>Cancel</span>
          </button>
        </div>
      )}
    </div>
  );
};

export default HummingbirdRecordControl;
