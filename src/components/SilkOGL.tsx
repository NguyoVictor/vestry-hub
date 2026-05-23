import { useEffect, useRef } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';

interface SilkOGLProps {
  color?: string;
  speed?: number;
  scale?: number;
  noiseIntensity?: number;
  rotation?: number;
}

const vertexShader = `
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uSpeed;
uniform float uScale;
uniform float uRotation;
uniform float uNoiseIntensity;
uniform vec3 uResolution;

const float e = 2.71828182845904523536;

float noise(vec2 texCoord) {
  float G = e;
  vec2 r = G * sin(G * texCoord);
  return fract(r.x * r.y * (1.0 + texCoord.x));
}

vec2 rotateUvs(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  mat2 rot = mat2(c, -s, s, c);
  return rot * uv;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float rnd = noise(gl_FragCoord.xy);
  vec2 rotated = rotateUvs(uv * uScale, uRotation);
  vec2 tex = rotated * uScale;
  float tOffset = uSpeed * uTime;

  tex.y += 0.03 * sin(8.0 * tex.x - tOffset);

  float pattern = 0.6 +
    0.4 * sin(5.0 * (tex.x + tex.y +
      cos(3.0 * tex.x + 5.0 * tex.y) +
      0.02 * tOffset) +
      sin(20.0 * (tex.x + tex.y - 0.1 * tOffset)));

  vec3 col = uColor * pattern - rnd / 15.0 * uNoiseIntensity;
  gl_FragColor = vec4(col, 1.0);
}
`;

function hexToRGB(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  return [
    parseInt(clean.slice(0, 2), 16) / 255,
    parseInt(clean.slice(2, 4), 16) / 255,
    parseInt(clean.slice(4, 6), 16) / 255
  ];
}

export default function SilkOGL({
  color = '#3D1C8E',
  speed = 4,
  scale = 1.2,
  noiseIntensity = 1.2,
  rotation = 0.3
}: SilkOGLProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;

    const renderer = new Renderer({ alpha: false });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    const [r, g, b] = hexToRGB(color);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [container.clientWidth, container.clientHeight, 1] },
        uColor: { value: [r, g, b] },
        uSpeed: { value: speed },
        uScale: { value: scale },
        uRotation: { value: rotation },
        uNoiseIntensity: { value: noiseIntensity }
      }
    });

    const mesh = new Mesh(gl, { geometry, program });

    function resize() {
      renderer.setSize(container.clientWidth, container.clientHeight);
      program.uniforms.uResolution.value = [container.clientWidth, container.clientHeight, 1];
    }
    window.addEventListener('resize', resize);
    resize();

    let animationFrameId: number;

    function update(t: number) {
      animationFrameId = requestAnimationFrame(update);
      program.uniforms.uTime.value = t * 0.001;
      renderer.render({ scene: mesh });
    }
    animationFrameId = requestAnimationFrame(update);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', resize);
      if (container.contains(gl.canvas)) container.removeChild(gl.canvas);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [color, speed, scale, noiseIntensity, rotation]);

  return <div ref={containerRef} className="w-full h-full" />;
}
