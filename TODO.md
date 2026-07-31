# سجل الإصلاحات — كابتن عز

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

## ✅ المهمة 3: إصلاح أخطاء تسجيل الدخول (Rate limited + Login failed)
- [x] إزالة العمود المحذوف `balance` من `fetchRiders()` في `supabaseService.ts`
- [x] إضافة `preferences` لـ fetch riders
- [x] إنشاء migration جديد: `supabase/migrations/20250715_fix_rls_login_bugs.sql`
  - إصلاح `driver_read_own` → السائق يقرأ سجله حتى لو PENDING
  - إصلاح `admin_read_all_drivers` → الإدمن يقرا كل السائقين
  - إصلاح `admin_read_admin` → أول تسجيل دخول للإدمن يعمل
- [x] تحديث `SQL_SCHEMA` ليشمل كل الأعمدة (auto_accept, auto_show_map, fcm_token, is_active)

## ✅ المهمة 4: مراجعة صفحات الراكب والسائق (Bug Fixes)
- [x] **DriverView**: إصلاح `isTripActive` — كان بيعرض كارت "الرحلة النشطة" الأزرق + التنبيه الأخضر مع بعض أثناء SEARCHING (قبل القبول). دلوقتي كارت الرحلة بيظهر فقط لما السائق يتعيّن على الرحلة.
- [x] **RiderView**: إصلاح `lastCalculatedRouteRef` — لو مزودي الخرائط فشلوا، كان بيفضل محطوط على الـ routeKey فمش بيتعاد حساب الطريق أبداً. دلوقتي بنعمل reset عشان يسمح بإعادة المحاولة.
- [x] **RiderView**: إصلاح مودال التأكيد ذو الخطوتين — كان dead code لأن `setShowConfirmModal(true)` مش متنداه. دلوقتي زر "اطلب كابتن عز الآن" بيفتح المودال (اختر المركبة → تأكيد السعر → إرسال).

## ✅ المهمة 5: البقاء في الصفحة بعد انتهاء الرحلة (بدون رجوع للـ HOME)
- [x] **App.tsx**: تعديل `handleTripCompleted` — كان بيرجع المستخدم لـ `HOME` بعد انتهاء الرحلة. دلوقتي:
  - السائق بيقعد في `DRIVER_DASHBOARD` جاهز يستقبل طلبات جديدة فوراً
  - الراكب بيقعد في `RIDER_DASHBOARD` جاهز يحجز رحلة جديدة
- [x] **DriverView**: تحديث زر الرحلة المكتملة من "🏠 العودة للصفحة الرئيسية" إلى "✅ متابعة واستقبال طلبات جديدة"
- [x] **RiderView**: تحديث زر الرحلة المكتملة من "🏠 العودة للصفحة الرئيسية" إلى "✅ متابعة وطلب رحلة جديدة"
- [x] **App.tsx**: إضافة NOTE توضيحية بجانب auto-complete timer توضح أن `handleTripCompleted` ما عدش بيرجع للـ HOME

