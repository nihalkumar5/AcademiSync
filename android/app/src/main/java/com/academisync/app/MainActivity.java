package com.academisync.app;

import android.animation.Animator;
import android.animation.AnimatorListenerAdapter;
import android.animation.ObjectAnimator;
import android.animation.PropertyValuesHolder;
import android.animation.ValueAnimator;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import java.util.ArrayList;
import java.util.List;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.StyleSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewAnimationUtils;
import android.view.ViewGroup;
import android.view.animation.AccelerateInterpolator;
import android.view.animation.LinearInterpolator;
import android.view.animation.OvershootInterpolator;
import android.view.animation.PathInterpolator;
import android.webkit.CookieManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.WebViewListener;
import com.codetrixstudio.capacitor.GoogleAuth.GoogleAuth;
import com.academisync.app.widget.WidgetBridgePlugin;

public class MainActivity extends BridgeActivity {
    // Animated launch, built around the app's "launch" illustration (someone throwing a paper plane
    // out of a screen). The system splash shows only the background colour; this then plays until the
    // web app has loaded and hands over to it.
    //  - Light, "ink on paper": the illustration rises in, a paper plane flies out of it, the dot of
    //    the i drops, the mark unfolds from it, the name types in.
    //  - Dark, "night glow": a warm glow lights up, the illustration comes into focus on a softly lit
    //    card, the plane flies out, the mark focuses in, the name tracks in.
    private static final long INTRO_LIGHT_MS = 1600;
    private static final long INTRO_DARK_MS = 1600;
    private static final long MAX_MS = 7000; // never hold the app if the site is slow or offline

    // Material "emphasized" curves: fast out, long gentle settle
    private static final PathInterpolator EMPHASIZED = new PathInterpolator(0.05f, 0.7f, 0.1f, 1f);
    private static final PathInterpolator STANDARD = new PathInterpolator(0.2f, 0f, 0f, 1f);
    private static final PathInterpolator EXIT = new PathInterpolator(0.3f, 0f, 0.8f, 0.15f);

    private FrameLayout splash;
    private View content;     // logo + name, moved together on exit
    private View mark;
    private View hero;        // the illustration (on a card in dark mode)
    private View glow;        // dark only
    private View loader;      // light only
    private ObjectAnimator idle;
    private ObjectAnimator heroFloat;
    private final List<Animator> running = new ArrayList<>();
    private boolean dark;
    private boolean pageLoaded = false;
    private boolean introDone = false;
    private boolean leaving = false;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(GoogleAuth.class);
        registerPlugin(WidgetBridgePlugin.class);
        super.onCreate(savedInstanceState);

        CookieManager cookieManager = CookieManager.getInstance();
        cookieManager.setAcceptCookie(true);

        if (getBridge() != null && getBridge().getWebView() != null) {
            WebView webView = getBridge().getWebView();
            cookieManager.setAcceptThirdPartyCookies(webView, true);
            WebSettings webSettings = webView.getSettings();
            webSettings.setJavaScriptEnabled(true);
            webSettings.setDomStorageEnabled(true);
            webSettings.setDatabaseEnabled(true);
            webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
            webSettings.setSupportMultipleWindows(true);
            // Same look on every phone: honour the page's viewport (the web app fits a 390px
            // design to the screen width) and don't let the system font-size setting reflow it.
            webSettings.setUseWideViewPort(true);
            webSettings.setLoadWithOverviewMode(true);
            webSettings.setTextZoom(100);

            getBridge().addWebViewListener(new WebViewListener() {
                @Override
                public void onPageLoaded(WebView view) {
                    // A moment for the page to paint its first screen before we reveal it
                    handler.postDelayed(() -> {
                        pageLoaded = true;
                        maybeLeave();
                    }, 350);
                    // Remember the app's own theme for the next launch. It's applied after the app hydrates
                    // and again when settings sync from the account, so look a few times.
                    for (long t : new long[] { 2500, 6000, 12000 }) handler.postDelayed(MainActivity.this::rememberTheme, t);
                }
            });
        }

        if (savedInstanceState == null) showSplash();
    }

    private int dp(float v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    // The app picks light/dark in its own Settings, which the web page applies as a "dark" class on
    // <html>. Android can't see that before the page loads, so we remember it for the next launch;
    // until it's known (first launch) the phone's own mode is used.
    private SharedPreferences prefs() {
        return getSharedPreferences("launch", MODE_PRIVATE);
    }

    private void rememberTheme() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript("document.documentElement.classList.contains('dark')", (v) -> {
            if (!"true".equals(v) && !"false".equals(v)) return;
            boolean isDark = "true".equals(v);
            prefs().edit().putString("theme", isDark ? "dark" : "light").apply();
            // Android 13+: make the system's own launch screen match too, so there's no flash of the
            // wrong colour before our splash appears on the next launch
            if (android.os.Build.VERSION.SDK_INT >= 33) {
                try {
                    getSplashScreen().setSplashScreenTheme(isDark ? R.style.LaunchDark : R.style.LaunchLight);
                } catch (Exception ignored) {
                }
            }
        });
    }

    @Override
    public void onPause() {
        rememberTheme(); // catches a theme change made in this session
        super.onPause();
    }

    private void showSplash() {
        String saved = prefs().getString("theme", null);
        dark = saved != null
            ? "dark".equals(saved)
            : (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;

        splash = new FrameLayout(this);
        splash.setBackgroundColor(dark ? Color.parseColor("#0C0C0D") : Color.WHITE);
        splash.setClickable(true); // swallow taps while it's up
        addContentView(splash, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));

        if (dark) buildDark(); else buildLight();

        handler.postDelayed(() -> {
            introDone = true;
            if (!maybeLeave()) startIdle();
        }, dark ? INTRO_DARK_MS : INTRO_LIGHT_MS);
        handler.postDelayed(() -> {
            pageLoaded = true;
            maybeLeave();
        }, MAX_MS);
    }

    // ---------------------------------------------------------------- Shared pieces
    private static final float HERO_ASPECT = 762f / 996f; // splash_hero.png

    /** The illustration. Light: straight on the white page. Dark: on a softly lit card, dimmed a touch
     *  so its white reads as paper under a lamp rather than a bright hole in the dark. */
    private View makeHero(int width) {
        int h = Math.round(width * HERO_ASPECT);
        ImageView img = new ImageView(this);
        img.setImageResource(R.drawable.splash_hero);
        img.setScaleType(ImageView.ScaleType.FIT_CENTER);
        if (!dark) {
            img.setLayoutParams(new LinearLayout.LayoutParams(width, h));
            return img;
        }
        int pad = dp(14);
        FrameLayout card = new FrameLayout(this);
        GradientDrawable bg = new GradientDrawable();
        bg.setCornerRadius(dp(28));
        bg.setColor(Color.parseColor("#E9E7E3"));
        card.setBackground(bg);
        card.setElevation(dp(10));
        img.setColorFilter(new android.graphics.LightingColorFilter(0xE9E7E3, 0x000000));
        card.addView(img, new FrameLayout.LayoutParams(width, h, Gravity.CENTER));
        card.setPadding(pad, pad, pad, pad);
        card.setLayoutParams(new LinearLayout.LayoutParams(width + pad * 2, h + pad * 2));
        return card;
    }

    /** A paper plane flies out of the illustration's hand in a rising arc, tilting with its path. */
    private void flyPlane(View heroView, long delay) {
        ImageView plane = new ImageView(this);
        plane.setImageResource(R.drawable.sp_plane);
        int size = dp(30);
        splash.addView(plane, new FrameLayout.LayoutParams(size, size));
        plane.setAlpha(0f);
        heroView.post(() -> {
            if (splash == null) return;
            int[] hp = new int[2];
            int[] sp = new int[2];
            heroView.getLocationInWindow(hp);
            splash.getLocationInWindow(sp);
            float inset = dark ? dp(14) : 0;
            float imgW = heroView.getWidth() - inset * 2;
            float imgH = heroView.getHeight() - inset * 2;
            // The plane in his hand sits at about (14%, 16%) of the illustration
            final float x0 = hp[0] - sp[0] + inset + imgW * 0.14f - size / 2f;
            final float y0 = hp[1] - sp[1] + inset + imgH * 0.16f - size / 2f;
            final float cx = x0 - dp(70), cy = y0 - dp(170);                     // swing out left and up
            final float x1 = splash.getWidth() * 0.86f, y1 = -size * 2f;         // and away, top right
            ValueAnimator fly = ValueAnimator.ofFloat(0f, 1f);
            fly.setStartDelay(delay);
            fly.setDuration(1250);
            fly.setInterpolator(new android.view.animation.AccelerateDecelerateInterpolator());
            fly.addUpdateListener(a -> {
                float t = (float) a.getAnimatedValue(), u = 1 - t;
                float x = u * u * x0 + 2 * u * t * cx + t * t * x1;
                float y = u * u * y0 + 2 * u * t * cy + t * t * y1;
                float dx = 2 * u * (cx - x0) + 2 * t * (x1 - cx);
                float dy = 2 * u * (cy - y0) + 2 * t * (y1 - cy);
                plane.setTranslationX(x);
                plane.setTranslationY(y);
                plane.setRotation((float) Math.toDegrees(Math.atan2(dy, dx)));
                plane.setAlpha(t < 0.08f ? t / 0.08f : t > 0.8f ? (1 - t) / 0.2f : 1f);
                float sc = 1f - 0.35f * t;
                plane.setScaleX(sc);
                plane.setScaleY(sc);
            });
            fly.start();
            running.add(fly);
        });
    }

    private View makeName(boolean perLetter, int color) {
        if (!perLetter) {
            TextView word = new TextView(this);
            SpannableString s = new SpannableString("intersemester");
            s.setSpan(new StyleSpan(Typeface.BOLD), 0, 5, Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
            word.setText(s);
            word.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
            word.setTypeface(Typeface.create("sans-serif", Typeface.NORMAL));
            word.setTextColor(color);
            word.setIncludeFontPadding(false);
            return word;
        }
        LinearLayout word = new LinearLayout(this);
        word.setOrientation(LinearLayout.HORIZONTAL);
        String name = "intersemester";
        for (int i = 0; i < name.length(); i++) {
            TextView t = new TextView(this);
            t.setText(String.valueOf(name.charAt(i)));
            t.setTextSize(TypedValue.COMPLEX_UNIT_SP, 24);
            t.setTypeface(Typeface.create("sans-serif", i < 5 ? Typeface.BOLD : Typeface.NORMAL));
            t.setTextColor(color);
            t.setIncludeFontPadding(false);
            word.addView(t);
        }
        return word;
    }

    // ---------------------------------------------------------------- Light: ink on paper
    private void buildLight() {
        final int ink = Color.parseColor("#111111");
        final int markSize = dp(60);

        LinearLayout stack = new LinearLayout(this);
        stack.setOrientation(LinearLayout.VERTICAL);
        stack.setGravity(Gravity.CENTER_HORIZONTAL);

        View heroView = makeHero(dp(290));
        stack.addView(heroView);

        // The mark, with the dot of the "i" as its own view so it can land first
        FrameLayout markBox = new FrameLayout(this);
        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash_mark);
        logo.setVisibility(View.INVISIBLE);
        markBox.addView(logo, new FrameLayout.LayoutParams(markSize, markSize));
        final int dotSize = Math.round(markSize * 0.21f);
        View dot = new View(this);
        GradientDrawable dotShape = new GradientDrawable();
        dotShape.setShape(GradientDrawable.OVAL);
        dotShape.setColor(ink);
        dot.setBackground(dotShape);
        FrameLayout.LayoutParams dotLp = new FrameLayout.LayoutParams(dotSize, dotSize);
        dotLp.leftMargin = Math.round(markSize * 0.264f - dotSize / 2f);
        dotLp.topMargin = Math.round(markSize * 0.208f - dotSize / 2f);
        markBox.addView(dot, dotLp);
        LinearLayout.LayoutParams mlp = new LinearLayout.LayoutParams(markSize, markSize);
        mlp.topMargin = dp(34);
        stack.addView(markBox, mlp);

        LinearLayout word = (LinearLayout) makeName(true, ink);
        LinearLayout.LayoutParams wp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wp.topMargin = dp(16);
        stack.addView(word, wp);

        // Loading hairline (only shown if the app is still loading after the intro)
        FrameLayout track = new FrameLayout(this);
        GradientDrawable trackShape = new GradientDrawable();
        trackShape.setCornerRadius(dp(2));
        trackShape.setColor(Color.argb(20, 17, 17, 17));
        track.setBackground(trackShape);
        View seg = new View(this);
        GradientDrawable segShape = new GradientDrawable();
        segShape.setCornerRadius(dp(2));
        segShape.setColor(Color.argb(140, 17, 17, 17));
        seg.setBackground(segShape);
        track.addView(seg, new FrameLayout.LayoutParams(dp(16), dp(2)));
        LinearLayout.LayoutParams tp = new LinearLayout.LayoutParams(dp(56), dp(2));
        tp.topMargin = dp(20);
        track.setAlpha(0f);
        stack.addView(track, tp);

        splash.addView(stack, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        content = stack;
        mark = markBox;
        hero = heroView;
        loader = track;
        loader.setTag(seg);

        // 1. The illustration rises into place
        heroView.setAlpha(0f);
        heroView.setTranslationY(dp(28));
        heroView.setScaleX(0.94f);
        heroView.setScaleY(0.94f);
        heroView.animate().alpha(1f).translationY(0f).scaleX(1f).scaleY(1f).setStartDelay(60).setDuration(640).setInterpolator(EMPHASIZED).start();

        // 2. A paper plane flies out of his hand
        flyPlane(heroView, 520);

        // 3. The dot drops in, and the mark unfolds from it
        dot.setAlpha(0f);
        dot.setScaleX(0f);
        dot.setScaleY(0f);
        dot.setTranslationY(-dp(14));
        dot.animate().alpha(1f).scaleX(1f).scaleY(1f).translationY(0f)
            .setStartDelay(560).setDuration(400).setInterpolator(new OvershootInterpolator(2.2f)).start();
        handler.postDelayed(() -> {
            if (splash == null || !logo.isAttachedToWindow()) return;
            int cx = dotLp.leftMargin + dotSize / 2;
            int cy = dotLp.topMargin + dotSize / 2;
            float end = (float) Math.hypot(Math.max(cx, markSize - cx), Math.max(cy, markSize - cy));
            Animator reveal = ViewAnimationUtils.createCircularReveal(logo, cx, cy, dotSize / 2f, end);
            reveal.setDuration(480);
            reveal.setInterpolator(EMPHASIZED);
            reveal.addListener(new AnimatorListenerAdapter() {
                @Override
                public void onAnimationEnd(Animator animation) {
                    dot.setVisibility(View.GONE); // the logo has its own dot
                }
            });
            logo.setVisibility(View.VISIBLE);
            reveal.start();
        }, 880);

        // 4. The name types in, letter by letter
        for (int i = 0; i < word.getChildCount(); i++) {
            View l = word.getChildAt(i);
            l.setAlpha(0f);
            l.setTranslationY(dp(8));
            l.animate().alpha(1f).translationY(0f).setStartDelay(1000 + i * 28L).setDuration(340).setInterpolator(STANDARD).start();
        }
    }

    // ---------------------------------------------------------------- Dark: night glow
    private void buildDark() {
        final int markSize = dp(60);

        // A warm, soft glow behind the illustration
        View halo = new View(this);
        GradientDrawable g = new GradientDrawable();
        g.setShape(GradientDrawable.OVAL);
        g.setGradientType(GradientDrawable.RADIAL_GRADIENT);
        g.setGradientRadius(dp(210));
        g.setColors(new int[] { Color.argb(56, 255, 232, 205), Color.argb(16, 255, 232, 205), Color.argb(0, 255, 232, 205) });
        halo.setBackground(g);
        FrameLayout.LayoutParams hp = new FrameLayout.LayoutParams(dp(420), dp(420), Gravity.CENTER);
        hp.bottomMargin = dp(130); // centred on the illustration, which sits above the logo
        splash.addView(halo, hp);

        LinearLayout stack = new LinearLayout(this);
        stack.setOrientation(LinearLayout.VERTICAL);
        stack.setGravity(Gravity.CENTER_HORIZONTAL);

        View heroView = makeHero(dp(262));
        stack.addView(heroView);

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.splash_mark_dark); // light mark, whatever the phone's mode
        LinearLayout.LayoutParams mlp = new LinearLayout.LayoutParams(markSize, markSize);
        mlp.topMargin = dp(34);
        stack.addView(logo, mlp);

        TextView word = (TextView) makeName(false, Color.parseColor("#F4F4F6"));
        LinearLayout.LayoutParams wp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
        wp.topMargin = dp(16);
        stack.addView(word, wp);

        splash.addView(stack, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER));
        content = stack;
        mark = logo;
        hero = heroView;
        glow = halo;

        // 1. The glow lights up first
        halo.setAlpha(0f);
        halo.setScaleX(0.5f);
        halo.setScaleY(0.5f);
        halo.animate().alpha(1f).scaleX(1f).scaleY(1f).setDuration(900).setInterpolator(STANDARD).start();

        // 2. The illustration comes into focus: slightly large and faint, settling to size
        heroView.setAlpha(0f);
        heroView.setScaleX(1.12f);
        heroView.setScaleY(1.12f);
        heroView.animate().alpha(1f).scaleX(1f).scaleY(1f).setStartDelay(160).setDuration(760).setInterpolator(EMPHASIZED).start();

        // 3. The plane flies out
        flyPlane(heroView, 640);

        // 4. The mark focuses in, then the name tracks in
        logo.setAlpha(0f);
        logo.setScaleX(1.25f);
        logo.setScaleY(1.25f);
        logo.animate().alpha(1f).scaleX(1f).scaleY(1f).setStartDelay(760).setDuration(640).setInterpolator(EMPHASIZED).start();
        word.setAlpha(0f);
        word.animate().alpha(1f).setStartDelay(920).setDuration(560).setInterpolator(STANDARD).start();
        ValueAnimator track = ValueAnimator.ofFloat(0.42f, -0.02f);
        track.setStartDelay(920);
        track.setDuration(900);
        track.setInterpolator(EMPHASIZED);
        track.addUpdateListener(a -> word.setLetterSpacing((float) a.getAnimatedValue()));
        word.setLetterSpacing(0.42f);
        track.start();
        running.add(track);
    }

    // ---------------------------------------------------------------- Still loading
    private void startIdle() {
        if (splash == null || leaving) return;
        // The illustration floats gently
        if (hero != null) {
            heroFloat = ObjectAnimator.ofFloat(hero, View.TRANSLATION_Y, 0f, -dp(6));
            heroFloat.setDuration(1400);
            heroFloat.setRepeatMode(ValueAnimator.REVERSE);
            heroFloat.setRepeatCount(ValueAnimator.INFINITE);
            heroFloat.setInterpolator(STANDARD);
            heroFloat.start();
        }
        if (dark && glow != null) {
            // The glow breathes slowly
            idle = ObjectAnimator.ofPropertyValuesHolder(glow,
                PropertyValuesHolder.ofFloat(View.ALPHA, 1f, 0.6f),
                PropertyValuesHolder.ofFloat(View.SCALE_X, 1f, 1.08f),
                PropertyValuesHolder.ofFloat(View.SCALE_Y, 1f, 1.08f));
            idle.setDuration(1400);
            idle.setInterpolator(STANDARD);
        } else if (loader != null) {
            // A short segment glides along a hairline under the name
            loader.animate().alpha(1f).setDuration(240).start();
            View seg = (View) loader.getTag();
            idle = ObjectAnimator.ofFloat(seg, View.TRANSLATION_X, 0f, dp(56 - 16));
            idle.setDuration(700);
            idle.setInterpolator(new LinearInterpolator());
        }
        if (idle == null) return;
        idle.setRepeatMode(ValueAnimator.REVERSE);
        idle.setRepeatCount(ValueAnimator.INFINITE);
        idle.start();
    }

    // ---------------------------------------------------------------- Hand over to the app
    private boolean maybeLeave() {
        if (splash == null || leaving || !pageLoaded || !introDone) return false;
        leaving = true;
        if (idle != null) idle.cancel();
        if (heroFloat != null) heroFloat.cancel();
        // The illustration lifts away a beat before the logo, for depth
        if (hero != null) hero.animate().translationY(-dp(26)).alpha(0f).setStartDelay(0).setDuration(320).setInterpolator(EXIT).start();
        if (dark) {
            // The glow opens up and fades; the mark recedes
            if (glow != null) glow.animate().scaleX(2.4f).scaleY(2.4f).alpha(0f).setDuration(460).setInterpolator(STANDARD).start();
            mark.animate().scaleX(0.9f).scaleY(0.9f).setDuration(360).setInterpolator(EXIT).start();
            content.animate().alpha(0f).setStartDelay(80).setDuration(320).setInterpolator(EXIT).start();
            splash.animate().alpha(0f).setStartDelay(240).setDuration(300).withEndAction(this::removeSplash).start();
        } else {
            // Everything lifts slightly and fades into the white app
            content.animate().translationY(-dp(14)).alpha(0f).setStartDelay(80).setDuration(300).setInterpolator(EXIT).start();
            splash.animate().alpha(0f).setStartDelay(220).setDuration(260).withEndAction(this::removeSplash).start();
        }
        return true;
    }

    private void removeSplash() {
        if (splash == null) return;
        ViewGroup parent = (ViewGroup) splash.getParent();
        if (parent != null) parent.removeView(splash);
        splash = null;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacksAndMessages(null);
        if (idle != null) idle.cancel();
        if (heroFloat != null) heroFloat.cancel();
        for (Animator a : running) a.cancel();
        super.onDestroy();
    }
}
