import React, { useState, useEffect } from 'react';
import { NotificationSettings as NotificationSettingsType, loadNotificationSettings, saveNotificationSettings, getDefaultSettings } from '../utils/notificationSettings';

interface NotificationSettingsProps {
  lang: 'ar' | 'en';
  onSettingsChange?: (settings: NotificationSettingsType) => void;
}

const NotificationSettings: React.FC<NotificationSettingsProps> = ({ lang, onSettingsChange }) => {
  const [settings, setSettings] = useState<NotificationSettingsType>(loadNotificationSettings());
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    saveNotificationSettings(settings);
    onSettingsChange?.(settings);
  }, [settings]);

  const updateSetting = <K extends keyof NotificationSettingsType>(key: K, value: NotificationSettingsType[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const resetToDefaults = () => {
    setSettings(getDefaultSettings());
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 z-50 bg-slate-800 text-white p-3 rounded-full shadow-lg hover:bg-slate-700 transition-colors"
        title={lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {lang === 'ar' ? 'إعدادات الإشعارات' : 'Notification Settings'}
            </h2>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'ar' ? 'تفعيل الإشعارات' : 'Enable Notifications'}
              </label>
              <button
                role="switch"
                aria-checked={settings.enabled}
                onClick={() => updateSetting('enabled', !settings.enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'ar' ? 'تنبيهات صوتية' : 'Sound Alerts'}
              </label>
              <button
                role="switch"
                aria-checked={settings.sound}
                onClick={() => updateSetting('sound', !settings.sound)}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.sound ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.sound ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'ar' ? 'اهتزاز' : 'Vibration'}
              </label>
              <button
                role="switch"
                aria-checked={settings.vibration}
                onClick={() => updateSetting('vibration', !settings.vibration)}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.vibration ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.vibration ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {lang === 'ar' ? 'نطق النصوص' : 'Speech Synthesis'}
              </label>
              <button
                role="switch"
                aria-checked={settings.speech}
                onClick={() => updateSetting('speech', !settings.speech)}
                disabled={!settings.enabled}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  settings.speech ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                } ${!settings.enabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    settings.speech ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {lang === 'ar' ? 'مستوى الصوت' : 'Volume'}
                </label>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {Math.round(settings.volume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={settings.volume}
                onChange={(e) => updateSetting('volume', parseFloat(e.target.value))}
                disabled={!settings.enabled || !settings.sound}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 disabled:opacity-50"
              />
            </div>

            <div className="pt-4 flex gap-2">
              <button
                onClick={resetToDefaults}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                {lang === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {lang === 'ar' ? 'حفظ' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSettings;
