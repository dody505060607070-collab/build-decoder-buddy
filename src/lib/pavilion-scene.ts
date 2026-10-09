// Browser-only: Three.js scene for the Digitmask pavilion. Import dynamically after hydration.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Water } from "three/addons/objects/Water.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import skyUrl from "@/assets/pavilion/sky.jpg";
import webUrl from "@/assets/pavilion/service-web.jpg";
import systemsUrl from "@/assets/pavilion/service-systems.jpg";
import aiUrl from "@/assets/pavilion/service-ai.jpg";
import marketingUrl from "@/assets/pavilion/service-marketing.jpg";

export type View = "home" | "services" | "contact";
export const SERVICE_IMAGES = [webUrl, systemsUrl, aiUrl, marketingUrl];

const VIEWS: Record<View, { position: number[]; target: number[] }> = {
  home: { position: [0, 2.6, 15], target: [0, 2.8, -6] },
  services: { position: [0, -5, 8], target: [0, -5.2, -3] },
  contact: { position: [-11, 2.2, 9], target: [-11, 1.7, 3] },
};
// Services dives through the pool surface into the underwater gallery.
const ROUTES: Record<"services" | "contact", { seconds: number; points: number[][] }> = {
  services: { seconds: 4, points: [[0, 2.6, 15], [0, 2, 11], [0, 0.9, 8], [0, -1.2, 6.5], [0, -3.8, 7], [0, -5, 8]] },
  contact: { seconds: 2.8, points: [[0, 2.6, 15], [-3, 2.4, 12], [-6, 2.2, 8], [-7, 2.2, 5], [-10, 2.2, 6], [-11, 2.2, 9]] },
};
const v3 = (p: number[]) => new THREE.Vector3(p[0], p[1], p[2]);
const UNDER_Y = 0.05;

function isWeakDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (nav.deviceMemory ?? 8) <= 4;
}

function glowSprite() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, "rgba(255,255,255,1)"); r.addColorStop(0.3, "rgba(255,220,240,.6)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function particles(count: number, box: THREE.Box3, color: number, size: number, sprite: THREE.Texture) {
  const pos = new Float32Array(count * 3), size3 = box.getSize(new THREE.Vector3());
  for (let i = 0; i < count; i++) {
    pos[i * 3] = box.min.x + Math.random() * size3.x;
    pos[i * 3 + 1] = box.min.y + Math.random() * size3.y;
    pos[i * 3 + 2] = box.min.z + Math.random() * size3.z;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({ color, size, map: sprite, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const pts = new THREE.Points(geo, mat);
  pts.userData["box"] = box;
  return pts;
}

export function createPavilion(canvas: HTMLCanvasElement, opts: { onLoaded: () => void; onService: (i: number) => void; onUnderwater: (u: boolean) => void }) {
  const mobile = isWeakDevice();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.9;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const skyColor = new THREE.Color(0x4a1d5e);
  scene.background = skyColor;
  const airFog = new THREE.Fog(0x7a2f62, 30, 90);
  const waterFog = new THREE.FogExp2(0x2a0d55, 0.07);
  scene.fog = airFog;
  let skyTex: THREE.Texture | null = null;
  new THREE.TextureLoader().load(skyUrl, (t) => {
    t.mapping = THREE.EquirectangularReflectionMapping;
    t.colorSpace = THREE.SRGBColorSpace;
    skyTex = t;
    scene.background = t;
    scene.environment = pmrem.fromEquirectangular(t).texture;
    scene.environmentIntensity = 0.8;
  });

  scene.add(new THREE.HemisphereLight(0xe6c9ff, 0x2a1530, 1.1));
  const sun = new THREE.DirectionalLight(0xffa86b, 2.6); sun.position.set(-8, 10, -30); scene.add(sun);
  const pink = new THREE.PointLight(0xc026d3, 40, 26); pink.position.set(0, 4, -4); scene.add(pink);
  const amber = new THREE.PointLight(0xff7a1a, 25, 20); amber.position.set(8, 3, 6); scene.add(amber);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.05, 300);
  const target = v3(VIEWS.home.target);
  camera.position.copy(v3(VIEWS.home.position));

  const sprite = glowSprite();
  const fireflies = particles(mobile ? 120 : 300, new THREE.Box3(v3([-16, 0.3, -14]), v3([16, 7, 16])), 0xffc6a0, 0.12, sprite);
  scene.add(fireflies);

  // ---------- Underwater gallery ----------
  const under = new THREE.Group();
  scene.add(under);
  const caustic = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }",
    fragmentShader: `uniform float time; varying vec2 vUv;
      float c(vec2 p){ float v=0.; for(int i=0;i<3;i++){ p=p*1.6+vec2(sin(p.y+time*.6),cos(p.x+time*.5)); v+=abs(sin(p.x)*cos(p.y)); } return v/3.; }
      void main(){ vec2 p=vUv*14.; float k=pow(1.-c(p),6.)*1.6; vec3 base=mix(vec3(.10,.04,.22),vec3(.28,.08,.30),vUv.y);
        float fade=smoothstep(.0,.35,vUv.y)*smoothstep(1.,.65,vUv.y)*smoothstep(0.,.3,vUv.x)*smoothstep(1.,.7,vUv.x);
        gl_FragColor=vec4(base+k*vec3(1.,.55,.85)*fade,1.); }`,
  });
  const seabed = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), caustic);
  seabed.rotation.x = -Math.PI / 2; seabed.position.y = -9; under.add(seabed);
  // surface seen from below
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshBasicMaterial({ color: 0xff8fd0, transparent: true, opacity: 0.6, side: THREE.BackSide, fog: false }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = -0.02; under.add(surface);
  // light shafts
  for (let i = 0; i < 7; i++) {
    const shaft = new THREE.Mesh(
      new THREE.ConeGeometry(1.2 + Math.random(), 10, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: i % 2 ? 0xc026d3 : 0xff9a5a, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    shaft.position.set(-9 + i * 3, -4.5, -5 + Math.random() * 5);
    shaft.rotation.z = (Math.random() - 0.5) * 0.3;
    under.add(shaft);
  }
  const bubbles = particles(mobile ? 150 : 400, new THREE.Box3(v3([-12, -9, -10]), v3([12, -0.3, 8])), 0xffd8f0, 0.08, sprite);
  under.add(bubbles);

  const loader = new THREE.TextureLoader();
  const panels: THREE.Mesh[] = [];
  SERVICE_IMAGES.forEach((url, i) => {
    const tex = loader.load(url); tex.colorSpace = THREE.SRGBColorSpace;
    const g = new THREE.Group();
    const angle = (i - 1.5) * 0.42;
    g.position.set(Math.sin(angle) * 9, -5, -3 + (1 - Math.cos(angle)) * 6 - 0);
    g.rotation.y = -angle;
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 2.7), new THREE.MeshBasicMaterial({ color: [0x6d28d9, 0xc026d3, 0xff7a1a, 0xc026d3][i]!, transparent: true, opacity: 0.85 }));
    frame.position.z = -0.02;
    const img = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 2.5), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    img.userData["service"] = i;
    g.add(frame, img);
    g.userData["phase"] = i * 1.3;
    under.add(g);
    panels.push(img);
  });

  let water: Water | undefined;
  let basin: THREE.Object3D | undefined;
  let current: View = "home";
  let travel: ((d: number) => boolean) | null = null;
  const queue: View[] = [];

  new GLTFLoader().load(`/models/digitmask-pavilion${mobile ? "-mobile" : ""}.glb`, (gltf) => {
    gltf.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial | undefined;
      if (!m || !("roughness" in m)) return;
      if (m.emissive && m.emissive.getHex() !== 0) m.emissiveIntensity = 3;
      else if (/Arch|Portal|Rib/.test(o.name)) { m.metalness = 0.9; m.roughness = 0.18; }
      else if (/Floor|Promenade|Courtyard|End/.test(o.name)) { m.metalness = 0.2; m.roughness = 0.35; }
    });
    scene.add(gltf.scene);
    basin = gltf.scene.getObjectByName("Pool_Basin");
    const ph = gltf.scene.getObjectByName("Water_Surface_Runtime_Replace");
    if (ph) {
      ph.visible = false;
      const size = 256, px = new Uint8Array(size * size * 4);
      for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4, a = (x / size) * Math.PI * 2, b = (y / size) * Math.PI * 2;
        px[i] = 128 + Math.round(50 * Math.sin(a * 3 + b * 2) + 30 * Math.sin(a * 7 - b * 5));
        px[i + 1] = 128 + Math.round(50 * Math.cos(b * 3 - a) + 30 * Math.cos(b * 6 + a * 4));
        px[i + 2] = 255; px[i + 3] = 255;
      }
      const normal = new THREE.DataTexture(px, size, size);
      normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.needsUpdate = true;
      water = new Water(new THREE.PlaneGeometry(11.8, 17.8), {
        textureWidth: mobile ? 256 : 512, textureHeight: mobile ? 256 : 512, waterNormals: normal,
        sunDirection: sun.position.clone().normalize(), sunColor: 0xffc08a, waterColor: 0x3a1450, distortionScale: 1.4, fog: true,
      });
      water.rotation.x = -Math.PI / 2; water.position.y = -0.006;
      scene.add(water);
    }
    opts.onLoaded();
  });

  // ---------- post ----------
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.82);
  if (!mobile) composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function makeTravel(points: number[][], dest: number[], seconds: number) {
    const startT = target.clone(), endT = v3(dest);
    const pts = points.map(v3); pts[0] = camera.position.clone();
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    let t0 = 0;
    return (d: number) => {
      t0 += d;
      const t = Math.min(1, t0 / seconds), e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
      camera.position.copy(curve.getPointAt(e));
      target.lerpVectors(startT, endT, e);
      return t === 1;
    };
  }
  function step(to: View) {
    if (reduced) { camera.position.copy(v3(VIEWS[to].position)); target.copy(v3(VIEWS[to].target)); current = to; return; }
    if (to === "home" && current !== "home") {
      const r = ROUTES[current];
      travel = makeTravel([...r.points].reverse(), VIEWS.home.target, r.seconds);
    } else if (to !== "home") {
      const r = ROUTES[to];
      travel = makeTravel(r.points, VIEWS[to].target, r.seconds);
    }
    current = to;
  }
  function goTo(to: View) {
    queue.length = 0;
    if (to === current) return;
    if (current !== "home" && to !== "home") queue.push("home", to); else queue.push(to);
    if (!travel) step(queue.shift()!);
  }

  const pointer = new THREE.Vector2(), smooth = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  let hovered = -1;
  const onMove = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  };
  const onClick = () => { if (hovered >= 0 && !travel) opts.onService(hovered); };
  addEventListener("pointermove", onMove);
  canvas.addEventListener("click", onClick);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h); bloom.resolution.set(w, h);
    camera.aspect = w / h; camera.fov = h > w ? 58 : 48; camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize); resize();

  const clock = new THREE.Clock();
  const look = new THREE.Vector3(), sway = new THREE.Vector3();
  let wasUnder = false;
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    const d = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    if (travel && travel(d)) { travel = null; if (queue.length) step(queue.shift()!); }

    smooth.lerp(travel ? new THREE.Vector2() : pointer, 1 - Math.exp(-3 * d));
    sway.set(Math.sin(t * 0.3) * 0.08 + smooth.x * 0.35, Math.sin(t * 0.4) * 0.05 + smooth.y * 0.2, 0);
    look.copy(target).add(sway).add(new THREE.Vector3(smooth.x * 0.9, smooth.y * 0.4, 0));
    camera.lookAt(look);

    const isUnder = camera.position.y < UNDER_Y;
    if (isUnder !== wasUnder) {
      wasUnder = isUnder;
      scene.fog = isUnder ? waterFog : airFog;
      scene.background = isUnder ? new THREE.Color(0x1e0a3c) : skyTex ?? skyColor;
      if (water) water.visible = !isUnder;
      if (basin) basin.visible = !isUnder;
      fireflies.visible = !isUnder;
      opts.onUnderwater(isUnder);
    }
    under.visible = isUnder || camera.position.y < 3;

    // animate
    caustic.uniforms["time"]!.value = t;
    if (water) water.material.uniforms["time"]!.value += d * 0.5;
    const fp = fireflies.geometry.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < fp.count; i++) fp.setY(i, fp.getY(i) + Math.sin(t + i) * 0.002);
    fp.needsUpdate = true;
    const bp = bubbles.geometry.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < bp.count; i++) {
      let y = bp.getY(i) + d * (0.4 + (i % 5) * 0.12);
      if (y > -0.3) y = -9;
      bp.setY(i, y); bp.setX(i, bp.getX(i) + Math.sin(t * 2 + i) * 0.003);
    }
    bp.needsUpdate = true;
    under.children.forEach((c) => { if (c.userData["phase"] !== undefined) c.position.y = -5 + Math.sin(t * 0.8 + c.userData["phase"]) * 0.15; });

    // hover
    hovered = -1;
    if (isUnder && !travel) {
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(panels)[0];
      if (hit) hovered = hit.object.userData["service"];
    }
    panels.forEach((p, i) => { const s = p.parent!.scale.x + ((hovered === i ? 1.08 : 1) - p.parent!.scale.x) * 0.1; p.parent!.scale.setScalar(s); });
    canvas.style.cursor = hovered >= 0 ? "pointer" : "";

    composer.render();
  });

  return {
    goTo,
    dispose() {
      renderer.setAnimationLoop(null);
      removeEventListener("pointermove", onMove); removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
      composer.dispose(); renderer.dispose(); pmrem.dispose();
    },
  };
}
