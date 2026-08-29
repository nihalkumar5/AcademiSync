                    <span>Sign In / Create Account</span>
                  </motion.button>
                </SignInButton>
              </div>
            </SignedOut>
          </div>

          {/* Appearance / Theme */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Appearance
              </h3>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Theme Preference</label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => updateSettings({ theme: 'light' })}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border transition-all text-sm font-bold ${
                    settings.theme === 'light'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Sun className="w-4 h-4" /> Light
                </button>
                <button
                  onClick={() => updateSettings({ theme: 'dark' })}
                  className={`flex-1 py-2.5 px-3 flex items-center justify-center gap-2 border transition-all text-sm font-bold ${
                    settings.theme === 'dark'
                      ? 'bg-black text-white dark:bg-white dark:text-black border-transparent'
                      : 'bg-transparent text-black/60 dark:text-white/60 border-black/20 dark:border-white/20 hover:border-black dark:hover:border-white hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Moon className="w-4 h-4" /> Dark
                </button>
              </div>
            </div>
          </div>

          {/* Notification Schedule */}
          <div className="glass-card p-6 flex flex-col gap-5">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <Bell className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Notification Engine
              </h3>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col gap-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Class Reminder</label>
                  <input
                    type="number"
                    min={5}
                    max={60}
                    value={classReminderMinutes}
                    onChange={(e) => setClassReminderMinutes(Number(e.target.value))}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Minutes before class</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Evening Bag Check</label>
                  <input
                    type="time"
                    value={eveningTime}
                    onChange={(e) => setEveningTime(e.target.value)}
                    className={inputClass}
                  />
                  <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Daily evening check</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className={labelClass}>Homework Early Warning</label>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={hwDays}
                  onChange={(e) => setHwDays(Number(e.target.value))}
                  className={inputClass}
                />
                <span className="text-[10px] text-black/40 dark:text-white/40 font-medium">Days before deadline</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  className="flex-1 py-2.5 rounded-none border border-black dark:border-white text-black dark:text-white text-xs font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  Update Schedule
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleTestNotification}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-none border border-black/30 dark:border-white/30 text-black dark:text-white text-xs font-semibold hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Test Closed-App Alert (5s)</span>
                </motion.button>
              </div>

              <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] border border-black/10 dark:border-white/10 flex items-start gap-2 text-[11px] text-black/60 dark:text-white/60">
                <Info className="w-4 h-4 text-[#8C6B5D] shrink-0 mt-0.5" />
                <span>
                  <strong>Tip for Android:</strong> If alarms don&apos;t sound when the app is swiped away, ensure App Info &rarr; Battery is set to &ldquo;Unrestricted&rdquo; and &ldquo;Allow alarms &amp; reminders&rdquo; is enabled in your phone Settings.
                </span>
              </div>
            </form>
          </div>

          {/* Backup & Privacy */}
          <div className="glass-card p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-black/20 dark:border-white/20">
              <div className="w-8 h-8 border border-black dark:border-white flex items-center justify-center text-black dark:text-white">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-sm font-bold text-black dark:text-white tracking-widest uppercase">
                Data & Storage
              </h3>
            </div>

            <p className="text-xs text-black/60 dark:text-white/60 leading-relaxed font-medium">
              Your academic timetable and tasks are encrypted and synced to your private account.
            </p>
