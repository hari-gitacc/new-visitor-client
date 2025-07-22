import { useState, useEffect, useRef } from 'react';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import axios from 'axios';
import { auth } from '../firebase';

const VisitorForm = () => {
  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [file, setFile] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Initialize OTP toggle from localStorage
  const [otpEnabled, setOtpEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem('visitorFormOtpEnabled');
      return stored !== null ? JSON.parse(stored) : true;
    } catch (error) {
      console.warn('Failed to read OTP preference from localStorage:', error);
      return true;
    }
  });
  
  // Camera states - Fixed to back camera only
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  
  const recaptchaVerifier = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Save OTP preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('visitorFormOtpEnabled', JSON.stringify(otpEnabled));
      console.log(`OTP preference saved: ${otpEnabled}`);
    } catch (error) {
      console.warn('Failed to save OTP preference to localStorage:', error);
    }
  }, [otpEnabled]);

  // Setup reCAPTCHA only when OTP is enabled
  useEffect(() => {
    if (!otpEnabled) return;

    const setupRecaptcha = () => {
      try {
        if (!recaptchaVerifier.current) {
          recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'normal',
            'callback': (response) => {
              console.log("reCAPTCHA verified:", response);
            },
            'expired-callback': () => {
              console.log("reCAPTCHA expired");
              setMessage({ type: 'error', text: 'reCAPTCHA expired. Please refresh the page.' });
            },
            'error-callback': (error) => {
              console.error("reCAPTCHA error:", error);
              setMessage({ type: 'error', text: 'reCAPTCHA error. Please refresh the page.' });
            }
          });
        }
      } catch (error) {
        console.error("Error setting up reCAPTCHA:", error);
        setMessage({ type: 'error', text: 'Failed to setup verification. Please refresh the page.' });
      }
    };

    setupRecaptcha();

    return () => {
      if (recaptchaVerifier.current) {
        try {
          recaptchaVerifier.current.clear();
          recaptchaVerifier.current = null;
        } catch (error) {
          console.error("Error clearing reCAPTCHA:", error);
        }
      }
    };
  }, [otpEnabled]);

  // Cleanup camera stream
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  // Validate phone number
  const isValidPhoneNumber = (number) => {
    const phoneRegex = /^[6-9]\d{9}$/;
    return phoneRegex.test(number);
  };

  // Handle the toggle change
  const handleOtpToggle = () => {
    const newOtpEnabled = !otpEnabled;
    setOtpEnabled(newOtpEnabled);
    setMessage({ type: '', text: '' });
    setStep(1);
    setOtp('');
    setConfirmationResult(null);
    
  };

  // Camera Functions - Back camera only
  const startCamera = async () => {
    try {
      setMessage({ type: '', text: '' });
      
      // Request back camera specifically
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Always use back camera
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      setCameraStream(stream);
      setCameraMode(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      
      setMessage({ type: 'success', text: 'Back camera started successfully!' });
    } catch (error) {
      console.error('Error accessing camera:', error);
      let errorMessage = 'Failed to access back camera. ';
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'Please allow camera permissions.';
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'No back camera found on this device.';
      } else if (error.name === 'NotSupportedError') {
        errorMessage += 'Camera not supported on this browser.';
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'Back camera not available, trying default camera.';
        // Fallback to any available camera
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 1280 }, height: { ideal: 720 } }
          });
          setCameraStream(fallbackStream);
          setCameraMode(true);
          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.play();
          }
          setMessage({ type: 'success', text: 'Camera started (using available camera)!' });
          return;
        } catch (fallbackError) {
          errorMessage += ' No camera available.';
        }
      } else {
        errorMessage += 'Please try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setCameraMode(false);
    setCapturedImage(null);
    setMessage({ type: '', text: '' });
  };

  const captureImage = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob((blob) => {
        const file = new File([blob], `visiting_card_${Date.now()}.jpg`, {
          type: 'image/jpeg'
        });
        
        setFile(file);
        setCapturedImage(canvas.toDataURL('image/jpeg', 0.8));
        setMessage({ type: 'success', text: 'Image captured successfully!' });
      }, 'image/jpeg', 0.8);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFile(null);
    setMessage({ type: '', text: '' });
  };

  // Handle proceed without OTP
  const handleProceedWithoutOtp = () => {
    if (!isValidPhoneNumber(mobileNumber)) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }
    
    // setMessage({ type: 'success', text: 'Proceeding without OTP verification.' });
    setStep(3);
  };

  const handleSendOtp = async () => {
    if (!isValidPhoneNumber(mobileNumber)) {
      setMessage({ type: 'error', text: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      const formattedNumber = `+91${mobileNumber}`;
      console.log("Sending OTP to:", formattedNumber);
      
      if (!recaptchaVerifier.current) {
        throw new Error('reCAPTCHA not initialized. Please refresh the page.');
      }

      const confirmation = await signInWithPhoneNumber(
        auth, 
        formattedNumber, 
        recaptchaVerifier.current
      );
      
      setConfirmationResult(confirmation);
      console.log("OTP sent successfully:", confirmation);
      
      setMessage({ type: 'success', text: 'OTP has been sent successfully!' });
      setStep(2);
    } catch (error) {
      console.error("Error sending OTP:", error);
      
      let errorMessage = 'Failed to send OTP. ';
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage += 'Invalid phone number format.';
      } else if (error.code === 'auth/missing-phone-number') {
        errorMessage += 'Phone number is missing.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage += 'SMS quota exceeded. Try again later.';
      } else if (error.code === 'auth/captcha-check-failed') {
        errorMessage += 'Please complete the reCAPTCHA verification.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setMessage({ type: 'error', text: 'Please enter a valid 6-digit OTP.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      if (!confirmationResult) {
        throw new Error('No confirmation result found. Please request OTP again.');
      }
      
      await confirmationResult.confirm(otp);
      setMessage({ type: 'success', text: 'Phone number verified successfully!' });
      setStep(3);
    } catch (error) {
      console.error("Error verifying OTP:", error);
      
      let errorMessage = 'Invalid OTP. ';
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage += 'Please check the code and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage += 'Code has expired. Please request a new one.';
      } else {
        errorMessage += error.message || 'Please try again.';
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: 'error', text: 'Please capture an image or select a file to upload.' });
      return;
    }

    // if (file.size > 5 * 1024 * 1024) {
    //   setMessage({ type: 'error', text: 'File size should be less than 5MB.' });
    //   return;
    // }

    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Please select a valid image file.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    const formData = new FormData();
    formData.append('mobileNumber', mobileNumber);
    formData.append('visitingCard', file);
    formData.append('otpVerified', otpEnabled ? 'true' : 'false');
    formData.append('captureMethod', capturedImage ? 'camera' : 'upload')

    try {
      const response = await axios.post('https://visitor-backend-hwq5.onrender.com/api/visitors/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000,
      });
      
      setMessage({ type: 'success', text: response.data.message });
      
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
      
      setTimeout(() => {
        setStep(1);
        setMobileNumber('');
        setOtp('');
        setFile(null);
        setConfirmationResult(null);
        setMessage({ type: '', text: '' });
        setCameraMode(false);
        setCapturedImage(null);
        setCameraStream(null);
      }, 3000);
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'File upload failed. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-lg max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-center text-gray-800 mb-6">Visitor Verification</h1>
      
      {/* OTP Toggle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-700">OTP Verification</h3>
            <p className="text-xs text-gray-500 mt-1">
              {otpEnabled ? 'Phone verification required' : 'Skip phone verification'}
            </p>
            <p className="text-xs text-green-600 mt-1">
              💾 Preference saved automatically
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={otpEnabled}
              onChange={handleOtpToggle}
              className="sr-only peer"
              disabled={loading}
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
        
        {/* {!otpEnabled && (
          <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
            ⚠️ Skipping OTP reduces security. Use only for testing.
          </div>
        )} */}
      </div>
      
      {/* reCAPTCHA container */}
      {otpEnabled && <div id="recaptcha-container" className="mb-4 flex justify-center"></div>}
      
      {message.text && (
        <div className={`p-3 rounded-md mb-4 text-center ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <label htmlFor="mobile" className="block text-sm font-medium text-gray-700">
            Enter Mobile Number
          </label>
          <div className="flex items-center">
            <span className="inline-block bg-gray-200 p-3 rounded-l-md border border-r-0 border-gray-300 text-gray-600">
              +91
            </span>
            <input
              type="tel"
              id="mobile"
              value={mobileNumber}
              onChange={(e) => setMobileNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className="w-full p-3 border border-gray-300 rounded-r-md focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              placeholder="9876543210"
              disabled={loading}
              maxLength="10"
            />
          </div>
          
          {otpEnabled ? (
            <button 
              onClick={handleSendOtp} 
              disabled={loading || !isValidPhoneNumber(mobileNumber)} 
              className="w-full bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 transition duration-300"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          ) : (
            <button 
              onClick={handleProceedWithoutOtp} 
              disabled={loading || !isValidPhoneNumber(mobileNumber)} 
              className="w-full bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-green-300 transition duration-300"
            >
              {loading ? 'Processing...' : 'Proceed Without OTP'}
            </button>
          )}
        </div>
      )}

      {step === 2 && otpEnabled && (
        <div className="space-y-4">
          <label htmlFor="otp" className="block text-sm font-medium text-gray-700">
            Enter OTP
          </label>
          <input
            type="text"
            id="otp"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-lg tracking-widest"
            placeholder="123456"
            disabled={loading}
            maxLength="6"
          />
          <div className="flex space-x-2">
            <button 
              onClick={() => setStep(1)} 
              className="flex-1 bg-gray-500 text-white py-3 rounded-md font-semibold hover:bg-gray-600 transition duration-300"
            >
              Back
            </button>
            <button 
              onClick={handleVerifyOtp} 
              disabled={loading || otp.length !== 6} 
              className="flex-1 bg-indigo-600 text-white py-3 rounded-md font-semibold hover:bg-indigo-700 disabled:bg-indigo-300 transition duration-300"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          {/* <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center text-blue-800">
              <span className="font-medium">📱 Phone: +91{mobileNumber}</span>
              <span className="ml-2 text-sm">
                {otpEnabled ? '✅ Verified' : '⚠️ Not Verified'}
              </span>
            </div>
          </div> */}

          {/* Camera Section */}
          {!cameraMode && !capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Capture or Upload Visiting Card
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition duration-300 disabled:opacity-50"
                >
                  <svg className="w-8 h-8 text-indigo-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium text-indigo-700">📷 Back Camera</span>
                </button>
                
                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition duration-300 cursor-pointer">
                  <svg className="w-8 h-8 text-green-500 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-sm font-medium text-green-700">📁 Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFile(e.target.files[0])}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Camera Preview - Back camera only */}
          {cameraMode && !capturedImage && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-64 object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Camera Controls - No switch button */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center space-x-6">
                  <button
                    onClick={captureImage}
                    className="p-4 bg-white bg-opacity-90 rounded-full text-gray-800 hover:bg-opacity-100 transition duration-300 shadow-lg"
                    title="Capture Image"
                  >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={stopCamera}
                    className="p-3 bg-red-500 bg-opacity-80 backdrop-blur-sm rounded-full text-white hover:bg-opacity-90 transition duration-300"
                    title="Close Camera"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Captured Image
              </label>
              <div className="relative">
                <img 
                  src={capturedImage} 
                  alt="Captured visiting card" 
                  className="w-full max-h-64 object-cover rounded-lg border"
                />
                <button
                  onClick={retakePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                  title="Retake Photo"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* File Upload Preview */}
          {file && !capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-medium text-gray-700">
                Selected File
              </label>
              <div className="relative">
                <img 
                  src={URL.createObjectURL(file)} 
                  alt="Preview" 
                  className="w-full max-h-64 object-cover rounded-lg border"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">{file.name}</p>
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                  title="Remove File"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Submit Form */}
          <form onSubmit={handleFileUpload} className="space-y-4 pt-4">
            <div className="flex space-x-2">
              <button 
                type="button"
                onClick={() => {
                  stopCamera();
                  otpEnabled ? setStep(2) : setStep(1);
                }} 
                className="flex-1 bg-gray-500 text-white py-3 rounded-md font-semibold hover:bg-gray-600 transition duration-300"
              >
                Back
              </button>
              <button 
                type="submit" 
                disabled={loading || !file} 
                className="flex-1 bg-green-600 text-white py-3 rounded-md font-semibold hover:bg-green-700 disabled:bg-green-300 transition duration-300"
              >
                {loading ? 'Uploading...' : 'Submit Details'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VisitorForm;