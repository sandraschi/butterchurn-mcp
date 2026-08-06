const HEADER = `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_bass;
uniform float u_mid;
uniform float u_high;
uniform float u_bpm;
uniform float u_beat;
in vec2 v_uv;
out vec4 fragColor;

`;

export const SHADER_SCENES = [
  {
    id: "gyroid-pulse",
    name: "Gyroid Pulse",
    description: "Mathematical gyroid SDF pulsing with bass hits",
    author: "viz-toolbox",
    tags: ["raymarch", "3d", "bass"],
    gradient: "linear-gradient(135deg, #6366f1 0%, #ec4899 100%)",
    fragment: HEADER + `
float gyroid(vec3 p) {
  return dot(sin(p), cos(p.yzx));
}

float map(vec3 p) {
  float g = gyroid(p * (1.2 + u_bass * 0.8));
  return length(p) - 1.2 - g * (0.35 + u_beat * 0.25) - u_bass * 0.4;
}

vec3 calcNormal(vec3 p) {
  vec2 e = vec2(0.001, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)
  ));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  vec3 ro = vec3(0.0, 0.0, -3.5);
  vec3 rd = normalize(vec3(uv, 1.2));
  float t = 0.0;
  vec3 col = vec3(0.02, 0.01, 0.05);
  for (int i = 0; i < 80; i++) {
    vec3 p = ro + rd * t;
    p.xy *= mat2(cos(u_time * 0.15), -sin(u_time * 0.15), sin(u_time * 0.15), cos(u_time * 0.15));
    float d = map(p);
    if (d < 0.001) {
      vec3 n = calcNormal(p);
      vec3 light = normalize(vec3(0.6, 0.8, -0.5));
      float diff = max(dot(n, light), 0.0);
      col = mix(vec3(0.1, 0.3, 0.9), vec3(0.9, 0.2, 0.6), u_mid) * (diff + 0.15);
      col += vec3(0.4, 0.1, 0.5) * pow(max(dot(reflect(rd, n), light), 0.0), 8.0);
      col *= 1.0 + u_beat * 0.6;
      break;
    }
    t += d;
    if (t > 20.0) break;
  }
  col += vec3(0.05, 0.02, 0.12) * u_high;
  fragColor = vec4(pow(col, vec3(0.9)), 1.0);
}
`,
  },
  {
    id: "neon-tunnel",
    name: "Neon Tunnel",
    description: "Infinite tunnel with BPM-synced speed and neon rims",
    author: "viz-toolbox",
    tags: ["tunnel", "neon", "bpm"],
    gradient: "linear-gradient(135deg, #06b6d4 0%, #8b5cf6 100%)",
    fragment: HEADER + `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float speed = 1.5 + u_bpm / 120.0 + u_bass * 2.0;
  float z = 1.0 / (abs(uv.y) + 0.08);
  float x = uv.x * z;
  float t = u_time * speed;
  float grid = abs(sin(x * 3.0 + t)) * abs(sin(z * 0.5 - t * 1.3));
  grid = pow(grid, 0.35 + u_mid * 0.3);
  vec3 col = mix(vec3(0.0, 0.15, 0.25), vec3(0.6, 0.1, 0.9), grid);
  col += vec3(0.2, 0.8, 1.0) * pow(grid, 3.0) * (0.5 + u_beat);
  col *= 0.6 + 0.4 * smoothstep(0.0, 1.5, z * 0.08);
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "spectrum-rings",
    name: "Spectrum Rings",
    description: "Rotating rings driven by mid and treble bands",
    author: "viz-toolbox",
    tags: ["2d", "spectrum", "clean"],
    gradient: "linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)",
    fragment: HEADER + `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  vec3 col = vec3(0.03);
  for (float i = 1.0; i <= 6.0; i++) {
    float ring = abs(sin(r * 18.0 - u_time * (0.5 + i * 0.1) - i * 0.5));
    ring = smoothstep(0.02, 0.0, abs(ring - 0.5 - u_mid * 0.3));
    float hue = i / 6.0 + u_time * 0.05 + u_high * 0.2;
    vec3 c = 0.5 + 0.5 * cos(hue * 6.28 + vec3(0.0, 2.0, 4.0));
    col += c * ring * (0.4 + u_beat * 0.6);
  }
  col += vec3(0.15, 0.05, 0.0) * u_bass * smoothstep(0.5, 0.0, r);
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "plasma-flow",
    name: "Plasma Flow",
    description: "Smooth plasma field with beat flashes",
    author: "viz-toolbox",
    tags: ["2d", "plasma", "classic-modern"],
    gradient: "linear-gradient(135deg, #10b981 0%, #3b82f6 100%)",
    fragment: HEADER + `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 4.0;
  float t = u_time * (0.4 + u_bpm / 300.0);
  float v = 0.0;
  v += sin(p.x + t);
  v += sin(p.y + t * 1.2);
  v += sin(p.x + p.y + t * 0.8);
  v += sin(length(p - 2.0) + t * 1.5);
  v += u_bass * 2.0;
  vec3 col = 0.5 + 0.5 * cos(vec3(0.0, 2.0, 4.0) + v * 2.0 + u_mid * 3.0);
  col *= 0.7 + u_beat * 0.5;
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "cosmic-bloom",
    name: "Cosmic Bloom",
    description: "Fractal noise nebula with high-frequency sparkle",
    author: "viz-toolbox",
    tags: ["noise", "ambient", "treble"],
    gradient: "linear-gradient(135deg, #1e1b4b 0%, #be185d 100%)",
    fragment: HEADER + `
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.1;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 3.0 + vec2(u_time * 0.03, u_time * 0.02);
  float n = fbm(p + u_bass);
  float n2 = fbm(p * 2.0 - u_time * 0.05);
  vec3 col = mix(vec3(0.05, 0.02, 0.15), vec3(0.8, 0.1, 0.5), n);
  col = mix(col, vec3(0.2, 0.5, 1.0), n2 * 0.6);
  col += vec3(1.0) * pow(n2, 8.0) * u_high * 2.0;
  col *= 0.8 + u_beat * 0.4;
  fragColor = vec4(col, 1.0);
}
`,
  },
  {
    id: "neon-grid",
    name: "Neon Grid",
    description: "Perspective synthwave grid warped by mids",
    author: "viz-toolbox",
    tags: ["grid", "synthwave", "mid"],
    gradient: "linear-gradient(135deg, #ec4899 0%, #8b5cf6 50%, #06b6d4 100%)",
    fragment: HEADER + `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
  float horizon = 0.15 + u_mid * 0.1;
  float persp = 1.0 / max(uv.y + horizon, 0.001);
  vec2 grid = vec2(uv.x * persp, persp + u_time * (0.8 + u_bpm / 200.0));
  vec2 g = abs(fract(grid * vec2(8.0, 4.0)) - 0.5);
  float line = smoothstep(0.02, 0.0, min(g.x, g.y));
  vec3 sky = mix(vec3(0.05, 0.0, 0.12), vec3(0.2, 0.0, 0.35), uv.y + 0.5);
  vec3 col = sky;
  col += vec3(1.0, 0.2, 0.8) * line * (0.5 + u_beat);
  col += vec3(0.1, 0.6, 1.0) * line * line * 2.0;
  col *= 1.0 + u_bass * 0.3;
  fragColor = vec4(col, 1.0);
}
`,
  },
] as const;

export type ShaderSceneId = (typeof SHADER_SCENES)[number]["id"];

export function getShaderScene(id: string) {
  return SHADER_SCENES.find((s) => s.id === id) ?? SHADER_SCENES[0];
}

export function listShaderScenes() {
  return SHADER_SCENES.map(({ id, name, description, author, tags, gradient }) => ({
    id,
    name,
    description,
    author,
    tags,
    gradient,
  }));
}
