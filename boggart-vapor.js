(() => {
  'use strict';

  const stage = document.querySelector('.boggart-stage');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const compactDevice = window.matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  if (!stage || reducedMotion) return;

  const vertexSource = `
    attribute vec2 position;
    varying vec2 uv;
    void main() { uv = position * .5 + .5; gl_Position = vec4(position, 0., 1.); }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 uv;
    uniform vec2 resolution;
    uniform float time;
    uniform float layer;
    uniform float energy;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash(i), hash(i + vec2(1., 0.)), f.x), mix(hash(i + vec2(0., 1.)), hash(i + 1.), f.x), f.y);
    }
    float fbm(vec2 p) {
      float value = 0., amplitude = .5;
      for (int i = 0; i < 4; i++) { value += amplitude * noise(p); p = p * 2.03 + 17.7; amplitude *= .5; }
      return value;
    }
    float blob(vec2 p, vec2 center, vec2 radius) {
      return 1. - smoothstep(.32, 1., length((p - center) / radius));
    }
    void main() {
      vec2 p = uv * 2. - 1.;
      p.x *= resolution.x / resolution.y;
      float radius = max(length(p), .001);
      vec2 radial = p / radius;
      vec2 tangent = vec2(-radial.y, radial.x);
      vec2 flow = vec2(sin(time * .071 + layer * 2.3), cos(time * .089 - layer * 1.7));
      vec2 crossFlow = vec2(cos(time * .053 + 1.4), sin(time * .067 - 2.1));
      vec2 warp = vec2(fbm(p * 1.45 + flow * .42), fbm(p * 1.45 + crossFlow * .46 + 7.3)) - .5;
      vec2 q = p + warp * (.34 + energy * .06);
      float outwardTravel = time * (layer < .5 ? .009 : .014);
      vec2 advected = q - radial * outwardTravel + tangent * sin(time * .083 + radius * 7. + warp.x * 4.) * .055;
      float body = blob(q, vec2(0., .02), vec2(.72, .82));
      body = max(body, blob(q, vec2(-.48, .18), vec2(.4, .45)) * .8);
      body = max(body, blob(q, vec2(.5, .17), vec2(.42, .46)) * .8);
      body = max(body, blob(q, vec2(0., .63), vec2(.36, .37)) * .76);
      float detail = fbm(advected * (layer < .5 ? 2.15 : 3.1));
      float wisps = smoothstep(.41, .74, detail) * body;
      float detached = 0.;
      detached += blob(q, vec2(-.78 - sin(time * .17) * .13, .18 + cos(time * .13) * .18), vec2(.18, .23));
      detached += blob(q, vec2(.78 + cos(time * .19) * .13, -.08 + sin(time * .11) * .2), vec2(.17, .22));
      detached += blob(q, vec2(sin(time * .12) * .22, .78 + cos(time * .16) * .13), vec2(.2, .17));
      detached += blob(q, vec2(cos(time * .14) * .2, -.78 - sin(time * .1) * .12), vec2(.19, .17));
      float mist = smoothstep(.28, .72, fbm(advected * 1.6 + crossFlow * .18)) * (body * .65 + detached * .18);
      float alpha = layer < .5 ? (mist * .16 + wisps * .09) : (mist * .11 + wisps * .18 + detached * .04);
      alpha = max(alpha, body * (layer < .5 ? .035 : .025));
      float eyeLeft = exp(-88. * dot(p - vec2(-.25, -.12), p - vec2(-.25, -.12)));
      float eyeRight = exp(-88. * dot(p - vec2(.25, -.12), p - vec2(.25, -.12)));
      alpha *= 1. - max(eyeLeft, eyeRight) * .98;
      alpha *= 1. - smoothstep(.36, 1.34, length(p + warp * .12));
      alpha = clamp(alpha * (layer < .5 ? 9.1 : 11.2), 0., .86);
      vec3 color = mix(vec3(.13, .27, .34), vec3(.53, .72, .76), clamp(detail * 1.22, 0., 1.));
      gl_FragColor = vec4(color, alpha);
    }
  `;

  const compile = (gl, type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
  };

  const createLayer = (canvas, layer) => {
    const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: false, preserveDrawingBuffer: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return null;
    const vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    if (!vertex || !fragment) return null;
    const program = gl.createProgram();
    gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    return { gl, program, buffer, layer, position: gl.getAttribLocation(program, 'position'), resolution: gl.getUniformLocation(program, 'resolution'), time: gl.getUniformLocation(program, 'time'), layerUniform: gl.getUniformLocation(program, 'layer'), energy: gl.getUniformLocation(program, 'energy') };
  };

  // En celulares se conserva la capa frontal: la capa trasera sola queda
  // prácticamente oculta por la ilustración. Seguimos limitando resolución y
  // FPS para mantener el costo bajo sin perder el humo visible.
  const vaporCanvases = [...document.querySelectorAll('.boggart-vapor')]
    .map((canvas, layer) => ({ canvas, layer }));
  const activeCanvases = compactDevice ? vaporCanvases.slice(-1) : vaporCanvases;
  const inactiveCanvases = compactDevice ? vaporCanvases.slice(0, -1) : [];
  inactiveCanvases.forEach(({ canvas }) => { canvas.hidden = true; });
  const layers = activeCanvases
    .map(({ canvas, layer }) => createLayer(canvas, layer))
    .filter(Boolean);
  if (!layers.length) { stage.classList.add('no-webgl'); return; }
  stage.classList.add('has-vapor');
  let energy = 0;
  let running = false;
  let last = 0;

  const resize = () => layers.forEach(item => {
    const rect = item.gl.canvas.getBoundingClientRect();
    const densityLimit = compactDevice ? 1 : 1.35;
    const widthLimit = compactDevice ? 380 : 560;
    const scale = Math.min(window.devicePixelRatio || 1, densityLimit, widthLimit / Math.max(rect.width, 1));
    const width = Math.max(2, Math.round(rect.width * scale));
    const height = Math.max(2, Math.round(rect.height * scale));
    if (item.gl.canvas.width !== width || item.gl.canvas.height !== height) { item.gl.canvas.width = width; item.gl.canvas.height = height; }
  });

  const draw = (item, seconds) => {
    const { gl } = item;
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(item.program); gl.bindBuffer(gl.ARRAY_BUFFER, item.buffer);
    gl.enableVertexAttribArray(item.position); gl.vertexAttribPointer(item.position, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(item.resolution, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(item.time, seconds); gl.uniform1f(item.layerUniform, item.layer); gl.uniform1f(item.energy, energy);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const active = () => document.visibilityState === 'visible' && stage.closest('.screen')?.classList.contains('active');
  const frame = now => {
    if (compactDevice && now - last < 32) {
      if (active()) requestAnimationFrame(frame);
      else running = false;
      return;
    }
    last = now;
    energy += ((stage.matches(':hover') ? 1 : 0) - energy) * .035;
    if (active()) layers.forEach(item => draw(item, now * .001));
    if (active()) requestAnimationFrame(frame);
    else { running = false; }
  };
  const wake = () => { if (!running) { running = true; requestAnimationFrame(frame); } };

  const observer = new ResizeObserver(() => { resize(); wake(); });
  observer.observe(stage);
  document.addEventListener('visibilitychange', wake);
  stage.addEventListener('pointerenter', wake);
  resize(); wake();
  window.setInterval(() => { if (active()) wake(); }, 500);
})();
