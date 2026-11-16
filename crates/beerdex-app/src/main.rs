#![windows_subsystem = "windows"]

#[cfg(not(target_arch = "wasm32"))]
fn main() {
    let _ = beerdex_app::run_desktop();
}

#[cfg(target_arch = "wasm32")]
fn main() {}
