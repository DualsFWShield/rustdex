use std::env;
use std::fs;
use std::path::{Path, PathBuf};

fn main() {
    println!("cargo:rerun-if-changed=../../index.html");
    println!("cargo:rerun-if-changed=../../style.css");
    println!("cargo:rerun-if-changed=../../js/");
    println!("cargo:rerun-if-changed=../../css/");
    println!("cargo:rerun-if-changed=../../data/");
    println!("cargo:rerun-if-changed=../../wasm/");
    println!("cargo:rerun-if-changed=../../icons/");
    println!("cargo:rerun-if-changed=../../event/");

    let target_arch = env::var("CARGO_CFG_TARGET_ARCH").unwrap_or_default();
    if target_arch == "wasm32" {
        // WASM targets do not need desktop embedded assets
        let out_dir = env::var("OUT_DIR").unwrap();
        let dest_path = Path::new(&out_dir).join("embedded_assets.rs");
        fs::write(
            dest_path,
            "pub fn get_embedded_asset(_path: &str) -> Option<(&'static [u8], &'static str)> { None }\n",
        )
        .unwrap();
        return;
    }

    let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
    let workspace_root = manifest_dir.parent().unwrap().parent().unwrap();

    let mut entries = Vec::new();

    // 1. Root files
    let root_files = [
        "index.html",
        "style.css",
        "style-museum.css",
        "offline.html",
        "poster-classic.html",
        "poster-museum.html",
        "identity.html",
        "manifest.webmanifest",
        "CNAME",
    ];

    for file in &root_files {
        let p = workspace_root.join(file);
        if p.exists() {
            entries.push((file.to_string(), p));
        }
    }

    // 2. Directories to recursively embed
    let dirs = ["css", "data", "icons", "js", "wasm", "event"];

    for d in &dirs {
        let dir_path = workspace_root.join(d);
        if dir_path.exists() {
            collect_files(&dir_path, workspace_root, &mut entries);
        }
    }

    // 3. Fallback images
    let fallback_images = [
        "images/beer/default.png",
        "images/beer/FUT.jpg",
        "images/mistery.png",
    ];
    for img in &fallback_images {
        let p = workspace_root.join(img);
        if p.exists() {
            entries.push((img.to_string(), p));
        }
    }

    // Generate Rust source code
    let mut code = String::new();
    code.push_str(
        "pub fn get_embedded_asset(path: &str) -> Option<(&'static [u8], &'static str)> {\n",
    );
    code.push_str("    match path {\n");

    for (rel_path, abs_path) in entries {
        let mime = mime_guess(&rel_path);
        // Normalize forward slashes for URL matching
        let clean_key = rel_path.replace('\\', "/");
        let abs_str = abs_path.to_str().unwrap().replace('\\', "/");
        code.push_str(&format!(
            "        {:?} => Some((include_bytes!(r\"{}\"), {:?})),\n",
            clean_key, abs_str, mime
        ));
    }

    code.push_str("        _ => None,\n");
    code.push_str("    }\n");
    code.push_str("}\n");

    let out_dir = env::var("OUT_DIR").unwrap();
    let dest_path = Path::new(&out_dir).join("embedded_assets.rs");
    fs::write(dest_path, code).unwrap();
}

fn collect_files(dir: &Path, base: &Path, entries: &mut Vec<(String, PathBuf)>) {
    if let Ok(read_dir) = fs::read_dir(dir) {
        for entry in read_dir.flatten() {
            let path = entry.path();
            if path.is_dir() {
                collect_files(&path, base, entries);
            } else if path.is_file() {
                let rel = path
                    .strip_prefix(base)
                    .unwrap()
                    .to_str()
                    .unwrap()
                    .replace('\\', "/");
                entries.push((rel, path));
            }
        }
    }
}

fn mime_guess(path: &str) -> &'static str {
    if path.ends_with(".html") {
        "text/html; charset=utf-8"
    } else if path.ends_with(".js") {
        "text/javascript; charset=utf-8"
    } else if path.ends_with(".css") {
        "text/css; charset=utf-8"
    } else if path.ends_with(".json") {
        "application/json; charset=utf-8"
    } else if path.ends_with(".webmanifest") {
        "application/manifest+json; charset=utf-8"
    } else if path.ends_with(".png") {
        "image/png"
    } else if path.ends_with(".jpg") || path.ends_with(".jpeg") {
        "image/jpeg"
    } else if path.ends_with(".webp") {
        "image/webp"
    } else if path.ends_with(".svg") {
        "image/svg+xml"
    } else if path.ends_with(".avif") {
        "image/avif"
    } else if path.ends_with(".ico") {
        "image/x-icon"
    } else if path.ends_with(".wasm") {
        "application/wasm"
    } else {
        "application/octet-stream"
    }
}
