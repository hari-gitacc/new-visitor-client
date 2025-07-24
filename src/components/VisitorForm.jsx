import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { RotateCw, Zap, ZapOff } from "lucide-react";

// Get backend URL from environment variable
const BACKEND_API_URL = 'https://new-visitor-backend.onrender.com/api';

const VisitorForm = () => {
  const [step, setStep] = useState(1);
  const [personalPhoneNumber, setPersonalPhoneNumber] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyPhoneNumber, setCompanyPhoneNumber] = useState("");
  const [address, setAddress] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState({ type: "", text: "" });

  // Camera states - with front/back switching and flash
  const [cameraMode, setCameraMode] = useState(false);
  const [cameraStream, setCameraStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [facingMode, setFacingMode] = useState("environment");
  const [availableCameras, setAvailableCameras] = useState([]);
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [flashSupported, setFlashSupported] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const cameraTimeoutRef = useRef(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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
      } catch (error) {
        console.error("Error checking available cameras:", error);
      }
    };

    getAvailableCameras();
  }, []);

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

  // Validate email
  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Image compression function
  const compressImage = (file, maxWidth = 1200, quality = 0.8) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        
        // Draw and compress
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob(resolve, 'image/jpeg', quality);
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

  // Handle file selection with compression
  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setMessage({ type: "info", text: "Compressing image..." });
      
      try {
        const compressedFile = await compressImage(selectedFile);
        const finalFile = new File([compressedFile], selectedFile.name, {
          type: 'image/jpeg'
        });
        
        console.log(`Original: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB, Compressed: ${(finalFile.size / 1024 / 1024).toFixed(2)}MB`);
        
        setFile(finalFile);
        setMessage({ type: "success", text: "Image compressed successfully!" });
        setTimeout(() => setMessage({ type: "", text: "" }), 2000);
      } catch (error) {
        console.error('Compression failed:', error);
        setFile(selectedFile); // Use original if compression fails
        setMessage({ type: "info", text: "Using original image (compression failed)" });
        setTimeout(() => setMessage({ type: "", text: "" }), 2000);
      }
    }
  };

  // Send welcome email
  const sendWelcomeEmail = async () => {
    if (!email) {
      return;
    }



    setEmailLoading(true);
    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/send-welcome-email`,
        {
          email: email,
          companyName: companyName
        },
        {
          timeout: 10000,
        }
      );

      console.log("Welcome email response:", response.data);
      

      if (response.data.success) {
        setMessage({ 
          type: "success", 
          text: "Welcome email sent successfully! 📧" 
        });
        setTimeout(() => setMessage({ type: "", text: "" }), 3000);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error sending welcome email:", error);
      setMessage({
        type: "error",
        text: "Failed to send welcome email, but you can continue.",
      });
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
      return false;
    } finally {
      setEmailLoading(false);
    }
  };

  // Handle proceed to next step with email sending
  const handleProceedToNext = async () => {
    if (!isValidPhoneNumber(personalPhoneNumber)) {
      setMessage({
        type: "error",
        text: "Please enter a valid 10-digit personal mobile number.",
      });
      return;
    }

    // if (!name.trim()) {
    //   setMessage({
    //     type: "error",
    //     text: "Please enter your name.",
    //   });
    //   return;
    // }

    if (!isValidEmail(email)) {
      setMessage({
        type: "error",
        text: "Please enter a valid email address.",
      });
      return;
    }

    // Send welcome email
    setMessage({
      type: "info",
      text: "Sending welcome email...",
    });
    
    await sendWelcomeEmail();
    setStep(2);
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

  // Camera Functions
  const startCamera = async (preferredFacingMode = "environment") => {
    setMessage({ type: "info", text: "Starting camera..." });
    setVideoReady(false);
    setCameraMode(true);

    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCapturedImage(null);

    cameraTimeoutRef.current = setTimeout(() => {
      if (!videoReady) {
        setMessage({
          type: "error",
          text: "Camera initialization timed out. Please check permissions and try again.",
        });
        stopCamera();
      }
    }, 15000);

    console.log(`Attempting to start camera with preferred facing mode: ${preferredFacingMode}`);

    let stream;
    try {
      let constraints = {
        video: {
          facingMode: { ideal: preferredFacingMode },
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          aspectRatio: { ideal: 16 / 9 },
        },
      };
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log(`Camera stream obtained with preferred facing mode: ${preferredFacingMode}`);

      const actualFacingMode = stream.getVideoTracks()[0].getSettings().facingMode;
      setFacingMode(actualFacingMode || preferredFacingMode);

    } catch (initialError) {
      console.error(`Initial attempt with preferred facing mode (${preferredFacingMode}) failed:`, initialError);
      setMessage({ type: "info", text: `Preferred camera failed (${initialError.name}). Trying any available camera...` });

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true });
        console.log("Camera stream obtained with most lenient (video: true) constraints");

        const actualFacingMode = stream.getVideoTracks()[0].getSettings().facingMode;
        setFacingMode(actualFacingMode || "unknown");
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
        return;
      }
    }

    setCameraStream(stream);
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
            clearTimeout(cameraTimeoutRef.current);
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
    const currentSettings = cameraStream?.getVideoTracks()[0]?.getSettings();
    const currentFacingMode = currentSettings?.facingMode || "environment";
    const newFacingMode = currentFacingMode === "environment" ? "user" : "environment";

    console.log(`Switching camera from ${currentFacingMode} to ${newFacingMode}`);

    setFlashEnabled(false);
    setFlashSupported(false);
    setMessage({ type: "info", text: "Switching camera..." });
    setVideoReady(false);

    await startCamera(newFacingMode);
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
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
    setCameraStream(null);
  };

  const captureImage = async () => {
    if (
      videoRef.current &&
      canvasRef.current &&
      videoReady &&
      videoRef.current.readyState === 4
    ) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // Set reasonable dimensions for faster upload
      const maxWidth = 1200;
      const ratio = Math.min(maxWidth / video.videoWidth, maxWidth / video.videoHeight);
      
      canvas.width = video.videoWidth * ratio;
      canvas.height = video.videoHeight * ratio;

      const currentFacingModeFromStream = cameraStream?.getVideoTracks()[0]?.getSettings()?.facingMode || facingMode;

      if (currentFacingModeFromStream === "user") {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
        ctx.scale(-1, 1);
      } else {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      }

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

            console.log(`Compressed image size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
            setFile(file);
            setCapturedImage(canvas.toDataURL("image/jpeg", 0.8));
            setMessage({
              type: "success",
              text: "Image captured and compressed successfully!",
            });

            stopCamera();
          } else {
            setMessage({
              type: "error",
              text: "Failed to capture image. Please try again.",
            });
          }
        },
        "image/jpeg",
        0.8 // Compression quality
      );
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
    setUploadProgress(0);
    setMessage({ type: "info", text: "Uploading image..." });

    const formData = new FormData();
    formData.append("personalPhoneNumber", personalPhoneNumber);
    formData.append("name", name);
    formData.append("email", email);
    formData.append("companyName", companyName);
    formData.append("companyPhoneNumber", companyPhoneNumber);
    formData.append("address", address);
    formData.append("visitingCard", file);
    formData.append("smsVerified", "false"); // No SMS verification
    formData.append("captureMethod", capturedImage ? "camera" : "upload");

    try {
      const response = await axios.post(
        `${BACKEND_API_URL}/visitors/upload`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          timeout: 60000, // Increased timeout
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
            setMessage({ 
              type: "info", 
              text: `Uploading... ${percentCompleted}%` 
            });
          }
        }
      );

      setMessage({ type: "success", text: response.data.message });

      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }

      setTimeout(() => {
        setStep(1);
        setPersonalPhoneNumber("");
        setName("");
        setEmail("");
        setCompanyName("");
        setCompanyPhoneNumber("");
        setAddress("");
        setFile(null);
        setMessage({ type: "", text: "" });
        setCameraMode(false);
        setCapturedImage(null);
        setCameraStream(null);
        setVideoReady(false);
        setFlashEnabled(false);
        setUploadProgress(0);
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
      setUploadProgress(0);
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm mx-auto sm:max-w-md md:p-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-center text-gray-900 mb-6">
        Visitor Registration
      </h1>

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

      {/* Progress bar for upload */}
      {uploadProgress > 0 && (
        <div className="mb-4">
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${uploadProgress}%` }}
            ></div>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <div>
            <label
              htmlFor="personalMobile"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Personal Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center">
              <span className="inline-block bg-gray-200 p-3 rounded-l-md border border-r-0 border-gray-300 text-gray-600">
                +91
              </span>
              <input
                type="tel"
                id="personalMobile"
                value={personalPhoneNumber}
                onChange={(e) =>
                  setPersonalPhoneNumber(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                className="w-full p-3 border border-gray-300 rounded-r-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
                placeholder="9876543210"
                required
                disabled={loading || emailLoading}
                maxLength="10"
              />
            </div>
          </div>


          <div>
            <label
              htmlFor="companyName"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
            </label>
            <input
              type="text"
              id="companyName"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
              placeholder="Your company name"
              disabled={loading || emailLoading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
              placeholder="your.email@example.com"
              required
              disabled={loading || emailLoading}
            />
          </div>


          {/* <div>
            <label
              htmlFor="companyPhoneNumber"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Company Phone Number <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <input
              type="tel"
              id="companyPhoneNumber"
              value={companyPhoneNumber}
              onChange={(e) => setCompanyPhoneNumber(e.target.value.replace(/\D/g, ""))}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
              placeholder="Company phone number"
              disabled={loading || emailLoading}
            />
          </div>

          <div>
            <label
              htmlFor="address"
              className="block text-sm font-semibold text-gray-700 mb-1"
            >
              Address <span className="text-gray-500 text-xs">(Optional)</span>
            </label>
            <textarea
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none transition duration-150 ease-in-out"
              placeholder="Your address"
              rows={3}
              disabled={loading || emailLoading}
            />
          </div> */}

          <button
            onClick={handleProceedToNext}
            disabled={loading || emailLoading || !isValidPhoneNumber(personalPhoneNumber)  || !isValidEmail(email)}
            className="w-full bg-indigo-700 text-white py-3 rounded-lg font-bold hover:bg-indigo-800 disabled:bg-indigo-400 transition duration-200 ease-in-out transform hover:scale-105 shadow-md"
          >
            {emailLoading ? "Sending Welcome Email..." : loading ? "Processing..." : "Continue & Send Welcome Email"}
          </button>
        </div>
      )}

      {step === 2 && (
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
                  <span className="text-sm">Camera</span>
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
                  <span className="text-sm">Upload</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={loading}
                  />
                </label>
              </div>
            </div>
          )}

          {/* Camera Preview */}
          {cameraMode && !capturedImage && (
            <div className="space-y-4">
              <div
                className="relative bg-black rounded-lg overflow-hidden"
                style={{ aspectRatio: "16/9" }}
              >
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

                <div className="absolute top-2 left-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                  {facingMode === "environment"
                    ? "Back Camera"
                    : "Front Camera"}
                </div>

                {facingMode === 'environment' && (
                  <button
                    onClick={toggleFlash}
                    disabled={!flashSupported}
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

                <div className="absolute bottom-4 left-0 right-0 flex justify-center items-center space-x-2">
                  {availableCameras.length > 1 && (
                    <button
                      onClick={switchCamera}
                      className="p-3 bg-white bg-opacity-20 backdrop-blur-sm rounded-full text-white hover:bg-opacity-30 transition duration-300 flex items-center justify-center"
                      title={`Switch to ${
                        facingMode === "environment" ? "Front" : "Back"
                      } Camera`}
                    >
                      <RotateCw className="w-5 h-5 sm:w-6 sm:h-6" />
                    </button>
                  )}

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
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)}MB)
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
                  setStep(1);
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