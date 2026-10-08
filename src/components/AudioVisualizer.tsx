import React, { useEffect, useRef, useState } from 'react';

interface AudioVisualizerProps {
  analyser: AnalyserNode | null;
  isRecording: boolean;
  recordingSeconds: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  analyser,
  isRecording,
  recordingSeconds,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [peakDb, setPeakDb] = useState<number>(-60);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !analyser || !isRecording) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const freqData = new Uint8Array(bufferLength);
    const timeData = new Uint8Array(bufferLength);

    const render = () => {
      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      // Compute peak level
      let maxVal = 0;
      for (let i = 0; i < bufferLength; i++) {
        if (freqData[i] > maxVal) maxVal = freqData[i];
      }
      const db = maxVal > 0 ? Math.round(20 * Math.log10(maxVal / 255)) : -60;
      setPeakDb(db);

      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark ambient gradient
      ctx.fillStyle = '#0b140e';
      ctx.fillRect(0, 0, width, height);

      // Grid background markings (bioacoustic frequency lines)
      ctx.strokeStyle = '#14271a';
      ctx.lineWidth = 1;
      const gridLines = 4;
      for (let i = 1; i < gridLines; i++) {
        const y = (height / gridLines) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw real-time frequency bars
      const numBars = 48;
      const barWidth = (width / numBars) - 2;
      const step = Math.floor(bufferLength / numBars);

      for (let i = 0; i < numBars; i++) {
        const value = freqData[i * step] || 0;
        const percent = value / 255;
        const barHeight = Math.max(4, percent * (height - 16));
        const x = i * (barWidth + 2);
        const y = height - barHeight;

        // Dynamic bioacoustic gradient: emerald to vibrant mint
        const grad = ctx.createLinearGradient(0, height, 0, y);
        grad.addColorStop(0, '#065f46');
        grad.addColorStop(0.6, '#10b981');
        grad.addColorStop(1, '#6ee7b7');

        ctx.fillStyle = grad;
        ctx.fillRect(x, y, barWidth, barHeight);
      }

      // Draw subtle time-domain waveform overlay on top
      ctx.strokeStyle = 'rgba(167, 243, 208, 0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = timeData[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        x += sliceWidth;
      }
      ctx.stroke();

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [analyser, isRecording]);

  return (
    <div className="w-full space-y-2">
      <div className="relative overflow-hidden rounded-xl border border-[#1f3826] bg-[#0b140e] shadow-inner">
        <canvas
          ref={canvasRef}
          width={720}
          height={160}
          className="h-32 w-full object-cover sm:h-40"
        />

        {/* Live status indicators */}
        <div className="absolute top-2.5 left-3 flex items-center gap-2 text-xs font-mono text-[#8ca393]">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
          <span className="text-red-400 font-semibold tracking-wider">LIVE RECORDING</span>
          <span aria-hidden="true">·</span>
          <span>{recordingSeconds.toFixed(1)}s</span>
        </div>

        {/* Audio peak level readout */}
        <div className="absolute top-2.5 right-3 flex items-center gap-1.5 text-[11px] font-mono text-[#8ca393]">
          <span>PEAK:</span>
          <span className={peakDb > -6 ? 'text-amber-400 font-bold' : 'text-[#10b981]'}>
            {peakDb > -60 ? `${peakDb} dB` : '-inf'}
          </span>
        </div>

        {/* Bioacoustic spectrum frequency guidelines */}
        <div className="absolute bottom-1.5 right-3 flex items-center gap-2 text-[10px] font-mono text-[#52705b]">
          <span>0 kHz</span>
          <span>·</span>
          <span>4 kHz</span>
          <span>·</span>
          <span>8 kHz</span>
          <span>·</span>
          <span>12 kHz</span>
        </div>
      </div>
    </div>
  );
};
