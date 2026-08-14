"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export type BowlVariant = "sev" | "chakli" | "mathri" | "mix";

/** Picks a bowl composition based on the product name. */
export function getBowlVariant(name: string): BowlVariant {
  const n = (name || "").toLowerCase();
  if (n.includes("sev") || n.includes("bhujia") || n.includes("gathiya")) return "sev";
  if (n.includes("chakli") || n.includes("murukku")) return "chakli";
  if (n.includes("mathri") || n.includes("khakhra") || n.includes("papdi")) return "mathri";
  return "mix";
}

interface ProductBowl3DProps {
  className?: string;
  /** Constant slow auto-rotation (default true). */
  autoRotate?: boolean;
  /** Which namkeen the bowl should emphasize. */
  variant?: BowlVariant;
}

/** Deterministic PRNG so procedural textures render consistently. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface FriedTextureOptions {
  base?: [number, number, number];
  speck?: [number, number, number];
  light?: [number, number, number];
  dimples?: boolean;
  streaks?: boolean;
}

/**
 * Procedural "fried" surface texture — golden-brown base with coarse darker
 * speckles, used as both color map and bump map so pieces read as crunchy,
 * oil-fried namkeen rather than flat plastic shapes.
 */
function createFriedTexture(seed: number, opts: FriedTextureOptions = {}): THREE.CanvasTexture {
  const { base = [196, 132, 46], speck = [112, 74, 30], light = [222, 176, 96], dimples = false, streaks = false } = opts;
  const size = 128;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  const rand = mulberry32(seed);
  const tex = new THREE.CanvasTexture(canvas);

  if (ctx) {
    const grad = ctx.createLinearGradient(0, 0, 0, size);
    grad.addColorStop(0, `rgb(${base[0]},${base[1]},${base[2]})`);
    grad.addColorStop(1, `rgb(${(base[0] * 0.78) | 0},${(base[1] * 0.78) | 0},${(base[2] * 0.72) | 0})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    // Coarse fried speckles — the signature golden crunch surface
    for (let i = 0; i < 520; i++) {
      const x = rand() * size;
      const y = rand() * size;
      const dark = rand() > 0.5;
      const r = 0.4 + rand() * 1.7;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = dark
        ? `rgba(${speck[0]},${speck[1]},${speck[2]},${0.35 + rand() * 0.4})`
        : `rgba(${light[0]},${light[1]},${light[2]},${0.3 + rand() * 0.35})`;
      ctx.fill();
    }

    if (dimples) {
      // Pitted surface of roasted chana
      for (let i = 0; i < 70; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const r = 1.5 + rand() * 2.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${speck[0]},${speck[1]},${speck[2]},0.5)`;
        ctx.fill();
      }
    }

    if (streaks) {
      // Fine thread grain of pressed sev
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 130; i++) {
        const x = rand() * size;
        const y = rand() * size;
        const len = 4 + rand() * 10;
        const ang = rand() * Math.PI;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
        ctx.strokeStyle = `rgba(${speck[0]},${speck[1]},${speck[2]},${0.25 + rand() * 0.3})`;
        ctx.stroke();
      }
    }
  }

  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

/** Loose coil of fine sev thread — a thin tube wound into a spring. */
function createSevGeometry(): THREE.TubeGeometry {
  const points: THREE.Vector3[] = [];
  const steps = 130;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * Math.PI * 2 * 2.4;
    const rad = 0.1 + t * 0.62;
    points.push(
      new THREE.Vector3(
        Math.cos(ang) * rad,
        Math.sin(t * Math.PI * 5) * 0.14,
        Math.sin(ang) * rad
      )
    );
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 130, 0.055, 8, false);
}

/** Flat spiral chakli disc — a tube wound flat in a plane. */
function createChakliGeometry(): THREE.TubeGeometry {
  const points: THREE.Vector3[] = [];
  const steps = 170;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = t * Math.PI * 2 * 3;
    const rad = 0.05 + t * 0.6;
    points.push(new THREE.Vector3(Math.cos(ang) * rad, 0, Math.sin(ang) * rad));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 170, 0.095, 10, false);
}

interface PieceDef {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
  flat?: boolean;
  scaleMin: number;
  scaleMax: number;
}

/**
 * ProductBowl3D — an interactive WebGL "namkeen bowl".
 *
 * Renders a warm glass serving bowl heaped with recognizable 100% Jain
 * namkeen geometry: chakli spirals, coiled sev threads, mathri discs,
 * roasted chana, boondi droplets, papdi wafers and spice crystals — each
 * with a procedural fried-golden surface. The composition shifts toward the
 * product being shown (sev / chakli / mathri / general mix).
 *
 * Drag to rotate (mouse only, so touch scrolling is never hijacked); the
 * scene sways with pointer parallax. The canvas is alpha-transparent, so
 * place it inside a dark brand-colored stage card.
 */
export default function ProductBowl3D({ className = "", autoRotate = true, variant = "mix" }: ProductBowl3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let width = container.clientWidth || 360;
    let height = container.clientHeight || 420;

    // 1. Scene + camera
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 1.5, 8.8);
    camera.lookAt(0, 0.2, 0);

    // 2. Renderer (alpha so CSS gradient shows through)
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      container.appendChild(renderer.domElement);
    } catch (err) {
      console.warn("WebGL canvas creation skipped:", err);
      return;
    }

    const world = new THREE.Group();
    scene.add(world);

    // 3. Warm glass serving bowl + gold rim
    const bowlGeo = new THREE.SphereGeometry(2.1, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2);
    const bowlMat = new THREE.MeshPhysicalMaterial({
      color: 0xfff6e8,
      roughness: 0.1,
      metalness: 0.02,
      transmission: 0.72,
      ior: 1.45,
      thickness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      transparent: true,
      opacity: 0.75,
    });
    const bowl = new THREE.Mesh(bowlGeo, bowlMat);
    world.add(bowl);

    const rimGeo = new THREE.TorusGeometry(2.1, 0.06, 16, 72);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xd4a545, roughness: 0.28, metalness: 0.85 });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = Math.PI / 2;
    world.add(rim);

    // 4. Procedural fried textures (shared color + bump map)
    const sevTex = createFriedTexture(11, { base: [198, 134, 44], speck: [116, 76, 30], light: [226, 180, 100], streaks: true });
    const chakliTex = createFriedTexture(23, { base: [186, 120, 40], speck: [104, 66, 28], light: [218, 168, 92] });
    const mathriTex = createFriedTexture(37, { base: [214, 168, 98], speck: [146, 100, 48], light: [240, 200, 128] });
    const chanaTex = createFriedTexture(53, { base: [160, 110, 55], speck: [92, 58, 26], light: [196, 148, 84], dimples: true });
    const boondiTex = createFriedTexture(67, { base: [206, 136, 46], speck: [118, 74, 28], light: [232, 186, 104] });
    const papdiTex = createFriedTexture(79, { base: [204, 152, 82], speck: [130, 86, 38], light: [236, 192, 120] });

    // 5. Namkeen geometries
    const sevGeo = createSevGeometry();
    const chakliGeo = createChakliGeometry();
    const mathriGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.11, 28);
    const chanaGeo = new THREE.SphereGeometry(0.15, 12, 10);
    const boondiGeo = new THREE.SphereGeometry(0.07, 8, 6);
    const papdiGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.06, 28);
    const spiceGeo = new THREE.IcosahedronGeometry(0.14, 0);

    const mats = {
      sev: new THREE.MeshStandardMaterial({ map: sevTex, bumpMap: sevTex, bumpScale: 0.045, roughness: 0.5, metalness: 0.04 }),
      chakli: new THREE.MeshStandardMaterial({ map: chakliTex, bumpMap: chakliTex, bumpScale: 0.05, roughness: 0.52, metalness: 0.04 }),
      mathri: new THREE.MeshStandardMaterial({ map: mathriTex, bumpMap: mathriTex, bumpScale: 0.04, roughness: 0.58, metalness: 0.03 }),
      chana: new THREE.MeshStandardMaterial({ map: chanaTex, bumpMap: chanaTex, bumpScale: 0.08, roughness: 0.62, metalness: 0.03 }),
      boondi: new THREE.MeshStandardMaterial({ map: boondiTex, bumpMap: boondiTex, bumpScale: 0.05, roughness: 0.55, metalness: 0.04 }),
      papdi: new THREE.MeshStandardMaterial({ map: papdiTex, bumpMap: papdiTex, bumpScale: 0.04, roughness: 0.56, metalness: 0.03 }),
      spiceGreen: new THREE.MeshStandardMaterial({ color: 0x1f7a33, roughness: 0.4, metalness: 0.15 }),
      spiceRed: new THREE.MeshStandardMaterial({ color: 0xb3261e, roughness: 0.45, metalness: 0.1 }),
      spiceGold: new THREE.MeshStandardMaterial({ color: 0xd4a545, roughness: 0.3, metalness: 0.5 }),
    };

    // 6. Composition — weights shift toward the selected namkeen variant
    const defs: PieceDef[] = (() => {
      const sev = { geo: sevGeo, mat: mats.sev, scaleMin: 0.9, scaleMax: 1.15 };
      const chakli = { geo: chakliGeo, mat: mats.chakli, flat: true, scaleMin: 0.78, scaleMax: 1.0 };
      const mathri = { geo: mathriGeo, mat: mats.mathri, flat: true, scaleMin: 0.72, scaleMax: 0.95 };
      const chana = { geo: chanaGeo, mat: mats.chana, scaleMin: 0.7, scaleMax: 1.15 };
      const boondi = { geo: boondiGeo, mat: mats.boondi, scaleMin: 0.55, scaleMax: 1.1 };
      const papdi = { geo: papdiGeo, mat: mats.papdi, flat: true, scaleMin: 0.8, scaleMax: 1.05 };
      const spiceG = { geo: spiceGeo, mat: mats.spiceGreen, scaleMin: 0.6, scaleMax: 1.0 };
      const spiceR = { geo: spiceGeo, mat: mats.spiceRed, scaleMin: 0.6, scaleMax: 0.9 };
      const spiceGold = { geo: spiceGeo, mat: mats.spiceGold, scaleMin: 0.5, scaleMax: 0.85 };

      switch (variant) {
        case "sev":
          return [sev, sev, sev, chakli, mathri, chana, chana, boondi, papdi, spiceG, spiceR, spiceGold];
        case "chakli":
          return [chakli, chakli, chakli, sev, mathri, chana, boondi, boondi, papdi, spiceG, spiceR, spiceGold];
        case "mathri":
          return [mathri, mathri, mathri, sev, chakli, chana, boondi, papdi, papdi, spiceG, spiceR, spiceGold];
        default:
          return [chakli, chakli, sev, sev, mathri, mathri, chana, chana, boondi, boondi, papdi, spiceG, spiceR, spiceGold];
      }
    })();

    interface Piece {
      mesh: THREE.Mesh;
      baseY: number;
      phase: number;
      speed: number;
      rotSpeed: THREE.Vector3;
    }

    const pieces: Piece[] = [];
    const pieceCount = 96;
    for (let i = 0; i < pieceCount; i++) {
      const def = defs[i % defs.length];
      const mesh = new THREE.Mesh(def.geo, def.mat);

      // Radial distribution; pieces mound toward the center so the bowl
      // looks heaped above the rim, with a few floating for dynamism
      const r = Math.sqrt(Math.random()) * 1.75;
      const theta = Math.random() * Math.PI * 2;
      const x = Math.cos(theta) * r;
      const z = Math.sin(theta) * r;
      const mound = (1.75 - r) / 1.75; // 0 at rim edge → 1 at center
      const y =
        i % 6 === 0
          ? 1.5 + Math.random() * 1.1 // floating above the heap
          : -1.35 + mound * 2.3 + (Math.random() - 0.5) * 0.28;

      mesh.position.set(x, y, z);

      // Flat pieces (chakli, mathri, papdi) lie horizontal; the rest tumble freely
      if (def.flat) {
        mesh.rotation.set((Math.random() - 0.5) * 0.3, Math.random() * Math.PI * 2, (Math.random() - 0.5) * 0.3);
      } else {
        mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      }

      const s = def.scaleMin + Math.random() * (def.scaleMax - def.scaleMin);
      mesh.scale.set(s, s, s);

      world.add(mesh);
      pieces.push({
        mesh,
        baseY: y,
        phase: Math.random() * Math.PI * 2,
        speed: 0.8 + Math.random() * 1.4,
        rotSpeed: new THREE.Vector3(
          (Math.random() - 0.5) * (def.flat ? 0.18 : 0.5),
          (Math.random() - 0.5) * (def.flat ? 0.18 : 0.5),
          (Math.random() - 0.5) * (def.flat ? 0.18 : 0.5)
        ),
      });
    }

    // 7. Golden spice sparkle particles orbiting the bowl
    const particleCount = 80;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    const pCol = new Float32Array(particleCount * 3);
    const gold = new THREE.Color("#fbbf24");
    const emerald = new THREE.Color("#34d399");
    const amber = new THREE.Color("#f59e0b");

    for (let i = 0; i < particleCount; i++) {
      const r = 2.4 + Math.random() * 2.2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pPos[i * 3 + 1] = r * Math.cos(phi) - 0.4;
      pPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = Math.random() > 0.6 ? emerald : Math.random() > 0.5 ? gold : amber;
      pCol[i * 3] = c.r;
      pCol[i * 3 + 1] = c.g;
      pCol[i * 3 + 2] = c.b;
    }
    pGeo.setAttribute("position", new THREE.BufferAttribute(pPos, 3));
    pGeo.setAttribute("color", new THREE.BufferAttribute(pCol, 3));

    const pCanvas = document.createElement("canvas");
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext("2d");
    if (pCtx) {
      const grad = pCtx.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(251,191,36,0.9)");
      grad.addColorStop(0.7, "rgba(217,119,6,0.35)");
      grad.addColorStop(1, "rgba(0,0,0,0)");
      pCtx.fillStyle = grad;
      pCtx.fillRect(0, 0, 64, 64);
    }
    const pTex = new THREE.CanvasTexture(pCanvas);
    const pMat = new THREE.PointsMaterial({
      size: 1.1,
      vertexColors: true,
      map: pTex,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const particles = new THREE.Points(pGeo, pMat);
    world.add(particles);

    // 8. Lighting — warm gold key + emerald rim + soft top fill
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0xffc873, 55, 30);
    keyLight.position.set(5, 6, 6);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0x34d399, 26, 26);
    rimLight.position.set(-5, -3, 4);
    scene.add(rimLight);

    const fillLight = new THREE.PointLight(0xfff3d6, 16, 20);
    fillLight.position.set(0, -4, -6);
    scene.add(fillLight);

    const topLight = new THREE.DirectionalLight(0xffd9a0, 1.1);
    topLight.position.set(3, 8, 4);
    scene.add(topLight);

    // 9. Interaction — drag to rotate (mouse only) + idle pointer parallax
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let userRotY = 0;
    let userRotX = 0;
    let px = 0;
    let py = 0;
    let tpx = 0;
    let tpy = 0;

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      container.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      tpx = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
      tpy = ((e.clientY - rect.top) / rect.height - 0.5) * 2;

      if (dragging && e.pointerType === "mouse") {
        const dx = e.clientX - lastX;
        const dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        userRotY += dx * 0.008;
        userRotX = THREE.MathUtils.clamp(userRotX + dy * 0.004, -0.45, 0.45);
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      if (container.hasPointerCapture(e.pointerId)) container.releasePointerCapture(e.pointerId);
    };

    container.addEventListener("pointerdown", handlePointerDown);
    container.addEventListener("pointermove", handlePointerMove);
    container.addEventListener("pointerup", handlePointerUp);
    container.addEventListener("pointercancel", handlePointerUp);

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 360;
      height = container.clientHeight || 420;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    window.addEventListener("resize", handleResize);

    // 11. Pause offscreen
    let isVisible = true;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
        });
      },
      { threshold: 0.05 }
    );
    observer.observe(container);

    // 12. Render loop
    let animId: number;
    const clock = new THREE.Clock();

    if (reducedMotion) {
      // Static single frame, no animation loop
      world.rotation.y = 0.4;
      renderer.render(scene, camera);
    } else {
      const animate = () => {
        animId = requestAnimationFrame(animate);
        if (!isVisible) return;

        const delta = Math.min(clock.getDelta(), 0.05);
        const t = clock.getElapsedTime();

        px += (tpx - px) * 0.06;
        py += (tpy - py) * 0.06;

        // Auto-rotate + user drag
        world.rotation.y = userRotY + t * (autoRotate ? 0.28 : 0.06);
        world.rotation.x = THREE.MathUtils.clamp(userRotX + px * 0.1, -0.5, 0.5);

        // Piece bobbing + slow tumble
        pieces.forEach((piece) => {
          piece.mesh.position.y = piece.baseY + Math.sin(t * piece.speed + piece.phase) * 0.07;
          piece.mesh.rotation.x += piece.rotSpeed.x * delta;
          piece.mesh.rotation.y += piece.rotSpeed.y * delta;
          piece.mesh.rotation.z += piece.rotSpeed.z * delta;
        });

        // Particle drift
        particles.rotation.y = t * 0.04;

        // Camera parallax sway
        camera.position.x = px * 0.7;
        camera.position.y = 1.5 - py * 0.5;
        camera.lookAt(0, 0.2, 0);

        renderer.render(scene, camera);
      };
      animate();
    }

    return () => {
      cancelAnimationFrame(animId);
      observer.disconnect();
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", handlePointerUp);
      container.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("resize", handleResize);

      bowlGeo.dispose();
      bowlMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      sevGeo.dispose();
      chakliGeo.dispose();
      mathriGeo.dispose();
      chanaGeo.dispose();
      boondiGeo.dispose();
      papdiGeo.dispose();
      spiceGeo.dispose();
      [sevTex, chakliTex, mathriTex, chanaTex, boondiTex, papdiTex].forEach((tex) => tex.dispose());
      Object.values(mats).forEach((m) => m.dispose());
      pGeo.dispose();
      pMat.dispose();
      pTex.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate, variant]);

  return <div ref={containerRef} className={`relative w-full h-full min-h-[300px] touch-pan-y select-none ${className}`} />;
}
