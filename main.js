import * as THREE from 'three';

// --- Scene Setup ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d4e8f7');
scene.fog = new THREE.FogExp2('#d4e8f7', 0.0032);

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.4,
  550
);

// TPP Camera Settings (BGMI / GTA Style)
const TPP_DISTANCE = 8.5;
const TPP_HEIGHT = 3.6;
const currentCameraLookAt = new THREE.Vector3(0, 1.2, 0);

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance'
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xbbf7d0, 0.45);
hemiLight.position.set(0, 100, 0);
scene.add(hemiLight);

// Sunlight (optimized 1024x1024 shadow map)
const dirLight = new THREE.DirectionalLight(0xfff7e6, 1.6);
dirLight.position.set(70, 120, 60);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 1.0;
dirLight.shadow.camera.far = 350;
const d = 75;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x90caf9, 0.35);
fillLight.position.set(-50, 40, -50);
scene.add(fillLight);

// --- Procedural Textures & Graphics Assets ---
const grassPalette = [
  '#3d7a1c', '#468b21', '#356917', '#4f9b26',
  '#59a72c', '#305f15', '#62b531', '#3e7d1d'
];

function createMinecraftGrassTopTexture(repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      ctx.fillStyle = grassPalette[Math.floor(Math.random() * grassPalette.length)];
      ctx.fillRect(x, y, 1, 1);
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  return texture;
}

// Realistic High-Detail Asphalt Surface Texture (Noise-grained, no baked lines)
function createCleanAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Deep rich asphalt base
  ctx.fillStyle = '#222831';
  ctx.fillRect(0, 0, 256, 256);

  // Surface texture / granular asphalt grit
  for (let i = 0; i < 2200; i++) {
    const gx = Math.random() * 256;
    const gy = Math.random() * 256;
    ctx.fillStyle = Math.random() > 0.5 ? '#1a1f26' : '#2b333e';
    ctx.fillRect(gx, gy, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

// Dynamic Signboard Canvas Texture Generator with Zone Page Name
function createSignboardTexture(zone) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Outer border & dark background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 256);

  // Border frame
  ctx.strokeStyle = zone.color || '#38bdf8';
  ctx.lineWidth = 8;
  ctx.strokeRect(6, 6, 500, 244);

  // Top header bar
  ctx.fillStyle = zone.color || '#38bdf8';
  ctx.fillRect(10, 10, 492, 54);

  // Header Zone Tag
  ctx.fillStyle = '#0f172a';
  ctx.font = '800 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`◆ ZONE 0${zone.id} CHECKPOINT ◆`, 256, 37);

  // Main Zone Page Name
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 36px "Plus Jakarta Sans", sans-serif';
  ctx.shadowColor = zone.color || '#38bdf8';
  ctx.shadowBlur = 12;
  ctx.fillText(zone.name.toUpperCase(), 256, 115);
  ctx.shadowBlur = 0;

  // Subtitle / page description
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(zone.desc, 256, 160);

  // Action status pill
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.beginPath();
  ctx.roundRect(30, 192, 452, 44, 10);
  ctx.fill();

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('⚡ ENTER CIRCLE TO OPEN PAGE 📄', 256, 214);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Floating 3D Text Label Billboard (Faces camera from all angles)
function createZoneFloatingBillboard(zone) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext('2d');

  // Glowing rounded badge
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.beginPath();
  ctx.roundRect(8, 12, 496, 116, 58);
  ctx.fill();

  ctx.strokeStyle = zone.color || '#38bdf8';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Zone icon + text
  ctx.fillStyle = '#ffffff';
  ctx.font = '800 38px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = zone.color || '#38bdf8';
  ctx.shadowBlur = 10;
  ctx.fillText(`${zone.icon} [Zone ${zone.id}] ${zone.name}`, 256, 70);

  const texture = new THREE.CanvasTexture(canvas);
  const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(spriteMat);
  sprite.scale.set(5.2, 1.4, 1);
  sprite.position.set(0, 3.6, 0);
  return sprite;
}

// 1. Infinite Horizon Ground Plane
const INFINITE_MAP_SIZE = 1400;
const groundGeo = new THREE.PlaneGeometry(INFINITE_MAP_SIZE, INFINITE_MAP_SIZE);
const groundMat = new THREE.MeshStandardMaterial({
  map: createMinecraftGrassTopTexture(INFINITE_MAP_SIZE / 2, INFINITE_MAP_SIZE / 2),
  roughness: 0.88,
  metalness: 0.05
});
const infiniteGround = new THREE.Mesh(groundGeo, groundMat);
infiniteGround.rotation.x = -Math.PI / 2;
infiniteGround.position.y = 0;
infiniteGround.receiveShadow = true;
scene.add(infiniteGround);

// ==========================================
// EXPANDED ROAD NETWORK CONFIGURATION
// Spacious roads, wider tracks, expansive grid
// ==========================================
const PATH_WIDTH = 9.8; // Expanded wide road for smooth driving
const ROAD_HALF_WIDTH = PATH_WIDTH / 2; // 4.9m
const RING_DIST = 36.0; // Expanded outer ring (50% larger world exploration)
const PAD_RADIUS = 5.2; // Expanded large destination checkpoint circle
const INVISIBLE_BARRIER_LIMIT = 58.0; // Expanded map bounds

// 10 Comprehensive Destination Zones Configuration
const ZONES = [
  { id: 1, name: "Home / Welcome", desc: "Main entry plaza & interactive overview", icon: "🏠", x: -RING_DIST, z: -RING_DIST, color: "#06b6d4", file: "pages/home.html", tags: ["Entry Plaza", "Intro", "Overview"] },
  { id: 2, name: "About Me", desc: "Personal story, developer philosophy & journey", icon: "👤", x: RING_DIST, z: -RING_DIST, color: "#a855f7", file: "pages/about.html", tags: ["Biography", "Background", "Story"] },
  { id: 3, name: "Projects", desc: "Showcase of web apps, 3D builds & live repositories", icon: "🚀", x: -RING_DIST, z: RING_DIST, color: "#10b981", file: "pages/projects.html", tags: ["Portfolio", "Three.js", "Web3"] },
  { id: 4, name: "Contact Us", desc: "Social handles, inquiry form & direct connection", icon: "✉️", x: RING_DIST, z: RING_DIST, color: "#f97316", file: "pages/contact.html", tags: ["Hire Me", "Email", "Socials"] },
  { id: 5, name: "Skills / Stack", desc: "Fullstack engineering, frontend & 3D frameworks", icon: "⚡", x: 0, z: -48, color: "#eab308", file: "pages/skills.html", tags: ["JavaScript", "WebGL", "CSS3"] },
  { id: 6, name: "Experience", desc: "Career timeline, company roles & accomplishments", icon: "💼", x: 0, z: 48, color: "#ec4899", file: "pages/experience.html", tags: ["Timeline", "Roles", "History"] },
  { id: 7, name: "Services", desc: "Custom web development, 3D graphics & UI architecture", icon: "🛠️", x: -48, z: 0, color: "#14b8a6", file: "pages/services.html", tags: ["Design", "Fullstack", "Speed"] },
  { id: 8, name: "Testimonials", desc: "Client reviews, ratings & verified recommendations", icon: "⭐", x: 48, z: 0, color: "#6366f1", file: "pages/testimonials.html", tags: ["Reviews", "5-Star", "Trust"] },
  { id: 9, name: "Gallery / Media", desc: "Visual gallery, screenshots & interactive media", icon: "🎨", x: -18, z: -18, color: "#f43f5e", file: "pages/gallery.html", tags: ["Renders", "Media", "Art"] },
  { id: 10, name: "Achievements", desc: "Certifications, awards, hackathons & milestones", icon: "🏆", x: 18, z: 18, color: "#84cc16", file: "pages/achievements.html", tags: ["Awards", "Milestones", "Trophy"] }
];

// Road Network Construction (Seamless Asphalt Slabs + Anti-Aliased Vector Markings)
const roadNetworkGroup = new THREE.Group();

const asphaltMat = new THREE.MeshStandardMaterial({
  map: createCleanAsphaltTexture(),
  roughness: 0.85,
  metalness: 0.08
});

// Crisp, flicker-free vector markings (depthWrite: false completely stops z-fighting and shimmering)
const roadWhiteLineMat = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  depthWrite: false
});

const roadYellowLineMat = new THREE.MeshBasicMaterial({
  color: 0xfacc15,
  depthWrite: false
});

function addRoadSlab(w, h, x, z) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, asphaltMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.02, z);
  mesh.receiveShadow = true;
  roadNetworkGroup.add(mesh);
}

// Solid white edge lines along road borders
function addRoadEdgeLines(cx, cz, length, isVertical = false) {
  const inset = ROAD_HALF_WIDTH - 0.45; // 4.45m from center
  const lineWidth = 0.32; // Solid 32cm wide line

  if (isVertical) {
    [-inset, inset].forEach(ox => {
      const geo = new THREE.PlaneGeometry(lineWidth, length);
      const mesh = new THREE.Mesh(geo, roadWhiteLineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cx + ox, 0.023, cz);
      roadNetworkGroup.add(mesh);
    });
  } else {
    [-inset, inset].forEach(oz => {
      const geo = new THREE.PlaneGeometry(length, lineWidth);
      const mesh = new THREE.Mesh(geo, roadWhiteLineMat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(cx, 0.023, cz + oz);
      roadNetworkGroup.add(mesh);
    });
  }
}

// Evenly-spaced, rock-solid yellow dashed center lines
function addRoadCenterDashes(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  const dist = Math.hypot(dx, dz);
  const isVert = Math.abs(dz) > Math.abs(dx);
  const dashLen = 2.2;
  const gapLen = 1.8;
  const cycle = dashLen + gapLen;
  const count = Math.max(1, Math.floor(dist / cycle));
  const offset = (dist - (count * cycle - gapLen)) / 2;

  for (let i = 0; i < count; i++) {
    const t = (offset + i * cycle + dashLen / 2) / dist;
    const mx = x1 + dx * t;
    const mz = z1 + dz * t;
    const geo = new THREE.PlaneGeometry(isVert ? 0.32 : dashLen, isVert ? dashLen : 0.32);
    const mesh = new THREE.Mesh(geo, roadYellowLineMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(mx, 0.023, mz);
    roadNetworkGroup.add(mesh);
  }
}

// Crisp pedestrian zebra crosswalks
function addCrosswalk(cx, cz, isVertical = false) {
  const barW = 0.52;
  const barL = 2.4;
  const step = 0.88;
  const count = 7;
  const start = -((count - 1) * step) / 2;

  for (let i = 0; i < count; i++) {
    const shift = start + i * step;
    const bx = isVertical ? cx : cx + shift;
    const bz = isVertical ? cz + shift : cz;
    const geo = new THREE.PlaneGeometry(isVertical ? barL : barW, isVertical ? barW : barL);
    const mesh = new THREE.Mesh(geo, roadWhiteLineMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(bx, 0.024, bz);
    roadNetworkGroup.add(mesh);
  }
}

// 1. All 9 Strategic Intersection Slabs (PATH_WIDTH x PATH_WIDTH)
addRoadSlab(PATH_WIDTH, PATH_WIDTH, 0, 0); // Center Hub
addRoadSlab(PATH_WIDTH, PATH_WIDTH, 0, -RING_DIST); // North Cross
addRoadSlab(PATH_WIDTH, PATH_WIDTH, 0, RING_DIST); // South Cross
addRoadSlab(PATH_WIDTH, PATH_WIDTH, -RING_DIST, 0); // West Cross
addRoadSlab(PATH_WIDTH, PATH_WIDTH, RING_DIST, 0); // East Cross
addRoadSlab(PATH_WIDTH, PATH_WIDTH, -RING_DIST, -RING_DIST); // Top-Left Plaza
addRoadSlab(PATH_WIDTH, PATH_WIDTH, RING_DIST, -RING_DIST); // Top-Right Plaza
addRoadSlab(PATH_WIDTH, PATH_WIDTH, -RING_DIST, RING_DIST); // Bottom-Left Plaza
addRoadSlab(PATH_WIDTH, PATH_WIDTH, RING_DIST, RING_DIST); // Bottom-Right Plaza

// 2. Main Crossroads Between Intersections
const INNER_SPAN = RING_DIST - PATH_WIDTH; // 26.2m
const INNER_MID = (ROAD_HALF_WIDTH + (RING_DIST - ROAD_HALF_WIDTH)) / 2; // 18.0m

// Inner North Road
addRoadSlab(PATH_WIDTH, INNER_SPAN, 0, -INNER_MID);
addRoadEdgeLines(0, -INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(0, -ROAD_HALF_WIDTH - 0.2, 0, -RING_DIST + ROAD_HALF_WIDTH + 0.2);

// Inner South Road
addRoadSlab(PATH_WIDTH, INNER_SPAN, 0, INNER_MID);
addRoadEdgeLines(0, INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(0, ROAD_HALF_WIDTH + 0.2, 0, RING_DIST - ROAD_HALF_WIDTH - 0.2);

// Inner West Road
addRoadSlab(INNER_SPAN, PATH_WIDTH, -INNER_MID, 0);
addRoadEdgeLines(-INNER_MID, 0, INNER_SPAN, false);
addRoadCenterDashes(-ROAD_HALF_WIDTH - 0.2, 0, -RING_DIST + ROAD_HALF_WIDTH + 0.2, 0);

// Inner East Road
addRoadSlab(INNER_SPAN, PATH_WIDTH, INNER_MID, 0);
addRoadEdgeLines(INNER_MID, 0, INNER_SPAN, false);
addRoadCenterDashes(ROAD_HALF_WIDTH + 0.2, 0, RING_DIST - ROAD_HALF_WIDTH - 0.2, 0);

// Outer Extensions (From Ring Crossroads to Hub Limits at 54m)
const OUTER_START = RING_DIST + ROAD_HALF_WIDTH; // 40.9m
const OUTER_LEN = 54.0 - OUTER_START; // 13.1m
const OUTER_MID = (OUTER_START + 54.0) / 2; // 47.45m

addRoadSlab(PATH_WIDTH, OUTER_LEN, 0, -OUTER_MID);
addRoadEdgeLines(0, -OUTER_MID, OUTER_LEN, true);
addRoadCenterDashes(0, -OUTER_START, 0, -54.0);

addRoadSlab(PATH_WIDTH, OUTER_LEN, 0, OUTER_MID);
addRoadEdgeLines(0, OUTER_MID, OUTER_LEN, true);
addRoadCenterDashes(0, OUTER_START, 0, 54.0);

addRoadSlab(OUTER_LEN, PATH_WIDTH, -OUTER_MID, 0);
addRoadEdgeLines(-OUTER_MID, 0, OUTER_LEN, false);
addRoadCenterDashes(-OUTER_START, 0, -54.0, 0);

addRoadSlab(OUTER_LEN, PATH_WIDTH, OUTER_MID, 0);
addRoadEdgeLines(OUTER_MID, 0, OUTER_LEN, false);
addRoadCenterDashes(OUTER_START, 0, 54.0, 0);

// 3. Outer Ring Road Connectors (Connecting Plazas to Crossroads)
addRoadSlab(INNER_SPAN, PATH_WIDTH, -INNER_MID, -RING_DIST);
addRoadEdgeLines(-INNER_MID, -RING_DIST, INNER_SPAN, false);
addRoadCenterDashes(-RING_DIST + ROAD_HALF_WIDTH + 0.2, -RING_DIST, -ROAD_HALF_WIDTH - 0.2, -RING_DIST);

addRoadSlab(INNER_SPAN, PATH_WIDTH, INNER_MID, -RING_DIST);
addRoadEdgeLines(INNER_MID, -RING_DIST, INNER_SPAN, false);
addRoadCenterDashes(ROAD_HALF_WIDTH + 0.2, -RING_DIST, RING_DIST - ROAD_HALF_WIDTH - 0.2, -RING_DIST);

addRoadSlab(INNER_SPAN, PATH_WIDTH, -INNER_MID, RING_DIST);
addRoadEdgeLines(-INNER_MID, RING_DIST, INNER_SPAN, false);
addRoadCenterDashes(-RING_DIST + ROAD_HALF_WIDTH + 0.2, RING_DIST, -ROAD_HALF_WIDTH - 0.2, RING_DIST);

addRoadSlab(INNER_SPAN, PATH_WIDTH, INNER_MID, RING_DIST);
addRoadEdgeLines(INNER_MID, RING_DIST, INNER_SPAN, false);
addRoadCenterDashes(ROAD_HALF_WIDTH + 0.2, RING_DIST, RING_DIST - ROAD_HALF_WIDTH - 0.2, RING_DIST);

addRoadSlab(PATH_WIDTH, INNER_SPAN, -RING_DIST, -INNER_MID);
addRoadEdgeLines(-RING_DIST, -INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(-RING_DIST, -RING_DIST + ROAD_HALF_WIDTH + 0.2, -RING_DIST, -ROAD_HALF_WIDTH - 0.2);

addRoadSlab(PATH_WIDTH, INNER_SPAN, -RING_DIST, INNER_MID);
addRoadEdgeLines(-RING_DIST, INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(-RING_DIST, ROAD_HALF_WIDTH + 0.2, -RING_DIST, RING_DIST - ROAD_HALF_WIDTH - 0.2);

addRoadSlab(PATH_WIDTH, INNER_SPAN, RING_DIST, -INNER_MID);
addRoadEdgeLines(RING_DIST, -INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(RING_DIST, -RING_DIST + ROAD_HALF_WIDTH + 0.2, RING_DIST, -ROAD_HALF_WIDTH - 0.2);

addRoadSlab(PATH_WIDTH, INNER_SPAN, RING_DIST, INNER_MID);
addRoadEdgeLines(RING_DIST, INNER_MID, INNER_SPAN, true);
addRoadCenterDashes(RING_DIST, ROAD_HALF_WIDTH + 0.2, RING_DIST, RING_DIST - ROAD_HALF_WIDTH - 0.2);

// 4. Branch Lanes to Zones 9 (-18, -18) & Zone 10 (18, 18)
addRoadSlab(PATH_WIDTH * 0.9, PATH_WIDTH * 0.9, -18, -18);
addRoadSlab(PATH_WIDTH * 0.9, 18 - PATH_WIDTH * 0.95, -18, -9);
addRoadSlab(18 - PATH_WIDTH * 0.95, PATH_WIDTH * 0.9, -9, 0);

addRoadSlab(PATH_WIDTH * 0.9, PATH_WIDTH * 0.9, 18, 18);
addRoadSlab(PATH_WIDTH * 0.9, 18 - PATH_WIDTH * 0.95, 18, 9);
addRoadSlab(18 - PATH_WIDTH * 0.95, PATH_WIDTH * 0.9, 9, 0);

// 5. High-Visibility Zebra Crosswalks at Center Crossroads & Key Hubs
addCrosswalk(0, -ROAD_HALF_WIDTH, false); // Center Hub North entrance
addCrosswalk(0, ROAD_HALF_WIDTH, false); // Center Hub South entrance
addCrosswalk(-ROAD_HALF_WIDTH, 0, true); // Center Hub West entrance
addCrosswalk(ROAD_HALF_WIDTH, 0, true); // Center Hub East entrance

scene.add(roadNetworkGroup);

// Road collision check helper
function isPointOnRoad(x, z, margin = 0.0) {
  if (Math.abs(x) > INVISIBLE_BARRIER_LIMIT || Math.abs(z) > INVISIBLE_BARRIER_LIMIT) {
    return false;
  }

  const rw = ROAD_HALF_WIDTH - margin;

  // 1. Central horizontal main road (-54 to +54)
  if (Math.abs(z) <= rw && Math.abs(x) <= 54.0) return true;

  // 2. Central vertical main road (-54 to +54)
  if (Math.abs(x) <= rw && Math.abs(z) <= 54.0) return true;

  // 3. Outer Ring Top
  if (Math.abs(z - (-RING_DIST)) <= rw && Math.abs(x) <= RING_DIST + rw) return true;

  // 4. Outer Ring Bottom
  if (Math.abs(z - RING_DIST) <= rw && Math.abs(x) <= RING_DIST + rw) return true;

  // 5. Outer Ring Left
  if (Math.abs(x - (-RING_DIST)) <= rw && Math.abs(z) <= RING_DIST + rw) return true;

  // 6. Outer Ring Right
  if (Math.abs(x - RING_DIST) <= rw && Math.abs(z) <= RING_DIST + rw) return true;

  // 7. Branch path to Zone 9 (-18, -18)
  if (Math.abs(x - (-18)) <= rw && z >= -18 - rw && z <= rw) return true;
  if (Math.abs(z - 0) <= rw && x >= -18 - rw && x <= rw) return true;

  // 8. Branch path to Zone 10 (18, 18)
  if (Math.abs(x - 18) <= rw && z >= -rw && z <= 18 + rw) return true;
  if (Math.abs(z - 0) <= rw && x >= -rw && x <= 18 + rw) return true;

  // 9. Central Junction Circle
  if (x * x + z * z <= (PATH_WIDTH * 1.1) * (PATH_WIDTH * 1.1)) return true;

  // 10. Check all 10 Destination Pads
  for (const zone of ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (dx * dx + dz * dz <= (PAD_RADIUS + 0.4) * (PAD_RADIUS + 0.4)) {
      return true;
    }
  }

  return false;
}

// ==========================================
// 3. 10 DESTINATION CHECKPOINT CIRCLES
// (With pulsing neon rings, light beams & named signboards)
// ==========================================
const padBaseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.5 });
const postMetalMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.8 });

const zoneBeacons = [];
const zoneNeonRings = [];
const zoneLightPillars = [];

ZONES.forEach(zone => {
  const padGroup = new THREE.Group();
  padGroup.position.set(zone.x, 0.02, zone.z);

  // 1. Dark Brushed Metallic Platform
  const padGeo = new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.1, 36);
  const padMesh = new THREE.Mesh(padGeo, padBaseMat);
  padMesh.receiveShadow = true;
  padGroup.add(padMesh);

  // 2. Concentric Inner Cyber Ring
  const innerRingGeo = new THREE.TorusGeometry(PAD_RADIUS * 0.65, 0.08, 8, 36);
  const innerRingMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(zone.color),
    emissive: new THREE.Color(zone.color),
    emissiveIntensity: 0.6
  });
  const innerRingMesh = new THREE.Mesh(innerRingGeo, innerRingMat);
  innerRingMesh.rotation.x = Math.PI / 2;
  innerRingMesh.position.y = 0.06;
  padGroup.add(innerRingMesh);

  // 3. Pulsing Outer Neon Checkpoint Ring
  const ringGeo = new THREE.TorusGeometry(PAD_RADIUS + 0.06, 0.16, 12, 48);
  const neonMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(zone.color),
    emissive: new THREE.Color(zone.color),
    emissiveIntensity: 1.5,
    roughness: 0.2
  });
  const ringMesh = new THREE.Mesh(ringGeo, neonMat);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.07;
  padGroup.add(ringMesh);
  zoneNeonRings.push(neonMat);

  // 4. Vertical Holographic Light Beam (Shoots into the sky)
  const beamGeo = new THREE.CylinderGeometry(PAD_RADIUS * 0.9, PAD_RADIUS * 0.9, 14, 32, 1, true);
  const beamMat = new THREE.MeshBasicMaterial({
    color: new THREE.Color(zone.color),
    transparent: true,
    opacity: 0.14,
    side: THREE.DoubleSide,
    depthWrite: false
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = 7.0;
  padGroup.add(beamMesh);
  zoneLightPillars.push(beamMesh);

  // 5. Sturdy Double-Post Signboard with Zone Page Name
  const signAngle = Math.atan2(-zone.x, -zone.z); // Facing toward approach road
  const signGroup = new THREE.Group();
  signGroup.position.set(Math.cos(signAngle) * 3.6, 0, Math.sin(signAngle) * 3.6);
  signGroup.rotation.y = signAngle + Math.PI / 2;

  // Dual metal posts
  const postL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), postMetalMat);
  postL.position.set(-1.1, 1.1, 0);
  postL.castShadow = true;
  signGroup.add(postL);

  const postR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8), postMetalMat);
  postR.position.set(1.1, 1.1, 0);
  postR.castShadow = true;
  signGroup.add(postR);

  // Cross Support Bar
  const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), postMetalMat);
  crossBar.position.set(0, 1.0, 0);
  signGroup.add(crossBar);

  // High-Resolution Named Signboard Mesh (Double-Sided)
  const signTexture = createSignboardTexture(zone);
  const boardMatFront = new THREE.MeshStandardMaterial({
    map: signTexture,
    roughness: 0.3,
    metalness: 0.2
  });
  const boardMatBack = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7
  });

  const boardMaterials = [
    boardMatBack, boardMatBack, // left, right
    boardMatBack, boardMatBack, // top, bottom
    boardMatFront, boardMatFront // front, back
  ];

  const boardMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.3, 0.12), boardMaterials);
  boardMesh.position.set(0, 1.7, 0);
  boardMesh.castShadow = true;
  signGroup.add(boardMesh);

  // Signboard Mesh (emissive label materials provide glow without expensive PointLights)
  padGroup.add(signGroup);

  // 6. Floating 3D Holographic Label Billboard above beacon
  const billboard = createZoneFloatingBillboard(zone);
  padGroup.add(billboard);

  // 7. Rotating Diamond Crystal Beacon
  const beaconGeo = new THREE.OctahedronGeometry(0.55, 0);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(zone.color),
    emissive: new THREE.Color(zone.color),
    emissiveIntensity: 1.2,
    roughness: 0.1,
    metalness: 0.9
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 2.0, 0);
  padGroup.add(beacon);
  zoneBeacons.push(beacon);

  scene.add(padGroup);
});

// ==========================================
// SCENIC ENVIRONMENT ENHANCEMENTS
// Voxel clouds in sky, streetlamps, flowers
// ==========================================

// 1. Drifting Voxel Clouds (Optimized Lambert material)
const clouds = [];
const cloudMat = new THREE.MeshLambertMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.88
});

function createVoxelCloud() {
  const cloudGroup = new THREE.Group();
  const numBlocks = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < numBlocks; i++) {
    const bw = 5 + Math.random() * 8;
    const bh = 2 + Math.random() * 2.5;
    const bd = 4 + Math.random() * 6;
    const block = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), cloudMat);
    block.position.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 6);
    cloudGroup.add(block);
  }
  return cloudGroup;
}

for (let i = 0; i < 10; i++) {
  const cloud = createVoxelCloud();
  cloud.position.set(
    (Math.random() - 0.5) * 320,
    38 + Math.random() * 25,
    (Math.random() - 0.5) * 320
  );
  scene.add(cloud);
  clouds.push({ mesh: cloud, speed: 0.02 + Math.random() * 0.03 });
}

// 2. Curbside Streetlights along crossroads (Emissive lantern glow without costly PointLights)
function createStreetlight(x, z, rotY = 0) {
  const lightGroup = new THREE.Group();
  lightGroup.position.set(x, 0, z);
  lightGroup.rotation.y = rotY;

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 4.2, 8), postMetalMat);
  pole.position.y = 2.1;
  pole.castShadow = true;
  lightGroup.add(pole);

  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.1), postMetalMat);
  arm.position.set(0.5, 4.1, 0);
  lightGroup.add(arm);

  const lantern = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.3, 0.3),
    new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xfef08a, emissiveIntensity: 2.0 })
  );
  lantern.position.set(1.0, 3.9, 0);
  lightGroup.add(lantern);

  scene.add(lightGroup);
}

// Place streetlights at key road intervals
[
  [12, ROAD_HALF_WIDTH + 1.2, Math.PI / 2],
  [-12, -ROAD_HALF_WIDTH - 1.2, -Math.PI / 2],
  [ROAD_HALF_WIDTH + 1.2, 12, 0],
  [-ROAD_HALF_WIDTH - 1.2, -12, Math.PI],
  [28, ROAD_HALF_WIDTH + 1.2, Math.PI / 2],
  [-28, -ROAD_HALF_WIDTH - 1.2, -Math.PI / 2],
  [ROAD_HALF_WIDTH + 1.2, 28, 0],
  [-ROAD_HALF_WIDTH - 1.2, -28, Math.PI]
].forEach(p => createStreetlight(p[0], p[1], p[2]));

// ==========================================
// 4. STYLIZED LOW-POLY NATURE TREES (Aesthetic GUI Design)
// Rich faceted foliage clusters, tapered trunks & vibrant biomes
// ==========================================
const woodBarkMat = new THREE.MeshLambertMaterial({ color: 0x422918, flatShading: true });

// Palettes: 0: Lush Emerald, 1: Golden Autumn, 2: Cherry Blossom Sakura
const treePalettes = [
  {
    c1: new THREE.MeshLambertMaterial({ color: 0x15803d, flatShading: true }),
    c2: new THREE.MeshLambertMaterial({ color: 0x16a34a, flatShading: true }),
    c3: new THREE.MeshLambertMaterial({ color: 0x22c55e, flatShading: true })
  },
  {
    c1: new THREE.MeshLambertMaterial({ color: 0xb45309, flatShading: true }),
    c2: new THREE.MeshLambertMaterial({ color: 0xd97706, flatShading: true }),
    c3: new THREE.MeshLambertMaterial({ color: 0xf59e0b, flatShading: true })
  },
  {
    c1: new THREE.MeshLambertMaterial({ color: 0xdb2777, flatShading: true }),
    c2: new THREE.MeshLambertMaterial({ color: 0xec4899, flatShading: true }),
    c3: new THREE.MeshLambertMaterial({ color: 0xf472b6, flatShading: true })
  }
];

function buildStylizedLowPolyTree(scale = 1.0, typeIndex = 0) {
  const tree = new THREE.Group();
  const pal = treePalettes[typeIndex % treePalettes.length];

  // 1. Tapered Woody Trunk with angled bark facets
  const trunkGeo = new THREE.CylinderGeometry(0.28 * scale, 0.58 * scale, 3.4 * scale, 7);
  const trunk = new THREE.Mesh(trunkGeo, woodBarkMat);
  trunk.position.y = (3.4 * scale) / 2;
  trunk.castShadow = true;
  tree.add(trunk);

  // 2. Flared Root Spurs at the base
  for (let r = 0; r < 3; r++) {
    const rootGeo = new THREE.BoxGeometry(0.32 * scale, 0.5 * scale, 0.7 * scale);
    const root = new THREE.Mesh(rootGeo, woodBarkMat);
    const angle = (r * Math.PI * 2) / 3;
    root.position.set(Math.cos(angle) * 0.42 * scale, 0.25 * scale, Math.sin(angle) * 0.42 * scale);
    root.rotation.y = angle;
    root.rotation.x = 0.25;
    tree.add(root);
  }

  // 3. Faceted Low-Poly Foliage Canopy (Multi-cluster organic crown)
  // Main Center Canopy Cluster
  const mainGeo = new THREE.IcosahedronGeometry(1.85 * scale, 0);
  const mainCanopy = new THREE.Mesh(mainGeo, pal.c1);
  mainCanopy.position.set(0, 3.2 * scale, 0);
  mainCanopy.rotation.set(0.2, 0.4, 0.1);
  mainCanopy.castShadow = true;
  tree.add(mainCanopy);

  // Left Canopy Lobe
  const leftGeo = new THREE.IcosahedronGeometry(1.35 * scale, 0);
  const leftCanopy = new THREE.Mesh(leftGeo, pal.c2);
  leftCanopy.position.set(-0.85 * scale, 3.1 * scale, 0.45 * scale);
  leftCanopy.rotation.set(-0.3, 0.6, 0.2);
  leftCanopy.castShadow = true;
  tree.add(leftCanopy);

  // Right Canopy Lobe
  const rightGeo = new THREE.IcosahedronGeometry(1.4 * scale, 0);
  const rightCanopy = new THREE.Mesh(rightGeo, pal.c2);
  rightCanopy.position.set(0.85 * scale, 3.3 * scale, -0.35 * scale);
  rightCanopy.rotation.set(0.4, -0.5, -0.1);
  rightCanopy.castShadow = true;
  tree.add(rightCanopy);

  // Front Sub-Lobe
  const frontGeo = new THREE.IcosahedronGeometry(1.15 * scale, 0);
  const frontCanopy = new THREE.Mesh(frontGeo, pal.c3);
  frontCanopy.position.set(0.25 * scale, 2.7 * scale, 0.85 * scale);
  frontCanopy.rotation.set(-0.2, 0.3, -0.4);
  tree.add(frontCanopy);

  // Top Sunlit Crown Crest
  const topGeo = new THREE.IcosahedronGeometry(1.25 * scale, 0);
  const topCanopy = new THREE.Mesh(topGeo, pal.c3);
  topCanopy.position.set(0, 4.3 * scale, 0);
  topCanopy.rotation.set(0.3, -0.2, 0.4);
  topCanopy.castShadow = true;
  tree.add(topCanopy);

  return tree;
}

// Generate 32 stylized trees safely in grass areas (strictly outside roads & pads)
const treePositions = [];
for (let i = 0; i < 32; i++) {
  const tx = (Math.random() - 0.5) * 80;
  const tz = (Math.random() - 0.5) * 80;

  // Verify tree is on grass, away from roads & pads (margin 3.5m)
  if (!isPointOnRoad(tx, tz, -1.8)) {
    const scale = 0.88 + Math.random() * 0.42;
    const treeType = i % 3; // Evenly distribute Lush Green, Golden Autumn, and Sakura trees
    const tree = buildStylizedLowPolyTree(scale, treeType);
    tree.position.set(tx, 0, tz);
    tree.rotation.y = Math.random() * Math.PI * 2;
    scene.add(tree);
    treePositions.push({ x: tx, z: tz, radius: 1.4 * scale });
  }
}

// ==========================================
// 5. MOVING NPC CARS WITH REACTIVE COLLISION
// (Red Safari Jeeps & Sky-Blue Voxel Trucks)
// ==========================================
function createWheelMesh(radius, width, rimColor = 0x94a3b8) {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, width, 16),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
  );
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  g.add(tire);
  return g;
}

// Red Safari Jeep Model
function buildRedJeep() {
  const car = new THREE.Group();
  const wheels = [];
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.35 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.7 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, transparent: true, opacity: 0.7 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.45, 4.2), darkMat);
  chassis.position.y = 0.55;
  chassis.castShadow = true;
  car.add(chassis);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.65, 3.8), bodyMat);
  body.position.set(0, 0.95, 0);
  body.castShadow = true;
  car.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.8, 2.0), bodyMat);
  cabin.position.set(0, 1.55, -0.35);
  car.add(cabin);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 1.8), glassMat);
  glass.position.set(0, 1.55, -0.2);
  car.add(glass);

  // Front Headlights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 0.8 });
  [-0.65, 0.65].forEach(lx => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.08), headMat);
    light.position.set(lx, 0.95, 1.92);
    car.add(light);
  });

  // Rear Tail & Brake Lights (emissive intensity adjusts dynamically on braking)
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff1e1e, emissive: 0xdc2626, emissiveIntensity: 0.35 });
  [-0.7, 0.7].forEach(lx => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.22, 0.08), brakeMat);
    light.position.set(lx, 0.95, -1.92);
    car.add(light);
  });

  [[-1.08, 0.48, 1.25], [1.08, 0.48, 1.25], [-1.08, 0.48, -1.25], [1.08, 0.48, -1.25]].forEach(p => {
    const w = createWheelMesh(0.48, 0.35);
    w.position.set(p[0], p[1], p[2]);
    car.add(w);
    wheels.push(w);
  });
  return { car, wheels, brakeMat };
}

// Sky-Blue Voxel Pickup Truck Model
function buildVoxelTruck() {
  const car = new THREE.Group();
  const wheels = [];
  const cyanMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.65 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.2 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.4, 4.4), darkMat);
  chassis.position.y = 0.5;
  chassis.castShadow = true;
  car.add(chassis);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 1.6), cyanMat);
  hood.position.set(0, 0.95, 1.25);
  car.add(hood);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.1, 1.1, 1.5), cyanMat);
  cabin.position.set(0, 1.35, -0.2);
  car.add(cabin);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.18, 0.2, 1.58), whiteMat);
  roof.position.set(0, 1.95, -0.2);
  car.add(roof);

  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.55, 1.2), glassMat);
  glass.position.set(0, 1.45, 0.1);
  car.add(glass);

  // Front Headlights
  const headMat = new THREE.MeshStandardMaterial({ color: 0xffedd5, emissive: 0xfef08a, emissiveIntensity: 0.8 });
  [-0.7, 0.7].forEach(lx => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.24, 0.08), headMat);
    light.position.set(lx, 0.95, 2.06);
    car.add(light);
  });

  // Rear Tail & Brake Lights
  const brakeMat = new THREE.MeshStandardMaterial({ color: 0xff1e1e, emissive: 0xdc2626, emissiveIntensity: 0.35 });
  [-0.75, 0.75].forEach(lx => {
    const light = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.08), brakeMat);
    light.position.set(lx, 0.65, -2.22);
    car.add(light);
  });

  [[-1.12, 0.45, 1.3], [1.12, 0.45, 1.3], [-1.12, 0.45, -1.3], [1.12, 0.45, -1.3]].forEach(p => {
    const w = createWheelMesh(0.45, 0.36, 0x64748b);
    w.position.set(p[0], p[1], p[2]);
    car.add(w);
    wheels.push(w);
  });
  return { car, wheels, brakeMat };
}

// Active NPC Vehicles cruising the roads
const jeepData1 = buildRedJeep();
const truckData1 = buildVoxelTruck();
const jeepData2 = buildRedJeep();
const truckData2 = buildVoxelTruck();

scene.add(jeepData1.car);
scene.add(truckData1.car);
scene.add(jeepData2.car);
scene.add(truckData2.car);

const npcCars = [
  // 1. Red Jeep cruising Outer Ring (Clockwise)
  {
    model: jeepData1.car,
    wheels: jeepData1.wheels,
    brakeMat: jeepData1.brakeMat,
    x: -RING_DIST,
    z: -RING_DIST,
    heading: Math.PI / 2,
    speed: 0.12,
    baseSpeed: 0.12,
    curSpeed: 0.12,
    color: '#dc2626',
    waypoints: [
      { x: RING_DIST, z: -RING_DIST },
      { x: RING_DIST, z: RING_DIST },
      { x: -RING_DIST, z: RING_DIST },
      { x: -RING_DIST, z: -RING_DIST }
    ],
    wpIndex: 0
  },
  // 2. Cyan Truck cruising Outer Ring (Counter-Clockwise)
  {
    model: truckData1.car,
    wheels: truckData1.wheels,
    brakeMat: truckData1.brakeMat,
    x: RING_DIST,
    z: RING_DIST,
    heading: -Math.PI / 2,
    speed: 0.10,
    baseSpeed: 0.10,
    curSpeed: 0.10,
    color: '#0284c7',
    waypoints: [
      { x: -RING_DIST, z: RING_DIST },
      { x: -RING_DIST, z: -RING_DIST },
      { x: RING_DIST, z: -RING_DIST },
      { x: RING_DIST, z: RING_DIST }
    ],
    wpIndex: 0
  },
  // 3. Red Jeep cruising Central Crossroads
  {
    model: jeepData2.car,
    wheels: jeepData2.wheels,
    brakeMat: jeepData2.brakeMat,
    x: -46,
    z: 0,
    heading: Math.PI / 2,
    speed: 0.11,
    baseSpeed: 0.11,
    curSpeed: 0.11,
    color: '#dc2626',
    waypoints: [
      { x: 46, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -46 },
      { x: 0, z: 46 },
      { x: 0, z: 0 },
      { x: -46, z: 0 }
    ],
    wpIndex: 0
  },
  // 4. Cyan Truck patrolling inner branches
  {
    model: truckData2.car,
    wheels: truckData2.wheels,
    brakeMat: truckData2.brakeMat,
    x: 0,
    z: -46,
    heading: Math.PI,
    speed: 0.09,
    baseSpeed: 0.09,
    curSpeed: 0.09,
    color: '#0284c7',
    waypoints: [
      { x: 0, z: 46 },
      { x: 0, z: 0 },
      { x: -18, z: 0 },
      { x: -18, z: -18 },
      { x: -18, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -46 }
    ],
    wpIndex: 0
  }
];

// =======================================================
// REAL-LIFE INTELLIGENT DRIVER AI FOR NPC CARS
// 1. Long-range forward vision cone (16m lookahead)
// 2. Smooth progressive deceleration as obstacles approach
// 3. Complete safe stop behind player's car (NO CONTACT!)
// 4. Yields at intersections / turns if blocked
// 5. Waits patiently until the road is cleared, then resumes
// 6. Glowing functional brake lights during braking & stopping
// =======================================================
function updateNPCCars() {
  npcCars.forEach(npc => {
    // 1. Waypoint Navigation & Heading Steering
    const wp = npc.waypoints[npc.wpIndex];
    const dx = wp.x - npc.x;
    const dz = wp.z - npc.z;
    const distToWp = Math.hypot(dx, dz);

    if (distToWp < 2.8) {
      npc.wpIndex = (npc.wpIndex + 1) % npc.waypoints.length;
    }

    const targetHeading = Math.atan2(dx, dz);
    let angleDiff = targetHeading - npc.heading;
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    npc.heading += angleDiff * 0.08;

    // Heading unit forward and right vectors
    const fwdX = Math.sin(npc.heading);
    const fwdZ = Math.cos(npc.heading);
    const rightX = Math.cos(npc.heading);
    const rightZ = -Math.sin(npc.heading);

    // Initial desired cruising speed
    let targetSpeed = npc.baseSpeed;
    let isBraking = false;
    let isStopped = false;

    // 2. Real-Life Driver Perception: Look Ahead for Player Car
    const toPlayerX = carState.position.x - npc.x;
    const toPlayerZ = carState.position.z - npc.z;
    const pDist = Math.hypot(toPlayerX, toPlayerZ);

    // Project player vector onto NPC's local coordinates
    const forwardDist = toPlayerX * fwdX + toPlayerZ * fwdZ;   // Distance ahead (+ ahead, - behind)
    const lateralDist = Math.abs(toPlayerX * rightX + toPlayerZ * rightZ); // Offset from car centerline

    const SAFE_STOP_BUFFER = 6.6;   // Bumper-to-bumper buffer (2.4m clear gap between bodies)
    const DETECTION_RANGE = 20.0;   // Range at which driver notices car ahead in lane
    const LANE_CORRIDOR_WIDTH = 3.4; // Half-width of road corridor to check

    // Check if player car is stationary or driving ahead in the same road corridor
    if (forwardDist > 0 && forwardDist < DETECTION_RANGE && lateralDist < LANE_CORRIDOR_WIDTH) {
      if (forwardDist <= SAFE_STOP_BUFFER) {
        // Real-Life Complete Stop! Driver waits with foot firmly on brake, zero touch!
        targetSpeed = 0;
        isBraking = true;
        isStopped = true;
      } else {
        // Progressive adaptive deceleration
        const brakeFactor = Math.max(0, (forwardDist - SAFE_STOP_BUFFER) / (DETECTION_RANGE - SAFE_STOP_BUFFER));
        const smoothSpeed = npc.baseSpeed * Math.pow(brakeFactor, 1.2);
        targetSpeed = Math.min(targetSpeed, smoothSpeed);
        isBraking = true;
      }
    }

    // Intersection / Crossing safety: if player car is close in front/quarter, yield!
    if (pDist < 7.2 && forwardDist > -1.5 && lateralDist < 4.2) {
      targetSpeed = 0;
      isBraking = true;
      isStopped = true;
    }

    // 3. Traffic Queueing: Look Ahead for other NPC Cars
    npcCars.forEach(other => {
      if (other === npc) return;
      const toOtherX = other.x - npc.x;
      const toOtherZ = other.z - npc.z;
      const otherFwd = toOtherX * fwdX + toOtherZ * fwdZ;
      const otherLat = Math.abs(toOtherX * rightX + toOtherZ * rightZ);

      if (otherFwd > 0 && otherFwd < 14.0 && otherLat < 2.9) {
        const OTHER_STOP_BUFFER = 5.4;
        if (otherFwd <= OTHER_STOP_BUFFER) {
          targetSpeed = 0;
          isBraking = true;
          isStopped = true;
        } else {
          const bRatio = (otherFwd - OTHER_STOP_BUFFER) / (14.0 - OTHER_STOP_BUFFER);
          const queueSpeed = npc.baseSpeed * Math.max(0, bRatio);
          targetSpeed = Math.min(targetSpeed, queueSpeed);
          isBraking = true;
        }
      }
    });

    // 4. Smooth Acceleration & Deceleration (Simulating Real Vehicle Inertia)
    if (npc.curSpeed === undefined) npc.curSpeed = npc.baseSpeed;

    if (targetSpeed < npc.curSpeed) {
      // Responsive braking deceleration
      npc.curSpeed = Math.max(targetSpeed, npc.curSpeed - 0.014);
    } else if (targetSpeed > npc.curSpeed) {
      // Natural throttle acceleration when path is clear
      npc.curSpeed = Math.min(targetSpeed, npc.curSpeed + 0.005);
    }

    if (npc.curSpeed < 0.001) {
      npc.curSpeed = 0;
    }

    // 5. Hard Zero-Touch Safety Cushion:
    // If player car is driven into NPC or backs into it, keep solid buffer without moving player car
    const MIN_CONTACT_DIST = 5.2;
    if (pDist < MIN_CONTACT_DIST) {
      const overlap = MIN_CONTACT_DIST - pDist;
      const sepX = (npc.x - carState.position.x) / (pDist || 0.001);
      const sepZ = (npc.z - carState.position.z) / (pDist || 0.001);
      // Yield NPC backwards away from player car - player car stays completely unaffected!
      npc.x += sepX * overlap;
      npc.z += sepZ * overlap;
      npc.curSpeed = 0;
      isStopped = true;
    }

    // NPC to NPC anti-clipping separation
    npcCars.forEach(other => {
      if (other === npc) return;
      const dOther = Math.hypot(npc.x - other.x, npc.z - other.z);
      if (dOther < 4.4) {
        const oOverlap = 4.4 - dOther;
        const oSepX = (npc.x - other.x) / (dOther || 0.001);
        const oSepZ = (npc.z - other.z) / (dOther || 0.001);
        npc.x += oSepX * oOverlap * 0.5;
        npc.z += oSepZ * oOverlap * 0.5;
      }
    });

    // 6. Movement Step
    if (npc.curSpeed > 0) {
      npc.x += fwdX * npc.curSpeed;
      npc.z += fwdZ * npc.curSpeed;
    }

    // 7. Update 3D Model Position & Rotation
    npc.model.position.set(npc.x, 0, npc.z);
    npc.model.rotation.y = npc.heading;

    // Roll wheels (only when vehicle is actually moving!)
    const rollSpeed = npc.curSpeed / 0.45;
    npc.wheels.forEach(w => {
      w.rotation.x += rollSpeed;
    });

    // 8. Dynamic Visual Brake Lights
    if (npc.brakeMat) {
      if (isStopped || isBraking || npc.curSpeed < npc.baseSpeed * 0.45) {
        // Bright glowing red brake lights
        npc.brakeMat.emissiveIntensity = 2.2;
      } else {
        // Normal subtle running tail lights
        npc.brakeMat.emissiveIntensity = 0.35;
      }
    }
  });
}

// ==========================================
// 6. ROCK-SOLID ROAD & PAD COLLISION
// (Car stays strictly on asphalt road & pads!)
// ==========================================

// 4-CORNER BOUNDING BOX CHECK
// Ensures bumper, wheels & all corners stay 100% on road surface!
function isCarBodyOnRoad(x, z, heading) {
  const halfL = 1.95; // Half length of car body
  const halfW = 0.98; // Half width of car body

  const sin = Math.sin(heading);
  const cos = Math.cos(heading);

  // 4 corners of the car body + 2 mid-side points + center
  const testPoints = [
    { x: x + (halfL * sin + halfW * cos), z: z + (halfL * cos - halfW * sin) }, // Front-Right
    { x: x + (halfL * sin - halfW * cos), z: z + (halfL * cos + halfW * sin) }, // Front-Left
    { x: x + (-halfL * sin + halfW * cos), z: z + (-halfL * cos - halfW * sin) }, // Rear-Right
    { x: x + (-halfL * sin - halfW * cos), z: z + (-halfL * cos + halfW * sin) }, // Rear-Left
    { x: x + (halfL * sin), z: z + (halfL * cos) }, // Front-Center
    { x: x - (halfL * sin), z: z - (halfL * cos) }, // Rear-Center
    { x: x, z: z } // Center
  ];

  for (const pt of testPoints) {
    if (!isPointOnRoad(pt.x, pt.z, 0)) {
      return false; // Corner would touch green grass!
    }
  }

  return true;
}

// ==========================================
// 7. CYBER SPORTS COUPE 3D CAR (HIGH-END GUI & AERODYNAMICS)
// Widebody hypercar stance, cyber neon lights, aero diffuser & alloy rims
// ==========================================
const carGroup = new THREE.Group();
const wheelsToRoll = [];
const frontSteerWheels = [];
let playerBrakeMat = null;

function createCarWheel(radius, width, rimColor = 0xf59e0b) {
  const wheelAssembly = new THREE.Group();
  const steerPivot = new THREE.Group();
  wheelAssembly.add(steerPivot);

  const rollGroup = new THREE.Group();
  steerPivot.add(rollGroup);

  // 1. Performance Low-Profile Tire
  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x181e29, roughness: 0.85 });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  rollGroup.add(tire);

  // 2. Diamond-Cut Alloy Star Rim
  const rimGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 16);
  const rimMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.9, roughness: 0.15 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.z = Math.PI / 2;
  rollGroup.add(rim);

  // 3. Cyber Gold Center Hub & Outer Rim Lip
  const lipGeo = new THREE.CylinderGeometry(radius * 0.72, radius * 0.72, width + 0.025, 16);
  const lipMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.85, roughness: 0.2 });
  const lip = new THREE.Mesh(lipGeo, lipMat);
  lip.rotation.z = Math.PI / 2;
  rollGroup.add(lip);

  // 4. Red Brembo Racing Brake Caliper
  const caliperGeo = new THREE.BoxGeometry(0.12, radius * 0.45, 0.22);
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.3 });
  const caliper = new THREE.Mesh(caliperGeo, caliperMat);
  caliper.position.set(0, radius * 0.35, 0);
  steerPivot.add(caliper);

  return { assembly: wheelAssembly, rollGroup, steerPivot };
}

function buildCyberSportsCar() {
  // Premium Materials
  const goldBodyMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.72
  });
  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.65
  });
  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x050811,
    roughness: 0.04,
    metalness: 0.95,
    transparent: true,
    opacity: 0.88
  });
  const ledHeadMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.8
  });
  const headDrlMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 1.5
  });
  const neonTailMat = new THREE.MeshStandardMaterial({
    color: 0xff1744,
    emissive: 0xe11d48,
    emissiveIntensity: 1.1
  });
  playerBrakeMat = neonTailMat;

  const exhaustMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.5
  });

  // 1. Aerodynamic Carbon Undertray Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.26, 4.3), carbonMat);
  chassis.position.y = 0.36;
  chassis.castShadow = true;
  carGroup.add(chassis);

  // 2. Front Race Splitter with Side Aero Canards
  const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(2.14, 0.08, 0.45), carbonMat);
  frontSplitter.position.set(0, 0.26, 2.15);
  carGroup.add(frontSplitter);

  [-1.04, 1.04].forEach(sx => {
    const canard = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.32), carbonMat);
    canard.position.set(sx, 0.38, 2.05);
    carGroup.add(canard);
  });

  // 3. Sculpted Widebody Cyber Sports Main Body
  const mainBody = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.48, 4.0), goldBodyMat);
  mainBody.position.set(0, 0.68, 0);
  mainBody.castShadow = true;
  carGroup.add(mainBody);

  // Slanted Aerodynamic Hood Section
  const hood = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.22, 1.6), goldBodyMat);
  hood.position.set(0, 0.88, 1.1);
  hood.rotation.x = 0.06;
  hood.castShadow = true;
  carGroup.add(hood);

  // Dual Hood Cooling Vents
  [-0.45, 0.45].forEach(vx => {
    const vent = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.55), carbonMat);
    vent.position.set(vx, 0.98, 1.05);
    carGroup.add(vent);
  });

  // Front Intake Bumper
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.1), carbonMat);
  frontGrille.position.set(0, 0.48, 2.11);
  carGroup.add(frontGrille);

  // 4. Streamlined Cockpit Canopy (Tinted Fastback Glass)
  const canopy = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.5, 2.1), darkGlassMat);
  canopy.position.set(0, 1.12, -0.2);
  canopy.castShadow = true;
  carGroup.add(canopy);

  // Slanted Windshield Face
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.48, 0.7), darkGlassMat);
  windshield.position.set(0, 1.02, 0.65);
  windshield.rotation.x = -0.45;
  carGroup.add(windshield);

  // Fastback Rear Window
  const rearGlass = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.45, 0.75), darkGlassMat);
  rearGlass.position.set(0, 1.02, -1.05);
  rearGlass.rotation.x = 0.45;
  carGroup.add(rearGlass);

  // Carbon Fiber Roof Center
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.08, 1.35), carbonMat);
  roof.position.set(0, 1.38, -0.25);
  carGroup.add(roof);

  // 5. Sleek Aerodynamic Side Mirrors
  [-0.92, 0.92].forEach((mx, idx) => {
    const mirrorStem = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.08), carbonMat);
    mirrorStem.position.set(mx, 1.02, 0.5);
    carGroup.add(mirrorStem);

    const mirrorHead = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.15), goldBodyMat);
    mirrorHead.position.set(mx + (idx === 0 ? -0.1 : 0.1), 1.04, 0.5);
    carGroup.add(mirrorHead);

    const mirrorLed = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.12), ledHeadMat);
    mirrorLed.position.set(mx + (idx === 0 ? -0.2 : 0.2), 1.04, 0.5);
    carGroup.add(mirrorLed);
  });

  // 6. Cyber Headlight Assemblies (Projector Lenses + White DRL Blades)
  [-0.65, 0.65].forEach(hx => {
    // Projector Lens
    const lens = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.12, 0.08), ledHeadMat);
    lens.position.set(hx, 0.75, 2.07);
    carGroup.add(lens);

    // DRL Eyebrow
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.04, 0.08), headDrlMat);
    drl.position.set(hx, 0.83, 2.07);
    carGroup.add(drl);
  });

  // 7. Full-Width Cyberpunk OLED Rear Light Bar & High-Mount Brake
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.14, 0.08), neonTailMat);
  tailBar.position.set(0, 0.76, -2.04);
  carGroup.add(tailBar);

  const thirdBrake = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.06, 0.06), neonTailMat);
  thirdBrake.position.set(0, 1.28, -1.25);
  carGroup.add(thirdBrake);

  // 8. Rear Race Diffuser & Dual Exhaust Afterburners
  const diffuser = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.22, 0.35), carbonMat);
  diffuser.position.set(0, 0.38, -2.05);
  carGroup.add(diffuser);

  [-0.45, 0.45].forEach(ex => {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 16), carbonMat);
    tip.rotation.x = Math.PI / 2;
    tip.position.set(ex, 0.36, -2.18);
    carGroup.add(tip);

    const glow = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 16), exhaustMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.set(ex, 0.36, -2.22);
    carGroup.add(glow);
  });

  // 9. Aerodynamic GT Race Spoiler
  const wingPostL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.22), carbonMat);
  wingPostL.position.set(-0.65, 1.08, -1.82);
  wingPostL.rotation.x = 0.25;
  carGroup.add(wingPostL);

  const wingPostR = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.38, 0.22), carbonMat);
  wingPostR.position.set(0.65, 1.08, -1.82);
  wingPostR.rotation.x = 0.25;
  carGroup.add(wingPostR);

  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.06, 0.48), carbonMat);
  wingBlade.position.set(0, 1.28, -1.86);
  wingBlade.castShadow = true;
  carGroup.add(wingBlade);

  [-0.98, 0.98].forEach(wx => {
    const endplate = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.26, 0.52), goldBodyMat);
    endplate.position.set(wx, 1.32, -1.86);
    carGroup.add(endplate);
  });

  // 10. High-Performance Alloy Wheels Assembly
  const wRadius = 0.42;
  const wWidth = 0.32;

  const wFL = createCarWheel(wRadius, wWidth);
  wFL.assembly.position.set(-1.08, 0.42, 1.3);
  carGroup.add(wFL.assembly);
  frontSteerWheels.push(wFL.steerPivot);
  wheelsToRoll.push(wFL.rollGroup);

  const wFR = createCarWheel(wRadius, wWidth);
  wFR.assembly.position.set(1.08, 0.42, 1.3);
  carGroup.add(wFR.assembly);
  frontSteerWheels.push(wFR.steerPivot);
  wheelsToRoll.push(wFR.rollGroup);

  const wBL = createCarWheel(wRadius, wWidth);
  wBL.assembly.position.set(-1.08, 0.42, -1.3);
  carGroup.add(wBL.assembly);
  wheelsToRoll.push(wBL.rollGroup);

  const wBR = createCarWheel(wRadius, wWidth);
  wBR.assembly.position.set(1.08, 0.42, -1.3);
  carGroup.add(wBR.assembly);
  wheelsToRoll.push(wBR.rollGroup);

  scene.add(carGroup);
}
buildCyberSportsCar();

// ==========================================
// 8. DRIVING PHYSICS & CONTROLS ALGORITHM
// ==========================================
const carState = {
  position: new THREE.Vector3(0, 0, 0),
  heading: 0,
  speed: 0,
  maxSpeed: 0.35,
  maxReverseSpeed: -0.16,
  acceleration: 0.010,
  braking: 0.024,
  friction: 0.965,
  turnSpeed: 0.036,
  steerAngle: 0,
  maxSteerAngle: 0.45
};

const keys = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  handbrake: false
};

let currentActiveZone = null;
let lastAutoOpenedZoneId = null;

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'KeyW', 'w', 'W'].includes(e.code)) keys.forward = true;
  if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code)) keys.backward = true;
  if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code)) keys.left = true;
  if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code)) keys.right = true;
  if (e.code === 'Space') { keys.handbrake = true; e.preventDefault(); }
  if (e.code === 'KeyR' || e.code === 'r') resetCar();
  if (['KeyE', 'e', 'E'].includes(e.code)) {
    if (currentActiveZone) {
      openPageModal(currentActiveZone.id);
    }
  }
  if (e.code === 'Escape') {
    closePageModal();
    closeFastTravelModal();
  }
});

window.addEventListener('keyup', (e) => {
  if (['ArrowUp', 'KeyW', 'w', 'W'].includes(e.code)) keys.forward = false;
  if (['ArrowDown', 'KeyS', 's', 'S'].includes(e.code)) keys.backward = false;
  if (['ArrowLeft', 'KeyA', 'a', 'A'].includes(e.code)) keys.left = false;
  if (['ArrowRight', 'KeyD', 'd', 'D'].includes(e.code)) keys.right = false;
  if (e.code === 'Space') keys.handbrake = false;
});

function resetCar() {
  carState.position.set(0, 0, 0);
  carState.heading = 0;
  carState.speed = 0;
  carState.steerAngle = 0;
  carGroup.position.set(0, 0, 0);
  carGroup.rotation.y = 0;
}
document.getElementById('reset-car-btn')?.addEventListener('click', resetCar);

// ==========================================
// 9. DEDICATED PAGE VIEWER MODAL LOGIC
// (Loads specific HTML file for each zone)
// ==========================================
const pageViewerModal = document.getElementById('page-viewer-modal');
const pageIframe = document.getElementById('page-iframe');
const pageModalTag = document.getElementById('page-modal-tag');
const pageModalTitle = document.getElementById('page-modal-title');
const pageExternalLink = document.getElementById('page-external-link');
const closePageViewerBtn = document.getElementById('close-page-viewer-btn');
const openZoneBtn = document.getElementById('open-zone-btn');


let manualCloseZoneId = null;
let isPageModalOpen = false;

function openPageModal(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return;

  if (pageModalTag) pageModalTag.textContent = `ZONE 0${zone.id}`;
  if (pageModalTitle) pageModalTitle.textContent = `${zone.icon} ${zone.name}`;
  if (pageExternalLink) pageExternalLink.href = zone.file;
  if (pageIframe) pageIframe.src = zone.file;

  pageViewerModal?.classList.add('open');
  isPageModalOpen = true;
  closeFastTravelModal();
}

function closePageModal(isManual = false) {
  pageViewerModal?.classList.remove('open');
  if (pageIframe) pageIframe.src = 'about:blank';
  isPageModalOpen = false;
  if (isManual && currentActiveZone) {
    manualCloseZoneId = currentActiveZone.id;
  }
}

window.openPageModal = openPageModal;
window.closePageModal = closePageModal;

closePageViewerBtn?.addEventListener('click', () => closePageModal(true));
openZoneBtn?.addEventListener('click', () => {
  if (currentActiveZone) {
    manualCloseZoneId = null;
    openPageModal(currentActiveZone.id);
  }
});

// Fast Travel Warp with Automatic Page Open
function fastTravelToZone(zoneId) {
  const targetZone = ZONES.find(z => z.id === zoneId);
  if (!targetZone) return;

  // Teleport car directly onto the zone pad
  carState.position.set(targetZone.x, 0, targetZone.z);
  // Orient car facing towards center
  carState.heading = Math.atan2(-targetZone.x, -targetZone.z);
  carState.speed = 0;
  carState.steerAngle = 0;

  carGroup.position.copy(carState.position);
  carGroup.rotation.y = carState.heading;

  // Instantly align camera
  const forwardVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), carState.heading);
  const cameraOffset = new THREE.Vector3(0, 0, -TPP_DISTANCE).applyAxisAngle(new THREE.Vector3(0, 1, 0), carState.heading);
  camera.position.copy(carState.position).add(cameraOffset).add(new THREE.Vector3(0, TPP_HEIGHT, 0));
  currentCameraLookAt.copy(carState.position).add(forwardVector.clone().multiplyScalar(3.0)).add(new THREE.Vector3(0, 1.1, 0));
  camera.lookAt(currentCameraLookAt);

  // Trigger Zone Banner
  currentActiveZone = targetZone;
  manualCloseZoneId = null;
  if (zoneAlertEl && zoneTitleEl) {
    zoneAlertEl.classList.add('visible');
    zoneTitleEl.textContent = `Zone ${targetZone.id}: ${targetZone.name}`;
  }

  // Close fast travel modal if open
  closeFastTravelModal();

  // "jab card circle me poche to page open ho"
  setTimeout(() => {
    openPageModal(targetZone.id);
  }, 250);
}

window.fastTravelToZone = fastTravelToZone;

// HUD Elements
const speedValEl = document.getElementById('speed-value');
const speedFillEl = document.getElementById('speed-fill');
const gearValEl = document.getElementById('gear-value');
const zoneAlertEl = document.getElementById('zone-alert');
const zoneTitleEl = document.getElementById('zone-title');
const grassWarningEl = document.getElementById('grass-warning');

// Physics update function
function updatePhysics() {
  // 1. Acceleration / Braking
  if (keys.forward) {
    if (carState.speed < 0) carState.speed += carState.braking;
    else if (carState.speed < carState.maxSpeed) carState.speed += carState.acceleration;
  } else if (keys.backward) {
    if (carState.speed > 0) carState.speed -= carState.braking;
    else if (carState.speed > carState.maxReverseSpeed) carState.speed -= carState.acceleration * 0.75;
  } else {
    carState.speed *= carState.friction;
    if (Math.abs(carState.speed) < 0.001) carState.speed = 0;
  }

  if (keys.handbrake) carState.speed *= 0.85;

  // 2. Steering with 4-corner validation
  let targetSteer = 0;
  if (keys.left) targetSteer += carState.maxSteerAngle;
  if (keys.right) targetSteer -= carState.maxSteerAngle;
  carState.steerAngle += (targetSteer - carState.steerAngle) * 0.2;

  frontSteerWheels.forEach(w => {
    w.rotation.y = carState.steerAngle;
  });

  // Calculate prospective new heading
  let prospectiveHeading = carState.heading;
  if (Math.abs(carState.speed) > 0.002) {
    const steerDir = carState.speed >= 0 ? 1 : -1;
    prospectiveHeading += (carState.steerAngle / carState.maxSteerAngle) * carState.turnSpeed * steerDir * (Math.abs(carState.speed) / carState.maxSpeed);
  }

  // 3. Move Step with Strict 4-Corner Grass Collision & Solid Car Collision
  const forwardVector = new THREE.Vector3(0, 0, 1).applyAxisAngle(new THREE.Vector3(0, 1, 0), prospectiveHeading);
  const moveStep = forwardVector.clone().multiplyScalar(carState.speed);
  const nextPos = carState.position.clone().add(moveStep);

  // Collision with NPC vehicles: Player car stays rock solid! NPC yields!
  const MIN_CAR_SEPARATION = 5.2;
  for (const npc of npcCars) {
    const d = Math.hypot(nextPos.x - npc.x, nextPos.z - npc.z);
    if (d < MIN_CAR_SEPARATION) {
      const sepX = (npc.x - nextPos.x) / (d || 0.001);
      const sepZ = (npc.z - nextPos.z) / (d || 0.001);
      const overlap = MIN_CAR_SEPARATION - d;

      npc.x += sepX * overlap;
      npc.z += sepZ * overlap;
      npc.curSpeed = 0;
      if (npc.brakeMat) npc.brakeMat.emissiveIntensity = 2.2;
    }
  }

  // Check if prospective position and rotation keeps ALL car corners on road
  if (isCarBodyOnRoad(nextPos.x, nextPos.z, prospectiveHeading)) {
    carState.position.copy(nextPos);
    carState.heading = prospectiveHeading;
    if (grassWarningEl) grassWarningEl.classList.remove('active');
  } 
  // Else test X-only slide
  else if (isCarBodyOnRoad(nextPos.x, carState.position.z, prospectiveHeading)) {
    carState.position.x = nextPos.x;
    carState.heading = prospectiveHeading;
    carState.speed *= 0.94;
    if (grassWarningEl) grassWarningEl.classList.add('active');
  } 
  // Else test Z-only slide
  else if (isCarBodyOnRoad(carState.position.x, nextPos.z, prospectiveHeading)) {
    carState.position.z = nextPos.z;
    carState.heading = prospectiveHeading;
    carState.speed *= 0.94;
    if (grassWarningEl) grassWarningEl.classList.add('active');
  } 
  // Blocked by road boundary
  else {
    carState.speed *= -0.25;
    if (grassWarningEl) grassWarningEl.classList.add('active');
  }

  // 4. Update Car Mesh
  carGroup.position.copy(carState.position);
  carGroup.rotation.y = carState.heading;
  carGroup.rotation.z = -(carState.steerAngle) * (carState.speed / carState.maxSpeed) * 0.06;

  // Wheel Roll & Dynamic Cyber Brake Lights
  const wheelRollSpeed = carState.speed / 0.42;
  wheelsToRoll.forEach(w => { w.rotation.x += wheelRollSpeed; });

  if (playerBrakeMat) {
    if (keys.backward || keys.handbrake || (carState.speed < -0.01)) {
      playerBrakeMat.emissiveIntensity = 2.6;
    } else {
      playerBrakeMat.emissiveIntensity = 1.1;
    }
  }

  // 5. TPP Camera Follow
  const cameraOffset = new THREE.Vector3(0, 0, -TPP_DISTANCE).applyAxisAngle(new THREE.Vector3(0, 1, 0), carState.heading);
  const idealCamPos = new THREE.Vector3()
    .copy(carState.position)
    .add(cameraOffset)
    .add(new THREE.Vector3(0, TPP_HEIGHT, 0));

  camera.position.lerp(idealCamPos, 0.09);

  const lookAheadOffset = forwardVector.clone().multiplyScalar(3.0);
  const idealLookAt = new THREE.Vector3()
    .copy(carState.position)
    .add(lookAheadOffset)
    .add(new THREE.Vector3(0, 1.1, 0));

  currentCameraLookAt.lerp(idealLookAt, 0.12);
  camera.lookAt(currentCameraLookAt);

  // 6. HUD Speedometer
  const speedKmh = Math.round(Math.abs(carState.speed) * 110);
  if (speedValEl) speedValEl.textContent = speedKmh;
  if (speedFillEl) {
    const pct = Math.min((Math.abs(carState.speed) / carState.maxSpeed) * 100, 100);
    speedFillEl.style.width = `${pct}%`;
  }
  if (gearValEl) {
    if (Math.abs(carState.speed) < 0.005) gearValEl.textContent = 'N';
    else if (carState.speed > 0) gearValEl.textContent = 'D';
    else gearValEl.textContent = 'R';
  }

  // =============================================================
  // 7. AUTO-OPEN & AUTO-CLOSE ZONE CHECKPOINT LOGIC
  // "jab card circle me poche to page open ho and jab bahar nikal jaye to page close ho"
  // =============================================================
  let activeZone = null;
  for (const zone of ZONES) {
    const dist = Math.hypot(carState.position.x - zone.x, carState.position.z - zone.z);
    // Enter circle threshold: car is within the circle pad
    if (dist <= PAD_RADIUS + 0.3) {
      activeZone = zone;
      break;
    }
  }

  if (activeZone) {
    // Car is INSIDE the circle!
    currentActiveZone = activeZone;

    if (zoneAlertEl && zoneTitleEl) {
      zoneAlertEl.classList.add('visible');
      zoneTitleEl.textContent = `Zone ${activeZone.id}: ${activeZone.name}`;
    }

    // Auto-open page modal if not currently open and user didn't explicitly close it for this stay
    if (!isPageModalOpen && manualCloseZoneId !== activeZone.id) {
      openPageModal(activeZone.id);
    }
  } else {
    // Car is OUTSIDE all circles!
    // If the car just exited the circle, immediately auto-close the page!
    if (currentActiveZone !== null) {
      const exitDist = Math.hypot(carState.position.x - currentActiveZone.x, carState.position.z - currentActiveZone.z);
      if (exitDist > PAD_RADIUS + 0.8) {
        if (isPageModalOpen) {
          closePageModal(false); // Automatically closes upon exiting circle!
        }
        currentActiveZone = null;
        manualCloseZoneId = null;
        if (zoneAlertEl) zoneAlertEl.classList.remove('visible');
      }
    } else {
      if (zoneAlertEl) zoneAlertEl.classList.remove('visible');
      manualCloseZoneId = null;
    }
  }

  // 8. Update Minimap Radar (throttled every 2nd frame for smooth 60 FPS)
  minimapFrameCount++;
  if (minimapFrameCount % 2 === 0) {
    updateMinimap();
  }
}

// ==========================================
// 10. ROTATING ROUND RADAR MINIMAP ALGORITHM
// (Expanded 260px Radar, Interactive Zoom & Full Map)
// ==========================================
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas?.getContext('2d');
const minimapTooltip = document.getElementById('minimap-tooltip');

let minimapFrameCount = 0;
let cachedSweepGradient = null;
let radarZoom = 1.0;
const RADAR_SIZE = 260;
const RADAR_CX = 130;
const RADAR_CY = 130;
const RADAR_RADIUS = 122;

// Zoom & Expand Control listeners
document.getElementById('map-zoom-in')?.addEventListener('click', (e) => {
  e.stopPropagation();
  radarZoom = Math.min(radarZoom * 1.3, 2.5);
});

document.getElementById('map-zoom-out')?.addEventListener('click', (e) => {
  e.stopPropagation();
  radarZoom = Math.max(radarZoom / 1.3, 0.55);
});

document.getElementById('toggle-map-expand-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  document.getElementById('minimap-container')?.classList.toggle('expanded');
});

function updateMinimap() {
  if (!minimapCtx) return;

  const RADAR_METERS = 82 / radarZoom;
  const RADAR_SCALE = RADAR_SIZE / RADAR_METERS;

  minimapCtx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  // 1. Clip to Circular Radar Frame
  minimapCtx.save();
  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, RADAR_RADIUS, 0, Math.PI * 2);
  minimapCtx.clip();

  // Background Grass Biome
  minimapCtx.fillStyle = '#1c3619';
  minimapCtx.fillRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  // 2. Transform Context: Centered on Car, Rotated so Car faces UP
  minimapCtx.save();
  minimapCtx.translate(RADAR_CX, RADAR_CY);
  // ROTATE WITH CAR HEADING so radar dynamically rotates!
  minimapCtx.rotate(-carState.heading);
  minimapCtx.scale(RADAR_SCALE, RADAR_SCALE);
  // TRANSLATE WITH CAR POSITION
  minimapCtx.translate(-carState.position.x, -carState.position.z);

  // --- Draw World in Radar Coordinates ---
  // A. Asphalt Roads
  minimapCtx.strokeStyle = '#222730';
  minimapCtx.lineCap = 'round';
  minimapCtx.lineJoin = 'round';
  minimapCtx.lineWidth = PATH_WIDTH;

  // Main Crossroads (-54 to +54)
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -54);
  minimapCtx.lineTo(0, 54);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.moveTo(-54, 0);
  minimapCtx.lineTo(54, 0);
  minimapCtx.stroke();

  // Outer Ring Road (RING_DIST = 36)
  minimapCtx.strokeRect(-RING_DIST, -RING_DIST, RING_DIST * 2, RING_DIST * 2);

  // Branch Paths to Zones 9 & 10
  minimapCtx.beginPath();
  minimapCtx.moveTo(-18, 0);
  minimapCtx.lineTo(-18, -18);
  minimapCtx.lineTo(0, -18);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.moveTo(18, 0);
  minimapCtx.lineTo(18, 18);
  minimapCtx.lineTo(0, 18);
  minimapCtx.stroke();

  // Yellow Center Dividers on Radar
  minimapCtx.strokeStyle = '#facc15';
  minimapCtx.lineWidth = 0.8;
  minimapCtx.setLineDash([2, 2]);

  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -54);
  minimapCtx.lineTo(0, 54);
  minimapCtx.moveTo(-54, 0);
  minimapCtx.lineTo(54, 0);
  minimapCtx.stroke();
  minimapCtx.strokeRect(-RING_DIST, -RING_DIST, RING_DIST * 2, RING_DIST * 2);
  minimapCtx.setLineDash([]);

  // Center & Corner Clearings
  minimapCtx.fillStyle = '#222730';
  [
    [0, 0],
    [-RING_DIST, -RING_DIST],
    [RING_DIST, -RING_DIST],
    [-RING_DIST, RING_DIST],
    [RING_DIST, RING_DIST],
    [-18, -18],
    [18, 18]
  ].forEach(p => {
    minimapCtx.beginPath();
    minimapCtx.arc(p[0], p[1], PATH_WIDTH * 0.95, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // B. Trees
  minimapCtx.fillStyle = '#163610';
  treePositions.forEach(t => {
    minimapCtx.beginPath();
    minimapCtx.arc(t.x, t.z, 1.4, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // C. 10 Destination Pads with Clear Numbers
  ZONES.forEach(zone => {
    // Outer Pad Circle
    minimapCtx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, PAD_RADIUS, 0, Math.PI * 2);
    minimapCtx.fill();

    // Glowing Colored Ring
    minimapCtx.strokeStyle = zone.color || '#38bdf8';
    minimapCtx.lineWidth = 1.0;
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, PAD_RADIUS, 0, Math.PI * 2);
    minimapCtx.stroke();

    // Center Beacon Dot
    minimapCtx.fillStyle = zone.color || '#38bdf8';
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, 2.0, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // D. Moving NPC Cars
  npcCars.forEach(npc => {
    minimapCtx.save();
    minimapCtx.translate(npc.x, npc.z);
    minimapCtx.rotate(npc.heading);

    minimapCtx.fillStyle = npc.color;
    minimapCtx.fillRect(-1.1, -2.1, 2.2, 4.2);

    minimapCtx.strokeStyle = '#ffffff';
    minimapCtx.lineWidth = 0.35;
    minimapCtx.strokeRect(-1.1, -2.1, 2.2, 4.2);

    // Front headlights dot
    minimapCtx.fillStyle = '#fef08a';
    minimapCtx.fillRect(-0.8, 1.8, 1.6, 0.4);

    // Rear brake/tail lights dot
    if (npc.curSpeed < 0.02) {
      minimapCtx.fillStyle = '#ff2222';
      minimapCtx.fillRect(-0.8, -2.1, 1.6, 0.4);
    } else {
      minimapCtx.fillStyle = '#991b1b';
      minimapCtx.fillRect(-0.8, -2.1, 1.6, 0.35);
    }

    minimapCtx.restore();
  });

  // End World Transformation
  minimapCtx.restore();

  // 3. Radar HUD Overlays (Fixed in Screen Space)
  // Range Rings (20m, 40m)
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  minimapCtx.lineWidth = 1;
  minimapCtx.setLineDash([3, 4]);

  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, 20 * RADAR_SCALE, 0, Math.PI * 2);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, 40 * RADAR_SCALE, 0, Math.PI * 2);
  minimapCtx.stroke();
  minimapCtx.setLineDash([]);

  // Crosshairs
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.moveTo(RADAR_CX, RADAR_CY - RADAR_RADIUS);
  minimapCtx.lineTo(RADAR_CX, RADAR_CY + RADAR_RADIUS);
  minimapCtx.moveTo(RADAR_CX - RADAR_RADIUS, RADAR_CY);
  minimapCtx.lineTo(RADAR_CX + RADAR_RADIUS, RADAR_CY);
  minimapCtx.stroke();

  // Subtle Rotating Radar Scan Sweep
  const sweepAngle = clock * 2.2;
  if (!cachedSweepGradient) {
    cachedSweepGradient = minimapCtx.createRadialGradient(RADAR_CX, RADAR_CY, 0, RADAR_CX, RADAR_CY, RADAR_RADIUS);
    cachedSweepGradient.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
    cachedSweepGradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  }
  minimapCtx.fillStyle = cachedSweepGradient;
  minimapCtx.beginPath();
  minimapCtx.moveTo(RADAR_CX, RADAR_CY);
  minimapCtx.arc(RADAR_CX, RADAR_CY, RADAR_RADIUS, sweepAngle, sweepAngle + 0.6);
  minimapCtx.closePath();
  minimapCtx.fill();

  // 4. Fixed Player Car Icon at Center (Always Facing UP)
  minimapCtx.save();
  minimapCtx.translate(RADAR_CX, RADAR_CY);

  // Yellow Sports Coupe Arrowhead Icon
  minimapCtx.fillStyle = '#facc15';
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -12);
  minimapCtx.lineTo(8, 10);
  minimapCtx.lineTo(0, 6);
  minimapCtx.lineTo(-8, 10);
  minimapCtx.closePath();
  minimapCtx.fill();

  minimapCtx.strokeStyle = '#0f172a';
  minimapCtx.lineWidth = 2;
  minimapCtx.stroke();

  // Headlight Beams fanning forward
  minimapCtx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  minimapCtx.beginPath();
  minimapCtx.moveTo(-3, -12);
  minimapCtx.lineTo(-18, -36);
  minimapCtx.lineTo(18, -36);
  minimapCtx.lineTo(3, -12);
  minimapCtx.closePath();
  minimapCtx.fill();

  minimapCtx.restore();

  // End Circular Clip
  minimapCtx.restore();

  // 5. Radar Outer Glass Ring & Compass North Indicator
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
  minimapCtx.lineWidth = 3;
  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, RADAR_RADIUS, 0, Math.PI * 2);
  minimapCtx.stroke();

  // Dynamic North Arrow on Radar Rim
  const northAngle = -carState.heading - Math.PI / 2;
  const nx = RADAR_CX + Math.cos(northAngle) * (RADAR_RADIUS - 12);
  const ny = RADAR_CY + Math.sin(northAngle) * (RADAR_RADIUS - 12);

  minimapCtx.fillStyle = '#ef4444';
  minimapCtx.beginPath();
  minimapCtx.arc(nx, ny, 5.5, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#ffffff';
  minimapCtx.lineWidth = 1.5;
  minimapCtx.stroke();
}

// Minimap Hover & Direct Click with Inverse Rotation Algorithm
if (minimapCanvas) {
  let activeHoverZone = null;

  minimapCanvas.addEventListener('mousemove', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const scaleFactor = RADAR_SIZE / rect.width;
    const mouseX = (e.clientX - rect.left) * scaleFactor;
    const mouseY = (e.clientY - rect.top) * scaleFactor;

    const dx = mouseX - RADAR_CX;
    const dy = mouseY - RADAR_CY;
    const distCenter = Math.hypot(dx, dy);

    activeHoverZone = null;

    if (distCenter <= RADAR_RADIUS) {
      const RADAR_METERS = 82 / radarZoom;
      const RADAR_SCALE = RADAR_SIZE / RADAR_METERS;

      const cos = Math.cos(carState.heading);
      const sin = Math.sin(carState.heading);
      const rx = (dx * cos - dy * sin) / RADAR_SCALE;
      const rz = (dx * sin + dy * cos) / RADAR_SCALE;

      const worldX = carState.position.x + rx;
      const worldZ = carState.position.z + rz;

      let minDistance = PAD_RADIUS + 3.0;

      ZONES.forEach(zone => {
        const dist = Math.hypot(worldX - zone.x, worldZ - zone.z);
        if (dist < minDistance) {
          activeHoverZone = zone;
          minDistance = dist;
        }
      });
    }

    if (activeHoverZone && minimapTooltip) {
      const carDist = Math.round(Math.hypot(carState.position.x - activeHoverZone.x, carState.position.z - activeHoverZone.z));
      minimapTooltip.innerHTML = `
        <div style="font-weight:800; color:${activeHoverZone.color}">${activeHoverZone.icon} ZONE 0${activeHoverZone.id}</div>
        <div style="font-size:0.85rem; font-weight:700; color:#fff">${activeHoverZone.name}</div>
        <div style="color:#94a3b8; font-size:0.68rem; margin:2px 0;">${activeHoverZone.desc}</div>
        <div style="color:#38bdf8; font-size:0.7rem; font-weight:700;">📍 ${carDist}m away • Click to Jump / Open</div>
      `;
      minimapTooltip.style.opacity = '1';
      minimapTooltip.style.transform = 'translateX(-50%) translateY(0)';
      minimapCanvas.style.cursor = 'pointer';
    } else if (minimapTooltip) {
      minimapTooltip.style.opacity = '0';
      minimapTooltip.style.transform = 'translateX(-50%) translateY(8px)';
      minimapCanvas.style.cursor = 'crosshair';
    }
  });

  minimapCanvas.addEventListener('click', () => {
    if (activeHoverZone) {
      fastTravelToZone(activeHoverZone.id);
    }
  });

  minimapCanvas.addEventListener('mouseleave', () => {
    activeHoverZone = null;
    if (minimapTooltip) {
      minimapTooltip.style.opacity = '0';
      minimapTooltip.style.transform = 'translateX(-50%) translateY(8px)';
    }
  });
}

// Fast Travel Modal DOM handling
// Renders all 10 distinct, styled destination cards
const fastTravelBtn = document.getElementById('fast-travel-btn');
const fastTravelModal = document.getElementById('fast-travel-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const travelList = document.getElementById('travel-list');

function openFastTravelModal() {
  if (!travelList) return;
  travelList.innerHTML = '';
  ZONES.forEach(z => {
    const card = document.createElement('div');
    card.className = 'zone-card-item';
    card.setAttribute('data-zone', z.id);
    card.innerHTML = `
      <div class="card-top-row">
        <div class="card-badge-wrap">
          <div class="zone-icon-box">${z.icon}</div>
          <span class="zone-num-pill">ZONE 0${z.id}</span>
        </div>
        <span class="card-tag-pill">${z.tags[0]}</span>
      </div>
      <div class="card-content">
        <h4>${z.name}</h4>
        <p>${z.desc}</p>
        <div class="card-tags">
          ${z.tags.map(t => `<span>#${t}</span>`).join('')}
        </div>
      </div>
      <div class="card-actions-row">
        <button class="card-btn-view">
          <span>View Page</span> 📄
        </button>
        <button class="card-btn-warp">
          <span>Fast Warp</span> ⚡
        </button>
      </div>
    `;
    card.querySelector('.card-btn-view')?.addEventListener('click', (e) => {
      e.stopPropagation();
      openPageModal(z.id);
    });
    card.querySelector('.card-btn-warp')?.addEventListener('click', (e) => {
      e.stopPropagation();
      fastTravelToZone(z.id);
    });
    travelList.appendChild(card);
  });
  fastTravelModal?.classList.add('open');
}

function closeFastTravelModal() {
  fastTravelModal?.classList.remove('open');
}

fastTravelBtn?.addEventListener('click', openFastTravelModal);
closeModalBtn?.addEventListener('click', closeFastTravelModal);

// Window Resize Handling
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize);

// Render Loop
let clock = 0;
function animate() {
  requestAnimationFrame(animate);
  clock += 0.035;

  // 1. Animate Crystal Beacons & Pulsing Neon Rings
  zoneBeacons.forEach((b, i) => {
    b.rotation.y = clock + i;
    b.position.y = 1.8 + Math.sin(clock * 2 + i) * 0.16;
  });

  zoneNeonRings.forEach((mat, i) => {
    mat.emissiveIntensity = 1.2 + Math.sin(clock * 3 + i) * 0.6;
  });

  zoneLightPillars.forEach((mesh, i) => {
    mesh.material.opacity = 0.12 + Math.sin(clock * 2.2 + i) * 0.05;
  });

  // 2. Animate Drifting Voxel Clouds
  clouds.forEach(c => {
    c.mesh.position.x += c.speed;
    if (c.mesh.position.x > 200) {
      c.mesh.position.x = -200;
    }
  });

  // 3. Update dynamic moving NPC vehicles
  updateNPCCars();

  // 4. Update driving physics, checkpoint auto-open/close & rotating minimap
  updatePhysics();

  renderer.render(scene, camera);
}

animate();

