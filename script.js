
(() => {
  const $ = id => document.getElementById(id);
  const game = $("game");

  if (!window.THREE) {
    $("description").textContent = "Three.js failed to load. Refresh CodePen and try again.";
    return;
  }

  // ==================== SCENE ====================
  const THREE = window.THREE;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x07111e);
  scene.fog = new THREE.Fog(0x07111e, 70, 230);

  const camera = new THREE.PerspectiveCamera(
    65, innerWidth / innerHeight, 0.1, 500
  );
  camera.position.set(0, 6, -12);
  camera.lookAt(0, 1, 15);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.7));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.domElement.style.cssText =
    "position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none";
  game.prepend(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0xaadfff, 0x19202b, 2));

  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(-12, 25, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  scene.add(sun);

  const glowLight = new THREE.PointLight(0x00cfff, 16, 45);
  glowLight.position.set(0, 6, -3);
  scene.add(glowLight);

  function material(color, extra = {}) {
    return new THREE.MeshStandardMaterial({
      color, roughness: 0.4, metalness: 0.2, ...extra
    });
  }

  const roadMat = material(0x242a34, { roughness: 0.95 });
  const grassMat = material(0x102b29);
  const laneMat = material(0xdaf7ff, { emissive: 0x102b3a });
  const shoulderMat = material(0x8794a1);
  const tireMat = material(0x080b10, { roughness: 0.9 });
  const glassMat = material(0x163b57, { metalness: 0.45, roughness: 0.2 });
  const headlightMat = material(0xe7fbff, { emissive: 0x8acfff });
  const tailMat = material(0xff153c, { emissive: 0xff0022 });
  const coinMat = material(0xffca28, { emissive: 0x634000, metalness: 0.7 });

  function makeBox(w, h, d, mat, x, y, z, parent = scene) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }

  // ==================== ROAD ====================
  makeBox(300, 0.1, 400, grassMat, 0, -0.2, 140);
  makeBox(13, 0.15, 400, roadMat, 0, -0.08, 140);
  makeBox(0.22, 0.17, 400, shoulderMat, -6.55, 0, 140);
  makeBox(0.22, 0.17, 400, shoulderMat, 6.55, 0, 140);

  const roadLines = [];
  for (const x of [-2.17, 2.17]) {
    for (let i = 0; i < 36; i++) {
      roadLines.push(makeBox(0.07, 0.025, 3, laneMat, x, 0.02, i * 5));
    }
  }

  // Roadside lights
  const roadside = [];
  const poleMat = material(0x758ca0);
  const neonMat = material(0x00eaff, { emissive: 0x00aaff });
  for (let i = 0; i < 36; i++) {
    for (const side of [-1, 1]) {
      const group = new THREE.Group();
      group.position.set(side * 7.4, 0, i * 8 + 4);
      scene.add(group);
      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.1, 0.12), poleMat
      );
      pole.position.y = 0.55;
      group.add(pole);
      const lamp = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.13, 0.25), neonMat
      );
      lamp.position.y = 1.12;
      group.add(lamp);
      roadside.push(group);
    }
  }

  // Distant city buildings
  const cityMaterials = [
    material(0x101b2c), material(0x19283b), material(0x1b2435)
  ];
  for (let i = 0; i < 65; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    const h = 5 + Math.random() * 24;
    const building = new THREE.Mesh(
      new THREE.BoxGeometry(3 + Math.random() * 7, h, 4 + Math.random() * 7),
      cityMaterials[i % cityMaterials.length]
    );
    building.position.set(side * (18 + Math.random() * 42), h / 2, Math.random() * 230);
    scene.add(building);
  }

  // ==================== CARS ====================
  function createCar(color, isPlayer = false) {
    const group = new THREE.Group();
    const bodyMat = material(color, {
      metalness: 0.55,
      roughness: 0.23,
      emissive: isPlayer ? 0x003344 : 0x000000
    });

    // FRONT of every car points toward +Z
    makeBox(1.62, 0.43, 3.25, bodyMat, 0, 0.62, 0, group);
    makeBox(1.35, 0.22, 0.8, bodyMat, 0, 0.9, 1.0, group);
    makeBox(1.18, 0.48, 1.35, glassMat, 0, 1.12, -0.15, group);
    makeBox(1.4, 0.13, 0.2, bodyMat, 0, 0.46, 1.6, group);
    makeBox(1.4, 0.13, 0.2, bodyMat, 0, 0.46, -1.6, group);

    for (const x of [-0.54, 0.54]) {
      makeBox(0.31, 0.12, 0.08, headlightMat, x, 0.72, 1.64, group);
      makeBox(0.3, 0.12, 0.08, tailMat, x, 0.72, -1.64, group);
    }

    const wheels = [];
    for (const x of [-0.86, 0.86]) {
      for (const z of [-1.03, 1.03]) {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(0.35, 0.35, 0.22, 16), tireMat
        );
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x, 0.38, z);
        group.add(wheel);
        wheels.push(wheel);
      }
    }

    if (isPlayer) {
      const underglow = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.025, 2.7),
        new THREE.MeshBasicMaterial({
          color: 0x00eaff, transparent: true, opacity: 0.75
        })
      );
      underglow.position.y = 0.22;
      group.add(underglow);

      const rearGlow = new THREE.PointLight(0x00dfff, 2, 6);
      rearGlow.position.set(0, 0.5, -1.8);
      group.add(rearGlow);
    }

    group.userData.wheels = wheels;
    scene.add(group);
    return group;
  }

  const player = createCar(0x00cfff, true);
  player.position.set(0, 0, 0);

  // ==================== GAME STATE ====================
  const lanePositions = [-4.15, 0, 4.15];
  let lane = 1;
  let running = false;
  let speed = 0;
  let distance = 0;
  let coinCount = 0;
  let nitro = 100;
  let traffic = [];
  let coins = [];
  let spawnTimer = 0.8;
  let coinTimer = 1.8;
  let toastTimer = 0;
  let lastTime = 0;
  let crashFlash = 0;
  let best = 0;

  try {
    best = Number(localStorage.getItem("turboRushBest") || 0);
  } catch (e) {}

  const keys = {};
  const held = {
    accelerate: false, brake: false, boost: false,
    left: false, right: false
  };

  function steer(direction) {
    if (running) lane = THREE.MathUtils.clamp(lane + direction, 0, 2);
  }

  // Keyboard controls
  window.addEventListener("keydown", e => {
    const key = e.key.toLowerCase();

    if (["arrowup", "arrowdown", "arrowleft", "arrowright", " "].includes(key)) {
      e.preventDefault();
    }

    if (!keys[key]) {
      if (key === "a" || key === "arrowleft") steer(-1);
      if (key === "d" || key === "arrowright") steer(1);
    }

    keys[key] = true;

    if (!running && (key === "enter" || key === " ")) startGame();
  });

  window.addEventListener("keyup", e => {
    keys[e.key.toLowerCase()] = false;
  });

  window.addEventListener("blur", () => {
    Object.keys(keys).forEach(k => keys[k] = false);
    Object.keys(held).forEach(k => held[k] = false);
  });

  function bindHold(id, action) {
    const button = $(id);

    button.addEventListener("pointerdown", e => {
      e.preventDefault();
      held[action] = true;
      if (action === "left") steer(-1);
      if (action === "right") steer(1);
      try { button.setPointerCapture(e.pointerId); } catch (_) {}
    });

    const release = e => {
      e.preventDefault();
      held[action] = false;
    };

    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", () => {
      held[action] = false;
    });
    button.addEventListener("contextmenu", e => e.preventDefault());
  }

  bindHold("left", "left");
  bindHold("right", "right");
  bindHold("accelerate", "accelerate");
  bindHold("brake", "brake");
  bindHold("boost", "boost");

  function showToast(text) {
    $("toast").textContent = text;
    toastTimer = 1.1;
  }

  function updateHUD() {
    $("speed").textContent = Math.round(speed * 4.2);
    $("distance").textContent = Math.floor(distance) + " m";
    $("coins").textContent = "◆ " + coinCount;
    $("nitroFill").style.width = nitro + "%";
  }

  function removeObjects() {
    for (const t of traffic) scene.remove(t.mesh);
    for (const c of coins) scene.remove(c.mesh);
    traffic = [];
    coins = [];
  }

  function startGame() {
    removeObjects();
    running = true;
    lane = 1;
    speed = 0;
    distance = 0;
    coinCount = 0;
    nitro = 100;
    spawnTimer = 0.8;
    coinTimer = 1.8;
    toastTimer = 0;
    crashFlash = 0;

    player.position.set(0, 0, 0);
    player.rotation.set(0, 0, 0);

    $("title").textContent = "TURBO RUSH";
    $("description").textContent = "Hit the highway. Dodge traffic. Own the road.";
    $("start").textContent = "START ENGINE ▶";
    $("message").style.display = "none";
    $("damage").style.opacity = "0";
    $("toast").textContent = "";

    Object.keys(held).forEach(k => held[k] = false);
    updateHUD();
  }

  function endGame() {
    if (!running) return;
    running = false;
    speed = 0;

    try {
      if (distance > best) {
        best = Math.floor(distance);
        localStorage.setItem("turboRushBest", best);
      }
    } catch (e) {}

    $("title").textContent = "RACE OVER";
    $("description").textContent =
      `Distance: ${Math.floor(distance)} m • Coins: ${coinCount} • Best: ${best} m`;
    $("start").textContent = "RACE AGAIN ↻";
    $("message").style.display = "flex";
  }

  
const startButton = document.getElementById("start");

if (startButton) {
  startButton.addEventListener("click", function (e) {
    e.preventDefault();
    startGame();
  });
} else {
  console.error('Turbo Rush: Cannot find element with id="start"');
}


  function spawnTraffic() {
    const colors = [0xff3658, 0xffa62b, 0x805cff, 0xe8edf2, 0x32db8b, 0xff4ecb];
    const laneIndex = Math.floor(Math.random() * 3);
    const mesh = createCar(colors[Math.floor(Math.random() * colors.length)]);
    mesh.position.set(lanePositions[laneIndex], 0, 100 + Math.random() * 18);

    traffic.push({
      mesh,
      speedFactor: 0.38 + Math.random() * 0.2
    });
  }

  function spawnCoin() {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.12, 10, 22), coinMat
    );
    mesh.position.set(
      lanePositions[Math.floor(Math.random() * 3)],
      1.5,
      85 + Math.random() * 22
    );
    scene.add(mesh);
    coins.push({ mesh, spin: 2 + Math.random() * 2 });
  }

  // ==================== MAIN LOOP ====================
  function animate(time) {
    requestAnimationFrame(animate);
    const dt = Math.min((time - (lastTime || time)) / 1000, 0.05);
    lastTime = time;

    if (running) {
      const accelerating =
        keys.w || keys.arrowup || held.accelerate;
      const braking =
        keys.s || keys.arrowdown || held.brake;
      const boosting =
        (keys.shift || held.boost) && nitro > 0 && !braking;

      if (accelerating) speed += 1.25 * dt;
      else speed -= 0.16 * dt;

      if (braking) speed -= 2.8 * dt;
      speed = THREE.MathUtils.clamp(speed, 0, 32);

      if (boosting) {
        speed = Math.min(38, speed + 1.5 * dt);
        nitro = Math.max(0, nitro - 24 * dt);
      } else {
        nitro = Math.min(100, nitro + 8 * dt);
      }

      const worldSpeed = 8 + speed * 2.2;
      distance += speed * dt * 1.4;

      // Car stays facing forward (+Z); steering changes lane only.
      const targetX = lanePositions[lane];
      player.position.x += (targetX - player.position.x) * Math.min(1, dt * 7);
      player.rotation.z = THREE.MathUtils.clamp(
        (targetX - player.position.x) * -0.04, -0.12, 0.12
      );
      player.position.y = Math.sin(time * 0.009) * 0.015;

      for (const wheel of player.userData.wheels) {
        wheel.rotation.x += worldSpeed * dt * 0.25;
      }

      // Road dashes and roadside lights move toward the camera.
      for (const line of roadLines) {
        line.position.z -= worldSpeed * dt;
        if (line.position.z < -12) line.position.z += 180;
      }

      for (const post of roadside) {
        post.position.z -= worldSpeed * dt;
        if (post.position.z < -15) post.position.z += 288;
      }

      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnTraffic();
        spawnTimer = Math.max(0.55, 1.6 - speed * 0.02) + Math.random() * 0.5;
      }

      for (let i = traffic.length - 1; i >= 0; i--) {
        const t = traffic[i];
        t.mesh.position.z -= worldSpeed * dt * t.speedFactor;

        for (const wheel of t.mesh.userData.wheels) {
          wheel.rotation.x += worldSpeed * dt * 0.2;
        }

        const dz = Math.abs(t.mesh.position.z);
        const dx = Math.abs(t.mesh.position.x - player.position.x);

        if (dz < 2.25 && dx < 1.4) {
          crashFlash = 0.35;
          $("damage").style.opacity = "0.75";
          showToast("CRASH!");
          endGame();
          break;
        }

        if (t.mesh.position.z < -15) {
          scene.remove(t.mesh);
          traffic.splice(i, 1);
        }
      }

      coinTimer -= dt;
      if (coinTimer <= 0) {
        spawnCoin();
        coinTimer = 1.2 + Math.random() * 1.2;
      }

      for (let i = coins.length - 1; i >= 0; i--) {
        const c = coins[i];
        c.mesh.position.z -= worldSpeed * dt;
        c.mesh.rotation.y += c.spin * dt;
        c.mesh.position.y = 1.5 + Math.sin(time * 0.004 + i) * 0.13;

        if (
          Math.abs(c.mesh.position.z) < 2.2 &&
          Math.abs(c.mesh.position.x - player.position.x) < 1.5
        ) {
          coinCount++;
          showToast("+1 COIN!");
          scene.remove(c.mesh);
          coins.splice(i, 1);
          continue;
        }

        if (c.mesh.position.z < -12) {
          scene.remove(c.mesh);
          coins.splice(i, 1);
        }
      }

      // Camera follows from behind the car (-Z), looking ahead (+Z).
      camera.position.x +=
        (player.position.x * 0.25 - camera.position.x) * Math.min(1, dt * 2);
      camera.position.y = 6 + (boosting ? 0.15 : 0);
      camera.position.z = -12;
      camera.lookAt(player.position.x * 0.12, 0.8, 15);

      glowLight.intensity = boosting ? 24 : 16;

      crashFlash = Math.max(0, crashFlash - dt);
      if (crashFlash === 0 && running) $("damage").style.opacity = "0";

      if (toastTimer > 0) {
        toastTimer -= dt;
        if (toastTimer <= 0) $("toast").textContent = "";
      }

      if (boosting) {
        $("toast").textContent = "⚡ NITRO BOOST!";
      }

      updateHUD();
    } else {
      // Show the car and road ahead while waiting to start.
      camera.position.x = Math.sin(time * 0.00018) * 0.45;
      camera.position.y = 6;
      camera.position.z = -12;
      camera.lookAt(0, 0.8, 15);
      player.rotation.set(0, 0, 0);
    }

    renderer.render(scene, camera);
  }

  function resize() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth, innerHeight);
  }

  window.addEventListener("resize", resize);
  updateHUD();
  requestAnimationFrame(animate);
})();
