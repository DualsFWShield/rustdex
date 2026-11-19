/* tslint:disable */
/* eslint-disable */

export function applyTheme(): void;

export function beerdex_calculate_bac(weight: number, is_female: boolean, age: number, history_json: string, now_ms: number): number;

export function beerdex_calculate_rarity(country: string, style: string, abv: number, distribution: string, barrel_aged: boolean, ingredients: string): string;

export function beerdex_compress_lz(text: string): string;

export function beerdex_decompress_lz(text: string): string | undefined;

export function beerdex_french_elision(text: string): string;

export function beerdex_french_typography(text: string): string;

export function beerdex_generate_qr_svg(text: string, size_px: number): string;

export function beerdex_parse_scan(payload: string): string;

export function beerdex_similarity(a: string, b: string): number;

export function beerdex_trigger_haptic(pattern: string): void;

export function beerdex_validate_ean13(barcode: string): boolean;

export function beerdex_version(): string;

export function start(): void;

export function wasm_init(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly applyTheme: () => void;
    readonly beerdex_calculate_bac: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly beerdex_calculate_rarity: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => [number, number];
    readonly beerdex_compress_lz: (a: number, b: number) => [number, number];
    readonly beerdex_decompress_lz: (a: number, b: number) => [number, number];
    readonly beerdex_french_elision: (a: number, b: number) => [number, number];
    readonly beerdex_french_typography: (a: number, b: number) => [number, number];
    readonly beerdex_generate_qr_svg: (a: number, b: number, c: number) => [number, number];
    readonly beerdex_parse_scan: (a: number, b: number) => [number, number];
    readonly beerdex_similarity: (a: number, b: number, c: number, d: number) => number;
    readonly beerdex_trigger_haptic: (a: number, b: number) => void;
    readonly beerdex_validate_ean13: (a: number, b: number) => number;
    readonly beerdex_version: () => [number, number];
    readonly start: () => void;
    readonly wasm_init: () => [number, number];
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___wasm_bindgen_ce6734f7863d3998___JsValue__core_37ee0ce0c4cd57d5___result__Result_____wasm_bindgen_ce6734f7863d3998___JsError___true_: (a: number, b: number, c: any) => [number, number];
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___wasm_bindgen_ce6734f7863d3998___JsValue______true_: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___wasm_bindgen_ce6734f7863d3998___JsValue______true__17: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___wasm_bindgen_ce6734f7863d3998___JsValue______true__18: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___wasm_bindgen_ce6734f7863d3998___JsValue______true__19: (a: number, b: number, c: any) => void;
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke___js_sys_2fe9354b94106d01___Array__true_: (a: number, b: number) => any;
    readonly wasm_bindgen_ce6734f7863d3998___convert__closures_____invoke_______true_: (a: number, b: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_exn_store: (a: number) => void;
    readonly __externref_table_alloc: () => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_destroy_closure: (a: number, b: number) => void;
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
