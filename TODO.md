# TODO - تحسين صوت التنبيهات للسائق

## المهام:
- [x] 1. رفع مستوى الصوت في `src/utils/notifications.ts`:
  - [x] رفع صوت `new_trip` من 0.45 إلى 0.9
  - [x] رفع صوت `notifyRideRequest` من 0.45 إلى 1.0  
  - [x] رفع صوت `generateRingtoneBlobUrl` من 0.5 إلى 1.0
  - [x] رفع صوت التنبيهات الاحتياطية (alert, trip_accepted, trip_completed)

- [x] 2. إضافة تنبيه صوتي قوي في `src/App.tsx` عند وصول رحلة جديدة للسائق (SEARCHING + currentOfferedDriverId)

- [ ] 3. اختبار الصوت بعد التعديلات

