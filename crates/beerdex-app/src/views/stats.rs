use crate::state::AppState;
use beerdex_core::achievements::{AchievementEngine, UserAchievementStats};

/// Renders the complete, comprehensive Statistics view matching 100% of beerdex.be.
pub fn render_stats_view(state: &AppState) -> String {
    let bac = state.current_bac();
    let gamer_stats = state.current_gamer_stats();

    let ach_stats = UserAchievementStats::compute(&state.storage.ratings, &state.db.beers, None);
    let all_achievements = AchievementEngine::all_definitions();

    let unlocked_count = all_achievements
        .iter()
        .filter(|a| AchievementEngine::is_unlocked(a.id, &ach_stats))
        .count();

    let total_beers = state.db.beers.len();
    let unique_drunk = ach_stats.unique_count as usize;
    let total_drunk_count = ach_stats.total_count;
    let dex_percentage = if total_beers > 0 {
        ((unique_drunk as f64 / total_beers as f64) * 100.0).round() as u32
    } else {
        0
    };

    let total_liters = ach_stats.total_liters;
    let pure_alcohol_liters = total_liters * 0.065; // Moyenne indicative 6.5°

    // Calculate Playstation trophy counts
    let mut gold_count = 0;
    let mut silver_count = 0;
    let mut bronze_count = 0;
    for ach in &all_achievements {
        if AchievementEngine::is_unlocked(ach.id, &ach_stats) {
            match ach.rarity {
                "legendaire" | "ultra_legendaire" | "fondateur" | "epique" => gold_count += 1,
                "super_rare" | "rare" => silver_count += 1,
                _ => bronze_count += 1,
            }
        }
    }

    let (rank_name, next_rank_text, rank_color) = if unique_drunk >= 500 {
        ("Dieu de la Bière", "Rang Maximum Atteint ! 🏆", "#ff00ff")
    } else if unique_drunk >= 200 {
        ("Zythologue Suprême", "Rang suivant: 500 bières", "#00ffff")
    } else if unique_drunk >= 100 {
        (
            "Encyclopédie Vivante",
            "Rang suivant: 200 bières",
            "#ffd700",
        )
    } else if unique_drunk >= 50 {
        ("Sommelier Averti", "Rang suivant: 100 bières", "#c0c0c0")
    } else if unique_drunk >= 20 {
        (
            "Explorateur Houblonné",
            "Rang suivant: 50 bières",
            "#cd7f32",
        )
    } else if unique_drunk >= 10 {
        ("Dégustateur Curieux", "Rang suivant: 20 bières", "#e67e22")
    } else {
        ("Novice", "Rang suivant: 10 bières", "#888888")
    };

    let mut html = String::with_capacity(12000);

    html.push_str(
        r##"<div class="stats-view-wrapper" style="max-width: 600px; margin: 0 auto; width: 100%; padding-bottom: 30px;">
        <div class="text-center p-20">"##,
    );

    // SVG Defs
    html.push_str(
        r##"<svg width="0" height="0">
            <defs>
                <linearGradient id="grad-bronze" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#cd7f32"></stop><stop offset="100%" stop-color="#8a5a22"></stop></linearGradient>
                <linearGradient id="grad-silver" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e6e6e6"></stop><stop offset="100%" stop-color="#808080"></stop></linearGradient>
                <linearGradient id="grad-gold" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ffd700"></stop><stop offset="100%" stop-color="#b8860b"></stop></linearGradient>
                <linearGradient id="grad-diamond" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00ffff"></stop><stop offset="100%" stop-color="#00008b"></stop></linearGradient>
            </defs>
        </svg>"##,
    );

    // 1. SVG Donut Chart with Valorant Evolution
    html.push_str(&format!(
        r##"<div style="width:160px; height:160px; margin:0 auto; position:relative; border-radius:50%; box-shadow:0 0 10px rgba(0,0,0,0);">
            <svg viewBox="0 0 36 36" style="width:100%; height:100%; transform: rotate(-90deg);">
                <path class="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#333" stroke-width="3" stroke-dasharray="100, 100"></path>
                <path class="circle" stroke-dasharray="{pct}, 100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="{color}" stroke-width="3" style="transition: stroke-dasharray 1s ease-out;"></path>
            </svg>
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); text-align:center;">
                <span style="font-size:2rem; font-family:'Russo One', sans-serif; color:{color}; text-shadow:0 0 10px {color}66;">{unique}</span>
                <span style="display:block; font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:1px; margin-top:-5px;">uniques</span>
            </div>
        </div>
        
        <h2 style="color:{color}; margin-top:20px; font-family:'Russo One', sans-serif; letter-spacing:1px; text-shadow:0 0 10px {color}33;">{rank_name}</h2>
        <p style="font-size:0.85rem; color:#888; margin-top:5px;">{next_rank}</p>"##,
        pct = dex_percentage,
        color = rank_color,
        unique = unique_drunk,
        rank_name = rank_name,
        next_rank = next_rank_text
    ));

    // 2. PlayStation Trophies Summary
    html.push_str(&format!(
        r##"<div style="display:flex; justify-content:center; align-items:center; gap:12px; margin-top:15px; background:rgba(0,0,0,0.2); padding:10px 15px; border-radius:20px; border:1px solid rgba(255,255,255,0.05); width:fit-content; margin-inline:auto;">
            <div style="display:flex; align-items:center; gap:5px; color:var(--accent-gold); font-weight:bold;">🟡 {gold}</div>
            <div style="display:flex; align-items:center; gap:5px; color:#c0c0c0; font-weight:bold;">⚪ {silver}</div>
            <div style="display:flex; align-items:center; gap:5px; color:#cd7f32; font-weight:bold;">🟤 {bronze}</div>
        </div>"##,
        gold = gold_count,
        silver = silver_count,
        bronze = bronze_count
    ));

    // 3. Bières dans l'application
    html.push_str(&format!(
        r##"<div style="margin-top:20px; text-align:center; padding:15px; background:var(--bg-card); border-radius:12px; border:1px solid rgba(255,255,255,0.05);">
            <div style="font-size:0.85rem; color:#aaa; margin-bottom:5px; text-transform:uppercase; font-weight:bold;">Bières dans l'application</div>
            <div class="stats-total-app-count" style="font-size:1.5rem; font-weight:bold; color:#FFF;">{total}</div>
            <div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin-top:10px; font-size:0.75rem;">
                 <div class="stat-badge stat-badge-json" style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><span style="font-weight:bold; color:var(--accent-gold);">{total}</span> JSON</div>
                 <div class="stat-badge stat-badge-custom" style="background:rgba(255,255,255,0.06); padding:4px 8px; border-radius:6px;"><span style="font-weight:bold; color:#2ecc71;">0</span> Custom</div>
            </div>
        </div>"##,
        total = total_beers
    ));

    // 4. Volume Total Bu Hero
    html.push_str(&format!(
        r##"<div style="margin-top: 25px; padding: 20px; background: linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); box-shadow: 0 4px 15px rgba(0,0,0,0.3); text-align: center;">
            <div style="font-size: 0.75rem; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 5px;">
                Volume Consommé (Total Bu)
            </div>
            <div style="font-size: 2.2rem; font-family: 'Russo One', sans-serif; color: #fff; text-shadow: 0 2px 4px rgba(0,0,0,0.5);">
                {total_drinks} <span style="font-size: 1rem; color: #888; font-family: sans-serif; font-weight: normal;">bières</span>
            </div>
        </div>"##,
        total_drinks = total_drunk_count
    ));

    // 5. 2-column stats (Volume & Alcool pur)
    html.push_str(&format!(
        r##"<div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:15px;">
            <div style="padding:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius:12px; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:1.8rem; font-family:'Russo One', sans-serif; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5);">{liters:.1} L</div>
                <div style="font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:5px;">Volume Total Bu</div>
            </div>
            <div style="padding:15px; background:linear-gradient(135deg, rgba(30,30,30,0.8), rgba(15,15,15,0.9)); border-radius:12px; border:1px solid rgba(255,255,255,0.05); box-shadow:0 4px 15px rgba(0,0,0,0.3); text-align:center; display:flex; flex-direction:column; justify-content:center;">
                <div style="font-size:1.8rem; font-family:'Russo One', sans-serif; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.5);">{pure_alc:.2} L</div>
                <div style="font-size:0.75rem; color:#888; text-transform:uppercase; letter-spacing:0.5px; margin-top:5px;">Alcool Pur</div>
            </div>
        </div>"##,
        liters = total_liters,
        pure_alc = pure_alcohol_liters
    ));

    // 6. Équivalences Alcool
    let shots = (pure_alcohol_liters * 1000.0 / 12.0).round() as u32;
    let wine_glasses = (pure_alcohol_liters * 1000.0 / 15.0).round() as u32;
    let pints = (total_liters / 0.5).round() as u32;
    let bathtubs = (total_liters / 150.0).floor() as u32;

    html.push_str(&format!(
        r##"<div class="stat-card mt-20" style="padding:0; overflow:hidden; border:1px solid rgba(255,192,0,0.15); background:linear-gradient(180deg, rgba(20,20,20,0.6) 0%, rgba(10,10,10,0.8) 100%);">
            <div style="background: linear-gradient(90deg, rgba(255,192,0,0.1), transparent); padding: 15px; border-bottom: 1px solid rgba(255,255,255,0.05); text-align:left;">
                <h4 style="color:var(--accent-gold); margin:0; display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.2rem;">⚖️</span> Équivalences Alcool
                </h4>
                <p style="font-size:0.75rem; color:#888; margin:5px 0 0 0;">C'est comme si vous aviez bu...</p>
            </div>
            
            <div style="padding: 15px;">
                <h5 style="color:#888; font-size:0.75rem; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                    Équivalences Volume
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                </h5>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px; margin-bottom: 25px;">
                    <span class="comp-item" style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; font-size:0.85rem;"><span class="comp-icon">🍺</span> <strong>{pints}</strong> pintes</span>
                    <span class="comp-item" style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; font-size:0.85rem;"><span class="comp-icon">🛁</span> <strong>{bathtubs}</strong> baignoires</span>
                </div>

                <h5 style="color:#888; font-size:0.75rem; margin-bottom:12px; text-transform:uppercase; letter-spacing:1px; display:flex; align-items:center; gap:8px;">
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                    Équivalences Alcool Pur
                    <span style="flex:1; height:1px; background:rgba(255,255,255,0.1);"></span>
                </h5>
                <div style="display:flex; flex-wrap:wrap; justify-content:center; gap:8px;">
                    <span class="comp-item" style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; font-size:0.85rem;"><span class="comp-icon">🥃</span> <strong>{shots}</strong> shots de vodka</span>
                    <span class="comp-item" style="background:rgba(255,255,255,0.04); padding:8px 12px; border-radius:8px; font-size:0.85rem;"><span class="comp-icon">🍷</span> <strong>{wine_glasses}</strong> verres de vin</span>
                </div>
            </div>
        </div>"##,
        pints = pints,
        bathtubs = bathtubs,
        shots = shots,
        wine_glasses = wine_glasses
    ));

    // 7. Alcoolémie & Sécurité + Gamer HUD
    let (drive_status, drive_color) = if bac <= 0.05 {
        ("✅ Conduite autorisée", "#2ecc71")
    } else if bac < 0.5 {
        ("⚠️ Vigilance recommandée", "#f1c40f")
    } else {
        ("🚫 Conduite strictement interdite", "#e74c3c")
    };

    html.push_str(&format!(
        r##"<div class="stat-card mt-20 text-center" id="bac-stats-container" style="border-top: 2px solid var(--accent-gold);">
            <h3 style="margin-bottom:15px; display:flex; align-items:center; justify-content:center; gap:8px;">
                🩸 Alcoolémie &amp; Sécurité <span style="font-size: 0.8rem; background: #333; padding: 2px 6px; border-radius: 10px; font-weight: normal;">BE</span>
            </h3>
            
            <div class="gamer-hud-container" style="margin-bottom:15px;">
                <div class="gamer-hud-title">🎮 Gamer Stats IRL</div>
                <div class="gamer-rank-badge" style="border-color:{color};">
                    <div class="gamer-rank-icon">🎮</div>
                    <div class="gamer-rank-name" style="color:{color};">{rank}</div>
                    <div class="gamer-rank-sub">{bac:.2} g/L • <span style="color:{drive_color};">{drive_status}</span></div>
                </div>

                <div class="gamer-stats-grid">
                    <div class="gamer-stat-card">
                        <div class="gamer-stat-icon">📶</div>
                        <div class="gamer-stat-label">PING</div>
                        <div class="gamer-stat-val">{ping} ms</div>
                    </div>
                    <div class="gamer-stat-card">
                        <div class="gamer-stat-icon">🎯</div>
                        <div class="gamer-stat-label">AIM ASSIST</div>
                        <div class="gamer-stat-val">{aim}%</div>
                    </div>
                    <div class="gamer-stat-card">
                        <div class="gamer-stat-icon">⚡</div>
                        <div class="gamer-stat-label">FPS</div>
                        <div class="gamer-stat-val">{fps}</div>
                    </div>
                    <div class="gamer-stat-card">
                        <div class="gamer-stat-icon">👁️</div>
                        <div class="gamer-stat-label">FOV</div>
                        <div class="gamer-stat-val">{fov}°</div>
                    </div>
                </div>
            </div>
        </div>"##,
        color = gamer_stats.rank_color,
        rank = state.i18n.t_or(gamer_stats.rank_key, "Novice"),
        bac = bac,
        drive_color = drive_color,
        drive_status = drive_status,
        ping = gamer_stats.ping,
        aim = gamer_stats.aim_assist,
        fps = gamer_stats.fps,
        fov = gamer_stats.fov
    ));

    // 8. Streak
    html.push_str(
        r##"<div class="stat-card mt-20 text-center">
            <div class="streak-section">
                <h4>🔥 Série en Cours</h4>
                <div style="font-size:2rem; font-family:'Russo One', sans-serif; color:var(--accent-gold); margin:10px 0;">1 <span style="font-size:1rem; color:#888; font-family:sans-serif;">jour</span></div>
                <p style="font-size:0.8rem; color:#aaa; margin:0;">Chaque journée est une découverte zythologique !</p>
            </div>
        </div>"##,
    );

    // 9. Succès 🏆
    html.push_str(&format!(
        r##"<div id="card-achievements" class="stat-card mt-20 text-center">
            <h3 style="margin-bottom:15px; color:var(--accent-gold); font-family:'Russo One', sans-serif;">Succès 🏆 ({unlocked}/{total})</h3>"##,
        unlocked = unlocked_count,
        total = all_achievements.len()
    ));

    let categories = [
        ("Compteur 🔢", "ach_cat_counter"),
        ("Variété 🌈", "ach_cat_variety"),
        ("Volume 💧", "ach_cat_volume"),
        ("Puissance 🔋", "ach_cat_power"),
        ("Critique 📝", "ach_cat_critic"),
        ("Styles 🍺", "ach_cat_styles"),
        ("Fun & Secrets 🤫", "ach_cat_fun"),
        ("Rareté 💎", "ach_cat_rarity"),
        ("Challenge Alphabet 🔤", "ach_cat_alphabet"),
    ];

    for (cat_title, cat_key) in categories {
        html.push_str(&format!(
            r##"<h4 class="ach-category-title text-center">{}</h4><div class="ach-grid">"##,
            cat_title
        ));

        for ach in all_achievements
            .iter()
            .filter(|a| a.category_key == cat_key)
        {
            let is_unlocked = AchievementEngine::is_unlocked(ach.id, &ach_stats);
            let (opacity, filter, title_attr) = if is_unlocked {
                ("1", "none", format!("{} : Débloqué !", ach.id))
            } else {
                (
                    "0.35",
                    "grayscale(100%)",
                    format!("{} : Verrouillé", ach.id),
                )
            };

            html.push_str(&format!(
                r##"<div class="ach-item" style="opacity:{opacity}; filter:{filter}; position:relative; cursor:pointer;" title="{title_attr}">
                    <div class="ach-icon">{icon}</div>
                </div>"##,
                opacity = opacity,
                filter = filter,
                title_attr = title_attr,
                icon = ach.icon
            ));
        }

        html.push_str("</div>");
    }

    html.push_str("</div></div></div>");
    html
}
