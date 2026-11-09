package com.academisync.app.widget;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.view.View;
import android.widget.RemoteViews;
import com.academisync.app.MainActivity;
import com.academisync.app.R;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * "Next class" home-screen widget.
 * The app sends the next 7 days of classes (cancellations, reschedules, extra classes and holidays
 * already applied). The widget works out what's on now / next by itself and wakes up when that
 * changes (class start, class end, midnight), so it stays right without the app being open.
 */
public class NextClassWidget extends AppWidgetProvider {
    public static final String PREFS = "intersemester_widget";
    public static final String KEY = "schedule";
    private static final String ACTION_TICK = "com.academisync.app.widget.TICK";
    private static final String[] WEEKDAYS = {"SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"};

    private static class Cls {
        String name;
        String room;
        int start;
        int end;
        int color;
    }

    private static class Day {
        String date;
        String off;
        List<Cls> classes = new ArrayList<>();
    }

    public static void refreshAll(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, NextClassWidget.class));
        if (ids != null && ids.length > 0) render(ctx, mgr, ids);
    }

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        render(ctx, mgr, ids);
    }

    @Override
    public void onReceive(Context ctx, Intent intent) {
        super.onReceive(ctx, intent);
        String action = intent.getAction();
        if (ACTION_TICK.equals(action)
            || Intent.ACTION_TIME_CHANGED.equals(action)
            || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            refreshAll(ctx);
        }
    }

    @Override
    public void onDisabled(Context ctx) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am != null) am.cancel(tickIntent(ctx));
    }

    // ---------- Rendering ----------

    static void render(Context ctx, AppWidgetManager mgr, int[] ids) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_next_class);

        Intent open = new Intent(ctx, MainActivity.class);
        open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pi = PendingIntent.getActivity(ctx, 0, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        v.setOnClickPendingIntent(R.id.widget_root, pi);

        Calendar now = Calendar.getInstance();
        long nowMs = now.getTimeInMillis();
        int nowMin = now.get(Calendar.HOUR_OF_DAY) * 60 + now.get(Calendar.MINUTE);
        String today = dateKey(now);
        long nextChange = nextMidnight(now);

        String json = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(KEY, null);
        List<Day> days = parse(json);

        int ink = ctx.getResources().getColor(R.color.widget_ink, null);
        v.setInt(R.id.widget_accent, "setBackgroundColor", ink);
        later(v, null, null, null);

        if (days == null) {
            show(v, "INTERSEMESTER", "Your next class", "Open the app once to show your timetable here.");
        } else {
            int ti = -1;
            for (int i = 0; i < days.size(); i++) {
                if (today.equals(days.get(i).date)) { ti = i; break; }
            }
            Day td = ti >= 0 ? days.get(ti) : null;
            boolean done = false;

            if (td != null && td.off != null) {
                show(v, "TODAY", td.off, "No classes today");
                Day nd = nextDayWithClasses(days, ti + 1);
                if (nd != null) {
                    later(v, label(nd, now).substring(0, 1) + label(nd, now).substring(1).toLowerCase(Locale.ROOT),
                        row(nd.classes, 0), row(nd.classes, 1));
                }
                done = true;
            } else if (td != null && !td.classes.isEmpty()) {
                Cls cur = null;
                Cls next = null;
                int idx = -1;
                for (int i = 0; i < td.classes.size(); i++) {
                    Cls c = td.classes.get(i);
                    if (c.start <= nowMin && nowMin < c.end) { cur = c; idx = i; break; }
                    if (c.start > nowMin) { next = c; idx = i; break; }
                }
                if (cur != null) {
                    v.setInt(R.id.widget_accent, "setBackgroundColor", cur.color);
                    show(v, "NOW · ENDS " + time(cur.end), cur.name, sub(cur));
                    later(v, "Later today", row(td.classes, idx + 1), row(td.classes, idx + 2));
                    nextChange = Math.min(nextChange, at(now, cur.end));
                    done = true;
                } else if (next != null) {
                    int mins = next.start - nowMin;
                    String when = mins <= 90 ? "NEXT · IN " + duration(mins) : "NEXT · " + time(next.start);
                    v.setInt(R.id.widget_accent, "setBackgroundColor", next.color);
                    show(v, when, next.name, sub(next));
                    later(v, "Later today", row(td.classes, idx + 1), row(td.classes, idx + 2));
                    long startAt = at(now, next.start);
                    // Keep the "in 25 min" countdown fresh
                    nextChange = Math.min(nextChange, mins <= 90 ? Math.min(startAt, nowMs + 10 * 60 * 1000L) : Math.min(startAt, at(now, next.start - 90)));
                    done = true;
                }
            }

            if (!done) {
                Day nd = nextDayWithClasses(days, ti + 1);
                boolean hadToday = td != null && !td.classes.isEmpty();
                if (nd != null) {
                    Cls f = nd.classes.get(0);
                    v.setInt(R.id.widget_accent, "setBackgroundColor", f.color);
                    show(v, label(nd, now) + " · " + time(f.start), f.name, sub(f));
                    later(v, hadToday ? "Done for today · then" : "Then", row(nd.classes, 1), row(nd.classes, 2));
                } else {
                    show(v, "THIS WEEK", "No classes coming up", "Enjoy the break");
                }
            }
        }

        for (int id : ids) mgr.updateAppWidget(id, v);
        scheduleTick(ctx, Math.max(nextChange, nowMs + 60 * 1000L));
    }

    private static void show(RemoteViews v, String label, String title, String sub) {
        v.setTextViewText(R.id.widget_label, label);
        v.setTextViewText(R.id.widget_title, title);
        v.setTextViewText(R.id.widget_sub, sub);
        v.setViewVisibility(R.id.widget_sub, sub == null || sub.isEmpty() ? View.GONE : View.VISIBLE);
    }

    private static void later(RemoteViews v, String header, String a, String b) {
        boolean any = header != null && (a != null || b != null);
        v.setViewVisibility(R.id.widget_later_header, any ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.widget_later_header, any ? header : "");
        v.setViewVisibility(R.id.widget_later1, any && a != null ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.widget_later1, a != null ? a : "");
        v.setViewVisibility(R.id.widget_later2, any && b != null ? View.VISIBLE : View.GONE);
        v.setTextViewText(R.id.widget_later2, b != null ? b : "");
    }

    private static String row(List<Cls> list, int i) {
        if (i < 0 || i >= list.size()) return null;
        Cls c = list.get(i);
        return time(c.start) + "   " + c.name;
    }

    private static String sub(Cls c) {
        String t = time(c.start) + " – " + time(c.end);
        return c.room == null || c.room.isEmpty() ? t : t + " · " + c.room;
    }

    private static Day nextDayWithClasses(List<Day> days, int from) {
        for (int i = Math.max(0, from); i < days.size(); i++) {
            Day d = days.get(i);
            if (d.off == null && !d.classes.isEmpty()) return d;
        }
        return null;
    }

    private static String label(Day d, Calendar now) {
        Calendar t = (Calendar) now.clone();
        t.add(Calendar.DAY_OF_YEAR, 1);
        if (dateKey(t).equals(d.date)) return "TOMORROW";
        try {
            String[] p = d.date.split("-");
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(p[0]), Integer.parseInt(p[1]) - 1, Integer.parseInt(p[2]));
            return WEEKDAYS[c.get(Calendar.DAY_OF_WEEK) - 1];
        } catch (Exception e) {
            return "NEXT";
        }
    }

    // ---------- Helpers ----------

    private static List<Day> parse(String json) {
        if (json == null) return null;
        try {
            JSONArray arr = new JSONObject(json).getJSONArray("days");
            List<Day> out = new ArrayList<>();
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                Day d = new Day();
                d.date = o.optString("date", "");
                String off = o.optString("off", "");
                d.off = off.isEmpty() ? null : off;
                JSONArray cs = o.optJSONArray("classes");
                if (cs != null) {
                    for (int j = 0; j < cs.length(); j++) {
                        JSONObject x = cs.getJSONObject(j);
                        Cls c = new Cls();
                        c.name = x.optString("name", "Class");
                        c.room = x.optString("room", "");
                        c.start = x.optInt("start", 0);
                        c.end = x.optInt("end", c.start + 55);
                        try {
                            c.color = Color.parseColor(x.optString("color", "#111111"));
                        } catch (Exception e) {
                            c.color = Color.parseColor("#111111");
                        }
                        d.classes.add(c);
                    }
                }
                out.add(d);
            }
            return out;
        } catch (Exception e) {
            return null;
        }
    }

    private static String dateKey(Calendar c) {
        return String.format(Locale.ROOT, "%04d-%02d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    private static String time(int minutes) {
        int h = (minutes / 60) % 24;
        int m = minutes % 60;
        int h12 = h % 12 == 0 ? 12 : h % 12;
        return String.format(Locale.ROOT, "%d:%02d %s", h12, m, h < 12 ? "AM" : "PM");
    }

    private static String duration(int mins) {
        if (mins < 60) return mins + " MIN";
        int h = mins / 60;
        int m = mins % 60;
        return m == 0 ? h + " H" : h + " H " + m + " MIN";
    }

    private static long at(Calendar now, int minutes) {
        Calendar c = (Calendar) now.clone();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 5);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTimeInMillis() + minutes * 60 * 1000L;
    }

    private static long nextMidnight(Calendar now) {
        return at(now, 24 * 60);
    }

    private static PendingIntent tickIntent(Context ctx) {
        Intent i = new Intent(ctx, NextClassWidget.class).setAction(ACTION_TICK);
        return PendingIntent.getBroadcast(ctx, 1, i, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void scheduleTick(Context ctx, long atMs) {
        AlarmManager am = (AlarmManager) ctx.getSystemService(Context.ALARM_SERVICE);
        if (am == null) return;
        am.setAndAllowWhileIdle(AlarmManager.RTC, atMs, tickIntent(ctx));
    }
}
