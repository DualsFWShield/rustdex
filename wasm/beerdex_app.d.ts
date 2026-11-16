/* tslint:disable */
/* eslint-disable */

export function beerdex_add_custom_beer(title: string, brewery: string, beer_type: string, abv: number, volume: string, rarity: string): void;

export function beerdex_close_filter_modal(): void;

export function beerdex_close_modal(): void;

export function beerdex_compress_lz(text: string): string;

export function beerdex_decompress_lz(text: string): string | undefined;

export function beerdex_export_backup_json(): string;

export function beerdex_generate_qr_svg(text: string, size_px: number): string;

export function beerdex_get_current_bac(): number;

export function beerdex_import_backup_json(json_str: string): boolean;

export function beerdex_log_drink(beer_id: string, volume_ml: number): void;

export function beerdex_open_achievement_modal(ach_id: string): void;

export function beerdex_open_add_beer_modal(): void;

export function beerdex_open_beer_modal(beer_id: string): void;

export function beerdex_open_filter_modal(): void;

export function beerdex_open_notation_modal(): void;

export function beerdex_open_scan_modal(): void;

export function beerdex_parse_scan(payload: string): string;

export function beerdex_reset_data(target: string): void;

export function beerdex_reset_filters(): void;

export function beerdex_save_rating(beer_id: string, score: number, comment: string): void;

export function beerdex_search(query: string): void;

export function beerdex_set_filter_country(country: string): void;

export function beerdex_set_filter_rarity(rarity: string): void;

export function beerdex_set_filter_style(style: string): void;

export function beerdex_set_language(lang: string): void;

export function beerdex_set_preference(key: string, val_json: string): void;

export function beerdex_set_theme(theme_name: string): void;

export function beerdex_switch_view(view_name: string): void;

export function beerdex_toggle_favorite(beer_id: string): boolean;

export function beerdex_toggle_filter_consumed(): void;

export function beerdex_toggle_filter_favorites(): void;

export function beerdex_toggle_search(): void;

export function beerdex_toggle_view_mode(): void;

export function beerdex_trigger_haptic(pattern: string): void;

export function beerdex_validate_ean13(barcode: string): boolean;

export function wasm_init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly beerdex_add_custom_beer: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => [number, number];
    readonly beerdex_close_filter_modal: () => [number, number];
    readonly beerdex_close_modal: () => [number, number];
    readonly beerdex_compress_lz: (a: number, b: number) => [number, number];
    readonly beerdex_decompress_lz: (a: number, b: number) => [number, number];
    readonly beerdex_export_backup_json: () => [number, number];
    readonly beerdex_generate_qr_svg: (a: number, b: number, c: number) => [number, number];
    readonly beerdex_get_current_bac: () => number;
    readonly beerdex_import_backup_json: (a: number, b: number) => [number, number, number];
    readonly beerdex_log_drink: (a: number, b: number, c: number) => [number, number];
    readonly beerdex_open_achievement_modal: (a: number, b: number) => [number, number];
    readonly beerdex_open_add_beer_modal: () => [number, number];
    readonly beerdex_open_beer_modal: (a: number, b: number) => [number, number];
    readonly beerdex_open_filter_modal: () => [number, number];
    readonly beerdex_open_notation_modal: () => [number, number];
    readonly beerdex_open_scan_modal: () => [number, number];
    readonly beerdex_parse_scan: (a: number, b: number) => [number, number];
    readonly beerdex_reset_data: (a: number, b: number) => [number, number];
    readonly beerdex_reset_filters: () => [number, number];
    readonly beerdex_save_rating: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly beerdex_search: (a: number, b: number) => [number, number];
    readonly beerdex_set_filter_country: (a: number, b: number) => [number, number];
    readonly beerdex_set_filter_rarity: (a: number, b: number) => [number, number];
    readonly beerdex_set_filter_style: (a: number, b: number) => [number, number];
    readonly beerdex_set_language: (a: number, b: number) => [number, number];
    readonly beerdex_set_preference: (a: number, b: number, c: number, d: number) => [number, number];
    readonly beerdex_set_theme: (a: number, b: number) => [number, number];
    readonly beerdex_switch_view: (a: number, b: number) => [number, number];
    readonly beerdex_toggle_favorite: (a: number, b: number) => [number, number, number];
    readonly beerdex_toggle_filter_consumed: () => [number, number];
    readonly beerdex_toggle_filter_favorites: () => [number, number];
    readonly beerdex_toggle_search: () => [number, number];
    readonly beerdex_toggle_view_mode: () => [number, number];
    readonly beerdex_trigger_haptic: (a: number, b: number) => void;
    readonly beerdex_validate_ean13: (a: number, b: number) => number;
    readonly wasm_init: () => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __externref_table_dealloc: (a: number) => void;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
