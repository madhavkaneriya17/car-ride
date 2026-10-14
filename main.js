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
  0.1,
  2000
);

// TPP Camera Settings (BGMI / GTA Style)
const TPP_DISTANCE = 8.5;
const TPP_HEIGHT = 3.6;
const currentCameraLookAt = new THREE.Vector3(0, 1.2, 0);

// --- Renderer Setup ---
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.78);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0xbbf7d0, 0.45);
hemiLight.position.set(0, 100, 0);
scene.add(hemiLight);

// Sunlight
const dirLight = new THREE.DirectionalLight(0xfff7e6, 1.6);
dirLight.position.set(70, 120, 60);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.camera.near = 1.0;
dirLight.shadow.camera.far = 350;
const d = 75;
dirLight.shadow.camera.left = -d;
dirLight.shadow.camera.right = d;
dirLight.shadow.camera.top = d;
dirLight.shadow.camera.bottom = -d;
dirLight.shadow.bias = -0.0004;
dirLight.shadow.radius = 2.5;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x90caf9, 0.35);
fillLight.position.set(-50, 40, -50);
scene.add(fillLight);

// --- Procedural Textures ---
const grassPalette = [
  '#4a8522', '#529326', '#41751d', '#5ba32b',
  '#63b12f', '#3a6a19', '#6cbd34', '#467d20'
];

const kachhaPathPalette = [
  '#9c7544', '#936c3a', '#a67e4b', '#8a6333',
  '#ad8551', '#815d2f', '#b48c58', '#946f3e',
  '#8e6737', '#a17947'
];

function createMinecraftGrassTopTexture(repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
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

function createKachhaPathTexture(repeatX = 1, repeatY = 1) {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      ctx.fillStyle = kachhaPathPalette[Math.floor(Math.random() * kachhaPathPalette.length)];
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

// 1. Infinite Horizon Ground Plane
const INFINITE_MAP_SIZE = 1200;
const groundGeo = new THREE.PlaneGeometry(INFINITE_MAP_SIZE, INFINITE_MAP_SIZE);
const groundMat = new THREE.MeshStandardMaterial({
  map: createMinecraftGrassTopTexture(INFINITE_MAP_SIZE, INFINITE_MAP_SIZE),
  roughness: 0.85,
  metalness: 0.05
});
const infiniteGround = new THREE.Mesh(groundGeo, groundMat);
infiniteGround.rotation.x = -Math.PI / 2;
infiniteGround.position.y = 0;
infiniteGround.receiveShadow = true;
scene.add(infiniteGround);

const INVISIBLE_BARRIER_LIMIT = 37.5;

// 2. Town Grid Road Network
const PATH_WIDTH = 7.6; // Slightly more spacious road for comfortable navigation
const ROAD_HALF_WIDTH = PATH_WIDTH / 2; // 3.8
const RING_DIST = 24.0;

const roadNetworkGroup = new THREE.Group();

function createRoadSegment(w, h, x, z) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mat = new THREE.MeshStandardMaterial({
    map: createKachhaPathTexture(w, h),
    roughness: 0.95,
    metalness: 0.0
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.015, z);
  mesh.receiveShadow = true;
  return mesh;
}

function createRoadClearing(radius, x, z) {
  const geo = new THREE.CylinderGeometry(radius, radius, 0.03, 32);
  const mat = new THREE.MeshStandardMaterial({
    map: createKachhaPathTexture(radius * 2, radius * 2),
    roughness: 0.95
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, 0.016, z);
  mesh.receiveShadow = true;
  return mesh;
}

// Central Crossroads
roadNetworkGroup.add(createRoadSegment(72, PATH_WIDTH, 0, 0));
roadNetworkGroup.add(createRoadSegment(PATH_WIDTH, 72, 0, 0));

// Outer Ring Connector Roads
roadNetworkGroup.add(createRoadSegment(RING_DIST * 2, PATH_WIDTH, 0, -RING_DIST));
roadNetworkGroup.add(createRoadSegment(RING_DIST * 2, PATH_WIDTH, 0, RING_DIST));
roadNetworkGroup.add(createRoadSegment(PATH_WIDTH, RING_DIST * 2, -RING_DIST, 0));
roadNetworkGroup.add(createRoadSegment(PATH_WIDTH, RING_DIST * 2, RING_DIST, 0));

// Central Junction & Corner Clearings
roadNetworkGroup.add(createRoadClearing(PATH_WIDTH * 0.95, 0, 0));
roadNetworkGroup.add(createRoadClearing(PATH_WIDTH * 0.85, -RING_DIST, -RING_DIST));
roadNetworkGroup.add(createRoadClearing(PATH_WIDTH * 0.85, RING_DIST, -RING_DIST));
roadNetworkGroup.add(createRoadClearing(PATH_WIDTH * 0.85, -RING_DIST, RING_DIST));
roadNetworkGroup.add(createRoadClearing(PATH_WIDTH * 0.85, RING_DIST, RING_DIST));

// Inner branch lanes to zones 9 & 10
roadNetworkGroup.add(createRoadSegment(PATH_WIDTH * 0.9, 13, -12, -6));
roadNetworkGroup.add(createRoadSegment(PATH_WIDTH * 0.9, 13, 12, 6));

// Earthy Curb Borders along main lanes
const curbMat = new THREE.MeshStandardMaterial({ color: 0x785327, roughness: 0.98 });
function addRoadCurb(w, h, x, z) {
  const geo = new THREE.PlaneGeometry(w, h);
  const mesh = new THREE.Mesh(geo, curbMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.012, z);
  roadNetworkGroup.add(mesh);
}
addRoadCurb(72, 0.35, 0, -ROAD_HALF_WIDTH);
addRoadCurb(72, 0.35, 0, ROAD_HALF_WIDTH);
addRoadCurb(0.35, 72, -ROAD_HALF_WIDTH, 0);
addRoadCurb(0.35, 72, ROAD_HALF_WIDTH, 0);

scene.add(roadNetworkGroup);

// 3. 10 Destination Zones Configuration
const ZONES = [
  { id: 1, name: "Home / Welcome", desc: "Main entry plaza & intro", x: -RING_DIST, z: -RING_DIST, color: "#38bdf8", file: "pages/home.html" },
  { id: 2, name: "About Me", desc: "Story, background & journey", x: RING_DIST, z: -RING_DIST, color: "#a855f7", file: "pages/about.html" },
  { id: 3, name: "Projects", desc: "Interactive portfolio projects", x: -RING_DIST, z: RING_DIST, color: "#22c55e", file: "pages/projects.html" },
  { id: 4, name: "Contact Us", desc: "Socials, email & hire form", x: RING_DIST, z: RING_DIST, color: "#f97316", file: "pages/contact.html" },
  { id: 5, name: "Skills / Stack", desc: "Technologies, tools & skills", x: 0, z: -34, color: "#eab308", file: "pages/skills.html" },
  { id: 6, name: "Experience", desc: "Career timeline & positions", x: 0, z: 34, color: "#ec4899", file: "pages/experience.html" },
  { id: 7, name: "Services", desc: "Web & app development offerings", x: -34, z: 0, color: "#14b8a6", file: "pages/services.html" },
  { id: 8, name: "Testimonials", desc: "Client feedback & reviews", x: 34, z: 0, color: "#6366f1", file: "pages/testimonials.html" },
  { id: 9, name: "Gallery / Media", desc: "Screenshots, videos & art", x: -12, z: -12, color: "#f43f5e", file: "pages/gallery.html" },
  { id: 10, name: "Achievements", desc: "Awards, certificates & milestones", x: 12, z: 12, color: "#84cc16", file: "pages/achievements.html" }
];

const PAD_RADIUS = 3.8;
const padMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, metalness: 0.2 });
const padRingMaterial = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.3, metalness: 0.6 });
const postWoodMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
const signBoardMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.4 });

const zoneBeacons = [];

ZONES.forEach(zone => {
  const padGroup = new THREE.Group();
  padGroup.position.set(zone.x, 0.02, zone.z);

  const padGeo = new THREE.CylinderGeometry(PAD_RADIUS, PAD_RADIUS, 0.08, 24);
  const padMesh = new THREE.Mesh(padGeo, padMaterial);
  padMesh.receiveShadow = true;
  padGroup.add(padMesh);

  const ringGeo = new THREE.TorusGeometry(PAD_RADIUS + 0.05, 0.1, 8, 32);
  const ringMesh = new THREE.Mesh(ringGeo, padRingMaterial);
  ringMesh.rotation.x = Math.PI / 2;
  ringMesh.position.y = 0.04;
  padGroup.add(ringMesh);

  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.8, 8), postWoodMat);
  post.position.set(2.4, 0.9, -2.4);
  post.castShadow = true;
  padGroup.add(post);

  const board = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.1), signBoardMat);
  board.position.set(2.4, 1.5, -2.4);
  board.rotation.y = -Math.PI / 4;
  board.castShadow = true;
  padGroup.add(board);

  const beaconGeo = new THREE.OctahedronGeometry(0.4, 0);
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.8,
    roughness: 0.2
  });
  const beacon = new THREE.Mesh(beaconGeo, beaconMat);
  beacon.position.set(0, 1.8, 0);
  padGroup.add(beacon);
  zoneBeacons.push(beacon);

  scene.add(padGroup);
});

// ==========================================
// 4. MINECRAFT-STYLE PROCEDURAL TREES
// Scattered naturally across green grass zones
// ==========================================
const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3d1e, roughness: 0.9 });
const leavesMat1 = new THREE.MeshStandardMaterial({ color: 0x2e6616, roughness: 0.8 });
const leavesMat2 = new THREE.MeshStandardMaterial({ color: 0x3b7d1d, roughness: 0.8 });
const leavesMat3 = new THREE.MeshStandardMaterial({ color: 0x478f24, roughness: 0.8 });

function buildMinecraftTree(scale = 1.0) {
  const tree = new THREE.Group();

  // Wood Trunk
  const trunkGeo = new THREE.BoxGeometry(0.75 * scale, 3.2 * scale, 0.75 * scale);
  const trunk = new THREE.Mesh(trunkGeo, woodMat);
  trunk.position.y = (3.2 * scale) / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);

  // Leaves Tier 1 (Base wide canopy)
  const l1Geo = new THREE.BoxGeometry(3.0 * scale, 1.3 * scale, 3.0 * scale);
  const l1 = new THREE.Mesh(l1Geo, leavesMat1);
  l1.position.y = 2.4 * scale;
  l1.castShadow = true;
  tree.add(l1);

  // Leaves Tier 2 (Mid canopy)
  const l2Geo = new THREE.BoxGeometry(2.2 * scale, 1.1 * scale, 2.2 * scale);
  const l2 = new THREE.Mesh(l2Geo, leavesMat2);
  l2.position.y = 3.4 * scale;
  l2.castShadow = true;
  tree.add(l2);

  // Leaves Tier 3 (Top cap)
  const l3Geo = new THREE.BoxGeometry(1.2 * scale, 0.8 * scale, 1.2 * scale);
  const l3 = new THREE.Mesh(l3Geo, leavesMat3);
  l3.position.y = 4.2 * scale;
  l3.castShadow = true;
  tree.add(l3);

  return tree;
}

// Generate 48 trees safely in grass areas (strictly outside roads & pads)
const treePositions = [];
for (let i = 0; i < 70; i++) {
  const tx = (Math.random() - 0.5) * 80;
  const tz = (Math.random() - 0.5) * 80;

  // Verify tree is on grass, away from roads & pads (margin 3.5m)
  if (!isPointOnRoad(tx, tz, -1.8)) {
    const scale = 0.85 + Math.random() * 0.45;
    const tree = buildMinecraftTree(scale);
    tree.position.set(tx, 0, tz);
    tree.rotation.y = (Math.PI / 2) * Math.floor(Math.random() * 4);
    scene.add(tree);
    treePositions.push({ x: tx, z: tz, radius: 1.2 * scale });
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
    x: -30,
    z: 0,
    heading: Math.PI / 2,
    speed: 0.11,
    baseSpeed: 0.11,
    curSpeed: 0.11,
    color: '#dc2626',
    waypoints: [
      { x: 30, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -30 },
      { x: 0, z: 30 },
      { x: 0, z: 0 },
      { x: -30, z: 0 }
    ],
    wpIndex: 0
  },
  // 4. Cyan Truck patrolling inner branches
  {
    model: truckData2.car,
    wheels: truckData2.wheels,
    brakeMat: truckData2.brakeMat,
    x: 0,
    z: -30,
    heading: Math.PI,
    speed: 0.09,
    baseSpeed: 0.09,
    curSpeed: 0.09,
    color: '#0284c7',
    waypoints: [
      { x: 0, z: 30 },
      { x: 0, z: 0 },
      { x: -12, z: 0 },
      { x: -12, z: -12 },
      { x: -12, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: -30 }
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
// (Car NEVER penetrates onto green grass!)
// ==========================================
function isPointOnRoad(x, z, margin = 0.0) {
  // Check invisible boundary
  if (Math.abs(x) > INVISIBLE_BARRIER_LIMIT || Math.abs(z) > INVISIBLE_BARRIER_LIMIT) {
    return false;
  }

  const rw = ROAD_HALF_WIDTH - margin;

  // 1. Central horizontal main road
  if (Math.abs(z) <= rw && Math.abs(x) <= 36.5) return true;

  // 2. Central vertical main road
  if (Math.abs(x) <= rw && Math.abs(z) <= 36.5) return true;

  // 3. Outer Ring Top
  if (Math.abs(z - (-RING_DIST)) <= rw && Math.abs(x) <= RING_DIST + rw) return true;

  // 4. Outer Ring Bottom
  if (Math.abs(z - RING_DIST) <= rw && Math.abs(x) <= RING_DIST + rw) return true;

  // 5. Outer Ring Left
  if (Math.abs(x - (-RING_DIST)) <= rw && Math.abs(z) <= RING_DIST + rw) return true;

  // 6. Outer Ring Right
  if (Math.abs(x - RING_DIST) <= rw && Math.abs(z) <= RING_DIST + rw) return true;

  // 7. Branch path to Zone 9
  if (Math.abs(x - (-12)) <= rw && z >= -12 - rw && z <= rw) return true;

  // 8. Branch path to Zone 10
  if (Math.abs(x - 12) <= rw && z >= -rw && z <= 12 + rw) return true;

  // 9. Central Junction Circle
  if (x * x + z * z <= (PATH_WIDTH * 0.95) * (PATH_WIDTH * 0.95)) return true;

  // 10. Check all 10 Destination Pads
  for (const zone of ZONES) {
    const dx = x - zone.x;
    const dz = z - zone.z;
    if (dx * dx + dz * dz <= (PAD_RADIUS + 0.3) * (PAD_RADIUS + 0.3)) {
      return true;
    }
  }

  return false;
}

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
// 7. CYBER SPORTS COUPE 3D CAR (PLAYER CAR)
// ==========================================
const carGroup = new THREE.Group();
const wheelsToRoll = [];
const frontSteerWheels = [];

function createCarWheel(radius, width, rimColor = 0xfacc15) {
  const wheelAssembly = new THREE.Group();
  const steerPivot = new THREE.Group();
  wheelAssembly.add(steerPivot);

  const rollGroup = new THREE.Group();
  steerPivot.add(rollGroup);

  const tireGeo = new THREE.CylinderGeometry(radius, radius, width, 24);
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const tire = new THREE.Mesh(tireGeo, tireMat);
  tire.rotation.z = Math.PI / 2;
  tire.castShadow = true;
  rollGroup.add(tire);

  const rimGeo = new THREE.CylinderGeometry(radius * 0.55, radius * 0.55, width + 0.02, 16);
  const rimMat = new THREE.MeshStandardMaterial({ color: rimColor, metalness: 0.8, roughness: 0.25 });
  const rim = new THREE.Mesh(rimGeo, rimMat);
  rim.rotation.z = Math.PI / 2;
  rollGroup.add(rim);

  return { assembly: wheelAssembly, rollGroup, steerPivot };
}

function buildCyberSportsCar() {
  const yellowMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.25, metalness: 0.4 });
  const carbonMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.5, metalness: 0.6 });
  const darkGlassMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.8, transparent: true, opacity: 0.88 });
  const ledHeadMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.9 });
  const neonTailMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 1.0 });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.35, 4.4), carbonMat);
  chassis.position.y = 0.4;
  chassis.castShadow = true;
  carGroup.add(chassis);

  const body = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.2), yellowMat);
  body.position.set(0, 0.72, 0);
  body.castShadow = true;
  carGroup.add(body);

  const dome = new THREE.Mesh(new THREE.BoxGeometry(1.65, 0.55, 2.2), darkGlassMat);
  dome.position.set(0, 1.15, -0.2);
  dome.castShadow = true;
  carGroup.add(dome);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 1.6), yellowMat);
  roof.position.set(0, 1.45, -0.25);
  carGroup.add(roof);

  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.1, 0.4), carbonMat);
  splitter.position.set(0, 0.3, 2.15);
  carGroup.add(splitter);

  const wingPostL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.2), carbonMat);
  wingPostL.position.set(-0.7, 1.05, -1.9);
  carGroup.add(wingPostL);
  const wingPostR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.35, 0.2), carbonMat);
  wingPostR.position.set(0.7, 1.05, -1.9);
  carGroup.add(wingPostR);
  const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.45), carbonMat);
  wingBlade.position.set(0, 1.25, -1.9);
  wingBlade.castShadow = true;
  carGroup.add(wingBlade);

  const headStripL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.08), ledHeadMat);
  headStripL.position.set(-0.6, 0.75, 2.12);
  carGroup.add(headStripL);
  const headStripR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.12, 0.08), ledHeadMat);
  headStripR.position.set(0.6, 0.75, 2.12);
  carGroup.add(headStripR);

  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.08), neonTailMat);
  tailBar.position.set(0, 0.75, -2.12);
  carGroup.add(tailBar);

  const wRadius = 0.42;
  const wWidth = 0.32;

  const wFL = createCarWheel(wRadius, wWidth);
  wFL.assembly.position.set(-1.05, 0.42, 1.3);
  carGroup.add(wFL.assembly);
  frontSteerWheels.push(wFL.steerPivot);
  wheelsToRoll.push(wFL.rollGroup);

  const wFR = createCarWheel(wRadius, wWidth);
  wFR.assembly.position.set(1.05, 0.42, 1.3);
  carGroup.add(wFR.assembly);
  frontSteerWheels.push(wFR.steerPivot);
  wheelsToRoll.push(wFR.rollGroup);

  const wBL = createCarWheel(wRadius, wWidth);
  wBL.assembly.position.set(-1.05, 0.42, -1.3);
  carGroup.add(wBL.assembly);
  wheelsToRoll.push(wBL.rollGroup);

  const wBR = createCarWheel(wRadius, wWidth);
  wBR.assembly.position.set(1.05, 0.42, -1.3);
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

function openPageModal(zoneId) {
  const zone = ZONES.find(z => z.id === zoneId);
  if (!zone) return;

  if (pageModalTag) pageModalTag.textContent = `ZONE ${zone.id}`;
  if (pageModalTitle) pageModalTitle.textContent = zone.name;
  if (pageExternalLink) pageExternalLink.href = zone.file;
  if (pageIframe) pageIframe.src = zone.file;

  pageViewerModal?.classList.add('open');
  closeFastTravelModal();
}

function closePageModal() {
  pageViewerModal?.classList.remove('open');
  if (pageIframe) pageIframe.src = 'about:blank';
}

window.openPageModal = openPageModal;
window.closePageModal = closePageModal;

closePageViewerBtn?.addEventListener('click', closePageModal);
openZoneBtn?.addEventListener('click', () => {
  if (currentActiveZone) {
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
  lastAutoOpenedZoneId = targetZone.id;
  if (zoneAlertEl && zoneTitleEl) {
    zoneAlertEl.classList.add('visible');
    zoneTitleEl.textContent = `Zone ${targetZone.id}: ${targetZone.name}`;
  }

  // Close fast travel modal if open
  closeFastTravelModal();

  // "page na destination pr pochi jaye atle page open thi javo joi"
  // Automatically open the destination page!
  setTimeout(() => {
    openPageModal(targetZone.id);
  }, 350);
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

  // Collision with NPC vehicles: Player car NEVER moves or bounces! ONLY the NPC car yields!
  const MIN_CAR_SEPARATION = 5.2;
  for (const npc of npcCars) {
    const d = Math.hypot(nextPos.x - npc.x, nextPos.z - npc.z);
    if (d < MIN_CAR_SEPARATION) {
      // Direction from player car to NPC car
      const sepX = (npc.x - nextPos.x) / (d || 0.001);
      const sepZ = (npc.z - nextPos.z) / (d || 0.001);
      const overlap = MIN_CAR_SEPARATION - d;

      // Yield ONLY the NPC car away! Player car is NOT displaced or knocked back!
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
  // Blocked completely by grass boundary
  else {
    carState.speed *= -0.25; // Soft gentle bounce off road curb
    if (grassWarningEl) grassWarningEl.classList.add('active');
  }

  // 4. Update Car Mesh
  carGroup.position.copy(carState.position);
  carGroup.rotation.y = carState.heading;
  carGroup.rotation.z = -(carState.steerAngle) * (carState.speed / carState.maxSpeed) * 0.06;

  // Wheel Roll
  const wheelRollSpeed = carState.speed / 0.42;
  wheelsToRoll.forEach(w => { w.rotation.x += wheelRollSpeed; });

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

  // 7. Zone Detection & Automatic Page Opening
  // ("page na destination pr pochi jaye atle page open thi javo joi")
  let activeZone = null;
  for (const zone of ZONES) {
    const dist = Math.hypot(carState.position.x - zone.x, carState.position.z - zone.z);
    if (dist < 4.2) {
      activeZone = zone;
      break;
    }
  }

  currentActiveZone = activeZone;

  if (activeZone) {
    if (zoneAlertEl && zoneTitleEl) {
      zoneAlertEl.classList.add('visible');
      zoneTitleEl.textContent = `Zone ${activeZone.id}: ${activeZone.name}`;
    }

    // Automatically open destination page as soon as user arrives!
    if (lastAutoOpenedZoneId !== activeZone.id) {
      lastAutoOpenedZoneId = activeZone.id;
      setTimeout(() => {
        if (currentActiveZone && currentActiveZone.id === activeZone.id) {
          openPageModal(activeZone.id);
        }
      }, 350);
    }
  } else {
    if (zoneAlertEl) zoneAlertEl.classList.remove('visible');
    lastAutoOpenedZoneId = null;
  }

  // 8. Update Minimap
  updateMinimap();
}

// ==========================================
// 10. ROTATING ROUND RADAR MINIMAP ALGORITHM
// (Map rotates & translates around vehicle)
// ==========================================
const minimapCanvas = document.getElementById('minimap-canvas');
const minimapCtx = minimapCanvas?.getContext('2d');
const minimapTooltip = document.getElementById('minimap-tooltip');

const RADAR_SIZE = 190;
const RADAR_CX = 95;
const RADAR_CY = 95;
const RADAR_RADIUS = 88;
const RADAR_METERS = 58; // 58 meters visible across the radar
const RADAR_SCALE = RADAR_SIZE / RADAR_METERS; // pixels per world meter

function updateMinimap() {
  if (!minimapCtx) return;

  minimapCtx.clearRect(0, 0, RADAR_SIZE, RADAR_SIZE);

  // 1. Clip to Circular Radar Frame
  minimapCtx.save();
  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, RADAR_RADIUS, 0, Math.PI * 2);
  minimapCtx.clip();

  // Background Grass Biome
  minimapCtx.fillStyle = '#41751d';
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
  // A. Dirt Roads
  minimapCtx.strokeStyle = '#a67e4b';
  minimapCtx.lineCap = 'round';
  minimapCtx.lineJoin = 'round';
  minimapCtx.lineWidth = PATH_WIDTH;

  // Main Crossroads
  minimapCtx.beginPath();
  minimapCtx.moveTo(0, -36);
  minimapCtx.lineTo(0, 36);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.moveTo(-36, 0);
  minimapCtx.lineTo(36, 0);
  minimapCtx.stroke();

  // Outer Ring Road
  minimapCtx.strokeRect(-RING_DIST, -RING_DIST, RING_DIST * 2, RING_DIST * 2);

  // Branch Paths to Zones 9 & 10
  minimapCtx.beginPath();
  minimapCtx.moveTo(-12, 0);
  minimapCtx.lineTo(-12, -12);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.moveTo(12, 0);
  minimapCtx.lineTo(12, 12);
  minimapCtx.stroke();

  // Center & Corner Clearings
  minimapCtx.fillStyle = '#a67e4b';
  [
    [0, 0],
    [-RING_DIST, -RING_DIST],
    [RING_DIST, -RING_DIST],
    [-RING_DIST, RING_DIST],
    [RING_DIST, RING_DIST]
  ].forEach(p => {
    minimapCtx.beginPath();
    minimapCtx.arc(p[0], p[1], PATH_WIDTH * 0.85, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // B. Trees
  minimapCtx.fillStyle = '#265912';
  treePositions.forEach(t => {
    minimapCtx.beginPath();
    minimapCtx.arc(t.x, t.z, 1.2, 0, Math.PI * 2);
    minimapCtx.fill();
  });

  // C. 10 Destination Pads
  ZONES.forEach(zone => {
    // Outer Pad Circle
    minimapCtx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, PAD_RADIUS, 0, Math.PI * 2);
    minimapCtx.fill();

    // Colored Ring
    minimapCtx.strokeStyle = zone.color || '#38bdf8';
    minimapCtx.lineWidth = 0.6;
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, PAD_RADIUS, 0, Math.PI * 2);
    minimapCtx.stroke();

    // Center Beacon Dot
    minimapCtx.fillStyle = zone.color || '#38bdf8';
    minimapCtx.beginPath();
    minimapCtx.arc(zone.x, zone.z, 1.3, 0, Math.PI * 2);
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
  // Range Rings (15m, 30m)
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
  minimapCtx.lineWidth = 1;
  minimapCtx.setLineDash([3, 4]);

  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, 15 * RADAR_SCALE, 0, Math.PI * 2);
  minimapCtx.stroke();

  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, 28 * RADAR_SCALE, 0, Math.PI * 2);
  minimapCtx.stroke();
  minimapCtx.setLineDash([]);

  // Crosshairs
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
  minimapCtx.lineWidth = 1;
  minimapCtx.beginPath();
  minimapCtx.moveTo(RADAR_CX, RADAR_CY - RADAR_RADIUS);
  minimapCtx.lineTo(RADAR_CX, RADAR_CY + RADAR_RADIUS);
  minimapCtx.moveTo(RADAR_CX - RADAR_RADIUS, RADAR_CY);
  minimapCtx.lineTo(RADAR_CX + RADAR_RADIUS, RADAR_CY);
  minimapCtx.stroke();

  // Subtle Rotating Radar Scan Sweep
  const sweepAngle = clock * 2.2;
  const gradient = minimapCtx.createRadialGradient(RADAR_CX, RADAR_CY, 0, RADAR_CX, RADAR_CY, RADAR_RADIUS);
  gradient.addColorStop(0, 'rgba(56, 189, 248, 0.25)');
  gradient.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
  minimapCtx.fillStyle = gradient;
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
  minimapCtx.moveTo(0, -9);
  minimapCtx.lineTo(6, 7);
  minimapCtx.lineTo(0, 4);
  minimapCtx.lineTo(-6, 7);
  minimapCtx.closePath();
  minimapCtx.fill();

  minimapCtx.strokeStyle = '#0f172a';
  minimapCtx.lineWidth = 1.6;
  minimapCtx.stroke();

  // Headlight Beams fanning forward
  minimapCtx.fillStyle = 'rgba(254, 240, 138, 0.35)';
  minimapCtx.beginPath();
  minimapCtx.moveTo(-2, -9);
  minimapCtx.lineTo(-12, -26);
  minimapCtx.lineTo(12, -26);
  minimapCtx.lineTo(2, -9);
  minimapCtx.closePath();
  minimapCtx.fill();

  minimapCtx.restore();

  // End Circular Clip
  minimapCtx.restore();

  // 5. Radar Outer Glass Ring & Compass North Indicator
  minimapCtx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
  minimapCtx.lineWidth = 3;
  minimapCtx.beginPath();
  minimapCtx.arc(RADAR_CX, RADAR_CY, RADAR_RADIUS, 0, Math.PI * 2);
  minimapCtx.stroke();

  // Dynamic North Arrow on Radar Rim
  const northAngle = -carState.heading - Math.PI / 2;
  const nx = RADAR_CX + Math.cos(northAngle) * (RADAR_RADIUS - 9);
  const ny = RADAR_CY + Math.sin(northAngle) * (RADAR_RADIUS - 9);

  minimapCtx.fillStyle = '#ef4444';
  minimapCtx.beginPath();
  minimapCtx.arc(nx, ny, 4.5, 0, Math.PI * 2);
  minimapCtx.fill();
  minimapCtx.strokeStyle = '#ffffff';
  minimapCtx.lineWidth = 1.2;
  minimapCtx.stroke();
}

// Minimap Hover & Direct Click with Inverse Rotation Algorithm
if (minimapCanvas) {
  let activeHoverZone = null;

  minimapCanvas.addEventListener('mousemove', (e) => {
    const rect = minimapCanvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const dx = mouseX - RADAR_CX;
    const dy = mouseY - RADAR_CY;
    const distCenter = Math.hypot(dx, dy);

    activeHoverZone = null;

    if (distCenter <= RADAR_RADIUS) {
      // Inverse rotation by +carState.heading to map screen mouse to world coordinates
      const cos = Math.cos(carState.heading);
      const sin = Math.sin(carState.heading);
      const rx = (dx * cos - dy * sin) / RADAR_SCALE;
      const rz = (dx * sin + dy * cos) / RADAR_SCALE;

      const worldX = carState.position.x + rx;
      const worldZ = carState.position.z + rz;

      let minDistance = PAD_RADIUS + 2.0;

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
        <div class="tip-badge">ZONE ${activeHoverZone.id}</div>
        <div class="tip-name">${activeHoverZone.name}</div>
        <div class="tip-desc">${activeHoverZone.desc}</div>
        <div class="tip-dist">📍 ${carDist}m away • Click to Jump / Open</div>
      `;
      minimapTooltip.style.opacity = '1';
      minimapTooltip.style.transform = 'translateY(0)';
      minimapCanvas.style.cursor = 'pointer';
    } else if (minimapTooltip) {
      minimapTooltip.style.opacity = '0';
      minimapTooltip.style.transform = 'translateY(8px)';
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
      minimapTooltip.style.transform = 'translateY(8px)';
    }
  });
}

// Fast Travel Modal DOM handling
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
    card.innerHTML = `
      <div class="zone-badge" style="background:${z.color}22; color:${z.color}; border:1px solid ${z.color}44">
        ZONE ${z.id}
      </div>
      <div class="zone-details">
        <h4>${z.name}</h4>
        <p>${z.desc}</p>
      </div>
      <div class="card-actions">
        <button class="view-btn" onclick="openPageModal(${z.id})">View 📄</button>
        <button class="warp-btn" onclick="fastTravelToZone(${z.id})">Warp ⚡</button>
      </div>
    `;
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
  clock += 0.04;

  zoneBeacons.forEach((b, i) => {
    b.rotation.y = clock + i;
    b.position.y = 1.6 + Math.sin(clock * 2 + i) * 0.15;
  });

  // Update dynamic moving NPC vehicles (with reactive speed boost on player bump)
  updateNPCCars();

  // Update driving physics & rotating minimap
  updatePhysics();

  renderer.render(scene, camera);
}

animate();

