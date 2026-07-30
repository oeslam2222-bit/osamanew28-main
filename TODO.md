# TODO: إصلاح مشكلتين

## ✅ المهمة 1: إصلاح الصوت في الإشعارات
- [ ] إضافة دالة لتوليد صوت WAV كـ Blob URL
- [ ] إضافة دالة تشغيل الصوت عبر Audio element كبديل
- [ ] تحديث `playNotificationSound` لاستخدام كلا الطريقتين
- [ ] تحسين `unlockAudioContext` لضمان فتح الصوت

## ✅ المهمة 2: إصلاح اختيار المنطقة لكل راكب
- [ ] تغيير `selectedPickupRegion` من string إلى Record<string, string>
- [ ] تحديث `handleRequestRide` لاستخدام المنطقة الخاصة بالراكب
- [ ] تمرير المنطقة المحددة لكل راكب في Props
