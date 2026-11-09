package com.academisync.app.widget;

import android.content.Context;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Receives the next few days of classes from the app (lib/widget.ts) and refreshes the home-screen widget. */
@CapacitorPlugin(name = "WidgetBridge")
public class WidgetBridgePlugin extends Plugin {
    @PluginMethod
    public void update(PluginCall call) {
        String data = call.getString("data");
        if (data == null) {
            call.reject("data is required");
            return;
        }
        Context ctx = getContext();
        ctx.getSharedPreferences(NextClassWidget.PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(NextClassWidget.KEY, data)
            .apply();
        NextClassWidget.refreshAll(ctx);
        call.resolve();
    }
}
