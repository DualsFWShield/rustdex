use std::collections::HashMap;

#[derive(Debug, Clone)]
pub struct ThemeVar {
    pub key: &'static str,
    pub label: &'static str,
    pub group: &'static str,
    pub default_val: &'static str,
}

pub const THEME_VARS: &[ThemeVar] = &[
    // Background
    ThemeVar {
        key: "--bg-dark",
        label: "theme_var_bg_dark",
        group: "background",
        default_val: "#0a0a0a",
    },
    ThemeVar {
        key: "--bg-card",
        label: "theme_var_bg_card",
        group: "background",
        default_val: "#141414",
    },
    ThemeVar {
        key: "--bg-card-hover",
        label: "theme_var_bg_card_hover",
        group: "background",
        default_val: "#1f1f1f",
    },
    // Text
    ThemeVar {
        key: "--text-primary",
        label: "theme_var_text_primary",
        group: "text",
        default_val: "#ffffff",
    },
    ThemeVar {
        key: "--text-secondary",
        label: "theme_var_text_secondary",
        group: "text",
        default_val: "#a0a0a0",
    },
    // Accent
    ThemeVar {
        key: "--accent-gold",
        label: "theme_var_accent_gold",
        group: "accent",
        default_val: "#FFC000",
    },
    ThemeVar {
        key: "--accent-amber",
        label: "theme_var_accent_amber",
        group: "accent",
        default_val: "#FF9900",
    },
    ThemeVar {
        key: "--accent-foam",
        label: "theme_var_accent_foam",
        group: "accent",
        default_val: "#F0F0F0",
    },
    // Borders & misc
    ThemeVar {
        key: "--border-color",
        label: "theme_var_border",
        group: "misc",
        default_val: "#2d2d2d",
    },
    ThemeVar {
        key: "--success",
        label: "theme_var_success",
        group: "misc",
        default_val: "#2ecc71",
    },
    ThemeVar {
        key: "--danger",
        label: "theme_var_danger",
        group: "misc",
        default_val: "#e74c3c",
    },
];

#[derive(Debug, Clone)]
pub struct FontConfig {
    pub id: &'static str,
    pub label: &'static str,
    pub css: &'static str,
    pub url: Option<&'static str>,
}

pub const FONTS: &[FontConfig] = &[
    FontConfig {
        id: "default",
        label: "Outfit (Défaut)",
        css: r#""Outfit", sans-serif"#,
        url: Some(
            "https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;700&display=swap",
        ),
    },
    FontConfig {
        id: "system",
        label: "Police Système",
        css: "system-ui, -apple-system, sans-serif",
        url: None,
    },
    FontConfig {
        id: "inter",
        label: "Inter",
        css: r#""Inter", sans-serif"#,
        url: Some(
            "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700&display=swap",
        ),
    },
    FontConfig {
        id: "roboto",
        label: "Roboto",
        css: r#""Roboto", sans-serif"#,
        url: Some(
            "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap",
        ),
    },
];

#[derive(Debug, Clone)]
pub struct ThemePreset {
    pub id: &'static str,
    pub name: &'static str,
    pub emoji: &'static str,
    pub colors: &'static [(&'static str, &'static str)],
}

pub const THEME_PRESETS: &[ThemePreset] = &[
    ThemePreset {
        id: "default",
        name: "Dark Gold",
        emoji: "🍺",
        colors: &[
            ("--bg-dark", "#0a0a0a"),
            ("--bg-card", "#141414"),
            ("--bg-card-hover", "#1f1f1f"),
            ("--text-primary", "#ffffff"),
            ("--text-secondary", "#a0a0a0"),
            ("--accent-gold", "#FFC000"),
            ("--accent-amber", "#FF9900"),
            ("--accent-foam", "#F0F0F0"),
            ("--border-color", "#2d2d2d"),
            ("--success", "#2ecc71"),
            ("--danger", "#e74c3c"),
        ],
    },
    ThemePreset {
        id: "cyberpunk",
        name: "Cyberpunk Neon",
        emoji: "🌃",
        colors: &[
            ("--bg-dark", "#0a0014"),
            ("--bg-card", "#140028"),
            ("--bg-card-hover", "#1e003c"),
            ("--text-primary", "#e0d0ff"),
            ("--text-secondary", "#8070a0"),
            ("--accent-gold", "#ff00ff"),
            ("--accent-amber", "#aa00ff"),
            ("--accent-foam", "#00ffff"),
            ("--border-color", "#3d1a5c"),
            ("--success", "#00ff88"),
            ("--danger", "#ff0044"),
        ],
    },
    ThemePreset {
        id: "forest",
        name: "Forest",
        emoji: "🌲",
        colors: &[
            ("--bg-dark", "#0a110a"),
            ("--bg-card", "#111c11"),
            ("--bg-card-hover", "#1a2e1a"),
            ("--text-primary", "#d4e8d4"),
            ("--text-secondary", "#7fa07f"),
            ("--accent-gold", "#8bc34a"),
            ("--accent-amber", "#4caf50"),
            ("--accent-foam", "#c8e6c9"),
            ("--border-color", "#2d3d2d"),
            ("--success", "#66bb6a"),
            ("--danger", "#ef5350"),
        ],
    },
    ThemePreset {
        id: "blood",
        name: "Blood Red",
        emoji: "🩸",
        colors: &[
            ("--bg-dark", "#0a0000"),
            ("--bg-card", "#1a0505"),
            ("--bg-card-hover", "#2a0a0a"),
            ("--text-primary", "#ffcccc"),
            ("--text-secondary", "#a07070"),
            ("--accent-gold", "#ff3333"),
            ("--accent-amber", "#cc0000"),
            ("--accent-foam", "#ffaaaa"),
            ("--border-color", "#3d1a1a"),
            ("--success", "#4caf50"),
            ("--danger", "#ff0000"),
        ],
    },
    ThemePreset {
        id: "ocean",
        name: "Deep Ocean",
        emoji: "🌊",
        colors: &[
            ("--bg-dark", "#020b14"),
            ("--bg-card", "#081828"),
            ("--bg-card-hover", "#0e2440"),
            ("--text-primary", "#cce5ff"),
            ("--text-secondary", "#6699cc"),
            ("--accent-gold", "#00bcd4"),
            ("--accent-amber", "#0097a7"),
            ("--accent-foam", "#b2ebf2"),
            ("--border-color", "#1a3a5c"),
            ("--success", "#26a69a"),
            ("--danger", "#ef5350"),
        ],
    },
    ThemePreset {
        id: "sunset",
        name: "Sunset",
        emoji: "🌅",
        colors: &[
            ("--bg-dark", "#120808"),
            ("--bg-card", "#1e0e0a"),
            ("--bg-card-hover", "#2d1810"),
            ("--text-primary", "#ffe0cc"),
            ("--text-secondary", "#b08060"),
            ("--accent-gold", "#ff6b35"),
            ("--accent-amber", "#e64a19"),
            ("--accent-foam", "#ffccbc"),
            ("--border-color", "#3d2219"),
            ("--success", "#66bb6a"),
            ("--danger", "#d32f2f"),
        ],
    },
    ThemePreset {
        id: "belgian",
        name: "Belgian Heritage",
        emoji: "🇧🇪",
        colors: &[
            ("--bg-dark", "#120e0a"),
            ("--bg-card", "#1e1710"),
            ("--bg-card-hover", "#2c2218"),
            ("--text-primary", "#f5ecd7"),
            ("--text-secondary", "#a89880"),
            ("--accent-gold", "#d4a017"),
            ("--accent-amber", "#b84514"),
            ("--accent-foam", "#faf0dc"),
            ("--border-color", "#3a2e20"),
            ("--success", "#4caf50"),
            ("--danger", "#d32f2f"),
        ],
    },
    ThemePreset {
        id: "museum",
        name: "Museum Vault",
        emoji: "🏛️",
        colors: &[
            ("--bg-dark", "#080808"),
            ("--bg-card", "#111111"),
            ("--bg-card-hover", "#1a1a1a"),
            ("--text-primary", "#e8dfcf"),
            ("--text-secondary", "#8a8070"),
            ("--accent-gold", "#c5a059"),
            ("--accent-amber", "#9a7838"),
            ("--accent-foam", "#dfd5c2"),
            ("--border-color", "#25221b"),
            ("--success", "#5a9e6f"),
            ("--danger", "#a84444"),
        ],
    },
];

pub fn generate_css_variables(
    preset_id: &str,
    custom_overrides: Option<&HashMap<String, String>>,
) -> String {
    let mut colors: HashMap<String, String> = HashMap::new();

    let preset = THEME_PRESETS
        .iter()
        .find(|p| p.id == preset_id)
        .unwrap_or(&THEME_PRESETS[0]);

    for (k, v) in preset.colors {
        colors.insert(k.to_string(), v.to_string());
    }

    if let Some(custom) = custom_overrides {
        for (k, v) in custom {
            colors.insert(k.clone(), v.clone());
        }
    }

    let mut css = String::from(":root {\n");
    for (k, v) in colors {
        css.push_str(&format!("  {}: {};\n", k, v));
    }
    css.push_str("}\n");
    css
}

pub fn generate_theme_css(preset_id: &str) -> String {
    generate_css_variables(preset_id, None)
}
