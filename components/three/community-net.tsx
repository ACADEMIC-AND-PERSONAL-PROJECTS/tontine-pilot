"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { fakeMembers, currentCycle } from "@/lib/fake-data";

/**
 * Tontine cycle pilot — product-faithful hero scene:
 * 12 members in rotation order, current recipient highlighted,
 * cotisations flowing toward them, collection progress arc.
 */

const RING_R = 118;
const RECIPIENT_IDX = fakeMembers.findIndex(
  (m) => m.id === currentCycle.recipientMemberId
);
const ACTIVE_RECIPIENT = RECIPIENT_IDX >= 0 ? RECIPIENT_IDX : 3;

type PayStatus = "paid" | "pending" | "late";

/** Cycle 4 snapshot aligned with demo data. */
const PAY_STATUS: PayStatus[] = [
  "paid", // Aïssatou
  "paid", // Moussa
  "paid", // Awa
  "paid", // Cheikh (recipient — still contributes)
  "paid", // Fatou
  "late", // Ibrahima
  "paid", // Mariama
  "paid", // Ousmane
  "paid", // Khadija
  "pending", // Amadou
  "paid", // Bineta
  "pending", // Modou
];

/** Ring weight by status — hue stays in the violet family. */
const STATUS_RING: Record<
  PayStatus,
  { stroke: string; glow: string; text: string }
> = {
  paid: {
    stroke: "rgba(167, 139, 250, 0.85)",
    glow: "rgba(139, 92, 246, 0.28)",
    text: "#e9e4ff",
  },
  pending: {
    stroke: "rgba(113, 113, 122, 0.7)",
    glow: "rgba(113, 113, 122, 0.12)",
    text: "#a1a1aa",
  },
  late: {
    stroke: "rgba(196, 181, 253, 0.35)",
    glow: "rgba(139, 92, 246, 0.08)",
    text: "#71717a",
  },
};

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function makeMemberToken(
  name: string,
  status: PayStatus,
  isRecipient: boolean
) {
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;

  // Soft outer glow
  const ring = STATUS_RING[status];
  const glow = ctx.createRadialGradient(64, 64, 28, 64, 64, 64);
  glow.addColorStop(
    0,
    isRecipient ? "rgba(250,204,21,0.35)" : ring.glow
  );
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Disc
  ctx.beginPath();
  ctx.arc(64, 64, 36, 0, Math.PI * 2);
  ctx.fillStyle = isRecipient ? "#1a1430" : "#0e1120";
  ctx.fill();
  ctx.lineWidth = isRecipient ? 4.5 : status === "late" ? 2 : 2.5;
  ctx.strokeStyle = isRecipient ? "rgba(250,204,21,0.9)" : ring.stroke;
  ctx.stroke();

  // Initials
  ctx.fillStyle = isRecipient ? "#fde68a" : ring.text;
  ctx.font = "bold 28px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(initials(name), 64, 66);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
}

function makeLabelSprite(text: string, color = "#fafafa", fontSize = 22) {
  const canvas = document.createElement("canvas");
  canvas.width = 320;
  canvas.height = 80;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, 320, 80);

  // Pill background
  const padX = 18;
  ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
  const w = Math.min(ctx.measureText(text).width + padX * 2, 300);
  const h = 40;
  const x = (320 - w) / 2;
  const y = (80 - h) / 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fillStyle = "rgba(12, 15, 26, 0.88)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.12)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 160, 42);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthWrite: false,
  });
}

function makeGlowDot(hex: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, hex);
  g.addColorStop(0.4, hex);
  g.addColorStop(1, "transparent");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function buildProgressArc(radius: number, progress: number, segments = 72) {
  const pts: THREE.Vector3[] = [];
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * progress;
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const a = start + (end - start) * t;
    pts.push(new THREE.Vector3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
  }
  return pts;
}

export function CommunityNet() {
  const mountRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const curRef = useRef({ x: 0, y: 0 });
  const impulseRef = useRef(0);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const isFinePointer = window.matchMedia("(pointer: fine)").matches;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(36, 1, 1, 2000);
    camera.position.z = 520;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    const root = new THREE.Group();
    scene.add(root);

    const members = fakeMembers.slice(0, 12);
    const paidCount = PAY_STATUS.filter((s) => s === "paid").length;
    const progress = paidCount / members.length;

    // --- Track ring (full cycle) ---
    const trackPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 96; i++) {
      const a = (i / 96) * Math.PI * 2;
      trackPts.push(
        new THREE.Vector3(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0)
      );
    }
    const trackGeo = new THREE.BufferGeometry().setFromPoints(trackPts);
    root.add(
      new THREE.Line(
        trackGeo,
        new THREE.LineBasicMaterial({
          color: 0x4c1d95,
          transparent: true,
          opacity: 0.35,
        })
      )
    );

    // --- Collection progress arc (who has paid this cycle) ---
    const progressGeo = new THREE.BufferGeometry().setFromPoints(
      buildProgressArc(RING_R + 16, progress)
    );
    const progressLine = new THREE.Line(
      progressGeo,
      new THREE.LineBasicMaterial({
        color: 0x8b5cf6,
        transparent: true,
        opacity: 0.55,
        blending: THREE.AdditiveBlending,
      })
    );
    root.add(progressLine);

    // Soft rotation cue (same violet family — gold reserved for recipient)
    const orderPts: THREE.Vector3[] = [];
    for (let i = 0; i <= 48; i++) {
      const a = -Math.PI / 2 + (i / 48) * Math.PI * 1.6;
      orderPts.push(
        new THREE.Vector3(
          Math.cos(a) * (RING_R + 26),
          Math.sin(a) * (RING_R + 26),
          0
        )
      );
    }
    const orderGeo = new THREE.BufferGeometry().setFromPoints(orderPts);
    const orderArc = new THREE.Line(
      orderGeo,
      new THREE.LineBasicMaterial({
        color: 0x7c3aed,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      })
    );
    root.add(orderArc);

    // --- Member tokens ---
    type MemberNode = {
      sprite: THREE.Sprite;
      angle: number;
      status: PayStatus;
      baseScale: number;
      isRecipient: boolean;
    };
    const nodes: MemberNode[] = [];
    const memberGroup = new THREE.Group();

    members.forEach((m, i) => {
      // Put recipient at top (-PI/2) for readability
      const offset = ACTIVE_RECIPIENT;
      const angle =
        ((i - offset) / members.length) * Math.PI * 2 - Math.PI / 2;
      const status = PAY_STATUS[i];
      const isRecipient = i === ACTIVE_RECIPIENT;
      const mat = makeMemberToken(m.name, status, isRecipient);
      const sprite = new THREE.Sprite(mat);
      sprite.position.set(Math.cos(angle) * RING_R, Math.sin(angle) * RING_R, 0);
      const base = isRecipient ? 32 : 22;
      sprite.scale.set(base, base, 1);
      memberGroup.add(sprite);
      nodes.push({ sprite, angle, status, baseScale: base, isRecipient });
    });
    root.add(memberGroup);

    // Recipient label — sole gold accent
    const recipient = members[ACTIVE_RECIPIENT];
    const recipLabel = new THREE.Sprite(
      makeLabelSprite(`→ ${recipient.name.split(" ")[0]}`, "#e8d48b", 20)
    );
    recipLabel.position.set(0, RING_R + 42, 0);
    recipLabel.scale.set(78, 19.5, 1);
    root.add(recipLabel);

    // Center pot card: collected this cycle
    const potLabel = new THREE.Sprite(
      makeLabelSprite(
        `${(currentCycle.totalCollected / 1000).toFixed(0)}k FCFA`,
        "#d4d4d8",
        24
      )
    );
    potLabel.position.set(0, 8, 0);
    potLabel.scale.set(96, 24, 1);
    root.add(potLabel);

    const cycleLabel = new THREE.Sprite(
      makeLabelSprite(`Cycle ${currentCycle.cycleNumber}`, "#a1a1aa", 18)
    );
    cycleLabel.position.set(0, -24, 0);
    cycleLabel.scale.set(64, 16, 1);
    root.add(cycleLabel);

    // Soft pot glow behind labels
    const potGlow = new THREE.Sprite(makeGlowDot("#6d28d9"));
    potGlow.scale.set(90, 90, 1);
    potGlow.position.set(0, 0, -2);
    root.add(potGlow);

    // --- Contribution lines: paid members → recipient ---
    const recipPos = nodes[ACTIVE_RECIPIENT].sprite.position.clone();
    const linePositions: number[] = [];
    nodes.forEach((n, i) => {
      if (n.isRecipient || n.status === "late") return;
      if (n.status === "pending") return;
      linePositions.push(
        n.sprite.position.x,
        n.sprite.position.y,
        0,
        recipPos.x,
        recipPos.y,
        0
      );
      void i;
    });
    const lineGeo = new THREE.BufferGeometry();
    lineGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(linePositions, 3)
    );
    root.add(
      new THREE.LineSegments(
        lineGeo,
        new THREE.LineBasicMaterial({
          color: 0x8b5cf6,
          transparent: true,
          opacity: 0.22,
          blending: THREE.AdditiveBlending,
        })
      )
    );

    // --- Cotisation packets flowing to recipient ---
    type Packet = {
      sprite: THREE.Sprite;
      from: number;
      t: number;
      speed: number;
    };
    const packets: Packet[] = [];
    const packetGroup = new THREE.Group();
    nodes.forEach((n, i) => {
      if (n.isRecipient || n.status !== "paid") return;
      for (let k = 0; k < 2; k++) {
        const sprite = new THREE.Sprite(makeGlowDot("#a78bfa"));
        sprite.scale.set(7, 7, 1);
        packetGroup.add(sprite);
        packets.push({
          sprite,
          from: i,
          t: Math.random(),
          speed: 0.004 + Math.random() * 0.005,
        });
      }
    });
    // Pending members: slower dim packets that stall mid-way
    nodes.forEach((n, i) => {
      if (n.status !== "pending") return;
      const sprite = new THREE.Sprite(makeGlowDot("#71717a"));
      sprite.scale.set(6, 6, 1);
      packetGroup.add(sprite);
      packets.push({
        sprite,
        from: i,
        t: 0.15 + Math.random() * 0.25,
        speed: 0.0012,
      });
    });
    root.add(packetGroup);

    // --- Occasional "AI declaration" pulse (same violet family) ---
    const aiPulse = new THREE.Sprite(makeGlowDot("#c4b5fd"));
    aiPulse.scale.set(0, 0, 1);
    aiPulse.visible = false;
    root.add(aiPulse);
    let aiTimer = 120;
    let aiLife = 0;
    let aiFrom = 0;

    const disposables: THREE.BufferGeometry[] = [
      trackGeo,
      progressGeo,
      orderGeo,
      lineGeo,
    ];

    const onMouseMove = (e: MouseEvent) => {
      if (!isFinePointer || reducedMotion) return;
      const rect = container.getBoundingClientRect();
      mouseRef.current.x = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      mouseRef.current.y = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    const onMouseLeave = () => {
      mouseRef.current.x = 0;
      mouseRef.current.y = 0;
    };
    const onPointerDown = () => {
      impulseRef.current = 1;
    };

    container.addEventListener("mousemove", onMouseMove);
    container.addEventListener("mouseleave", onMouseLeave);
    container.addEventListener("pointerdown", onPointerDown);

    const onResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    onResize();
    window.addEventListener("resize", onResize);

    let raf = 0;
    let tick = 0;

    const animate = () => {
      raf = requestAnimationFrame(animate);
      tick += 1;
      curRef.current.x += (mouseRef.current.x - curRef.current.x) * 0.05;
      curRef.current.y += (mouseRef.current.y - curRef.current.y) * 0.05;
      impulseRef.current *= 0.94;

      if (!reducedMotion) {
        // Slow whole-scene tilt — keep recipient readable (no full spin)
        root.rotation.z =
          Math.sin(tick * 0.004) * 0.04 + impulseRef.current * 0.05;
        root.rotation.x = curRef.current.y * 0.1;
        root.rotation.y = curRef.current.x * 0.1;

        // Recipient pulse
        nodes.forEach((n) => {
          const breath =
            1 +
            Math.sin(tick * (n.isRecipient ? 0.05 : 0.03) + n.angle) *
              (n.isRecipient ? 0.08 : 0.04);
          n.sprite.scale.set(n.baseScale * breath, n.baseScale * breath, 1);
        });

        potGlow.scale.setScalar(85 + Math.sin(tick * 0.04) * 10);
        orderArc.rotation.z = tick * 0.002;

        // Packets travel member → recipient
        const to = nodes[ACTIVE_RECIPIENT].sprite.position;
        packets.forEach((p) => {
          const from = nodes[p.from];
          const isPending = from.status === "pending";
          if (!isPending) {
            p.t += p.speed;
            if (p.t > 1) p.t = 0;
          } else {
            p.t += p.speed * 0.3;
            if (p.t > 0.45) p.t = 0.12;
          }
          const ease = p.t * p.t * (3 - 2 * p.t);
          p.sprite.position.lerpVectors(from.sprite.position, to, ease);
          const s = isPending ? 5 : 5 + (1 - ease) * 4;
          p.sprite.scale.set(s, s, 1);
        });

        // AI declaration flash
        aiTimer -= 1;
        if (aiTimer <= 0 && aiLife <= 0) {
          const paidIdx = nodes
            .map((n, i) => (n.status === "paid" && !n.isRecipient ? i : -1))
            .filter((i) => i >= 0);
          aiFrom = paidIdx[Math.floor(Math.random() * paidIdx.length)] ?? 0;
          aiLife = 48;
          aiTimer = 160 + Math.floor(Math.random() * 80);
          aiPulse.visible = true;
        }
        if (aiLife > 0) {
          aiLife -= 1;
          const from = nodes[aiFrom].sprite.position;
          const t = 1 - aiLife / 48;
          aiPulse.position.lerpVectors(from, to, t * t);
          const s = 18 * Math.sin(t * Math.PI);
          aiPulse.scale.set(s, s, 1);
          if (aiLife <= 0) aiPulse.visible = false;
        }
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      container.removeEventListener("mousemove", onMouseMove);
      container.removeEventListener("mouseleave", onMouseLeave);
      container.removeEventListener("pointerdown", onPointerDown);
      renderer.dispose();
      disposables.forEach((g) => g.dispose());
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0" />;
}
