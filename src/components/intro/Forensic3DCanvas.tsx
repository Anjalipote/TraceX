import React, { useEffect, useRef } from 'react';

interface Forensic3DCanvasProps {
  isExiting?: boolean;
}

interface ForensicNode {
  x: number;
  y: number;
  z: number;
  baseX: number;
  baseY: number;
  baseZ: number;
  vx: number;
  vy: number;
  vz: number;
  category: 'artifact' | 'memory' | 'network' | 'hash' | 'anomaly';
  label: string;
  size: number;
  color: string;
  glowColor: string;
  pulsePhase: number;
}

interface ForensicPacket {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
  color: string;
}

export const Forensic3DCanvas: React.FC<Forensic3DCanvasProps> = ({ isExiting = false }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const exitingRef = useRef(isExiting);

  useEffect(() => {
    exitingRef.current = isExiting;
  }, [isExiting]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Mouse tracking with smooth damping
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetRotX = 0;
    let targetRotY = 0;
    let currentRotX = 0;
    let currentRotY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetRotY = ((mouseX - width / 2) / width) * 0.7;
      targetRotX = -((mouseY - height / 2) / height) * 0.5;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        mouseX = e.touches[0].clientX;
        mouseY = e.touches[0].clientY;
        targetRotY = ((mouseX - width / 2) / width) * 0.7;
        targetRotX = -((mouseY - height / 2) / height) * 0.5;
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });

    // Forensic Artifact Definitions
    const labels = [
      { text: '0x7FFD28B', cat: 'memory' as const },
      { text: 'SHA-256:VERIFIED', cat: 'hash' as const },
      { text: 'VOLATILITY::RAM', cat: 'memory' as const },
      { text: 'MFT::$MFT_RECORD', cat: 'artifact' as const },
      { text: 'PCAP::STREAM_443', cat: 'network' as const },
      { text: 'EVT_LOG::4624_AUTH', cat: 'artifact' as const },
      { text: 'ANOMALY::BEACON_C2', cat: 'anomaly' as const },
      { text: 'REG::RUN_KEY_MOD', cat: 'artifact' as const },
      { text: 'PAYLOAD::ENC_AES', cat: 'hash' as const },
      { text: 'TIMELINE::08:24:19', cat: 'artifact' as const },
      { text: 'SOCK::10.240.0.14', cat: 'network' as const },
      { text: 'KERNEL::HOOK_DET', cat: 'anomaly' as const },
      { text: 'CUSTODY::CHAIN_VALID', cat: 'hash' as const },
      { text: 'USN_JOURNAL::$J', cat: 'artifact' as const },
      { text: 'TLS::FINGERPRINT_JA3', cat: 'network' as const },
    ];

    const categoryColors = {
      artifact: { main: '#38BDF8', glow: 'rgba(56, 189, 248, 0.4)' },
      memory: { main: '#818CF8', glow: 'rgba(129, 140, 248, 0.4)' },
      network: { main: '#2DD4BF', glow: 'rgba(45, 212, 191, 0.4)' },
      hash: { main: '#34D399', glow: 'rgba(52, 211, 153, 0.4)' },
      anomaly: { main: '#F59E0B', glow: 'rgba(245, 158, 11, 0.5)' },
    };

    // Initialize 3D Forensic Nodes in space
    const NODE_COUNT = 48;
    const nodes: ForensicNode[] = [];
    const radiusX = Math.min(width, height) * 0.55;
    const radiusY = Math.min(width, height) * 0.4;
    const radiusZ = 350;

    for (let i = 0; i < NODE_COUNT; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = Math.cbrt(Math.random()) * 0.85 + 0.15;

      const x = r * radiusX * Math.sin(phi) * Math.cos(theta);
      const y = r * radiusY * Math.sin(phi) * Math.sin(theta);
      const z = r * radiusZ * Math.cos(phi);

      const labelData = labels[i % labels.length];
      const colors = categoryColors[labelData.cat];

      nodes.push({
        x,
        y,
        z,
        baseX: x,
        baseY: y,
        baseZ: z,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        vz: (Math.random() - 0.5) * 0.25,
        category: labelData.cat,
        label: i < 18 ? labelData.text : '',
        size: Math.random() * 2.2 + 2.0,
        color: colors.main,
        glowColor: colors.glow,
        pulsePhase: Math.random() * Math.PI * 2,
      });
    }

    // Identify connections within 3D distance threshold
    const connections: [number, number, number][] = [];
    const maxDist = 260;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].baseX - nodes[j].baseX;
        const dy = nodes[i].baseY - nodes[j].baseY;
        const dz = nodes[i].baseZ - nodes[j].baseZ;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < maxDist) {
          connections.push([i, j, dist]);
        }
      }
    }

    // Initialize Active Forensic Data Packets
    const packets: ForensicPacket[] = [];
    for (let i = 0; i < 22; i++) {
      const conn = connections[Math.floor(Math.random() * connections.length)];
      if (conn) {
        packets.push({
          fromNode: conn[0],
          toNode: conn[1],
          progress: Math.random(),
          speed: 0.004 + Math.random() * 0.007,
          color: Math.random() > 0.4 ? '#38BDF8' : '#34D399',
        });
      }
    }

    // Radar scan angle & time tracker
    let radarAngle = 0;
    let time = 0;
    let exitZoom = 1;

    // Projection constants
    const fov = 750;

    // Render loop
    const render = () => {
      time += 0.016;
      radarAngle = (radarAngle + 0.012) % (Math.PI * 2);

      // Smooth rotation with mouse parallax and continuous subtle drift
      currentRotY += (targetRotY - currentRotY) * 0.04 + 0.0012;
      currentRotX += (targetRotX - currentRotX) * 0.04;

      // Handle exit transition speedup
      if (exitingRef.current) {
        exitZoom += 0.045;
        currentRotY += 0.015;
      }

      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;

      // 1. Draw 3D Perspective Digital Horizon & Forensic Grid Floor
      const gridY = centerY + height * 0.28;
      const vanishingY = centerY - height * 0.02;
      const horizonLineCount = 10;
      const verticalLineCount = 20;

      ctx.save();
      // Subtle background vignette
      const bgGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        width * 0.1,
        centerX,
        centerY,
        width * 0.75
      );
      bgGrad.addColorStop(0, 'rgba(10, 25, 47, 0.45)');
      bgGrad.addColorStop(0.5, 'rgba(7, 10, 15, 0.7)');
      bgGrad.addColorStop(1, 'rgba(7, 10, 15, 0.98)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Floor grid perspective lines
      ctx.lineWidth = 1;
      for (let i = -verticalLineCount / 2; i <= verticalLineCount / 2; i++) {
        const bottomX = centerX + (i * width * 1.8) / verticalLineCount;
        const topX = centerX + (i * width * 0.1) / verticalLineCount;

        const floorLineGrad = ctx.createLinearGradient(0, vanishingY, 0, height);
        floorLineGrad.addColorStop(0, 'rgba(30, 41, 59, 0)');
        floorLineGrad.addColorStop(0.4, 'rgba(38, 55, 85, 0.15)');
        floorLineGrad.addColorStop(1, 'rgba(56, 189, 248, 0.12)');

        ctx.strokeStyle = floorLineGrad;
        ctx.beginPath();
        ctx.moveTo(topX, vanishingY + 40);
        ctx.lineTo(bottomX, height);
        ctx.stroke();
      }

      // Horizontal perspective grid steps
      const gridCycle = (time * 0.2) % 1;
      for (let j = 0; j < horizonLineCount; j++) {
        const t = (j + gridCycle) / horizonLineCount;
        const py = gridY + (height - gridY) * Math.pow(t, 2.2);
        const alpha = Math.min(1, Math.pow(t, 1.8) * 0.25);

        ctx.strokeStyle = `rgba(56, 189, 248, ${alpha})`;
        ctx.beginPath();
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
        ctx.stroke();
      }
      ctx.restore();

      // 2. Compute 3D node coordinates with Euler rotation
      const cosY = Math.cos(currentRotY);
      const sinY = Math.sin(currentRotY);
      const cosX = Math.cos(currentRotX);
      const sinX = Math.sin(currentRotX);

      interface ProjectedNode {
        index: number;
        px: number;
        py: number;
        pz: number;
        scale: number;
        node: ForensicNode;
      }

      const projected: ProjectedNode[] = [];

      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        // Organic slow float
        n.x = n.baseX + Math.sin(time + n.pulsePhase) * 12;
        n.y = n.baseY + Math.cos(time * 0.8 + n.pulsePhase) * 12;
        n.z = n.baseZ + Math.sin(time * 0.6 + n.pulsePhase) * 8;

        // Apply exit zoom
        const rawX = n.x * exitZoom;
        const rawY = n.y * exitZoom;
        const rawZ = n.z * exitZoom;

        // Rotate Y (Yaw)
        const x1 = rawX * cosY - rawZ * sinY;
        const z1 = rawZ * cosY + rawX * sinY;

        // Rotate X (Pitch)
        const y2 = rawY * cosX - z1 * sinX;
        const z2 = z1 * cosX + rawY * sinX;

        // 3D Perspective Projection
        const zEff = z2 + 650;
        if (zEff <= 30) continue;

        const scale = fov / zEff;
        const px = centerX + x1 * scale;
        const py = centerY + y2 * scale;

        projected.push({
          index: i,
          px,
          py,
          pz: z2,
          scale,
          node: n,
        });
      }

      // Sort by depth (Painter's Algorithm)
      projected.sort((a, b) => b.pz - a.pz);

      // Create quick lookup from index to projected node
      const projMap = new Map<number, ProjectedNode>();
      for (const p of projected) {
        projMap.set(p.index, p);
      }

      // 3. Draw 3D Forensic Radar Sweep Ring
      ctx.save();
      const ringScale = (fov / (650 + Math.sin(time * 0.5) * 50)) * exitZoom;
      const ringRx = radiusX * 0.85 * ringScale;
      const ringRy = radiusY * 0.35 * ringScale;

      ctx.translate(centerX, centerY);
      ctx.rotate(currentRotY * 0.35);

      ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 12]);
      ctx.beginPath();
      ctx.ellipse(0, 0, ringRx, ringRy, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Radar scanline beam
      const beamX = Math.cos(radarAngle) * ringRx;
      const beamY = Math.sin(radarAngle) * ringRy;

      const beamGrad = ctx.createLinearGradient(0, 0, beamX, beamY);
      beamGrad.addColorStop(0, 'rgba(34, 211, 238, 0.4)');
      beamGrad.addColorStop(1, 'rgba(34, 211, 238, 0)');

      ctx.setLineDash([]);
      ctx.strokeStyle = beamGrad;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(beamX, beamY);
      ctx.stroke();
      ctx.restore();

      // 4. Draw Forensic Network Connections
      ctx.lineWidth = 1;
      for (const [i, j, dist] of connections) {
        const p1 = projMap.get(i);
        const p2 = projMap.get(j);
        if (!p1 || !p2) continue;

        // Depth-based alpha
        const avgZ = (p1.pz + p2.pz) / 2;
        const depthAlpha = Math.max(0.08, Math.min(0.65, 0.45 - avgZ / 1200));
        const distFade = 1 - dist / maxDist;
        const finalAlpha = depthAlpha * distFade;

        const edgeGrad = ctx.createLinearGradient(p1.px, p1.py, p2.px, p2.py);
        edgeGrad.addColorStop(0, `rgba(56, 189, 248, ${finalAlpha * 0.9})`);
        edgeGrad.addColorStop(0.5, `rgba(129, 140, 248, ${finalAlpha * 0.5})`);
        edgeGrad.addColorStop(1, `rgba(45, 212, 191, ${finalAlpha * 0.9})`);

        ctx.strokeStyle = edgeGrad;
        ctx.beginPath();
        ctx.moveTo(p1.px, p1.py);
        ctx.lineTo(p2.px, p2.py);
        ctx.stroke();
      }

      // 5. Draw Active Forensic Data Packets
      for (const packet of packets) {
        packet.progress += packet.speed;
        if (packet.progress >= 1) {
          packet.progress = 0;
          const nextConn = connections[Math.floor(Math.random() * connections.length)];
          if (nextConn) {
            packet.fromNode = nextConn[0];
            packet.toNode = nextConn[1];
          }
        }

        const p1 = projMap.get(packet.fromNode);
        const p2 = projMap.get(packet.toNode);
        if (!p1 || !p2) continue;

        const packetX = p1.px + (p2.px - p1.px) * packet.progress;
        const packetY = p1.py + (p2.py - p1.py) * packet.progress;
        const packetScale = p1.scale + (p2.scale - p1.scale) * packet.progress;

        ctx.save();
        ctx.shadowColor = packet.color;
        ctx.shadowBlur = 10 * packetScale;
        ctx.fillStyle = packet.color;
        ctx.beginPath();
        ctx.arc(packetX, packetY, 2.4 * packetScale, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // 6. Draw 3D Forensic Nodes with Glow & Holographic Labels
      for (const p of projected) {
        const { px, py, scale, node } = p;
        const nodeRadius = Math.max(1.8, node.size * scale);
        const depthAlpha = Math.max(0.25, Math.min(1, 0.75 - p.pz / 1000));

        ctx.save();

        // Outer forensic halo
        ctx.shadowColor = node.color;
        ctx.shadowBlur = 14 * scale;
        ctx.fillStyle = node.color;
        ctx.globalAlpha = depthAlpha;

        ctx.beginPath();
        ctx.arc(px, py, nodeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Inner bright core
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(px, py, nodeRadius * 0.45, 0, Math.PI * 2);
        ctx.fill();

        // Pulsing radar ring for anomalies and special nodes
        if (node.category === 'anomaly' || node.category === 'hash') {
          const pulse = (time * 2 + node.pulsePhase) % (Math.PI * 2);
          const ringRad = nodeRadius + Math.sin(pulse) * 6 * scale + 4 * scale;
          ctx.strokeStyle = node.color;
          ctx.lineWidth = 1 * scale;
          ctx.globalAlpha = Math.max(0, depthAlpha * (1 - Math.sin(pulse)));
          ctx.beginPath();
          ctx.arc(px, py, Math.max(1, ringRad), 0, Math.PI * 2);
          ctx.stroke();
        }

        // Forensic Telemetry Label (drawn for prominent foreground nodes)
        if (node.label && scale > 0.85 && p.pz < 120) {
          ctx.globalAlpha = Math.min(0.9, (scale - 0.85) * 3);
          ctx.font = `600 ${Math.max(9, Math.floor(10 * scale))}px "JetBrains Mono", monospace`;
          ctx.fillStyle = node.category === 'anomaly' ? '#FBBF24' : '#94A3B8';

          const textX = px + nodeRadius + 6;
          const textY = py + 3;

          // Micro bracket tag
          ctx.fillText(`[ ${node.label} ]`, textX, textY);

          // Micro indicator line
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.35)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(px + nodeRadius + 2, py);
          ctx.lineTo(textX - 2, py);
          ctx.stroke();
        }

        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-700 ${
        isExiting ? 'opacity-40 scale-105' : 'opacity-100 scale-100'
      }`}
      style={{
        zIndex: 0,
        transition: 'transform 0.5s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease',
      }}
    />
  );
};
