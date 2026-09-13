"use strict";

/* Interactive point-cloud viewer for the results gallery.
   Reads static/data/<view>/<object>.json, written by
   tools/plotly_to_tacdeform.py. Format:
     { id, name, units:"mm", frames, object:[x,y,z,...],
       tracks:[[x,y,z,...] per frame], contact:[x,y,z] }
   No dependencies: points are projected and drawn on a 2D canvas. */

const OBJECTS = [
  { id: "toy-hammer", name: "Toy Hammer" },
  { id: "sponge-brush", name: "Sponge Brush" },
  { id: "pointer-stick", name: "Pointer Stick" },
  { id: "shoe", name: "Shoe" },
  { id: "bottle", name: "Bottle" },
  { id: "silicone-tube", name: "Silicone Tube" }
];

const TRAIL = 4;            // frames of track history drawn behind the head
const CLOUD = [214, 221, 228];
const VIRIDIS = [[68, 1, 84], [59, 82, 139], [33, 145, 140], [94, 201, 98], [253, 231, 37]];

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

function ramp(stops, t) {
  t = clamp(t, 0, 1);
  const span = 1 / (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t / span));
  const f = (t - i * span) / span;
  const a = stops[i];
  const b = stops[i + 1];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f];
}

class CloudViewer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.theta = -0.7;
    this.phi = 0.25;
    this.zoom = 1;
    this.size = 2.2;
    this.frame = 0;
    this.playing = false;
    this.bind();
  }

  setData(data) {
    this.data = data;
    const n = data.object.length / 3;
    const c = [0, 0, 0];
    let lo = [Infinity, Infinity, Infinity];
    let hi = [-Infinity, -Infinity, -Infinity];
    for (let i = 0; i < n; i++) {
      for (let k = 0; k < 3; k++) {
        const v = data.object[i * 3 + k];
        c[k] += v;
        if (v < lo[k]) lo[k] = v;
        if (v > hi[k]) hi[k] = v;
      }
    }
    this.center = c.map((v) => v / n);
    this.extent = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]) / 2 || 1;
    this.order = new Uint32Array(n);
    this.depth = new Float32Array(n);
    this.proj = new Float32Array(n * 2);
    this.frame = 0;
    this.draw();
  }

  bind() {
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    this.canvas.addEventListener("pointerdown", (e) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      this.canvas.setPointerCapture(e.pointerId);
    });
    this.canvas.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      e.preventDefault();
      this.theta -= (e.clientX - lastX) * 0.008;
      this.phi = clamp(this.phi + (e.clientY - lastY) * 0.006, -1.3, 1.3);
      lastX = e.clientX;
      lastY = e.clientY;
      this.draw();
    });
    const stop = () => { dragging = false; };
    this.canvas.addEventListener("pointerup", stop);
    this.canvas.addEventListener("pointercancel", stop);
    this.canvas.addEventListener("wheel", (e) => {
      e.preventDefault();
      this.zoom = clamp(this.zoom * (e.deltaY > 0 ? 0.92 : 1.08), 0.5, 4);
      this.draw();
    }, { passive: false });
    this.canvas.addEventListener("keydown", (e) => {
      const step = e.shiftKey ? 0.25 : 0.09;
      if (e.key === "ArrowLeft") this.theta -= step;
      else if (e.key === "ArrowRight") this.theta += step;
      else if (e.key === "ArrowUp") this.phi = clamp(this.phi - step, -1.3, 1.3);
      else if (e.key === "ArrowDown") this.phi = clamp(this.phi + step, -1.3, 1.3);
      else return;
      e.preventDefault();
      this.draw();
    });
  }

  project(x, y, z, w, h, scale) {
    const dx = x - this.center[0];
    const dy = y - this.center[1];
    const dz = z - this.center[2];
    const ct = Math.cos(this.theta);
    const st = Math.sin(this.theta);
    const cp = Math.cos(this.phi);
    const sp = Math.sin(this.phi);
    const rx = dx * ct - dy * st;
    const ry = dx * st + dy * ct;
    const py = dz * cp - ry * sp;
    return [w / 2 + rx * scale, h / 2 - py * scale, dz * sp + ry * cp];
  }

  draw() {
    const data = this.data;
    if (!data) return;
    const ctx = this.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (!w || !h) return;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const scale = (Math.min(w, h * 1.7) / (this.extent * 2.6)) * this.zoom;
    const n = data.object.length / 3;

    for (let i = 0; i < n; i++) {
      const p = this.project(data.object[i * 3], data.object[i * 3 + 1], data.object[i * 3 + 2], w, h, scale);
      this.proj[i * 2] = p[0];
      this.proj[i * 2 + 1] = p[1];
      this.depth[i] = p[2];
      this.order[i] = i;
    }
    const depth = this.depth;
    Array.prototype.sort.call(this.order, (a, b) => depth[a] - depth[b]);

    const r = this.size * this.zoom;
    for (let k = 0; k < n; k++) {
      const i = this.order[k];
      const shade = 0.78 + 0.22 * clamp((depth[i] / this.extent + 1) / 2, 0, 1);
      ctx.fillStyle = `rgb(${Math.round(CLOUD[0] * shade)},${Math.round(CLOUD[1] * shade)},${Math.round(CLOUD[2] * shade)})`;
      ctx.fillRect(this.proj[i * 2] - r / 2, this.proj[i * 2 + 1] - r / 2, r, r);
    }

    const frames = data.tracks;
    const count = frames[0].length / 3;
    for (let back = Math.min(TRAIL, this.frame); back >= 0; back--) {
      const pts = frames[this.frame - back];
      const alpha = back === 0 ? 1 : 0.16 + 0.5 * (1 - back / (TRAIL + 1));
      const radius = back === 0 ? r * 1.5 : r;
      for (let t = 0; t < count; t++) {
        const x = pts[t * 3];
        if (!Number.isFinite(x)) continue;
        const p = this.project(x, pts[t * 3 + 1], pts[t * 3 + 2], w, h, scale);
        const c = ramp(VIRIDIS, t / count);
        ctx.fillStyle = `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${alpha})`;
        ctx.fillRect(p[0] - radius / 2, p[1] - radius / 2, radius, radius);
      }
    }
  }

  play(onFrame) {
    if (this.playing) return;
    this.playing = true;
    const step = () => {
      if (!this.playing) return;
      this.frame = (this.frame + 1) % this.data.tracks.length;
      if (onFrame) onFrame(this.frame);
      this.draw();
      this.timer = setTimeout(() => requestAnimationFrame(step), 90);
    };
    step();
  }

  pause() {
    this.playing = false;
    clearTimeout(this.timer);
  }
}

const cache = new Map();

async function loadData(view, id) {
  const key = `${view}/${id}`;
  if (cache.has(key)) return cache.get(key);
  // Single-file preview builds inline the exports here.
  if (window.TACDEFORM_DATA && window.TACDEFORM_DATA[key]) {
    cache.set(key, window.TACDEFORM_DATA[key]);
    return window.TACDEFORM_DATA[key];
  }
  const res = await fetch(`static/data/${key}.json`);
  if (!res.ok) throw new Error("missing");
  const data = await res.json();
  cache.set(key, data);
  return data;
}

function setupPanel(root) {
  const view = root.dataset.viewer;
  const canvas = root.querySelector("canvas");
  const chips = root.querySelector(".object-chips");
  const slider = root.querySelector(".timeline");
  const playBtn = root.querySelector(".play");
  const sizeInput = root.querySelector(".point-size");
  const status = root.querySelector(".viewer-status");
  const stage = root.querySelector(".viewer-stage");
  const viewer = new CloudViewer(canvas);

  const setBusy = (text, empty) => {
    status.textContent = text;
    stage.classList.toggle("is-empty", Boolean(empty));
  };

  async function select(object, button) {
    chips.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(b === button)));
    viewer.pause();
    if (playBtn) playBtn.textContent = "Play";
    setBusy("Loading…", false);
    try {
      const data = await loadData(view, object.id);
      viewer.setData(data);
      if (slider) {
        slider.max = String(data.tracks.length - 1);
        slider.value = "0";
        slider.disabled = false;
      }
      if (playBtn) playBtn.disabled = false;
      setBusy(`${data.tracks[0].length / 3} tactile anchors, ${data.frames} frames`, false);
    } catch (err) {
      viewer.data = null;
      if (slider) slider.disabled = true;
      if (playBtn) playBtn.disabled = true;
      setBusy(`No export yet for ${object.name}. Add static/data/${view}/${object.id}.json to show it here.`, true);
    }
  }

  OBJECTS.forEach((object, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "chip";
    button.textContent = object.name;
    button.setAttribute("aria-pressed", String(index === 0));
    button.addEventListener("click", () => select(object, button));
    chips.appendChild(button);
  });

  if (slider) {
    slider.addEventListener("input", () => {
      viewer.pause();
      if (playBtn) playBtn.textContent = "Play";
      viewer.frame = Number(slider.value);
      viewer.draw();
    });
  }

  if (playBtn) {
    playBtn.addEventListener("click", () => {
      if (viewer.playing) {
        viewer.pause();
        playBtn.textContent = "Play";
      } else {
        viewer.play((f) => { if (slider) slider.value = String(f); });
        playBtn.textContent = "Pause";
      }
    });
  }

  if (sizeInput) {
    sizeInput.addEventListener("input", () => {
      viewer.size = Number(sizeInput.value);
      viewer.draw();
    });
  }

  window.addEventListener("resize", () => viewer.draw());
  const first = chips.querySelector("button");
  select(OBJECTS[0], first);
  return viewer;
}

const viewers = Array.from(document.querySelectorAll("[data-viewer]")).map(setupPanel);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) viewers.forEach((v) => v.pause());
});
window.tacdeformViewers = viewers;
