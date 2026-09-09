import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Mail, ArrowRight, CheckCircle, LogOut, ArrowLeft, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import logoLine from '../../assets/logo-line.PNG';

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, user, isLoggedIn, sendEmailOtp, verifyEmailOtp, loginWithGoogle, logout } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [emailInput, setEmailInput] = useState('');
  const [otpValues, setOtpValues] = useState<string[]>(['', '', '', '', '', '']);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);

  const otpInputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Resend Countdown Timer
  useEffect(() => {
    let interval: any = null;
    if (step === 'otp' && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [step, resendTimer]);

  // Reset state on modal open/close
  useEffect(() => {
    if (isAuthModalOpen) {
      setStep('email');
      setErrorMsg('');
      setOtpValues(['', '', '', '', '', '']);
      setIsSuccess(false);
      setResendTimer(30);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // Step 1: Send OTP to Email
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const trimmed = emailInput.trim();
    if (!trimmed || !trimmed.includes('@') || !trimmed.includes('.')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    const res = await sendEmailOtp(trimmed);
    setIsSubmitting(false);

    if (res.success) {
      setStep('otp');
      setResendTimer(30);
      setOtpValues(['', '', '', '', '', '']);
      setTimeout(() => {
        otpInputsRef.current[0]?.focus();
      }, 100);
    } else {
      setErrorMsg(res.error || 'Failed to send OTP. Please try again.');
    }
  };

  // Step 2: Verify 6-digit OTP
  const handleOtpSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const fullOtp = otpValues.join('').trim();
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter the complete 6-digit OTP.');
      return;
    }

    setIsSubmitting(true);
    const res = await verifyEmailOtp(emailInput.trim(), fullOtp);
    setIsSubmitting(false);

    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeAuthModal();
      }, 900);
    } else {
      setErrorMsg(res.error || 'Invalid or expired OTP code. Please try again.');
    }
  };

  // Handle OTP digit changes with auto-advance
  const handleOtpChange = (index: number, value: string) => {
    // If pasted string
    if (value.length > 1) {
      const pastedDigits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otpValues];
      pastedDigits.forEach((digit, i) => {
        if (i < 6) newOtp[i] = digit;
      });
      setOtpValues(newOtp);
      const nextIndex = Math.min(pastedDigits.length, 5);
      otpInputsRef.current[nextIndex]?.focus();
      if (pastedDigits.length === 6) {
        setTimeout(() => handleAutoSubmit(newOtp.join('')), 100);
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpValues];
    newOtp[index] = digit;
    setOtpValues(newOtp);

    // Auto-advance to next input
    if (digit && index < 5) {
      otpInputsRef.current[index + 1]?.focus();
    }

    // Auto-submit if all 6 digits entered
    if (digit && index === 5 && newOtp.every((d) => d !== '')) {
      setTimeout(() => handleAutoSubmit(newOtp.join('')), 100);
    }
  };

  const handleAutoSubmit = async (fullCode: string) => {
    if (fullCode.length !== 6 || isSubmitting) return;
    setIsSubmitting(true);
    const res = await verifyEmailOtp(emailInput.trim(), fullCode);
    setIsSubmitting(false);
    if (res.success) {
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        closeAuthModal();
      }, 900);
    } else {
      setErrorMsg(res.error || 'Invalid OTP code.');
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpInputsRef.current[index - 1]?.focus();
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isSubmitting) return;
    setErrorMsg('');
    setIsSubmitting(true);
    const res = await sendEmailOtp(emailInput.trim());
    setIsSubmitting(false);
    if (res.success) {
      setResendTimer(30);
    } else {
      setErrorMsg(res.error || 'Failed to resend OTP.');
    }
  };

  const handleGoogleSignIn = async () => {
    setErrorMsg('');
    setIsSubmitting(true);
    const res = await loginWithGoogle();
    setIsSubmitting(false);
    if (res.success) {
      closeAuthModal();
    } else {
      setErrorMsg(res.error || 'Google sign in failed.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
      onClick={closeAuthModal}
    >
      {/* Outer Card Container with Top Floating Close Button */}
      <div className="relative w-full max-w-[420px]" onClick={(e) => e.stopPropagation()}>
        
        {/* Floating Top Close Button (Nykaa Style) */}
        <button
          onClick={closeAuthModal}
          className="absolute -top-12 right-0 sm:-right-4 w-9 h-9 rounded-full bg-white text-[#1A1821] hover:bg-gray-100 flex items-center justify-center shadow-lg transition-transform hover:scale-110 active:scale-95 z-50 cursor-pointer"
          aria-label="Close"
        >
          <X className="w-5 h-5 stroke-[2.5]" />
        </button>

        {/* Modal Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl overflow-hidden animate-scale-in border border-[#EAE6DB]">
          
          {/* ================= 1. UPSIDE THEMED BRAND HEADER BANNER ================= */}
          <div className="relative h-28 sm:h-32 bg-gradient-to-r from-[#8E6FAE] via-[#D86F90] to-[#8E6FAE] p-4 flex items-center justify-center overflow-hidden">
            {/* Elegant Background Glow Circles */}
            <div className="absolute -top-6 -left-6 w-24 h-24 rounded-full bg-white/15 blur-xl pointer-events-none"></div>
            <div className="absolute -bottom-8 -right-8 w-28 h-28 rounded-full bg-white/20 blur-xl pointer-events-none"></div>

            {/* Logo in Top Header Banner */}
            <div className="relative z-10 flex flex-col items-center justify-center text-center">
              <img
                src={logoLine}
                alt="Girly Tales"
                className="h-10 sm:h-12 w-auto object-contain filter drop-shadow-md brightness-0 invert"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <span className="font-serif font-black text-2xl sm:text-3xl text-white uppercase tracking-widest drop-shadow-md">
                GIRLY TALES
              </span>
              <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.25em] text-[#FFFDD0] uppercase drop-shadow-xs">
                ✦ EVERYDAY COMFORT &amp; SHINE ✦
              </span>
            </div>
          </div>

          {/* ================= 2. CARD BODY CONTENT ================= */}
          <div className="p-6 sm:p-8 bg-white">
            
            {/* If user is already logged in: Profile Quick Card */}
            {isLoggedIn && user ? (
              <div className="text-center py-2 space-y-4 animate-fade-in">
                <div className="w-16 h-16 min-w-[64px] min-h-[64px] aspect-square shrink-0 rounded-full bg-[#967BB6] text-white font-serif font-bold text-2xl flex items-center justify-center mx-auto shadow-md select-none">
                  {user.name ? user.name.charAt(0).toUpperCase() : 'G'}
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1.5">
                    <h3 className="font-sans font-black text-lg text-brand-charcoal uppercase">
                      {user.name}
                    </h3>
                    <span className="bg-[#FFFDD0] text-[#967BB6] border border-[#EAE6DB] text-[9px] font-black uppercase px-1.5 py-0.5 rounded">
                      VIP Member
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted mt-0.5">{user.email}</p>
                </div>

                <div className="p-3 bg-[#FFFDD0]/60 border border-[#EAE6DB] rounded-xl flex items-center justify-center gap-2 text-xs font-bold text-brand-charcoal">
                  <Sparkles className="w-4 h-4 text-[#967BB6]" />
                  <span>10% VIP Discount automatically unlocked!</span>
                </div>

                <div className="pt-2 flex gap-2.5">
                  <button
                    onClick={closeAuthModal}
                    className="flex-1 py-2.5 bg-[#FFFDD0] hover:bg-[#FBEFC8] text-brand-charcoal text-xs font-bold uppercase rounded-lg border border-[#EAE6DB] transition-colors"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={() => {
                      logout();
                      closeAuthModal();
                    }}
                    className="px-4 py-2.5 border border-[#EAE6DB] hover:bg-rose-50 text-rose-600 text-xs font-bold uppercase rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            ) : isSuccess ? (
              /* Success Animation State */
              <div className="py-6 text-center space-y-3 animate-scale-in">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle className="w-8 h-8" />
                </div>
                <h3 className="font-sans font-black text-lg text-brand-charcoal uppercase">
                  Welcome to Girly Tales!
                </h3>
                <p className="text-xs text-brand-muted">You are now signed in.</p>
              </div>
            ) : step === 'email' ? (
              /* ================= STEP 1: NYKAA STYLE EMAIL ID INPUT ================= */
              <div className="space-y-5 text-center animate-fade-in">
                
                {/* Title & Subtitle */}
                <div className="space-y-1 text-center">
                  <h3 className="font-sans font-bold text-lg sm:text-xl text-[#1A1821] tracking-tight">
                    Log in or sign up
                  </h3>
                  <p className="text-xs sm:text-[13px] text-gray-500 font-normal">
                    Get personalised suggestions, offers &amp; more
                  </p>
                </div>

                {/* Error Banner if any */}
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium rounded-lg text-left flex items-center gap-2 animate-slide-up">
                    <span className="font-bold">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 1. GOOGLE SIGN IN BUTTON */}
                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 bg-white hover:bg-gray-50 text-[#1A1821] text-xs sm:text-sm font-bold border border-gray-300 hover:border-[#967BB6] rounded-lg transition-all duration-200 shadow-xs flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* 2. OR DIVIDER */}
                <div className="relative flex items-center justify-center my-3">
                  <div className="w-full border-t border-gray-200"></div>
                  <span className="bg-white px-3 text-[11px] font-bold tracking-widest text-gray-400 uppercase relative z-10">
                    OR
                  </span>
                </div>

                {/* 3. EMAIL OTP FORM */}
                <form onSubmit={handleEmailSubmit} className="space-y-4 text-left">
                  
                  {/* Email Input Field */}
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-600">
                      Enter Email ID
                    </label>
                    <div className="relative border-b-2 border-[#D86F90]/60 focus-within:border-[#967BB6] transition-colors pb-1">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                        <input
                          type="email"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          placeholder="you@example.com"
                          required
                          autoFocus
                          className="w-full py-1.5 text-sm text-[#1A1821] placeholder-gray-400 bg-transparent focus:outline-none font-medium"
                        />
                      </div>
                    </div>
                  </div>

                  {/* PROCEED BUTTON */}
                  <button
                    type="submit"
                    disabled={!emailInput.trim() || isSubmitting}
                    className={`w-full py-3.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                      emailInput.trim() && !isSubmitting
                        ? 'bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] cursor-pointer hover:shadow-md active:scale-[0.99]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Sending OTP...</span>
                    ) : (
                      <>
                        <span>PROCEED</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Footer Terms */}
                <p className="text-[11px] text-gray-500 leading-relaxed text-center pt-2">
                  By continuing, I agree to Girly Tales's{' '}
                  <a href="#terms" onClick={closeAuthModal} className="text-[#967BB6] font-semibold underline hover:text-brand-charcoal">
                    Terms &amp; Conditions
                  </a>{' '}
                  and{' '}
                  <a href="#privacy" onClick={closeAuthModal} className="text-[#967BB6] font-semibold underline hover:text-brand-charcoal">
                    Privacy Policy
                  </a>.
                </p>

              </div>
            ) : (
              /* ================= STEP 2: VERIFY 6-DIGIT OTP ================= */
              <div className="space-y-5 text-center animate-fade-in">
                
                {/* Back Link to Edit Email */}
                <div className="flex items-center justify-between text-xs pb-1 border-b border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('email');
                      setErrorMsg('');
                    }}
                    className="flex items-center gap-1.5 font-bold text-[#967BB6] hover:underline"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Change Email</span>
                  </button>
                  <span className="text-[11px] text-gray-400">Step 2 of 2</span>
                </div>

                {/* Title & Subtitle */}
                <div className="space-y-1 text-center">
                  <h3 className="font-sans font-bold text-lg sm:text-xl text-[#1A1821] tracking-tight">
                    Verify with OTP
                  </h3>
                  <p className="text-xs text-gray-500">
                    Enter the 6-digit code sent to <strong className="text-[#1A1821]">{emailInput}</strong>
                  </p>
                </div>

                {/* Error Banner */}
                {errorMsg && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 text-xs font-medium rounded-lg text-left flex items-center gap-2 animate-slide-up">
                    <span className="font-bold">⚠️</span>
                    <span>{errorMsg}</span>
                  </div>
                )}

                {/* 6-Box OTP Input Form */}
                <form onSubmit={handleOtpSubmit} className="space-y-5">
                  <div className="flex items-center justify-center gap-2 sm:gap-2.5">
                    {otpValues.map((digit, idx) => (
                      <input
                        key={idx}
                        ref={(el) => (otpInputsRef.current[idx] = el)}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        value={digit}
                        onChange={(e) => handleOtpChange(idx, e.target.value)}
                        onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                        className={`w-11 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl rounded-xl border-2 transition-all focus:outline-none ${
                          digit
                            ? 'border-[#967BB6] bg-[#FFFDD0]/30 text-[#1A1821]'
                            : 'border-gray-200 bg-gray-50/50 text-[#1A1821] focus:border-[#967BB6] focus:bg-white'
                        }`}
                      />
                    ))}
                  </div>

                  {/* Resend OTP Row */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
                    <span>Didn't receive code?</span>
                    {resendTimer > 0 ? (
                      <span className="font-bold text-gray-400">Resend in {resendTimer}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        disabled={isSubmitting}
                        className="font-bold text-[#967BB6] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                        <span>Resend OTP</span>
                      </button>
                    )}
                  </div>

                  {/* VERIFY BUTTON */}
                  <button
                    type="submit"
                    disabled={otpValues.join('').length !== 6 || isSubmitting}
                    className={`w-full py-3.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all duration-200 flex items-center justify-center gap-2 shadow-sm ${
                      otpValues.join('').length === 6 && !isSubmitting
                        ? 'bg-[#FBB6CE] hover:bg-[#F89CBA] text-[#1A1821] cursor-pointer hover:shadow-md active:scale-[0.99]'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-80'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>Verifying...</span>
                    ) : (
                      <>
                        <span>VERIFY &amp; PROCEED</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};
