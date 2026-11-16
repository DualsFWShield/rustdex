//! Android Native JNI Bridge for Beerdex
//! Compiles to `librustdex.so` for Android (arm64-v8a, armeabi-v7a, x86_64)
//! to provide native CPU performance for BAC, Rarity, LZ-String, and Barcode logic.

#[cfg(target_os = "android")]
pub mod android_jni {
    use jni::objects::{JClass, JString};
    use jni::sys::{jboolean, jdouble, jint, jstring};
    use jni::JNIEnv;

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_version(
        mut env: JNIEnv,
        _: JClass,
    ) -> jstring {
        let output = env
            .new_string("5.1.0 (Android Native ARM64 Rust Engine)")
            .expect("Couldn't create java string");
        output.into_raw()
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_calculateBac(
        mut env: JNIEnv,
        _: JClass,
        weight: jdouble,
        is_female: jboolean,
        age: jint,
        history_json: JString,
        now_ms: jdouble,
    ) -> jdouble {
        #[derive(serde::Deserialize)]
        struct DrinkInput {
            time: i64,
            volume: u32,
            abv: f64,
        }

        let json_str: String = match env.get_string(&history_json) {
            Ok(s) => s.into(),
            Err(_) => String::new(),
        };

        let gender = if is_female != 0 {
            beerdex_core::bac::Gender::Female
        } else {
            beerdex_core::bac::Gender::Male
        };

        let history: Vec<beerdex_core::models::BacHistoryEntry> =
            if let Ok(inputs) = serde_json::from_str::<Vec<DrinkInput>>(&json_str) {
                inputs
                    .into_iter()
                    .map(|i| {
                        let grams = beerdex_core::bac::calculate_alcohol_grams(i.volume, i.abv);
                        beerdex_core::models::BacHistoryEntry {
                            time: i.time,
                            volume: i.volume,
                            abv: i.abv,
                            grams,
                        }
                    })
                    .collect()
            } else {
                Vec::new()
            };

        let sim =
            beerdex_core::bac::simulate_bac(&history, now_ms as i64, weight, gender, age as u32);
        sim.current_bac
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_calculateRarity(
        mut env: JNIEnv,
        _: JClass,
        country: JString,
        style: JString,
        abv: jdouble,
        distribution: JString,
        barrel_aged: jboolean,
        ingredients: JString,
    ) -> jstring {
        let c_country: String = env
            .get_string(&country)
            .map(|s| s.into())
            .unwrap_or_default();
        let c_style: String = env.get_string(&style).map(|s| s.into()).unwrap_or_default();
        let c_distrib: String = env
            .get_string(&distribution)
            .map(|s| s.into())
            .unwrap_or_default();
        let c_ingr: String = env
            .get_string(&ingredients)
            .map(|s| s.into())
            .unwrap_or_default();

        let dummy_beer = beerdex_core::models::Beer {
            title: "temp".to_string(),
            brewery: "temp".to_string(),
            beer_type: c_style,
            volume: Some("33cl".to_string()),
            alcohol: Some(format!("{:.1}%", abv)),
            id: None,
            image: None,
            production_volume: None,
            distribution: Some(c_distrib),
            barrel_aged: Some(barrel_aged != 0),
            community_rating: None,
            ingredients: Some(c_ingr),
            rarity_rank: None,
            barcode: None,
            country: if c_country.is_empty() {
                None
            } else {
                Some(c_country)
            },
            country_code: None,
            search_region: None,
            search_country: None,
        };

        let result = beerdex_core::rarity::calculate_rarity(&dummy_beer);
        env.new_string(result.rarity).unwrap().into_raw()
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_validateEan13(
        mut env: JNIEnv,
        _: JClass,
        barcode: JString,
    ) -> jboolean {
        let code: String = env
            .get_string(&barcode)
            .map(|s| s.into())
            .unwrap_or_default();
        if beerdex_platform::scanner::ScannerEngine::validate_ean13(&code) {
            1
        } else {
            0
        }
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_compressLz(
        mut env: JNIEnv,
        _: JClass,
        text: JString,
    ) -> jstring {
        let input: String = env.get_string(&text).map(|s| s.into()).unwrap_or_default();
        let res = beerdex_core::lz_string::compress_to_encoded_uri_component(&input);
        env.new_string(res).unwrap().into_raw()
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_decompressLz(
        mut env: JNIEnv,
        _: JClass,
        text: JString,
    ) -> jstring {
        let input: String = env.get_string(&text).map(|s| s.into()).unwrap_or_default();
        let res = beerdex_core::lz_string::decompress_from_encoded_uri_component(&input)
            .unwrap_or_default();
        env.new_string(res).unwrap().into_raw()
    }

    #[no_mangle]
    pub extern "system" fn Java_be_beerdex_rust_RustNative_generateQrSvg(
        mut env: JNIEnv,
        _: JClass,
        text: JString,
        size_px: jint,
    ) -> jstring {
        let input: String = env.get_string(&text).map(|s| s.into()).unwrap_or_default();
        let res = beerdex_core::qrcode_gen::QrGenerator::to_svg_string(&input, size_px as u32);
        env.new_string(res).unwrap().into_raw()
    }
}
