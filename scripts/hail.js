
export class HailWeatherEffect extends foundry.canvas.containers.ParticleEffect {

  /** @inheritdoc */
  static label = "WEATHER.Hail";

  /**
   * Configuration for the particle emitter for hail
   * @type {PIXI.particles.EmitterConfigV3}
   */
  static HAIL_CONFIG = {
    lifetime: { min: 1.5, max: 2.0 }, // Constant lifetime
    frequency: 0.004, 
    spawnChance: 1,
    particlesPerWave: 1,
    emitterLifetime: -1,
    pos: { x: 0, y: 0 },
    addAtBack: false,
    behaviors: [
      {
        type: "alpha",
        config: {
          alpha: {
            list: [{time: 0, value: 0.5}, {time: 1, value: 0.3}]
          }
        }
      },
      {
        type: "moveSpeed",
        config: {
          speed: {
            list: [{time: 0, value: 1}, {time: 1, value: 5}]
          },
          minMult: 0.8
        }
      },
      {
        type: "rotationStatic", 
        config: {
          min: 90,
          max: 90
        }
      },
      {
        type: "scale",
        config: {
          scale: {
            list: [{time: 0, value: 0.35}, {time: 1, value: 0.15}]
          },
          minMult: 0.3
        }
      },
      {
        type: "color",
        config: {
          color: {
            list: [{time: 0, value: "#ffffff"}, {time: 1, value: "#dceeff"}]
          }
        }
      },
      {
        type: "rotation",
        config: {
            accel: 0, minSpeed: 50, maxSpeed: 200, minStart: 0, maxStart: 360
        }
      },
      {
        type: "textureRandom",
        config: {
          textures: ["ui/particles/drop.png", "ui/particles/snow.png"]
        }
      }
    ]
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  getParticleEmitters() {
    const d = canvas.dimensions;
    
    const maxParticles = (d.width / d.size) * (d.height / d.size) * 1.5;
    
    const config = foundry.utils.deepClone(this.constructor.HAIL_CONFIG);
    config.maxParticles = maxParticles;
    config.frequency = config.lifetime.min / maxParticles;
    
    config.behaviors.push({
      type: "spawnShape",
      config: {
        type: "rect",
        data: {x: d.sceneRect.x, y: d.sceneRect.y, w: d.sceneRect.width, h: d.sceneRect.height}
      }
    });
    return [this.createEmitter(config)];
  }
}


