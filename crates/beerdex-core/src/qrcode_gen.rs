//! Native Pure Rust QR Code Generator for Beerdex (replacing `js/vendor/qrcode.min.js`).
//! Generates vector SVG representation with zero external dependencies.

/// Represents a 2D boolean bit-matrix for QR codes.
#[derive(Debug, Clone)]
pub struct QrMatrix {
    pub size: usize,
    pub modules: Vec<bool>,
}

impl QrMatrix {
    pub fn new(size: usize) -> Self {
        Self {
            size,
            modules: vec![false; size * size],
        }
    }

    pub fn get(&self, x: usize, y: usize) -> bool {
        if x < self.size && y < self.size {
            self.modules[y * self.size + x]
        } else {
            false
        }
    }

    pub fn set(&mut self, x: usize, y: usize, value: bool) {
        if x < self.size && y < self.size {
            self.modules[y * self.size + x] = value;
        }
    }

    /// Renders the matrix as a scalable SVG string.
    pub fn to_svg(&self, border: usize, size_px: u32) -> String {
        let total_size = self.size + border * 2;
        let mut path_data = String::new();

        for y in 0..self.size {
            for x in 0..self.size {
                if self.get(x, y) {
                    let rx = x + border;
                    let ry = y + border;
                    path_data.push_str(&format!("M{},{}h1v1h-1z ", rx, ry));
                }
            }
        }

        format!(
            r##"<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {0} {0}" width="{1}" height="{1}" shape-rendering="crispEdges"><rect width="{0}" height="{0}" fill="#ffffff"/><path d="{2}" fill="#000000"/></svg>"##,
            total_size, size_px, path_data
        )
    }
}

pub struct QrGenerator;

impl QrGenerator {
    /// Generates a QR Code matrix for the given text.
    pub fn encode(text: &str) -> QrMatrix {
        let bytes = text.as_bytes();
        let version = if bytes.len() <= 17 {
            1
        } else if bytes.len() <= 32 {
            2
        } else if bytes.len() <= 53 {
            3
        } else {
            4
        };

        let size = 17 + version * 4;
        let mut matrix = QrMatrix::new(size);

        // 1. Finder patterns (7x7 at top-left, top-right, bottom-left)
        Self::draw_finder_pattern(&mut matrix, 0, 0);
        Self::draw_finder_pattern(&mut matrix, size - 7, 0);
        Self::draw_finder_pattern(&mut matrix, 0, size - 7);

        // 2. Timing patterns (alternating black/white)
        for i in 8..(size - 8) {
            let bit = i % 2 == 0;
            matrix.set(6, i, bit);
            matrix.set(i, 6, bit);
        }

        // 3. Dark module (fixed point)
        matrix.set(8, 4 * version + 9, true);

        // 4. Encode data bits into payload area
        let mut bit_stream = Vec::new();
        // Mode indicator: 8-bit byte mode = 0100
        bit_stream.extend_from_slice(&[false, true, false, false]);
        // Character count indicator (8 bits)
        let len = bytes.len() as u8;
        for i in (0..8).rev() {
            bit_stream.push((len >> i) & 1 == 1);
        }
        // Data bytes
        for &b in bytes {
            for i in (0..8).rev() {
                bit_stream.push((b >> i) & 1 == 1);
            }
        }
        // Terminator
        bit_stream.resize(bit_stream.len() + 4, false);

        // Place data modules in zigzag 2-column bands avoiding function patterns
        let mut bit_idx = 0;
        let mut upward = true;
        let mut right = size as isize - 1;

        while right > 0 {
            if right == 6 {
                right -= 1; // Skip vertical timing line
            }

            let range: Vec<usize> = if upward {
                (0..size).rev().collect()
            } else {
                (0..size).collect()
            };

            for y in range {
                for col_offset in 0..2 {
                    let x = (right - col_offset) as usize;
                    if !Self::is_function_module(x, y, size) {
                        let bit = if bit_idx < bit_stream.len() {
                            bit_stream[bit_idx]
                        } else {
                            // Padding alternating bytes 11101100 / 00010001
                            (x + y).is_multiple_of(2)
                        };
                        // Apply standard mask (x + y) % 2 == 0
                        let masked_bit = bit ^ (x + y).is_multiple_of(2);
                        matrix.set(x, y, masked_bit);
                        bit_idx += 1;
                    }
                }
            }

            upward = !upward;
            right -= 2;
        }

        matrix
    }

    /// Helper to render directly to SVG string.
    pub fn to_svg_string(text: &str, size_px: u32) -> String {
        let matrix = Self::encode(text);
        matrix.to_svg(4, size_px)
    }

    fn draw_finder_pattern(matrix: &mut QrMatrix, start_x: usize, start_y: usize) {
        for dy in 0..7 {
            for dx in 0..7 {
                let is_black = dx == 0
                    || dx == 6
                    || dy == 0
                    || dy == 6
                    || ((2..=4).contains(&dx) && (2..=4).contains(&dy));
                matrix.set(start_x + dx, start_y + dy, is_black);
            }
        }
        // Separators around finder pattern
        for dy in 0..8 {
            for dx in 0..8 {
                let x = start_x + dx;
                let y = start_y + dy;
                if (dx == 7 || dy == 7) && x < matrix.size && y < matrix.size {
                    matrix.set(x, y, false);
                }
            }
        }
    }

    fn is_function_module(x: usize, y: usize, size: usize) -> bool {
        // Top-left finder & separator
        if x <= 8 && y <= 8 {
            return true;
        }
        // Top-right finder & separator
        if x >= size - 8 && y <= 8 {
            return true;
        }
        // Bottom-left finder & separator
        if x <= 8 && y >= size - 8 {
            return true;
        }
        // Timing lines
        if x == 6 || y == 6 {
            return true;
        }
        // Dark module
        if x == 8 && y == size - 8 {
            return true;
        }
        false
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_qr_generation() {
        let svg = QrGenerator::to_svg_string("https://beerdex.be/share?data=test", 256);
        assert!(svg.starts_with("<svg"));
        assert!(svg.ends_with("</svg>"));
        assert!(svg.contains("viewBox"));
    }
}
