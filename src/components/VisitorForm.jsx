// visitors/frontend/src/components/VisitorForm.jsx

import { useState, useEffect, useRef } from "react";
import { RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
import axios from "axios";
import { auth } from "../firebase";
import { RotateCw, Zap, ZapOff } from "lucide-react";

// Get backend URL from environment variable
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL;

const VisitorForm = () => {
  const [step, setStep] = useState(1);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [file, setFile] = useState(null);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Initialize OTP toggle from localStorage
  const [otpEnabled, setOtpEnabled] = useState(() => {
    try {
      const stored = localStorage.getItem("visitorFormOtpEnabled");
      return stored !== null ? JSON.parse(stored) : true;
    } catch (error) {
      console.warn("Failed to read OTP preference from localStorage:", error);
      return true;
    }
  });

  // Camera states - with front/back switching and flash
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState("environment"); // 'environment' = back, 'user' = front
  const [availableCameras, setAvailableCameras] = useState([]);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const cameraTimeoutRef = useRef(null); // Ref for camera timeout

  const recaptchaVerifier = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Save OTP preference to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("visitorFormOtpEnabled", JSON.stringify(otpEnabled));
      console.log(`OTP preference saved: ${otpEnabled}`);
    } catch (error) {
      console.warn("Failed to save OTP preference to localStorage:", error);
    }
  }, [otpEnabled]);

  // Check available cameras on component mount
  useEffect(() => {
    const getAvailableCameras = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
          (device) => device.kind === "videoinput"
        );
        setAvailableCameras(videoDevices);
        console.log("Available cameras:", videoDevices.length);
      }
      catch (error) {
        console.error("Error checking available cameras:", error);
      }
    };

    getAvailableCameras();
  }, []);

  // Setup reCAPTCHA only when OTP is enabled
  useEffect(() => {
    if (!otpEnabled) return;

    const setupRecaptcha = () => {
      try {
        if (!recaptchaVerifier.current) {
          recaptchaVerifier.current = new RecaptchaVerifier(
            auth,
            "recaptcha-container",
            {
              size: "normal",
              callback: (response) => {
                console.log("reCAPTCHA verified:", response);
              },
              "expired-callback": () => {
                console.log("reCAPTCHA expired");
                setMessage({
                  type: "error",
                  text: "reCAPTCHA expired. Please refresh the page.",
                });
              },
              "error-callback": (error) => {
                console.error("reCAPTCHA error:", error);
                setMessage({
                  type: "error",
                  text: "reCAPTCHA error. Please refresh the page.",
                });
              },
            }
          );
        }
      } catch (error) {
        console.error("Error setting up reCAPTCHA:", error);
        setMessage({
          type: "error",
          text: "Failed to setup verification. Please refresh the page.",
        });
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

  // Cleanup camera stream and timeout
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
      if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
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
    setMessage({ type: "", text: "" });
    setStep(1);
    setOtp("");
    setConfirmationResult(null);
  };

  // Flash/Torch functionality
  const toggleFlash = async () => {
    if (!cameraStream || !flashSupported) return;

    try {
      const videoTrack = cameraStream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();

      if (capabilities.torch) {
        await videoTrack.applyConstraints({
          advanced: [{ torch: !flashEnabled }],
        });
        setFlashEnabled(!flashEnabled);
        setMessage({
          type: "success",
          text: `Flash ${!flashEnabled ? "enabled" : "disabled"}`,
        });

        // Clear message after 2 seconds
        setTimeout(() => setMessage({ type: "", text: "" }), 2000);
      }
    } catch (error) {
      console.error("Error toggling flash:", error);
      setMessage({ type: "error", text: "Failed to toggle flash" });
    }
  };

  // Check if device supports flash
  const checkFlashSupport = (stream) => {
    try {
      const videoTrack = stream.getVideoTracks()[0];
      const capabilities = videoTrack.getCapabilities();
      const supported = !!(capabilities && capabilities.torch);
      setFlashSupported(supported);
      console.log("Flash supported:", supported);
      return supported;
    } catch (error) {
      console.error("Error checking flash support:", error);
      setFlashSupported(false);
      return false;
    }
  };

  // Camera Functions - with front/back switching and proper initialization
  const startCamera = async (preferredFacingMode = "environment") => {
    setMessage({ type: "info", text: "Starting camera..." });
    setVideoReady(false);
    setCameraMode(true); // Set camera mode to true to show loading overlay

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCapturedImage(null); // Clear any previously captured image

    // Set a timeout for camera initialization
    cameraTimeoutRef.current = setTimeout(() => {
      if (!videoReady) {
        setMessage({
          type: "error",
          text: "Camera initialization timed out. Please check permissions and try again.",
        });
        stopCamera(); // Stop attempts
      }
    }, 15000); // 15 seconds timeout

    console.log(`Attempting to start camera with preferred facing mode: ${preferredFacingMode}`);

    let stream;
    try {
      // **MODIFICATION HERE: Try preferred facing mode explicitly first**
      let constraints = {
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280, min: 640 }, // Added some ideal resolution for better quality
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16 / 9 },
        },
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`Camera stream obtained with preferred facing mode: ${preferredFacingMode}`);

      // Ensure facingMode state reflects what was successfully opened
      const actualFacingMode = stream.getVideoTracks()[0].getSettings().facingMode;
      setFacingMode(actualFacingMode || preferredFacingMode); // Use actual or fallback to requested

    } catch (initialError) {
      console.error(`Initial attempt with preferred facing mode (${preferredFacingMode}) failed:`, initialError);
      setMessage({ type: "info", text: `Preferred camera failed (${initialError.name}). Trying any available camera...` });

      // Fallback: Try with most lenient constraints (any video stream)
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera stream obtained with most lenient (video: true) constraints");

        // Determine actual facing mode if successful with lenient constraint
        const actualFacingMode = stream.getVideoTracks()[0].getSettings().facingMode;
        setFacingMode(actualFacingMode || "unknown"); // Set to actual or 'unknown' if not found
        setMessage({ type: "info", text: `Using ${actualFacingMode === 'environment' ? 'back' : actualFacingMode === 'user' ? 'front' : 'default'} camera.` });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);

      } catch (fallbackError) {
        console.error("Fallback camera access failed:", fallbackError);
        let errorMessage = "Failed to access any camera. ";
        if (fallbackError.name === "NotAllowedError") {
          errorMessage += "Please ALLOW camera permissions and try again.";
        } else if (fallbackError.name === "NotFoundError") {
          errorMessage += "No camera found on this device.";
        } else if (fallbackError.name === "NotReadableError") {
          errorMessage += "Camera is in use by another application.";
        } else if (fallbackError.name === "OverconstrainedError") {
          errorMessage += "Device camera does not meet requested capabilities.";
        } else {
          errorMessage += `An unexpected error occurred: ${fallbackError.name}.`;
        }
        setMessage({ type: "error", text: errorMessage });
        setCameraMode(false);
        setVideoReady(false);
        clearTimeout(cameraTimeoutRef.current);
        return; // Exit if all attempts fail
      }
    }

    setCameraStream(stream);

    // Check flash support (must be done after stream is obtained)
    checkFlashSupport(stream);

    if (videoRef.current) {
      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        console.log("Video metadata loaded");
        videoRef.current
          .play()
          .then(() => {
            console.log("Video started playing");
            setVideoReady(true);
            clearTimeout(cameraTimeoutRef.current); // Clear timeout on success
            const currentCameraType = videoRef.current.srcObject.getVideoTracks()[0].getSettings().facingMode || 'default';
            setMessage({
              type: "success",
              text: `${currentCameraType === 'environment' ? 'Back' : currentCameraType === 'user' ? 'Front' : 'Default'} camera ready!`,
            });
            setTimeout(() => setMessage({ type: "", text: "" }), 2000);
          })
          .catch((error) => {
            console.error("Error playing video:", error);
            setMessage({
              type: "error",
              text: "Failed to start camera preview. Check permissions and try again.",
            });
            clearTimeout(cameraTimeoutRef.current);
          });
      };

      videoRef.current.onerror = (error) => {
        console.error("Video element error:", error);
        setMessage({ type: "error", text: "Camera preview error: Could not load stream." });
        clearTimeout(cameraTimeoutRef.current);
      };
    }
  };


  const switchCamera = async () => {
    // Determine the new facing mode based on what's currently active (might not be what was requested)
    const currentSettings = cameraStream?.getVideoTracks()[0]?.getSettings();
    const currentFacingMode = currentSettings?.facingMode || "environment"; // Default if not found

    // Find the other facing mode
    const newFacingMode = currentFacingMode === "environment" ? "user" : "environment";

    console.log(`Switching camera from ${currentFacingMode} to ${newFacingMode}`);

    // Reset flash when switching cameras
    setFlashEnabled(false);
    setFlashSupported(false);

    // Show loading state
    setMessage({ type: "info", text: "Switching camera..." });
    setVideoReady(false);

    await startCamera(newFacingMode);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    if (cameraTimeoutRef.current) {
        clearTimeout(cameraTimeoutRef.current);
    }
    setCameraMode(false);
    setCapturedImage(null);
    setVideoReady(false);
    setFlashEnabled(false);
    setFlashSupported(false);
    setMessage({ type: "", text: "" });
  };

  const captureImage = () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      videoReady &&
      videoRef.current.readyState === 4
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set canvas dimensions to match video for better quality
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // For front camera, flip the image horizontally
      // Get the actual current facing mode from the active stream's settings
      const currentFacingModeFromStream = cameraStream?.getVideoTracks()[0]?.getSettings()?.facingMode || facingMode;

      if (currentFacingModeFromStream === "user") {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1); // Reset scale
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

      // Convert canvas to blob and create file
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const timestamp = Date.now();
            const cameraType = currentFacingModeFromStream === "environment" ? "back" : "front";
            const file = new File(
              [blob],
              `visiting_card_${cameraType}_${timestamp}.jpg`,
              {
                type: "image/jpeg",
              }
            );

            setFile(file);
            setCapturedImage(canvas.toDataURL("image/jpeg", 0.9)); // Higher quality
            setMessage({
              type: "success",
              text: "Image captured successfully!",
            });

            // Auto-stop camera after capture
            stopCamera();
          } else {
            setMessage({
              type: "error",
              text: "Failed to capture image. Please try again.",
            });
          }
        },
        "image/jpeg",
        0.9
      ); // Higher quality
    } else {
      setMessage({
        type: "error",
        text: "Camera not ready. Please wait and try again.",
      });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setFile(null);
    setMessage({ type: "", text: "" });
  };

  // Handle proceed without OTP
  const handleProceedWithoutOtp = () => {
    if (!isValidPhoneNumber(mobileNumber)) {
      setMessage({
        type: "error",
        text: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    setStep(3);
  };

  const handleSendOtp = async () => {
    if (!isValidPhoneNumber(mobileNumber)) {
      setMessage({
        type: "error",
        text: "Please enter a valid 10-digit mobile number.",
      });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      const formattedNumber = `+91${mobileNumber}`;
      console.log("Sending OTP to:", formattedNumber);

      if (!recaptchaVerifier.current) {
        throw new Error("reCAPTCHA not initialized. Please refresh the page.");
      }

      const confirmation = await signInWithPhoneNumber(
        auth,
        formattedNumber,
        recaptchaVerifier.current
      );

      setConfirmationResult(confirmation);
      console.log("OTP sent successfully:", confirmation);

      setMessage({ type: "success", text: "OTP has been sent successfully!" });
      setStep(2);
    } catch (error) {
      console.error("Error sending OTP:", error);

      let errorMessage = "Failed to send OTP. ";
      if (error.code === "auth/invalid-phone-number") {
        errorMessage += "Invalid phone number format.";
      } else if (error.code === "auth/missing-phone-number") {
        errorMessage += "Phone number is missing.";
      } else if (error.code === "auth/quota-exceeded") {
        errorMessage += "SMS quota exceeded. Try again later.";
      } else if (error.code === "auth/captcha-check-failed") {
        errorMessage += "Please complete the reCAPTCHA verification.";
      } else {
        errorMessage += error.message || "Please try again.";
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp || otp.length !== 6) {
      setMessage({ type: "error", text: "Please enter a valid 6-digit OTP." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      if (!confirmationResult) {
        throw new Error(
          "No confirmation result found. Please request OTP again."
        );
      }

      await confirmationResult.confirm(otp);
      setMessage({
        type: "success",
        text: "Phone number verified successfully!",
      });
      setStep(3);
    } catch (error) {
      console.error("Error verifying OTP:", error);

      let errorMessage = "Invalid OTP. ";
      if (error.code === "auth/invalid-verification-code") {
        errorMessage += "Please check the code and try again.";
      } else if (error.code === "auth/code-expired") {
        errorMessage += "Code has expired. Please request a new one.";
      } else {
        errorMessage += error.message || "Please try again.";
      }

      setMessage({ type: "error", text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage({
        type: "error",
        text: "Please capture an image or select a file to upload.",
      });
      return;
    }

    if (!file.type.startsWith("image/")) {
      setMessage({ type: "error", text: "Please select a valid image file." });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    const formData = new FormData();
    formData.append("mobileNumber", mobileNumber);
    formData.append("visitingCard", file);
    formData.append("otpVerified", otpEnabled ? "true" : "false");
    formData.append("captureMethod", capturedImage ? "camera" : "upload");

    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/visitors/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 30000,
        }
      );

      setMessage({ type: "success", text: response.data.message });

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      setTimeout(() => {
        setStep(1);
        setMobileNumber("");
        setOtp("");
        setFile(null);
        setConfirmationResult(null);
        setMessage({ type: "", text: "" });
        setCameraMode(false);
        setCapturedImage(null);
        setCameraStream(null);
        setVideoReady(false);
        setFlashEnabled(false);
      }, 3000);
    } catch (error) {
      console.error("Error uploading file:", error);
      setMessage({
        type: "error",
        text:
          error.response?.data?.message ||
          "File upload failed. Please try again.",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm mx-auto sm:max-w-md md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">
        Visitor Verification
      </h1>
      {/* OTP Toggle */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-700">
              OTP Verification
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {otpEnabled
                ? "Phone verification required"
                : "Skip phone verification"}
            </p>
            <p className="text-xs text-green-600 mt-1">
              Preference saved automatically
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
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
          </label>
        </div>
      </div>
      {/* reCAPTCHA container */}
      {otpEnabled && (
        <div
          id="recaptcha-container"
          className="mb-4 flex justify-center"
        ></div>
      )}
      {message.text && (
        <div
          className={`p-3 rounded-lg mb-4 text-center text-sm font-medium ${
            message.type === "success"
              ? "bg-green-100 text-green-800 border border-green-200"
              : message.type === "info"
              ? "bg-blue-100 text-blue-800 border border-blue-200"
              : "bg-red-100 text-red-800 border border-red-200"
          }`}
        >
          {message.text}
        </div>
      )}
      {step === 1 && (
        <div className="space-y-4">
          <label
            htmlFor="mobile"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
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
              onChange={(e) =>
                setMobileNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
              }
              className="w-full p-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
              placeholder="9876543210"
              disabled={loading}
              maxLength="10"
            />
          </div>

          {otpEnabled ? (
            <button
              onClick={handleSendOtp}
              disabled={loading || !isValidPhoneNumber(mobileNumber)}
              className="w-full bg-indigo-700 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 disabled:bg-indigo-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
              {loading ? "Sending..." : "Send OTP"}
            </button>
          ) : (
            <button
              onClick={handleProceedWithoutOtp}
              disabled={loading || !isValidPhoneNumber(mobileNumber)}
              className="w-full bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-800 disabled:bg-green-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
              {loading ? "Processing..." : "Proceed Without OTP"}
            </button>
          )}
        </div>
      )}
      {step === 2 && otpEnabled && (
        <div className="space-y-4">
          <label
            htmlFor="otp"
            className="block text-sm font-semibold text-gray-700 mb-1"
          >
            Enter OTP
          </label>
          <input
            type="text"
            id="otp"
            value={otp}
            onChange={(e) =>
              setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
            }
            className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center text-lg tracking-widest transition duration-150 ease-in-out"
            placeholder="123456"
            disabled={loading}
            maxLength="6"
          />
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 mt-4">
            <button
              onClick={() => setStep(1)}
              className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
              Back
            </button>
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
              className="flex-1 bg-indigo-700 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 disabled:bg-indigo-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
            >
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </div>
        </div>
      )}
      {step === 3 && (
        <div className="space-y-4">
          {/* Camera Section */}
          {!cameraMode && !capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Capture or Upload Visiting Card
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => startCamera("environment")}
                  disabled={loading}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-indigo-300 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition duration-300 disabled:opacity-50 h-32 text-indigo-700 font-semibold"
                >
                  <svg
                    className="w-8 h-8 text-indigo-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span className="text-sm">
                    Camera
                  </span>
                </button>

                <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-green-300 rounded-lg hover:border-green-400 hover:bg-green-50 transition duration-300 cursor-pointer h-32 text-green-700 font-semibold">
                  <svg
                    className="w-8 h-8 text-green-500 mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span className="text-sm">
                    Upload
                  </span>
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

          {/* Camera Preview - Rectangular for visiting cards */}
          {cameraMode && !capturedImage && (
            <div className="space-y-4">
              <div
                className="relative bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: "16/9" }}
              >
                {/* Loading overlay */}
                {!videoReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
                    <div className="text-white text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}

                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                  style={{
                    transform: facingMode === "user" ? "scaleX(-1)" : "none",
                    minHeight: "200px",
                  }}
                />
                <canvas ref={canvasRef} className="hidden" />

                {/* Camera info indicator */}
                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {facingMode === "environment"
                    ? "Back Camera"
                    : "Front Camera"}
                </div>

                {/* Flash indicator - MODIFIED */}
                {facingMode === 'environment' && ( // Only show flash control for back camera
                  <button
                    onClick={toggleFlash}
                    disabled={!flashSupported} // Disable if not supported
                    className={`absolute top-2 right-2 p-3 rounded-full transition duration-300 flex items-center justify-center ${
                      flashEnabled
                        ? "bg-yellow-500 bg-opacity-90 text-white"
                        : "bg-white bg-opacity-20 backdrop-blur-sm text-white hover:bg-opacity-30"
                    } ${!flashSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={`${flashSupported ? (flashEnabled ? "Turn off flash" : "Turn on flash") : "Flash not supported"}`}
                  >
                    {flashEnabled ? (
                      <Zap className="w-5 h-5 sm:w-6 sm:h-6" />
                    ) : (
                      <ZapOff className="w-5 h-5 sm:w-6 sm:h-6" />
                    )}
                  </button>
                )}


                {/* Camera Controls */}
                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-2">
                  {/* Switch Camera Button - MODIFIED */}
                  {availableCameras.length > 1 && ( // Only show if more than one camera is available
                    <button
                      onClick={switchCamera}
                      className="
                        p-3 bg-white bg-opacity-20 backdrop-blur-sm
                        rounded-full text-white hover:bg-opacity-30
                        transition duration-300 flex items-center justify-center
                      "
                      title={`Switch to ${
                        facingMode === "environment" ? "Front" : "Back"
                      } Camera`}
                    >
                      <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}

                  {/* Capture Button */}
                  <button
                    onClick={captureImage}
                    disabled={!videoReady}
                    className="p-3 sm:p-4 bg-white bg-opacity-90 rounded-full text-gray-800 hover:bg-opacity-100 transition duration-300 shadow-lg disabled:opacity-50"
                    title="Capture Image"
                  >
                    <svg
                      className="w-7 h-7 sm:w-8 sm:h-8"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </button>

                  {/* Close Camera Button */}
                  <button
                    onClick={stopCamera}
                    className="p-3 rounded-full bg-red-500 bg-opacity-80 backdrop-blur-sm text-white hover:bg-opacity-90 transition duration-300"
                    title="Close Camera"
                  >
                    <svg
                      className="w-5 h-5 sm:w-6 sm:h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Captured Image
              </label>
              <div className="relative">
                <img
                  src={capturedImage}
                  alt="Captured visiting card"
                  className="w-full max-h-64 sm:max-h-80 object-cover rounded-lg border"
                />
                <button
                  onClick={retakePhoto}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                  title="Retake Photo"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* File Upload Preview */}
          {file && !capturedImage && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Selected File
              </label>
              <div className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt="Preview"
                  className="w-full max-h-64 sm:max-h-80 object-cover rounded-lg border"
                />
                <p className="text-sm text-gray-500 mt-2 text-center">
                  {file.name}
                </p>
                <button
                  onClick={() => setFile(null)}
                  className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                  title="Remove File"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Submit Form */}
          <form onSubmit={handleFileUpload} className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  otpEnabled ? setStep(2) : setStep(1);
                }}
                className="flex-1 bg-gray-600 text-white py-3 rounded-lg font-bold hover:bg-gray-700 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || !file}
                className="flex-1 bg-green-700 text-white py-3 rounded-lg font-bold hover:bg-green-800 disabled:bg-green-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
              >
                {loading ? "Uploading..." : "Submit Details"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default VisitorForm;
