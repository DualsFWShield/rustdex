#![allow(deprecated)]

use js_sys::{Array, Function, Object, Promise, Reflect, Set};
use std::cell::RefCell;
use std::cmp::Ordering;
use std::collections::HashSet;
use wasm_bindgen::closure::Closure;
use wasm_bindgen::prelude::*;
use wasm_bindgen::JsCast;
use wasm_bindgen_futures::{spawn_local, JsFuture};
use web_sys::{
    console, CustomEvent, Document, Element, Event, HtmlElement, HtmlInputElement, HtmlLinkElement,
    IntersectionObserver, IntersectionObserverEntry, IntersectionObserverInit, KeyboardEvent,
    ServiceWorker, ServiceWorkerRegistration, ServiceWorkerState, VisibilityState, Window,
};

// ============================================================================
// Bindings vers les modules ES JS existants (1:1 avec les imports de app.js)
// ============================================================================

#[wasm_bindgen(raw_module = "../js/data.js")]
extern "C" {
    #[wasm_bindgen(js_name = "fetchAllBeers")]
    fn data_fetch_all_beers(files: &Array) -> Promise;

    #[wasm_bindgen(js_name = "enrichBeerMetadata")]
    fn data_enrich_beer_metadata(beer: &JsValue) -> JsValue;
}

#[wasm_bindgen(raw_module = "../js/ui.js")]
extern "C" {
    #[wasm_bindgen(js_name = "showToast")]
    fn ui_show_toast(msg: &str);

    #[wasm_bindgen(js_name = "initHeaderParty")]
    fn ui_init_header_party();

    #[wasm_bindgen(js_name = "checkAndShowConsent")]
    fn ui_check_and_show_consent();

    #[wasm_bindgen(js_name = "checkAutoBackup")]
    fn ui_check_auto_backup();

    #[wasm_bindgen(js_name = "checkPatchnotes")]
    fn ui_check_patchnotes();

    #[wasm_bindgen(js_name = "closeModal")]
    fn ui_close_modal(from_back: Option<bool>);

    #[wasm_bindgen(js_name = "updateNetworkStatus")]
    fn ui_update_network_status(is_online: bool);

    #[wasm_bindgen(js_name = "renderBeerList")]
    fn ui_render_beer_list(
        batch: &Array,
        container: &Element,
        active_filters: &JsValue,
        show_create_prompt: bool,
        on_create: &Function,
        is_append: bool,
    );

    #[wasm_bindgen(js_name = "renderAddBeerForm")]
    fn ui_render_add_beer_form(on_submit: &Function, prefill: Option<&str>);

    #[wasm_bindgen(js_name = "filterSettings")]
    fn ui_filter_settings(query: &str);

    #[wasm_bindgen(js_name = "renderFilterModal")]
    fn ui_render_filter_modal(beers: &Array, active_filters: &JsValue, on_apply: &Function);

    #[wasm_bindgen(js_name = "renderBeerDetail")]
    fn ui_render_beer_detail(beer: &JsValue, on_rate: &Function);

    #[wasm_bindgen(js_name = "renderUnratedBanner")]
    fn ui_render_unrated_banner(beers: &Array, container: &Element, migration_prompts: &JsValue);

    #[wasm_bindgen(js_name = "renderStats")]
    fn ui_render_stats(beers: &Array, user_data: &JsValue, container: &Element, is_discovery: bool);

    #[wasm_bindgen(js_name = "renderSettings")]
    fn ui_render_settings(
        beers: &Array,
        user_data: &JsValue,
        container: &Element,
        is_discovery: bool,
        on_discovery_change: &Function,
    );

    #[wasm_bindgen(js_name = "renderBreweryView")]
    fn ui_render_brewery_view(
        brewery_name: &str,
        beers: &Array,
        container: &Element,
        active_filters: &JsValue,
        on_back: &Function,
    );
}

#[wasm_bindgen(raw_module = "../js/storage.js")]
extern "C" {
    #[wasm_bindgen(js_name = "getPreference")]
    fn storage_get_preference(key: &str, default_val: &JsValue) -> JsValue;

    #[wasm_bindgen(js_name = "savePreference")]
    fn storage_save_preference(key: &str, val: &JsValue);

    #[wasm_bindgen(js_name = "getCustomBeers")]
    fn storage_get_custom_beers() -> Array;

    #[wasm_bindgen(js_name = "applyHistoricalAliases")]
    fn storage_apply_historical_aliases(beers: &Array) -> Promise;

    #[wasm_bindgen(js_name = "cleanupOrphanedUserData")]
    fn storage_cleanup_orphaned_user_data(beers: &Array);

    #[wasm_bindgen(js_name = "saveCustomBeer")]
    fn storage_save_custom_beer(beer: &JsValue);

    #[wasm_bindgen(js_name = "getBeerRating")]
    fn storage_get_beer_rating(id: &JsValue) -> JsValue;

    #[wasm_bindgen(js_name = "saveBeerRating")]
    fn storage_save_beer_rating(id: &JsValue, rating_data: &JsValue);

    #[wasm_bindgen(js_name = "isFavorite")]
    fn storage_is_favorite(id: &JsValue) -> bool;

    #[wasm_bindgen(js_name = "getAllConsumedBeerIdSet")]
    fn storage_get_all_consumed_beer_id_set() -> Set;

    #[wasm_bindgen(js_name = "getAllUserData")]
    fn storage_get_all_user_data() -> JsValue;
}

#[wasm_bindgen(raw_module = "../js/achievements.js")]
extern "C" {
    #[wasm_bindgen(js_name = "checkAchievements")]
    fn achievements_check(beers: &Array);
}

#[wasm_bindgen(raw_module = "../js/api.js")]
extern "C" {
    #[wasm_bindgen(js_name = "start")]
    fn api_start(get_beers: &Function);
}

#[wasm_bindgen(raw_module = "../js/env.js")]
extern "C" {
    #[wasm_bindgen(js_name = "getEdition")]
    fn env_get_edition() -> Promise;
}

#[wasm_bindgen(raw_module = "../js/feedback.js")]
extern "C" {
    #[wasm_bindgen(js_name = "Feedback")]
    static FEEDBACK: JsValue;
}

#[wasm_bindgen(raw_module = "../js/analytics.js")]
extern "C" {
    #[wasm_bindgen(js_name = "Analytics")]
    static ANALYTICS: JsValue;
}

#[wasm_bindgen(raw_module = "../js/bac.js")]
extern "C" {
    #[wasm_bindgen(js_name = "getBACStatus")]
    fn bac_get_status() -> JsValue;

    #[wasm_bindgen(js_name = "getCurrentBAC")]
    fn bac_get_current() -> f64;
}

#[wasm_bindgen(raw_module = "../js/wrapped.js")]
extern "C" {
    #[wasm_bindgen(js_name = "init")]
    fn wrapped_init(get_beers: &Function);
}

#[wasm_bindgen(raw_module = "../js/event-system.js")]
extern "C" {
    #[wasm_bindgen(js_name = "EventSystem")]
    static EVENT_SYSTEM: JsValue;
}

#[wasm_bindgen(raw_module = "../js/i18n.js")]
extern "C" {
    #[wasm_bindgen(js_name = "i18n")]
    static I18N: JsValue;
}

#[wasm_bindgen(raw_module = "../js/widget-bridge.js")]
extern "C" {
    #[wasm_bindgen(js_name = "updateWidgetData")]
    fn widget_bridge_update_widget_data();
}

#[wasm_bindgen(raw_module = "../js/crashLogger.js")]
extern "C" {
    #[wasm_bindgen(js_name = "init")]
    fn crash_logger_init();
}

#[wasm_bindgen(raw_module = "../js/deduplicator.js")]
extern "C" {
    #[wasm_bindgen(js_name = "runCheck")]
    fn deduplicator_run_check(beers: &Array) -> Array;
}

#[wasm_bindgen(raw_module = "../js/theme.js")]
extern "C" {
    #[wasm_bindgen(js_name = "init")]
    fn theme_init();

    #[wasm_bindgen(js_name = "getActiveColors")]
    fn theme_get_active_colors() -> JsValue;
}

#[wasm_bindgen(raw_module = "../js/utils.js")]
extern "C" {
    #[wasm_bindgen(js_name = "fuzzyMatchBeers")]
    fn utils_fuzzy_match_beers(beers: &Array, query: &str) -> Array;

    #[wasm_bindgen(js_name = "syncBACFromCountDiff")]
    fn utils_sync_bac_from_count_diff(beer: &JsValue, old_count: i32, new_count: i32);

    #[wasm_bindgen(js_name = "parseDegree")]
    fn utils_parse_degree(val: &JsValue) -> f64;

    #[wasm_bindgen(js_name = "parseVolumeToMl")]
    fn utils_parse_volume_to_ml(val: &JsValue) -> f64;

    #[wasm_bindgen(js_name = "categorizeBeerType")]
    fn utils_categorize_beer_type(beer_type: &JsValue) -> JsValue;
}

fn bind_namespace_globals() {
    let win = window();
    let ui = get_prop(&win, "UI");
    if ui.is_truthy() {
        set_prop(&win, "showToast", &get_prop(&ui, "showToast"));
    }
}

fn get_ui_namespace() -> JsValue {
    get_prop(&window(), "UI")
}

// ============================================================================
// État global de l'application
// ============================================================================

struct Pagination {
    page: usize,
    items_per_page: usize,
    has_more: bool,
}

struct AppState {
    beers: Vec<JsValue>,
    filtered_beers: Vec<JsValue>,
    filter: String,
    active_filters: Object,
    view: String,
    view_mode: String,
    pagination: Pagination,
    observer: Option<IntersectionObserver>,
    #[allow(dead_code)]
    initial_view: String,
    migration_prompts: Array,
    active_brewery: Option<String>,
    is_loading_more: bool,
    app_header_ref: Option<Element>,
    global_handlers_bound: bool,
    search_debounce_timer: Option<i32>,
}

impl AppState {
    fn new() -> Self {
        let view_mode = storage_get_preference("viewMode", &JsValue::from_str("grid"))
            .as_string()
            .unwrap_or_else(|| "grid".to_string());

        Self {
            beers: Vec::new(),
            filtered_beers: Vec::new(),
            filter: String::new(),
            active_filters: Object::new(),
            view: "home".to_string(),
            view_mode,
            pagination: Pagination {
                page: 1,
                items_per_page: 24,
                has_more: true,
            },
            observer: None,
            initial_view: "home".to_string(),
            migration_prompts: Array::new(),
            active_brewery: None,
            is_loading_more: false,
            app_header_ref: None,
            global_handlers_bound: false,
            search_debounce_timer: None,
        }
    }
}

thread_local! {
    static STATE: RefCell<AppState> = RefCell::new(AppState::new());
}

// ============================================================================
// Helpers JS / DOM / i18n
// ============================================================================

fn window() -> Window {
    web_sys::window().expect("no global `window` exists")
}

fn document() -> Document {
    window()
        .document()
        .expect("should have a document on window")
}

fn get_prop(obj: &JsValue, key: &str) -> JsValue {
    Reflect::get(obj, &JsValue::from_str(key)).unwrap_or(JsValue::UNDEFINED)
}

fn set_prop(obj: &JsValue, key: &str, val: &JsValue) {
    let _ = Reflect::set(obj, &JsValue::from_str(key), val);
}

fn delete_prop(obj: &JsValue, key: &str) {
    if let Some(o) = obj.dyn_ref::<Object>() {
        let _ = Reflect::delete_property(o, &JsValue::from_str(key));
    }
}

fn call_method(obj: &JsValue, method: &str, args: &Array) -> Result<JsValue, JsValue> {
    let func = get_prop(obj, method);
    if func.is_function() {
        let f: Function = func.unchecked_into();
        f.apply(obj, args)
    } else {
        Err(JsValue::from_str(&format!("Method {} not found", method)))
    }
}

fn vec_to_js_array(items: &[JsValue]) -> Array {
    let arr = Array::new_with_length(items.len() as u32);
    for (i, item) in items.iter().enumerate() {
        arr.set(i as u32, item.clone());
    }
    arr
}

fn js_array_to_vec(arr: &Array) -> Vec<JsValue> {
    let len = arr.length();
    let mut vec = Vec::with_capacity(len as usize);
    for i in 0..len {
        vec.push(arr.get(i));
    }
    vec
}

fn state_beers_as_js_array() -> Array {
    STATE.with(|s| vec_to_js_array(&s.borrow().beers))
}

fn js_val_to_string(v: &JsValue) -> String {
    if let Some(s) = v.as_string() {
        s
    } else if let Some(n) = v.as_f64() {
        n.to_string()
    } else if v.is_null() || v.is_undefined() {
        String::new()
    } else {
        js_sys::JsString::from(v.clone()).into()
    }
}

fn i18n_t(key: &str) -> String {
    let args = Array::of1(&JsValue::from_str(key));
    call_method(&I18N, "t", &args)
        .ok()
        .and_then(|v| v.as_string())
        .unwrap_or_default()
}

fn i18n_t_or(key: &str, fallback: &str) -> String {
    let translated = i18n_t(key);
    if translated.is_empty() {
        fallback.to_string()
    } else {
        translated
    }
}

fn i18n_current_lang() -> String {
    get_prop(&I18N, "currentLang")
        .as_string()
        .unwrap_or_else(|| "fr".to_string())
}

fn pref_bool(key: &str, default_val: bool) -> bool {
    storage_get_preference(key, &JsValue::from_bool(default_val)).is_truthy()
}

fn is_median_env() -> bool {
    let win = window();
    let has_median = !get_prop(&win, "median").is_undefined();
    let has_gonative = !get_prop(&win, "gonative").is_undefined();
    let ua = win.navigator().user_agent().unwrap_or_default();
    has_median || has_gonative || ua.contains("median") || ua.contains("gonative")
}

fn run_when_idle<F: FnOnce() + 'static>(f: F, timeout: u32) {
    let win = window();
    let ric = get_prop(&win, "requestIdleCallback");
    let cb = Closure::once_into_js(f);

    if ric.is_function() {
        let ric_fn: Function = ric.unchecked_into();
        let opts = Object::new();
        set_prop(&opts, "timeout", &JsValue::from_f64(timeout as f64));
        let _ = ric_fn.call2(&win, &cb, &opts);
    } else {
        let delay = timeout.min(1000) as i32;
        let _ =
            win.set_timeout_with_callback_and_timeout_and_arguments_0(cb.unchecked_ref(), delay);
    }
}

fn set_timeout_once<F: FnOnce() + 'static>(f: F, ms: i32) -> i32 {
    let cb = Closure::once_into_js(f);
    window()
        .set_timeout_with_callback_and_timeout_and_arguments_0(cb.unchecked_ref(), ms)
        .unwrap_or(0)
}

// ============================================================================
// Point d'entrée (exécuté au chargement du module WASM)
// ============================================================================

#[wasm_bindgen(start)]
pub fn start() {
    let win = window();
    let doc = document();

    // 1. Exposer les modules sur window
    bind_namespace_globals();

    // 2. Session-based animation tracking (persists through normal refresh)
    let played_anims = (|| -> Result<Set, JsValue> {
        let storage = win.session_storage()?.ok_or(JsValue::NULL)?;
        if let Some(saved) = storage.get_item("beerdex_played_anims")? {
            let parsed = js_sys::JSON::parse(&saved)?;
            let set = Set::new(&parsed);
            Ok(set)
        } else {
            Ok(Set::new(&JsValue::UNDEFINED))
        }
    })()
    .unwrap_or_else(|_| Set::new(&JsValue::UNDEFINED));

    set_prop(&win, "__playedAnims", &played_anims);

    let save_played_anims = Closure::wrap(Box::new(|| {
        let win = window();
        if let Ok(Some(storage)) = win.session_storage() {
            let set_val = get_prop(&win, "__playedAnims");
            let arr = Array::from(&set_val);
            if let Ok(json) = js_sys::JSON::stringify(&arr) {
                if let Some(s) = json.as_string() {
                    let _ = storage.set_item("beerdex_played_anims", &s);
                }
            }
        }
    }) as Box<dyn FnMut()>);
    set_prop(&win, "savePlayedAnims", save_played_anims.as_ref());
    save_played_anims.forget();

    // 3. Init crash logger FIRST so it catches all errors from boot
    crash_logger_init();

    // 4. Listener `beerdex:rust-ready`
    let on_rust_ready = Closure::wrap(Box::new(|| {
        let doc = document();
        if let Some(el) = doc.get_element_by_id("beerdex-native-styles") {
            el.remove();
        }
        if let Ok(list) = doc.query_selector_all("#app #modal-container") {
            for i in 0..list.length() {
                if let Some(node) = list.get(i) {
                    if let Ok(el) = node.dyn_into::<Element>() {
                        el.remove();
                    }
                }
            }
        }

        let shell = doc.query_selector(".app-header").ok().flatten();
        let should_rebind = STATE.with(|s| {
            let mut st = s.borrow_mut();
            match (&st.app_header_ref, &shell) {
                (Some(prev), Some(curr)) if prev != curr => {
                    st.app_header_ref = Some(curr.clone());
                    true
                }
                _ => false,
            }
        });

        if !should_rebind {
            return;
        }
        setup_event_listeners();
        ui_init_header_party();
        let has_beers = STATE.with(|s| !s.borrow().beers.is_empty());
        if has_beers {
            render_current_view();
        }
    }) as Box<dyn FnMut()>);
    let _ = win.add_event_listener_with_callback(
        "beerdex:rust-ready",
        on_rust_ready.as_ref().unchecked_ref(),
    );
    on_rust_ready.forget();

    // 5. Initialize Wrapped
    let get_beers_for_wrapped =
        Closure::wrap(Box::new(|| state_beers_as_js_array()) as Box<dyn FnMut() -> Array>);
    wrapped_init(get_beers_for_wrapped.as_ref().unchecked_ref());
    get_beers_for_wrapped.forget();

    // 6. Exposer applyTheme, renderCurrentView, renderCatalog, addImportedCustomBeers sur window
    let apply_theme_cb = Closure::wrap(Box::new(|| apply_theme()) as Box<dyn FnMut()>);
    set_prop(&win, "applyTheme", apply_theme_cb.as_ref());
    apply_theme_cb.forget();

    let render_view_cb = Closure::wrap(Box::new(|| render_current_view()) as Box<dyn FnMut()>);
    set_prop(&win, "renderCurrentView", render_view_cb.as_ref());
    render_view_cb.forget();

    let render_catalog_cb = Closure::wrap(Box::new(|| render_current_view()) as Box<dyn FnMut()>);
    set_prop(&win, "renderCatalog", render_catalog_cb.as_ref());
    render_catalog_cb.forget();

    let add_imported_cb = Closure::wrap(Box::new(|new_beers: JsValue| {
        add_imported_custom_beers(new_beers);
    }) as Box<dyn FnMut(JsValue)>);
    set_prop(&win, "addImportedCustomBeers", add_imported_cb.as_ref());
    add_imported_cb.forget();

    // 7. Listener global `beerdex-action`
    let on_beerdex_action = Closure::wrap(Box::new(|| {
        let custom_beers = storage_get_custom_beers();
        STATE.with(|s| {
            let mut st = s.borrow_mut();
            for i in 0..custom_beers.length() {
                let cb = custom_beers.get(i);
                let cb_id = get_prop(&cb, "id");
                let exists = st.beers.iter().any(|b| get_prop(b, "id") == cb_id);
                if !exists {
                    st.beers.insert(0, cb);
                }
            }
        });
        achievements_check(&state_beers_as_js_array());
    }) as Box<dyn FnMut()>);
    let _ = win.add_event_listener_with_callback(
        "beerdex-action",
        on_beerdex_action.as_ref().unchecked_ref(),
    );
    on_beerdex_action.forget();

    // 8. Listener global `beerdex-open-brewery`
    let on_open_brewery = Closure::wrap(Box::new(|e: Event| {
        let detail = e
            .dyn_ref::<CustomEvent>()
            .map(|ce| ce.detail())
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(brewery_name) = get_prop(&detail, "brewery").as_string() {
            if !brewery_name.is_empty() {
                let prev_view = STATE.with(|s| {
                    let mut st = s.borrow_mut();
                    st.active_brewery = Some(brewery_name);
                    let prev = st.view.clone();
                    st.view = "brewery".to_string();
                    prev
                });

                let win = window();
                let doc = document();

                if prev_view != "brewery" {
                    let state_obj = Object::new();
                    set_prop(&state_obj, "view", &JsValue::from_str("brewery"));
                    if let Ok(history) = win.history() {
                        let _ = history.push_state_with_url(&state_obj, "", None);
                    }
                }

                if let Ok(navs) = doc.query_selector_all(".nav-item") {
                    for i in 0..navs.length() {
                        if let Some(node) = navs.get(i) {
                            if let Ok(el) = node.dyn_into::<Element>() {
                                let _ = el.class_list().remove_1("active");
                            }
                        }
                    }
                }

                win.scroll_to_with_x_and_y(0.0, 0.0);
                if let Ok(ev) = CustomEvent::new("beerdex-close-search") {
                    let _ = win.dispatch_event(&ev);
                }
                render_current_view();
            }
        }
    }) as Box<dyn FnMut(Event)>);
    let _ = win.add_event_listener_with_callback(
        "beerdex-open-brewery",
        on_open_brewery.as_ref().unchecked_ref(),
    );
    on_open_brewery.forget();

    // 9. Register Service Worker for PWA (Only in Web Mode)
    register_service_worker();

    // 10. Initialize on DOMContentLoaded (or immediately if ready)
    if doc.ready_state() == "loading" {
        let on_dom_loaded = Closure::once_into_js(|| {
            spawn_local(init());
        });
        let _ =
            win.add_event_listener_with_callback("DOMContentLoaded", on_dom_loaded.unchecked_ref());
    } else {
        spawn_local(init());
    }
}

// ============================================================================
// Initialisation asynchrone principale (`init`)
// ============================================================================

async fn init() {
    if let Err(err) = init_inner().await {
        console::error_2(&JsValue::from_str("Failed to initialize Beerdex:"), &err);
        ui_show_toast(&i18n_t("error_load_data"));
    }
}

async fn init_inner() -> Result<(), JsValue> {
    let win = window();
    let doc = document();

    // --- NETWORK & EDITION SETUP ---
    setup_network_listeners();
    let edition = JsFuture::from(env_get_edition()).await?;
    if let Some(body) = doc.body() {
        let edition_str = js_val_to_string(&edition);
        let _ = body.set_attribute("data-edition", &edition_str);
    }

    let is_standalone = call_method(
        &win,
        "matchMedia",
        &Array::of1(&JsValue::from_str("(display-mode: standalone)")),
    )
    .ok()
    .and_then(|mql| get_prop(&mql, "matches").as_bool())
    .unwrap_or(false);

    let track_payload = Object::new();
    set_prop(
        &track_payload,
        "isStandalone",
        &JsValue::from_bool(is_standalone),
    );
    set_prop(&track_payload, "edition", &edition);
    let _ = call_method(
        &ANALYTICS,
        "track",
        &Array::of2(&JsValue::from_str("app_open"), &track_payload),
    );
    let _ = call_method(&ANALYTICS, "retroactiveSync", &Array::new());

    // --- EVENT SYSTEM INIT ---
    if let Ok(p) = call_method(&EVENT_SYSTEM, "init", &Array::new()) {
        if let Ok(promise) = p.dyn_into::<Promise>() {
            JsFuture::from(promise).await?;
        }
    }

    // --- I18N INIT ---
    if let Ok(p) = call_method(&I18N, "init", &Array::new()) {
        if let Ok(promise) = p.dyn_into::<Promise>() {
            JsFuture::from(promise).await?;
        }
    }

    // Re-check network status after translation
    let hsc = get_prop(&win, "handleStatusChange");
    if hsc.is_function() {
        let f: Function = hsc.unchecked_into();
        let _ = f.call0(&win);
    }

    // Apply Theme (Theme Engine + Museum)
    theme_init();
    apply_theme();

    // Show skeleton loading immediately
    if let Some(main_content) = doc.get_element_by_id("main-content") {
        show_skeleton_loading(&main_content);
    }

    // Lazy-loading: Load Core Beers first for fast render
    let core_files = Array::of3(
        &JsValue::from_str("data/newbeer.json"),
        &JsValue::from_str("data/belgiumbeer.json"),
        &JsValue::from_str("data/saison.json"),
    );
    let static_beers_val = JsFuture::from(data_fetch_all_beers(&core_files)).await?;
    let static_beers_arr: Array = static_beers_val.dyn_into().unwrap_or_else(|_| Array::new());

    let raw_custom = storage_get_custom_beers();
    let mut combined: Vec<JsValue> =
        Vec::with_capacity((raw_custom.length() + static_beers_arr.length()) as usize);
    for i in 0..raw_custom.length() {
        combined.push(data_enrich_beer_metadata(&raw_custom.get(i)));
    }
    for i in 0..static_beers_arr.length() {
        combined.push(static_beers_arr.get(i));
    }

    STATE.with(|s| {
        s.borrow_mut().beers = combined;
    });
    let all_beers_arr = state_beers_as_js_array();
    set_prop(&win, "allBeers", &all_beers_arr);

    let rec = get_prop(&win, "Recommendation");
    if rec.is_truthy() {
        let _ = call_method(&rec, "init", &Array::of1(&all_beers_arr));
        if pref_bool("feat_brewbrother_enabled", true) && pref_bool("card_brewbrother_pct", false) {
            if let Ok(p) = call_method(&rec, "getUserTasteProfile", &Array::of1(&all_beers_arr)) {
                if let Ok(promise) = p.dyn_into::<Promise>() {
                    let _ = JsFuture::from(promise).await;
                }
            }
        }
    }

    // Initial Render
    render_current_view();

    // Lazy-load the rest of the database during idle time
    run_when_idle(
        || {
            spawn_local(load_deferred_data());
        },
        2500,
    );

    // Setup Event Listeners
    setup_event_listeners();
    let header_el = doc.query_selector(".app-header").ok().flatten();
    STATE.with(|s| {
        s.borrow_mut().app_header_ref = header_el;
    });

    // Initialize Header Party Widget & Startup checks
    ui_init_header_party();
    ui_check_and_show_consent();
    ui_check_auto_backup();
    ui_check_patchnotes();

    // Setup Keyboard safe area fixes natively for edge-to-edge (Capacitor)
    let cap = get_prop(&win, "Capacitor");
    let cap_plugins = get_prop(&cap, "Plugins");
    let keyboard = get_prop(&cap_plugins, "Keyboard");
    if keyboard.is_truthy() {
        let on_show = Closure::wrap(Box::new(|| {
            if let Some(body) = document().body() {
                let _ = body.class_list().add_1("keyboard-open");
            }
        }) as Box<dyn FnMut()>);
        let _ = call_method(
            &keyboard,
            "addListener",
            &Array::of2(&JsValue::from_str("keyboardWillShow"), on_show.as_ref()),
        );
        on_show.forget();

        let on_hide = Closure::wrap(Box::new(|| {
            if let Some(body) = document().body() {
                let _ = body.class_list().remove_1("keyboard-open");
            }
        }) as Box<dyn FnMut()>);
        let _ = call_method(
            &keyboard,
            "addListener",
            &Array::of2(&JsValue::from_str("keyboardWillHide"), on_hide.as_ref()),
        );
        on_hide.forget();
    }

    // Setup Back Button Navigation (Universal)
    // Strategy 1: Capacitor @capacitor/app plugin
    let cap_app = {
        let p_app = get_prop(&cap_plugins, "App");
        if p_app.is_truthy() {
            p_app
        } else {
            get_prop(&cap, "App")
        }
    };

    if cap_app.is_truthy() && get_prop(&cap_app, "addListener").is_function() {
        let cap_app_clone = cap_app.clone();
        let on_cap_back = Closure::wrap(Box::new(move |info: JsValue| {
            let can_go_back = get_prop(&info, "canGoBack").is_truthy();
            let handled = handle_back_navigation();
            if !handled {
                let hist_len = window()
                    .history()
                    .ok()
                    .and_then(|h| h.length().ok())
                    .unwrap_or(0);
                if can_go_back && hist_len > 1 {
                    if let Ok(h) = window().history() {
                        let _ = h.back();
                    }
                } else if get_prop(&cap_app_clone, "minimizeApp").is_function() {
                    let _ = call_method(&cap_app_clone, "minimizeApp", &Array::new());
                } else if get_prop(&cap_app_clone, "exitApp").is_function() {
                    let _ = call_method(&cap_app_clone, "exitApp", &Array::new());
                }
            }
        }) as Box<dyn FnMut(JsValue)>);
        let _ = call_method(
            &cap_app,
            "addListener",
            &Array::of2(&JsValue::from_str("backButton"), on_cap_back.as_ref()),
        );
        on_cap_back.forget();
    }

    // Strategy 2: Document 'backbutton' event (Android WebView / Cordova-style fallback)
    let cap_app_fallback = cap_app.clone();
    let on_doc_back = Closure::wrap(Box::new(move |e: Event| {
        e.prevent_default();
        let handled = handle_back_navigation();
        if !handled {
            let nav_val: JsValue = window().navigator().into();
            let nav_app = get_prop(&nav_val, "app");
            if nav_app.is_truthy() && get_prop(&nav_app, "exitApp").is_function() {
                let _ = call_method(&nav_app, "exitApp", &Array::new());
            } else if cap_app_fallback.is_truthy()
                && get_prop(&cap_app_fallback, "minimizeApp").is_function()
            {
                let _ = call_method(&cap_app_fallback, "minimizeApp", &Array::new());
            }
        }
    }) as Box<dyn FnMut(Event)>);
    let _ =
        doc.add_event_listener_with_callback("backbutton", on_doc_back.as_ref().unchecked_ref());
    on_doc_back.forget();

    // Set initial history state
    let initial_view = STATE.with(|s| s.borrow().view.clone());
    let init_state = Object::new();
    set_prop(&init_state, "view", &JsValue::from_str(&initial_view));
    set_prop(&init_state, "isInitial", &JsValue::from_bool(true));
    if let Ok(history) = win.history() {
        let _ = history.replace_state_with_url(&init_state, "", None);
    }

    // Listen for back-navigation view changes from popstate handler
    let on_nav_back = Closure::wrap(Box::new(|e: Event| {
        let detail = e
            .dyn_ref::<CustomEvent>()
            .map(|ce| ce.detail())
            .unwrap_or(JsValue::UNDEFINED);
        if let Some(target_view) = get_prop(&detail, "view").as_string() {
            let changed = STATE.with(|s| {
                let mut st = s.borrow_mut();
                if !target_view.is_empty() && target_view != st.view {
                    st.view = target_view;
                    true
                } else {
                    false
                }
            });
            if changed {
                render_current_view();
            }
        }
    }) as Box<dyn FnMut(Event)>);
    let _ = win.add_event_listener_with_callback(
        "beerdex-navigate-back",
        on_nav_back.as_ref().unchecked_ref(),
    );
    on_nav_back.forget();

    // --- NATIVE WIDGET INITIAL SYNC ---
    let on_visibility = Closure::wrap(Box::new(|| {
        if document().visibility_state() == VisibilityState::Visible {
            widget_bridge_update_widget_data();
        }
    }) as Box<dyn FnMut()>);
    let _ = doc.add_event_listener_with_callback(
        "visibilitychange",
        on_visibility.as_ref().unchecked_ref(),
    );
    on_visibility.forget();
    widget_bridge_update_widget_data();

    // --- API AUTO-ACTION CHECK ---
    let get_beers_for_api =
        Closure::wrap(Box::new(|| state_beers_as_js_array()) as Box<dyn FnMut() -> Array>);
    api_start(get_beers_for_api.as_ref().unchecked_ref());
    get_beers_for_api.forget();

    Ok(())
}

async fn load_deferred_data() {
    let rest_files = Array::new();
    for file in [
        "data/deutchbeer.json",
        "data/frenchbeer.json",
        "data/nlbeer.json",
        "data/usbeer.json",
        "data/cobeer.json",
        "data/krbeer.json",
        "data/jpbeer.json",
        "data/cnbeer.json",
    ] {
        rest_files.push(&JsValue::from_str(file));
    }

    if let Ok(more_val) = JsFuture::from(data_fetch_all_beers(&rest_files)).await {
        if let Ok(more_beers) = more_val.dyn_into::<Array>() {
            let added = STATE.with(|s| {
                let mut st = s.borrow_mut();
                let current_ids: HashSet<String> = st
                    .beers
                    .iter()
                    .map(|b| js_val_to_string(&get_prop(b, "id")))
                    .collect();

                let mut new_beers = Vec::new();
                for i in 0..more_beers.length() {
                    let b = more_beers.get(i);
                    let id = js_val_to_string(&get_prop(&b, "id"));
                    if !current_ids.contains(&id) {
                        new_beers.push(b);
                    }
                }
                if !new_beers.is_empty() {
                    st.beers.extend(new_beers);
                    true
                } else {
                    false
                }
            });

            if added {
                let win = window();
                let all_arr = state_beers_as_js_array();
                set_prop(&win, "allBeers", &all_arr);
                let rec = get_prop(&win, "Recommendation");
                if rec.is_truthy() {
                    let _ = call_method(&rec, "init", &Array::of1(&all_arr));
                }
            }
        }
    }

    let all_arr = state_beers_as_js_array();

    // Thanos: Apply historical ID alias migrations (retroactive data safety)
    let alias_promise = storage_apply_historical_aliases(&all_arr);
    spawn_local(async move {
        if let Err(err) = JsFuture::from(alias_promise).await {
            console::warn_2(&JsValue::from_str("[Thanos] Alias migration error:"), &err);
        }
    });

    // Cleanup orphaned user data
    const MIN_BEERS_FOR_CLEANUP: usize = 200;
    let total_beers = STATE.with(|s| s.borrow().beers.len());
    if total_beers >= MIN_BEERS_FOR_CLEANUP {
        storage_cleanup_orphaned_user_data(&all_arr);
    } else {
        console::warn_1(&JsValue::from_str(&format!(
            "[App] Skipped orphan cleanup: only {} beers loaded (min: {})",
            total_beers, MIN_BEERS_FOR_CLEANUP
        )));
    }

    // Check for Achievements on Load
    achievements_check(&all_arr);

    // Run deduplicator in the background during idle
    run_when_idle(
        || {
            let beers_arr = state_beers_as_js_array();
            let prompts = deduplicator_run_check(&beers_arr);
            let should_rerender = STATE.with(|s| {
                let mut st = s.borrow_mut();
                let has_prompts = prompts.length() > 0;
                st.migration_prompts = prompts;
                has_prompts && (st.view == "home" || st.view == "drunk")
            });
            if should_rerender {
                render_current_view();
            }
        },
        6000,
    );
}

fn handle_back_navigation() -> bool {
    let win = window();
    let doc = document();

    // 1. If modals are open via modalStack
    let ui_ns = get_ui_namespace();
    let modal_stack = get_prop(&ui_ns, "modalStack");
    if let Ok(stack_arr) = modal_stack.dyn_into::<Array>() {
        if stack_arr.length() > 0 {
            let top_close = stack_arr.pop();
            if top_close.is_function() {
                let f: Function = top_close.unchecked_into();
                let _ = f.call1(&JsValue::UNDEFINED, &JsValue::from_bool(true));
            }
            return true;
        }
    }

    // 1b. If modal-container is open / visible
    if let Some(modal_container) = doc.get_element_by_id("modal-container") {
        if !modal_container.class_list().contains("hidden")
            && !modal_container.inner_html().trim().is_empty()
        {
            ui_close_modal(Some(true));
            return true;
        }
    }

    // 2. If search bar is open
    if let Some(search_bar) = doc.get_element_by_id("search-bar") {
        if !search_bar.class_list().contains("hidden") {
            let _ = search_bar.class_list().add_1("hidden");
            if let Some(input) = doc
                .get_element_by_id("search-input")
                .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
            {
                input.set_value("");
            }
            STATE.with(|s| s.borrow_mut().filter.clear());
            render_current_view();
            return true;
        }
    }

    // 3. If current view is not 'home' -> return to home view!
    let not_home = STATE.with(|s| {
        let mut st = s.borrow_mut();
        if !st.view.is_empty() && st.view != "home" {
            st.view = "home".to_string();
            true
        } else {
            false
        }
    });
    if not_home {
        if let Ok(navs) = doc.query_selector_all(".nav-item") {
            for i in 0..navs.length() {
                if let Some(node) = navs.get(i) {
                    if let Ok(el) = node.dyn_into::<Element>() {
                        let _ = el.class_list().remove_1("active");
                    }
                }
            }
        }
        if let Ok(Some(home_btn)) = doc.query_selector(".nav-item[data-view=\"home\"]") {
            let _ = home_btn.class_list().add_1("active");
        }
        render_current_view();
        win.scroll_to_with_x_and_y(0.0, 0.0);
        return true;
    }

    // 4. If history has previous state that is not initial
    if let Ok(history) = win.history() {
        let hist_state = history.state().unwrap_or(JsValue::NULL);
        let hist_len = history.length().unwrap_or(0);
        if hist_state.is_truthy() && !get_prop(&hist_state, "isInitial").is_truthy() && hist_len > 1
        {
            let _ = history.back();
            return true;
        }
    }

    false
}

// ============================================================================
// Réseau & Thème
// ============================================================================

fn setup_network_listeners() {
    let win = window();

    let handle_status_change = || {
        let is_online = window().navigator().on_line();
        if let Some(body) = document().body() {
            if is_online {
                let _ = body.class_list().remove_1("is-offline");
            } else {
                let _ = body.class_list().add_1("is-offline");
            }
        }

        if is_online {
            let _ = call_method(&ANALYTICS, "flush", &Array::new());
        }

        let ui_ns = get_ui_namespace();
        if get_prop(&ui_ns, "updateNetworkStatus").is_function() {
            ui_update_network_status(is_online);
        }
    };

    let cb = Closure::wrap(Box::new(handle_status_change) as Box<dyn FnMut()>);
    let _ = win.add_event_listener_with_callback("online", cb.as_ref().unchecked_ref());
    let _ = win.add_event_listener_with_callback("offline", cb.as_ref().unchecked_ref());
    set_prop(&win, "handleStatusChange", cb.as_ref());

    // Initial check
    let f: &Function = cb.as_ref().unchecked_ref();
    let _ = f.call0(&win);
    cb.forget();
}

#[wasm_bindgen(js_name = "applyTheme")]
pub fn apply_theme() {
    let win = window();
    let doc = document();
    let museum_theme_enabled = pref_bool("museumThemeEnabled", false);

    // Always default to dark
    if let Some(doc_el) = doc.document_element() {
        let _ = doc_el.remove_attribute("data-theme");
    }

    if !museum_theme_enabled {
        theme_init();
    }

    // Toggle Stylesheet
    if let Some(museum_link) = doc
        .get_element_by_id("css-museum")
        .and_then(|el| el.dyn_into::<HtmlLinkElement>().ok())
    {
        museum_link.set_disabled(!museum_theme_enabled);
    }

    // Toggle Body Classes
    if let Some(body) = doc.body() {
        if museum_theme_enabled {
            let _ = body.class_list().add_1("theme-museum");
        } else {
            let _ = body.class_list().remove_1("theme-museum");
        }
    }

    // Update Meta Theme Color using active theme accent
    let active_colors = theme_get_active_colors();
    let theme_color = if museum_theme_enabled {
        "#C9A84C".to_string()
    } else {
        get_prop(&active_colors, "--accent-gold")
            .as_string()
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| "#FFC000".to_string())
    };
    if let Ok(Some(meta)) = doc.query_selector("meta[name=\"theme-color\"]") {
        let _ = meta.set_attribute("content", &theme_color);
    }

    // Handle Curtain Animation
    if let Some(curtain) = doc
        .get_element_by_id("curtain-overlay")
        .and_then(|el| el.dyn_into::<HtmlElement>().ok())
    {
        let already_played = get_prop(&win, "__curtainPlayed").is_truthy();
        if museum_theme_enabled && !already_played {
            set_prop(&win, "__curtainPlayed", &JsValue::from_bool(true));
            let _ = curtain.style().set_property("display", "flex");
            set_timeout_once(
                move || {
                    let _ = curtain.style().set_property("display", "none");
                },
                3500,
            );
        } else {
            let _ = curtain.style().set_property("display", "none");
        }
    }
}

// ============================================================================
// Pagination, Infinite Scroll & Squelettes
// ============================================================================

fn load_more_beers(
    container: &Element,
    is_append: bool,
    _is_discovery_mode: bool,
    show_create_prompt: bool,
) {
    let (batch, active_filters, has_more) = STATE.with(|s| {
        let mut st = s.borrow_mut();
        let page = st.pagination.page;
        let per_page = st.pagination.items_per_page;
        let start = (page.saturating_sub(1)) * per_page;
        let end = (page * per_page).min(st.filtered_beers.len());

        let slice = if start < st.filtered_beers.len() {
            st.filtered_beers[start..end].to_vec()
        } else {
            Vec::new()
        };

        if slice.len() < per_page {
            st.pagination.has_more = false;
        }

        (
            vec_to_js_array(&slice),
            st.active_filters.clone(),
            st.pagination.has_more,
        )
    });

    if is_append && batch.length() == 0 {
        return;
    }

    let on_create = Closure::wrap(Box::new(|| {
        let current_filter = STATE.with(|s| s.borrow().filter.clone());
        let on_add_submit = Closure::wrap(Box::new(|new_beer: JsValue| {
            storage_save_custom_beer(&new_beer);
            STATE.with(|s| {
                let mut st = s.borrow_mut();
                st.beers.insert(0, new_beer);
                st.filter.clear();
            });
            achievements_check(&state_beers_as_js_array());
            render_current_view();
            ui_close_modal(None);
            ui_show_toast(&i18n_t("toast_beer_added"));
        }) as Box<dyn FnMut(JsValue)>);

        ui_render_add_beer_form(
            on_add_submit.as_ref().unchecked_ref(),
            Some(&current_filter),
        );
        on_add_submit.forget();
    }) as Box<dyn FnMut()>);

    ui_render_beer_list(
        &batch,
        container,
        &active_filters,
        show_create_prompt,
        on_create.as_ref().unchecked_ref(),
        is_append,
    );
    on_create.forget();

    if has_more {
        setup_infinite_scroll(container);
    }
}

fn setup_infinite_scroll(container: &Element) {
    let doc = document();
    let sentinel = match doc.get_element_by_id("scroll-sentinel") {
        Some(el) => {
            let _ = container.append_child(&el);
            el
        }
        None => {
            let el = doc.create_element("div").unwrap();
            el.set_id("scroll-sentinel");
            if let Some(html_el) = el.dyn_ref::<HtmlElement>() {
                let _ = html_el.style().set_property("height", "20px");
                let _ = html_el.style().set_property("width", "100%");
                let _ = html_el.style().set_property("clear", "both");
            }
            let _ = container.append_child(&el);
            el
        }
    };

    let needs_observer = STATE.with(|s| s.borrow().observer.is_none());
    if needs_observer {
        let container_clone = container.clone();
        let cb = Closure::wrap(Box::new(move |entries: Array| {
            if let Ok(entry) = entries.get(0).dyn_into::<IntersectionObserverEntry>() {
                if !entry.is_intersecting() {
                    return;
                }
                let should_load = STATE.with(|s| {
                    let mut st = s.borrow_mut();
                    if st.pagination.has_more && !st.is_loading_more {
                        st.is_loading_more = true;
                        st.pagination.page += 1;
                        true
                    } else {
                        false
                    }
                });

                if should_load {
                    let is_discovery = pref_bool("discoveryMode", false);
                    let target_container = container_clone.clone();
                    set_timeout_once(
                        move || {
                            load_more_beers(&target_container, true, is_discovery, false);
                            STATE.with(|s| s.borrow_mut().is_loading_more = false);
                        },
                        100,
                    );
                }
            }
        }) as Box<dyn FnMut(Array)>);

        let opts_obj = Object::new();
        set_prop(&opts_obj, "rootMargin", &JsValue::from_str("200px"));
        let opts: IntersectionObserverInit = opts_obj.unchecked_into();

        if let Ok(observer) =
            IntersectionObserver::new_with_options(cb.as_ref().unchecked_ref(), &opts)
        {
            STATE.with(|s| s.borrow_mut().observer = Some(observer));
        }
        cb.forget();
    }

    STATE.with(|s| {
        if let Some(ref obs) = s.borrow().observer {
            obs.observe(&sentinel);
        }
    });
}

fn search_beers(beers: &[JsValue], query: &str) -> Vec<JsValue> {
    let res = utils_fuzzy_match_beers(&vec_to_js_array(beers), query);
    js_array_to_vec(&res)
}

fn show_skeleton_loading(container: &Element) {
    let is_list_view = STATE.with(|s| s.borrow().view_mode == "list");
    let grid_class = if is_list_view {
        "beer-grid view-list"
    } else {
        "beer-grid"
    };
    let count = if is_list_view { 8 } else { 6 };

    let mut skeletons = String::new();
    for _ in 0..count {
        skeletons.push_str(
            r#"
            <div class="skeleton-card">
                <div class="skeleton-img"></div>
                <div class="skeleton-title"></div>
                <div class="skeleton-subtitle"></div>
                <div class="skeleton-badges">
                    <div class="skeleton-badge"></div>
                    <div class="skeleton-badge"></div>
                </div>
            </div>"#,
        );
    }

    container.set_inner_html(&format!(
        r#"<div class="{}" style="padding: var(--spacing-md);">{}</div>"#,
        grid_class, skeletons
    ));
}

fn update_view_toggle_icon() {
    let Some(icon) = document().get_element_by_id("view-toggle-icon") else {
        return;
    };
    let is_list = STATE.with(|s| s.borrow().view_mode == "list");
    if is_list {
        icon.set_inner_html(
            r#"
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>"#,
        );
    } else {
        icon.set_inner_html(
            r#"
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>"#,
        );
    }
}

// ============================================================================
// Écouteurs d'événements UI
// ============================================================================

fn setup_event_listeners() {
    let win = window();
    let doc = document();

    let bind_globals = STATE.with(|s| {
        let mut st = s.borrow_mut();
        if !st.global_handlers_bound {
            st.global_handlers_bound = true;
            true
        } else {
            false
        }
    });

    // Navigation
    if let Ok(nav_items) = doc.query_selector_all(".nav-item") {
        for i in 0..nav_items.length() {
            if let Some(node) = nav_items.get(i) {
                if let Ok(btn) = node.dyn_into::<HtmlElement>() {
                    let on_nav_click = Closure::wrap(Box::new(|e: Event| {
                        let Some(target) = e
                            .current_target()
                            .and_then(|t| t.dyn_into::<HtmlElement>().ok())
                        else {
                            return;
                        };
                        let Some(target_view) = target.get_attribute("data-view") else {
                            return;
                        };

                        if target_view == "beerpedia" && is_median_env() {
                            let _ = window()
                                .open_with_url_and_target("https://beerpedia.beerdex.be", "_blank");
                        }

                        if let Ok(all_navs) = document().query_selector_all(".nav-item") {
                            for j in 0..all_navs.length() {
                                if let Some(n) = all_navs.get(j) {
                                    if let Ok(el) = n.dyn_into::<Element>() {
                                        let _ = el.class_list().remove_1("active");
                                    }
                                }
                            }
                        }
                        let _ = target.class_list().add_1("active");

                        let prev_view = STATE.with(|s| {
                            let mut st = s.borrow_mut();
                            let prev = st.view.clone();
                            st.view = target_view.clone();
                            prev
                        });

                        if prev_view != target_view {
                            let state_obj = Object::new();
                            set_prop(&state_obj, "view", &JsValue::from_str(&target_view));
                            if let Ok(h) = window().history() {
                                let _ = h.push_state_with_url(&state_obj, "", None);
                            }
                        }

                        window().scroll_to_with_x_and_y(0.0, 0.0);
                        if let Ok(ev) = CustomEvent::new("beerdex-close-search") {
                            let _ = window().dispatch_event(&ev);
                        }
                        render_current_view();
                    })
                        as Box<dyn FnMut(Event)>);
                    let _ = btn.add_event_listener_with_callback(
                        "click",
                        on_nav_click.as_ref().unchecked_ref(),
                    );
                    on_nav_click.forget();
                }
            }
        }
    }

    // Search & Scanner
    let search_toggle = doc.get_element_by_id("search-toggle");
    let search_bar = doc.get_element_by_id("search-bar");
    let search_input = doc
        .get_element_by_id("search-input")
        .and_then(|e| e.dyn_into::<HtmlInputElement>().ok());
    let search_close = doc.get_element_by_id("search-close");
    let btn_universal_scan = doc.get_element_by_id("btn-universal-scan");

    if let Some(btn_scan) = btn_universal_scan {
        let sb_clone = search_bar.clone();
        let on_scan = Closure::wrap(Box::new(move || {
            let ui_obj = get_prop(&window(), "UI");
            if ui_obj.is_truthy() && get_prop(&ui_obj, "openUniversalScanner").is_function() {
                if let Some(ref sb) = sb_clone {
                    if !sb.class_list().contains("hidden") {
                        let _ = sb.class_list().add_1("hidden");
                    }
                }
                let _ = call_method(&ui_obj, "openUniversalScanner", &Array::new());
            }
        }) as Box<dyn FnMut()>);
        let _ =
            btn_scan.add_event_listener_with_callback("click", on_scan.as_ref().unchecked_ref());
        on_scan.forget();
    }

    if let (Some(st), Some(sb), Some(si)) =
        (search_toggle, search_bar.clone(), search_input.clone())
    {
        let on_toggle = Closure::wrap(Box::new(move || {
            let is_opening = sb.class_list().contains("hidden");
            let _ = sb.class_list().toggle("hidden");
            if is_opening {
                let _ = si.focus();
                let obj = Object::new();
                set_prop(&obj, "isSearch", &JsValue::from_bool(true));
                if let Ok(h) = window().history() {
                    let _ = h.push_state_with_url(&obj, "", None);
                }
            }
        }) as Box<dyn FnMut()>);
        let _ = st.add_event_listener_with_callback("click", on_toggle.as_ref().unchecked_ref());
        on_toggle.forget();
    }

    if let (Some(sc), Some(sb), Some(si)) = (search_close, search_bar, search_input.clone()) {
        let on_close = Closure::wrap(Box::new(move || {
            let _ = sb.class_list().add_1("hidden");
            si.set_value("");
            STATE.with(|s| s.borrow_mut().filter.clear());
            render_current_view();
            if let Ok(h) = window().history() {
                if let Ok(hst) = h.state() {
                    if hst.is_truthy() && get_prop(&hst, "isSearch").is_truthy() {
                        let _ = h.back();
                    }
                }
            }
        }) as Box<dyn FnMut()>);
        let _ = sc.add_event_listener_with_callback("click", on_close.as_ref().unchecked_ref());
        on_close.forget();
    }

    if bind_globals {
        let on_close_search = Closure::wrap(Box::new(|| {
            let doc = document();
            if let Some(bar) = doc.get_element_by_id("search-bar") {
                let _ = bar.class_list().add_1("hidden");
            }
            if let Some(input) = doc
                .get_element_by_id("search-input")
                .and_then(|e| e.dyn_into::<HtmlInputElement>().ok())
            {
                input.set_value("");
            }
            STATE.with(|s| s.borrow_mut().filter.clear());
            render_current_view();
        }) as Box<dyn FnMut()>);
        let _ = win.add_event_listener_with_callback(
            "beerdex-close-search",
            on_close_search.as_ref().unchecked_ref(),
        );
        on_close_search.forget();
    }

    if let Some(si) = search_input {
        let on_input = Closure::wrap(Box::new(|e: Event| {
            let val = e
                .target()
                .and_then(|t| t.dyn_into::<HtmlInputElement>().ok())
                .map(|el| el.value())
                .unwrap_or_default();

            STATE.with(|s| {
                let mut st = s.borrow_mut();
                st.filter = val;
                if let Some(timer_id) = st.search_debounce_timer.take() {
                    window().clear_timeout_with_handle(timer_id);
                }
            });

            let timer_id = set_timeout_once(
                || {
                    let (view, filter) = STATE.with(|s| {
                        let st = s.borrow();
                        (st.view.clone(), st.filter.clone())
                    });
                    if view == "settings" {
                        let ui_ns = get_ui_namespace();
                        if get_prop(&ui_ns, "filterSettings").is_function() {
                            ui_filter_settings(&filter);
                        }
                    } else {
                        render_current_view();
                    }
                },
                200,
            );
            STATE.with(|s| s.borrow_mut().search_debounce_timer = Some(timer_id));
        }) as Box<dyn FnMut(Event)>);
        let _ = si.add_event_listener_with_callback("input", on_input.as_ref().unchecked_ref());
        on_input.forget();
    }

    // Filter Toggle
    if let Some(filter_toggle) = doc.get_element_by_id("filter-toggle") {
        let on_filter = Closure::wrap(Box::new(|| {
            let beers_arr = state_beers_as_js_array();
            let active_filters = STATE.with(|s| s.borrow().active_filters.clone());

            let on_apply = Closure::wrap(Box::new(|filters_val: JsValue| {
                let filters_obj: Object = filters_val
                    .dyn_into::<Object>()
                    .unwrap_or_else(|_| Object::new());
                let has_filters = Object::keys(&filters_obj).length() > 0;

                STATE.with(|s| s.borrow_mut().active_filters = filters_obj);

                if let Some(btn) = document()
                    .get_element_by_id("filter-toggle")
                    .and_then(|e| e.dyn_into::<HtmlElement>().ok())
                {
                    let color = if has_filters {
                        "var(--accent-gold)"
                    } else {
                        "inherit"
                    };
                    let _ = btn.style().set_property("color", color);
                }

                render_current_view();
                if has_filters {
                    ui_show_toast(&i18n_t("toast_preference_saved"));
                }
            }) as Box<dyn FnMut(JsValue)>);

            ui_render_filter_modal(
                &beers_arr,
                &active_filters,
                on_apply.as_ref().unchecked_ref(),
            );
            on_apply.forget();
        }) as Box<dyn FnMut()>);
        let _ = filter_toggle
            .add_event_listener_with_callback("click", on_filter.as_ref().unchecked_ref());
        on_filter.forget();
    }

    // View Toggle (Grid / List)
    if let Some(view_toggle) = doc.get_element_by_id("view-toggle") {
        let on_view_toggle = Closure::wrap(Box::new(|| {
            let new_mode = STATE.with(|s| {
                let mut st = s.borrow_mut();
                st.view_mode = if st.view_mode == "grid" {
                    "list".to_string()
                } else {
                    "grid".to_string()
                };
                st.view_mode.clone()
            });
            storage_save_preference("viewMode", &JsValue::from_str(&new_mode));
            update_view_toggle_icon();
            if call_method(&FEEDBACK, "impactLight", &Array::new()).is_err() {
                let _ = call_method(&FEEDBACK, "impactMedium", &Array::new());
            }
            render_current_view();
        }) as Box<dyn FnMut()>);
        let _ = view_toggle
            .add_event_listener_with_callback("click", on_view_toggle.as_ref().unchecked_ref());
        on_view_toggle.forget();
    }

    update_view_toggle_icon();

    // Add Manually Toggle (btn-add-header)
    if let Some(btn_add) = doc.get_element_by_id("btn-add-header") {
        let on_add = Closure::wrap(Box::new(|| {
            let on_submit = Closure::wrap(Box::new(|new_beer: JsValue| {
                storage_save_custom_beer(&new_beer);
                STATE.with(|s| s.borrow_mut().beers.insert(0, new_beer));
                achievements_check(&state_beers_as_js_array());
                render_current_view();
                ui_close_modal(None);
                let _ = call_method(&FEEDBACK, "playSuccess", &Array::new());
                let _ = call_method(&FEEDBACK, "impactMedium", &Array::new());
                ui_show_toast(&i18n_t("toast_beer_added"));
            }) as Box<dyn FnMut(JsValue)>);
            ui_render_add_beer_form(on_submit.as_ref().unchecked_ref(), None);
            on_submit.forget();
        }) as Box<dyn FnMut()>);
        let _ = btn_add.add_event_listener_with_callback("click", on_add.as_ref().unchecked_ref());
        on_add.forget();
    }

    // Delegated Events for Beer Cards
    if let Some(main_content) = doc.get_element_by_id("main-content") {
        let on_card_click = Closure::wrap(Box::new(|e: Event| {
            let Some(target) = e.target().and_then(|t| t.dyn_into::<Element>().ok()) else {
                return;
            };
            let Ok(Some(card)) = target.closest(".beer-card") else {
                return;
            };
            let Some(beer_id) = card.get_attribute("data-id") else {
                return;
            };

            let beer_opt = STATE.with(|s| {
                s.borrow()
                    .beers
                    .iter()
                    .find(|b| js_val_to_string(&get_prop(b, "id")) == beer_id)
                    .cloned()
            });

            if let Some(beer) = beer_opt {
                let id_val = get_prop(&beer, "id");
                let old_rating = storage_get_beer_rating(&id_val);
                let beer_clone = beer.clone();
                let card_clone = card.clone();

                let on_rate = Closure::wrap(Box::new(move |rating_data: JsValue| {
                    let b_id = get_prop(&beer_clone, "id");
                    storage_save_beer_rating(&b_id, &rating_data);
                    achievements_check(&state_beers_as_js_array());

                    let parse_count = |r: &JsValue| -> i32 {
                        if !r.is_truthy() {
                            return 0;
                        }
                        let c = get_prop(r, "count");
                        if let Some(n) = c.as_f64() {
                            n as i32
                        } else if let Some(s) = c.as_string() {
                            s.parse::<i32>().unwrap_or(0)
                        } else {
                            0
                        }
                    };

                    let old_count = parse_count(&old_rating);
                    let new_rating = storage_get_beer_rating(&b_id);
                    let new_count = parse_count(&new_rating);
                    utils_sync_bac_from_count_diff(&beer_clone, old_count, new_count);

                    if rating_data.is_truthy() {
                        let _ = card_clone.class_list().add_1("drunk");
                    }

                    ui_show_toast(&i18n_t("toast_rating_saved"));
                    widget_bridge_update_widget_data();
                }) as Box<dyn FnMut(JsValue)>);

                ui_render_beer_detail(&beer, on_rate.as_ref().unchecked_ref());
                on_rate.forget();
            }
        }) as Box<dyn FnMut(Event)>);
        let _ = main_content
            .add_event_listener_with_callback("click", on_card_click.as_ref().unchecked_ref());
        on_card_click.forget();
    }

    // Magical Search Bar: auto open on keypress (PC)
    if bind_globals {
        let on_keydown = Closure::wrap(Box::new(|e: KeyboardEvent| {
            let key = e.key();
            if key.chars().count() != 1 || e.ctrl_key() || e.alt_key() || e.meta_key() {
                return;
            }
            if let Some(target) = e.target().and_then(|t| t.dyn_into::<Element>().ok()) {
                let tag = target.tag_name();
                if tag == "INPUT" || tag == "TEXTAREA" {
                    return;
                }
            }
            let doc = document();
            if let Some(modal) = doc.get_element_by_id("modal-container") {
                if !modal.class_list().contains("hidden") {
                    return;
                }
            }
            if let Some(search_bar) = doc.get_element_by_id("search-bar") {
                if search_bar.class_list().contains("hidden") {
                    let _ = search_bar.class_list().remove_1("hidden");
                }
            }
            if let Some(search_input) = doc
                .get_element_by_id("search-input")
                .and_then(|el| el.dyn_into::<HtmlInputElement>().ok())
            {
                let _ = search_input.focus();
            }
        }) as Box<dyn FnMut(KeyboardEvent)>);
        let _ =
            win.add_event_listener_with_callback("keydown", on_keydown.as_ref().unchecked_ref());
        on_keydown.forget();
    }
}

// ============================================================================
// Filtrage et tri (`applyFilters`)
// ============================================================================

fn parse_js_f64(val: &JsValue) -> Option<f64> {
    if let Some(n) = val.as_f64() {
        if !n.is_nan() {
            return Some(n);
        }
    } else if let Some(s) = val.as_string() {
        if let Ok(n) = s.trim().parse::<f64>() {
            if !n.is_nan() {
                return Some(n);
            }
        }
    }
    None
}

fn parse_js_i32(val: &JsValue) -> Option<i32> {
    parse_js_f64(val).map(|n| n as i32)
}

fn rarity_rank(r: &str) -> i32 {
    match r {
        "base" => 0,
        "commun" => 1,
        "rare" => 2,
        "super_rare" => 3,
        "epique" => 4,
        "mythique" => 5,
        "legendaire" => 6,
        "ultra_legendaire" => 7,
        "fondateur" => 8,
        _ => 0,
    }
}

fn apply_filters(beers: &[JsValue], filters: &Object) -> Vec<JsValue> {
    if Object::keys(filters).length() == 0 {
        return beers.to_vec();
    }

    let mut result: Vec<JsValue> = beers.to_vec();

    let get_alc = |b: &JsValue| utils_parse_degree(&get_prop(b, "alcohol"));
    let get_vol = |b: &JsValue| utils_parse_volume_to_ml(&get_prop(b, "volume"));

    // Type (Category-aware)
    let filter_type = get_prop(filters, "type");
    if Array::is_array(&filter_type) {
        let arr: Array = filter_type.unchecked_into();
        let types: Vec<String> = (0..arr.length())
            .filter_map(|i| arr.get(i).as_string())
            .collect();
        if !types.is_empty() && !types.iter().any(|t| t == "All") {
            result.retain(|b| {
                let b_type_val = get_prop(b, "type");
                let b_type = js_val_to_string(&b_type_val);
                let cat = js_val_to_string(&utils_categorize_beer_type(&b_type_val));
                types.iter().any(|t| t == &cat || t == &b_type)
            });
        }
    } else if let Some(ft_str) = filter_type.as_string() {
        if !ft_str.is_empty() && ft_str != "All" {
            result.retain(|b| {
                let b_type_val = get_prop(b, "type");
                let b_type = js_val_to_string(&b_type_val);
                let cat = js_val_to_string(&utils_categorize_beer_type(&b_type_val));
                cat == ft_str || b_type == ft_str
            });
        }
    }

    // Brewery / Country / Region
    if let Some(brewery) = get_prop(filters, "brewery").as_string() {
        if !brewery.is_empty() && brewery != "All" {
            result.retain(|b| js_val_to_string(&get_prop(b, "brewery")) == brewery);
        }
    }
    if let Some(country) = get_prop(filters, "country").as_string() {
        if !country.is_empty() && country != "All" {
            result.retain(|b| js_val_to_string(&get_prop(b, "searchCountry")) == country);
        }
    }
    if let Some(region) = get_prop(filters, "region").as_string() {
        if !region.is_empty() && region != "All" {
            result.retain(|b| js_val_to_string(&get_prop(b, "searchRegion")) == region);
        }
    }

    // Alcohol
    if let Some(alc_mode) = get_prop(filters, "alcMode").as_string() {
        let max = parse_js_f64(&get_prop(filters, "alcMax"));
        let min = parse_js_f64(&get_prop(filters, "alcMin"));
        let exact = parse_js_f64(&get_prop(filters, "alcExact"));

        if alc_mode == "max" {
            if let Some(max_v) = max {
                result.retain(|b| get_alc(b) <= max_v);
            }
        } else if alc_mode == "range" {
            if let Some(min_v) = min {
                result.retain(|b| get_alc(b) >= min_v);
            }
            if let Some(max_v) = max {
                result.retain(|b| get_alc(b) <= max_v);
            }
        } else if alc_mode == "exact" {
            if let Some(ex_v) = exact {
                result.retain(|b| (get_alc(b) - ex_v).abs() < 0.1);
            }
        }
    }

    // Volume
    if let Some(vol_mode) = get_prop(filters, "volMode").as_string() {
        if !vol_mode.is_empty() && vol_mode != "any" {
            let min = parse_js_f64(&get_prop(filters, "volMin"));
            let max = parse_js_f64(&get_prop(filters, "volMax"));
            let exact = parse_js_f64(&get_prop(filters, "volExact"));

            if vol_mode == "range" {
                if let Some(min_v) = min {
                    result.retain(|b| get_vol(b) >= min_v);
                }
                if let Some(max_v) = max {
                    result.retain(|b| get_vol(b) <= max_v);
                }
            } else if vol_mode == "exact" {
                if let Some(ex_v) = exact {
                    result.retain(|b| (get_vol(b) - ex_v).abs() < 5.0);
                }
            }
        }
    }

    // Min Rating
    if let Some(min_r) = parse_js_i32(&get_prop(filters, "minRating")) {
        if min_r > 0 {
            result.retain(|b| {
                let r = storage_get_beer_rating(&get_prop(b, "id"));
                if !r.is_truthy() {
                    return false;
                }
                parse_js_f64(&get_prop(&r, "score")).unwrap_or(0.0) >= (min_r as f64)
            });
        }
    }

    // Production Volume
    if let Some(pv) = get_prop(filters, "production_volume").as_string() {
        if !pv.is_empty() && pv != "All" {
            result.retain(|b| js_val_to_string(&get_prop(b, "production_volume")) == pv);
        }
    }

    // Distribution
    if let Some(dist) = get_prop(filters, "distribution").as_string() {
        if !dist.is_empty() && dist != "All" {
            result.retain(|b| js_val_to_string(&get_prop(b, "distribution")) == dist);
        }
    }

    // Barrel Aged
    if get_prop(filters, "barrel_aged").is_truthy() {
        result.retain(|b| get_prop(b, "barrel_aged").as_bool() == Some(true));
    }

    // Community Rating
    let comm_r_val = get_prop(filters, "community_rating");
    if !comm_r_val.is_undefined() && comm_r_val.as_string().as_deref() != Some("") {
        if let Some(min_comm_r) = parse_js_f64(&comm_r_val) {
            result.retain(|b| {
                parse_js_f64(&get_prop(b, "community_rating")).unwrap_or(0.0) >= min_comm_r
            });
        }
    }

    // Ingredients
    if let Some(ing) = get_prop(filters, "ingredients").as_string() {
        if !ing.is_empty() {
            let kw = ing.to_lowercase();
            result.retain(|b| {
                js_val_to_string(&get_prop(b, "ingredients"))
                    .to_lowercase()
                    .contains(&kw)
            });
        }
    }

    // Rarity
    let rarity_val = get_prop(filters, "rarity");
    if Array::is_array(&rarity_val) {
        let arr: Array = rarity_val.unchecked_into();
        let rarities: Vec<String> = (0..arr.length())
            .filter_map(|i| arr.get(i).as_string())
            .collect();
        if !rarities.is_empty() {
            result.retain(|b| {
                let r = get_prop(b, "rarity")
                    .as_string()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "base".to_string());
                rarities.contains(&r)
            });
        }
    }

    // Custom & Favorites
    if get_prop(filters, "onlyCustom").is_truthy() {
        result.retain(|b| js_val_to_string(&get_prop(b, "id")).starts_with("CUSTOM_"));
    }
    if get_prop(filters, "onlyFavorites").is_truthy() {
        result.retain(|b| storage_is_favorite(&get_prop(b, "id")));
    }

    // Sorting
    let ignore_favorites = get_prop(filters, "ignoreFavorites").is_truthy();
    let sort_by = get_prop(filters, "sortBy").as_string().unwrap_or_default();
    let sort_order = get_prop(filters, "sortOrder").as_string();

    let is_desc = match sort_order.as_deref() {
        Some("desc") => true,
        Some(_) => false,
        None => matches!(
            sort_by.as_str(),
            "brewbrother" | "my_rating" | "community_rating" | "rarity"
        ),
    };

    result.sort_by(|a, b| {
        if !ignore_favorites {
            let fav_a = if storage_is_favorite(&get_prop(a, "id")) {
                1
            } else {
                0
            };
            let fav_b = if storage_is_favorite(&get_prop(b, "id")) {
                1
            } else {
                0
            };
            if fav_a != fav_b {
                return fav_b.cmp(&fav_a);
            }
        }

        let ord = match sort_by.as_str() {
            "brewery" => {
                let va = js_val_to_string(&get_prop(a, "brewery")).to_lowercase();
                let vb = js_val_to_string(&get_prop(b, "brewery")).to_lowercase();
                va.cmp(&vb)
            }
            "alcohol" => get_alc(a)
                .partial_cmp(&get_alc(b))
                .unwrap_or(Ordering::Equal),
            "volume" => get_vol(a)
                .partial_cmp(&get_vol(b))
                .unwrap_or(Ordering::Equal),
            "rarity" => {
                let ra = get_prop(a, "rarity")
                    .as_string()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "base".to_string());
                let rb = get_prop(b, "rarity")
                    .as_string()
                    .filter(|s| !s.is_empty())
                    .unwrap_or_else(|| "base".to_string());
                rarity_rank(&ra).cmp(&rarity_rank(&rb))
            }
            "community_rating" => {
                let va = parse_js_f64(&get_prop(a, "community_rating")).unwrap_or(0.0);
                let vb = parse_js_f64(&get_prop(b, "community_rating")).unwrap_or(0.0);
                va.partial_cmp(&vb).unwrap_or(Ordering::Equal)
            }
            "my_rating" => {
                let get_score = |x: &JsValue| {
                    let r = storage_get_beer_rating(&get_prop(x, "id"));
                    if r.is_truthy() {
                        parse_js_f64(&get_prop(&r, "score")).unwrap_or(0.0)
                    } else {
                        0.0
                    }
                };
                get_score(a)
                    .partial_cmp(&get_score(b))
                    .unwrap_or(Ordering::Equal)
            }
            "brewbrother" => {
                let get_bb = |x: &JsValue| {
                    let bb = get_prop(x, "_brewBrotherMatch");
                    if bb.is_truthy() {
                        parse_js_f64(&get_prop(&bb, "total")).unwrap_or(0.0)
                    } else {
                        parse_js_f64(&get_prop(x, "matchPercentage")).unwrap_or(0.0)
                    }
                };
                get_bb(a).partial_cmp(&get_bb(b)).unwrap_or(Ordering::Equal)
            }
            _ => {
                let va = js_val_to_string(&get_prop(a, "title")).to_lowercase();
                let vb = js_val_to_string(&get_prop(b, "title")).to_lowercase();
                va.cmp(&vb)
            }
        };

        if is_desc {
            ord.reverse()
        } else {
            ord
        }
    });

    result
}

// ============================================================================
// Barre de chips des filtres actifs
// ============================================================================

struct FilterChip {
    label: String,
    key: String,
    value: Option<String>,
}

fn render_active_filters_bar<F1, F2>(
    container: &Element,
    filters: &Object,
    on_remove: F1,
    on_clear_all: F2,
) where
    F1: Fn(&str, Option<&str>) + 'static,
    F2: Fn() + 'static,
{
    if Object::keys(filters).length() == 0 {
        return;
    }

    let mut chips: Vec<FilterChip> = Vec::new();

    // Type chips
    let f_type = get_prop(filters, "type");
    if Array::is_array(&f_type) {
        let arr: Array = f_type.unchecked_into();
        for i in 0..arr.length() {
            if let Some(t) = arr.get(i).as_string() {
                chips.push(FilterChip {
                    label: format!("Style: {}", t),
                    key: "type".to_string(),
                    value: Some(t),
                });
            }
        }
    }

    // Rarity chips
    let f_rarity = get_prop(filters, "rarity");
    if Array::is_array(&f_rarity) {
        let arr: Array = f_rarity.unchecked_into();
        for i in 0..arr.length() {
            if let Some(r) = arr.get(i).as_string() {
                let translated = i18n_t_or(&format!("rarity_{}", r), &r);
                chips.push(FilterChip {
                    label: format!("Rareté: {}", translated),
                    key: "rarity".to_string(),
                    value: Some(r),
                });
            }
        }
    }

    if let Some(brewery) = get_prop(filters, "brewery").as_string() {
        if !brewery.is_empty() && brewery != "All" {
            chips.push(FilterChip {
                label: format!("🏭 {}", brewery),
                key: "brewery".to_string(),
                value: None,
            });
        }
    }

    if let Some(country) = get_prop(filters, "country").as_string() {
        if !country.is_empty() && country != "All" {
            chips.push(FilterChip {
                label: format!("🌍 {}", country),
                key: "country".to_string(),
                value: None,
            });
        }
    }

    if let Some(region) = get_prop(filters, "region").as_string() {
        if !region.is_empty() && region != "All" {
            chips.push(FilterChip {
                label: format!("📍 {}", region),
                key: "region".to_string(),
                value: None,
            });
        }
    }

    if get_prop(filters, "onlyFavorites").is_truthy() {
        chips.push(FilterChip {
            label: "⭐ Favoris".to_string(),
            key: "onlyFavorites".to_string(),
            value: None,
        });
    }

    if get_prop(filters, "onlyCustom").is_truthy() {
        chips.push(FilterChip {
            label: "✨ Mes créations".to_string(),
            key: "onlyCustom".to_string(),
            value: None,
        });
    }

    if let Some(min_r) = parse_js_i32(&get_prop(filters, "minRating")) {
        if min_r > 0 {
            chips.push(FilterChip {
                label: format!("Note: ≥{}/20", min_r),
                key: "minRating".to_string(),
                value: None,
            });
        }
    }

    let comm_r_val = get_prop(filters, "community_rating");
    if let Some(min_comm) = parse_js_f64(&comm_r_val) {
        if min_comm > 0.0 {
            chips.push(FilterChip {
                label: format!("Note comm: ≥{}/5", js_val_to_string(&comm_r_val)),
                key: "community_rating".to_string(),
                value: None,
            });
        }
    }

    // Alcohol
    if let Some(alc_mode) = get_prop(filters, "alcMode").as_string() {
        let alc_max_val = get_prop(filters, "alcMax");
        let alc_min_val = get_prop(filters, "alcMin");
        let alc_exact_val = get_prop(filters, "alcExact");

        if alc_mode == "max"
            && parse_js_f64(&alc_max_val)
                .map(|v| v < 15.0)
                .unwrap_or(false)
        {
            chips.push(FilterChip {
                label: format!("Alcool: ≤{}%", js_val_to_string(&alc_max_val)),
                key: "alcMode".to_string(),
                value: None,
            });
        } else if alc_mode == "range" && (alc_min_val.is_truthy() || alc_max_val.is_truthy()) {
            let min_s = if alc_min_val.is_truthy() {
                js_val_to_string(&alc_min_val)
            } else {
                "0".to_string()
            };
            let max_s = if alc_max_val.is_truthy() {
                js_val_to_string(&alc_max_val)
            } else {
                "15".to_string()
            };
            chips.push(FilterChip {
                label: format!("Alcool: {}% - {}%", min_s, max_s),
                key: "alcMode".to_string(),
                value: None,
            });
        } else if alc_mode == "exact" && alc_exact_val.is_truthy() {
            chips.push(FilterChip {
                label: format!("Alcool: {}%", js_val_to_string(&alc_exact_val)),
                key: "alcMode".to_string(),
                value: None,
            });
        }
    }

    // Volume
    if let Some(vol_mode) = get_prop(filters, "volMode").as_string() {
        let vol_min_val = get_prop(filters, "volMin");
        let vol_max_val = get_prop(filters, "volMax");
        let vol_exact_val = get_prop(filters, "volExact");

        if vol_mode == "range" && (vol_min_val.is_truthy() || vol_max_val.is_truthy()) {
            let min_s = if vol_min_val.is_truthy() {
                js_val_to_string(&vol_min_val)
            } else {
                "0".to_string()
            };
            let max_s = if vol_max_val.is_truthy() {
                js_val_to_string(&vol_max_val)
            } else {
                "1000".to_string()
            };
            chips.push(FilterChip {
                label: format!("Vol: {} - {} ml", min_s, max_s),
                key: "volMode".to_string(),
                value: None,
            });
        } else if vol_mode == "exact" && vol_exact_val.is_truthy() {
            chips.push(FilterChip {
                label: format!("Vol: {} ml", js_val_to_string(&vol_exact_val)),
                key: "volMode".to_string(),
                value: None,
            });
        }
    }

    if get_prop(filters, "barrel_aged").is_truthy() {
        chips.push(FilterChip {
            label: "🪵 Vieillie en fût".to_string(),
            key: "barrel_aged".to_string(),
            value: None,
        });
    }

    if let Some(ing) = get_prop(filters, "ingredients").as_string() {
        if !ing.is_empty() {
            chips.push(FilterChip {
                label: format!("Ingrédient: {}", ing),
                key: "ingredients".to_string(),
                value: None,
            });
        }
    }

    if chips.is_empty() {
        return;
    }

    let doc = document();
    let bar = doc.create_element("div").unwrap();
    bar.set_class_name("active-filters-bar");
    let _ = bar.set_attribute(
        "style",
        "display:flex; flex-wrap:wrap; align-items:center; gap:6px; margin:0 0 15px 0; padding:8px 12px; background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:10px; font-size:0.8rem;",
    );

    let mut html = format!(
        r#"<span style="color:#888; font-weight:bold; margin-right:4px;">{}:</span>"#,
        i18n_t_or("filter_active_title", "Filtres")
    );
    for (idx, c) in chips.iter().enumerate() {
        html.push_str(&format!(
            r#"<span class="filter-chip" data-idx="{}" style="display:inline-flex; align-items:center; gap:4px; background:rgba(255,192,0,0.15); border:1px solid rgba(255,192,0,0.4); color:var(--accent-gold); padding:2px 8px; border-radius:12px; cursor:pointer;">{} <span style="font-weight:bold; margin-left:2px;">✕</span></span>"#,
            idx, c.label
        ));
    }
    html.push_str(&format!(
        r#"<button id="btn-clear-all-chips" style="background:none; border:none; color:#888; margin-left:auto; cursor:pointer; font-size:0.75rem; text-decoration:underline;">{}</button>"#,
        i18n_t_or("filter_clear_all", "Tout effacer")
    ));

    bar.set_inner_html(&html);
    let _ = container.append_child(&bar);

    let on_remove_rc = std::rc::Rc::new(on_remove);
    if let Ok(chip_els) = bar.query_selector_all(".filter-chip") {
        for i in 0..chip_els.length() {
            if let Some(el) = chip_els
                .get(i)
                .and_then(|n| n.dyn_into::<HtmlElement>().ok())
            {
                let idx = el
                    .get_attribute("data-idx")
                    .and_then(|s| s.parse::<usize>().ok());
                if let Some(chip) = idx.and_then(|k| chips.get(k)) {
                    let key = chip.key.clone();
                    let val = chip.value.clone();
                    let cb_ref = on_remove_rc.clone();
                    let onclick = Closure::wrap(Box::new(move || {
                        cb_ref(&key, val.as_deref());
                    }) as Box<dyn FnMut()>);
                    el.set_onclick(Some(onclick.as_ref().unchecked_ref()));
                    onclick.forget();
                }
            }
        }
    }

    if let Ok(Some(btn_clear)) = bar.query_selector("#btn-clear-all-chips") {
        if let Ok(btn_html) = btn_clear.dyn_into::<HtmlElement>() {
            let onclick = Closure::wrap(Box::new(move || on_clear_all()) as Box<dyn FnMut()>);
            btn_html.set_onclick(Some(onclick.as_ref().unchecked_ref()));
            onclick.forget();
        }
    }
}

// ============================================================================
// Widget BAC (HTML partagé pour la vue Home)
// ============================================================================

fn build_bac_widget_html() -> String {
    let bac_status = bac_get_status();
    let color = js_val_to_string(&get_prop(&bac_status, "color"));
    let title = js_val_to_string(&get_prop(&bac_status, "title"));
    let current = bac_get_current();
    let bac_value = format!("{:.2}", current);
    let breath_value = format!("{:.2}", current * 0.44);

    format!(
        r#"
        <div class="bac-widget-home" style="background: linear-gradient(135deg, var(--bg-card), var(--bg-card-hover)); border-left: 5px solid {color}; padding: 15px; border-radius: 12px; margin: 0 0 20px 0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 8px 16px rgba(0,0,0,0.5); border: 1px solid var(--border-color); border-left: 5px solid {color};">
            <div>
                <div style="font-size: 0.7rem; color: #aaa; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px; font-weight: bold;">{spec_title}</div>
                <div style="font-size: 1.1rem; font-weight: 700; color: {color}; text-shadow: 0 0 10px {color}44;">
                    {title} <span style="font-size: 0.9rem; color: #fff; font-weight: normal; margin-left: 5px;">({bac_value} g/l)</span>
                </div>
                <div style="font-size: 0.75rem; color: #888; margin-top: 5px;">
                    {air_expired}: <span style="color: {color}; font-weight: bold;">{breath_value}</span> mg/l
                </div>
            </div>
            <div style="background: {color}22; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid {color}44;">
                 <span style="font-size: 1.2rem;">🩸</span>
            </div>
        </div>
        "#,
        color = color,
        spec_title = i18n_t("bac_speculative_title"),
        title = title,
        bac_value = bac_value,
        air_expired = i18n_t("bac_air_expired"),
        breath_value = breath_value
    )
}

// ============================================================================
// Rendu principal (`renderCurrentView`)
// ============================================================================

fn render_current_view() {
    let win = window();
    let doc = document();

    let Some(main_content) = doc.get_element_by_id("main-content") else {
        return;
    };
    let app_header = doc
        .query_selector(".app-header")
        .ok()
        .flatten()
        .and_then(|e| e.dyn_into::<HtmlElement>().ok());

    let current_view = STATE.with(|s| s.borrow().view.clone());

    let track_obj = Object::new();
    set_prop(&track_obj, "view", &JsValue::from_str(&current_view));
    let _ = call_method(
        &ANALYTICS,
        "track",
        &Array::of2(&JsValue::from_str("view_change"), &track_obj),
    );

    win.scroll_to_with_x_and_y(0.0, 0.0);

    if let Some(mc_html) = main_content.dyn_ref::<HtmlElement>() {
        let style = mc_html.style();
        let _ = style.set_property("padding", "");
        let _ = style.set_property("margin", "");
        let _ = style.set_property("padding-bottom", "");
        let _ = style.set_property("overscroll-behavior", "");
    }

    if let Some(ref header) = app_header {
        let _ = header.style().set_property("display", "");
    }

    if let Some(body) = doc.body() {
        let _ = body.style().set_property("overscroll-behavior", "");
    }

    STATE.with(|s| {
        if let Some(obs) = s.borrow_mut().observer.take() {
            obs.disconnect();
        }
    });

    match current_view.as_str() {
        "home" => {
            let is_discovery = pref_bool("discoveryMode", false);
            let active_filters = STATE.with(|s| s.borrow().active_filters.clone());
            let rec = get_prop(&win, "Recommendation");

            // 1. Check BrewBrother Recommendations Mode
            if get_prop(&active_filters, "useBrewBrother").is_truthy() && rec.is_truthy() {
                main_content.set_inner_html("");
                show_skeleton_loading(&main_content);

                let opts = Object::new();
                set_prop(&opts, "mode", &get_prop(&active_filters, "recMode"));
                set_prop(&opts, "country", &get_prop(&active_filters, "recCountry"));
                set_prop(&opts, "region", &get_prop(&active_filters, "recRegion"));

                let manual_prefs = Object::new();
                set_prop(
                    &manual_prefs,
                    "types",
                    &get_prop(&active_filters, "recTypes"),
                );
                set_prop(
                    &manual_prefs,
                    "flavors",
                    &get_prop(&active_filters, "recFlavors"),
                );
                let ideal_abv = parse_js_f64(&get_prop(&active_filters, "recAbv"))
                    .map(JsValue::from_f64)
                    .unwrap_or(JsValue::from_f64(f64::NAN));
                set_prop(&manual_prefs, "idealAbv", &ideal_abv);
                set_prop(&opts, "manualPrefs", &manual_prefs);

                let beers_arr = state_beers_as_js_array();
                if let Ok(p) =
                    call_method(&rec, "getRecommendedBeers", &Array::of2(&beers_arr, &opts))
                {
                    if let Ok(promise) = p.dyn_into::<Promise>() {
                        let mc_clone = main_content.clone();
                        spawn_local(async move {
                            match JsFuture::from(promise).await {
                                Ok(results_val) => {
                                    let mut final_beers = if Array::is_array(&results_val) {
                                        js_array_to_vec(&results_val.unchecked_into::<Array>())
                                    } else {
                                        Vec::new()
                                    };

                                    let (filter_str, cur_filters) = STATE.with(|s| {
                                        let st = s.borrow();
                                        (st.filter.clone(), st.active_filters.clone())
                                    });

                                    if !filter_str.is_empty() {
                                        final_beers = search_beers(&final_beers, &filter_str);
                                    }

                                    let sub_filters = Object::assign(&Object::new(), &cur_filters);
                                    set_prop(
                                        &sub_filters,
                                        "useBrewBrother",
                                        &JsValue::from_bool(false),
                                    );
                                    final_beers = apply_filters(&final_beers, &sub_filters);

                                    let count = final_beers.len();
                                    STATE.with(|s| {
                                        let mut st = s.borrow_mut();
                                        st.filtered_beers = final_beers;
                                        st.pagination.page = 1;
                                        st.pagination.has_more = false;
                                    });

                                    if let Ok(Some(bus_tab)) =
                                        document().query_selector(".nav-item[data-view=\"drunk\"]")
                                    {
                                        if let Some(el) = bus_tab.dyn_ref::<HtmlElement>() {
                                            let _ = el.style().set_property(
                                                "display",
                                                if is_discovery { "none" } else { "flex" },
                                            );
                                        }
                                    }

                                    mc_clone.set_inner_html("");

                                    let banner = document().create_element("div").unwrap();
                                    banner.set_class_name("brewbrother-active-banner");
                                    let _ = banner.set_attribute(
                                        "style",
                                        "background:linear-gradient(135deg, rgba(255,192,0,0.15), rgba(30,30,30,0.95)); border:1px solid var(--accent-gold); padding:12px 16px; border-radius:12px; margin-bottom:15px; display:flex; justify-content:space-between; align-items:center; box-shadow:0 4px 15px rgba(0,0,0,0.3);",
                                    );
                                    banner.set_inner_html(&format!(
                                        r#"
                                        <div style="display:flex; align-items:center; gap:10px;">
                                            <span style="font-size:1.6rem;">🤖</span>
                                            <div>
                                                <div style="font-weight:bold; color:var(--accent-gold); font-size:0.95rem;">{}</div>
                                                <div style="font-size:0.8rem; color:#aaa;">{} bières recommandées selon vos goûts</div>
                                            </div>
                                        </div>
                                        <button id="btn-disable-bb-banner" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:6px 12px; border-radius:8px; font-size:0.8rem; cursor:pointer; font-weight:bold;">
                                            ✕ {}
                                        </button>
                                        "#,
                                        i18n_t_or("brewbrother_banner_title", "Recommandations BrewBrother"),
                                        count,
                                        i18n_t_or("filter_clear_all", "Tout afficher")
                                    ));
                                    let _ = mc_clone.append_child(&banner);

                                    if let Ok(Some(btn)) =
                                        banner.query_selector("#btn-disable-bb-banner")
                                    {
                                        if let Ok(btn_el) = btn.dyn_into::<HtmlElement>() {
                                            let onclick = Closure::wrap(Box::new(|| {
                                                STATE.with(|s| {
                                                    set_prop(
                                                        &s.borrow().active_filters,
                                                        "useBrewBrother",
                                                        &JsValue::from_bool(false),
                                                    );
                                                });
                                                render_current_view();
                                            })
                                                as Box<dyn FnMut()>);
                                            btn_el.set_onclick(Some(
                                                onclick.as_ref().unchecked_ref(),
                                            ));
                                            onclick.forget();
                                        }
                                    }

                                    load_more_beers(&mc_clone, false, is_discovery, false);
                                }
                                Err(err) => {
                                    console::error_2(
                                        &JsValue::from_str("BrewBrother recommendation error:"),
                                        &err,
                                    );
                                    mc_clone.set_inner_html("");
                                    STATE.with(|s| {
                                        let mut st = s.borrow_mut();
                                        st.filtered_beers = st.beers.clone();
                                    });
                                    load_more_beers(&mc_clone, false, is_discovery, false);
                                }
                            }
                        });
                    }
                }
                return;
            }

            // 1.5. Async Pre-scoring if sorting by BrewBrother but not in strict mode
            if get_prop(&active_filters, "sortBy").as_string().as_deref() == Some("brewbrother")
                && rec.is_truthy()
                && !get_prop(&active_filters, "useBrewBrother").is_truthy()
            {
                main_content.set_inner_html("");
                show_skeleton_loading(&main_content);

                let opts = Object::new();
                set_prop(&opts, "noLimit", &JsValue::from_bool(true));
                let beers_arr = state_beers_as_js_array();

                if let Ok(p) =
                    call_method(&rec, "getRecommendedBeers", &Array::of2(&beers_arr, &opts))
                {
                    if let Ok(promise) = p.dyn_into::<Promise>() {
                        let mc_clone = main_content.clone();
                        spawn_local(async move {
                            match JsFuture::from(promise).await {
                                Ok(scored_val) => {
                                    let scored = if Array::is_array(&scored_val) {
                                        js_array_to_vec(&scored_val.unchecked_into::<Array>())
                                    } else {
                                        Vec::new()
                                    };

                                    let (filter_str, cur_filters) = STATE.with(|s| {
                                        let st = s.borrow();
                                        (st.filter.clone(), st.active_filters.clone())
                                    });

                                    let mut filtered = search_beers(&scored, &filter_str);
                                    if is_discovery && filter_str.is_empty() {
                                        let consumed = storage_get_all_consumed_beer_id_set();
                                        filtered.retain(|b| consumed.has(&get_prop(b, "id")));
                                    }
                                    filtered = apply_filters(&filtered, &cur_filters);

                                    STATE.with(|s| {
                                        let mut st = s.borrow_mut();
                                        st.filtered_beers = filtered;
                                        st.pagination.page = 1;
                                        st.pagination.has_more = true;
                                    });

                                    if let Ok(Some(bus_tab)) =
                                        document().query_selector(".nav-item[data-view=\"drunk\"]")
                                    {
                                        if let Some(el) = bus_tab.dyn_ref::<HtmlElement>() {
                                            let _ = el.style().set_property(
                                                "display",
                                                if is_discovery { "none" } else { "flex" },
                                            );
                                        }
                                    }

                                    mc_clone.set_inner_html("");
                                    load_more_beers(
                                        &mc_clone,
                                        false,
                                        is_discovery,
                                        is_discovery && !filter_str.is_empty(),
                                    );

                                    if pref_bool("bac_enabled", true)
                                        && pref_bool("bac_show_home", true)
                                    {
                                        let _ = mc_clone.insert_adjacent_html(
                                            "afterbegin",
                                            &build_bac_widget_html(),
                                        );
                                    }

                                    widget_bridge_update_widget_data();
                                }
                                Err(err) => {
                                    console::error_2(
                                        &JsValue::from_str("BrewBrother scoring error:"),
                                        &err,
                                    );
                                    mc_clone.set_inner_html("");
                                    STATE.with(|s| {
                                        let mut st = s.borrow_mut();
                                        st.filtered_beers = st.beers.clone();
                                    });
                                    load_more_beers(&mc_clone, false, is_discovery, false);
                                }
                            }
                        });
                    }
                }
                return;
            }

            // 2. Search + Discovery + Apply Filters
            let (beers_snapshot, filter_str) = STATE.with(|s| {
                let st = s.borrow();
                (st.beers.clone(), st.filter.clone())
            });

            let mut filtered = search_beers(&beers_snapshot, &filter_str);

            if is_discovery && filter_str.is_empty() {
                let consumed_ids = storage_get_all_consumed_beer_id_set();
                filtered = beers_snapshot
                    .iter()
                    .filter(|b| consumed_ids.has(&get_prop(b, "id")))
                    .cloned()
                    .collect();
            }

            filtered = apply_filters(&filtered, &active_filters);

            STATE.with(|s| {
                let mut st = s.borrow_mut();
                st.filtered_beers = filtered;
                st.pagination.page = 1;
                st.pagination.has_more = true;
            });

            if let Ok(Some(bus_tab)) = doc.query_selector(".nav-item[data-view=\"drunk\"]") {
                if let Some(el) = bus_tab.dyn_ref::<HtmlElement>() {
                    let _ = el
                        .style()
                        .set_property("display", if is_discovery { "none" } else { "flex" });
                }
            }

            // Render Active Filter Chips Summary
            render_active_filters_bar(
                &main_content,
                &active_filters,
                |key, value| {
                    STATE.with(|s| {
                        let filters = &s.borrow().active_filters;
                        if key == "type" || key == "rarity" {
                            let arr_val = get_prop(filters, key);
                            let mut kept = Vec::new();
                            if Array::is_array(&arr_val) {
                                let arr: Array = arr_val.unchecked_into();
                                for i in 0..arr.length() {
                                    let item = arr.get(i);
                                    if item.as_string().as_deref() != value {
                                        kept.push(item);
                                    }
                                }
                            }
                            if kept.is_empty() {
                                delete_prop(filters, key);
                            } else {
                                set_prop(filters, key, &vec_to_js_array(&kept));
                            }
                        } else {
                            delete_prop(filters, key);
                        }
                    });
                    render_current_view();
                },
                || {
                    STATE.with(|s| s.borrow_mut().active_filters = Object::new());
                    render_current_view();
                },
            );

            // Render first batch
            load_more_beers(
                &main_content,
                false,
                is_discovery,
                is_discovery && !filter_str.is_empty(),
            );

            // BAC Widget on Home page
            if pref_bool("bac_enabled", true) {
                if pref_bool("bac_show_home", true) {
                    let _ =
                        main_content.insert_adjacent_html("afterbegin", &build_bac_widget_html());
                }
                widget_bridge_update_widget_data();
            }

            if is_discovery && pref_bool("feat_reminders_enabled", true) {
                let (beers_arr, prompts) = STATE.with(|s| {
                    let st = s.borrow();
                    (vec_to_js_array(&st.beers), st.migration_prompts.clone())
                });
                ui_render_unrated_banner(&beers_arr, &main_content, &prompts);
            }
        }
        "drunk" => {
            let consumed_ids = storage_get_all_consumed_beer_id_set();
            let (beers_snapshot, active_filters) = STATE.with(|s| {
                let st = s.borrow();
                (st.beers.clone(), st.active_filters.clone())
            });

            let mut drunk_beers: Vec<JsValue> = beers_snapshot
                .into_iter()
                .filter(|b| consumed_ids.has(&get_prop(b, "id")))
                .collect();

            drunk_beers = apply_filters(&drunk_beers, &active_filters);

            STATE.with(|s| {
                let mut st = s.borrow_mut();
                st.filtered_beers = drunk_beers;
                st.pagination.page = 1;
                st.pagination.has_more = true;
            });

            load_more_beers(&main_content, false, false, false);

            if pref_bool("feat_reminders_enabled", true) {
                let (beers_arr, prompts) = STATE.with(|s| {
                    let st = s.borrow();
                    (vec_to_js_array(&st.beers), st.migration_prompts.clone())
                });
                ui_render_unrated_banner(&beers_arr, &main_content, &prompts);
            }
        }
        "stats" => {
            let is_discovery = pref_bool("discoveryMode", false);
            ui_render_stats(
                &state_beers_as_js_array(),
                &storage_get_all_user_data(),
                &main_content,
                is_discovery,
            );
        }
        "beerpedia" => {
            if let Some(ref header) = app_header {
                let _ = header.style().set_property("display", "none");
            }
            if let Some(mc_html) = main_content.dyn_ref::<HtmlElement>() {
                let _ = mc_html.style().set_property("overscroll-behavior", "none");
            }
            if let Some(body) = doc.body() {
                let _ = body.style().set_property("overscroll-behavior", "none");
            }

            if is_median_env() {
                if let Some(mc_html) = main_content.dyn_ref::<HtmlElement>() {
                    let _ = mc_html.style().set_property(
                        "padding",
                        "calc(env(safe-area-inset-top) + var(--spacing-md)) var(--spacing-md) env(safe-area-inset-bottom) var(--spacing-md)",
                    );
                }
                main_content.set_inner_html(&format!(
                    r#"
                    <div style="
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        height: calc(100dvh - var(--nav-height) - env(safe-area-inset-top) - env(safe-area-inset-bottom));
                        gap: 20px;
                        text-align: center;
                        padding: 20px;
                    ">
                        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--accent-gold)" stroke-width="1.5">
                            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                        </svg>
                        <h2 style="color: var(--accent-gold); font-family: 'Russo One', sans-serif;">Beerpedia</h2>
                        <p style="color: var(--text-secondary); max-width: 280px;">
                            {}
                        </p>
                        <button onclick="window.open('https://beerpedia.beerdex.be', '_blank')" class="btn-primary" style="
                            width: auto;
                            padding: 14px 30px;
                            display: flex;
                            align-items: center;
                            gap: 10px;
                            font-size: 1rem;
                        ">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                <polyline points="15 3 21 3 21 9"></polyline>
                                <line x1="10" y1="14" x2="21" y2="3"></line>
                            </svg>
                            {}
                        </button>
                    </div>
                    "#,
                    i18n_t("beerpedia_desc"),
                    i18n_t("beerpedia_btn_open")
                ));
            } else {
                if let Some(mc_html) = main_content.dyn_ref::<HtmlElement>() {
                    let style = mc_html.style();
                    let _ = style.set_property(
                        "padding",
                        "env(safe-area-inset-top) 0 env(safe-area-inset-bottom) 0",
                    );
                    let _ = style.set_property("margin", "0");
                    let _ = style.set_property("padding-bottom", "0");
                }
                main_content.set_inner_html(&format!(
                    r#"
                    <div id="beerpedia-loader" style="
                        position: absolute;
                        top: 50%;
                        left: 50%;
                        transform: translate(-50%, -50%);
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        gap: 15px;
                        z-index: 5;
                    ">
                        <div class="spinner" style="width: 50px; height: 50px;"></div>
                        <span style="color: var(--text-secondary); font-size: 0.9rem;">{}</span>
                    </div>
                    <iframe 
                        id="beerpedia-frame"
                        src="https://beerpedia.beerdex.be?lang={}" 
                        style="
                            width: 100%;
                            height: calc(100dvh - var(--nav-height) - env(safe-area-inset-top) - env(safe-area-inset-bottom));
                            border: none;
                            display: block;
                            background: #0d0d0d;
                            position: relative;
                            z-index: 10;
                            opacity: 0;
                            transition: opacity 0.3s ease;
                        "
                        title="Beerpedia - L'encyclopédie de la bière"
                        allow="fullscreen"
                        onload="this.style.opacity='1'; document.getElementById('beerpedia-loader')?.remove();"
                    ></iframe>
                    "#,
                    i18n_t("beerpedia_loading"),
                    i18n_current_lang()
                ));
            }
        }
        "settings" => {
            let is_discovery = pref_bool("discoveryMode", false);
            let on_change = Closure::wrap(Box::new(|new_val: JsValue| {
                storage_save_preference("discoveryMode", &new_val);
            }) as Box<dyn FnMut(JsValue)>);
            ui_render_settings(
                &state_beers_as_js_array(),
                &storage_get_all_user_data(),
                &main_content,
                is_discovery,
                on_change.as_ref().unchecked_ref(),
            );
            on_change.forget();
        }
        "brewery" => {
            if let Some(mc_html) = main_content.dyn_ref::<HtmlElement>() {
                let _ = mc_html.style().set_property("padding", "0");
                let _ = mc_html.style().set_property("margin", "0");
            }

            let (active_brewery, brewery_beers, active_filters) = STATE.with(|s| {
                let st = s.borrow();
                let name = st.active_brewery.clone().unwrap_or_default();
                let lower = name.to_lowercase();
                let matching: Vec<JsValue> = st
                    .beers
                    .iter()
                    .filter(|b| {
                        get_prop(b, "brewery")
                            .as_string()
                            .map(|br| br.to_lowercase() == lower)
                            .unwrap_or(false)
                    })
                    .cloned()
                    .collect();
                (name, vec_to_js_array(&matching), st.active_filters.clone())
            });

            let on_back = Closure::wrap(Box::new(|| {
                let hist_len = window()
                    .history()
                    .ok()
                    .and_then(|h| h.length().ok())
                    .unwrap_or(0);
                if hist_len > 1 {
                    if let Ok(h) = window().history() {
                        let _ = h.back();
                    }
                } else if let Ok(Some(home_btn)) =
                    document().query_selector(".nav-item[data-view=\"home\"]")
                {
                    if let Some(el) = home_btn.dyn_ref::<HtmlElement>() {
                        el.click();
                    }
                }
            }) as Box<dyn FnMut()>);

            ui_render_brewery_view(
                &active_brewery,
                &brewery_beers,
                &main_content,
                &active_filters,
                on_back.as_ref().unchecked_ref(),
            );
            on_back.forget();
        }
        _ => {}
    }
}

// ============================================================================
// Import de bières custom & Service Worker PWA
// ============================================================================

fn add_imported_custom_beers(new_beers: JsValue) {
    if !new_beers.is_truthy() {
        return;
    }
    let list: Vec<JsValue> = if Array::is_array(&new_beers) {
        js_array_to_vec(&new_beers.unchecked_into::<Array>())
    } else {
        vec![new_beers]
    };

    if list.is_empty() {
        return;
    }

    STATE.with(|s| {
        let mut st = s.borrow_mut();
        for b in list {
            let id_str = js_val_to_string(&get_prop(&b, "id"));
            if !id_str.starts_with("CUSTOM_") {
                set_prop(&b, "id", &JsValue::from_str(&format!("CUSTOM_{}", id_str)));
            }
            let enriched = data_enrich_beer_metadata(&b);
            let enriched_id = js_val_to_string(&get_prop(&enriched, "id"));

            if let Some(pos) = st
                .beers
                .iter()
                .position(|x| js_val_to_string(&get_prop(x, "id")) == enriched_id)
            {
                st.beers[pos] = enriched;
            } else {
                st.beers.insert(0, enriched);
            }
        }
    });

    let win = window();
    let all_arr = state_beers_as_js_array();
    set_prop(&win, "allBeers", &all_arr);
    achievements_check(&all_arr);

    let rec = get_prop(&win, "Recommendation");
    if rec.is_truthy() {
        let _ = call_method(&rec, "init", &Array::of1(&all_arr));
    }
    render_current_view();
}

fn register_service_worker() {
    let win = window();
    let nav_val: JsValue = win.navigator().into();
    let has_sw = Reflect::has(&nav_val, &JsValue::from_str("serviceWorker")).unwrap_or(false);
    let has_cap = get_prop(&win, "Capacitor").is_truthy();

    if !has_sw || has_cap {
        return;
    }

    let on_load = Closure::once_into_js(|| {
        let sw = window().navigator().service_worker();
        let reg_promise = sw.register("./sw.js");
        spawn_local(async move {
            match JsFuture::from(reg_promise).await {
                Ok(reg_val) => {
                    if let Ok(registration) = reg_val.dyn_into::<ServiceWorkerRegistration>() {
                        console::log_2(
                            &JsValue::from_str(
                                "ServiceWorker registration successful with scope: ",
                            ),
                            &JsValue::from_str(&registration.scope()),
                        );

                        let skip_msg = Object::new();
                        set_prop(&skip_msg, "type", &JsValue::from_str("SKIP_WAITING"));

                        if let Some(waiting) = registration.waiting() {
                            let _ = waiting.post_message(&skip_msg);
                        }

                        let reg_clone = registration.clone();
                        let on_update = Closure::wrap(Box::new(move || {
                            if let Some(new_worker) = reg_clone.installing() {
                                let nw_clone: ServiceWorker = new_worker.clone();
                                let on_state = Closure::wrap(Box::new(move || {
                                    if nw_clone.state() == ServiceWorkerState::Installed
                                        && window()
                                            .navigator()
                                            .service_worker()
                                            .controller()
                                            .is_some()
                                    {
                                        let msg = Object::new();
                                        set_prop(&msg, "type", &JsValue::from_str("SKIP_WAITING"));
                                        let _ = nw_clone.post_message(&msg);
                                    }
                                })
                                    as Box<dyn FnMut()>);
                                let _ = new_worker.add_event_listener_with_callback(
                                    "statechange",
                                    on_state.as_ref().unchecked_ref(),
                                );
                                on_state.forget();
                            }
                        })
                            as Box<dyn FnMut()>);
                        let _ = registration.add_event_listener_with_callback(
                            "updatefound",
                            on_update.as_ref().unchecked_ref(),
                        );
                        on_update.forget();
                    }
                }
                Err(err) => {
                    console::log_2(
                        &JsValue::from_str("ServiceWorker registration failed: "),
                        &err,
                    );
                }
            }
        });
    });
    let _ = win.add_event_listener_with_callback("load", on_load.unchecked_ref());

    let sw = win.navigator().service_worker();
    let on_controller_change = Closure::wrap(Box::new(|| {
        let _ = window().location().reload();
    }) as Box<dyn FnMut()>);
    let _ = sw.add_event_listener_with_callback(
        "controllerchange",
        on_controller_change.as_ref().unchecked_ref(),
    );
    on_controller_change.forget();
}
