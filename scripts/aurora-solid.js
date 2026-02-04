export class AuroraSolidShader extends foundry.canvas.rendering.shaders.AbstractWeatherShader {

  /** @inheritdoc */
  static defaultUniforms = {
    intensity: 1.0,
    rotation: 0,
    slope: 1.0,
    speed: 0.05,
    scale: 1.0,  
    opacity: 0.8,
    offset: 0.0,
    color1: [0.1, 1.0, 0.4], 
    color2: [0.7, 0.2, 1.0], 
    color3: [0.0, 0.0, 0.0]  
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
    uniform vec3 color1;
    uniform vec3 color2;
    uniform float opacity;
    
    ${this.CONSTANTS}
    ${this.PERCEIVED_BRIGHTNESS}
    ${this.PRNG}
    ${this.ROTATION}
      
    // ********************************************************* //

    
    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        f = f * f * (3.0 - 2.0 * f);
        float a = random(i);
        float b = random(i + vec2(1.0, 0.0));
        float c = random(i + vec2(0.0, 1.0));
        float d = random(i + vec2(1.0, 1.0));
        return mix(a, b, f.x) + (c - a) * f.y * (1.0 - f.x) + (d - b) * f.x * f.y;
    }

    
    float fbm(vec2 st) {
        float value = 0.0;
        float amplitude = 0.5;
        for (int i = 0; i < 3; i++) {
            value += amplitude * noise(st);
            st *= 2.0;
            amplitude *= 0.5;
        }
        return value;
    }

    
    
    float curtain(vec2 uv, float t) {
        
        float sway = sin(uv.x * 2.0 - t * 0.5) + sin(uv.x * 5.0 + t * 0.2) * 0.5;
        
        
        
        vec2 distort = vec2(uv.x + fbm(uv * 1.5 + t * 0.3) * 0.6, uv.y);
        
        
        
        float rays = fbm(vec2(distort.x * 4.0 * scale, distort.y * 0.5));
        
        
        rays = pow(max(rays, 0.0), 3.0);
        
        
        
        float verticalMask = smoothstep(-0.6, 0.1, uv.y) * smoothstep(1.6, 0.7, uv.y);

        return rays * verticalMask;
    }
    
    // ********************************************************* //
    
    void main() {
      ${this.COMPUTE_MASK}
      
      vec2 st = vUvs;
      float t = time * speed;
      
      
      if (rotation != 0.0) {
        st -= 0.5;
        st *= rot(rotation);
        st += 0.5;
      }

      
      
      float c1 = curtain(st, t);
      float c2 = curtain(st + vec2(0.3, 0.1), t * 1.2) * 0.7; 
      
      float auroraShape = c1 + c2;
      
      
      
      
      
      
      
      
      
      float colorPos = 1.0 - st.y; 
      
      
      colorPos += fbm(st * 1.5 + t * 0.5) * 0.3;
      
      
      
      vec3 col = mix(color1, color2, smoothstep(0.4, 0.9, colorPos));
      
      
      
      
      float brilliance = smoothstep(0.4, 0.8, auroraShape);
      col += vec3(0.5, 0.8, 1.0) * brilliance * 0.5; 
      
      
      
      float finalAlpha = smoothstep(0.1, 0.8, auroraShape) * intensity * mask * opacity;
      
      
      
      vec3 finalColor = col * (1.5 + brilliance) * intensity;
      
      gl_FragColor = vec4(finalColor * finalAlpha, finalAlpha);
    }
    `;
  }
}