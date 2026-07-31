# TODO: إصلاح مشكلتين

## ✅ المهمة 1: إصلاح الصوت في الإشعارات
- [x] إضافة دالة لتوليد صوت WAV كـ Blob URL
- [x] إضافة دالة تشغيل الصوت عبر Audio element كبديل
- [x] تحديث `playNotificationSound` لاستخدام كلا الطريقتين
- [x] تحسين `unlockAudioContext` لضمان فتح الصوت

## ✅ المهمة 2: إصلاح اختيار المنطقة لكل راكب
- [x] تغيير `selectedPickupRegion` من string إلى Record<string, string>
- [x] تحديث `handleRequestRide` لاستخدام المنطقة الخاصة بالراكب
- [x] تمرير المنطقة المحددة لكل راكب في Props
- [x] استخدام `trip.pickupRegionId` عند إعادة إرسال الطلب
