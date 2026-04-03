import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { getThreatLevel } from '../../hooks/useColorCode';

const EARTH_RADIUS = 5;

function ldToScene(ld) {
  // 1 LD = 1.8 scene units so objects are visible but not too spread
  return EARTH_RADIUS + ld * 1.8;
}

export default function Globe({ objects, selectedObject, onSelectObject }) {
  const mountRef = useRef(null);
  const stateRef = useRef({});
  const [webglAvailable, setWebglAvailable] = useState(true);

  useEffect(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) { setWebglAvailable(false); return; }

    const mount = mountRef.current;
    if (!mount) return;
    const W = mount.clientWidth;
    const H = mount.clientHeight;

    // ── Renderer ──────────────────────────────────────────────────────────────
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    mount.appendChild(renderer.domElement);

    // ── Scene / Camera ────────────────────────────────────────────────────────
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x010a18);

    const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 2000);
    camera.position.set(0, 5, 22);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 8;
    controls.maxDistance = 120;
    controls.autoRotate = false;

    // ── Stars ─────────────────────────────────────────────────────────────────
    {
      const geo = new THREE.BufferGeometry();
      const count = 4000;
      const pos = new Float32Array(count * 3);
      const sizes = new Float32Array(count);
      for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = 500 + Math.random() * 200;
        pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        sizes[i] = Math.random() < 0.05 ? 2.5 : 0.8 + Math.random() * 1.2;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
      scene.add(new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.85 })));
    }

    // ── Lights ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x112244, 2.5));
    const sunLight = new THREE.DirectionalLight(0xfff5e0, 3.5);
    sunLight.position.set(60, 25, 40);
    scene.add(sunLight);
    // Subtle fill from opposite side (earthshine)
    const fillLight = new THREE.DirectionalLight(0x224466, 0.5);
    fillLight.position.set(-40, -10, -30);
    scene.add(fillLight);

    // ── Earth ─────────────────────────────────────────────────────────────────
    const loader = new THREE.TextureLoader();
    const earthGeo = new THREE.SphereGeometry(EARTH_RADIUS, 64, 64);

    const earthMat = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      specular: new THREE.Color(0x333333),
      shininess: 15,
    });

    const earth = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earth);

    // Load textures — assign as they arrive so Earth is never just a placeholder
    // import.meta.env.BASE_URL resolves to /Dampe/neo-sentinel/ on GitHub Pages
    const base = import.meta.env.BASE_URL;
    loader.load(`${base}textures/earth_daymap.jpg`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      earthMat.map = tex;
      earthMat.needsUpdate = true;
    });
    loader.load(`${base}textures/earth_specular.jpg`, (tex) => {
      earthMat.specularMap = tex;
      earthMat.specular = new THREE.Color(0x888888);
      earthMat.shininess = 25;
      earthMat.needsUpdate = true;
    });
    loader.load(`${base}textures/earth_normal.jpg`, (tex) => {
      earthMat.normalMap = tex;
      earthMat.normalScale = new THREE.Vector2(0.6, 0.6);
      earthMat.needsUpdate = true;
    });

    // ── Atmosphere glow ───────────────────────────────────────────────────────
    // Outer glow using a slightly larger sphere with additive blending
    const atmMat = new THREE.MeshPhongMaterial({
      color: 0x4488ff,
      emissive: new THREE.Color(0x112244),
      transparent: true,
      opacity: 0.12,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(new THREE.SphereGeometry(EARTH_RADIUS * 1.04, 64, 64), atmMat));

    // Thicker haze ring at limb (backside glow)
    const hazeGeo = new THREE.SphereGeometry(EARTH_RADIUS * 1.08, 64, 64);
    const hazeMat = new THREE.MeshPhongMaterial({
      color: 0x2255cc,
      transparent: true,
      opacity: 0.05,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    scene.add(new THREE.Mesh(hazeGeo, hazeMat));

    // ── Moon orbit ring ───────────────────────────────────────────────────────
    const moonR = ldToScene(1) - EARTH_RADIUS; // radius from Earth center
    const moonRingGeo = new THREE.RingGeometry(
      EARTH_RADIUS + moonR - 0.04,
      EARTH_RADIUS + moonR + 0.04,
      128
    );
    const moonRingMat = new THREE.MeshBasicMaterial({
      color: 0x334466,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const moonRingMesh = new THREE.Mesh(moonRingGeo, moonRingMat);
    moonRingMesh.rotation.x = Math.PI / 2;
    scene.add(moonRingMesh);

    // Moon orbit label
    {
      const lc = document.createElement('canvas');
      lc.width = 320; lc.height = 36;
      const ctx = lc.getContext('2d');
      ctx.fillStyle = 'rgba(100,140,200,0.9)';
      ctx.font = '15px monospace';
      ctx.fillText("Moon's Orbit (1 LD = 384,400 km)", 6, 24);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true }));
      sprite.position.set(EARTH_RADIUS + moonR + 0.5, 0.4, 0);
      sprite.scale.set(5.5, 0.62, 1);
      scene.add(sprite);
    }

    // ── NEO markers ───────────────────────────────────────────────────────────
    const markerGroup = new THREE.Group();
    scene.add(markerGroup);
    const markerMeshes = [];

    objects.slice(0, 50).forEach((neo, i) => {
      const threat = getThreatLevel(neo.distLd);
      const color = new THREE.Color(threat.color);

      // Use displayDistLd for positioning — CAD objects use actual distance,
      // Sentry-only objects use a nominal spread distance
      const posDistLd = neo.displayDistLd ?? 25;
      const angle = (i / Math.min(objects.length, 50)) * Math.PI * 2;
      const inclination = (Math.random() - 0.5) * Math.PI * 0.4;
      const distScene = Math.min(ldToScene(posDistLd), 90);

      const x = distScene * Math.cos(angle) * Math.cos(inclination);
      const y = distScene * Math.sin(inclination);
      const z = distScene * Math.sin(angle) * Math.cos(inclination);

      // Size: clamp between 0.12 and 0.45 scene units
      const sizeFactor = neo.diameterM
        ? Math.max(0.12, Math.min(0.45, Math.log10(neo.diameterM + 1) * 0.15))
        : 0.2;

      // Glow sprite behind the dot
      const glowCanvas = document.createElement('canvas');
      glowCanvas.width = 64; glowCanvas.height = 64;
      const gc = glowCanvas.getContext('2d');
      const grad = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, threat.color + 'ff');
      grad.addColorStop(0.3, threat.color + '88');
      grad.addColorStop(1, threat.color + '00');
      gc.fillStyle = grad;
      gc.fillRect(0, 0, 64, 64);
      const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }));
      glowSprite.scale.set(sizeFactor * 4, sizeFactor * 4, 1);

      // Core dot
      const dotGeo = new THREE.SphereGeometry(sizeFactor, 12, 12);
      const dotMat = new THREE.MeshBasicMaterial({ color });
      const mesh = new THREE.Mesh(dotGeo, dotMat);
      mesh.position.set(x, y, z);
      mesh.userData = { neo };
      mesh.add(glowSprite);
      markerGroup.add(mesh);

      // Pulsing ring for Sentry objects
      if (neo.sentry) {
        const ringGeo = new THREE.RingGeometry(sizeFactor * 1.8, sizeFactor * 2.6, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0xff3333,
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.userData.isSentryRing = true;
        mesh.add(ring);
      }

      // Label
      const lc = document.createElement('canvas');
      lc.width = 220; lc.height = 30;
      const lctx = lc.getContext('2d');
      lctx.fillStyle = threat.color;
      lctx.font = 'bold 13px monospace';
      lctx.fillText(neo.des, 4, 20);
      const labelSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(lc), transparent: true }));
      labelSprite.scale.set(3.2, 0.44, 1);
      labelSprite.position.set(0, sizeFactor + 0.5, 0);
      mesh.add(labelSprite);

      markerMeshes.push(mesh);
    });

    stateRef.current.markerMeshes = markerMeshes;
    stateRef.current.defaultCameraPos = camera.position.clone();

    // ── Raycasting ────────────────────────────────────────────────────────────
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    function onClick(e) {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const hits = raycaster.intersectObjects(markerMeshes);
      if (hits.length > 0) onSelectObject(hits[0].object.userData.neo);
    }

    function onDblClick() {
      camera.position.set(0, 5, 22);
      controls.reset();
    }

    mount.addEventListener('click', onClick);
    mount.addEventListener('dblclick', onDblClick);

    // ── Resize ────────────────────────────────────────────────────────────────
    function onResize() {
      const W2 = mount.clientWidth, H2 = mount.clientHeight;
      camera.aspect = W2 / H2;
      camera.updateProjectionMatrix();
      renderer.setSize(W2, H2);
    }
    window.addEventListener('resize', onResize);

    // ── Animation loop ────────────────────────────────────────────────────────
    const isMobile = window.innerWidth < 768;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frameId;
    let t = 0;
    let last = 0;
    const targetFps = isMobile ? 30 : 60;

    function animate(now) {
      frameId = requestAnimationFrame(animate);
      if (now - last < 1000 / targetFps) return;
      last = now;
      t += 0.016;

      if (!reducedMotion) {
        earth.rotation.y += 0.0008;
      }

      // Pulse sentry rings + billboard labels toward camera
      markerMeshes.forEach((mesh) => {
        mesh.children.forEach((child) => {
          if (child.userData.isSentryRing) {
            child.material.opacity = 0.4 + 0.4 * Math.sin(t * 2.5);
            child.lookAt(camera.position);
          }
        });
      });

      controls.update();
      renderer.render(scene, camera);
    }
    frameId = requestAnimationFrame(animate);

    stateRef.current.renderer = renderer;
    stateRef.current.cleanup = () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', onResize);
      mount.removeEventListener('click', onClick);
      mount.removeEventListener('dblclick', onDblClick);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };

    return () => stateRef.current.cleanup?.();
  }, [objects]);

  // Highlight selected object
  useEffect(() => {
    const meshes = stateRef.current.markerMeshes;
    if (!meshes) return;
    meshes.forEach((mesh) => {
      const isSelected = mesh.userData.neo?.des === selectedObject?.des;
      mesh.scale.setScalar(isSelected ? 2.2 : 1);
    });
  }, [selectedObject]);

  if (!webglAvailable) {
    return <FallbackMap objects={objects} onSelectObject={onSelectObject} />;
  }

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label={`3D interactive globe — ${objects.length} objects displayed`}
        role="img"
      />
      <div className="absolute bottom-4 right-4 text-xs text-gray-600 pointer-events-none">
        Double-click to reset · Drag to rotate · Scroll to zoom
      </div>
    </div>
  );
}

function FallbackMap({ objects, onSelectObject }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gray-950 p-6">
      <div className="text-gray-400 mb-4 text-sm">WebGL unavailable — proximity table</div>
      <div className="overflow-auto w-full max-w-2xl">
        <table className="w-full text-xs text-gray-300 border-collapse">
          <thead>
            <tr className="text-gray-500 border-b border-gray-700">
              <th className="text-left py-2 px-3">Object</th>
              <th className="text-right py-2 px-3">Distance (LD)</th>
              <th className="text-right py-2 px-3">Velocity (km/s)</th>
            </tr>
          </thead>
          <tbody>
            {objects.map((o) => (
              <tr key={o.des} className="border-b border-gray-800 hover:bg-gray-800 cursor-pointer" onClick={() => onSelectObject(o)}>
                <td className="py-1.5 px-3">{o.name || o.des}</td>
                <td className="py-1.5 px-3 text-right font-mono">{o.distLd.toFixed(2)}</td>
                <td className="py-1.5 px-3 text-right font-mono">{o.v_rel?.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
