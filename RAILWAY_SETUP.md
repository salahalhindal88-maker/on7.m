# إعداد البوت ولوحة الأسعار على Railway

## رفع المشروع

ارفع ملفات المشروع إلى مستودع GitHub خاص، أو انشره باستخدام Railway CLI. لا ترفع `config.json` أو مجلدات `node_modules`؛ ملف `.gitignore` يستثنيها تلقائيًا.

## إعداد الخدمة

1. أنشئ مشروعًا وخدمة من مستودع المشروع في Railway.
2. أضف Volume للخدمة، واجعل مسار الربط (Mount Path) هو `/data`.
3. أضف متغيرات الخدمة التالية:

   | المتغير | القيمة |
   | --- | --- |
   | `DISCORD_TOKEN` | رمز البوت الجديد من Discord Developer Portal |
   | `DASHBOARD_PASSWORD` | كلمة مرور عشوائية طويلة (20 حرفًا على الأقل) |
   | `DATABASE_PATH` | `/data/database.json` |
   | `CONFIG_DATABASE_PATH` | `/data/config_database.json` |

4. انشر المشروع. عند أول تشغيل، تُنسخ ملفات قاعدة البيانات المرفوعة مع المشروع إلى الـ Volume إذا لم تكن موجودة فيه.
5. من **Settings → Networking** أنشئ نطاق Railway للخدمة، مثل `your-service.up.railway.app`.
6. أضف متغيرًا:

   | المتغير | القيمة |
   | --- | --- |
   | `DASHBOARD_ORIGIN` | `https://your-service.up.railway.app` |

7. أعد تشغيل/نشر الخدمة، ثم افتح `https://your-service.up.railway.app` وسجّل الدخول بكلمة المرور.

Railway يضبط متغير `PORT` تلقائيًا، ويستخدمه خادم اللوحة. لا تضبط `DASHBOARD_HOST`؛ يستمع التطبيق على واجهة الشبكة العامة داخل Railway، بينما تبقى حماية HTTPS وتسجيل الدخول مطلوبة. شارك رابط اللوحة وكلمة المرور مع الأشخاص المسموح لهم فقط.

> إذا سبق نشر رمز البوت أو مشاركته، ألغِه وأنشئ رمزًا جديدًا قبل وضعه في `DISCORD_TOKEN`. لا تحفظ الرمز أو كلمة مرور اللوحة في ملفات المشروع أو مستودع GitHub.
