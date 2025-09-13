import { getServerSession } from "next-auth/next";
import { authOptions } from "./auth/[...nextauth]";
import clientPromise from "@/lib/mongodb";

export default async function handler(req, res) {
  if (req.method !== "DELETE") {
    return res.status(405).json({ 
      message: "الطريقة غير مسموحة",
      error: "يُسمح فقط بـ DELETE requests",
      details: `تم استخدام ${req.method} بدلاً من DELETE`
    });
  }

  try {
    // محاولة الحصول على الجلسة
    console.log("🔍 محاولة الحصول على الجلسة...");
    const session = await getServerSession(req, res, authOptions);

    // طباعة تفاصيل الجلسة للتصحيح
    console.log("📊 تفاصيل الجلسة:", {
      sessionExists: !!session,
      userExists: !!session?.user,
      userEmail: session?.user?.email || 'غير موجود',
      isVerified: session?.user?.isVerified || false
    });

    if (!session) {
      console.log("❌ فشل: لا توجد جلسة");
      return res.status(401).json({ 
        message: "غير مصرح لك بالوصول",
        error: "لم يتم العثور على جلسة صحيحة",
        details: "يجب تسجيل الدخول أولاً للوصول لهذه الخدمة",
        action: "الرجاء تسجيل الدخول مرة أخرى"
      });
    }

    if (!session.user) {
      console.log("❌ فشل: لا توجد بيانات مستخدم في الجلسة");
      return res.status(401).json({ 
        message: "بيانات المستخدم غير صحيحة",
        error: "الجلسة لا تحتوي على بيانات المستخدم",
        details: "جلسة تالفة - يجب إعادة تسجيل الدخول",
        action: "الرجاء تسجيل الخروج ثم الدخول مرة أخرى"
      });
    }

    if (!session.user.email) {
      console.log("❌ فشل: البريد الإلكتروني غير موجود في الجلسة");
      return res.status(400).json({ 
        message: "بيانات المستخدم ناقصة",
        error: "البريد الإلكتروني غير موجود في الجلسة",
        details: "لا يمكن تحديد هوية المستخدم بدون البريد الإلكتروني",
        action: "الرجاء تسجيل الدخول مرة أخرى"
      });
    }

    console.log(`🔍 محاولة الاتصال بقاعدة البيانات للمستخدم: ${session.user.email}`);
    
    // محاولة الاتصال بقاعدة البيانات
    let client;
    try {
      client = await clientPromise;
      console.log("✅ تم الاتصال بقاعدة البيانات بنجاح");
    } catch (dbError) {
      console.error("❌ فشل الاتصال بقاعدة البيانات:", dbError);
      return res.status(500).json({
        message: "خطأ في قاعدة البيانات",
        error: "فشل الاتصال بقاعدة البيانات",
        details: `خطأ الاتصال: ${dbError.message}`,
        action: "الرجاء المحاولة مرة أخرى لاحقاً"
      });
    }

    const db = client.db();

    // التحقق من وجود المستخدم قبل الحذف
    console.log(`🔍 البحث عن المستخدم في قاعدة البيانات: ${session.user.email}`);
    
    let userExists;
    try {
      userExists = await db.collection("adminusers").findOne({ 
        email: session.user.email 
      });
      console.log("📊 نتيجة البحث:", { userFound: !!userExists });
    } catch (findError) {
      console.error("❌ خطأ في البحث عن المستخدم:", findError);
      return res.status(500).json({
        message: "خطأ في البحث",
        error: "فشل البحث عن المستخدم في قاعدة البيانات",
        details: `خطأ البحث: ${findError.message}`,
        action: "الرجاء المحاولة مرة أخرى"
      });
    }

    if (!userExists) {
      console.log(`❌ المستخدم غير موجود: ${session.user.email}`);
      return res.status(404).json({ 
        message: "المستخدم غير موجود",
        error: "لم يتم العثور على المستخدم في قاعدة البيانات",
        details: `البريد الإلكتروني ${session.user.email} غير مسجل في النظام`,
        action: "تأكد من صحة البيانات أو قم بإنشاء حساب جديد"
      });
    }

    console.log("🗑️ محاولة حذف المستخدم...");

    // محاولة حذف المستخدم من قاعدة البيانات
    let deleteResult;
    try {
      deleteResult = await db.collection("adminusers").deleteOne({ 
        email: session.user.email 
      });
      
      console.log("📊 نتيجة الحذف:", {
        acknowledged: deleteResult.acknowledged,
        deletedCount: deleteResult.deletedCount
      });
      
    } catch (deleteError) {
      console.error("❌ خطأ في عملية الحذف:", deleteError);
      return res.status(500).json({
        message: "فشل في حذف المستخدم",
        error: "حدث خطأ أثناء عملية الحذف من قاعدة البيانات",
        details: `خطأ الحذف: ${deleteError.message}`,
        action: "الرجاء المحاولة مرة أخرى أو الاتصال بالدعم الفني"
      });
    }

    if (!deleteResult.acknowledged) {
      console.log("❌ عملية الحذف غير مؤكدة");
      return res.status(500).json({
        message: "عملية الحذف غير مؤكدة",
        error: "قاعدة البيانات لم تؤكد عملية الحذف",
        details: "قد يكون هناك مشكلة في الاتصال أو في إعدادات قاعدة البيانات",
        action: "الرجاء المحاولة مرة أخرى أو الاتصال بالدعم الفني"
      });
    }

    if (deleteResult.deletedCount === 0) {
      console.log("❌ لم يتم حذف أي سجل");
      return res.status(404).json({ 
        message: "فشل في الحذف",
        error: "لم يتم حذف أي سجل من قاعدة البيانات",
        details: "المستخدم قد يكون محذوف مسبقاً أو حدث خطأ في عملية البحث",
        action: "تحقق من حالة الحساب أو قم بتحديث الصفحة"
      });
    }

    console.log("✅ تم حذف المستخدم بنجاح");

    res.status(200).json({ 
      message: "تم حذف المستخدم بنجاح",
      success: true,
      details: `تم حذف حساب ${session.user.email} من النظام`,
      deletedCount: deleteResult.deletedCount,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("💥 خطأ عام في API:", {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    res.status(500).json({ 
      message: "خطأ داخلي في الخادم",
      error: "حدث خطأ غير متوقع في النظام",
      details: process.env.NODE_ENV === 'development' ? 
        `تفاصيل الخطأ: ${error.message}` : 
        'حدث خطأ تقني، الرجاء المحاولة لاحقاً',
      errorType: error.name,
      action: "إذا استمرت المشكلة، الرجاء الاتصال بالدعم الفني",
      timestamp: new Date().toISOString()
    });
  }
}