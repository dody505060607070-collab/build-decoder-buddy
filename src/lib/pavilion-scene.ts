// Browser-only: Three.js scene for the Digitmask pavilion. Import dynamically after hydration.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Water } from "three/addons/objects/Water.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

export type View = "home" | "services" | "contact";

const VIEWS: Record<View, { position: number[]; target: number[] }> = {
  home: { position: [0, 2.6, 15], target: [0, 2.8, -6] },
  services: { position: [11, 2.1, -2], target: [11, 2.3, -10] },
  contact: { position: [-11, 2.2, 9], target: [-11, 1.7, 3] },
};
const ROUTES: Record<"services" | "contact", { seconds: number; points: number[][] }> = {
  services: { seconds: 3.2, points: [[0, 2.6, 15], [2, 2.4, 8], [5, 2.2, 1], [7, 2.1, -3], [10, 2.1, -4], [11, 2.1, -2]] },
  contact: { seconds: 2.8, points: [[0, 2.6, 15], [-3, 2.4, 12], [-6, 2.2, 8], [-7, 2.2, 5], [-10, 2.2, 6], [-11, 2.2, 9]] },
};
const v3 = (p: number[]) => new THREE.Vector3(p[0], p[1], p[2]);

function isWeakDevice() {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (nav.deviceMemory ?? 8) <= 4 || navigator.hardwareConcurrency <= 4;
}

export function createPavilion(
  canvas: HTMLCanvasElement,
  opts: { onLoaded: () => void; onProgress: (p: number) => void; onService: (i: number) => void },
) {
  const mobile = isWeakDevice();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile });
  renderer.setPixelRatio(Math.min(devicePixelRatio, mobile ? 1.25 : 1.5));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  // Dusk gradient sky
  const sky = document.createElement("canvas");
  sky.width = 2; sky.height = 256;
  const g = sky.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, "#1a1030"); grad.addColorStop(0.45, "#6d28d9"); grad.addColorStop(0.7, "#c026d3"); grad.addColorStop(1, "#ff7a1a");
  g.fillStyle = grad; g.fillRect(0, 0, 2, 256);
  const skyTex = new THREE.CanvasTexture(sky); skyTex.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTex;
  scene.fog = new THREE.Fog(0x3a1a4a, 25, 70);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight(0xd9c9f5, 0x221722, 1.6));
  const sun = new THREE.DirectionalLight(0xffbe8a, 3); sun.position.set(-15, 12, -20); scene.add(sun);
  const fill = new THREE.PointLight(0xc026d3, 30, 30); fill.position.set(0, 4, 2); scene.add(fill);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  const target = v3(VIEWS.home.target);
  camera.position.copy(v3(VIEWS.home.position));
  camera.lookAt(target);

  let water: Water | undefined;
  let hotspots: THREE.Object3D[] = [];
  let current: View = "home";
  let travel: ((d: number) => boolean) | null = null;
  const queue: View[] = [];

  new GLTFLoader().load(
    `/models/digitmask-pavilion${mobile ? "-mobile" : ""}.glb`,
    (gltf) => {
      scene.add(gltf.scene);
      const ph = gltf.scene.getObjectByName("Water_Surface_Runtime_Replace");
      if (ph && !mobile) {
        ph.visible = false;
        const size = 128, px = new Uint8Array(size * size * 4);
        for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
          const i = (y * size + x) * 4;
          px[i] = 128 + Math.round(18 * Math.sin(x * 0.2 + y * 0.1));
          px[i + 1] = 128 + Math.round(18 * Math.cos(y * 0.15 - x * 0.07));
          px[i + 2] = 255; px[i + 3] = 255;
        }
        const normal = new THREE.DataTexture(px, size, size);
        normal.wrapS = normal.wrapT = THREE.RepeatWrapping; normal.needsUpdate = true;
        water = new Water(new THREE.PlaneGeometry(11.8, 17.8), {
          textureWidth: 512, textureHeight: 512, waterNormals: normal,
          sunDirection: new THREE.Vector3(-0.4, 0.75, 0.5).normalize(),
          sunColor: 0xffbc82, waterColor: 0x30233d, distortionScale: 0.6, fog: true,
        });
        water.rotation.x = -Math.PI / 2; water.position.y = -0.006;
        scene.add(water);
      }
      hotspots = [0, 1, 2, 3].flatMap((i) => {
        const o = gltf.scene.getObjectByName(`Service_Display_${i}`);
        if (!o) return [];
        // larger invisible hitbox
        const box = new THREE.Box3().setFromObject(o);
        const s = box.getSize(new THREE.Vector3()).addScalar(0.6);
        const hit = new THREE.Mesh(new THREE.BoxGeometry(s.x, s.y, s.z), new THREE.MeshBasicMaterial({ visible: false }));
        box.getCenter(hit.position);
        hit.userData.service = i;
        scene.add(hit);
        return [hit];
      });
      opts.onLoaded();
    },
    (e) => e.total && opts.onProgress(e.loaded / e.total),
  );

  function makeTravel(points: number[][], dest: number[], seconds: number) {
    const startT = target.clone(), endT = v3(dest);
    const pts = points.map(v3); pts[0] = camera.position.clone();
    const curve = new THREE.CatmullRomCurve3(pts, false, "centripetal");
    let t0 = 0;
    return (d: number) => {
      t0 += d;
      const t = Math.min(1, t0 / seconds), e = t * t * t * (t * (t * 6 - 15) + 10);
      camera.position.copy(curve.getPointAt(e));
      target.lerpVectors(startT, endT, e);
      return t === 1;
    };
  }

  function step(to: View) {
    if (reduced) {
      camera.position.copy(v3(VIEWS[to].position)); target.copy(v3(VIEWS[to].target)); current = to; return;
    }
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
    const from = travel ? queue[queue.length - 1] ?? current : current;
    if (to === from) return;
    if (from !== "home" && to !== "home") queue.push("home", to);
    else queue.push(to);
    if (!travel) step(queue.shift()!);
  }

  const pointer = new THREE.Vector2(), smooth = new THREE.Vector2();
  const ray = new THREE.Raycaster();
  const onMove = (e: PointerEvent) => {
    pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  };
  const onClick = () => {
    if (!hotspots.length || travel) return;
    ray.setFromCamera(pointer, camera);
    const hit = ray.intersectObjects(hotspots)[0];
    if (hit) opts.onService(hit.object.userData.service);
  };
  addEventListener("pointermove", onMove);
  canvas.addEventListener("click", onClick);

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.fov = h > w ? 58 : 48; camera.updateProjectionMatrix();
  };
  addEventListener("resize", resize); resize();

  const clock = new THREE.Clock();
  const look = new THREE.Vector3();
  renderer.setAnimationLoop(() => {
    if (document.hidden) return;
    const d = Math.min(clock.getDelta(), 0.05);
    if (travel && travel(d)) { travel = null; if (queue.length) step(queue.shift()!); }
    smooth.lerp(travel ? new THREE.Vector2() : pointer, 0.05);
    look.copy(target).add(new THREE.Vector3(smooth.x * 0.8, smooth.y * 0.4, 0));
    camera.lookAt(look);
    if (water) water.material.uniforms.time.value += d * 0.4;
    renderer.render(scene, camera);
  });

  return {
    goTo,
    dispose() {
      renderer.setAnimationLoop(null);
      removeEventListener("pointermove", onMove); removeEventListener("resize", resize);
      canvas.removeEventListener("click", onClick);
      renderer.dispose(); pmrem.dispose();
    },
  };
}
