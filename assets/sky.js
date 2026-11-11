/* PhoneHub Pro — photoreal WebGL sky. One shader, any number of canvases. */
(function () {
  'use strict';

  var VERT = [
    'attribute vec2 p;',
    'void main(){ gl_Position = vec4(p, 0.0, 1.0); }'
  ].join('\n');

  var FRAG = [
    'precision highp float;',
    'uniform vec2  uRes;',
    'uniform float uTime;',
    'uniform vec2  uSun;',
    'uniform vec2  uMoon;',
    'uniform float uNight;',
    'uniform float uCover;',
    'uniform float uDark;',
    'uniform float uStars;',
    'uniform float uMoonAmt;',
    'uniform float uFog;',
    'uniform float uSunAmt;',
    'uniform float uScroll;',
    'uniform float uRain;',
    'uniform vec3  uZenith;',
    'uniform vec3  uHorizon;',

    'float hash21(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }',

    'float vnoise(vec2 p){',
    '  vec2 i = floor(p); vec2 f = fract(p);',
    '  vec2 u = f * f * (3.0 - 2.0 * f);',
    '  float a = hash21(i);',
    '  float b = hash21(i + vec2(1.0, 0.0));',
    '  float c = hash21(i + vec2(0.0, 1.0));',
    '  float d = hash21(i + vec2(1.0, 1.0));',
    '  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);',
    '}',

    'float fbm3(vec2 p){',
    '  float v = 0.0, a = 0.55;',
    '  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);',
    '  for(int i = 0; i < 3; i++){ v += a * vnoise(p); p = m * p * 2.03; a *= 0.5; }',
    '  return v;',
    '}',

    'float fbm4(vec2 p){',
    '  float v = 0.0, a = 0.55;',
    '  mat2 m = mat2(0.80, 0.60, -0.60, 0.80);',
    '  for(int i = 0; i < 4; i++){ v += a * vnoise(p); p = m * p * 2.03; a *= 0.5; }',
    '  return v;',
    '}',

    'float starLayer(vec2 uv, float asp, float scale, float thresh){',
    '  vec2 g = uv * vec2(asp, 1.0) * scale;',
    '  vec2 cell = floor(g); vec2 f = fract(g) - 0.5;',
    '  float rnd = hash21(cell);',
    '  float on = step(thresh, rnd);',
    '  float tw = 0.55 + 0.45 * sin(uTime * 1.1 + rnd * 90.0);',
    '  return smoothstep(0.42, 0.0, length(f)) * on * tw;',
    '}',

    'void main(){',
    '  vec2 uv = vec2(gl_FragCoord.x / uRes.x, 1.0 - gl_FragCoord.y / uRes.y);',
    '  float asp = uRes.x / uRes.y;',
    '  vec2 p = (uv - 0.5) * vec2(asp, 1.0);',
    '  vec2 sunP = (uSun - 0.5) * vec2(asp, 1.0);',
    '  vec2 moonP = (uMoon - 0.5) * vec2(asp, 1.0);',
    '  float sunD = length(p - sunP);',
    '  float moonD = length(p - moonP);',
    '  float alt = 1.0 - uv.y;',

    /* atmosphere gradient */
    '  float hz = pow(smoothstep(0.0, 1.0, alt), 0.85);',
    '  vec3 sky = mix(uHorizon, uZenith, hz);',
    '  sky += vec3(1.0, 0.80, 0.55) * exp(-sunD * 2.6) * 0.20 * uSunAmt;',
    '  sky += uHorizon * 0.22 * exp(-abs(uv.y - 0.94) * 22.0);',

    /* clouds: layered deck stretched toward the horizon, lit edges, shadowed bellies */
    '  float dz = 1.0 / max(0.22, 1.0 - uv.y);',
    '  float t = uTime * 0.020 + uScroll * 0.00010;',
    '  vec2 cq = vec2(uv.x * asp * 0.80 * dz + t * 1.10, 0.92 * dz + 0.30 * uv.x + t * 0.12);',
    '  float base = fbm4(cq * 0.98 + vec2(t * 0.9, 0.0));',
    '  float det  = fbm3(cq * 2.30 + base * 1.15 + vec2(t * 1.8, t * 0.22));',
    '  float micro = fbm3(cq * 5.40 + det * 0.85 + vec2(t * 3.1, t * 0.4));',
    '  float n = base * 0.60 + det * 0.54 + micro * 0.16;',
    '  float dens = smoothstep(0.76, 0.90, n + uCover * 0.44);',
    '  dens = clamp(dens + (micro - 0.5) * 1.25 * dens * (1.0 - dens), 0.0, 1.0);',
    '  dens *= 1.0 - smoothstep(0.52, 0.80, uv.y);',
    '  dens *= smoothstep(0.0, 0.14, uv.y);',
    '  dens *= 1.0 - 0.30 * exp(-sunD * 9.0) * uSunAmt;',

    '  vec2 ldir = normalize(vec2(-0.52, 0.60));',
    '  float lit  = fbm3(cq * 2.30 + base * 1.15 + ldir * 0.26 + vec2(t * 1.8, t * 0.22));',
    '  float lit2 = fbm3(cq * 2.30 + base * 1.15 + ldir * 0.68 + vec2(t * 1.8, t * 0.22));',
    '  float shade = clamp(0.54 + (det - lit) * 3.4 + (det - lit2) * 1.8, 0.0, 1.0);',
    '  vec3 cLit  = mix(vec3(1.0, 0.985, 0.955), vec3(0.150, 0.190, 0.280), uNight);',
    '  vec3 cDark = mix(mix(uHorizon * 0.55, vec3(0.30, 0.34, 0.42), 0.50), vec3(0.020, 0.032, 0.052), uNight);',
    '  vec3 cloud = mix(cDark, cLit, shade * shade * (3.0 - 2.0 * shade));',
    '  float rim = exp(-sunD * 3.0);',
    '  cloud += vec3(1.0, 0.84, 0.60) * rim * uSunAmt * 0.75;',
    '  float edge = 4.0 * dens * (1.0 - dens);',
    '  cloud += vec3(1.0, 0.96, 0.90) * edge * (0.35 + rim) * uSunAmt * 0.30 * (1.0 - uNight);',
    '  cloud *= 1.0 - 0.42 * smoothstep(0.45, 1.0, dens) * (1.0 - uNight * 0.55);',
    '  cloud *= mix(1.0, 0.55, uDark);',
    '  cloud = mix(cloud, uHorizon * 1.05, smoothstep(0.30, 0.80, uv.y) * 0.42);',
    '  sky = mix(sky, cloud, dens * 0.97);',

    /* sun: tight bloom, crisp disc, cloud occlusion */
    '  float glow = 0.62 * exp(-sunD * 30.0) + 0.26 * exp(-sunD * 8.0) + 0.07 * exp(-sunD * 2.4);',
    '  sky += vec3(1.0, 0.83, 0.58) * glow * uSunAmt * (1.0 - dens * 0.94);',
    '  float disc = smoothstep(0.0195, 0.0162, sunD);',
    '  sky = mix(sky, vec3(1.0, 0.995, 0.965), disc * uSunAmt * (1.0 - dens * 0.97));',
    '  sky += vec3(1.0, 0.97, 0.90) * exp(-sunD * 110.0) * uSunAmt * (1.0 - dens) * 0.30;',

    /* stars + milky way (only when stars are visible) */
    '  if (uStars > 0.01) {',
    '    float s1 = starLayer(uv, asp, 285.0, 0.982);',
    '    float s2 = starLayer(uv + 0.37, asp, 150.0, 0.991);',
    '    vec2 sg = uv * vec2(asp, 1.0) * 300.0;',
    '    float tint = hash21(floor(sg));',
    '    vec3 starCol = mix(vec3(0.74, 0.82, 1.0), vec3(1.0, 0.91, 0.76), tint);',
    '    float sf = smoothstep(0.0, 0.30, alt);',
    '    sky += starCol * (s1 * 0.85 + s2 * 1.35) * uStars * sf * (1.0 - dens * 0.9);',
    '    float bandMask = exp(-pow((uv.y - (0.60 - 0.40 * uv.x)) * 2.6, 2.0));',
    '    float mw = fbm3(vec2(uv.x * 3.2, uv.y * 7.4) + 3.0);',
    '    sky += mix(vec3(0.04, 0.05, 0.09), vec3(0.33, 0.35, 0.46), mw) * bandMask * uStars * 0.42 * (1.0 - dens * 0.9);',
    '  }',

    /* moon: albedo, maria, craters, limb darkening, phase, halo */
    '  if (uMoonAmt > 0.01 && moonD < 0.12) {',
    '    float mr = 0.0292;',
    '    vec2 mq = (p - moonP) / mr;',
    '    float z = sqrt(max(0.0, 1.0 - dot(mq, mq)));',
    '    float maria = smoothstep(0.40, 0.60, fbm3(mq * 1.40 + 4.0));',
    '    float crat = smoothstep(0.36, 0.68, fbm3(mq * 5.20 + 9.0));',
    '    float dust = fbm3(mq * 13.0 + 21.0);',
    '    vec3 alb = vec3(0.98, 0.96, 0.90) * (0.86 + 0.20 * crat + 0.10 * dust) * mix(1.0, 0.52, maria);',
    '    vec3 nrm = normalize(vec3(mq, max(z, 0.04)));',
    '    vec3 mldir = normalize(vec3(-0.30, 0.22, 0.93));',
    '    float nDotL = clamp(dot(nrm, mldir), 0.0, 1.0);',
    '    float limb = 0.42 + 0.58 * pow(z, 0.40);',
    '    vec3 moonCol = alb * (0.52 + 0.62 * nDotL) * limb;',
    '    moonCol += vec3(1.0, 0.96, 0.88) * pow(nDotL, 10.0) * 0.10;',
    '    float md = smoothstep(mr, mr * 0.955, moonD);',
    '    sky = mix(sky, moonCol, md * uMoonAmt * (1.0 - dens * 0.93));',
    '    sky += vec3(0.56, 0.66, 0.92) * exp(-moonD * 22.0) * 0.22 * uMoonAmt * (1.0 - dens * 0.8);',
    '  }',

    /* rain streaks */
    '  if (uRain > 0.01) {',
    '    vec2 rs = vec2((uv.x * asp + uv.y * 0.42) * 150.0, uv.y * 42.0 - uTime * 16.0);',
    '    vec2 rc = floor(rs);',
    '    float rh = hash21(rc);',
    '    float line = smoothstep(0.06, 0.0, abs(fract(rs.x) - 0.5)) * step(0.72, rh);',
    '    sky = mix(sky, vec3(0.72, 0.79, 0.88), line * uRain * 0.20);',
    '  }',

    /* horizon haze and fog */
    '  sky = mix(sky, mix(uHorizon, vec3(0.94, 0.96, 0.98), 0.16 * (1.0 - uNight)), uFog * smoothstep(0.98, 0.45, uv.y) * 0.92);',

    /* photographic finish: film grain, vignette, gentle gamma */
    '  float lum = dot(sky, vec3(0.299, 0.587, 0.114));',
    '  float grain = hash21(uv * uRes + fract(uTime) * 157.0) - 0.5;',
    '  sky += grain * mix(0.022, 0.010, clamp(lum, 0.0, 1.0));',
    '  float vig = smoothstep(1.30, 0.30, length(p * vec2(0.86, 1.0)));',
    '  sky *= mix(0.80, 1.0, vig);',
    '  sky = pow(clamp(sky, 0.0, 1.0), vec3(0.95));',

    '  gl_FragColor = vec4(sky, 1.0);',
    '}'
  ].join('\n');

  var PALETTE = {
    sunny:          { zen: [0.075, 0.290, 0.590], hor: [0.560, 0.760, 0.925], sun: 1.00, cover: 0.14, dark: 0.00, stars: 0.00, moon: 0.00, fog: 0.00, rain: 0.00 },
    partly:         { zen: [0.085, 0.275, 0.550], hor: [0.545, 0.735, 0.900], sun: 0.92, cover: 0.42, dark: 0.04, stars: 0.00, moon: 0.00, fog: 0.02, rain: 0.00 },
    cloudy:         { zen: [0.120, 0.175, 0.245], hor: [0.360, 0.425, 0.500], sun: 0.26, cover: 0.80, dark: 0.25, stars: 0.00, moon: 0.00, fog: 0.14, rain: 0.00 },
    rain:           { zen: [0.080, 0.120, 0.175], hor: [0.235, 0.295, 0.360], sun: 0.12, cover: 0.92, dark: 0.44, stars: 0.00, moon: 0.00, fog: 0.26, rain: 1.00 },
    storm:          { zen: [0.045, 0.065, 0.100], hor: [0.150, 0.195, 0.255], sun: 0.08, cover: 1.00, dark: 0.62, stars: 0.00, moon: 0.00, fog: 0.30, rain: 1.00 },
    snow:           { zen: [0.180, 0.235, 0.305], hor: [0.545, 0.610, 0.680], sun: 0.24, cover: 0.86, dark: 0.10, stars: 0.00, moon: 0.00, fog: 0.42, rain: 0.00 },
    fog:            { zen: [0.255, 0.300, 0.350], hor: [0.590, 0.645, 0.690], sun: 0.20, cover: 0.70, dark: 0.10, stars: 0.00, moon: 0.00, fog: 0.85, rain: 0.00 },
    night:          { zen: [0.009, 0.022, 0.055], hor: [0.042, 0.078, 0.135], sun: 0.00, cover: 0.12, dark: 0.00, stars: 1.00, moon: 1.00, fog: 0.00, rain: 0.00 },
    'partly-night': { zen: [0.012, 0.028, 0.062], hor: [0.052, 0.090, 0.150], sun: 0.00, cover: 0.32, dark: 0.08, stars: 0.76, moon: 0.94, fog: 0.02, rain: 0.00 }
  };

  var NIGHT_LOW = {
    cloudy: { zen: [0.016, 0.030, 0.052], hor: [0.058, 0.085, 0.118], sun: 0, cover: 0.82, dark: 0.28, stars: 0.12, moon: 0.08, fog: 0.06, rain: 0 },
    rain:   { zen: [0.011, 0.021, 0.038], hor: [0.042, 0.062, 0.088], sun: 0, cover: 0.94, dark: 0.46, stars: 0.05, moon: 0.04, fog: 0.10, rain: 1 },
    storm:  { zen: [0.006, 0.011, 0.020], hor: [0.026, 0.040, 0.058], sun: 0, cover: 1.00, dark: 0.64, stars: 0.02, moon: 0.02, fog: 0.12, rain: 1 },
    fog:    { zen: [0.034, 0.046, 0.060], hor: [0.082, 0.104, 0.128], sun: 0, cover: 0.72, dark: 0.22, stars: 0.07, moon: 0.08, fog: 0.62, rain: 0 },
    snow:   { zen: [0.026, 0.038, 0.054], hor: [0.074, 0.096, 0.124], sun: 0, cover: 0.88, dark: 0.18, stars: 0.09, moon: 0.08, fog: 0.34, rain: 0 }
  };

  function stateFor(kind, nm) {
    var base = (nm && NIGHT_LOW[kind]) || PALETTE[kind] || PALETTE.cloudy;
    var isNight = nm || kind === 'night' || kind === 'partly-night';
    return {
      zen: base.zen, hor: base.hor, sunAmt: base.sun, cover: base.cover,
      dark: base.dark, stars: base.stars, moonAmt: base.moon, fog: base.fog,
      rain: base.rain || 0, night: isNight ? 1 : 0,
      sunPos: isNight ? [0.745, 0.115] : [0.745, 0.155],
      moonPos: [0.700, 0.155]
    };
  }

  function compile(gl, type, src) {
    var sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      console.warn('sky shader:', gl.getShaderInfoLog(sh));
      return null;
    }
    return sh;
  }

  function Engine(canvas, opts) {
    opts = opts || {};
    var gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) return null;

    var vs = compile(gl, gl.VERTEX_SHADER, VERT);
    var fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return null;

    var prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('sky link:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    var buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    var U = {};
    ['uRes', 'uTime', 'uSun', 'uMoon', 'uNight', 'uCover', 'uDark', 'uStars', 'uMoonAmt', 'uFog', 'uSunAmt', 'uScroll', 'uRain', 'uZenith', 'uHorizon']
      .forEach(function (n) { U[n] = gl.getUniformLocation(prog, n); });

    var kind = opts.kind || 'night', nm = !!opts.nm;
    var st = stateFor(kind, nm);
    var running = false, visible = true, raf = 0, t0 = performance.now(), still = false, lastDraw = 0;
    var scrollFactor = opts.scrollFactor == null ? 1 : opts.scrollFactor;

    function resize() {
      var dpr = Math.min(opts.dpr || 1.75, window.devicePixelRatio || 1);
      var w = Math.max(1, canvas.clientWidth), h = Math.max(1, canvas.clientHeight);
      var nw = Math.round(w * dpr), nh = Math.round(h * dpr);
      if (canvas.width !== nw || canvas.height !== nh) {
        canvas.width = nw;
        canvas.height = nh;
        gl.viewport(0, 0, nw, nh);
      }
    }

    function draw(now) {
      resize();
      var t = still ? 6.0 : (now - t0) / 1000;
      var scroll = (window.skyScroll || 0) * scrollFactor;
      var sunY = st.sunPos[1] + Math.min(0.20, scroll * 0.00016);
      gl.uniform2f(U.uRes, canvas.width, canvas.height);
      gl.uniform1f(U.uTime, t);
      gl.uniform2f(U.uSun, st.sunPos[0], sunY);
      gl.uniform2f(U.uMoon, st.moonPos[0], st.moonPos[1]);
      gl.uniform1f(U.uNight, st.night);
      gl.uniform1f(U.uCover, st.cover);
      gl.uniform1f(U.uDark, st.dark);
      gl.uniform1f(U.uStars, st.stars);
      gl.uniform1f(U.uMoonAmt, st.moonAmt);
      gl.uniform1f(U.uFog, st.fog);
      gl.uniform1f(U.uSunAmt, st.sunAmt);
      gl.uniform1f(U.uScroll, scroll);
      gl.uniform1f(U.uRain, st.rain);
      gl.uniform3f(U.uZenith, st.zen[0], st.zen[1], st.zen[2]);
      gl.uniform3f(U.uHorizon, st.hor[0], st.hor[1], st.hor[2]);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    function loop(now) {
      if (!running) return;
      raf = requestAnimationFrame(loop);
      if (!visible) return;
      if (now - lastDraw < 33) return;
      lastDraw = now;
      draw(now);
    }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }, { threshold: 0 }).observe(canvas);
    }
    window.addEventListener('resize', function () { resize(); if (still) draw(performance.now()); });

    return {
      set: function (k, n, opt) {
        if (k) kind = k;
        if (n != null) nm = !!n;
        st = stateFor(kind, nm);
        still = !!(opt && opt.still);
        if (still) draw(performance.now());
      },
      start: function () { if (!running) { running = true; raf = requestAnimationFrame(loop); } },
      stop: function () { running = false; cancelAnimationFrame(raf); },
      draw: function () { draw(performance.now()); }
    };
  }

  window.SkyEngine = Engine;
  window.skyStateFor = stateFor;
})();
