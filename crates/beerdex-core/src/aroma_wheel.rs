use std::f64::consts::PI;

#[derive(Debug, Clone)]
pub struct AromaCategory {
    pub id: &'static str,
    pub name: &'static str,
    pub color: &'static str,
    pub sub: &'static [&'static str],
}

pub const AROMA_CATEGORIES: &[AromaCategory] = &[
    AromaCategory {
        id: "malte",
        name: "Malté",
        color: "#e67e22",
        sub: &["Pain", "Caramel", "Chocolat", "Café"],
    },
    AromaCategory {
        id: "houblonne",
        name: "Houblon",
        color: "#2ecc71",
        sub: &["Résine", "Agrumes", "Tropical", "Herbe"],
    },
    AromaCategory {
        id: "fruite",
        name: "Fruité",
        color: "#e74c3c",
        sub: &["Fruits rouges", "Noyau", "Banane", "Pomme"],
    },
    AromaCategory {
        id: "epice",
        name: "Épicé",
        color: "#9b59b6",
        sub: &["Girofle", "Poivre", "Coriandre", "Vanille"],
    },
    AromaCategory {
        id: "torrefie",
        name: "Torréfié",
        color: "#34495e",
        sub: &["Fumé", "Cendré", "Réglisse", "Grillé"],
    },
    AromaCategory {
        id: "floral",
        name: "Floral",
        color: "#f1c40f",
        sub: &["Rose", "Miel", "Camomille", "Géranium"],
    },
    AromaCategory {
        id: "herbace",
        name: "Herbacé",
        color: "#16a085",
        sub: &["Gazon", "Menthe", "Thé", "Terreux"],
    },
    AromaCategory {
        id: "levure",
        name: "Levuré",
        color: "#f39c12",
        sub: &["Pâte", "Biscuit", "Cuir", "Rustique"],
    },
];

pub fn polar_to_cartesian(
    center_x: f64,
    center_y: f64,
    radius: f64,
    angle_in_degrees: f64,
) -> (f64, f64) {
    let angle_in_radians = (angle_in_degrees - 90.0) * PI / 180.0;
    (
        center_x + (radius * angle_in_radians.cos()),
        center_y + (radius * angle_in_radians.sin()),
    )
}

pub fn describe_arc(
    x: f64,
    y: f64,
    inner_radius: f64,
    outer_radius: f64,
    start_angle: f64,
    end_angle: f64,
) -> String {
    let (start_outer_x, start_outer_y) = polar_to_cartesian(x, y, outer_radius, end_angle);
    let (end_outer_x, end_outer_y) = polar_to_cartesian(x, y, outer_radius, start_angle);
    let (start_inner_x, start_inner_y) = polar_to_cartesian(x, y, inner_radius, end_angle);
    let (end_inner_x, end_inner_y) = polar_to_cartesian(x, y, inner_radius, start_angle);

    let large_arc_flag = if end_angle - start_angle <= 180.0 {
        "0"
    } else {
        "1"
    };

    format!(
        "M {:.2} {:.2} A {:.2} {:.2} 0 {} 0 {:.2} {:.2} L {:.2} {:.2} A {:.2} {:.2} 0 {} 1 {:.2} {:.2} Z",
        start_outer_x,
        start_outer_y,
        outer_radius,
        outer_radius,
        large_arc_flag,
        end_outer_x,
        end_outer_y,
        end_inner_x,
        end_inner_y,
        inner_radius,
        inner_radius,
        large_arc_flag,
        start_inner_x,
        start_inner_y
    )
}

pub fn render_wheel_svg(selected_aromas: &[String]) -> String {
    let size = 370.0;
    let center = size / 2.0;
    let inner_radius = 45.0;
    let mid_radius = 105.0;
    let outer_radius = 180.0;

    let cat_count = AROMA_CATEGORIES.len() as f64;
    let cat_angle = 360.0 / cat_count;

    let mut svg_items = String::new();

    for (cat_idx, cat) in AROMA_CATEGORIES.iter().enumerate() {
        let start_angle = (cat_idx as f64) * cat_angle;
        let end_angle = ((cat_idx + 1) as f64) * cat_angle;
        let mid_angle = start_angle + (cat_angle / 2.0);

        let cat_key = format!("{}:{}", cat.id, cat.name);
        let is_cat_picked = selected_aromas.iter().any(|a| a == &cat_key || a == cat.id);
        let has_sub_selected = cat.sub.iter().any(|s| {
            selected_aromas
                .iter()
                .any(|a| a == &format!("{}:{}", cat.id, s))
        });

        let opacity = if is_cat_picked {
            "1.0"
        } else if has_sub_selected {
            "0.85"
        } else {
            "0.5"
        };

        let stroke = if is_cat_picked { "#FFC000" } else { "#1a1a1a" };
        let stroke_width = if is_cat_picked { "3" } else { "2" };

        let arc_d = describe_arc(
            center,
            center,
            inner_radius,
            mid_radius,
            start_angle + 0.5,
            end_angle - 0.5,
        );

        let (text_x, text_y) =
            polar_to_cartesian(center, center, (inner_radius + mid_radius) / 2.0, mid_angle);

        let weight = if is_cat_picked { "900" } else { "bold" };
        let check = if is_cat_picked { " ✓" } else { "" };

        svg_items.push_str(&format!(
            "<g class=\"wheel-group wheel-cat-slice\" data-cat=\"{}\">\n  <path d=\"{}\" fill=\"{}\" opacity=\"{}\" stroke=\"{}\" stroke-width=\"{}\"/>\n  <text x=\"{:.1}\" y=\"{:.1}\" font-size=\"11\" fill=\"#ffffff\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-weight=\"{}\">{}{}</text>\n</g>\n",
            cat.id, arc_d, cat.color, opacity, stroke, stroke_width, text_x, text_y, weight, cat.name, check
        ));

        // Sub categories
        let sub_angle = cat_angle / (cat.sub.len() as f64);
        for (sub_idx, sub_name) in cat.sub.iter().enumerate() {
            let s_start = start_angle + ((sub_idx as f64) * sub_angle);
            let s_end = start_angle + (((sub_idx + 1) as f64) * sub_angle);
            let s_mid = s_start + (sub_angle / 2.0);

            let aroma_id = format!("{}:{}", cat.id, sub_name);
            let is_selected = selected_aromas.iter().any(|a| a == &aroma_id);

            let sub_opacity = if is_selected {
                "1.0"
            } else if is_cat_picked {
                "0.2"
            } else {
                "0.35"
            };

            let sub_arc_d = describe_arc(
                center,
                center,
                mid_radius,
                outer_radius,
                s_start + 0.2,
                s_end - 0.2,
            );
            let (sub_text_x, sub_text_y) =
                polar_to_cartesian(center, center, (mid_radius + outer_radius) / 2.0, s_mid);
            let font_color = if is_selected { "#ffffff" } else { "#cccccc" };

            svg_items.push_str(&format!(
                "<g class=\"wheel-slice\" data-aroma=\"{}\">\n  <path d=\"{}\" fill=\"{}\" opacity=\"{}\" stroke=\"#1a1a1a\" stroke-width=\"2\"/>\n  <text x=\"{:.1}\" y=\"{:.1}\" font-size=\"9\" fill=\"{}\" text-anchor=\"middle\" dominant-baseline=\"middle\">{}</text>\n</g>\n",
                aroma_id, sub_arc_d, cat.color, sub_opacity, sub_text_x, sub_text_y, font_color, sub_name
            ));
        }
    }

    format!(
        "<svg width=\"100%\" viewBox=\"0 0 {:.0} {:.0}\" style=\"max-width:{:.0}px; height:auto; display:block;\">\n  <circle cx=\"{:.1}\" cy=\"{:.1}\" r=\"{:.1}\" fill=\"#1a1a1a\" stroke=\"#2d2d2d\" stroke-width=\"1.5\"/>\n  <text x=\"{:.1}\" y=\"{:.1}\" font-size=\"12\" fill=\"#ffffff\" text-anchor=\"middle\" dominant-baseline=\"middle\" font-weight=\"bold\">ARÔMES</text>\n{}\n</svg>",
        size, size, size, center, center, inner_radius, center, center, svg_items
    )
}
