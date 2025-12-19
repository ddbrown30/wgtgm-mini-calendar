/**
 * A full-screen weather effect which renders rising heat waves.
 * Repurposed from AuroraShader logic.
 */
export class HeatWaveShader extends foundry.canvas.rendering.shaders.AbstractWeatherShader {

  /** @inheritdoc */
  static defaultUniforms = {
    intensity: 0.4,
    rotation: 0,
    slope: 0.5,
    speed: 0.3,
    scale: 1.5,
    offset: 0.0,
    tint: [1.0, 0.6, 0.3]
  };

  /** @override */
  static createProgram() {
    const mode = canvas?.performance.mode ?? 2;
    return PIXI.Program.from(this.vertexShader, this.fragmentShader(mode));
  }

  /** @inheritdoc */
  static fragmentShader(mode) {
    return `
    ${this.FRAGMENT_HEADER}
    uniform float intensity;
    uniform float slope;
    uniform float rotation;
    uniform float speed;
    uniform float scale;
    uniform float offset;
    
    ${this.CONSTANTS}
    ${this.PERCEIVED_BRIGHTNESS}
    ${this.PRNG}
    ${this.ROTATION}
      
    // ********************************************************* //

    float fnoise(in vec2 coords) {
      vec2 i = floor(coords);
      vec2 f = fract(coords);
      float a = random(i);
      float b = random(i + vec2(1.0, 0.0));
      float c = random(i + vec2(0.0, 1.0));
      float d = random(i + vec2(1.0, 1.0));
      vec2 cb = f * f * (3.0 - 2.0 * f);
      return mix(a, b, cb.x) + (c - a) * cb.y * (1.0 - cb.x) + (d - b) * cb.x * cb.y;
    }
      
    // ********************************************************* //

    float fbm(in vec2 uv) {
      float r = 0.0;
      float s = 1.0;  
      // Rising motion: animate Y faster than X
      vec2 movement = vec2(0.0, time * speed);
      uv += movement; 
      uv *= 2.0;
      for (int i = 0; i < 3; i++) {
        r += fnoise(uv) * s;
        uv *= 3.0;
        s *= 0.3; 
      }
      return r;
    }
    
    // ********************************************************* //
    
    float heat(in vec2 uv) {
      // Scale X less than Y to make vertical "streaks"
      vec2 stretchedUV = (uv + vec2(offset, 0.0)) * vec2(4.0, 1.0) * scale;
      
      float movement = time * speed; 
      vec2 warp = vec2(fbm(stretchedUV + movement), fbm(stretchedUV + movement + 4.0));
      
      // Warped noise
      float n = fbm(stretchedUV + warp * 0.2);
      
      // Soften edges for haze look
      float sharpness = clamp(slope, 0.1, 1.0);
      n = smoothstep(0.3, 0.3 + sharpness, n);
      
      return n;
    }
    
    // ********************************************************* //
    
    void main() {
      ${this.COMPUTE_MASK}
      
      vec2 ruv = vUvs;
      if ( rotation != 0.0 ) {
        ruv = vUvs - 0.5;
        ruv *= rot(rotation);
        ruv += 0.5;
      }

      // Generate the heat pattern
      float n = heat(ruv * 2.0);

      // --- COLOR MIXING ---
      
      float finalAlpha = n * intensity * mask * alpha;
      
      // Tint the noise (Orange/Yellow/Red)
      vec3 finalColor = tint * (0.5 + 0.5 * n); 

      gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
    }
    `;
  }
}