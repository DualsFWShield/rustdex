use std::collections::HashMap;

const KEY_STRING_URI_SAFE: &str =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
const KEY_STRING_BASE64: &str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

/// Compresses a string into an LZ-String URI-encoded component, matching JS `LZString.compressToEncodedURIComponent`.
pub fn compress_to_encoded_uri_component(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let chars: Vec<char> = KEY_STRING_URI_SAFE.chars().collect();
    compress_internal(input, 6, |o| chars[o as usize])
}

/// Decompresses an LZ-String URI-encoded component, matching JS `LZString.decompressFromEncodedURIComponent`.
pub fn decompress_from_encoded_uri_component(input: &str) -> Option<String> {
    if input.is_empty() {
        return Some(String::new());
    }
    let sanitized = input.replace(' ', "+");
    let map: HashMap<char, usize> = KEY_STRING_URI_SAFE
        .chars()
        .enumerate()
        .map(|(i, c)| (c, i))
        .collect();

    decompress_internal(sanitized.len(), 32, |idx| {
        let ch = sanitized.chars().nth(idx)?;
        map.get(&ch).copied()
    })
}

/// Compresses a string into LZ-String Base64, matching JS `LZString.compressToBase64`.
pub fn compress_to_base64(input: &str) -> String {
    if input.is_empty() {
        return String::new();
    }
    let chars: Vec<char> = KEY_STRING_BASE64.chars().collect();
    let res = compress_internal(input, 6, |o| chars[o as usize]);
    match res.len() % 4 {
        1 => format!("{}===", res),
        2 => format!("{}==", res),
        3 => format!("{}=", res),
        _ => res,
    }
}

/// Decompresses an LZ-String Base64 string, matching JS `LZString.decompressFromBase64`.
pub fn decompress_from_base64(input: &str) -> Option<String> {
    if input.is_empty() {
        return Some(String::new());
    }
    let map: HashMap<char, usize> = KEY_STRING_BASE64
        .chars()
        .enumerate()
        .map(|(i, c)| (c, i))
        .collect();

    decompress_internal(input.len(), 32, |idx| {
        let ch = input.chars().nth(idx)?;
        map.get(&ch).copied()
    })
}

fn compress_internal<F>(input: &str, bits_per_char: usize, get_char: F) -> String
where
    F: Fn(u32) -> char,
{
    if input.is_empty() {
        return String::new();
    }

    let mut context_dictionary: HashMap<Vec<u16>, u32> = HashMap::new();
    let mut context_dictionary_to_create: HashMap<Vec<u16>, bool> = HashMap::new();
    let mut context_c: Vec<u16> = Vec::with_capacity(2);
    let mut context_wc: Vec<u16>;
    let mut context_w: Vec<u16> = Vec::new();
    let mut context_enlarge_in: usize = 2;
    let mut context_dict_size: u32 = 3;
    let mut context_num_bits: usize = 2;
    let mut context_data: Vec<char> = Vec::new();
    let mut context_data_val: u32 = 0;
    let mut context_data_position: usize = 0;

    let units: Vec<u16> = input.encode_utf16().collect();

    for &code_unit in &units {
        context_c.clear();
        context_c.push(code_unit);

        if !context_dictionary.contains_key(&context_c) {
            context_dictionary.insert(context_c.clone(), context_dict_size);
            context_dict_size += 1;
            context_dictionary_to_create.insert(context_c.clone(), true);
        }

        context_wc = context_w.clone();
        context_wc.extend_from_slice(&context_c);

        if context_dictionary.contains_key(&context_wc) {
            context_w = context_wc;
        } else {
            if context_dictionary_to_create.contains_key(&context_w) {
                let first_val = context_w[0] as u32;
                if first_val < 256 {
                    for _ in 0..context_num_bits {
                        context_data_val <<= 1;
                        if context_data_position == bits_per_char - 1 {
                            context_data_position = 0;
                            context_data.push(get_char(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position += 1;
                        }
                    }
                    let mut value = first_val;
                    for _ in 0..8 {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if context_data_position == bits_per_char - 1 {
                            context_data_position = 0;
                            context_data.push(get_char(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position += 1;
                        }
                        value >>= 1;
                    }
                } else {
                    let mut value = 1;
                    for _ in 0..context_num_bits {
                        context_data_val = (context_data_val << 1) | value;
                        if context_data_position == bits_per_char - 1 {
                            context_data_position = 0;
                            context_data.push(get_char(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position += 1;
                        }
                        value = 0;
                    }
                    let mut val_code = first_val;
                    for _ in 0..16 {
                        context_data_val = (context_data_val << 1) | (val_code & 1);
                        if context_data_position == bits_per_char - 1 {
                            context_data_position = 0;
                            context_data.push(get_char(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position += 1;
                        }
                        val_code >>= 1;
                    }
                }
                context_enlarge_in -= 1;
                if context_enlarge_in == 0 {
                    context_enlarge_in = 1 << context_num_bits;
                    context_num_bits += 1;
                }
                context_dictionary_to_create.remove(&context_w);
            } else {
                let mut value = *context_dictionary.get(&context_w).unwrap_or(&0);
                for _ in 0..context_num_bits {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if context_data_position == bits_per_char - 1 {
                        context_data_position = 0;
                        context_data.push(get_char(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position += 1;
                    }
                    value >>= 1;
                }
            }
            context_enlarge_in -= 1;
            if context_enlarge_in == 0 {
                context_enlarge_in = 1 << context_num_bits;
                context_num_bits += 1;
            }
            context_dictionary.insert(context_wc, context_dict_size);
            context_dict_size += 1;
            context_w = context_c.clone();
        }
    }

    if !context_w.is_empty() {
        if context_dictionary_to_create.contains_key(&context_w) {
            let first_val = context_w[0] as u32;
            if first_val < 256 {
                for _ in 0..context_num_bits {
                    context_data_val <<= 1;
                    if context_data_position == bits_per_char - 1 {
                        context_data_position = 0;
                        context_data.push(get_char(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position += 1;
                    }
                }
                let mut value = first_val;
                for _ in 0..8 {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if context_data_position == bits_per_char - 1 {
                        context_data_position = 0;
                        context_data.push(get_char(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position += 1;
                    }
                    value >>= 1;
                }
            } else {
                let mut value = 1;
                for _ in 0..context_num_bits {
                    context_data_val = (context_data_val << 1) | value;
                    if context_data_position == bits_per_char - 1 {
                        context_data_position = 0;
                        context_data.push(get_char(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position += 1;
                    }
                    value = 0;
                }
                let mut val_code = first_val;
                for _ in 0..16 {
                    context_data_val = (context_data_val << 1) | (val_code & 1);
                    if context_data_position == bits_per_char - 1 {
                        context_data_position = 0;
                        context_data.push(get_char(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position += 1;
                    }
                    val_code >>= 1;
                }
            }
            context_enlarge_in -= 1;
            if context_enlarge_in == 0 {
                context_enlarge_in = 1 << context_num_bits;
                context_num_bits += 1;
            }
            context_dictionary_to_create.remove(&context_w);
        } else {
            let mut value = *context_dictionary.get(&context_w).unwrap_or(&0);
            for _ in 0..context_num_bits {
                context_data_val = (context_data_val << 1) | (value & 1);
                if context_data_position == bits_per_char - 1 {
                    context_data_position = 0;
                    context_data.push(get_char(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position += 1;
                }
                value >>= 1;
            }
        }
        context_enlarge_in -= 1;
        if context_enlarge_in == 0 {
            context_num_bits += 1;
        }
    }

    let mut value = 2;
    for _ in 0..context_num_bits {
        context_data_val = (context_data_val << 1) | (value & 1);
        if context_data_position == bits_per_char - 1 {
            context_data_position = 0;
            context_data.push(get_char(context_data_val));
            context_data_val = 0;
        } else {
            context_data_position += 1;
        }
        value >>= 1;
    }

    loop {
        context_data_val <<= 1;
        if context_data_position == bits_per_char - 1 {
            context_data.push(get_char(context_data_val));
            break;
        } else {
            context_data_position += 1;
        }
    }

    context_data.into_iter().collect()
}

fn decompress_internal<F>(length: usize, reset_val: usize, mut get_val: F) -> Option<String>
where
    F: FnMut(usize) -> Option<usize>,
{
    if length == 0 {
        return Some(String::new());
    }

    let mut dictionary: Vec<Vec<u16>> = vec![vec![0], vec![1], vec![2]];
    let mut enlarge_in: usize = 4;
    let mut dict_size: usize = 4;
    let mut num_bits: usize = 3;
    let mut entry: Vec<u16>;
    let mut result_u16: Vec<u16> = Vec::new();
    let mut w: Vec<u16>;
    let mut data_val: usize = get_val(0)?;
    let mut data_position: usize = reset_val;
    let mut data_index: usize = 1;

    macro_rules! get_bits {
        ($max:expr) => {{
            let mut bits = 0usize;
            let mut power = 1usize;
            while power != $max {
                let res = data_val & data_position;
                data_position >>= 1;
                if data_position == 0 {
                    data_position = reset_val;
                    data_val = get_val(data_index).unwrap_or(0);
                    data_index += 1;
                }
                bits |= if res > 0 { 1 } else { 0 } * power;
                power <<= 1;
            }
            bits
        }};
    }

    let next_bits = get_bits!(4);
    let c_code = match next_bits {
        0 => get_bits!(256) as u16,
        1 => get_bits!(65536) as u16,
        2 => return Some(String::new()),
        _ => return None,
    };

    dictionary.resize(3, Vec::new());
    dictionary.push(vec![c_code]);
    w = vec![c_code];
    result_u16.push(c_code);

    loop {
        if data_index > length + 1 {
            return Some(String::from_utf16_lossy(&result_u16));
        }

        let max_power = 1 << num_bits;
        let mut bits = 0usize;
        let mut power = 1usize;
        while power != max_power {
            let res = data_val & data_position;
            data_position >>= 1;
            if data_position == 0 {
                data_position = reset_val;
                data_val = get_val(data_index).unwrap_or(0);
                data_index += 1;
            }
            bits |= if res > 0 { 1 } else { 0 } * power;
            power <<= 1;
        }

        let mut next_c = bits;
        match next_c {
            0 => {
                let b = get_bits!(256) as u16;
                if dict_size >= dictionary.len() {
                    dictionary.push(vec![b]);
                } else {
                    dictionary[dict_size] = vec![b];
                }
                next_c = dict_size;
                dict_size += 1;
                enlarge_in -= 1;
            }
            1 => {
                let b = get_bits!(65536) as u16;
                if dict_size >= dictionary.len() {
                    dictionary.push(vec![b]);
                } else {
                    dictionary[dict_size] = vec![b];
                }
                next_c = dict_size;
                dict_size += 1;
                enlarge_in -= 1;
            }
            2 => return Some(String::from_utf16_lossy(&result_u16)),
            _ => {}
        }

        if enlarge_in == 0 {
            enlarge_in = 1 << num_bits;
            num_bits += 1;
        }

        if next_c < dictionary.len() {
            entry = dictionary[next_c].clone();
        } else if next_c == dict_size {
            entry = w.clone();
            if let Some(&first) = w.first() {
                entry.push(first);
            }
        } else {
            return None;
        }

        result_u16.extend_from_slice(&entry);
        let mut new_entry = w.clone();
        if let Some(&first) = entry.first() {
            new_entry.push(first);
        }
        dictionary.push(new_entry);
        dict_size += 1;
        enlarge_in -= 1;

        w = entry;

        if enlarge_in == 0 {
            enlarge_in = 1 << num_bits;
            num_bits += 1;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lz_roundtrip() {
        let sample = "Hello Beerdex! 🍺 Triple Karmeliet & Chimay Bleue 1234567890";
        let compressed_uri = compress_to_encoded_uri_component(sample);
        let decompressed_uri = decompress_from_encoded_uri_component(&compressed_uri);
        assert_eq!(decompressed_uri, Some(sample.to_string()));

        let compressed_b64 = compress_to_base64(sample);
        let decompressed_b64 = decompress_from_base64(&compressed_b64);
        assert_eq!(decompressed_b64, Some(sample.to_string()));
    }
}
