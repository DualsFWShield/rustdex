#![windows_subsystem = "windows"]

#[cfg(not(target_arch = "wasm32"))]
fn main() {
    let _ = rustdex::run_desktop();
}

#[cfg(target_arch = "wasm32")]
fn main() {}
