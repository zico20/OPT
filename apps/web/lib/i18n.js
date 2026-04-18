export const SUPPORTED_LOCALES = ["en", "ar", "tr"];

const META = {
  en: { label: "EN", dir: "ltr" },
  ar: { label: "AR", dir: "rtl" },
  tr: { label: "TR", dir: "ltr" }
};

const RISK = {
  en: { "Very Low": "Very Low", Low: "Low", Medium: "Medium", High: "High", "Very High": "Very High" },
  ar: { "Very Low": "منخفض جدا", Low: "منخفض", Medium: "متوسط", High: "مرتفع", "Very High": "مرتفع جدا" },
  tr: { "Very Low": "Cok Dusuk", Low: "Dusuk", Medium: "Orta", High: "Yuksek", "Very High": "Cok Yuksek" }
};

const SEVERITY = {
  en: { Critical: "Critical", Warning: "Warning", Watch: "Watch" },
  ar: { Critical: "حرج", Warning: "تحذير", Watch: "مراقبة" },
  tr: { Critical: "Kritik", Warning: "Uyari", Watch: "Izleme" }
};

const MESSAGES = {
  en: {
    appName: "HazardSignal",
    nav: { dashboard: "Dashboard", alerts: "Alerts", map: "Map", methodology: "Methodology", admin: "Admin" },
    common: {
      back: "Back to dashboard",
      openAdmin: "Open admin",
      recentAlerts: "Recent alerts",
      openEe: "Open Earth Engine App",
      note: "Operational note",
      notFound: "District not found",
      backToTop: "Top",
      decisionSupport: "HazardSignal is a decision-support tool and does not replace official emergency or civil defense instructions.",
      subscribeTelegram: "Get Telegram alerts",
      subscribeTelegramShort: "Telegram",
      subscribeHint: "Tap, start the bot, and alerts will reach you directly.",
      subscribeStep1: "Open the official bot in Telegram",
      subscribeStep2: "Press Start once",
      subscribeStep3: "Receive future fire-risk alerts automatically"
    },
    home: {
      eyebrow: "Operational Hazard Platform",
      intro: "Daily wildfire signals for Antalya with a mobile-first operational view.",
      lastRun: "Last run date",
      model: "Selected model",
      threshold: "Selected threshold",
      criticalDistricts: "Critical districts",
      mapTitle: "Live operational map",
      mapDesc: "District circles show risk. Red points show 24h FIRMS detections.",
      snapshot: "Run snapshot",
      legend: "Legend",
      downloads: "Downloads",
      leaderboard: "District risk leaderboard",
      district: "District",
      classLabel: "Dominant class",
      maxProb: "Peak probability",
      highArea: "High-risk area",
      hotspots: "Hotspots",
      feed: "Recent alert feed",
      probability: "Probability",
      area: "Area",
      activeFireDistricts: "Districts with active fires",
      subscriptionTitle: "Public alert subscription",
      subscriptionBody: "Anyone can subscribe to Telegram alerts without contacting the admin team.",
      watchTitle: "What the public site offers",
      watchItem1: "Daily district-level fire-risk updates",
      watchItem2: "Operational map with live hotspot overlay",
      watchItem3: "Public Telegram subscription for new alerts",
      briefEyebrow: "Today at a glance",
      briefTitle: "Operational brief for the current run",
      briefBody: "Use this page to scan the current mission state, identify the district drawing the most attention, and move into the live map or alert stream without losing context.",
      briefWarnings: "Warning districts",
      toolsEyebrow: "Move from context to action",
      toolsTitle: "Use the platform as an operational guide",
      toolsBody: "HazardSignal works best when the summary, live map, district priorities, and subscription workflow are read together instead of as isolated widgets.",
      toolMapTitle: "Scan the live map",
      toolMapBody: "Look for clustered circles, district spread, and any change in priority before drilling deeper.",
      toolBoardTitle: "Review district priorities",
      toolBoardBody: "Use the leaderboard and alert feed to decide which districts deserve closer monitoring first.",
      toolMethodTitle: "Ground the signal",
      toolMethodBody: "Open the methodology page when you need to explain what the model means and what it does not claim.",
      workflowEyebrow: "How risk escalates",
      workflowTitle: "From monitoring to incident mode",
      workflowBody: "The interface is designed to shift with the signal itself: broad monitoring first, escalation when pressure builds, and incident emphasis once active detections or concentrated risk appear.",
      ctaMap: "Open live map",
      ctaAlerts: "Open alert feed",
      ctaMethod: "Read methodology"
    },
    alerts: {
      eyebrow: "Alert Operations",
      title: "Recent Telegram alerts",
      intro: "Public alert stream generated from district risk and active detections.",
      feedTitle: "Alert feed for run",
      maxProb: "Peak probability",
      highArea: "High-risk area",
      hotspots: "Hotspots",
      status: "Status",
      sent: "Sent",
      noteBody: "District-based Telegram alerts for operations audience.",
      subscribeTitle: "Subscribe in Telegram",
      subscribeBody: "Open the bot, press Start, and the system will register your chat automatically."
    },
    admin: {
      eyebrow: "Admin Operations",
      title: "Alert rule control center",
      intro: "Manage Telegram workflow and threshold rules.",
      signalTest: "Signal Test",
      subscribersLabel: "Subscribers",
      ruleEngine: "Rule Engine",
      total: "Total",
      enabled: "Enabled",
      sendTestTitle: "Send test alert",
      sendTestBody: "Send a real Telegram test alert to default chat.",
      sendTestBtn: "Send live Telegram test alert",
      addSubTitle: "Add subscriber",
      channel: "Channel type",
      chatId: "Chat ID",
      scope: "District scope",
      scopePlaceholder: "all or district id",
      addSubBtn: "Add subscriber",
      rulesTitle: "Alert rules",
      watchMin: "Watch probability minimum",
      warningMin: "Warning probability minimum",
      areaMin: "High-risk area minimum (%)",
      hotMin: "Critical hotspot minimum",
      updateBtn: "Update rules",
      logout: "Log out",
      loginEyebrow: "Restricted admin access",
      loginTitle: "Enter the admin control room",
      loginIntro: "This area is private. Sign in before changing alert rules or managing subscribers.",
      password: "Admin password",
      passwordPlaceholder: "Enter the admin password",
      loginBtn: "Open admin",
      signingIn: "Signing in...",
      loginError: "The password is incorrect or the request failed.",
      securityTitle: "Why this page is protected",
      securityItem1: "Admin tools are no longer exposed in public navigation.",
      securityItem2: "Every admin API route now requires an authenticated session.",
      securityItem3: "Use a strong password and rotate it before the official launch.",
      configMissingTitle: "Admin credentials are missing",
      configMissingBody: "Set ADMIN_DASHBOARD_PASSWORD and ADMIN_SESSION_SECRET on the server before using the admin dashboard."
    },
    district: {
      eyebrow: "District Intelligence",
      intro: "Detailed district view with history and related alerts.",
      dominantClass: "Dominant class",
      maxProb: "Peak probability",
      highArea: "High-risk area",
      hotspots24h: "Hotspots (24h)",
      history: "Run history",
      date: "Date",
      meanRisk: "Mean risk",
      related: "Related alerts",
      noAlerts: "No alerts recorded for this district.",
      probability: "Probability",
      area: "Area",
      hotspots: "Hotspots"
    },
    methodology: {
      eyebrow: "Operational Methodology",
      title: "How HazardSignal builds each daily risk picture",
      intro: "This page explains the daily inputs, what risk probability represents, and the limits of the model.",
      inputsTitle: "Core inputs",
      inputsLead: "Each run combines satellite, weather, terrain, and recent fire activity layers for Antalya districts.",
      input1: "Satellite indicators such as land surface temperature, vegetation stress, and night-light activity.",
      input2: "Meteorological signals including air temperature, humidity, wind speed, and precipitation.",
      input3: "Static context such as elevation, slope, land cover, settlement proximity, and historical fire corridors.",
      probabilityTitle: "What risk probability means",
      probabilityLead: "Risk probability is the model estimate that local conditions resemble fire-prone patterns for the current run window.",
      probability1: "Higher values mean stronger alignment with recent fire-conducive conditions.",
      probability2: "District summaries aggregate local pixels into a district-level operational signal.",
      probability3: "The platform combines probability, area coverage, and hotspot detections when forming alerts.",
      notTitle: "What the model does not mean",
      notLead: "The signal should not be interpreted as a guaranteed fire event or a substitute for field command.",
      not1: "It does not confirm that a wildfire will occur at a specific place and time.",
      not2: "It does not replace civil defense, forestry, municipal, or emergency authority instructions.",
      not3: "It should be used with live observations, local reporting, and official incident procedures.",
      noteTitle: "Decision-support note"
    },
    mission: {
      label: "Mission mode",
      focus: "Priority focus",
      states: {
        monitoring: {
          title: "Monitoring",
          body: "Routine daily scanning. No active incident signal is dominating the public view."
        },
        escalation: {
          title: "Escalation",
          body: "Elevated risk is building. Critical districts or warning-level signals require closer operational attention."
        },
        incident: {
          title: "Incident",
          body: "Active detections or dense hotspots are present. The interface shifts into incident emphasis automatically."
        }
      }
    },
    map: {
      districtRisk: "District risk",
      activeFires: "Active fires (24h)",
      legendTitle: "Signal legend",
      opsView: "Operations map",
      riskClass: "Risk class",
        maxProb: "Peak probability",
      highArea: "High/very-high area",
      hotspots: "Hotspots (24h)",
      source: "Source",
      confidence: "Confidence",
      detected: "Detected"
    }
  },
  ar: {
    appName: "HazardSignal",
    nav: { dashboard: "لوحة القيادة", alerts: "التنبيهات", map: "الخريطة", methodology: "المنهجية", admin: "الادارة" },
    common: {
      back: "العودة للوحة القيادة",
      openAdmin: "فتح الادارة",
      recentAlerts: "اخر التنبيهات",
      openEe: "فتح تطبيق Earth Engine",
      note: "ملاحظة تشغيلية",
      notFound: "القضاء غير موجود",
      backToTop: "اعلى",
      decisionSupport: "HazardSignal أداة دعم قرار ولا تحل محل تعليمات الجهات الرسمية أو الدفاع المدني.",
      subscribeTelegram: "استقبال تنبيهات تيليجرام",
      subscribeTelegramShort: "تيليجرام",
      subscribeHint: "اضغط، ابدأ البوت، وستصل التنبيهات مباشرة إلى تيليجرام.",
      subscribeStep1: "افتح البوت الرسمي في تيليجرام",
      subscribeStep2: "اضغط Start مرة واحدة",
      subscribeStep3: "استقبل تنبيهات مخاطر الحرائق تلقائيًا"
    },
    home: {
      eyebrow: "منصة تشغيلية للمخاطر",
      intro: "إشارات يومية سريعة لمخاطر حرائق أنطاليا بواجهة تشغيلية للموبايل.",
      lastRun: "تاريخ اخر تشغيل",
      model: "النموذج المختار",
      threshold: "العتبة المختارة",
      criticalDistricts: "الاقضية الحرجة",
      mapTitle: "الخريطة التشغيلية المباشرة",
      mapDesc: "الدوائر تلخص خطر الاقضية والنقاط الحمراء لرصد 24 ساعة.",
      snapshot: "ملخص التشغيل",
      legend: "المفتاح",
      downloads: "التنزيلات",
      leaderboard: "ترتيب الاقضية",
      district: "القضاء",
      classLabel: "الفئة المهيمنة",
      maxProb: "اعلى قيمة احتمال",
      highArea: "مساحة الخطر العالي",
      hotspots: "النقاط الساخنة",
      feed: "اخر سجل التنبيهات",
      probability: "الاحتمال",
      area: "المساحة",
      activeFireDistricts: "اقضية فيها حرائق نشطة",
      subscriptionTitle: "اشتراك الجمهور بالتنبيهات",
      subscriptionBody: "يمكن لأي مستخدم الاشتراك بتنبيهات تيليجرام بدون الرجوع للإدارة.",
      watchTitle: "ما الذي يقدمه الموقع الآن",
      watchItem1: "تحديث يومي لمخاطر الحرائق على مستوى القضاء",
      watchItem2: "خريطة تشغيلية مع نقاط الحرارة الحديثة",
      watchItem3: "اشتراك عام بتنبيهات تيليجرام",
      briefEyebrow: "ملخص اليوم",
      briefTitle: "إحاطة تشغيلية سريعة للتشغيل الحالي",
      briefBody: "استخدم هذه الصفحة لالتقاط وضع المهمة الحالي، ومعرفة القضاء الذي يجذب الانتباه أولاً، ثم الانتقال إلى الخريطة المباشرة أو سجل التنبيهات بدون فقدان السياق.",
      briefWarnings: "اقضية التحذير",
      toolsEyebrow: "من الفهم إلى الفعل",
      toolsTitle: "استخدم المنصة كدليل تشغيل",
      toolsBody: "تعمل HazardSignal بشكل أفضل عندما تُقرأ الخلاصة والخريطة الحية وأولويات الأقضية والاشتراك بالتنبيهات كوحدة واحدة، لا كعناصر منفصلة.",
      toolMapTitle: "افتح الخريطة المباشرة",
      toolMapBody: "ابحث عن تجمع الدوائر واتساع الخطر بين الأقضية وأي تغير في الأولوية قبل الدخول في التفاصيل.",
      toolBoardTitle: "راجع أولويات الأقضية",
      toolBoardBody: "استخدم جدول الأولويات وسجل التنبيهات لمعرفة أي الأقضية تحتاج متابعة أقرب أولاً.",
      toolMethodTitle: "اربط الإشارة بالمنهجية",
      toolMethodBody: "افتح صفحة المنهجية عندما تحتاج شرح معنى النموذج وحدود ما يدّعيه أمام المستخدمين أو الفريق.",
      workflowEyebrow: "كيف يتصاعد الخطر",
      workflowTitle: "من المراقبة إلى وضع الحادث",
      workflowBody: "الواجهة تتحرك مع الإشارة نفسها: تبدأ بمراقبة واسعة، ثم تصعيد عندما يتزايد الضغط، ثم وضع حادث عندما تظهر نقاط فعالة أو خطر متجمع.",
      ctaMap: "افتح الخريطة المباشرة",
      ctaAlerts: "افتح سجل التنبيهات",
      ctaMethod: "اقرأ المنهجية"
    },
    alerts: {
      eyebrow: "تشغيل التنبيهات",
      title: "اخر تنبيهات تيليجرام",
      intro: "سجل عام مبني على مخاطر الاقضية والرصد الفعلي.",
      feedTitle: "سجل التنبيهات لتشغيل",
      maxProb: "اعلى قيمة احتمال",
      highArea: "مساحة الخطر العالي",
      hotspots: "النقاط الساخنة",
      status: "الحالة",
      sent: "وقت الارسال",
      noteBody: "تنبيهات تيليجرام على مستوى القضاء لفريق العمليات.",
      subscribeTitle: "الاشتراك عبر تيليجرام",
      subscribeBody: "افتح البوت، اضغط Start، وسيتم تسجيل محادثتك تلقائيًا."
    },
    admin: { eyebrow: "ادارة التشغيل", title: "مركز التحكم بقواعد التنبيه", intro: "ادارة سير تنبيهات تيليجرام وتحديث العتبات.", signalTest: "اختبار الاشارة", subscribersLabel: "المشتركون", ruleEngine: "محرك القواعد", total: "الاجمالي", enabled: "المفعّل", sendTestTitle: "ارسال تنبيه تجريبي", sendTestBody: "ارسال تنبيه حقيقي للمحادثة الافتراضية.", sendTestBtn: "ارسال تنبيه تجريبي", addSubTitle: "اضافة مشترك", channel: "نوع القناة", chatId: "معرف المحادثة", scope: "نطاق القضاء", scopePlaceholder: "all او معرف القضاء", addSubBtn: "اضافة مشترك", rulesTitle: "قواعد التنبيه", watchMin: "الحد الادنى للمراقبة", warningMin: "الحد الادنى للتحذير", areaMin: "الحد الادنى لمساحة الخطر (%)", hotMin: "الحد الادنى للنقاط الحرجة", updateBtn: "تحديث القواعد", logout: "تسجيل الخروج", loginEyebrow: "وصول اداري مقيد", loginTitle: "ادخل إلى غرفة التحكم", loginIntro: "هذه المنطقة خاصة. سجل الدخول قبل تعديل قواعد التنبيه أو إدارة المشتركين.", password: "كلمة مرور الادارة", passwordPlaceholder: "ادخل كلمة مرور الادارة", loginBtn: "فتح الادارة", signingIn: "جاري تسجيل الدخول...", loginError: "كلمة المرور غير صحيحة أو فشل الطلب.", securityTitle: "لماذا هذه الصفحة محمية", securityItem1: "أدوات الإدارة لم تعد ظاهرة في التنقل العام.", securityItem2: "كل واجهات API الإدارية أصبحت تتطلب جلسة مصادق عليها.", securityItem3: "استخدم كلمة مرور قوية وغيّرها قبل الإطلاق الرسمي.", configMissingTitle: "بيانات الإدارة غير مضبوطة", configMissingBody: "اضبط ADMIN_DASHBOARD_PASSWORD و ADMIN_SESSION_SECRET على الخادم قبل استخدام لوحة الإدارة." },
    district: { eyebrow: "تحليل القضاء", intro: "عرض تفصيلي لحالة القضاء الحالية مع سجل التنبيهات.", dominantClass: "الفئة المهيمنة", maxProb: "اعلى قيمة احتمال", highArea: "مساحة الخطر العالي", hotspots24h: "النقاط الساخنة (24 ساعة)", history: "سجل التشغيل", date: "التاريخ", meanRisk: "متوسط الخطر", related: "التنبيهات المرتبطة", noAlerts: "لا توجد تنبيهات مسجلة لهذا القضاء.", probability: "الاحتمال", area: "المساحة", hotspots: "النقاط الساخنة" },
    methodology: {
      eyebrow: "المنهجية التشغيلية",
      title: "كيف يبني HazardSignal صورة الخطر اليومية",
      intro: "تشرح هذه الصفحة المدخلات اليومية، ومعنى احتمال الخطر، وما الذي لا يدعيه النموذج.",
      inputsTitle: "المدخلات الأساسية",
      inputsLead: "كل تشغيل يجمع بين صور الأقمار الصناعية والطقس والتضاريس والنشاط الناري الحديث على مستوى أقضية أنطاليا.",
      input1: "مؤشرات فضائية مثل حرارة السطح وإجهاد الغطاء النباتي والنشاط الليلي.",
      input2: "إشارات جوية مثل الحرارة والرطوبة وسرعة الرياح والهطول.",
      input3: "عوامل ثابتة مثل الارتفاع والانحدار والغطاء الأرضي والقرب من التجمعات والممرات التاريخية للحرائق.",
      probabilityTitle: "ماذا يعني risk probability",
      probabilityLead: "احتمال الخطر هو تقدير النموذج لمدى تشابه الظروف الحالية مع أنماط مرتبطة بخطر الحريق ضمن نافذة التشغيل الحالية.",
      probability1: "القيم الأعلى تعني ظروفًا أقرب إلى البيئات المعرضة لاشتعال الحرائق.",
      probability2: "ملخص القضاء يجمع إشارات البكسلات المحلية في مؤشر تشغيلي على مستوى القضاء.",
      probability3: "المنصة لا تعتمد على الاحتمال وحده، بل تدمجه مع المساحة عالية الخطر والنقاط الساخنة عند إصدار التنبيهات.",
      notTitle: "ما الذي لا يعنيه النموذج",
      notLead: "هذه الإشارة ليست تأكيدًا لوقوع حريق وليست بديلًا عن القيادة الميدانية.",
      not1: "لا تؤكد أن حريقًا سيقع في مكان ووقت محددين.",
      not2: "لا تستبدل تعليمات الدفاع المدني أو الغابات أو البلديات أو الجهات الرسمية.",
      not3: "يجب استخدامها مع الرصد المباشر والتقارير المحلية وإجراءات الحوادث الرسمية.",
      noteTitle: "ملاحظة دعم القرار"
    },
    mission: {
      label: "وضع المهمة",
      focus: "منطقة التركيز",
      states: {
        monitoring: {
          title: "مراقبة",
          body: "المشهد حاليًا في نطاق المتابعة اليومية الاعتيادية ولا يهيمن حادث نشط على الواجهة."
        },
        escalation: {
          title: "تصعيد",
          body: "الخطر يرتفع حاليًا، وهناك إشارات تتطلب انتباهًا تشغيليًا أكبر."
        },
        incident: {
          title: "حادث",
          body: "هناك رصد فعلي أو كثافة نقاط ساخنة، لذلك تنتقل الواجهة تلقائيًا إلى وضع أكثر حدة."
        }
      }
    },
    map: { districtRisk: "خطر القضاء", activeFires: "الحرائق النشطة (24 ساعة)", legendTitle: "مفتاح الاشارات", opsView: "خريطة العمليات", riskClass: "فئة الخطر", maxProb: "اعلى قيمة احتمال", highArea: "مساحة عالي/عالي جدا", hotspots: "النقاط الساخنة (24 ساعة)", source: "المصدر", confidence: "الثقة", detected: "وقت الرصد" }
  },
  tr: {
    appName: "HazardSignal",
    nav: { dashboard: "Kontrol Paneli", alerts: "Uyarilar", map: "Harita", methodology: "Metodoloji", admin: "Yonetim" },
    common: { back: "Panele don", openAdmin: "Yonetimi ac", recentAlerts: "Son uyarilar", openEe: "Earth Engine Uygulamasini Ac", note: "Operasyon notu", notFound: "Ilce bulunamadi", backToTop: "Uste", decisionSupport: "HazardSignal bir karar-destek aracidir; resmi acil durum veya sivil savunma talimatlarinin yerine gecmez.", subscribeTelegram: "Telegram uyari al", subscribeTelegramShort: "Telegram", subscribeHint: "Dokun, botu baslat ve uyarilar dogrudan Telegram'a gelsin.", subscribeStep1: "Resmi Telegram botunu ac", subscribeStep2: "Bir kez Start tusuna bas", subscribeStep3: "Yeni yangin risk uyarilarini otomatik al" },
    home: { eyebrow: "Operasyonel Risk Platformu", intro: "Antalya icin gunluk yangin sinyalleri, mobil odakli operasyon gorunumuyle.", lastRun: "Son calisma tarihi", model: "Secilen model", threshold: "Secilen esik", criticalDistricts: "Kritik ilceler", mapTitle: "Canli operasyon haritasi", mapDesc: "Ilce daireleri riski, kirmizi noktalar son 24 saat tespitlerini gosterir.", snapshot: "Calisma ozeti", legend: "Lejant", downloads: "Indirmeler", leaderboard: "Ilce risk siralamasi", district: "Ilce", classLabel: "Baskin sinif", maxProb: "Tepe olasilik", highArea: "Yuksek risk alani", hotspots: "Hotspot", feed: "Son uyari akisi", probability: "Olasilik", area: "Alan", activeFireDistricts: "Aktif yanginli ilceler", subscriptionTitle: "Herkese acik Telegram aboneligi", subscriptionBody: "Kullanicilar yonetime yazmadan Telegram uyarilarina abone olabilir.", watchTitle: "Site simdi ne sunuyor", watchItem1: "Ilce bazli gunluk yangin risk guncellemeleri", watchItem2: "Yeni hotspot katmanli operasyon haritasi", watchItem3: "Herkese acik Telegram uyari aboneligi", briefEyebrow: "Bugunun ozeti", briefTitle: "Guncel calisma icin operasyon ozet notu", briefBody: "Bu sayfayi mevcut gorev modunu gormek, en fazla dikkat ceken ilceyi belirlemek ve baglami kaybetmeden harita ya da uyari akisina gecmek icin kullanin.", briefWarnings: "Uyari ilceleri", toolsEyebrow: "Baglamdan eyleme", toolsTitle: "Platformu operasyon rehberi gibi kullanin", toolsBody: "HazardSignal, ozet, canli harita, ilce oncelikleri ve uyari aboneligi birlikte okundugunda daha guclu calisir.", toolMapTitle: "Canli haritayi tarayin", toolMapBody: "Kumelenen daireleri, ilceler arasi yayilimi ve detaylara inmeden once oncelik degisimini izleyin.", toolBoardTitle: "Ilce onceliklerini gozden gecirin", toolBoardBody: "Hangi ilcelerin once daha yakin takip gerektirdigini anlamak icin siralama ve uyari akisina bakin.", toolMethodTitle: "Sinyali metodolojiye baglayin", toolMethodBody: "Modelin neyi anlattigini ve neyi anlatmadigini aciklamaniz gerektiginde metodoloji sayfasini acin.", workflowEyebrow: "Risk nasil yukselir", workflowTitle: "Izlemeden olay moduna", workflowBody: "Arayuz sinyalin kendisiyle birlikte degisir: once genis izleme, baski arttiginda yukselme, aktif tespitler veya yogun risk belirdiginde olay vurgusu.", ctaMap: "Canli haritayi ac", ctaAlerts: "Uyari akisini ac", ctaMethod: "Metodolojiyi oku" },
    alerts: { eyebrow: "Uyari Operasyonlari", title: "Son Telegram uyarilari", intro: "Ilce riski ve aktif tespitlerden uretilen genel uyari akisi.", feedTitle: "Su calisma icin uyari akisi", maxProb: "Tepe olasilik", highArea: "Yuksek risk alani", hotspots: "Hotspot", status: "Durum", sent: "Gonderildi", noteBody: "Ilce bazli Telegram uyarilari operasyon ekibine gonderilir.", subscribeTitle: "Telegram ile abone ol", subscribeBody: "Botu acin, Start'a basin ve sistem sohbetinizi otomatik kaydetsin." },
    admin: { eyebrow: "Yonetim Operasyonlari", title: "Uyari kural kontrol merkezi", intro: "Telegram uyari akislarini ve esikleri yonetin.", signalTest: "Sinyal testi", subscribersLabel: "Aboneler", ruleEngine: "Kural motoru", total: "Toplam", enabled: "Aktif", sendTestTitle: "Test uyarisi gonder", sendTestBody: "Varsayilan sohbete gercek test uyarisi gonder.", sendTestBtn: "Canli test uyarisi gonder", addSubTitle: "Abone ekle", channel: "Kanal tipi", chatId: "Sohbet ID", scope: "Ilce kapsami", scopePlaceholder: "all veya ilce id", addSubBtn: "Abone ekle", rulesTitle: "Uyari kurallari", watchMin: "Izleme min. olasilik", warningMin: "Uyari min. olasilik", areaMin: "Yuksek risk alani min. (%)", hotMin: "Kritik hotspot min.", updateBtn: "Kurallari guncelle", logout: "Cikis yap", loginEyebrow: "Kisitli yonetici erisimi", loginTitle: "Kontrol odasina girin", loginIntro: "Bu alan ozeldir. Uyari kurallarini degistirmeden once oturum acin.", password: "Yonetici sifresi", passwordPlaceholder: "Yonetici sifresini girin", loginBtn: "Yonetimi ac", signingIn: "Oturum aciliyor...", loginError: "Sifre hatali veya istek basarisiz.", securityTitle: "Bu sayfa neden korumali", securityItem1: "Yonetim araclari artik herkese acik gezinmede gosterilmiyor.", securityItem2: "Tum admin API rotalari artik yetkili oturum gerektiriyor.", securityItem3: "Resmi acilistan once guclu bir sifre kullanin ve donusturun.", configMissingTitle: "Yonetici kimlik bilgileri eksik", configMissingBody: "Admin panelini kullanmadan once sunucuda ADMIN_DASHBOARD_PASSWORD ve ADMIN_SESSION_SECRET ayarlayin." },
    district: { eyebrow: "Ilce Analizi", intro: "Ilcenin mevcut risk durumu ve ilgili uyari gecmisi.", dominantClass: "Baskin sinif", maxProb: "Tepe olasilik", highArea: "Yuksek risk alani", hotspots24h: "Hotspot (24s)", history: "Calisma gecmisi", date: "Tarih", meanRisk: "Ortalama risk", related: "Ilgili uyarilar", noAlerts: "Bu ilce icin uyari kaydi yok.", probability: "Olasilik", area: "Alan", hotspots: "Hotspot" },
    methodology: {
      eyebrow: "Operasyon Metodolojisi",
      title: "HazardSignal gunluk risk goruntusunu nasil uretir",
      intro: "Bu sayfa gunluk girdileri, risk olasiliginin ne anlama geldigini ve modelin neyi iddia etmedigini aciklar.",
      inputsTitle: "Temel girdiler",
      inputsLead: "Her calisma Antalya ilceleri icin uydu, hava durumu, arazi ve son yangin etkinligi katmanlarini birlestirir.",
      input1: "Yuzey sicakligi, bitki stresi ve gece isik etkinligi gibi uydu gostergeleri.",
      input2: "Hava sicakligi, nem, ruzgar hizi ve yagis gibi meteorolojik sinyaller.",
      input3: "Yukseklik, egim, arazi ortusu, yerlesim yakinligi ve tarihsel yangin koridorlari gibi sabit baglam katmanlari.",
      probabilityTitle: "Risk olasiligi neyi ifade eder",
      probabilityLead: "Risk olasiligi, mevcut kosullarin calisma penceresinde yangina elverisli desenlere ne kadar benzedigini gosterir.",
      probability1: "Daha yuksek degerler, yangin acisindan daha olumsuz kosullara daha guclu benzerlik demektir.",
      probability2: "Ilce ozeti, yerel pikselleri ilce seviyesinde operasyonel bir sinyale donusturur.",
      probability3: "Platform uyari uretirken olasiligi, alan kapsamini ve hotspot tespitlerini birlikte kullanir.",
      notTitle: "Model ne anlama gelmez",
      notLead: "Bu sinyal kesin bir yangin teyidi degildir ve saha komutasinin yerine gecmez.",
      not1: "Belirli bir yer ve zamanda mutlaka yangin cikacagini soylemez.",
      not2: "Sivil savunma, ormancilik, belediye veya resmi makam talimatlarini ikame etmez.",
      not3: "Canli gozlem, yerel ihbar ve resmi olay prosedurleriyle birlikte kullanilmalidir.",
      noteTitle: "Karar-destek notu"
    },
    mission: {
      label: "Gorev modu",
      focus: "Oncelikli alan",
      states: {
        monitoring: {
          title: "Izleme",
          body: "Gorunum su anda rutin gunluk izleme modunda; aktif olay baskin degil."
        },
        escalation: {
          title: "Yukselme",
          body: "Risk yukseliyor. Kritik ilceler veya uyari seviyesi sinyaller daha yakin operasyon takibi gerektiriyor."
        },
        incident: {
          title: "Olay",
          body: "Aktif tespitler veya yogun hotspotlar mevcut. Arayuz otomatik olarak olay moduna geciyor."
        }
      }
    },
    map: { districtRisk: "Ilce riski", activeFires: "Aktif yanginlar (24s)", legendTitle: "Sinyal lejanti", opsView: "Operasyon haritasi", riskClass: "Risk sinifi", maxProb: "Tepe olasilik", highArea: "Yuksek/cok yuksek alan", hotspots: "Hotspot (24s)", source: "Kaynak", confidence: "Guven", detected: "Tespit" }
  }
};

export function normalizeLocale(locale) {
  const safe = String(locale || "").toLowerCase();
  return SUPPORTED_LOCALES.includes(safe) ? safe : "en";
}

export function getMessages(locale) {
  const safe = normalizeLocale(locale);
  return { ...MESSAGES[safe], locale: safe, dir: META[safe].dir, locales: SUPPORTED_LOCALES.map((entry) => ({ code: entry, label: META[entry].label })) };
}

export function buildLocalePath(locale, path) {
  const safe = normalizeLocale(locale);
  const rawPath = path || "/";
  const clean = rawPath.startsWith("/") ? rawPath : "/" + rawPath;
  return clean === "/" ? "/" + safe : "/" + safe + clean;
}

export function localizeRiskClass(label, locale) {
  const safe = normalizeLocale(locale);
  return RISK[safe][label] || label;
}

export function localizeSeverity(label, locale) {
  const safe = normalizeLocale(locale);
  return SEVERITY[safe][label] || label;
}

