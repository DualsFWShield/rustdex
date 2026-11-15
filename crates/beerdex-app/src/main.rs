use beerdex_app::render_app_shell;
use beerdex_app::state::AppState;

fn main() {
    println!("🍺 Initializing Beerdex Pure Rust Engine v5.1.0...");

    match AppState::new() {
        Ok(state) => {
            let beer_count = state.db.beers.len();
            let brewery_count = state.db.breweries.len();
            let bac_rules_count = state.db.bac_rules.len();

            println!("✅ Beerdex Engine Ready!");
            println!(
                "   - Loaded {} beers across all country catalogs",
                beer_count
            );
            println!("   - Loaded {} breweries with geodata", brewery_count);
            println!(
                "   - Loaded {} international BAC regulations",
                bac_rules_count
            );
            println!("   - Active language: {}", state.i18n.current_language());

            let html = render_app_shell(&state);
            println!("✅ Generated application shell ({} bytes)", html.len());
        }
        Err(e) => {
            eprintln!("❌ Failed to initialize Beerdex: {}", e);
            std::process::exit(1);
        }
    }
}
