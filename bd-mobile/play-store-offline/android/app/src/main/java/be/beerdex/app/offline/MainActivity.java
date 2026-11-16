package be.beerdex.app.offline;

import android.os.Bundle;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;
import be.beerdex.rust.RustNative;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        if (getBridge() != null && getBridge().getWebView() != null) {
            getBridge().getWebView().addJavascriptInterface(new Object() {
                @android.webkit.JavascriptInterface
                public boolean isAvailable() {
                    return RustNative.isNativeLoaded();
                }

                @android.webkit.JavascriptInterface
                public String version() {
                    return RustNative.isNativeLoaded() ? RustNative.version() : "5.1.0 (Android Web Fallback)";
                }

                @android.webkit.JavascriptInterface
                public double calculateBac(double weight, boolean isFemale, int age, String historyJson, double nowMs) {
                    return RustNative.calculateBac(weight, isFemale, age, historyJson, nowMs);
                }

                @android.webkit.JavascriptInterface
                public String calculateRarity(String country, String style, double abv, String distribution, boolean barrelAged, String ingredients) {
                    return RustNative.calculateRarity(country, style, abv, distribution, barrelAged, ingredients);
                }

                @android.webkit.JavascriptInterface
                public boolean validateEan13(String barcode) {
                    return RustNative.validateEan13(barcode);
                }

                @android.webkit.JavascriptInterface
                public String compressLz(String text) {
                    return RustNative.compressLz(text);
                }

                @android.webkit.JavascriptInterface
                public String decompressLz(String text) {
                    return RustNative.decompressLz(text);
                }

                @android.webkit.JavascriptInterface
                public String generateQrSvg(String text, int sizePx) {
                    return RustNative.generateQrSvg(text, sizePx);
                }
            }, "BeerdexAndroidNative");
        }
    }

    @Override
    public void onBackPressed() {
        super.onBackPressed();
    }
}
