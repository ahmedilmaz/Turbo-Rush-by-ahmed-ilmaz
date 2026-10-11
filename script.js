
(() => {
  "use strict";

  const $ = id => document.getElementById(id);

  const game = $("game");
  if (!game || !window.THREE) {
    console.error("Turbo Rush needs the game HTML and Three.js.");
    return;
  }

  // Prevent duplicate initialization
  if (window.turboRushStarted) return;
  window.turboRushStarted = true;

  const THREE = window.THREE;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 45, 230);

  const camera = new THREE.PerspectiveCamera(
    65,
    game.clientWidth / Math.max(game.clientHeight, 1),
    0.1,
    500
  );
  camera.position.set(0, 5, 10);

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(game.clientWidth, game.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  game.innerHTML = "";
  game.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xffffff, 0x465568, 2));

  const sunlight = new THREE.DirectionalLight(0xffffff, 2.3);
  sunlight.position.set(-15, 25, 15);
  sunlight.castShadow = true;
  scene.add(sunlight);

  const mat = (color, metalness = 0, roughness = 0.65) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness });

  const roadMat = mat(0x292d36);
  const lineMat = mat(0xffffff);
  const grassMat = mat(0x23833b);
  const wheelMat = mat(0x101116);
  const glassMat = mat(0x152e45, 0.45, 0.2);
  const goldMat = mat(0xffc928, 0.6, 0.25);
  const whiteMat = mat(0xffffff);

  function cube(w, h, d, material, x, y, z, parent = scene) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      material
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // World and road
  cube(500, 0.2, 500, grassMat, 0, -0.2, -100);

  cube(14, 0.15, 500, roadMat, 0, -0.05, -100);

  for (const x of [-7.3, 7.3]) {
    cube(0.22, 0.04, 500, whiteMat, x, 0.04, -100);
  }

  for (const x of [-2.33, 2.33]) {
    for (let z = 80; z > -350; z -= 8) {
      cube(0.11, 0.035, 3.5, lineMat, x, 0.05, z);
    }
  }

  // Player car
  const car = new THREE.Group();
  scene.add(car);
  car.position.set(0, 0, 4);

  const bodyMat = mat(0xff251f, 0.35, 0.28);
  const darkMat = mat(0x181b24, 0.15, 0.35);

  cube(1.8, 0.48, 3.5, bodyMat, 0, 0.65, 0, car);
  cube(1.45, 0.48, 1.65, glassMat, 0, 1.08, -0.35, car);
  cube(1.65, 0.13, 0.75, bodyMat, 0, 0.91, -1.25, car);
  cube(1.7, 0.12, 0.7, bodyMat, 0, 0.91, 1.28, car);

  for (const x of [-0.98, 0.98]) {
    for (const z of [-1.05, 1.05]) {
      const wheel = new THREE.Mesh(
        new THREE.BoxGeometry(0.36, 0.52, 0.7),
        wheelMat
      );
      wheel.position.set(x, 0.38, z);
      wheel.castShadow = true;
      car.add(wheel);
    }
  }

  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
  cube(0.42, 0.16, 0.08, headlightMat, -0.55, 0.7, -1.78, car);
  cube(0.42, 0.16, 0.08, headlightMat, 0.55, 0.7, -1.78, car);

  const redLightMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  cube(0.4, 0.14, 0.08, redLightMat, -0.55, 0.7, 1.78, car);
  cube(0.4, 0.14, 0.08, redLightMat, 0.55, 0.7, 1.78, car);

  // City buildings
  const buildings = [];
  const buildingMats = [
    mat(0x677a96), mat(0x39485f), mat(0x8998ac),
    mat(0xd0b28a), mat(0x596d78), mat(0x353d50)
  ];

  for (let i = 0; i < 100; i++) {
    for (const side of [-1, 1]) {
      const w = 3 + Math.random() * 7;
      const h = 5 + Math.random() * 27;
      const d = 5 + Math.random() * 10;
      const x = side * (12 + Math.random() * 35);
      const z = -i * 7 - Math.random() * 8;

      const b = cube(
        w, h, d,
        buildingMats[Math.floor(Math.random() * buildingMats.length)],
        x, h / 2 - 0.05, z
      );

      buildings.push({ mesh: b, x, h, d });
    }
  }

  // Traffic
  const traffic = [];
  const trafficColors = [0x1478ff, 0xffd32a, 0xeeeeee, 0x171923, 0x18bd75];

  function makeTraffic(z) {
    const group = new THREE.Group();
    const color = trafficColors[
      Math.floor(Math.random() * trafficColors.length)
    ];

    const vehicleMat = mat(color);
    cube(1.65, 0.52, 3.1, vehicleMat, 0, 0.55, 0, group);
    cube(1.3, 0.42, 1.35, glassMat, 0, 0.98, -0.25, group);

    for (const x of [-0.9, 0.9]) {
      for (const wz of [-0.9, 0.9]) {
        const wheel = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 0.42, 0.58),
          wheelMat
        );
        wheel.position.set(x, 0.3, wz);
        group.add(wheel);
      }
    }

    group.position.set([-4.5, 0, 4.5][Math.floor(Math.random() * 3)], 0, z);
    scene.add(group);
    traffic.push(group);
  }

  for (let i = 0; i < 9; i++) makeTraffic(-30 - i * 35);

  // Coins
  const coins = [];

  function makeCoin(z) {
    const coin = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.15, 10, 20),
      goldMat
    );
    coin.position.set([-4.5, 0, 4.5][Math.floor(Math.random() * 3)], 1.1, z);
    scene.add(coin);
    coins.push(coin);
  }

  for (let i = 0; i < 20; i++) makeCoin(-20 - i * 24);

  // Controls
  const keys = {};
  let steering = 0;
  let speed = 0;
  let distance = 0;
  let coinCount = 0;
  let damage = 0;
  let nitro = 100;
  let playing = false;
  let boosting = false;
  let braking = false;
  let accelerating = false;
  let lastTime = 0;
  let messageTimer = 0;

  function setMessage(text) {
    if ($("message")) $("message").textContent = text;
  }

  function updateHUD() {
    if ($("speed")) $("speed").textContent = Math.round(speed * 8);
    if ($("distance")) $("distance").textContent = Math.floor(distance);
    if ($("coins")) $("coins").textContent = coinCount;
    if ($("damage")) $("damage").textContent = damage + "%";
    if ($("nitroFill")) $("nitroFill").style.width = nitro + "%";
  }

  function startGame() {
    playing = true;
    speed = 0;
    distance = 0;
    coinCount = 0;
    damage = 0;
    nitro = 100;
    car.position.x = 0;
    car.rotation.z = 0;

    if ($("start")) $("start").textContent = "RESTART";
    setMessage("GO! DRIVE FAST!");
    updateHUD();
  }

  if ($("start")) $("start").addEventListener("click", startGame);

  window.addEventListener("keydown", e => {
    keys[e.code] = true;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(e.code)) {
      e.preventDefault();
    }
    if (e.code === "Enter" && !playing) startGame();
  });

  window.addEventListener("keyup", e => {
    keys[e.code] = false;
  });

  function bindHold(id, callback) {
    const el = $(id);
    if (!el) return;

    el.addEventListener("pointerdown", e => {
      e.preventDefault();
      callback(true);
      try { el.setPointerCapture(e.pointerId); } catch (_) {}
    });

    const release = e => {
      if (e) e.preventDefault();
      callback(false);
    };

    el.addEventListener("pointerup", release);
    el.addEventListener("pointercancel", release);
    el.addEventListener("lostpointercapture", () => callback(false));
    el.addEventListener("contextmenu", e => e.preventDefault());
  }

  bindHold("left", v => { if (v) steering = -1; else if (steering === -1) steering = 0; });
  bindHold("right", v => { if (v) steering = 1; else if (steering === 1) steering = 0; });
  bindHold("accelerate", v => accelerating = v);
  bindHold("brake", v => braking = v);
  bindHold("boost", v => boosting = v);

  // Keyboard + mobile steering direction is intentionally consistent:
  // LEFT = negative X; RIGHT = positive X.
  function getSteering() {
    if (keys.ArrowLeft || keys.KeyA) return -1;
    if (keys.ArrowRight || keys.KeyD) return 1;
    return steering;
  }

  function recycleTraffic(vehicle) {
    vehicle.position.z = -180 - Math.random() * 100;
    vehicle.position.x = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)];
  }

  function recycleCoin(coin) {
    coin.position.z = -180 - Math.random() * 240;
    coin.position.x = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)];
  }

  const clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    const dt = Math.min(clock.getDelta(), 0.05);
    const steer = getSteering();

    if (playing) {
      const wantAccelerate = accelerating || keys.ArrowUp || keys.KeyW;
      const wantBrake = braking || keys.ArrowDown || keys.KeyS;
      const wantBoost = boosting || keys.Space;

      if (wantAccelerate) speed += 22 * dt;
      else speed -= 5 * dt;

      if (wantBrake) speed -= 35 * dt;

      if (wantBoost && nitro > 0 && speed > 5) {
        speed += 25 * dt;
        nitro -= 22 * dt;
      } else {
        nitro = Math.min(100, nitro + 4 * dt);
      }

      speed = THREE.MathUtils.clamp(speed, 0, 38);

      // FIX: positive steering moves the car toward the RIGHT.
      car.position.x += steer * (5 + speed * 0.12) * dt;
      car.position.x = THREE.MathUtils.clamp(car.position.x, -5.5, 5.5);

      car.rotation.z = THREE.MathUtils.lerp(
        car.rotation.z,
        -steer * 0.12,
        Math.min(1, dt * 8)
      );

      const worldSpeed = speed * dt * 2.8;
      distance += worldSpeed * 0.12;

      traffic.forEach(vehicle => {
        vehicle.position.z += worldSpeed;

        if (vehicle.position.z > 12) recycleTraffic(vehicle);

        const dx = Math.abs(vehicle.position.x - car.position.x);
        const dz = Math.abs(vehicle.position.z - car.position.z);

        if (dx < 1.55 && dz < 2.6 && speed > 4) {
          damage = Math.min(100, damage + 25);
          speed *= 0.45;
          recycleTraffic(vehicle);
          setMessage("CRASH! WATCH THE ROAD!");
          messageTimer = 2;
        }
      });

      coins.forEach(coin => {
        coin.position.z += worldSpeed;
        coin.rotation.y += dt * 3;

        if (
          Math.abs(coin.position.x - car.position.x) < 1.5 &&
          Math.abs(coin.position.z - car.position.z) < 2.5
        ) {
          coinCount++;
          recycleCoin(coin);
          setMessage("+1 COIN!");
          messageTimer = 1;
        }

        if (coin.position.z > 12) recycleCoin(coin);
      });

      buildings.forEach(({ mesh }) => {
        mesh.position.z += worldSpeed;
        if (mesh.position.z > 25) mesh.position.z -= 700;
      });

      if (messageTimer > 0) {
        messageTimer -= dt;
        if (messageTimer <= 0) setMessage("");
      }

      if (damage >= 100) {
        playing = false;
        setMessage("GAME OVER! PRESS RESTART");
      }

      updateHUD();
    }

    // Smooth chase camera
    camera.position.x += (car.position.x * 0.55 - camera.position.x) * Math.min(1, dt * 4);
    camera.position.y = 4.8;
    camera.position.z = car.position.z + 9;
    camera.lookAt(car.position.x * 0.6, 0.8, car.position.z - 8);

    renderer.render(scene, camera);
  }

  function resize() {
    const w = game.clientWidth;
    const h = game.clientHeight;
    if (!w || !h) return;

    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(game);

  updateHUD();
  animate();
})();
