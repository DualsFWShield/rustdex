use std::fs;
use std::path::PathBuf;
use tao::{
    event::{Event, StartCause, WindowEvent},
    event_loop::{ControlFlow, EventLoop},
    window::WindowBuilder,
};
use wry::http::Response;
use wry::WebViewBuilder;

/// Launches the Beerdex Native Desktop application window.
pub fn run_desktop() -> Result<(), Box<dyn std::error::Error>> {
    println!("🍺 Starting Beerdex Native Desktop v5.1.0...");

    let event_loop = EventLoop::new();
    let window = WindowBuilder::new()
        .with_title("Beerdex - Le Pokédex de la bière")
        .with_inner_size(tao::dpi::LogicalSize::new(1280.0, 850.0))
        .with_min_inner_size(tao::dpi::LogicalSize::new(400.0, 600.0))
        .build(&event_loop)?;

    // Locate asset directory (checks current working dir and parent dirs for index.html)
    let candidates = [
        PathBuf::from("."),
        PathBuf::from(".."),
        PathBuf::from("../.."),
        std::env::current_exe()?
            .parent()
            .unwrap_or(&PathBuf::from("."))
            .to_path_buf(),
        std::env::current_exe()?
            .parent()
            .unwrap_or(&PathBuf::from("."))
            .join(".."),
        std::env::current_exe()?
            .parent()
            .unwrap_or(&PathBuf::from("."))
            .join("../.."),
    ];

    let root_dir = candidates
        .into_iter()
        .find(|p| p.join("index.html").exists())
        .unwrap_or_else(|| PathBuf::from("."));

    println!(
        "📂 Serving Beerdex assets from: {:?}",
        root_dir.canonicalize().unwrap_or_else(|_| root_dir.clone())
    );

    let root_clone = root_dir.clone();
    let _webview = WebViewBuilder::new()
        .with_custom_protocol("beerdex".into(), move |_webview_id, request| {
            let uri = request.uri();
            let path_str = uri.path();
            let clean_path = if path_str == "/" || path_str.is_empty() {
                "index.html"
            } else {
                path_str.trim_start_matches('/')
            };

            let file_path = root_clone.join(clean_path);

            if let Ok(content) = fs::read(&file_path) {
                let mime = mime_guess(clean_path);
                Response::builder()
                    .header("Content-Type", mime)
                    .header("Access-Control-Allow-Origin", "*")
                    .body(content.into())
                    .unwrap_or_else(|_| {
                        Response::builder().status(500).body(vec![].into()).unwrap()
                    })
            } else {
                Response::builder()
                    .status(404)
                    .body(format!("Not found: {}", clean_path).into_bytes().into())
                    .unwrap()
            }
        })
        .with_url("beerdex://localhost/index.html")
        .build(&window)?;

    event_loop.run(move |event, _, control_flow| {
        *control_flow = ControlFlow::Wait;

        match event {
            Event::NewEvents(StartCause::Init) => {
                println!("🚀 Beerdex Desktop UI initialized.");
            }
            Event::WindowEvent {
                event: WindowEvent::CloseRequested,
                ..
            } => {
                println!("👋 Exiting Beerdex Desktop.");
                *control_flow = ControlFlow::Exit;
            }
            _ => (),
        }
    });
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
