package be.beerdex.rust;

public class RustNative {
    private static boolean isLoaded = false;

    static {
        try {
            System.loadLibrary("rustdex");
            isLoaded = true;
            android.util.Log.i("BeerdexRust", "Native Rust shared library (librustdex.so) loaded successfully.");
        } catch (UnsatisfiedLinkError e) {
            android.util.Log.w("BeerdexRust", "Native library librustdex.so not available, falling back to WebAssembly/JS: " + e.getMessage());
            isLoaded = false;
        }
    }

    public static boolean isNativeLoaded() {
        return isLoaded;
    }

    public static native String version();
    public static native double calculateBac(double weight, boolean isFemale, int age, String historyJson, double nowMs);
    public static native String calculateRarity(String country, String style, double abv, String distribution, boolean barrelAged, String ingredients);
    public static native boolean validateEan13(String barcode);
    public static native String compressLz(String text);
    public static native String decompressLz(String text);
    public static native String generateQrSvg(String text, int sizePx);
}
