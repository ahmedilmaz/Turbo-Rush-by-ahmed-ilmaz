
(() => {
  "use strict";

  const $ = id => document.getElementById(id);
  const container = $("scene-container");

  if (!container || !window.THREE) {
    document.body.innerHTML =
      '<div style="padding:30px;color:white;background:#07101d;font:18px Arial">Turbo Rush could not load Three.js. Check your internet connection and reload.</div>';
    return;
  }

  const THREE = window.THREE;

  let scene, camera, renderer, car;
  let running = false;
  let gameOver = false;
  let speed = 0;
  let distance = 0;
  let coinsCollected = 0;
  let nitro = 100;
  let condition = 100;
  let steer = 0;
  let accelerateHeld = false;
  let brakeHeld = false;
  let nitroHeld = false;
  let messageTime = 0;
  let animationStarted = false;
  let lastTime = 0;

  const keys = {};
  const traffic = [];
  const coins = [];
  const scenery = [];
  const roadMarks = [];
  const clock = new THREE.Clock();

  const materials = {};

  function material(name, color, roughness = 0.7, metalness = 0) {
    if (!materials[name]) {
      materials[name] = new THREE.MeshStandardMaterial({
        color, roughness, metalness
      });
    }
    return materials[name];
  }

  function box(parent, w, h, d, mat, x, y, z) {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d), mat
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  function showMessage(text, seconds = 1.4) {
    const el = $("message");
    if (el) el.textContent = text;
    messageTime = seconds;
  }

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 70, 260);

    camera = new THREE.PerspectiveCamera(
      65, 1, 0.1, 600
    );
    camera.position.set(0, 6, 12);

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.shadowMap.enabled = false;
    renderer.setSize(container.clientWidth || innerWidth, container.clientHeight || innerHeight);
    container.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0xe7f7ff, 0x506044, 2));

    const sun = new THREE.DirectionalLight(0xffffff, 2);
    sun.position.set(-20, 40, 25);
    scene.add(sun);

    createWorld();
    createPlayer();
    createTraffic();
    createCoins();

    resize();
    if (!animationStarted) {
      animationStarted = true;
      requestAnimationFrame(animate);
    }
  }

  function createWorld() {
    const grass = material("grass", 0x398b48);
    const asphalt = material("asphalt", 0x282d38);
    const white = material("white", 0xf7fbff);
    const barrier = material("barrier", 0xe9eff7);
    const red = material("barrierRed", 0xff304e);

    box(scene, 500, 0.2, 600, grass, 0, -0.2, -180);
    box(scene, 14, 0.12, 600, asphalt, 0, -0.04, -180);

    // Road edge lines
    for (const x of [-6.8, 6.8]) {
      box(scene, 0.18, 0.04, 600, white, x, 0.04, -180);
    }

    // Dashed lane dividers
    for (const x of [-2.33, 2.33]) {
      for (let z = 45; z >= -550; z -= 9) {
        const mark = box(scene, 0.12, 0.035, 4.3, white, x, 0.05, z);
        roadMarks.push(mark);
      }
    }

    // Roadside barriers
    for (const x of [-7.5, 7.5]) {
      for (let z = 40; z > -560; z -= 10) {
        box(scene, 0.28, 0.45, 5, barrier, x, 0.2, z);
        box(scene, 0.3, 0.08, 5, red, x, 0.44, z);
      }
    }

    // Distant mountains
    const mountainMat = material("mountains", 0x7896a4);
    for (let i = 0; i < 20; i++) {
      const mountain = new THREE.Mesh(
        new THREE.ConeGeometry(15 + Math.random() * 18, 20 + Math.random() * 25, 5),
        mountainMat
      );
      mountain.position.set(
        (i % 2 ? 1 : -1) * (45 + Math.random() * 40),
        5,
        -i * 25 - 30
      );
      scene.add(mountain);
    }

    // City buildings
    const colors = [0x667a91, 0x354a62, 0xa8b7c6, 0xc9b69b, 0x536b78];

    for (let i = 0; i < 65; i++) {
      for (const side of [-1, 1]) {
        const w = 4 + Math.random() * 7;
        const h = 7 + Math.random() * 30;
        const d = 5 + Math.random() * 10;
        const x = side * (14 + Math.random() * 40);
        const z = -i * 10 - Math.random() * 8;
        const mat = material(
          "building" + colors[Math.floor(Math.random() * colors.length)],
          colors[Math.floor(Math.random() * colors.length)]
        );
        const building = box(scene, w, h, d, mat, x, h / 2, z);
        scenery.push({ mesh: building, h, d });
      }
    }

    // Street lamps
    const lampPole = material("lampPole", 0x303d4d, 0.4, 0.4);
    const lampGlow = new THREE.MeshBasicMaterial({ color: 0xfff1b5 });

    for (let z = 25; z > -550; z -= 24) {
      for (const side of [-1, 1]) {
        const x = side * 8.7;
        box(scene, 0.12, 4.8, 0.12, lampPole, x, 2.4, z);
        box(scene, 1.2, 0.12, 0.12, lampPole, x - side * 0.5, 4.7, z);
        box(scene, 0.42, 0.12, 0.3, lampGlow, x - side * 1.05, 4.62, z);
      }
    }
  }

  function createPlayer() {
    car = new THREE.Group();
    scene.add(car);
    car.position.set(0, 0, 3);

    const body = material("playerBody", 0xff263f, 0.28, 0.4);
    const glass = material("glass", 0x173a57, 0.2, 0.3);
    const tire = material("tire", 0x101218);
    const trim = material("trim", 0xc9e8f7, 0.25, 0.6);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xfff8d1 });
    const tail = new THREE.MeshBasicMaterial({ color: 0xff001e });

    box(car, 1.85, 0.5, 3.55, body, 0, 0.65, 0);
    box(car, 1.45, 0.58, 1.7, glass, 0, 1.12, -0.35);
    box(car, 1.8, 0.14, 0.7, body, 0, 0.9, -1.35);
    box(car, 1.8, 0.12, 0.65, body, 0, 0.92, 1.36);
    box(car, 1.65, 0.08, 0.18, trim, 0, 0.93, -1.79);

    for (const x of [-0.98, 0.98]) {
      for (const z of [-1.05, 1.05]) {
        box(car, 0.35, 0.48, 0.68, tire, x, 0.38, z);
      }
    }

    box(car, 0.42, 0.16, 0.08, lamp, -0.57, 0.7, -1.81);
    box(car, 0.42, 0.16, 0.08, lamp, 0.57, 0.7, -1.81);
    box(car, 0.4, 0.15, 0.08, tail, -0.57, 0.72, 1.81);
    box(car, 0.4, 0.15, 0.08, tail, 0.57, 0.72, 1.81);
  }

  function createTrafficCar(color) {
    const group = new THREE.Group();
    const body = material("traffic" + color, color, 0.35, 0.2);
    const glass = material("trafficGlass" + color, 0x173348, 0.2);
    const tire = material("trafficTire", 0x101218);
    const lamp = new THREE.MeshBasicMaterial({ color: 0xffe8b4 });
    const tail = new THREE.MeshBasicMaterial({ color: 0xff001e });

    box(group, 1.65, 0.5, 3.15, body, 0, 0.55, 0);
    box(group, 1.32, 0.44, 1.5, glass, 0, 0.98, -0.2);

    for (const x of [-0.88, 0.88]) {
      for (const z of [-0.95, 0.95]) {
        box(group, 0.32, 0.42, 0.55, tire, x, 0.3, z);
      }
    }

    box(group, 0.3, 0.12, 0.08, lamp, -0.52, 0.66, -1.6);
    box(group, 0.3, 0.12, 0.08, lamp, 0.52, 0.66, -1.6);
    box(group, 0.28, 0.12, 0.08, tail, -0.52, 0.66, 1.6);
    box(group, 0.28, 0.12, 0.08, tail, 0.52, 0.66, 1.6);
    return group;
  }

  function createTraffic() {
    const colors = [0x147dff, 0xffcc27, 0xf4f5f7, 0x171b28, 0x18c88a, 0xff7b28];

    for (let i = 0; i < 9; i++) {
      const vehicle = createTrafficCar(colors[i % colors.length]);
      vehicle.position.set([-4.5, 0, 4.5][i % 3], 0, -35 - i * 35);
      scene.add(vehicle);
      traffic.push(vehicle);
    }
  }

  function createCoins() {
    const gold = new THREE.MeshStandardMaterial({
      color: 0xffcf2f,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0x503100
    });

    for (let i = 0; i < 24; i++) {
      const coin = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.14, 10, 20),
        gold
      );
      coin.position.set([-4.5, 0, 4.5][i % 3], 1.1, -18 - i * 23);
      scene.add(coin);
      coins.push(coin);
    }
  }

  function resetTraffic(vehicle) {
    vehicle.position.z = -210 - Math.random() * 100;
    vehicle.position.x = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)];
  }

  function resetCoin(coin) {
    coin.position.z = -230 - Math.random() * 280;
    coin.position.x = [-4.5, 0, 4.5][Math.floor(Math.random() * 3)];
  }

  function updateHUD() {
    $("speed").textContent = Math.round(speed * 5);
    $("distance").textContent = Math.floor(distance);
    $("coins").textContent = coinsCollected;
    $("nitroFill").style.width = nitro + "%";
    $("damageFill").style.width = condition + "%";
  }

  function startGame() {
    running = true;
    gameOver = false;
    speed = 0;
    distance = 0;
    coinsCollected = 0;
    nitro = 100;
    condition = 100;
    steer = 0;
    car.position.x = 0;
    car.rotation.z = 0;

    traffic.forEach((v, i) => {
      v.position.x = [-4.5, 0, 4.5][i % 3];
      v.position.z = -35 - i * 35;
    });

    coins.forEach((c, i) => {
      c.position.x = [-4.5, 0, 4.5][i % 3];
      c.position.z = -18 - i * 23;
    });

    $("overlay").classList.add("hidden");
    showMessage("RACE STARTED!", 1.5);
    updateHUD();
  }

  $("start").addEventListener("click", startGame);

  // FIXED: left is negative X; right is positive X.
  function currentSteer() {
    if (keys.ArrowLeft || keys.KeyA) return -1;
    if (keys.ArrowRight || keys.KeyD) return 1;
    return steer;
  }

  window.addEventListener("keydown", e => {
    keys[e.code] = true;

    if ([
      "ArrowLeft", "ArrowRight", "ArrowUp",
      "ArrowDown", "Space"
    ].includes(e.code)) e.preventDefault();

    if ((e.code === "Enter" || e.code === "Space") && !running) {
      if (gameOver || !running) startGame();
    }
  });

  window.addEventListener("keyup", e => {
    keys[e.code] = false;
  });

  window.addEventListener("blur", () => {
    Object.keys(keys).forEach(k => keys[k] = false);
    steer = 0;
    accelerateHeld = false;
    brakeHeld = false;
    nitroHeld = false;
  });

  function holdButton(id, callback) {
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

  holdButton("left", v => {
    if (v) steer = -1;
    else if (steer === -1) steer = 0;
  });

  holdButton("right", v => {
    if (v) steer = 1;
    else if (steer === 1) steer = 0;
  });

  holdButton("accelerate", v => accelerateHeld = v);
  holdButton("brake", v => brakeHeld = v);
  holdButton("boost", v => nitroHeld = v);

  function endGame() {
    running = false;
    gameOver = true;
    $("overlay").classList.remove("hidden");
    $("start").textContent = "RACE AGAIN";
    $("overlay").querySelector("h1").innerHTML = 'RACE <span>OVER</span>';
    $("overlay").querySelector("p").textContent =
      "Distance: " + Math.floor(distance) + " m  •  Coins: " + coinsCollected;
    $("overlay").querySelector(".eyebrow").textContent = "NICE TRY, RACER";
    showMessage("GAME OVER!", 3);
  }

  function animate(now) {
    requestAnimationFrame(animate);

    // Cap delta to avoid physics jumps when the tab becomes active.
    const dt = Math.min(clock.getDelta(), 0.04);

    if (running) {
      const go = accelerateHeld || keys.ArrowUp || keys.KeyW;
      const brake = brakeHeld || keys.ArrowDown || keys.KeyS;
      const boost = nitroHeld || keys.Space;

      if (go) speed += 20 * dt;
      else speed -= 4 * dt;

      if (brake) speed -= 28 * dt;

      if (boost && nitro > 0 && speed > 3) {
        speed += 24 * dt;
        nitro = Math.max(0, nitro - 25 * dt);
      } else {
        nitro = Math.min(100, nitro + 5 * dt);
      }

      speed = THREE.MathUtils.clamp(speed, 0, 38);

      const direction = currentSteer();
      // The car's horizontal position follows the requested direction.
      car.position.x += direction * (4.5 + speed * 0.13) * dt;
      car.position.x = THREE.MathUtils.clamp(car.position.x, -5.35, 5.35);

      car.rotation.z = THREE.MathUtils.lerp(
        car.rotation.z,
        -direction * 0.1,
        Math.min(1, dt * 8)
      );

      const travel = speed * dt * 2.7;
      distance += travel * 0.6;

      traffic.forEach(vehicle => {
        vehicle.position.z += travel;

        if (vehicle.position.z > 12) resetTraffic(vehicle);

        const dx = Math.abs(vehicle.position.x - car.position.x);
        const dz = Math.abs(vehicle.position.z - car.position.z);

        if (dx < 1.45 && dz < 2.5 && speed > 4) {
          condition = Math.max(0, condition - 25);
          speed *= 0.38;
          resetTraffic(vehicle);
          showMessage("CRASH! WATCH OUT!", 1.5);

          if (condition <= 0) endGame();
        }
      });

      coins.forEach(coin => {
        coin.position.z += travel;
        coin.rotation.y += dt * 3;

        if (
          Math.abs(coin.position.x - car.position.x) < 1.45 &&
          Math.abs(coin.position.z - car.position.z) < 2
        ) {
          coinsCollected++;
          resetCoin(coin);
          showMessage("+1 COIN!", 0.8);
        }

        if (coin.position.z > 12) resetCoin(coin);
      });

      scenery.forEach(item => {
        item.mesh.position.z += travel;
        if (item.mesh.position.z > 35) item.mesh.position.z -= 660;
      });

      roadMarks.forEach(mark => {
        mark.position.z += travel;
        if (mark.position.z > 45) mark.position.z -= 600;
      });

      if (messageTime > 0) {
        messageTime -= dt;
        if (messageTime <= 0) $("message").textContent = "";
      }

      updateHUD();
    }

    if (car && camera) {
      camera.position.x +=
        (car.position.x * 0.48 - camera.position.x) * Math.min(1, dt * 3.5);
      camera.position.y = 5.2;
      camera.position.z = car.position.z + 10.5;
      camera.lookAt(car.position.x * 0.45, 0.7, car.position.z - 9);
    }

    renderer.render(scene, camera);
  }

  function resize() {
    if (!camera || !renderer) return;
    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  window.addEventListener("resize", resize);

  if ("ResizeObserver" in window) {
    new ResizeObserver(resize).observe(container);
  }

  try {
    init();
    updateHUD();
  } catch (error) {
    console.error("Turbo Rush startup error:", error);
    container.innerHTML =
      '<div style="color:white;padding:24px;font:16px Arial">Game startup failed. Open the browser console (F12) to see the error.</div>';
  }
})();
