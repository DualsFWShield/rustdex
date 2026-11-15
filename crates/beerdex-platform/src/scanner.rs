//! Native Barcode and QR Scanner Engine for Beerdex (replacing `html5-qrcode.min.js`).

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScanPayload {
    DraftSync(String),
    OtaCode(String),
    BeerShare(String),
    BarcodeEan13(String),
    BarcodeUpcA(String),
    Generic(String),
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ScannerState {
    Idle,
    RequestingPermission,
    Scanning,
    Paused,
    Error,
}

pub struct ScannerEngine;

impl ScannerEngine {
    /// Validates an EAN-13 barcode using modulo-10 checksum algorithm.
    pub fn validate_ean13(barcode: &str) -> bool {
        let clean: String = barcode.chars().filter(|c| c.is_ascii_digit()).collect();
        if clean.len() != 13 {
            return false;
        }

        let digits: Vec<u32> = clean.chars().filter_map(|c| c.to_digit(10)).collect();
        if digits.len() != 13 {
            return false;
        }

        // Sum odd positions (index 0, 2, 4...) * 1, even positions (index 1, 3, 5...) * 3
        let sum: u32 = digits[0..12]
            .iter()
            .enumerate()
            .map(|(i, &d)| if i % 2 == 0 { d } else { d * 3 })
            .sum();

        let check_digit = (10 - (sum % 10)) % 10;
        check_digit == digits[12]
    }

    /// Computes the check digit for the first 12 digits of an EAN-13.
    pub fn compute_ean13_check_digit(twelve_digits: &str) -> Option<u32> {
        let clean: String = twelve_digits
            .chars()
            .filter(|c| c.is_ascii_digit())
            .collect();
        if clean.len() != 12 {
            return None;
        }
        let digits: Vec<u32> = clean.chars().filter_map(|c| c.to_digit(10)).collect();
        let sum: u32 = digits
            .iter()
            .enumerate()
            .map(|(i, &d)| if i % 2 == 0 { d } else { d * 3 })
            .sum();
        Some((10 - (sum % 10)) % 10)
    }

    /// Decodes and classifies scanned text from camera QR / barcode feed.
    pub fn parse_scanned_text(raw_text: &str) -> ScanPayload {
        let trimmed = raw_text.trim();

        if let Some(code) = trimmed.strip_prefix("DRAFTSYNC:") {
            return ScanPayload::DraftSync(code.trim().to_uppercase());
        }

        if let Some(code) = trimmed.strip_prefix("BEERDEX-OTA:") {
            return ScanPayload::OtaCode(code.trim().to_uppercase());
        }

        if trimmed.starts_with("https://beerdex.be/share")
            || trimmed.starts_with("http://beerdex.be/share")
        {
            return ScanPayload::BeerShare(trimmed.to_string());
        }

        if trimmed.len() == 6 && trimmed.chars().all(|c| c.is_ascii_alphanumeric()) {
            return ScanPayload::OtaCode(trimmed.to_uppercase());
        }

        if trimmed.len() == 13
            && trimmed.chars().all(|c| c.is_ascii_digit())
            && Self::validate_ean13(trimmed)
        {
            return ScanPayload::BarcodeEan13(trimmed.to_string());
        }

        if trimmed.len() == 12 && trimmed.chars().all(|c| c.is_ascii_digit()) {
            return ScanPayload::BarcodeUpcA(trimmed.to_string());
        }

        ScanPayload::Generic(trimmed.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ean13_validation() {
        // Valid barcode from catalog (Leffe Blonde)
        assert!(ScannerEngine::validate_ean13("5412186003013"));
        // Invalid check digit
        assert!(!ScannerEngine::validate_ean13("5412186003014"));
        // Invalid length
        assert!(!ScannerEngine::validate_ean13("54121860030"));
    }

    #[test]
    fn test_payload_parsing() {
        match ScannerEngine::parse_scanned_text("DRAFTSYNC: A1B2C3 ") {
            ScanPayload::DraftSync(code) => assert_eq!(code, "A1B2C3"),
            _ => panic!("Expected DraftSync"),
        }

        match ScannerEngine::parse_scanned_text("BEERDEX-OTA:XYZ999") {
            ScanPayload::OtaCode(code) => assert_eq!(code, "XYZ999"),
            _ => panic!("Expected OtaCode"),
        }

        match ScannerEngine::parse_scanned_text("5412186003013") {
            ScanPayload::BarcodeEan13(code) => assert_eq!(code, "5412186003013"),
            _ => panic!("Expected BarcodeEan13"),
        }
    }
}
