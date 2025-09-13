import React, { useState, useRef } from 'react';

const VerificationForm = ({ onVerify, correctCode, onBack }) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const inputRefs = useRef([]);

  const handleChange = (index, value) => {
    // إزالة أي أحرف غير رقمية
    const numericValue = value.replace(/\D/g, '');
    
    if (numericValue.length <= 1) {
      const newCode = [...code];
      newCode[index] = numericValue;
      setCode(newCode);
      setError('');

      // الانتقال للخانة التالية إذا تم إدخال رقم
      if (numericValue && index < 5) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  const handleKeyDown = (index, e) => {
    // إذا تم الضغط على Backspace
    if (e.key === 'Backspace') {
      if (code[index] === '' && index > 0) {
        // إذا كانت الخانة فارغة، انتقل للخانة السابقة
        inputRefs.current[index - 1]?.focus();
      } else {
        // مسح الخانة الحالية
        const newCode = [...code];
        newCode[index] = '';
        setCode(newCode);
        setError('');
      }
    }
    // إذا تم الضغط على الأسهم
    else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newCode[i] = pastedData[i];
    }
    
    setCode(newCode);
    setError('');

    // التركيز على الخانة المناسبة بعد اللصق
    const focusIndex = Math.min(pastedData.length, 5);
    setTimeout(() => {
      inputRefs.current[focusIndex]?.focus();
    }, 0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    
    const enteredCode = code.join('');
    
    // التحقق من صحة الكود
    if (enteredCode.length !== 6) {
      setError('الرجاء إدخال رمز التحقق المكون من 6 أرقام');
      setIsSubmitting(false);
      return;
    }
    
    if (!/^\d{6}$/.test(enteredCode)) {
      setError('الرجاء إدخال أرقام فقط');
      setIsSubmitting(false);
      return;
    }
    
    if (code.some(digit => digit === '')) {
      setError('الرجاء ملء جميع الخانات');
      setIsSubmitting(false);
      return;
    }
    
    try {
      await onVerify(enteredCode);
    } catch (error) {
      console.error('Verification error:', error);
      setError('حدث خطأ في التحقق');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCode(['', '', '', '', '', '']);
    setError('');
    inputRefs.current[0]?.focus();
  };

  return (
    <div className="flex flex-col items-center">
      <h2 className="text-white text-2xl mb-4 text-center">أدخل رمز التحقق</h2>
      <p className="text-gray-300 text-sm mb-6 text-center">
        تم إرسال رمز مكون من 6 أرقام إلى بريدك الإلكتروني
      </p>
      
      {error && (
        <div className="text-red-500 text-lg mb-4 text-center bg-red-100 bg-opacity-10 p-3 rounded-lg">
          {error}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="w-full">
        <div className="flex justify-center gap-2 mb-6">
          {code.map((digit, index) => (
            <input
              key={index}
              ref={(el) => (inputRefs.current[index] = el)}
              type="text"
              inputMode="numeric"
              maxLength="1"
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-12 text-2xl text-center border-2 border-[#01939c] rounded-md bg-transparent text-white focus:outline-none focus:border-[#179b77] focus:ring-2 focus:ring-[#179b77] focus:ring-opacity-50 transition-all duration-200"
              autoComplete="off"
              disabled={isSubmitting}
            />
          ))}
        </div>
        
        <div className="flex flex-col gap-3">
          <button
            type="submit"
            disabled={isSubmitting || code.some(digit => digit === '')}
            className="w-full py-2.5 px-0 text-xl font-normal bg-[#01939c] text-white rounded-2xl cursor-pointer transition-all duration-500 ease-in-out hover:bg-[#179b77] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'جاري التحقق...' : 'تحقق'}
          </button>
          
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resetForm}
              className="flex-1 py-2 px-4 text-sm bg-transparent border border-gray-500 text-gray-300 rounded-lg cursor-pointer transition-all duration-300 hover:bg-gray-700"
              disabled={isSubmitting}
            >
              مسح الكود
            </button>
            
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex-1 py-2 px-4 text-sm bg-transparent border border-gray-500 text-gray-300 rounded-lg cursor-pointer transition-all duration-300 hover:bg-gray-700"
                disabled={isSubmitting}
              >
                رجوع
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
};

export default VerificationForm;