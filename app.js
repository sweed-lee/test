class QuantumGameState {
  constructor(savedState = {}) {
    this.qubits = savedState.qubits ?? 0;
    this.qubitsPerSecond = 0;
    this.upgrades = savedState.upgrades ?? {};
    this.emitterLevel = savedState.emitterLevel ?? 1;
    this.observerPosition = savedState.observerPosition ?? null;
    this.entanglementActive = savedState.entanglementActive ?? false;
    this.quantumComputerLevel = savedState.quantumComputerLevel ?? 0;
    this.entanglerLevel = savedState.entanglerLevel ?? 0;
    this.observerLevel = savedState.observerLevel ?? 0;
    this.clickValue = savedState.clickValue ?? 1;
    this.lastPhotonResult = null;
  }

  calculatePhotonCollapse(clickX, clickY, canvasWidth) {
    const leftBias = this.observerPosition === "left" ? 0.75 : 0.5;
    const rightBias = this.observerPosition === "right" ? 0.75 : 0.5;
    let probability = leftBias / (leftBias + rightBias);

    if (this.entanglementActive) {
      probability = 0.5 + Math.sin(Date.now() / 400) * 0.15;
    }

    const slit = Math.random() < probability ? "left" : "right";
    const qubitValue = this.clickValue + this.entanglerLevel * 0.5 + this.observerLevel * 0.25;
    this.lastPhotonResult = { slit, qubitValue };
    this.qubits += qubitValue;

    return { slit, qubitValue, clickX, clickY, canvasWidth };
  }

  recalculateQPS() {
    const base = this.emitterLevel * 0.4;
    const computerBoost = this.quantumComputerLevel * 1.5;
    const observerBoost = this.observerLevel * 0.2;
    const entanglerBoost = this.entanglerLevel * 0.35;
    this.qubitsPerSecond = base + computerBoost + observerBoost + entanglerBoost;
  }

  purchaseUpgrade(upgrade) {
    if (this.qubits < upgrade.cost) {
      return false;
    }
    this.qubits -= upgrade.cost;
    this.upgrades[upgrade.id] = (this.upgrades[upgrade.id] ?? 0) + 1;
    upgrade.apply(this);
    this.recalculateQPS();
    return true;
  }
}

class ExperimentRenderer {
  constructor(canvasElement, gameState) {
    this.canvas = canvasElement;
    this.ctx = canvasElement.getContext("2d");
    this.gameState = gameState;
    this.particles = [];
    this.hits = [];
  }

  drawStaticElements() {
    const { width, height } = this.canvas;
    const ctx = this.ctx;

    ctx.save();
    ctx.strokeStyle = "#1f2a44";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width * 0.45, 40);
    ctx.lineTo(width * 0.45, height - 40);
    ctx.moveTo(width * 0.55, 40);
    ctx.lineTo(width * 0.55, height - 40);
    ctx.stroke();

    ctx.fillStyle = "#6ee7ff";
    ctx.fillRect(width * 0.45 - 8, height / 2 - 30, 16, 8);
    ctx.fillRect(width * 0.55 - 8, height / 2 + 22, 16, 8);

    ctx.strokeStyle = "#3a486a";
    ctx.beginPath();
    ctx.moveTo(width - 80, 30);
    ctx.lineTo(width - 80, height - 30);
    ctx.stroke();

    if (this.gameState.observerPosition) {
      ctx.fillStyle = "#7cffba";
      const observerX = this.gameState.observerPosition === "left" ? width * 0.4 : width * 0.6;
      ctx.beginPath();
      ctx.arc(observerX, height / 2, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#0b0f1a";
      ctx.fillText("O", observerX - 3, height / 2 + 4);
    }

    ctx.restore();
  }

  spawnPhotonAnimation({ slit }) {
    const start = { x: 80, y: this.canvas.height / 2 };
    const slitX = slit === "left" ? this.canvas.width * 0.45 : this.canvas.width * 0.55;
    const slitY = slit === "left" ? this.canvas.height / 2 - 26 : this.canvas.height / 2 + 26;
    const end = { x: this.canvas.width - 80, y: slit === "left" ? this.canvas.height / 2 - 40 : this.canvas.height / 2 + 40 };
    this.particles.push({
      progress: 0,
      start,
      mid: { x: slitX, y: slitY },
      end,
      color: slit === "left" ? "#6ee7ff" : "#f8b4ff",
    });
  }

  updateAndDrawFrame() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawStaticElements();

    this.hits = this.hits.filter((hit) => hit.life > 0);
    this.hits.forEach((hit) => {
      hit.life -= 1;
      ctx.fillStyle = `rgba(126, 231, 255, ${hit.life / 60})`;
      ctx.fillRect(hit.x, hit.y, 3, 3);
    });

    this.particles = this.particles.filter((particle) => particle.progress < 1);
    this.particles.forEach((particle) => {
      particle.progress += 0.02;
      const t = particle.progress;
      const x = (1 - t) * (1 - t) * particle.start.x + 2 * (1 - t) * t * particle.mid.x + t * t * particle.end.x;
      const y = (1 - t) * (1 - t) * particle.start.y + 2 * (1 - t) * t * particle.mid.y + t * t * particle.end.y;

      ctx.beginPath();
      ctx.fillStyle = particle.color;
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();

      if (particle.progress >= 1) {
        this.hits.push({ x: particle.end.x, y: particle.end.y, life: 60 });
      }
    });

    requestAnimationFrame(() => this.updateAndDrawFrame());
  }
}

class UIManager {
  constructor(gameState, renderer, upgrades) {
    this.gameState = gameState;
    this.renderer = renderer;
    this.upgrades = upgrades;
    this.qubitDisplay = document.getElementById("qubit-count");
    this.qpsDisplay = document.getElementById("qps-count");
    this.experimentCanvas = document.getElementById("experiment-canvas");
    this.upgradeContainer = document.getElementById("upgrade-container");
    this.emitButton = document.getElementById("emit-button");
    this.tipBox = document.getElementById("tip-box");
    this.resetButton = document.getElementById("reset-button");
  }

  initializeUI() {
    this.upgrades.forEach((upgrade) => {
      const card = this.createUpgradeCard(upgrade);
      this.upgradeContainer.appendChild(card);
      upgrade.card = card;
    });

    this.emitButton.addEventListener("click", () => this.emitPhoton());
    this.experimentCanvas.addEventListener("click", (event) => {
      const rect = this.experimentCanvas.getBoundingClientRect();
      this.emitPhoton(event.clientX - rect.left, event.clientY - rect.top);
    });

    document.querySelectorAll(".toggle").forEach((toggle) => {
      toggle.addEventListener("click", () => {
        const value = toggle.dataset.observer;
        this.gameState.observerPosition = value === "none" ? null : value;
        document.querySelectorAll(".toggle").forEach((btn) => btn.classList.remove("active"));
        toggle.classList.add("active");
        this.renderer.drawStaticElements();
      });
    });

    this.resetButton.addEventListener("click", () => {
      localStorage.removeItem("quantum-clicker-save");
      window.location.reload();
    });
  }

  emitPhoton(clickX, clickY) {
    const result = this.gameState.calculatePhotonCollapse(clickX, clickY, this.experimentCanvas.width);
    this.renderer.spawnPhotonAnimation(result);
    this.showTip(result);
  }

  showTip(result) {
    const slitText = result.slit === "left" ? "left slit" : "right slit";
    this.tipBox.textContent = `Photon collapsed at the ${slitText}, generating +${result.qubitValue.toFixed(1)} qubits.`;
  }

  updateDisplays() {
    this.qubitDisplay.textContent = this.gameState.qubits.toFixed(1);
    this.qpsDisplay.textContent = this.gameState.qubitsPerSecond.toFixed(1);

    this.upgrades.forEach((upgrade) => {
      const count = this.gameState.upgrades[upgrade.id] ?? 0;
      upgrade.card.querySelector(".upgrade-level").textContent = `Level ${count}`;
      upgrade.card.querySelector(".upgrade-cost").textContent = `${upgrade.cost.toFixed(0)} Q`;
      const button = upgrade.card.querySelector("button");
      button.disabled = this.gameState.qubits < upgrade.cost;
      if (count > 0) {
        upgrade.card.querySelector(".upgrade-effect").textContent = upgrade.activeText;
      }
    });
  }

  createUpgradeCard(upgrade) {
    const card = document.createElement("div");
    card.className = "upgrade-card";
    card.innerHTML = `
      <h3>${upgrade.name}</h3>
      <p class="upgrade-effect">${upgrade.description}</p>
      <div class="upgrade-meta">
        <span class="upgrade-cost">${upgrade.cost} Q</span>
        <span class="upgrade-level">Level 0</span>
      </div>
      <button>Purchase</button>
    `;
    const button = card.querySelector("button");
    button.addEventListener("click", () => {
      if (this.gameState.purchaseUpgrade(upgrade)) {
        upgrade.cost = Math.ceil(upgrade.cost * upgrade.scaling);
      }
    });
    return card;
  }
}

class SaveSystem {
  static save(gameState) {
    const payload = {
      qubits: gameState.qubits,
      upgrades: gameState.upgrades,
      emitterLevel: gameState.emitterLevel,
      observerPosition: gameState.observerPosition,
      entanglementActive: gameState.entanglementActive,
      quantumComputerLevel: gameState.quantumComputerLevel,
      entanglerLevel: gameState.entanglerLevel,
      observerLevel: gameState.observerLevel,
      clickValue: gameState.clickValue,
    };
    localStorage.setItem("quantum-clicker-save", JSON.stringify(payload));
  }

  static load() {
    const raw = localStorage.getItem("quantum-clicker-save");
    if (!raw) {
      return new QuantumGameState();
    }
    try {
      const data = JSON.parse(raw);
      return new QuantumGameState(data);
    } catch (error) {
      console.warn("Failed to parse save, starting fresh.", error);
      return new QuantumGameState();
    }
  }
}

const upgrades = [
  {
    id: "emitter",
    name: "Photon Emitter",
    description: "Boosts base QPS by strengthening the emission rate.",
    activeText: "Emitters hum louder, increasing passive qubits.",
    cost: 15,
    scaling: 1.35,
    apply: (state) => {
      state.emitterLevel += 1;
    },
  },
  {
    id: "observer",
    name: "Observer Array",
    description: "Adds observers to subtly steer collapse outcomes.",
    activeText: "Observers align the wave function for steady bonuses.",
    cost: 35,
    scaling: 1.4,
    apply: (state) => {
      state.observerLevel += 1;
    },
  },
  {
    id: "entangler",
    name: "Entangler",
    description: "Entangles the slits for correlated outputs and bonus qubits.",
    activeText: "Entanglement stabilizes reward spikes.",
    cost: 90,
    scaling: 1.45,
    apply: (state) => {
      state.entanglerLevel += 1;
      state.entanglementActive = true;
    },
  },
  {
    id: "quantum-computer",
    name: "Quantum Computer",
    description: "Automates qubit synthesis with simulated computation cycles.",
    activeText: "Quantum computers generate qubits continuously.",
    cost: 160,
    scaling: 1.5,
    apply: (state) => {
      state.quantumComputerLevel += 1;
    },
  },
  {
    id: "amplifier",
    name: "Wave Amplifier",
    description: "Increases manual click value by intensifying the wave packet.",
    activeText: "Amplified clicks yield stronger collapses.",
    cost: 60,
    scaling: 1.4,
    apply: (state) => {
      state.clickValue += 0.6;
    },
  },
];

const gameState = SaveSystem.load();
const renderer = new ExperimentRenderer(document.getElementById("experiment-canvas"), gameState);
const ui = new UIManager(gameState, renderer, upgrades);

ui.initializeUI();
renderer.updateAndDrawFrame();

function gameLoop() {
  gameState.recalculateQPS();
  gameState.qubits += gameState.qubitsPerSecond / 10;
  ui.updateDisplays();
}

setInterval(gameLoop, 100);
setInterval(() => SaveSystem.save(gameState), 5000);
window.addEventListener("beforeunload", () => SaveSystem.save(gameState));
