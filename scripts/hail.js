export class HailWeatherEffect extends foundry.canvas.containers.ParticleEffect {

  /** @inheritdoc */
  static label = "WEATHER.Hail";

  /**
   * Configuration for the particle emitter for hail
   * @type {PIXI.particles.EmitterConfigV3}
   */
  static HAIL_CONFIG = {
    lifetime: {min: 0.1, max: 0.5}, // Hail falls very fast
    behaviors: [
      {
        type: "alpha",
        config: {
          alpha: {
            list: [{time: 0, value: 0.75}, {time: 1, value: 0.1}]
          }
        }
      },
      {
        type: "moveSpeed",
        config: {
          speed: {
            list: [{time: 0, value: 25}, {time: 1, value: -20}]
          },
          minMult: 0.8
        }
      },
      {
        type: "scale",
        config: {
          scale: {
            list: [{time: 0, value: 0.25}, {time: 1, value: 0.05}]
          },
          minMult: 0.5
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
        type: "textureSingle",
        config: {
          texture: "ui/particles/snow.png"
        }
      }
    ]
  };

  /* -------------------------------------------- */

  /** @inheritdoc */
  getParticleEmitters() {
    const d = canvas.dimensions;
    
    const maxParticles = (d.width / d.size) * (d.height / d.size) * 0.45;
    
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


