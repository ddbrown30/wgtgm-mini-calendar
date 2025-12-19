export class AuroraShader extends foundry.canvas.rendering.shaders.AbstractWeatherShader {

  /** @inheritdoc */
  static defaultUniforms = {
    intensity: 1,
    rotation: 0,
    slope: 1.0,
    speed: 0.1,
    scale: 1.0,
    offset: 0.0
  };

  /* -------------------------------------------- */

  /** @override */
  static createProgram() {
    const mode = canvas?.performance.mode ?? 2;
    return PIXI.Program.from(this.vertexShader, this.fragmentShader(mode));
  }

  /* -------------------------------------------- */

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
      uv += time * speed; 
      uv *= 2.0;
      for (int i = 0; i < 3; i++) {
        r += fnoise(uv) * s;
        uv *= 3.0;
        s *= 0.3; 
      }
      return r;
    }
    
    // ********************************************************* //
    
    float mist(in vec2 uv) {
      vec2 stretchedUV = (uv + vec2(offset, 0.0)) * vec2(1.0, 0.25) * scale;
      float movement = time * speed; 
      vec2 warp = vec2(fbm(stretchedUV + movement), fbm(stretchedUV + movement + 7.2));
      float n = fbm(stretchedUV + warp * 0.5);
      
      float sharpness = clamp(slope, 0.1, 1.0);
      n = smoothstep(0.4, 0.4 + sharpness, n);
      n = pow(n, 1.5); 
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

      // Get the noise value (0.0 = Empty, 1.0 = Full Aurora)
      float n = mist(ruv * 4.0);

      // --- TRANSPARENCY FIX ---
      
      float finalAlpha = n * intensity * mask * alpha;
      vec3 finalColor = tint * n; // Tint the brightness

      // Output: Pre-multiplied alpha (Color * Alpha, Alpha)
      gl_FragColor = vec4(finalColor, finalAlpha);
    }
    `;
  }
}