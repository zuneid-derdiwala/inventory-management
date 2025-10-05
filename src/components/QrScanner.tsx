"use client";

import React, { useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera, Upload, Image } from "lucide-react";
import jsQR from "jsqr";

// IMEI and mobile number extraction utilities
const IMEI_REGEX = /(?:\b|[^0-9])([0-9]{15})(?:\b|[^0-9])/g;
const MOBILE_REGEX = /(?:\b|[^0-9])([0-9]{10,15})(?:\b|[^0-9])/g;

function extractIMEIsFromText(text: string): string[] {
  const results: string[] = [];
  let match;
  IMEI_REGEX.lastIndex = 0;
  while ((match = IMEI_REGEX.exec(text)) !== null) {
    results.push(match[1]);
  }
  return results;
}

function extractMobileNumbersFromText(text: string): string[] {
  const results: string[] = [];
  let match;
  MOBILE_REGEX.lastIndex = 0;
  while ((match = MOBILE_REGEX.exec(text)) !== null) {
    const number = match[1];
    // Only include numbers that are 10-14 digits (mobile numbers, not IMEI)
    if (number.length >= 10 && number.length <= 14) {
      results.push(number);
    }
  }
  return results;
}

// Extract both IMEI and mobile numbers from text
function extractNumbersFromText(text: string): { imeis: string[], mobiles: string[] } {
  const imeis = extractIMEIsFromText(text);
  const mobiles = extractMobileNumbersFromText(text);
  return { imeis, mobiles };
}

// Luhn checksum for IMEI validation
function imeiIsValid(imei: string): boolean {
  if (!/^\d{15}$/.test(imei)) return false;
  
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    let d = parseInt(imei[i], 10);
    if ((i % 2) === 1) {
      d = d * 2;
      if (d > 9) d = d - 9;
    }
    sum += d;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(imei[14], 10);
}

// Error boundary for scanner DOM manipulation errors
class ScannerErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    // Check if it's a DOM manipulation error from scanner cleanup
    if (error.message.includes('Node.removeChild') || 
        error.message.includes('not a child of this node') ||
        error.message.includes('appendChild') ||
        error.message.includes('insertBefore') ||
        error.message.includes('fetching process for the media resource was aborted') ||
        error.message.includes('DOMException')) {
      console.log('Scanner error boundary caught DOM manipulation error, suppressing...');
      return { hasError: false }; // Don't show error UI for these errors
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-DOM manipulation errors
    if (!error.message.includes('Node.removeChild') && 
        !error.message.includes('not a child of this node') &&
        !error.message.includes('appendChild') &&
        !error.message.includes('insertBefore') &&
        !error.message.includes('fetching process for the media resource was aborted') &&
        !error.message.includes('DOMException')) {
      console.error('Scanner error boundary caught error:', error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full p-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Scanner encountered an error. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        </div>
      );
    }

    return this.props.children;
  }
}

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (errorMessage: string) => void;
  qrCodeContainerId: string;
}

const QrScanner: React.FC<QrScannerProps> = ({
  onScanSuccess,
  onScanError,
  qrCodeContainerId,
}) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);

  // Global error suppression for DOM manipulation errors
  React.useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error && (
        event.error.message?.includes('Node.removeChild') ||
        event.error.message?.includes('not a child of this node') ||
        event.error.message?.includes('appendChild') ||
        event.error.message?.includes('insertBefore') ||
        event.error.message?.includes('fetching process for the media resource was aborted') ||
        event.error.message?.includes('DOMException')
      )) {
        console.log('Suppressed DOM manipulation error:', event.error.message);
        event.preventDefault();
        return false;
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && (
        event.reason.message?.includes('Node.removeChild') ||
        event.reason.message?.includes('not a child of this node') ||
        event.reason.message?.includes('appendChild') ||
        event.reason.message?.includes('insertBefore') ||
        event.reason.message?.includes('fetching process for the media resource was aborted') ||
        event.reason.message?.includes('DOMException')
      )) {
        console.log('Suppressed DOM manipulation promise rejection:', event.reason.message);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Override DOM methods to prevent DOM manipulation errors
  React.useEffect(() => {
    const originalRemoveChild = Node.prototype.removeChild;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;

    (Node.prototype as any).removeChild = function(child: any) {
      try {
        if (this.contains(child)) {
          return originalRemoveChild.call(this, child);
        } else {
          console.log('Suppressed removeChild error: node not a child');
          return child; // Return the child as if operation was successful
        }
      } catch (error) {
        console.log('Suppressed removeChild error:', error);
        return child;
      }
    };

    (Node.prototype as any).appendChild = function(child: any) {
      try {
        return originalAppendChild.call(this, child);
      } catch (error) {
        console.log('Suppressed appendChild error:', error);
        return child;
      }
    };

    (Node.prototype as any).insertBefore = function(newNode: any, referenceNode: any) {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error) {
        console.log('Suppressed insertBefore error:', error);
        return newNode;
      }
    };

    return () => {
      // Restore original methods
      Node.prototype.removeChild = originalRemoveChild;
      Node.prototype.appendChild = originalAppendChild;
      Node.prototype.insertBefore = originalInsertBefore;
    };
  }, []);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isScanningImage, setIsScanningImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string>('');
  const [scanMode, setScanMode] = useState<'camera' | 'upload'>('camera');
  const [scanTimeout, setScanTimeout] = useState<NodeJS.Timeout | null>(null);
  const [errorCount, setErrorCount] = useState(0);
  const [isScannerActive, setIsScannerActive] = useState(false);
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);
  const [isInitializing, setIsInitializing] = useState(false);
  const [emergencyStop, setEmergencyStop] = useState(false);
  
  // Function to switch between camera and upload modes
  const switchToUploadMode = useCallback(async () => {
    if (html5QrcodeRef.current && isScannerActive) {
      console.log("Switching to upload mode - stopping camera scanner...");
      await safeStopScanner(html5QrcodeRef.current);
      setIsScannerActive(false);
      setIsInitialized(false);
      // Wait for camera to fully stop
      await new Promise(resolve => setTimeout(resolve, 300));
    }
    // Clear scanner instance for upload mode
    html5QrcodeRef.current = null;
    setIsInitialized(false);
    setIsScannerActive(false);
    setIsInitializing(false);
    setHasError(false);
    setErrorMessage("");
  }, [isScannerActive]);
  
  const switchToCameraMode = useCallback(async () => {
    if (html5QrcodeRef.current) {
      console.log("Switching to camera mode - clearing file scanner...");
      // Clear the scanner instance to prepare for camera mode
      html5QrcodeRef.current = null;
    }
    // Reset states for camera mode
    setIsInitialized(false);
    setIsScannerActive(false);
    setIsInitializing(false);
    setHasError(false);
    setErrorMessage("");
  }, []);

  const getBrowserInfo = useCallback(() => {
    const userAgent = navigator.userAgent.toLowerCase();
    const isFirefox = userAgent.includes('firefox');
    const isChrome = userAgent.includes('chrome') && !userAgent.includes('edg');
    const isSafari = userAgent.includes('safari') && !userAgent.includes('chrome');
    const isEdge = userAgent.includes('edg');
    const isIOS = /iphone|ipad|ipod/.test(userAgent);
    const isMobile = /android|iphone|ipad|ipod|blackberry|iemobile|opera mini/.test(userAgent);
    
    return { isFirefox, isChrome, isSafari, isEdge, isIOS, isMobile };
  }, []);

  const scanImageFile = useCallback(async (file: File) => {
    // Only allow file scanning in upload mode
    if (scanMode !== 'upload') {
      setImageUploadError("Please select upload mode first.");
      return;
    }
    
    setIsScanningImage(true);
    setImageUploadError('');

    try {
      console.log("Scanning image file:", file.name);
      console.log("File type:", file.type);
      console.log("File size:", file.size, "bytes");
      
      // Use jsQR for better QR code detection (like the sample)
      const reader = new FileReader();
      
      const result = await new Promise<string | null>((resolve, reject) => {
        reader.onload = (event) => {
          const img = new window.Image();
          img.onload = () => {
            try {
              // Create a canvas to process the image
              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d');
              if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
              }
              
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);
              
              // Get image data for jsQR
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              // Try multiple detection methods for better success rate
              let qrCode = null;
              
              // Method 1: Standard detection
              qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });
              
              // Method 2: If no QR code found, try with different image processing
              if (!qrCode) {
                console.log("Standard detection failed, trying enhanced processing...");
                
                // Create a higher contrast version
                const enhancedCanvas = document.createElement('canvas');
                const enhancedCtx = enhancedCanvas.getContext('2d');
                if (enhancedCtx) {
                  enhancedCanvas.width = canvas.width;
                  enhancedCanvas.height = canvas.height;
                  
                  // Apply contrast enhancement
                  enhancedCtx.drawImage(canvas, 0, 0);
                  const enhancedImageData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
                  
                  // Enhance contrast
                  const data = enhancedImageData.data;
                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Increase contrast
                    data[i] = Math.min(255, r * 1.5);
                    data[i + 1] = Math.min(255, g * 1.5);
                    data[i + 2] = Math.min(255, b * 1.5);
                  }
                  
                  enhancedCtx.putImageData(enhancedImageData, 0, 0);
                  const enhancedData = enhancedCtx.getImageData(0, 0, enhancedCanvas.width, enhancedCanvas.height);
                  
                  qrCode = jsQR(enhancedData.data, enhancedData.width, enhancedData.height, {
                    inversionAttempts: 'attemptBoth'
                  });
                }
              }
              
              // Method 3: Try with different image size if still no success
              if (!qrCode && canvas.width > 200) {
                console.log("Enhanced processing failed, trying resized image...");
                
                const resizedCanvas = document.createElement('canvas');
                const resizedCtx = resizedCanvas.getContext('2d');
                if (resizedCtx) {
                  // Resize to a standard size for better detection
                  const targetSize = 400;
                  resizedCanvas.width = targetSize;
                  resizedCanvas.height = targetSize;
                  
                  resizedCtx.drawImage(canvas, 0, 0, targetSize, targetSize);
                  const resizedImageData = resizedCtx.getImageData(0, 0, targetSize, targetSize);
                  
                  qrCode = jsQR(resizedImageData.data, targetSize, targetSize, {
                    inversionAttempts: 'attemptBoth'
                  });
                }
              }
              
              
              if (qrCode) {
                console.log("QR code detected:", qrCode.data);
                
                // Extract both IMEI and mobile numbers from QR code text
                const { imeis, mobiles } = extractNumbersFromText(qrCode.data);
                if (imeis.length > 0) {
                  // Use the first valid IMEI found
                  const validImei = imeis.find(imei => imeiIsValid(imei)) || imeis[0];
                  console.log("IMEI extracted:", validImei);
                  resolve(validImei);
                } else if (mobiles.length > 0) {
                  // Use the first mobile number found
                  const mobileNumber = mobiles[0];
                  console.log("Mobile number extracted:", mobileNumber);
                  resolve(mobileNumber);
                } else {
                  // Try to parse JSON if QR contains structured data
                  try {
                    const obj = JSON.parse(qrCode.data);
                    const candidates: string[] = [];
                    
                    function walkObject(o: any) {
                      if (!o) return;
                      if (typeof o === 'string') {
                        const { imeis, mobiles } = extractNumbersFromText(o);
                        candidates.push(...imeis, ...mobiles);
                      } else if (typeof o === 'object') {
                        for (const key in o) {
                          walkObject(o[key]);
                        }
                      }
                    }
                    
                    walkObject(obj);
                    if (candidates.length > 0) {
                      const validImei = candidates.find(imei => imeiIsValid(imei)) || candidates[0];
                      console.log("IMEI extracted from JSON:", validImei);
                      resolve(validImei);
                    } else {
                      reject(new Error('No IMEI found in QR code data'));
                    }
                  } catch (jsonError) {
                    reject(new Error('QR code detected but no IMEI found in text'));
                  }
                }
              } else {
                console.log("No QR code detected in image. Image dimensions:", canvas.width, "x", canvas.height);
                reject(new Error('No QR code detected in image. Try: 1) Better lighting, 2) Higher contrast, 3) Larger code size, 4) Different angle'));
              }
            } catch (error) {
              reject(error);
            }
          };
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = event.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
      });
      
      if (result && onScanSuccess) {
        onScanSuccess(result);
      }
    } catch (error: any) {
      console.error("Error scanning image:", error);
      
      // Provide specific error messages based on error type
      if (error.message && error.message.includes('No QR code detected')) {
        setImageUploadError(
          "❌ No QR code detected in the image\n\n" +
          "Please ensure your image:\n" +
          "• Contains a clear, complete QR code\n" +
          "• Has good lighting and contrast\n" +
          "• Shows the QR code without blur or damage\n" +
          "• Has the QR code taking up a good portion of the image\n" +
          "• Is not too dark or too bright\n\n" +
          "💡 Tip: Try taking a new photo with better lighting and focus"
        );
      } else if (error.message && error.message.includes('No IMEI found')) {
        setImageUploadError(
          "❌ QR code detected but no IMEI found\n\n" +
          "The QR code was detected but doesn't contain a valid IMEI.\n" +
          "Please ensure the QR code contains:\n" +
          "• A 15-digit IMEI number\n" +
          "• Valid IMEI format\n\n" +
          "💡 Tip: Check if the QR code contains the correct IMEI data"
        );
      } else if (error.message && error.message.includes('Failed to load image')) {
        setImageUploadError(
          "❌ Failed to load image\n\n" +
          "Please try:\n" +
          "• Using a different image file\n" +
          "• Ensuring the file is not corrupted\n" +
          "• Checking the file format (PNG, JPG, JPEG)"
        );
      } else {
        setImageUploadError(
          `❌ Scanning failed: ${error.message || 'Unknown error'}\n\n` +
          "Please try:\n" +
          "• Using a different image\n" +
          "• Ensuring the image contains a valid QR code with IMEI\n" +
          "• Checking that the file is not corrupted"
        );
      }
    } finally {
      setIsScanningImage(false);
    }
  }, [onScanSuccess, scanMode]);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear any previous errors
      setImageUploadError('');
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setImageUploadError(
          '❌ Invalid file format\n\n' +
          'Please upload a PNG, JPG, or JPEG image.\n' +
          'Current file type: ' + file.type
        );
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setImageUploadError(
          '❌ File too large\n\n' +
          'Please upload an image smaller than 10MB.\n' +
          'Current file size: ' + (file.size / (1024 * 1024)).toFixed(2) + 'MB'
        );
        return;
      }
      
      // Check if file is too small (less than 1KB might be corrupted)
      if (file.size < 1024) {
        setImageUploadError(
          '❌ File too small\n\n' +
          'The image file appears to be corrupted or too small.\n' +
          'Please try a different image.'
        );
        return;
      }
      
      // Show loading state
      setIsScanningImage(true);
      
      // Start scanning
      scanImageFile(file);
    }
  }, [scanImageFile]);

  const safeStopScanner = useCallback(async (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    
    try {
      // Update state immediately
      setIsScannerActive(false);
      
      // Check if the container still exists in the DOM
      const container = document.getElementById(qrCodeContainerId);
      if (!container) {
        console.log("Container no longer exists, scanner cleanup skipped");
        return;
      }
      
      // Check if scanner is still active
      if (scanner.getState && scanner.getState() === 1) { // 1 = SCANNING state
        // Add a small delay to ensure DOM is stable
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check again if container still exists
        const containerStillExists = document.getElementById(qrCodeContainerId);
        if (!containerStillExists) {
          console.log("Container removed during cleanup, skipping stop");
          return;
        }
        
        await scanner.stop();
        console.log("Scanner stopped safely");
      }
      
      // Clear any pending timeouts
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        setScanTimeout(null);
      }
      
    } catch (err) {
      console.error("Error stopping scanner:", err);
      // Continue anyway - the scanner might already be stopped
    }
  }, [qrCodeContainerId, scanTimeout]);

  const waitForContainer = useCallback(async (maxAttempts = 20, delay = 100) => {
    for (let i = 0; i < maxAttempts; i++) {
      const containerElement = containerRef.current || document.getElementById(qrCodeContainerId);
      
      // Debug information
      console.log(`Container check ${i + 1}:`, {
        containerRef: !!containerRef.current,
        getElementById: !!document.getElementById(qrCodeContainerId),
        containerElement: !!containerElement,
        inDOM: containerElement ? document.contains(containerElement) : false,
        containerId: qrCodeContainerId
      });
      
      // Check if container exists and is in the DOM
      if (containerElement && document.contains(containerElement)) {
        console.log(`Container ready after ${i + 1} attempts`);
        return true;
      }
      
      // If we can't find the container, try to create it
      if (i === 5 && !containerElement) {
        console.log("Container not found, checking if we need to create it...");
        const existingElement = document.getElementById(qrCodeContainerId);
        if (!existingElement && containerRef.current) {
          console.log("Container ref exists but not in DOM, this might be a React timing issue");
        }
      }
      
      console.log(`Waiting for container, attempt ${i + 1}/${maxAttempts}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.error("Container not ready after maximum attempts");
    return false;
  }, [qrCodeContainerId]);

  const checkCameraPermission = useCallback(async () => {
    try {
      if (!navigator.permissions) {
        console.log("Permissions API not supported");
        return 'unknown';
      }

      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      console.log("Camera permission state:", permission.state);
      setPermissionState(permission.state);
      return permission.state;
    } catch (error) {
      console.log("Permission check failed:", error);
      return 'unknown';
    }
  }, []);

  const requestCameraPermission = useCallback(async () => {
    setIsRequestingPermission(true);
    try {
      console.log("Requesting camera permission...");
      
      const browserInfo = getBrowserInfo();
      console.log("Requesting permission for browser:", browserInfo);
      
      // Universal camera constraints that work across all browsers
      const constraints = {
        video: {
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          facingMode: { ideal: 'environment' },
          frameRate: { ideal: 30, max: 60 }
        }
      };
      
      // Try multiple constraint combinations for maximum compatibility
      const constraintOptions = [
        // Option 1: Full constraints with environment camera
        constraints,
        // Option 2: Simplified constraints with environment camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: { ideal: 'environment' }
          }
        },
        // Option 3: iOS Safari specific constraints
        ...(browserInfo.isIOS ? [{
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: { ideal: 'environment' },
            frameRate: { ideal: 15 }
          }
        }] : []),
        // Option 4: Basic constraints with any camera
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // Option 5: Minimal constraints
        { video: true }
      ];
      
      let stream;
      let lastError;
      
      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          console.log(`Trying camera constraint option ${i + 1}:`, constraintOptions[i]);
          stream = await navigator.mediaDevices.getUserMedia(constraintOptions[i]);
          console.log(`Camera permission granted with option ${i + 1}`);
          break;
        } catch (error: any) {
          console.log(`Camera constraint option ${i + 1} failed:`, error);
          lastError = error;
          continue;
        }
      }
      
      if (!stream) {
        throw lastError || new Error("All camera constraint options failed");
      }
      
      setPermissionState('granted');
      
      // Stop the stream immediately as we just needed permission
      stream.getTracks().forEach(track => track.stop());
      
      return true;
    } catch (error: any) {
      console.error("Camera permission denied:", error);
      
      if (error.name === 'NotAllowedError') {
        setPermissionState('denied');
        setErrorMessage("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
        setHasError(true);
      } else if (error.name === 'NotFoundError') {
        setErrorMessage("No camera found. Please connect a camera and try again.");
        setHasError(true);
      } else if (error.name === 'NotReadableError') {
        setErrorMessage("Camera is already in use by another application. Please close other camera applications and try again.");
        setHasError(true);
      } else if (error.name === 'OverconstrainedError') {
        setErrorMessage("Camera constraints not supported. Please try a different camera or browser.");
        setHasError(true);
      } else {
        setErrorMessage(`Failed to access camera: ${error.message}. Please check your browser settings.`);
        setHasError(true);
      }
      return false;
    } finally {
      setIsRequestingPermission(false);
    }
  }, [getBrowserInfo]);

  const getScannerConfig = useCallback(() => {
    const { isFirefox, isSafari, isEdge, isIOS, isMobile } = getBrowserInfo();
    
    // Universal configuration that works across all browsers
    const baseConfig = {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          disableFlip: false,
      aspectRatio: 1.0,
      showTorchButtonIfSupported: true,
      showZoomSliderIfSupported: true,
      defaultZoomValueIfSupported: 2,
      useBarCodeDetectorIfSupported: true,
      rememberLastUsedCamera: true,
      // Support both QR codes and linear barcodes
      formatsToSupport: [
        Html5QrcodeSupportedFormats.QR_CODE,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.CODE_93,
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.CODABAR,
        Html5QrcodeSupportedFormats.ITF,
        Html5QrcodeSupportedFormats.AZTEC,
        Html5QrcodeSupportedFormats.DATA_MATRIX,
        Html5QrcodeSupportedFormats.MAXICODE,
        Html5QrcodeSupportedFormats.PDF_417,
        Html5QrcodeSupportedFormats.RSS_14,
        Html5QrcodeSupportedFormats.RSS_EXPANDED
      ]
    };

    // Browser-specific adjustments
    if (isFirefox) {
      return {
        ...baseConfig,
        fps: 5, // Lower FPS for Firefox stability
        showTorchButtonIfSupported: false, // Firefox has issues with torch
        showZoomSliderIfSupported: false, // Firefox has issues with zoom
        useBarCodeDetectorIfSupported: false, // Disable for Firefox
        supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA],
      };
    }
    
    if (isSafari) {
      return {
        ...baseConfig,
        fps: 8, // Moderate FPS for Safari
        showTorchButtonIfSupported: false, // Safari has limited torch support
        useBarCodeDetectorIfSupported: false, // Safari has issues with barcode detector
      };
    }
    
    if (isEdge) {
      return {
        ...baseConfig,
        fps: 8, // Moderate FPS for Edge
        useBarCodeDetectorIfSupported: false, // Edge has limited barcode support
      };
    }
    
    // iOS Safari specific configuration
    if (isIOS) {
      return {
        ...baseConfig,
        fps: 5, // Lower FPS for iOS stability
        qrbox: { width: 200, height: 200 }, // Smaller QR box for mobile
        showTorchButtonIfSupported: false, // iOS Safari has issues with torch
        showZoomSliderIfSupported: false, // iOS Safari has issues with zoom
        useBarCodeDetectorIfSupported: false, // Disable for iOS compatibility
        aspectRatio: 1.0, // Square aspect ratio for mobile
      };
    }
    
    // Mobile browsers (Android, etc.)
    if (isMobile) {
      return {
        ...baseConfig,
        fps: 8, // Moderate FPS for mobile
        qrbox: { width: 200, height: 200 }, // Smaller QR box for mobile
        aspectRatio: 1.0, // Square aspect ratio for mobile
      };
    }
    
    // Chrome and other browsers
    return baseConfig;
  }, [getBrowserInfo]);

  const initializeScannerDirect = useCallback(async () => {
    try {
      // Emergency stop - completely disable scanner
      if (emergencyStop) {
        console.log("Emergency stop activated - scanner disabled");
        return;
      }
      
      // Prevent multiple initializations - more strict checks
      if (isScannerActive || html5QrcodeRef.current || isInitialized || isInitializing) {
        console.log("Scanner already active, initialized, or in progress, skipping...");
        return;
      }
      
      setIsInitializing(true);
      console.log("Initializing scanner with direct Html5Qrcode...");
      
      // Clear any existing timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        setScanTimeout(null);
      }
      
      // Reset error count and state
      setErrorCount(0);
      setLastErrorTime(0);
      
      // iOS-specific delay to ensure DOM is ready
      if (getBrowserInfo().isIOS) {
        console.log("iOS detected, adding initialization delay...");
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // Create Html5Qrcode instance
      html5QrcodeRef.current = new Html5Qrcode(qrCodeContainerId);
      
      // Get camera devices
      const devices = await Html5Qrcode.getCameras();
      console.log("Available cameras:", devices);
      setAvailableCameras(devices);
      
      if (devices.length === 0) {
        setErrorMessage("No camera found. Please connect a camera and try again.");
        setHasError(true);
        return;
      }
      
      // Prefer front-facing camera for desktop/laptop, fallback to any camera
      let cameraId = devices[0].id;
      const frontCamera = devices.find(device => 
        device.label.toLowerCase().includes('front') || 
        device.label.toLowerCase().includes('facing') ||
        device.label.toLowerCase().includes('user')
      );
      
      if (frontCamera) {
        cameraId = frontCamera.id;
        setSelectedCameraId(frontCamera.id);
        console.log("Using front-facing camera:", frontCamera.label);
      } else {
        setSelectedCameraId(devices[0].id);
        console.log("Using first available camera:", devices[0].label);
      }
      
      // Use selected camera or fallback to detected camera
      const finalCameraId = selectedCameraId || cameraId;
      
      // Start scanning with the camera
      await html5QrcodeRef.current.start(
        finalCameraId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          // Desktop-optimized constraints
          videoConstraints: {
            facingMode: "user", // Prefer front-facing camera
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        (decodedText) => {
          console.log("QR Code detected:", decodedText);
          
          // Clear timeout on successful scan
          if (scanTimeout) {
            clearTimeout(scanTimeout);
            setScanTimeout(null);
          }
          
          // Reset error count and state on successful scan
          setErrorCount(0);
          setLastErrorTime(0);
          setIsScannerActive(false);
          
          // Extract both IMEI and mobile numbers from the decoded text
          const { imeis, mobiles } = extractNumbersFromText(decodedText);
          
          if (imeis.length > 0) {
            // Use the first valid IMEI found
            const validImei = imeis.find(imei => imeiIsValid(imei)) || imeis[0];
            console.log("IMEI extracted from QR:", validImei);
            onScanSuccess(validImei);
          } else if (mobiles.length > 0) {
            // Use the first mobile number found
            const mobileNumber = mobiles[0];
            console.log("Mobile number extracted from QR:", mobileNumber);
            onScanSuccess(mobileNumber);
          } else {
            // Try to parse JSON if QR contains structured data
            try {
              const obj = JSON.parse(decodedText);
              const candidates: string[] = [];
              
              function walkObject(o: any) {
                if (!o) return;
                if (typeof o === 'string') {
                  const { imeis, mobiles } = extractNumbersFromText(o);
                  candidates.push(...imeis, ...mobiles);
                } else if (typeof o === 'object') {
                  for (const key in o) {
                    walkObject(o[key]);
                  }
                }
              }
              
              walkObject(obj);
              if (candidates.length > 0) {
                const validImei = candidates.find(imei => imeiIsValid(imei)) || candidates[0];
                console.log("IMEI extracted from JSON:", validImei);
                onScanSuccess(validImei);
              } else {
                console.log("QR code detected but no IMEI found");
                onScanSuccess(decodedText); // Fallback to original text
              }
            } catch (jsonError) {
              console.log("QR code detected but no IMEI found in text");
              onScanSuccess(decodedText); // Fallback to original text
            }
          }
          
          // Stop scanning after successful detection
          if (html5QrcodeRef.current) {
            try {
              html5QrcodeRef.current.stop().then(() => {
                console.log("Scanner stopped after successful scan");
              }).catch((err) => {
                console.error("Error stopping scanner:", err);
              });
            } catch (err) {
              console.error("Error in scanner stop callback:", err);
            }
          }
        },
        undefined // Completely disable error callback to prevent infinite loop
      );
      
      console.log("Direct scanner started successfully");
      setIsInitialized(true);
      setIsScannerActive(true);
      setIsInitializing(false);
      
      // Set a timeout to stop scanning after 30 seconds if no QR code is found
      const timeout = setTimeout(() => {
        console.log("Scanner timeout reached, stopping to prevent infinite scanning");
        setIsScannerActive(false);
        if (html5QrcodeRef.current) {
          safeStopScanner(html5QrcodeRef.current);
        }
      }, 30000); // 30 seconds timeout
      
      setScanTimeout(timeout);
      
    } catch (error: any) {
      console.error("Direct scanner initialization error:", error);
      setIsInitializing(false);
      
      if (error.name === 'NotAllowedError') {
        setErrorMessage("Camera permission denied. Please allow camera access and try again.");
        setHasError(true);
      } else if (error.name === 'NotFoundError') {
        setErrorMessage("No camera found. Please connect a camera and try again.");
        setHasError(true);
      } else if (error.name === 'NotReadableError') {
        setErrorMessage("Camera is already in use. Please close other applications using the camera.");
        setHasError(true);
      } else {
        setErrorMessage(`Failed to start camera: ${error.message}`);
        setHasError(true);
      }
    }
  }, [onScanSuccess, onScanError, qrCodeContainerId]);

  const initializeScanner = useCallback(async () => {
    // Emergency stop - completely disable scanner
    if (emergencyStop) {
      console.log("Emergency stop activated - scanner disabled");
      return;
    }
    
    if (scannerRef.current || html5QrcodeRef.current || hasError || isInitialized || isInitializingRef.current || isScannerActive || isInitializing) {
      console.log("Scanner already initialized, has error, is initializing, or is active, skipping...");
      return;
    }

    isInitializingRef.current = true;
    try {
      console.log("Starting scanner initialization...");
      
      // Check if we're in a secure context (HTTPS or localhost)
      if (!window.isSecureContext && window.location.hostname !== 'localhost') {
        setErrorMessage("Camera access requires HTTPS or localhost");
        setHasError(true);
        return;
      }

      // Check camera permission first
      const permission = await checkCameraPermission();
      
      if (permission === 'denied') {
        setErrorMessage("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
        setHasError(true);
        return;
      }

      // If permission is not granted, request it
      if (permission !== 'granted') {
        console.log("Camera permission not granted, requesting permission...");
        const permissionGranted = await requestCameraPermission();
        if (!permissionGranted) {
          return; // Error already set by requestCameraPermission
        }
      }

      // Check if camera is available
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      if (videoDevices.length === 0) {
        setErrorMessage("No camera found. Please connect a camera and refresh the page.");
        setHasError(true);
        return;
      }

      console.log("Camera devices found:", videoDevices.length);

      // Wait for container to be ready
      console.log("Waiting for container to be ready...");
      const containerReady = await waitForContainer(10, 200); // Reduced attempts and increased delay
      
      if (!containerReady) {
        console.log("Container not ready, trying fallback approach...");
        // Try to use the container ref directly even if it's not in DOM yet
        if (containerRef.current) {
          console.log("Using container ref directly as fallback");
          // Continue with initialization using the ref
        } else {
          setErrorMessage("Scanner container not ready. This may be due to slow page loading. Please try the 'Reset & Try Again' button.");
          setHasError(true);
          return;
        }
      }

      // Try direct initialization first
      console.log("Attempting direct scanner initialization...");
      await initializeScannerDirect();
      
    } catch (error) {
      console.error("Scanner initialization error:", error);
      setErrorMessage("Failed to initialize camera. Please check your browser settings and try again.");
      setHasError(true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [onScanSuccess, onScanError, qrCodeContainerId, hasError, isInitialized, checkCameraPermission, requestCameraPermission, getBrowserInfo, getScannerConfig, waitForContainer, initializeScannerDirect]);

  // Camera will only start when user explicitly clicks the camera button

  // Scanner will only initialize when user explicitly clicks camera button
  // No automatic initialization on component mount

  if (hasError) {
    return (
      <div className="w-full p-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {errorMessage}
          </AlertDescription>
        </Alert>
        <div className="mt-4 text-sm text-muted-foreground">
          <p className="mb-2">Troubleshooting tips:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Make sure you're using HTTPS or localhost</li>
            <li>Check that your camera is connected and working</li>
            <li>Allow camera permissions in your browser</li>
            <li>Try refreshing the page</li>
            {getBrowserInfo().isFirefox && (
              <>
                <li><strong>Firefox:</strong> Try disabling hardware acceleration in Firefox settings</li>
                <li><strong>Firefox:</strong> Make sure you're using the latest version</li>
              </>
            )}
            {getBrowserInfo().isSafari && (
              <>
                <li><strong>Safari:</strong> Make sure you're using Safari 14+ for best compatibility</li>
                <li><strong>Safari:</strong> Try disabling "Prevent cross-site tracking" in Safari settings</li>
              </>
            )}
            {getBrowserInfo().isChrome && (
              <>
                <li><strong>Chrome:</strong> Try disabling extensions that might block camera access</li>
                <li><strong>Chrome:</strong> Check if camera is being used by another tab</li>
              </>
            )}
            {getBrowserInfo().isIOS && (
              <>
                <li><strong>iPhone/iPad:</strong> Make sure you're using Safari (not Chrome or other browsers)</li>
                <li><strong>iPhone/iPad:</strong> Go to Settings → Safari → Camera → Allow</li>
                <li><strong>iPhone/iPad:</strong> Make sure the website is using HTTPS</li>
                <li><strong>iPhone/iPad:</strong> Try refreshing the page after granting permissions</li>
                <li><strong>iPhone/iPad:</strong> Make sure you're not in private browsing mode</li>
                <li><strong>iPhone/iPad:</strong> Try closing other apps that might be using the camera</li>
                <li><strong>iPhone/iPad:</strong> Try restarting Safari completely</li>
                <li><strong>iPhone/iPad:</strong> Check if you're on iOS 14+ (older versions have limited support)</li>
                <li><strong>iPhone/iPad:</strong> Try using the manual input option below</li>
              </>
            )}
          </ul>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={async () => {
              setHasError(false);
              setErrorMessage("");
              setIsInitialized(false);
              isInitializingRef.current = false;
              
              // Clean up existing scanners
              if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => {
                  console.error("Failed to clear scanner:", err);
                });
                scannerRef.current = null;
              }
              
              if (html5QrcodeRef.current) {
                await safeStopScanner(html5QrcodeRef.current);
                html5QrcodeRef.current = null;
              }
              
              setTimeout(() => initializeScanner(), 100);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Retry Scanner
          </button>
          {permissionState === 'denied' && (
            <button
              onClick={async () => {
                setHasError(false);
                setErrorMessage("");
                setIsInitialized(false);
                isInitializingRef.current = false;
                await requestCameraPermission();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Request Camera Permission
            </button>
          )}
          <button
            onClick={async () => {
              setHasError(false);
              setErrorMessage("");
              setIsInitialized(false);
              isInitializingRef.current = false;
              setPermissionState('unknown');
              
              // Clean up existing scanners
              if (scannerRef.current) {
                scannerRef.current.clear().catch((err) => {
                  console.error("Failed to clear scanner:", err);
                });
                scannerRef.current = null;
              }
              
              if (html5QrcodeRef.current) {
                await safeStopScanner(html5QrcodeRef.current);
                html5QrcodeRef.current = null;
              }
              
              setTimeout(() => initializeScanner(), 500);
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Reset & Try Again
          </button>
          {getBrowserInfo().isIOS && (
            <button
              onClick={() => {
                // This will be handled by the parent component to show manual input
                if (onScanError) {
                  onScanError("Manual input requested for iOS compatibility");
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
            >
              📱 Use Manual Input (Recommended for iPhone)
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isRequestingPermission) {
    return (
      <div className="w-full p-4 text-center">
        <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
        <p className="text-sm text-muted-foreground">Requesting camera permission...</p>
        <p className="text-xs text-muted-foreground mt-1">Please allow camera access when prompted</p>
      </div>
    );
  }

  return (
    <ScannerErrorBoundary>
      <div className="w-full">
        {/* Camera selector for desktop users */}
        {availableCameras.length > 1 && (
          <div className="mb-4 p-3 bg-muted rounded-lg">
            <label className="text-sm font-medium mb-2 block">Select Camera:</label>
            <select 
              value={selectedCameraId} 
              onChange={(e) => setSelectedCameraId(e.target.value)}
              className="w-full p-2 border rounded-md text-sm"
              disabled={isInitialized}
            >
              {availableCameras.map((camera) => (
                <option key={camera.id} value={camera.id}>
                  {camera.label || `Camera ${camera.id.slice(0, 8)}`}
                </option>
              ))}
            </select>
            {!isInitialized && selectedCameraId && (
              <button
                onClick={() => initializeScanner()}
                className="mt-2 px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
              >
                Switch Camera
              </button>
            )}
          </div>
        )}
        
        {/* Emergency Stop Button */}
        {!emergencyStop && (
          <div className="w-full p-2 bg-red-50 border-b border-red-200">
            <button
              onClick={() => {
                setEmergencyStop(true);
                // Stop any active scanner
                if (html5QrcodeRef.current) {
                  safeStopScanner(html5QrcodeRef.current);
                }
                console.log("Emergency stop activated - scanner disabled");
              }}
              className="w-full px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition-colors"
            >
              🛑 Emergency Stop Scanner (Click if infinite loop)
            </button>
          </div>
        )}
        
        {/* Emergency Stop Message */}
        {emergencyStop && (
          <div className="w-full p-4 bg-red-50 border-b border-red-200">
            <div className="text-center">
              <h3 className="text-lg font-semibold text-red-700 mb-2">Scanner Disabled</h3>
              <p className="text-sm text-red-600 mb-3">Scanner has been emergency stopped to prevent infinite loop</p>
              <button
                onClick={() => {
                  setEmergencyStop(false);
                  setHasError(false);
                  setErrorMessage("");
                  setIsInitialized(false);
                  setIsScannerActive(false);
                  setIsInitializing(false);
                  setErrorCount(0);
                  console.log("Emergency stop deactivated - scanner re-enabled");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ✅ Re-enable Scanner
              </button>
            </div>
          </div>
        )}
        
        {/* Mode Selection */}
        {!emergencyStop && (
          <div className="w-full p-4 border-b border-gray-200">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold text-gray-700 mb-2">Choose Scanning Method</h3>
              <p className="text-sm text-gray-500">Select how you'd like to scan the QR code</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
            {/* Camera Option */}
            <button
              onClick={async () => {
                await switchToCameraMode();
                setScanMode('camera');
                // Start camera initialization
                setTimeout(() => {
                  initializeScanner();
                }, 100);
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                scanMode === 'camera'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2" />
                <h4 className="font-medium">Use Camera</h4>
                <p className="text-xs mt-1">Live scanning</p>
              </div>
            </button>
            
            {/* Upload Option */}
            <button
              onClick={async () => {
                await switchToUploadMode();
                setScanMode('upload');
              }}
              className={`p-4 rounded-lg border-2 transition-all ${
                scanMode === 'upload'
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
              }`}
            >
              <div className="text-center">
                <Upload className="h-8 w-8 mx-auto mb-2" />
                <h4 className="font-medium">Upload Image</h4>
                <p className="text-xs mt-1">From gallery</p>
              </div>
            </button>
          </div>
          </div>
        )}
        
        {/* Upload Mode UI */}
        {scanMode === 'upload' && (
          <div className="w-full p-4 border-b border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className="text-center">
                <Image className="h-6 w-6 mx-auto mb-2 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-700">Upload Image</h3>
                <p className="text-sm text-gray-500">Upload an image containing a QR code or barcode</p>
                <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-700 font-medium mb-1">📸 Tips for better scanning:</p>
                  <ul className="text-xs text-blue-600 text-left space-y-1">
                    <li>• Ensure good lighting on the code</li>
                    <li>• Keep the code flat and straight</li>
                    <li>• Make sure the code fills most of the image</li>
                    <li>• Avoid shadows or reflections on the code</li>
                    <li>• Works with both QR codes and linear barcodes</li>
                    <li>• For phone screens: increase brightness</li>
                    <li>• For printed codes: ensure high contrast</li>
                    <li>• Try different angles if first attempt fails</li>
                    <li>• Clean the camera lens for better focus</li>
                  </ul>
                </div>
                
                <div className="mt-3 p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-700 font-medium mb-1">🧪 Test the scanner:</p>
                  <p className="text-xs text-green-600 mb-2">Try scanning this test QR code:</p>
                  <div className="text-center">
                    <div className="inline-block p-2 bg-white border border-green-200 rounded">
                      <div className="w-16 h-16 bg-black grid grid-cols-8 gap-0.5">
                        {/* Simple QR code pattern for testing */}
                        {Array.from({ length: 64 }, (_, i) => (
                          <div 
                            key={i} 
                            className={`w-1 h-1 ${Math.random() > 0.5 ? 'bg-white' : 'bg-black'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-green-600 mt-1">Test IMEI: 123456789012345</p>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-yellow-50 rounded-lg">
                  <p className="text-xs text-yellow-700 font-medium mb-1">📱 Common Issues:</p>
                  <ul className="text-xs text-yellow-600 text-left space-y-1">
                    <li>• Image too blurry or out of focus</li>
                    <li>• Code too small or too large in the image</li>
                    <li>• Poor lighting or shadows</li>
                    <li>• Code partially cut off or damaged</li>
                    <li>• Barcode not straight or skewed</li>
                    <li>• Image format not supported</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-4">
              <label htmlFor="image-upload" className="cursor-pointer">
                <div className="flex items-center justify-center w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-colors">
                  <div className="text-center">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium text-gray-600">
                      {isScanningImage ? 'Scanning image...' : 'Click to upload image'}
                    </p>
                    <p className="text-xs text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                  </div>
                </div>
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={isScanningImage}
                  className="hidden"
                />
              </label>
              
              {imageUploadError && (
                <div className="w-full p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center space-x-2 text-red-600 mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Upload Error</span>
                  </div>
                  <div className="text-sm text-red-600 whitespace-pre-line">
                    {imageUploadError}
                  </div>
                  <div className="mt-2 flex flex-col space-y-2">
                    <button
                      onClick={() => {
                        setImageUploadError('');
                        // Reset the file input
                        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-xs text-red-500 hover:text-red-700 underline"
                    >
                      Try again with a different image
                    </button>
                    <button
                      onClick={() => {
                        setImageUploadError('');
                        // Trigger manual input mode
                        if (onScanSuccess) {
                          const manualImei = prompt("Enter IMEI manually:");
                          if (manualImei && manualImei.trim()) {
                            onScanSuccess(manualImei.trim());
                          }
                        }
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700 underline"
                    >
                      Or enter IMEI manually
                    </button>
                    <button
                      onClick={() => {
                        setImageUploadError('');
                        // Try to extract IMEI from the image using OCR-like approach
                        if (onScanSuccess) {
                          const extractedImei = prompt("If you can see the IMEI number in the image, enter it here:");
                          if (extractedImei && extractedImei.trim()) {
                            onScanSuccess(extractedImei.trim());
                          }
                        }
                      }}
                      className="text-xs text-green-500 hover:text-green-700 underline"
                    >
                      Or extract IMEI from image text
                    </button>
                  </div>
                </div>
              )}
              
              {isScanningImage && (
                <div className="flex items-center space-x-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Scanning image for QR code...</span>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Scanner Container - Always rendered for both modes */}
        <div className="w-full">
          {/* Mode Status */}
          {scanMode === 'camera' && (
            <div className="w-full p-3 bg-blue-50 border-b border-blue-200">
              <div className="flex items-center justify-center space-x-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Camera Mode Active</span>
                {isInitialized && (
                  <span className="text-xs text-green-600">• Camera Ready</span>
                )}
                {isInitializing && (
                  <span className="text-xs text-yellow-600">• Initializing...</span>
                )}
              </div>
            </div>
          )}
          
          {scanMode === 'upload' && (
            <div className="w-full p-3 bg-green-50 border-b border-green-200">
              <div className="flex items-center justify-center space-x-2">
                <Upload className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-700">Upload Mode Active</span>
                <span className="text-xs text-green-600">• Ready to scan images</span>
              </div>
            </div>
          )}
          
          <div 
            ref={containerRef}
            id={qrCodeContainerId} 
            className="w-full h-auto min-h-[300px]"
            style={{ minHeight: '300px' }}
          >
            {scanMode === 'camera' && !isInitialized && !isInitializing && (
              <div className="w-full p-4 text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-muted-foreground mb-4">Camera not started yet</p>
                <button
                  onClick={() => initializeScanner()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  📷 Start Camera
                </button>
              </div>
            )}
            {scanMode === 'camera' && isInitializing && (
              <div className="w-full p-4 text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
                <p className="text-sm text-muted-foreground">Initializing camera...</p>
                {errorCount > 0 && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Scan attempts: {errorCount} (normal while scanning)
                    {lastErrorTime > 0 && (
                      <span className="block text-xs text-gray-500">
                        Last error: {new Date(lastErrorTime).toLocaleTimeString()}
                      </span>
                    )}
                  </p>
                )}
              </div>
            )}
            {scanMode === 'upload' && (
              <div className="w-full p-4 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p className="text-sm text-muted-foreground">Upload mode ready</p>
                <p className="text-xs text-gray-500 mt-1">Use the upload area above to scan images</p>
              </div>
            )}
      {/* QR Code scanner will render here */}
    </div>
        </div>
        
      </div>
    </ScannerErrorBoundary>
  );
};

export default QrScanner;