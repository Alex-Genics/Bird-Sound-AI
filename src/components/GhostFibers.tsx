import React, { useEffect, useRef } from 'react';

export interface GhostFibersProps {
  /**
   * Number of fiber bundles across the canvas.
   * Default: 5
   */
  bundleCount?: number;
  /**
   * Strands per bundle.
   * Default: 7
   */
  strandsPerBundle?: number;
  /**
   * Global opacity factor (0 to 1).
   * Default: 0.65
   */
  opacity?: number;
  /**
   * Animation speed multiplier.
   * Default: 1.0
   */
  speed?: number;
  /**
   * Whether mouse proximity deflects fibers.
   * Default: true
   */
  interactive?: boolean;
  /**
   * Additional custom class names for the container.
   */
  className?: string;
}

interface FiberStrand {
  bundleIndex: number;
  strandIndex: number;
  baseYPercent: number;
  amplitude: number;
  wavelength: number;
  frequency: number;
  speed: number;
  phase: number;
  harmonicPhase: number;
  harmonicFreq: number;
  lineWidth: number;
  baseColor: string;
  glowColor: string;
  alpha: number;
}

interface PulseParticle {
  strandIndex: number;
  progress: number;
  speed: number;
  size: number;
  brightness: number;
}

export const GhostFibers: React.FC<GhostFibersProps> = ({
  bundleCount = 5,
  strandsPerBundle = 7,
  opacity = 0.65,
  speed = 1.0,
  interactive = true,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Check prefers-reduced-motion
    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Interactive pointer state with smooth lerping
    const pointer = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 220,
      active: false,
    };

    // Color palettes tuned for high-tech bioacoustic aesthetic (emerald, mint, forest jade, cyber teal)
    const colorTones = [
      { base: 'rgba(5, 150, 105, ', glow: 'rgba(52, 211, 153, ' },   // emerald
      { base: 'rgba(16, 185, 129, ', glow: 'rgba(110, 231, 183, ' }, // bright mint
      { base: 'rgba(4, 120, 87, ', glow: 'rgba(45, 212, 191, ' },    // deep jade to teal
      { base: 'rgba(13, 148, 136, ', glow: 'rgba(94, 234, 212, ' },  // cyan acoustic
      { base: 'rgba(6, 95, 70, ', glow: 'rgba(167, 243, 208, ' },    // deep bio green
    ];

    // Generate fiber strands
    const strands: FiberStrand[] = [];
    let globalStrandCounter = 0;

    for (let b = 0; b < bundleCount; b++) {
      // Distribute bundle center across vertical space (with natural bioacoustic acoustic-band bias)
      const bundleYPercent = 0.15 + (b / Math.max(1, bundleCount - 1)) * 0.72;
      const palette = colorTones[b % colorTones.length];

      for (let s = 0; s < strandsPerBundle; s++) {
        const offsetPercent = (s - strandsPerBundle / 2) * 0.024;
        strands.push({
          bundleIndex: b,
          strandIndex: globalStrandCounter++,
          baseYPercent: bundleYPercent + offsetPercent,
          amplitude: 28 + Math.sin(b * 1.5 + s) * 16 + (s % 3) * 8,
          wavelength: 0.0018 + (s % 4) * 0.0006 + (b % 2) * 0.0004,
          frequency: 0.0012 + (s % 3) * 0.0007,
          speed: (0.45 + (s * 0.11) + (b * 0.08)) * (prefersReducedMotion ? 0.15 : 1.0) * speed,
          phase: (b * 1.7 + s * 0.9) % (Math.PI * 2),
          harmonicPhase: (s * 1.3) % (Math.PI * 2),
          harmonicFreq: 0.0028 + (b % 3) * 0.001,
          lineWidth: 0.75 + (s === Math.floor(strandsPerBundle / 2) ? 1.1 : 0.4),
          baseColor: palette.base,
          glowColor: palette.glow,
          alpha: 0.25 + (1 - Math.abs(s - strandsPerBundle / 2) / (strandsPerBundle / 2)) * 0.45,
        });
      }
    }

    // Bioacoustic pulse signal particles traversing along strands
    const pulses: PulseParticle[] = [];
    const pulseCount = Math.min(18, strands.length);
    for (let i = 0; i < pulseCount; i++) {
      pulses.push({
        strandIndex: Math.floor(Math.random() * strands.length),
        progress: Math.random(),
        speed: (0.0015 + Math.random() * 0.0025) * (prefersReducedMotion ? 0.2 : 1.0) * speed,
        size: 1.8 + Math.random() * 2.2,
        brightness: 0.6 + Math.random() * 0.4,
      });
    }

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      width = rect.width || window.innerWidth;
      height = rect.height || window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.scale(dpr, dpr);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Mouse & Touch interaction
    const handleMouseMove = (e: MouseEvent) => {
      if (!interactive) return;
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = e.clientX - rect.left;
      pointer.targetY = e.clientY - rect.top;
      pointer.active = true;
    };

    const handleMouseLeave = () => {
      pointer.active = false;
      pointer.targetX = -1000;
      pointer.targetY = -1000;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!interactive || e.touches.length === 0) return;
      const rect = canvas.getBoundingClientRect();
      pointer.targetX = e.touches[0].clientX - rect.left;
      pointer.targetY = e.touches[0].clientY - rect.top;
      pointer.active = true;
    };

    const handleTouchEnd = () => {
      pointer.active = false;
      pointer.targetX = -1000;
      pointer.targetY = -1000;
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mouseleave', handleMouseLeave);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchend', handleTouchEnd);

    // Animation loop
    let lastTime = performance.now();
    let time = 0;

    const render = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;
      time += delta * speed;

      // Smooth pointer lerp
      pointer.x += (pointer.targetX - pointer.x) * 0.12;
      pointer.y += (pointer.targetY - pointer.y) * 0.12;

      // Clear canvas with subtle transparency for fluid phosphor persistence
      ctx.clearRect(0, 0, width, height);

      // Draw faint bioacoustic ambient back-glows (neural acoustic hubs)
      const gradCenterY = height * 0.42;
      const ambientGlow = ctx.createRadialGradient(
        width * 0.5,
        gradCenterY,
        10,
        width * 0.5,
        gradCenterY,
        width * 0.75
      );
      ambientGlow.addColorStop(0, `rgba(16, 185, 129, ${0.045 * opacity})`);
      ambientGlow.addColorStop(0.5, `rgba(4, 120, 87, ${0.02 * opacity})`);
      ambientGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = ambientGlow;
      ctx.fillRect(0, 0, width, height);

      // Global composite for luminous fiber superposition
      ctx.globalCompositeOperation = 'screen';

      const stepX = 14; // Sampling step along X axis
      const totalSteps = Math.ceil(width / stepX) + 2;

      // Helper to compute Y coordinate for a strand at a given X
      const getStrandY = (strand: FiberStrand, x: number, t: number) => {
        const baseY = strand.baseYPercent * height;

        // Primary wave component (carrier frequency)
        const wave1 =
          Math.sin(x * strand.wavelength + t * strand.speed + strand.phase) *
          strand.amplitude;

        // Secondary harmonic component (acoustic overtone)
        const wave2 =
          Math.cos(x * (strand.wavelength * 1.8) - t * (strand.speed * 0.7) + strand.harmonicPhase) *
          (strand.amplitude * 0.38);

        // Tertiary slow undulating drift
        const wave3 =
          Math.sin(x * 0.0006 + t * 0.25 + strand.strandIndex) * 18;

        let y = baseY + wave1 + wave2 + wave3;

        // Interactive cursor repulsion / wave deflection
        if (pointer.active && pointer.x > -500) {
          const dx = x - pointer.x;
          const dy = y - pointer.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < pointer.radius && dist > 0.001) {
            const force = (1 - dist / pointer.radius);
            const smoothForce = force * force * (3 - 2 * force); // smoothstep
            // Wave deflection away from cursor with organic harmonic resonance
            const repelY = (dy / dist) * smoothForce * 48;
            const resonance = Math.sin(dist * 0.08 - t * 4) * smoothForce * 12;
            y += repelY + resonance;
          }
        }

        return y;
      };

      // Draw each fiber strand
      for (let sIdx = 0; sIdx < strands.length; sIdx++) {
        const strand = strands[sIdx];
        const effectiveAlpha = strand.alpha * opacity;

        ctx.beginPath();
        let prevX = 0;
        let prevY = getStrandY(strand, 0, time);
        ctx.moveTo(prevX, prevY);

        for (let i = 1; i <= totalSteps; i++) {
          const currentX = i * stepX;
          const currentY = getStrandY(strand, currentX, time);

          // Quadratic curve interpolation for silky smooth fiber optics
          const midX = (prevX + currentX) / 2;
          const midY = (prevY + currentY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, midX, midY);

          prevX = currentX;
          prevY = currentY;
        }

        // Create linear gradient along the fiber for fading endpoints
        const lineGrad = ctx.createLinearGradient(0, 0, width, 0);
        lineGrad.addColorStop(0, `${strand.baseColor}0)`);
        lineGrad.addColorStop(0.12, `${strand.baseColor}${effectiveAlpha * 0.75})`);
        lineGrad.addColorStop(0.5, `${strand.glowColor}${effectiveAlpha})`);
        lineGrad.addColorStop(0.88, `${strand.baseColor}${effectiveAlpha * 0.75})`);
        lineGrad.addColorStop(1, `${strand.baseColor}0)`);

        ctx.strokeStyle = lineGrad;
        ctx.lineWidth = strand.lineWidth;
        ctx.stroke();
      }

      // Render traveling bioacoustic pulse particles
      for (let pIdx = 0; pIdx < pulses.length; pIdx++) {
        const pulse = pulses[pIdx];
        pulse.progress += pulse.speed;
        if (pulse.progress > 1) {
          pulse.progress = 0;
          pulse.strandIndex = Math.floor(Math.random() * strands.length);
        }

        const strand = strands[pulse.strandIndex];
        const posX = pulse.progress * width;
        const posY = getStrandY(strand, posX, time);

        // Distance fade at screen edges
        const edgeFactor = Math.sin(pulse.progress * Math.PI);
        const pulseAlpha = pulse.brightness * edgeFactor * opacity;

        if (pulseAlpha > 0.01) {
          // Inner glowing node
          const pulseGrad = ctx.createRadialGradient(
            posX,
            posY,
            0,
            posX,
            posY,
            pulse.size * 3.5
          );
          pulseGrad.addColorStop(0, `rgba(240, 253, 244, ${pulseAlpha * 0.95})`);
          pulseGrad.addColorStop(0.3, `rgba(110, 231, 183, ${pulseAlpha * 0.7})`);
          pulseGrad.addColorStop(0.7, `rgba(16, 185, 129, ${pulseAlpha * 0.25})`);
          pulseGrad.addColorStop(1, 'rgba(16, 185, 129, 0)');

          ctx.fillStyle = pulseGrad;
          ctx.beginPath();
          ctx.arc(posX, posY, pulse.size * 3.5, 0, Math.PI * 2);
          ctx.fill();

          // Subtle phosphor trail behind the pulse
          const trailLength = 35 * pulse.speed * 400;
          const trailX = Math.max(0, posX - trailLength);
          const trailY = getStrandY(strand, trailX, time);

          const trailGrad = ctx.createLinearGradient(trailX, trailY, posX, posY);
          trailGrad.addColorStop(0, 'rgba(16, 185, 129, 0)');
          trailGrad.addColorStop(1, `rgba(167, 243, 208, ${pulseAlpha * 0.5})`);

          ctx.beginPath();
          ctx.moveTo(trailX, trailY);
          ctx.lineTo(posX, posY);
          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = strand.lineWidth * 1.5;
          ctx.stroke();
        }
      }

      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [bundleCount, strandsPerBundle, opacity, speed, interactive]);

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 pointer-events-none z-0 overflow-hidden select-none ${className}`}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full block opacity-90 transition-opacity duration-1000"
      />
      {/* High-tech bioacoustic vignette overlay to gracefully fade edges into the background tone */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-[#070b08]/85 via-transparent to-[#070b08]/90 pointer-events-none"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,#070b08_100%)] pointer-events-none opacity-85"
        aria-hidden="true"
      />
    </div>
  );
};

export default GhostFibers;
