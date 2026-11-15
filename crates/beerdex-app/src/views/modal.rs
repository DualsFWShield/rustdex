use crate::state::AppState;
use beerdex_core::models::Beer;
use beerdex_core::rarity::calculate_rarity;

pub fn render_beer_modal(beer: &Beer, state: &AppState) -> String {
    let id = beer.resolved_id();
    let user_data = state.storage.get_user_data(&id);
    let count = user_data.map(|d| d.count).unwrap_or(0);
    let score = user_data.and_then(|d| d.score).unwrap_or(0.0);
    let comment = user_data.and_then(|d| d.comment.as_deref()).unwrap_or("");
    let rarity = calculate_rarity(beer);

    let img_src = beer
        .image
        .as_deref()
        .filter(|s| !s.trim().is_empty())
        .unwrap_or("images/beer/default.png");

    format!(
        r#"<div class="modal-overlay active" id="beer-detail-modal">
            <div class="modal-card" data-rarity="{rarity}">
                <button class="modal-close" id="modal-close-btn">&times;</button>
                <div class="modal-hero">
                    <img src="{img}" alt="{title}" class="modal-beer-img">
                    <div class="modal-header-info">
                        <span class="rarity-badge rarity-{rarity}">{rarity_upper}</span>
                        <h2 class="modal-title">{title}</h2>
                        <h3 class="modal-brewery">{brewery}</h3>
                        <div class="modal-meta-tags">
                            <span class="meta-tag">{style}</span>
                            <span class="meta-tag">{abv}°</span>
                            <span class="meta-tag">{vol}</span>
                        </div>
                    </div>
                </div>

                <div class="modal-actions-panel">
                    <div class="action-volume-selector">
                        <button class="btn-vol" data-vol="25cl">25 cl</button>
                        <button class="btn-vol active" data-vol="33cl">33 cl</button>
                        <button class="btn-vol" data-vol="50cl">Pinte</button>
                    </div>
                    <button class="btn-drink-main" data-id="{id}">🍺 Boire (+1)</button>
                </div>

                <div class="modal-rating-section">
                    <h4>📝 Note & Dégustation</h4>
                    <div class="rating-input-row">
                        <label>Note sur 20 :</label>
                        <input type="number" min="0" max="20" step="0.5" value="{score}" class="score-input" id="input-beer-score">
                    </div>
                    <textarea placeholder="Commentaires de dégustation, arômes..." class="comment-input" id="input-beer-comment">{comment}</textarea>
                    <button class="btn-save-rating" data-id="{id}">Enregistrer la note</button>
                </div>

                <div class="modal-history-preview">
                    <span>Consommations totales : <strong>{count}</strong></span>
                </div>
            </div>
        </div>"#,
        rarity = rarity.rarity,
        rarity_upper = rarity.rarity.to_uppercase(),
        img = img_src,
        title = beer.title,
        brewery = beer.brewery,
        style = beer.beer_type,
        abv = beer.parsed_abv(),
        vol = beer.volume.as_deref().unwrap_or("33cl"),
        id = id,
        score = score,
        comment = comment,
        count = count
    )
}
