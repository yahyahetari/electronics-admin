import { hash } from 'bcryptjs'
import clientPromise from "@/lib/mongodb"

const adminEmails = [
  'yahyahetari2002@gmail.com', 
  'yahyaalhetari5@gmail.com', 
  'Hazembohloly@gmail.com',
  'marianmansor22@gmail.com'
];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'الطريقة غير مسموحة',
      message: 'يُسمح فقط بـ POST requests',
      details: `تم استخدام ${req.method} بدلاً من POST`,
      action: 'تأكد من استخدام الطريقة الصحيحة'
    })
  }

  const { name, email, password } = req.body

  // التحقق من وجود البيانات المطلوبة
  if (!name || !email || !password) {
    console.log("❌ بيانات ناقصة:", { name: !!name, email: !!email, password: !!password });
    return res.status(400).json({ 
      error: 'بيانات ناقصة',
      message: 'جميع الحقول مطلوبة',
      details: {
        name: !name ? 'الاسم مطلوب' : 'موجود',
        email: !email ? 'البريد الإلكتروني مطلوب' : 'موجود',
        password: !password ? 'كلمة المرور مطلوبة' : 'موجود'
      },
      action: 'الرجاء ملء جميع الحقول المطلوبة'
    })
  }

  // التحقق من صحة الاسم
  if (name.trim().length < 10) {
    console.log(`❌ الاسم قصير جداً: ${name.length} أحرف`);
    return res.status(400).json({ 
      error: 'الاسم قصير جداً',
      message: 'الاسم يجب أن يكون 10 أحرف على الأقل',
      details: `الاسم الحالي يحتوي على ${name.trim().length} أحرف فقط`,
      action: 'أدخل اسماً كاملاً يحتوي على 10 أحرف على الأقل'
    })
  }

  // التحقق من صحة البريد الإلكتروني
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.log(`❌ بريد إلكتروني غير صحيح: ${email}`);
    return res.status(400).json({ 
      error: 'بريد إلكتروني غير صحيح',
      message: 'تنسيق البريد الإلكتروني غير صالح',
      details: 'البريد الإلكتروني يجب أن يكون بالتنسيق: example@domain.com',
      action: 'أدخل بريد إلكتروني صحيح'
    })
  }

  // التحقق من كلمة المرور
  if (password.length < 6) {
    console.log(`❌ كلمة مرور قصيرة: ${password.length} أحرف`);
    return res.status(400).json({ 
      error: 'كلمة المرور ضعيفة',
      message: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل',
      details: `كلمة المرور الحالية تحتوي على ${password.length} أحرف فقط`,
      action: 'أدخل كلمة مرور قوية تحتوي على 6 أحرف على الأقل'
    })
  }

  // التحقق من صلاحية البريد الإلكتروني للتسجيل
  if (!adminEmails.includes(email)) {
    console.log(`❌ بريد غير مصرح: ${email}`);
    return res.status(403).json({ 
      error: 'بريد إلكتروني غير مصرح',
      message: 'هذا البريد الإلكتروني غير مسموح له بالتسجيل',
      details: 'فقط الإيميلات المصرحة يمكنها إنشاء حسابات في النظام',
      action: 'تواصل مع الإدارة للحصول على صلاحية التسجيل',
      allowedEmails: adminEmails.map(email => email.replace(/(.{3}).*(@.*)/, '$1***$2'))
    })
  }

  try {
    console.log(`🔍 محاولة الاتصال بقاعدة البيانات...`);
    
    // محاولة الاتصال بقاعدة البيانات
    let client;
    try {
      client = await clientPromise;
      console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    } catch (dbError) {
      console.error("❌ فشل الاتصال بقاعدة البيانات:", dbError);
      return res.status(500).json({
        error: 'خطأ في قاعدة البيانات',
        message: 'فشل الاتصال بقاعدة البيانات',
        details: `خطأ الاتصال: ${dbError.message}`,
        action: 'الرجاء المحاولة مرة أخرى لاحقاً'
      });
    }

    const db = client.db()

    console.log(`🔍 التحقق من وجود المستخدم: ${email}`);

    // التحقق من وجود المستخدم مسبقاً
    let existingUser;
    try {
      existingUser = await db.collection('adminusers').findOne({ email });
      console.log("📊 نتيجة البحث:", { userExists: !!existingUser });
    } catch (findError) {
      console.error("❌ خطأ في البحث عن المستخدم:", findError);
      return res.status(500).json({
        error: 'خطأ في البحث',
        message: 'فشل البحث عن المستخدم في قاعدة البيانات',
        details: `خطأ البحث: ${findError.message}`,
        action: 'الرجاء المحاولة مرة أخرى'
      });
    }

    if (existingUser) {
      console.log(`❌ المستخدم موجود مسبقاً: ${email}`);
      return res.status(400).json({ 
        error: 'المستخدم موجود مسبقاً',
        message: 'يوجد حساب مسجل بهذا البريد الإلكتروني',
        details: `الحساب ${email} مسجل في النظام منذ ${new Date(existingUser.createdAt || Date.now()).toLocaleDateString('ar-EG')}`,
        action: 'استخدم بريد إلكتروني مختلف أو قم بتسجيل الدخول'
      })
    }

    console.log(`🔐 تشفير كلمة المرور...`);

    // تشفير كلمة المرور
    let hashedPassword;
    try {
      hashedPassword = await hash(password, 12);
      console.log("✅ تم تشفير كلمة المرور بنجاح");
    } catch (hashError) {
      console.error("❌ فشل في تشفير كلمة المرور:", hashError);
      return res.status(500).json({
        error: 'خطأ في التشفير',
        message: 'فشل في تشفير كلمة المرور',
        details: `خطأ التشفير: ${hashError.message}`,
        action: 'الرجاء المحاولة مرة أخرى'
      });
    }

    console.log(`💾 إنشاء المستخدم الجديد: ${email}`);

    // إنشاء المستخدم الجديد
    let result;
    try {
      result = await db.collection('adminusers').insertOne({
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        isVerified: false,
        createdAt: new Date(),
        lastLogin: null,
        role: 'admin'
      });

      console.log("✅ تم إنشاء المستخدم بنجاح:", { insertedId: result.insertedId });

    } catch (insertError) {
      console.error("❌ فشل في إنشاء المستخدم:", insertError);
      
      // التحقق من نوع الخطأ
      if (insertError.code === 11000) {
        return res.status(400).json({
          error: 'بيانات مكررة',
          message: 'المستخدم موجود مسبقاً',
          details: 'تم اكتشاف تضارب في البيانات المدخلة',
          action: 'استخدم بريد إلكتروني مختلف'
        });
      }

      return res.status(500).json({
        error: 'فشل في إنشاء المستخدم',
        message: 'حدث خطأ أثناء حفظ بيانات المستخدم',
        details: `خطأ الحفظ: ${insertError.message}`,
        action: 'الرجاء المحاولة مرة أخرى'
      });
    }

    console.log("🎉 تم التسجيل بنجاح");

    res.status(201).json({ 
      success: true,
      message: 'تم إنشاء الحساب بنجاح',
      details: `تم إنشاء حساب جديد للمستخدم ${name}`,
      userId: result.insertedId,
      email: email,
      timestamp: new Date().toISOString(),
      nextStep: 'يرجى تسجيل الدخول لتفعيل الحساب'
    })

  } catch (error) {
    console.error('💥 خطأ عام في التسجيل:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    res.status(500).json({ 
      error: 'خطأ داخلي في الخادم',
      message: 'حدث خطأ غير متوقع أثناء التسجيل',
      details: process.env.NODE_ENV === 'development' ? 
        `تفاصيل الخطأ: ${error.message}` : 
        'حدث خطأ تقني، الرجاء المحاولة لاحقاً',
      errorType: error.name,
      action: 'إذا استمرت المشكلة، الرجاء الاتصال بالدعم الفني',
      timestamp: new Date().toISOString()
    })
  }
}