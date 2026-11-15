//! Native Celebration & Achievement Particle Physics Engine (replacing `confetti.browser.min.js`).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ParticleShape {
    Square,
    Circle,
    Star,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Particle {
    pub x: f64,
    pub y: f64,
    pub wobble: f64,
    pub wobble_speed: f64,
    pub velocity: f64,
    pub angle_rad: f64,
    pub gravity: f64,
    pub drift: f64,
    pub decay: f64,
    pub tilt_angle: f64,
    pub color_rgb: (u8, u8, u8),
    pub shape: ParticleShape,
    pub tick: u32,
    pub total_ticks: u32,
    pub scalar: f64,
}

impl Particle {
    #[allow(clippy::too_many_arguments)]
    pub fn new(
        x: f64,
        y: f64,
        angle_deg: f64,
        spread_deg: f64,
        start_velocity: f64,
        color_rgb: (u8, u8, u8),
        shape: ParticleShape,
        total_ticks: u32,
        seed: u64,
    ) -> Self {
        // Deterministic pseudo-random variation based on seed
        let pseudo_rand1 =
            ((seed.wrapping_mul(1103515245).wrapping_add(12345) >> 16) & 0x7FFF) as f64 / 32767.0;
        let pseudo_rand2 =
            ((seed.wrapping_mul(214013).wrapping_add(2531011) >> 16) & 0x7FFF) as f64 / 32767.0;

        let spread_rad = spread_deg.to_radians();
        let base_angle_rad = angle_deg.to_radians();
        let angle_rad = base_angle_rad + (pseudo_rand1 - 0.5) * spread_rad;

        let velocity = start_velocity * (0.8 + 0.4 * pseudo_rand2);

        Self {
            x,
            y,
            wobble: pseudo_rand1 * 10.0,
            wobble_speed: 0.1 + pseudo_rand2 * 0.1,
            velocity,
            angle_rad,
            gravity: 1.0,
            drift: 0.0,
            decay: 0.92,
            tilt_angle: pseudo_rand2 * std::f64::consts::PI * 2.0,
            color_rgb,
            shape,
            tick: 0,
            total_ticks,
            scalar: 1.0,
        }
    }

    /// Advances particle physics by one tick. Returns true if particle remains alive.
    pub fn step(&mut self) -> bool {
        self.x += self.angle_rad.cos() * self.velocity + self.drift;
        self.y += self.angle_rad.sin() * self.velocity + self.gravity;
        self.velocity *= self.decay;
        self.wobble += self.wobble_speed;
        self.tilt_angle += 0.1;
        self.tick += 1;

        self.tick < self.total_ticks
    }

    pub fn opacity(&self) -> f64 {
        if self.total_ticks == 0 {
            0.0
        } else {
            (1.0 - (self.tick as f64 / self.total_ticks as f64)).clamp(0.0, 1.0)
        }
    }

    pub fn wobble_coords(&self) -> (f64, f64) {
        let wx = self.x + 10.0 * self.scalar * self.wobble.cos();
        let wy = self.y + 10.0 * self.scalar * self.wobble.sin();
        (wx, wy)
    }
}

#[derive(Default)]
pub struct ConfettiCannon {
    pub particles: Vec<Particle>,
}

impl ConfettiCannon {
    pub fn new() -> Self {
        Self {
            particles: Vec::new(),
        }
    }

    /// Spawns a celebration burst at (x, y) with a given color palette.
    pub fn burst(
        &mut self,
        x: f64,
        y: f64,
        colors: &[(u8, u8, u8)],
        count: usize,
        start_velocity: f64,
    ) {
        let colors = if colors.is_empty() {
            &[(255, 215, 0), (231, 76, 60), (46, 204, 113), (52, 152, 219)]
        } else {
            colors
        };

        for i in 0..count {
            let color = colors[i % colors.len()];
            let shape = match i % 3 {
                0 => ParticleShape::Square,
                1 => ParticleShape::Circle,
                _ => ParticleShape::Star,
            };
            let p = Particle::new(
                x,
                y,
                -90.0, // Shoot upwards
                120.0, // Spread
                start_velocity,
                color,
                shape,
                150,
                (i as u64).wrapping_add(1),
            );
            self.particles.push(p);
        }
    }

    /// Updates all active particles and discards finished ones.
    pub fn tick(&mut self) -> usize {
        self.particles.retain_mut(|p| p.step());
        self.particles.len()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_confetti_burst_and_physics() {
        let mut cannon = ConfettiCannon::new();
        cannon.burst(100.0, 100.0, &[(255, 215, 0)], 20, 25.0);
        assert_eq!(cannon.particles.len(), 20);

        // Advance 10 ticks
        for _ in 0..10 {
            cannon.tick();
        }
        assert_eq!(cannon.particles.len(), 20);
        assert!(cannon.particles[0].y != 100.0);
        assert!(cannon.particles[0].opacity() < 1.0);
    }
}
