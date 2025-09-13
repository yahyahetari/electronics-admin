import { useSession, signIn, signOut } from "next-auth/react";
import Nav from "./Nav";
import TopBar from "./TopBar";
import { useMediaQuery } from "react-responsive";
import Loader from "./Loader";
import React, { useEffect, useRef, useState } from "react";
import axios from 'axios';
import { useRouter } from "next/router";
import VerificationForm from "./VerificationForm";

export default function Layout({ children }) {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const loading = status === "loading";
  const mainRef = useRef(null);
  const [activeTab, setActiveTab] = useState('login');
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    signup_full_name: '',
    signup_email: '',
    signup_password: '',
    login_email: '',
    login_password: ''
  });
  const [verificationCode, setVerificationCode] = useState('');
  const [showVerification, setShowVerification] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  useEffect(() => {
    if (session?.user) {
      if (router.pathname === '/auth/signin') {
        router.push('/');
      }
      setIsVerified(!!session.user.isVerified);
    }
  }, [session, router]);
  
  const handleTabClick = (e, tab) => {
    e.preventDefault();
    setActiveTab(tab);
    setError('');
    // إعادة تعيين البيانات عند التبديل
    setFormData({
      signup_full_name: '',
      signup_email: '',
      signup_password: '',
      login_email: '',
      login_password: ''
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      if (activeTab === 'signup') {
        // التحقق من صحة البيانات
        if (!formData.signup_full_name.trim()) {
          setError('الاسم الكامل مطلوب');
          return;
        }
        if (formData.signup_full_name.trim().length < 10) {
          setError('الاسم الكامل يجب أن يكون 10 أحرف على الأقل');
          return;
        }
        if (!formData.signup_email.trim()) {
          setError('البريد الإلكتروني مطلوب');
          return;
        }
        if (!formData.signup_password.trim()) {
          setError('كلمة المرور مطلوبة');
          return;
        }
        
        const response = await axios.post('/api/auth/signup', {
          name: formData.signup_full_name.trim(),
          email: formData.signup_email.trim(),
          password: formData.signup_password
        });
        
        if (response.data.success) {
          await handleSignIn(formData.signup_email.trim(), formData.signup_password);
        }
      } else {
        // التحقق من صحة بيانات تسجيل الدخول
        if (!formData.login_email.trim()) {
          setError('البريد الإلكتروني مطلوب');
          return;
        }
        if (!formData.login_password.trim()) {
          setError('كلمة المرور مطلوبة');
          return;
        }
        
        await handleSignIn(formData.login_email.trim(), formData.login_password);
      }
    } catch (error) {
      console.error('Submit error:', error);
      setError(error.response?.data?.error || 'حدث خطأ');
    }
  };

  const handleSignIn = async (email, password) => {
    try {
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      
      if (result?.error) {
        setError(result.error);
        return;
      }
      
      // إنشاء رمز التحقق
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setVerificationCode(code);
      
      try {
        const response = await axios.post('/api/send-verification', { email, code });
        if (response.data) {
          setShowVerification(true);
        }
      } catch (emailError) {
        console.error('فشل في إرسال رمز التحقق:', emailError);
        setError('فشل في إرسال رمز التحقق: ' + (emailError.response?.data?.details || emailError.message));
      }
    } catch (error) {
      console.error('Sign in error:', error);
      setError('حدث خطأ في تسجيل الدخول');
    }
  };

  const handleVerify = async (enteredCode) => {
    if (enteredCode === verificationCode) {
      try {
        const email = formData.login_email || formData.signup_email;
        
        // تحديث حالة التحقق في قاعدة البيانات
        const response = await axios.post('/api/verify-user', { email });
        
        if (response.data) {
          setIsVerified(true);
          setShowVerification(false);
          
          // إعادة تسجيل الدخول لتحديث الجلسة
          await signIn("credentials", {
            redirect: false,
            email: email,
            password: formData.login_password || formData.signup_password,
          });
          
          // تحديث الجلسة
          await update();
          
          // انتقال إلى الصفحة الرئيسية
          setTimeout(() => {
            router.push('/');
          }, 100);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setError('فشل في التحقق من المستخدم');
      }
    } else {
      setError('رمز التحقق غير صحيح');
    }
  };

  const scrollToTop = () => {
    if (mainRef.current) {
      mainRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  };

  const isMobileOrLess = useMediaQuery({ query: '(max-width: 815px)' });

  if (loading) {
    return (
      <div className="flex justify-center items-center bg-bg-img bg-cover h-screen bg-glass">
        <Loader />
      </div>
    );
  }

  if (!session || (session && !isVerified)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-bg-img bg-cover h-screen bg-glass overflow-y-hidden">
        <div className="w-full max-w-[600px] mx-auto my-5">
          <div className="bg-b-glass p-10 rounded-2xl shadow-[0_4px_10px_4px_rgba(19,35,47,3)]">
            {showVerification ? (
              <VerificationForm 
                onVerify={handleVerify} 
                correctCode={verificationCode}
                onBack={() => {
                  setShowVerification(false);
                  setError('');
                }}
              />
            ) : (
              <div className="form">
                <ul className="flex justify-between list-none p-0 mb-5">
                  <li className="flex-1 mx-1">
                    <a
                      href="#signup"
                      onClick={(e) => handleTabClick(e, 'signup')}
                      className={`block py-2.5 px-2.5 text-center text-xl cursor-pointer transition-all duration-500 ease-in-out rounded-2xl ${activeTab === 'signup'
                        ? 'bg-[#01939c] text-white'
                        : 'bg-[rgba(160,179,176,0.25)] text-[#a0b3b0] hover:bg-h-glass hover:text-white'
                        }`}
                    >
                      حساب جديد
                    </a>
                  </li>
                  <li className="flex-1 mx-1">
                    <a
                      href="#login"
                      onClick={(e) => handleTabClick(e, 'login')}
                      className={`block py-2.5 px-2.5 text-center text-xl cursor-pointer transition-all duration-500 ease-in-out rounded-2xl ${activeTab === 'login'
                        ? 'bg-[#01939c] text-white'
                        : 'bg-[rgba(160,179,176,0.25)] text-[#a0b3b0] hover:bg-h-glass hover:text-white'
                        }`}
                    >
                      تسجيل الدخول
                    </a>
                  </li>
                </ul>

                {error && <p className="text-red-500 text-xl text-center mb-4">{error}</p>}

                <div className="w-full">
                  <div id="signup" style={{ display: activeTab === 'signup' ? 'block' : 'none' }}>
                    <h1 className="text-center text-white font-light text-3xl mb-2.5">مرحباً</h1>
                    <form onSubmit={handleSubmit} autoComplete="off">
                      <div className="mb-4">
                        <div className="w-full relative">
                          <input
                            type="text"
                            required
                            name="signup_full_name"
                            value={formData.signup_full_name}
                            onChange={handleInputChange}
                            className="text-lg w-full py-2.5 px-4 bg-transparent border border-[#01939c] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#179b77]"
                            placeholder="الاسم الكامل (10 أحرف على الأقل)"
                            autoComplete="off"
                          />
                        </div>
                      </div>
                      <div className="mb-2 relative">
                        <input
                          type="email"
                          required
                          name="signup_email"
                          value={formData.signup_email}
                          onChange={handleInputChange}
                          className="text-lg w-full py-2.5 px-4 bg-transparent border border-[#01939c] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#179b77]"
                          placeholder="البريد الإلكتروني"
                          autoComplete="off"
                        />
                      </div>
                      <div className="mb-8 relative">
                        <input
                          type="password"
                          required
                          name="signup_password"
                          value={formData.signup_password}
                          onChange={handleInputChange}
                          className="text-lg w-full py-2.5 px-4 bg-transparent border border-[#01939c] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#179b77]"
                          placeholder="كلمة المرور"
                          autoComplete="off"
                        />
                      </div>
                      <button type="submit" className="w-full py-2.5 px-0 text-xl font-normal bg-[#01939c] text-white rounded-2xl cursor-pointer transition-all duration-500 ease-in-out hover:bg-[#179b77]">
                        تسجيل
                      </button>
                    </form>
                  </div>
                  <div id="login" style={{ display: activeTab === 'login' ? 'block' : 'none' }}>
                    <h1 className="text-center text-white font-light text-3xl mb-2.5">مرحباً بعودتك</h1>
                    <form onSubmit={handleSubmit} autoComplete="off">
                      <div className="mb-10 relative">
                        <input
                          type="email"
                          required
                          name="login_email"
                          value={formData.login_email}
                          onChange={handleInputChange}
                          className="text-lg w-full py-2.5 px-4 bg-transparent border border-[#01939c] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#179b77]"
                          placeholder="البريد الإلكتروني"
                          autoComplete="off"
                        />
                      </div>
                      <div className="mb-10 relative">
                        <input
                          type="password"
                          required
                          name="login_password"
                          value={formData.login_password}
                          onChange={handleInputChange}
                          className="text-lg w-full py-2.5 px-4 bg-transparent border border-[#01939c] text-white rounded-md transition-all duration-250 ease-in-out focus:outline-none focus:border-[#179b77]"
                          placeholder="كلمة المرور"
                          autoComplete="off"
                        />
                      </div>
                      <button type="submit" className="w-full py-2.5 px-0 text-xl font-normal bg-[#01939c] text-white rounded-2xl cursor-pointer transition-all duration-500 ease-in-out hover:bg-[#179b77]">
                        تسجيل الدخول
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-white bg-bg-img bg-cover min-h-screen bg-glass overflow-hidden">
      {isMobileOrLess && <TopBar />}
      <div className="flex">
        {!isMobileOrLess && <Nav />}
        <main
          ref={mainRef}
          className={`flex-grow m-2 w-44 p-4 ${isMobileOrLess ? 'ml-2 h-[499px]' : 'mr-64'} rounded-lg bg-glass h-[600px] overflow-y-auto w-54 custom-scrollbar`}
        >
          {React.cloneElement(children, { scrollToTop })}
        </main>
      </div>
    </div>
  );
}