"use client";

import React, { useRef, useState, useCallback } from "react";
// Removed html5-qrcode - using native camera API + OCR instead
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera, Upload, Image } from "lucide-react";
import jsQR from "jsqr";
import { createWorker } from 'tesseract.js';

// IMEI and mobile number extraction utilities
const IMEI_REGEX = /(?:\b|[^0-9])([0-9]{15})(?:\b|[^0-9])/g;
const MOBILE_REGEX = /(?:\b|[^0-9])([0-9]{10,15})(?:\b|[^0-9])/g;

// OCR-based IMEI extraction from images
async function extractIMEIsFromImage(canvas: HTMLCanvasElement): Promise<string[]> {
  console.log("Starting OCR-based IMEI extraction...");
  
  try {
    // Create Tesseract worker
    const worker = await createWorker('eng');
    
    // Configure for better number recognition
    await worker.setParameters({
      tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz: ',
    });
    
    // Perform OCR on the canvas
    const { data: { text } } = await worker.recognize(canvas);
    console.log("OCR extracted text:", text);
    
    // Extract IMEI numbers from the OCR text
    const imeis = extractIMEIsFromText(text);
    console.log("IMEIs found via OCR:", imeis);
    
    // Clean up worker
    await worker.terminate();
    
    return imeis;
  } catch (error) {
    console.error("OCR extraction failed:", error);
    return [];
  }
}

// Helper function to split concatenated IMEIs (19-20 digits into two 15-digit IMEIs)
function splitConcatenatedIMEI(longNumber: string): string[] {
  const results: string[] = [];
  
  // If it's 19-20 digits, try to split into two 15-digit IMEIs
  if (longNumber.length >= 19 && longNumber.length <= 20) {
    console.log("Attempting to split concatenated IMEI:", longNumber, "length:", longNumber.length);
    
    // Try splitting at position 15 (most common case)
    const firstImei = longNumber.substring(0, 15);
    const secondPart = longNumber.substring(15);
    
    // First IMEI should always be 15 digits
    if (firstImei.length === 15 && (firstImei.startsWith('3') || firstImei.startsWith('8'))) {
      results.push(firstImei);
      console.log("✅ Split concatenated IMEI - First part (15 digits):", firstImei);
    }
    
    // Handle second part based on remaining length
    if (longNumber.length === 19) {
      // 19 digits = 15 + 4, second part is incomplete
      // Just use the first IMEI, second part is too short
      console.log("⚠️ Second part is only 4 digits, skipping:", secondPart);
    } else if (longNumber.length === 20) {
      // 20 digits = 15 + 5, might be 15 + 5 or could be split differently
      // Try: 15 + 5 (second incomplete) OR 14 + 6 (both incomplete) OR 15 + 5 where second starts with 3/8
      if (secondPart.length === 5) {
        // Second part is only 5 digits, incomplete
        console.log("⚠️ Second part is only 5 digits, skipping:", secondPart);
      }
      
      // Alternative: Try splitting as 14 + 6 (both might be incomplete but valid)
      // But standard is 15 digits, so we'll stick with 15 + 5
    }
    
    // If we have exactly 30 digits, try splitting into two 15-digit IMEIs
    if (longNumber.length === 30) {
      const firstImei30 = longNumber.substring(0, 15);
      const secondImei30 = longNumber.substring(15, 30);
      
      if ((firstImei30.startsWith('3') || firstImei30.startsWith('8')) &&
          (secondImei30.startsWith('3') || secondImei30.startsWith('8'))) {
        results.push(firstImei30);
        results.push(secondImei30);
        console.log("✅ Split 30-digit number into two IMEIs:", firstImei30, "and", secondImei30);
      }
    }
  }
  
  return results;
}

// Enhanced IMEI extraction for phone packaging
function extractIMEIsFromText(text: string): string[] {
  const results: string[] = [];
  let match;
  IMEI_REGEX.lastIndex = 0;
  
  console.log("Extracting IMEIs from text:", text.substring(0, 200) + "...");
  
  // First, try to find IMEI1 specifically (common in phone packaging)
  const imei1Match = text.match(/IMEI\s*1?\s*:?\s*([0-9]{15})/i);
  if (imei1Match) {
    console.log("Found IMEI1:", imei1Match[1]);
    results.push(imei1Match[1]);
  }
  
  // Then find IMEI2 specifically
  const imei2Match = text.match(/IMEI\s*2?\s*:?\s*([0-9]{15})/i);
  if (imei2Match) {
    console.log("Found IMEI2:", imei2Match[1]);
    results.push(imei2Match[1]);
  }
  
  // Also try to find IMEI/MEID pattern (common on iPhone boxes)
  const imeiMeidMatch = text.match(/IMEI\/MEID\s*:?\s*([0-9]{15})/i);
  if (imeiMeidMatch) {
    console.log("Found IMEI/MEID:", imeiMeidMatch[1]);
    results.push(imeiMeidMatch[1]);
  }
  
  // Check for concatenated IMEIs (19-20 digits after "IMEI:")
  // This handles cases like "IMEI: 3251600990000013254" where two IMEIs are concatenated
  const concatenatedMatch = text.match(/IMEI\s*:?\s*([0-9]{19,30})/i);
  if (concatenatedMatch) {
    const longNumber = concatenatedMatch[1];
    console.log("🔍 Found concatenated IMEI pattern (19-30 digits after 'IMEI:'):", longNumber);
    
    // Only process if it's 19-20 or 30 digits (two complete IMEIs)
    if (longNumber.length >= 19 && longNumber.length <= 20) {
      const splitImeis = splitConcatenatedIMEI(longNumber);
      splitImeis.forEach(imei => {
        if (!results.includes(imei)) {
          results.push(imei);
          console.log("✅ Added IMEI from concatenated pattern:", imei);
        }
      });
    } else if (longNumber.length === 30) {
      // 30 digits = two complete 15-digit IMEIs
      const splitImeis = splitConcatenatedIMEI(longNumber);
      splitImeis.forEach(imei => {
        if (!results.includes(imei)) {
          results.push(imei);
          console.log("✅ Added IMEI from 30-digit pattern:", imei);
        }
      });
    }
  }
  
  // Find any standalone 19-20 or 30 digit numbers that might be concatenated IMEIs
  // This catches cases where the number appears without "IMEI:" prefix
  const longNumberMatch = text.match(/(?:^|[^0-9])([0-9]{19,20})(?:[^0-9]|$)/);
  if (longNumberMatch) {
    const longNumber = longNumberMatch[1];
    // Only process if it starts with 3 or 8 (common IMEI prefixes)
    if (longNumber.startsWith('3') || longNumber.startsWith('8')) {
      console.log("🔍 Found standalone concatenated IMEI (19-20 digits):", longNumber);
      const splitImeis = splitConcatenatedIMEI(longNumber);
      splitImeis.forEach(imei => {
        if (!results.includes(imei)) {
          results.push(imei);
          console.log("✅ Added IMEI from standalone pattern:", imei);
        }
      });
    }
  }
  
  // Also check for 30-digit standalone numbers (two complete IMEIs)
  const thirtyDigitMatch = text.match(/(?:^|[^0-9])([0-9]{30})(?:[^0-9]|$)/);
  if (thirtyDigitMatch) {
    const longNumber = thirtyDigitMatch[1];
    if (longNumber.startsWith('3') || longNumber.startsWith('8')) {
      console.log("🔍 Found standalone 30-digit number (two IMEIs):", longNumber);
      const splitImeis = splitConcatenatedIMEI(longNumber);
      splitImeis.forEach(imei => {
        if (!results.includes(imei)) {
          results.push(imei);
          console.log("✅ Added IMEI from 30-digit standalone:", imei);
        }
      });
    }
  }
  
  // Finally, find any other 15-digit numbers that look like IMEIs
  // but exclude common product barcodes (like 6932204509475)
  while ((match = IMEI_REGEX.exec(text)) !== null) {
    const imei = match[1];
    // Skip if it's already in results
    if (results.includes(imei)) continue;
    
    // Skip common product barcodes that aren't IMEIs
    if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') || 
        imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
        imei === '6932204509475' || imei === '693220450947') {
      console.log("Skipping product barcode:", imei);
      continue;
    }
    
    // Only add if it looks like a real IMEI (starts with 8 or 3)
    if (imei.startsWith('8') || imei.startsWith('3')) {
      console.log("Found potential IMEI:", imei);
      results.push(imei);
    }
  }
  
  console.log("All IMEIs found:", results);
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
  // Removed Html5Qrcode refs - using native camera API instead
  const videoStreamRef = useRef<MediaStream | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitializingRef = useRef(false);
  const shouldStopProcessingRef = useRef(true); // Use ref for synchronous access
  const isScannerActiveRef = useRef(false); // Use ref for synchronous access
  const isInitializedRef = useRef(false); // Use ref for synchronous access
  const ocrProcessingEnabledRef = useRef(false); // Use ref for synchronous access
  const [ocrStatus, setOcrStatus] = useState<string>(''); // Debug: OCR status message
  const [ocrFrameCount, setOcrFrameCount] = useState(0); // Debug: Count of frames processed

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
  const [isSwitchingCamera, setIsSwitchingCamera] = useState(false);
  const [qrScanMode, setQrScanMode] = useState<'barcode' | 'qr'>('barcode');
  const [ocrProcessingEnabled, setOcrProcessingEnabled] = useState(false);
  const [shouldStopProcessing, setShouldStopProcessing] = useState(true);
  
  // Function to switch between camera and upload modes
  const switchToUploadMode = useCallback(async () => {
      console.log("Switching to upload mode - stopping camera scanner...");
    
    // Stop native video scanner if it exists
    await stopNativeVideo();
    
    // Reset all scanner states
    setIsInitialized(false);
    setIsScannerActive(false);
    setIsInitializing(false);
    setHasError(false);
    setErrorMessage("");
    setErrorCount(0);
    setLastErrorTime(0);
    // Reset OCR processing flags when switching to upload mode
    setOcrProcessingEnabled(false);
    setShouldStopProcessing(true);
    // Update refs
    shouldStopProcessingRef.current = true;
    isScannerActiveRef.current = false;
    isInitializedRef.current = false;
    ocrProcessingEnabledRef.current = false;
    setOcrStatus('');
    setOcrFrameCount(0);
    
    // Clear any pending timeouts
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
    
    // Force clear the container to remove any camera elements
    const container = document.getElementById(qrCodeContainerId);
    if (container) {
      container.innerHTML = '';
      console.log("Container forcefully cleared for upload mode");
    }
    
    // Wait for camera to fully stop
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Reset the upload alert flag when switching modes
    
    console.log("Upload mode activated - camera fully stopped");
  }, [qrCodeContainerId, scanTimeout]);
  
  const switchToCameraMode = useCallback(async () => {
    console.log("Switching to camera mode - clearing any existing scanner...");
    
    // Stop native video scanner if it exists
    await stopNativeVideo();
    
    // Reset all scanner states
    setIsInitialized(false);
    setIsScannerActive(false);
    setIsInitializing(false);
    setHasError(false);
    setErrorMessage("");
    setErrorCount(0);
    setLastErrorTime(0);
    // Reset OCR processing flags when switching to camera mode (will be enabled when scanner starts)
    setOcrProcessingEnabled(false);
    setShouldStopProcessing(true);
    shouldStopProcessingRef.current = true;
    
    // Clear any pending timeouts
    if (scanTimeout) {
      clearTimeout(scanTimeout);
      setScanTimeout(null);
    }
    
    // Reset the upload alert flag when switching modes
    
    // Reset QR scan mode to default
    setQrScanMode('barcode');
    
    console.log("Camera mode activated - ready for camera initialization");
  }, [scanTimeout]);

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

  // Function to capture camera frame and process with same advanced pipeline as upload mode
  const captureAndProcessCameraFrame = useCallback(async (): Promise<string | null> => {
    try {
      // Check if OCR processing is enabled and scanner is active
      // Use ref for shouldStopProcessing to get current value
      if (!ocrProcessingEnabled || !isScannerActive || !isInitialized || emergencyStop || shouldStopProcessingRef.current) {
        console.log("🛑 OCR processing not enabled or scanner not active, skipping", {
          ocrProcessingEnabled,
          isScannerActive,
          isInitialized,
          emergencyStop,
          shouldStopProcessing: shouldStopProcessingRef.current
        });
        return null;
      }
      
      console.log("🔬 [OCR] Starting OCR-based IMEI extraction from camera frame...");
      console.log("🔬 [OCR] Status check:", {
        ocrProcessingEnabled,
        isScannerActive,
        isInitialized,
        emergencyStop,
        shouldStopProcessing: shouldStopProcessingRef.current
      });
      
      // Get the video element from the scanner container
      const container = document.getElementById(qrCodeContainerId);
      if (!container) {
        console.log("Scanner container not found");
        return null;
      }
      
      // Find the video element within the scanner (try by ID first, then querySelector)
      let videoElement = document.getElementById('qr-video') as HTMLVideoElement;
      if (!videoElement) {
        videoElement = container.querySelector('video') as HTMLVideoElement;
      }
      if (!videoElement) {
        console.log("❌ Video element not found in container");
        return null;
      }
      // On mobile, check dimensions instead of just readyState
      // Mobile browsers might have readyState < 2 but video still works
      if (videoElement.readyState < 2 && (videoElement.videoWidth === 0 || videoElement.videoHeight === 0)) {
        console.log("⏳ Video element not ready for capture (readyState:", videoElement.readyState, ", dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight, ")");
        return null;
      }
      
      // If video has no dimensions, it's definitely not ready
      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        console.log("⏳ Video element has no dimensions yet");
        return null;
      }
      
      console.log("📹 [OCR] Camera frame captured, dimensions:", videoElement.videoWidth, "x", videoElement.videoHeight, "(readyState:", videoElement.readyState, ")");
      
      // Create a canvas to capture the current frame
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.log("Canvas context not available");
        return null;
      }
      
      // Set canvas size to match video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Draw the current video frame to canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      console.log("🔬 Camera frame captured, applying same processing pipeline as upload mode...");
      
      // Apply the same multi-method detection pipeline as upload mode
      let detectedText = null;
      
      // Method 1: OCR-based IMEI extraction from camera frame (primary method - Html5Qrcode removed)
      if (!detectedText) {
        console.log("🔬 [OCR] Trying OCR-based IMEI extraction from camera frame...");
        console.log("🔬 [OCR] Calling Tesseract.js OCR engine...");
        try {
          const imeiPatterns = await extractIMEIsFromImage(canvas);
          
          if (imeiPatterns.length > 0) {
            // Filter out product barcodes
            const validImeis = imeiPatterns.filter(imei => {
              if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') || 
                  imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
                  imei === '6932204509475' || imei === '693220450947') {
                console.log("OCR filtering out product barcode:", imei);
                return false;
              }
              return true;
            });
            
            if (validImeis.length > 0) {
              // Prioritize the first valid IMEI (IMEI1)
              const firstImei = validImeis[0];
              const validImei = imeiIsValid(firstImei) ? firstImei : validImeis.find(imei => imeiIsValid(imei)) || firstImei;
              detectedText = validImei;
              console.log("✅ [OCR] SUCCESS! OCR extracted valid IMEI from camera frame:", validImei);
              console.log("📋 [OCR] All IMEIs found via OCR:", validImeis);
            }
          }
        } catch (extractionError) {
          console.log("OCR-based IMEI extraction from camera frame failed:", extractionError);
        }
      }
      
      // Method 3: Standard QR code detection (same as upload mode)
      if (!detectedText) {
        console.log("Trying QR code detection on camera frame...");
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth'
        });
        
        if (qrCode) {
          detectedText = qrCode.data;
          console.log("QR code detected from camera frame:", detectedText);
        }
      }
      
      // Final validation: Only accept if it's a valid IMEI number
      if (detectedText) {
        if (detectedText.length === 15 && (detectedText.startsWith('8') || detectedText.startsWith('3')) && imeiIsValid(detectedText)) {
          console.log("Valid IMEI detected from camera frame:", detectedText);
          return detectedText;
        }
        
        // Extract both IMEI and mobile numbers from the detected text
        const { imeis, mobiles } = extractNumbersFromText(detectedText);
        if (imeis.length > 0) {
          // Prioritize the first IMEI (IMEI1) for phone packaging
          const firstImei = imeis[0];
          const validImei = imeiIsValid(firstImei) ? firstImei : imeis.find(imei => imeiIsValid(imei)) || firstImei;
          console.log("IMEI extracted from camera frame (prioritizing first):", validImei);
          console.log("All IMEIs found:", imeis);
          return validImei;
        } else if (mobiles.length > 0) {
          // Use the first mobile number found
          const mobileNumber = mobiles[0];
          console.log("Mobile number extracted from camera frame:", mobileNumber);
          return mobileNumber;
        }
      }
      
      console.log("Advanced processing did not find valid IMEI in camera frame");
      return null;
    } catch (error) {
      console.log("❌ OCR processing of camera frame failed:", error);
      return null;
    }
  }, [qrCodeContainerId, isScannerActive, isInitialized, emergencyStop, ocrProcessingEnabled, shouldStopProcessing]);

  // Direct QR scanner using native camera API for better mobile support
  const startDirectQRScanner = useCallback(async () => {
    try {
      console.log("Starting direct QR scanner with native camera API...");
      
      // Prevent multiple initializations
      if (isScannerActive || isInitialized || isInitializing || emergencyStop) {
        console.log("🛑 Scanner already active or emergency stopped, skipping initialization");
        return;
      }
      
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage("Camera not supported on this device. Please try a different browser.");
        setHasError(true);
        return;
      }
      
      // Create video element directly
      const container = document.getElementById(qrCodeContainerId);
      if (!container) {
        setErrorMessage("Scanner container not found.");
        setHasError(true);
        return;
      }
      
      // Clear container
      container.innerHTML = '';
      
      // Create video element
      const video = document.createElement('video');
      video.id = 'qr-video';
      video.style.width = '100%';
      video.style.height = '100%';
      video.style.objectFit = 'cover';
      video.setAttribute('playsinline', 'true');
      video.setAttribute('webkit-playsinline', 'true');
      container.appendChild(video);
      
      // Mobile-optimized camera constraints
      // Use lower resolution on mobile for better performance
      const browserInfoForConstraints = getBrowserInfo();
      const constraints = {
        video: {
          facingMode: { ideal: "environment" }, // Back camera
          width: browserInfoForConstraints.isMobile ? { ideal: 640, min: 320 } : { ideal: 1280, min: 640 },
          height: browserInfoForConstraints.isMobile ? { ideal: 480, min: 240 } : { ideal: 720, min: 480 },
          frameRate: browserInfoForConstraints.isMobile ? { ideal: 10, max: 15 } : { ideal: 15, max: 30 }
        },
        audio: false
      };
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      videoStreamRef.current = stream; // Store for cleanup
      video.srcObject = stream;
      
      // Mobile-specific: Set autoplay and muted for better mobile compatibility
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      
      // Wait for video to be ready (mobile needs more time)
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video initialization timeout'));
        }, 10000); // 10 second timeout for mobile
        
        video.onloadedmetadata = () => {
          console.log("📹 Video metadata loaded, readyState:", video.readyState);
          video.play()
            .then(() => {
              console.log("✅ Video playback started successfully");
              clearTimeout(timeout);
              // Give mobile devices extra time for video to stabilize
              setTimeout(resolve, 500);
            })
            .catch((playError) => {
              console.log("⚠️ Video play() failed, but continuing:", playError);
              // On mobile, sometimes play() fails but video still works
              clearTimeout(timeout);
              setTimeout(resolve, 500);
            });
        };
        video.onerror = (error) => {
          clearTimeout(timeout);
          reject(error);
        };
        
        // Fallback: if metadata already loaded
        if (video.readyState >= 1) {
          video.play()
            .then(() => {
              clearTimeout(timeout);
              setTimeout(resolve, 500);
            })
            .catch(() => {
              clearTimeout(timeout);
              setTimeout(resolve, 500);
            });
        }
      });
      
      console.log("Direct QR scanner started, beginning OCR processing...");
      setIsInitialized(true);
      setIsScannerActive(true);
      setOcrProcessingEnabled(true);
      setShouldStopProcessing(false);
      // Update refs immediately for synchronous access
      shouldStopProcessingRef.current = false;
      isScannerActiveRef.current = true;
      isInitializedRef.current = true;
      ocrProcessingEnabledRef.current = true;
      setOcrStatus('🔄 Camera initialized, waiting for video...');
      
      // Start OCR-based processing loop as primary method
      const processWithOCR = async () => {
        // Get current video element dynamically (in case it changed)
        const currentVideo = document.getElementById('qr-video') as HTMLVideoElement || video;
        
        // Use refs for state checks to avoid closure issues
        const scannerActive = isScannerActiveRef.current;
        const initialized = isInitializedRef.current;
        const ocrEnabled = ocrProcessingEnabledRef.current;
        const shouldStop = shouldStopProcessingRef.current;
        
        // Multiple comprehensive checks to prevent auto-start
        if (!scannerActive || !initialized || emergencyStop || !currentVideo || shouldStop || !ocrEnabled) {
          console.log("🛑 Scanner not properly active or processing stopped, stopping OCR processing", {
            scannerActive,
            initialized,
            emergencyStop,
            hasVideo: !!currentVideo,
            shouldStop,
            ocrEnabled,
            stateValues: { isScannerActive, isInitialized, ocrProcessingEnabled } // Log state for comparison
          });
          setOcrStatus(`🛑 Stopped: active=${scannerActive}, init=${initialized}, ocr=${ocrEnabled}, stop=${shouldStop}`);
          return;
        }
        
        // Additional check for video readiness
        // Mobile browsers might have readyState < 2, but video can still work
        // Check if video has valid dimensions instead
        if (currentVideo.readyState < 2) {
          console.log("🔄 Video not ready, waiting... (readyState:", currentVideo.readyState, ")");
          setOcrStatus(`⏳ Video not ready (readyState: ${currentVideo.readyState})`);
          // On mobile, wait longer and check dimensions
          if (currentVideo.videoWidth === 0 || currentVideo.videoHeight === 0) {
            // Only continue if scanner is still active (use refs)
            if (isScannerActiveRef.current && isInitializedRef.current && !emergencyStop && !shouldStopProcessingRef.current && ocrProcessingEnabledRef.current) {
              setTimeout(processWithOCR, 200); // Longer wait for mobile
          }
          return;
          }
          // If video has dimensions, it's probably ready even if readyState < 2
          console.log("📹 Video has dimensions, proceeding despite readyState < 2");
        }
        
        try {
          setOcrFrameCount(prev => prev + 1);
          console.log(`🔬 Processing camera frame #${ocrFrameCount + 1} with OCR as primary method...`);
          setOcrStatus(`🔬 Processing frame #${ocrFrameCount + 1}...`);
          
          // Process the video frame directly with the same logic as image upload
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            console.log("Canvas context not available");
            return;
          }
          
          // Set canvas size to match video
          canvas.width = currentVideo.videoWidth;
          canvas.height = currentVideo.videoHeight;
          
          // Draw the current video frame to canvas
          ctx.drawImage(currentVideo, 0, 0, canvas.width, canvas.height);
          
          console.log("🔬 Camera frame captured, applying same processing pipeline as upload mode...");
          
          // Apply the same multi-method detection pipeline as upload mode
          let detectedText = null;
          
          // Method 1: Try Html5Qrcode for barcode detection (same as upload mode)
          console.log("Trying Html5Qrcode for barcode detection on camera frame...");
          try {
            // Convert canvas to blob and then to File
            const blob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob!);
              }, 'image/png');
            });
            const imageFile = new File([blob], 'camera-frame.png', { type: 'image/png' });
            
            // Create a temporary container for Html5Qrcode
            const tempContainer = document.createElement('div');
            tempContainer.id = 'temp-camera-scanner';
            tempContainer.style.display = 'none';
            document.body.appendChild(tempContainer);
            
            // Html5Qrcode removed - using OCR + jsQR only
            // Skip barcode detection, go straight to OCR
            
            // Clean up the temporary container
            document.body.removeChild(tempContainer);
          } catch (html5Error) {
            console.log("Html5Qrcode on camera frame failed:", html5Error);
            // Clean up the temporary container if it exists
            const tempContainer = document.getElementById('temp-camera-scanner');
            if (tempContainer) {
              document.body.removeChild(tempContainer);
            }
          }
          
          // Method 2: OCR-based IMEI extraction from camera frame (same as upload mode)
          if (!detectedText) {
            console.log("Trying OCR-based IMEI extraction from camera frame...");
            try {
              const imeiPatterns = await extractIMEIsFromImage(canvas);
              
              if (imeiPatterns.length > 0) {
                // Filter out product barcodes
                const validImeis = imeiPatterns.filter(imei => {
                  if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') || 
                      imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
                      imei === '6932204509475' || imei === '693220450947') {
                    console.log("OCR filtering out product barcode:", imei);
                    return false;
                  }
                  return true;
                });
                
                if (validImeis.length > 0) {
                  // Prioritize the first valid IMEI (IMEI1)
                  const firstImei = validImeis[0];
                  const validImei = imeiIsValid(firstImei) ? firstImei : validImeis.find(imei => imeiIsValid(imei)) || firstImei;
                  detectedText = validImei;
                  console.log("OCR extracted valid IMEI from camera frame:", validImei);
                  console.log("All IMEIs found via OCR:", validImeis);
                }
              }
            } catch (extractionError) {
              console.log("OCR-based IMEI extraction from camera frame failed:", extractionError);
            }
          }
          
          // Method 3: Standard QR code detection (same as upload mode)
          if (!detectedText) {
            console.log("Trying QR code detection on camera frame...");
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: 'attemptBoth'
            });
            
            if (qrCode) {
              detectedText = qrCode.data;
              console.log("QR code detected from camera frame:", detectedText);
            }
          }
          
          // Final validation: Only accept if it's a valid IMEI number
          if (detectedText) {
            if (detectedText.length === 15 && (detectedText.startsWith('8') || detectedText.startsWith('3')) && imeiIsValid(detectedText)) {
              console.log("Valid IMEI detected from camera frame:", detectedText);
              onScanSuccess(detectedText);
              await stopNativeVideo();
              return;
            }
            
            // Extract both IMEI and mobile numbers from the detected text
            const { imeis, mobiles } = extractNumbersFromText(detectedText);
            if (imeis.length > 0) {
              // Prioritize the first IMEI (IMEI1) for phone packaging
              const firstImei = imeis[0];
              const validImei = imeiIsValid(firstImei) ? firstImei : imeis.find(imei => imeiIsValid(imei)) || firstImei;
              console.log("IMEI extracted from camera frame (prioritizing first):", validImei);
              console.log("All IMEIs found:", imeis);
              onScanSuccess(validImei);
              await stopNativeVideo();
              return;
            } else if (mobiles.length > 0) {
              // Use the first mobile number found
              const mobileNumber = mobiles[0];
              console.log("Mobile number extracted from camera frame:", mobileNumber);
              onScanSuccess(mobileNumber);
              await stopNativeVideo();
              return;
            }
          }
          
          console.log("Advanced processing did not find valid IMEI in camera frame");
          
          // Continue processing only if scanner is still active (use refs)
          // On mobile, process less frequently to avoid performance issues
          const browserInfo = getBrowserInfo();
          const processingInterval = browserInfo.isMobile ? 2000 : 1000; // 2 seconds on mobile, 1 second on desktop
          
          if (isScannerActiveRef.current && isInitializedRef.current && !emergencyStop && !shouldStopProcessingRef.current && ocrProcessingEnabledRef.current) {
            setOcrStatus(`⏳ Waiting ${processingInterval}ms before next frame...`);
            setTimeout(processWithOCR, processingInterval);
          } else {
            setOcrStatus('🛑 Stopped - conditions not met');
          }
        } catch (error) {
          console.log("❌ OCR processing error:", error);
          // Retry only if scanner is still active (use refs)
          // On mobile, wait longer before retry
          const browserInfo = getBrowserInfo();
          const retryDelay = browserInfo.isMobile ? 4000 : 3000;
          
          setOcrStatus(`❌ Error occurred, retrying in ${retryDelay}ms...`);
          if (isScannerActiveRef.current && isInitializedRef.current && !emergencyStop && !shouldStopProcessingRef.current && ocrProcessingEnabledRef.current) {
            setTimeout(processWithOCR, retryDelay);
          }
        }
      };
      
      // Start the processing loop - states are already set above
      // Use a delay to ensure video is ready and states are updated
      // Mobile devices need more time for camera initialization
      const browserInfo = getBrowserInfo();
      const delay = browserInfo.isMobile ? 2500 : 1500; // Longer delay for mobile
      
      // Store video reference to ensure it's accessible in closure
      const videoRef = video;
      setTimeout(() => {
        // Get current video element (might have changed)
        const currentVideo = document.getElementById('qr-video') as HTMLVideoElement || videoRef;
        
        // Double-check states before starting - use refs for current values
        const scannerActive = isScannerActiveRef.current;
        const initialized = isInitializedRef.current;
        const ocrEnabled = ocrProcessingEnabledRef.current;
        const shouldStop = shouldStopProcessingRef.current;
        
        console.log("🔍 Checking conditions to start OCR:", {
          scannerActive,
          initialized,
          emergencyStop,
          hasVideo: !!currentVideo,
          shouldStop,
          ocrEnabled,
          stateValues: { isScannerActive, isInitialized, ocrProcessingEnabled } // For comparison
        });
        
        if (scannerActive && initialized && !emergencyStop && currentVideo && !shouldStop && ocrEnabled) {
          // On mobile, also check if video has valid dimensions
          if (browserInfo.isMobile && (currentVideo.videoWidth === 0 || currentVideo.videoHeight === 0)) {
            console.log("⏳ Mobile video not ready yet, waiting another second...");
            setOcrStatus('⏳ Mobile video initializing, waiting...');
            setTimeout(() => {
              if (isScannerActiveRef.current && isInitializedRef.current && !emergencyStop && currentVideo && !shouldStopProcessingRef.current && ocrProcessingEnabledRef.current) {
                console.log("✅ Starting OCR processing loop (mobile)...");
                setOcrStatus('✅ Starting OCR loop (mobile)...');
                processWithOCR();
              }
            }, 1000);
            return;
          }
          
          console.log("✅ Starting OCR processing loop...", {
            scannerActive,
            initialized,
            emergencyStop,
            hasVideo: !!currentVideo,
            videoDimensions: `${currentVideo.videoWidth}x${currentVideo.videoHeight}`,
            shouldStop,
            ocrEnabled,
            isMobile: browserInfo.isMobile
          });
          setOcrStatus(`✅ OCR loop started! Video: ${currentVideo.videoWidth}x${currentVideo.videoHeight}`);
          processWithOCR();
      } else {
          console.log("🛑 Scanner not properly initialized, skipping OCR processing start", {
            isScannerActive,
            isInitialized,
            emergencyStop,
            hasVideo: !!currentVideo,
            shouldStopProcessing: shouldStopProcessingRef.current,
            ocrProcessingEnabled
          });
        }
      }, delay); // Longer delay for mobile devices
      
    } catch (error: any) {
      console.error("Direct QR scanner initialization error:", error);
      
      // Provide more specific error messages for mobile browsers
      let errorMessage = "Failed to start direct QR scanner";
      
      if (error.name === 'NotAllowedError' || error.message?.includes("Permission denied")) {
        errorMessage = "Camera permission denied. Please allow camera access and try again.";
      } else if (error.name === 'NotFoundError' || error.message?.includes("No camera found")) {
        errorMessage = "No camera found. Please check if your device has a camera.";
      } else if (error.name === 'NotSupportedError' || error.message?.includes("not supported")) {
        errorMessage = "Camera not supported on this device. Please try a different browser.";
      } else if (error.name === 'NotReadableError' || error.message?.includes("in use")) {
        errorMessage = "Camera is being used by another application. Please close other apps and try again.";
      } else if (error.name === 'OverconstrainedError') {
        errorMessage = "Camera constraints not supported. Trying with basic settings...";
        // Try with basic constraints
        try {
          const basicConstraints = {
            video: { facingMode: "environment" },
            audio: false
          };
          const stream = await navigator.mediaDevices.getUserMedia(basicConstraints);
          const video = document.getElementById('qr-video') as HTMLVideoElement;
          if (video) {
            video.srcObject = stream;
            await video.play();
            setIsInitialized(true);
            setIsScannerActive(true);
            return;
          }
        } catch (retryError) {
          errorMessage = "Camera access failed. Please try the Barcode Scanner mode instead.";
        }
      } else {
        errorMessage = `Failed to start direct QR scanner: ${error.message || error.name}`;
      }
      
      setErrorMessage(errorMessage);
      setHasError(true);
    }
  }, [qrCodeContainerId, onScanSuccess, isScannerActive, isInitialized, isInitializing, emergencyStop]);

  // Enhanced stop function for native video elements
  const stopNativeVideo = useCallback(async () => {
    try {
      console.log("Stopping native video scanner...");
      
      // Update state immediately
      setIsScannerActive(false);
      setIsInitialized(false);
      setOcrProcessingEnabled(false);
      setShouldStopProcessing(true);
    shouldStopProcessingRef.current = true;
      
      // Stop video stream
      const video = document.getElementById('qr-video') as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        stream.getTracks().forEach(track => {
          track.stop();
          console.log("Stopped track:", track.kind);
        });
        video.srcObject = null;
      }
      
      // Clear the container
      const container = document.getElementById(qrCodeContainerId);
      if (container) {
        container.innerHTML = '';
      }
      
      console.log("Native video scanner stopped successfully");
    } catch (error) {
      console.error("Error stopping native video scanner:", error);
      // Force clear the container even if stop fails
      const container = document.getElementById(qrCodeContainerId);
      if (container) {
        container.innerHTML = '';
      }
    }
  }, [qrCodeContainerId]);

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
      
      const result = await new Promise<string | null>(async (resolve, reject) => {
        reader.onload = async (event) => {
          const img = new window.Image();
          img.onload = async () => {
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
              let detectedText = null;
              
              // Method 1: Try Html5Qrcode for barcode detection (supports linear barcodes)
              console.log("Trying Html5Qrcode for barcode detection...");
              try {
                // Convert canvas to blob and then to File
                const blob = await new Promise<Blob>((resolve) => {
                  canvas.toBlob((blob) => {
                    resolve(blob!);
                  }, 'image/png');
                });
                const imageFile = new File([blob], 'scanned-image.png', { type: 'image/png' });
                
                // Create a temporary container for Html5Qrcode
                const tempContainer = document.createElement('div');
                tempContainer.id = 'temp-scanner';
                tempContainer.style.display = 'none';
                document.body.appendChild(tempContainer);
                
                // Html5Qrcode removed - using OCR + jsQR only
                // Skip barcode detection, go straight to OCR
                
                // Clean up the temporary container
                document.body.removeChild(tempContainer);
              } catch (html5Error) {
                console.log("Html5Qrcode failed:", html5Error);
                // Clean up the temporary container if it exists
                const tempContainer = document.getElementById('temp-scanner');
                if (tempContainer) {
                  document.body.removeChild(tempContainer);
                }
              }
              
              // Method 2: OCR-based IMEI extraction from image (for phone packaging)
              if (!detectedText) {
                console.log("Trying OCR-based IMEI extraction from image...");
                try {
                  // Use Tesseract.js for proper text extraction
                  const imeiPatterns = await extractIMEIsFromImage(canvas);
                  
                  if (imeiPatterns.length > 0) {
                    // Prioritize the first IMEI (IMEI1)
                    const firstImei = imeiPatterns[0];
                    const validImei = imeiIsValid(firstImei) ? firstImei : imeiPatterns.find(imei => imeiIsValid(imei)) || firstImei;
                    detectedText = validImei;
                    console.log("OCR-based IMEI extraction found:", validImei);
                    console.log("All IMEIs found via OCR:", imeiPatterns);
                  }
                } catch (extractionError) {
                  console.log("OCR-based IMEI extraction failed:", extractionError);
                }
              }
              
              // Method 3: Standard QR code detection (if no linear barcode found)
              if (!detectedText) {
                console.log("Trying QR code detection...");
              qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
                inversionAttempts: 'attemptBoth'
              });
              
                if (qrCode) {
                  detectedText = qrCode.data;
                  console.log("QR code detected:", detectedText);
                }
              }
              
              // Method 3: If no barcode found, try with different image processing
              if (!detectedText) {
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
                  
                  // Try Html5Qrcode on enhanced image
                  try {
                    const enhancedCanvas = document.createElement('canvas');
                    const enhancedCtx = enhancedCanvas.getContext('2d');
                    if (enhancedCtx) {
                      enhancedCanvas.width = enhancedData.width;
                      enhancedCanvas.height = enhancedData.height;
                      enhancedCtx.putImageData(enhancedData, 0, 0);
                      
                      // Convert canvas to blob and then to File
                      const blob = await new Promise<Blob>((resolve) => {
                        enhancedCanvas.toBlob((blob) => {
                          resolve(blob!);
                        }, 'image/png');
                      });
                      const imageFile = new File([blob], 'enhanced-image.png', { type: 'image/png' });
                      
                      // Html5Qrcode removed - skip barcode detection on enhanced image
                      // OCR will handle text extraction
                    }
                  } catch (html5Error) {
                    console.log("Html5Qrcode on enhanced image failed:", html5Error);
                    // Clean up the temporary container if it exists
                    const tempContainer = document.getElementById('temp-scanner-enhanced');
                    if (tempContainer) {
                      document.body.removeChild(tempContainer);
                    }
                  }
                  
                  // Fallback to QR detection on enhanced image
                  if (!detectedText) {
                  qrCode = jsQR(enhancedData.data, enhancedData.width, enhancedData.height, {
                    inversionAttempts: 'attemptBoth'
                  });
                    if (qrCode) {
                      detectedText = qrCode.data;
                    }
                  }
                }
              }
              
              // Method 4: Try with different image size if still no success
              if (!detectedText && canvas.width > 200) {
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
                  
                  // Try Html5Qrcode on resized image
                  try {
                    const resizedCanvas = document.createElement('canvas');
                    const resizedCtx = resizedCanvas.getContext('2d');
                    if (resizedCtx) {
                      resizedCanvas.width = resizedImageData.width;
                      resizedCanvas.height = resizedImageData.height;
                      resizedCtx.putImageData(resizedImageData, 0, 0);
                      
                      // Convert canvas to blob and then to File
                      const blob = await new Promise<Blob>((resolve) => {
                        resizedCanvas.toBlob((blob) => {
                          resolve(blob!);
                        }, 'image/png');
                      });
                      const imageFile = new File([blob], 'resized-image.png', { type: 'image/png' });
                      
                      // Html5Qrcode removed - skip barcode detection on resized image
                      // OCR will handle text extraction
                    }
                  } catch (html5Error) {
                    console.log("Html5Qrcode on resized image failed:", html5Error);
                    // Clean up the temporary container if it exists
                    const tempContainer = document.getElementById('temp-scanner-resized');
                    if (tempContainer) {
                      document.body.removeChild(tempContainer);
                    }
                  }
                  
                  // Fallback to QR detection on resized image
                  if (!detectedText) {
                  qrCode = jsQR(resizedImageData.data, targetSize, targetSize, {
                    inversionAttempts: 'attemptBoth'
                  });
                    if (qrCode) {
                      detectedText = qrCode.data;
                    }
                  }
                }
              }
              
              // Method 5: Try OCR-like text extraction for IMEI numbers
              if (!detectedText) {
                console.log("Barcode detection failed, trying OCR-like text extraction...");
                
                // Convert image to grayscale and enhance contrast for text detection
                const ocrCanvas = document.createElement('canvas');
                const ocrCtx = ocrCanvas.getContext('2d');
                if (ocrCtx) {
                  ocrCanvas.width = canvas.width;
                  ocrCanvas.height = canvas.height;
                  
                  // Draw original image
                  ocrCtx.drawImage(canvas, 0, 0);
                  
                  // Apply high contrast filter for better text detection
                  const ocrImageData = ocrCtx.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height);
                  const data = ocrImageData.data;
                  
                  for (let i = 0; i < data.length; i += 4) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    
                    // Convert to grayscale
                    const gray = (r + g + b) / 3;
                    
                    // Apply high contrast
                    const contrast = gray > 128 ? 255 : 0;
                    
                    data[i] = contrast;     // R
                    data[i + 1] = contrast; // G
                    data[i + 2] = contrast; // B
                    // Alpha stays the same
                  }
                  
                  ocrCtx.putImageData(ocrImageData, 0, 0);
                  
                  // Try Html5Qrcode on processed image
                  const processedImageData = ocrCtx.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height);
                  
                  try {
                    const processedCanvas = document.createElement('canvas');
                    const processedCtx = processedCanvas.getContext('2d');
                    if (processedCtx) {
                      processedCanvas.width = processedImageData.width;
                      processedCanvas.height = processedImageData.height;
                      processedCtx.putImageData(processedImageData, 0, 0);
                      
                      // Convert canvas to blob and then to File
                      const blob = await new Promise<Blob>((resolve) => {
                        processedCanvas.toBlob((blob) => {
                          resolve(blob!);
                        }, 'image/png');
                      });
                      const imageFile = new File([blob], 'processed-image.png', { type: 'image/png' });
                      
                      // Html5Qrcode removed - skip barcode detection on OCR processed image
                      // OCR will handle text extraction
                    }
                  } catch (html5Error) {
                    console.log("Html5Qrcode on OCR processed image failed:", html5Error);
                    // Clean up the temporary container if it exists
                    const tempContainer = document.getElementById('temp-scanner-ocr');
                    if (tempContainer) {
                      document.body.removeChild(tempContainer);
                    }
                  }
                  
                  // Fallback to QR detection on processed image
                  if (!detectedText) {
                    qrCode = jsQR(processedImageData.data, ocrCanvas.width, ocrCanvas.height, {
                      inversionAttempts: 'attemptBoth'
                    });
              if (qrCode) {
                      detectedText = qrCode.data;
                    }
                  }
                }
              }
              
              
              if (detectedText) {
                console.log("Barcode/QR code detected:", detectedText);
                
                // Final validation: Only accept if it's a valid IMEI number
                if (detectedText.length === 15 && (detectedText.startsWith('8') || detectedText.startsWith('3')) && imeiIsValid(detectedText)) {
                  console.log("Valid IMEI detected:", detectedText);
                  resolve(detectedText);
                  return;
                }
                
                // Extract both IMEI and mobile numbers from QR code text
                const { imeis, mobiles } = extractNumbersFromText(detectedText);
                if (imeis.length > 0) {
                  // Prioritize the first IMEI (IMEI1) for phone packaging
                  // This ensures we get the primary IMEI from phone boxes
                  const firstImei = imeis[0];
                  const validImei = imeiIsValid(firstImei) ? firstImei : imeis.find(imei => imeiIsValid(imei)) || firstImei;
                  console.log("IMEI extracted (prioritizing first):", validImei);
                  console.log("All IMEIs found:", imeis);
                  console.log("IMEI validation details:", {
                    firstImei: firstImei,
                    isValid: imeiIsValid(firstImei),
                    validImei: validImei,
                    allImeis: imeis
                  });
                  resolve(validImei);
                } else if (mobiles.length > 0) {
                  // Use the first mobile number found
                  const mobileNumber = mobiles[0];
                  console.log("Mobile number extracted:", mobileNumber);
                  resolve(mobileNumber);
                } else {
                  // Try to parse JSON if QR contains structured data
                  try {
                    const obj = JSON.parse(detectedText);
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
                      // Prioritize the first IMEI found in JSON data
                      const firstImei = candidates[0];
                      const validImei = imeiIsValid(firstImei) ? firstImei : candidates.find(imei => imeiIsValid(imei)) || firstImei;
                      console.log("IMEI extracted from JSON (prioritizing first):", validImei);
                      console.log("All IMEIs found in JSON:", candidates);
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
                
                // Final fallback: Try to extract IMEI from image filename or provide manual input option
                console.log("Attempting fallback IMEI extraction methods...");
                
                // Try OCR-based extraction as final fallback
                console.log("Trying OCR-based comprehensive IMEI extraction...");
                try {
                  const comprehensiveImeis = await extractIMEIsFromImage(canvas);
                  
                  if (comprehensiveImeis.length > 0) {
                    console.log("Found IMEI in OCR comprehensive extraction:", comprehensiveImeis);
                    const firstImei = comprehensiveImeis[0];
                    const validImei = imeiIsValid(firstImei) ? firstImei : comprehensiveImeis.find(imei => imeiIsValid(imei)) || firstImei;
                    console.log("Using IMEI from OCR comprehensive extraction:", validImei);
                    resolve(validImei);
                    return;
                  }
                } catch (ocrError) {
                  console.log("OCR comprehensive extraction failed:", ocrError);
                }
                
                // Check if filename contains IMEI-like numbers
                const filename = file.name;
                const filenameImeis = extractIMEIsFromText(filename);
                
                if (filenameImeis.length > 0) {
                  console.log("Found IMEI in filename:", filenameImeis);
                  const firstImei = filenameImeis[0];
                  const validImei = imeiIsValid(firstImei) ? firstImei : filenameImeis.find(imei => imeiIsValid(imei)) || firstImei;
                  console.log("Using IMEI from filename:", validImei);
                  resolve(validImei);
                } else {
                  // No IMEI found anywhere - provide helpful error with manual input option
                  const manualInput = confirm(
                    "❌ No barcode detected in image\n\n" +
                    "The image might contain a linear barcode that's difficult to scan.\n\n" +
                    "Would you like to:\n" +
                    "• Enter the IMEI manually?\n" +
                    "• Try a different image?\n" +
                    "• Use camera scanning instead?\n\n" +
                    "Click OK to enter IMEI manually, or Cancel to try again."
                  );
                  
                  if (manualInput) {
                    const manualImei = prompt(
                      "📱 Manual IMEI Input\n\n" +
                      "Please enter the IMEI number from the phone packaging:\n" +
                      "• Look for 'IMEI1:' on the phone box\n" +
                      "• Enter the 15-digit number\n" +
                      "• Example: 862887071073370"
                    );
                    
                    if (manualImei && manualImei.trim()) {
                      const cleanImei = manualImei.trim().replace(/\D/g, ''); // Remove non-digits
                      if (cleanImei.length === 15) {
                        resolve(cleanImei);
                        return;
                      } else {
                        alert("Please enter a valid 15-digit IMEI number.");
                      }
                    }
                  }
                  
                  reject(new Error('No QR code or IMEI detected in image. The image might contain a linear barcode that requires a different scanner, or the barcode might be too small/blurry. Please try: 1) Taking a clearer photo, 2) Using manual IMEI input, 3) Scanning with the camera instead'));
                }
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
      } else if (error.message && error.message.includes('No QR code or IMEI detected')) {
        setImageUploadError(
          "❌ No QR code or IMEI detected in image\n\n" +
          "The image might contain a linear barcode that requires a different scanner.\n\n" +
          "🔧 Try these solutions:\n" +
          "• Take a clearer photo with better lighting\n" +
          "• Use the camera scanner instead (works better with linear barcodes)\n" +
          "• Enter the IMEI manually using the options below\n" +
          "• Make sure the barcode is clearly visible and not blurry\n\n" +
          "📱 For phone packaging: Try scanning the IMEI1 barcode directly with the camera"
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

  // Removed safeStopScanner - using stopNativeVideo instead

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

  // Removed getScannerConfig - not needed without Html5Qrcode

  const initializeScannerDirect = useCallback(async () => {
    try {
      // Emergency stop - completely disable scanner
      if (emergencyStop) {
        console.log("Emergency stop activated - scanner disabled");
        return;
      }
      
      // Prevent multiple initializations - more strict checks
      if (isScannerActive || videoStreamRef.current || isInitialized || isInitializing) {
        console.log("Scanner already active, initialized, or in progress, skipping...");
        return;
      }
      
      setIsInitializing(true);
      console.log("Initializing scanner with native camera + OCR (Html5Qrcode removed)...");
      
      // Clear any existing timeout
      if (scanTimeout) {
        clearTimeout(scanTimeout);
        setScanTimeout(null);
      }
      
      // Reset error count and state
      setErrorCount(0);
      setLastErrorTime(0);
      
      // Use native camera API instead of Html5Qrcode - simpler and works with OCR
      await startDirectQRScanner();
      
      console.log("✅ Direct scanner started successfully");
      console.log("🔬 [OCR] OCR processing is enabled in startDirectQRScanner - no need for duplicate loop");
      // States are already set in startDirectQRScanner, no need to set them again here
      setIsInitializing(false);
      
      // Set a timeout to stop scanning after 30 seconds if no QR code is found
      const timeout = setTimeout(async () => {
        console.log("Scanner timeout reached, stopping to prevent infinite scanning");
        setIsScannerActive(false);
        // Stop native video scanner
        await stopNativeVideo();
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
    
    if (videoStreamRef.current || hasError || isInitialized || isInitializingRef.current || isScannerActive || isInitializing) {
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

      // Try appropriate scanner based on mode
      console.log("Scanner mode:", qrScanMode);
      if (qrScanMode === 'qr') {
        console.log("Attempting direct QR scanner initialization...");
        try {
          await startDirectQRScanner();
        } catch (directError) {
          console.error("Direct QR scanner failed, falling back to barcode scanner:", directError);
          console.log("Falling back to barcode scanner for better mobile compatibility...");
      await initializeScannerDirect();
        }
      } else {
        console.log("Attempting barcode scanner initialization...");
        await initializeScannerDirect();
      }
      
    } catch (error) {
      console.error("Scanner initialization error:", error);
      setErrorMessage("Failed to initialize camera. Please check your browser settings and try again.");
      setHasError(true);
    } finally {
      isInitializingRef.current = false;
    }
  }, [onScanSuccess, onScanError, qrCodeContainerId, hasError, isInitialized, checkCameraPermission, requestCameraPermission, getBrowserInfo, waitForContainer, initializeScannerDirect, qrScanMode, startDirectQRScanner]);

  // Camera will only start when user explicitly clicks the camera button

  // Cleanup effect to stop camera when component unmounts or mode changes
  React.useEffect(() => {
    return () => {
      // Stop all processing immediately
      setShouldStopProcessing(true);
    shouldStopProcessingRef.current = true;
      setOcrProcessingEnabled(false);
      setIsScannerActive(false);
      setIsInitialized(false);
      
      // Cleanup on unmount
        console.log("Component unmounting - stopping scanner");
      stopNativeVideo();
    };
  }, []);

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
                <li><strong>iPhone/iPad:</strong> Hold phone steady and ensure good lighting</li>
                <li><strong>iPhone/iPad:</strong> Try moving closer to the barcode for better focus</li>
              </>
            )}
            {getBrowserInfo().isMobile && !getBrowserInfo().isIOS && (
              <>
                <li><strong>Android:</strong> Make sure you're using Chrome or Firefox</li>
                <li><strong>Android:</strong> Allow camera permissions when prompted</li>
                <li><strong>Android:</strong> Try using the manual input option below</li>
                <li><strong>Android:</strong> Hold phone steady and ensure good lighting</li>
                <li><strong>Android:</strong> Try moving closer to the barcode for better focus</li>
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
              await stopNativeVideo();
              
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
              await stopNativeVideo();
              
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
        {/* Scanner Mode Selector for Camera - Mobile Responsive */}
        {scanMode === 'camera' && (
          <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg">
            <label className="text-sm sm:text-base font-medium mb-3 block">Scanner Type:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={async () => {
                  setQrScanMode('barcode');
                  if (isInitialized) {
                    // Stop current scanner
                    await stopNativeVideo();
                    setIsInitialized(false);
                    setIsScannerActive(false);
                    // Restart scanner with new mode
                    setTimeout(() => initializeScanner(), 500);
                  }
                }}
                className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base transition-colors touch-manipulation ${
                  qrScanMode === 'barcode'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">📊</span>
                  <span className="font-medium">Barcode Scanner</span>
                </div>
                <div className="text-xs sm:text-sm mt-2 text-center opacity-90">
                  Linear barcodes, QR codes
                </div>
              </button>
              <button
                onClick={async () => {
                  setQrScanMode('qr');
                  if (isInitialized) {
                    // Stop current scanner
                    await stopNativeVideo();
                    setIsInitialized(false);
                    setIsScannerActive(false);
                    // Restart scanner with new mode
                    setTimeout(() => initializeScanner(), 500);
                  }
                }}
                className={`p-3 sm:p-4 rounded-lg text-sm sm:text-base transition-colors touch-manipulation ${
                  qrScanMode === 'qr'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-lg">🔲</span>
                  <span className="font-medium">Direct QR Scanner</span>
                </div>
                <div className="text-xs sm:text-sm mt-2 text-center opacity-90">
                  QR codes only, faster
                </div>
              </button>
            </div>
            <div className="mt-3 p-2 bg-blue-50 rounded-md">
              <p className="text-xs sm:text-sm text-blue-700 text-center">
                {qrScanMode === 'barcode' 
                  ? "Uses Html5Qrcode for barcodes and QR codes with OCR fallback"
                  : "Uses jsQR directly for QR codes only, optimized for speed"
                }
              </p>
              {qrScanMode === 'qr' && (
                <p className="text-xs text-orange-600 text-center mt-1">
                  ⚠️ Direct QR scanner may not work on all mobile browsers. If it fails, try the Barcode Scanner instead.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Camera selector - Mobile Responsive */}
        {availableCameras.length > 1 && (
          <div className="mb-4 p-3 sm:p-4 bg-muted rounded-lg">
            <label className="text-sm sm:text-base font-medium mb-3 block">Select Camera:</label>
            <select 
              value={selectedCameraId} 
              onChange={async (e) => {
                const newCameraId = e.target.value;
                setSelectedCameraId(newCameraId);
                
                // If scanner is active, restart with new camera
                if (isInitialized) {
                  console.log("Switching to camera:", newCameraId);
                  setIsSwitchingCamera(true);
                  try {
                    // Stop current scanner
                    await stopNativeVideo();
                    setIsInitialized(false);
                    
                    // Restart with new camera
                    setTimeout(() => {
                      initializeScanner();
                      setIsSwitchingCamera(false);
                    }, 500);
                  } catch (error) {
                    console.error("Error switching camera:", error);
                    setIsSwitchingCamera(false);
                  }
                }
              }}
              className="w-full p-3 sm:p-4 border rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {availableCameras.map((camera) => {
                const label = camera.label || `Camera ${camera.id.slice(0, 8)}`;
                const isBackCamera = label.toLowerCase().includes('back') || 
                                   label.toLowerCase().includes('rear') ||
                                   label.toLowerCase().includes('environment') ||
                                   label.toLowerCase().includes('world');
                const isFrontCamera = label.toLowerCase().includes('front') || 
                                    label.toLowerCase().includes('user') ||
                                    label.toLowerCase().includes('facing');
                
                let displayLabel = label;
                if (isBackCamera) displayLabel = `📷 ${label} (Back)`;
                else if (isFrontCamera) displayLabel = `🤳 ${label} (Front)`;
                else displayLabel = `📹 ${label}`;
                
                return (
                  <option key={camera.id} value={camera.id}>
                    {displayLabel}
                  </option>
                );
              })}
            </select>
            
            {/* Camera switching indicator */}
            {isSwitchingCamera && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Switching camera...
                </p>
              </div>
            )}
            
            {!isInitialized && selectedCameraId && !isSwitchingCamera && (
              <button
                onClick={() => initializeScanner()}
                className="mt-3 w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg text-sm sm:text-base font-medium hover:bg-primary/90 active:bg-primary/80 transition-colors touch-manipulation"
              >
                📷 Switch Camera
              </button>
            )}
          </div>
        )}
        
        {/* Emergency Stop Button - Mobile Responsive */}
        {!emergencyStop && (
          <div className="w-full p-3 sm:p-4 bg-red-50 border-b border-red-200">
            <button
              onClick={() => {
                setEmergencyStop(true);
                // Stop any active scanner
                stopNativeVideo();
                // Reset all scanner states
                setIsInitialized(false);
                setIsScannerActive(false);
                setIsInitializing(false);
                setOcrProcessingEnabled(false);
                setShouldStopProcessing(true);
    shouldStopProcessingRef.current = true;
                setHasError(false);
                setErrorMessage("");
                setErrorCount(0);
                setLastErrorTime(0);
                // Clear any pending timeouts
                if (scanTimeout) {
                  clearTimeout(scanTimeout);
                  setScanTimeout(null);
                }
                console.log("Emergency stop activated - scanner disabled and all states reset");
              }}
              className="w-full px-4 py-3 sm:py-4 bg-red-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-red-700 active:bg-red-800 transition-colors touch-manipulation"
            >
              🛑 Emergency Stop Scanner
              <div className="text-xs sm:text-sm mt-1 opacity-90">
                (Click if infinite loop)
              </div>
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
                  setOcrProcessingEnabled(false);
                  setShouldStopProcessing(false);
      shouldStopProcessingRef.current = false;
                  setErrorCount(0);
                  setLastErrorTime(0);
                  // Clear any pending timeouts
                  if (scanTimeout) {
                    clearTimeout(scanTimeout);
                    setScanTimeout(null);
                  }
                  // Clear scanner references
                  // Cleaned up - using stopNativeVideo instead
                  console.log("Scanner reset - ready to start again");
                }}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                ✅ Re-enable Scanner
              </button>
            </div>
          </div>
        )}
        
        {/* Mode Selection - Mobile Responsive */}
        {!emergencyStop && (
          <div className="w-full p-4 sm:p-6 border-b border-gray-200">
            <div className="text-center mb-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-3">Choose Scanning Method</h3>
              <p className="text-sm sm:text-base text-gray-600">Select how you'd like to scan the QR code</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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
              className={`p-6 sm:p-8 rounded-xl border-2 transition-all touch-manipulation ${
                scanMode === 'camera'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-md active:bg-gray-50'
              }`}
            >
              <div className="text-center">
                <Camera className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2">Use Camera</h4>
                <p className="text-sm sm:text-base opacity-80">Live scanning</p>
                <div className="mt-3 text-xs sm:text-sm text-gray-500">
                  Point camera at barcode
                </div>
              </div>
            </button>
            
            {/* Upload Option */}
            <button
              onClick={async () => {
                await switchToUploadMode();
                setScanMode('upload');
              }}
              className={`p-6 sm:p-8 rounded-xl border-2 transition-all touch-manipulation ${
                scanMode === 'upload'
                  ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-lg'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:shadow-md active:bg-gray-50'
              }`}
            >
              <div className="text-center">
                <Upload className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4" />
                <h4 className="text-lg sm:text-xl font-semibold mb-2">Upload Image</h4>
                <p className="text-sm sm:text-base opacity-80">From gallery</p>
                <div className="mt-3 text-xs sm:text-sm text-gray-500">
                  Select image file
                </div>
              </div>
            </button>
          </div>
          </div>
        )}
        
        {/* Upload Mode UI - Mobile Responsive */}
        {scanMode === 'upload' && (
          <div className="w-full p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-center justify-center mb-6">
              <div className="text-center">
                <Image className="h-8 w-8 sm:h-10 sm:w-10 mx-auto mb-3 text-blue-600" />
                <h3 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">Upload Image</h3>
                <p className="text-sm sm:text-base text-gray-600">Upload an image containing a QR code or barcode</p>
                <div className="mt-4 p-4 sm:p-6 bg-blue-50 rounded-xl">
                  <p className="text-sm sm:text-base text-blue-700 font-semibold mb-3 flex items-center">
                    <span className="text-lg mr-2">📸</span>
                    Tips for better scanning:
                  </p>
                  <ul className="text-xs sm:text-sm text-blue-600 text-left space-y-2">
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Ensure good lighting on the code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Keep the code flat and straight</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Make sure the code fills most of the image</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Avoid shadows or reflections on the code</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Works with both QR codes and linear barcodes</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>For phone screens: increase brightness</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>For printed codes: ensure high contrast</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Try different angles if first attempt fails</span>
                    </li>
                    <li className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>Clean the camera lens for better focus</span>
                    </li>
                  </ul>
                </div>
                
                <div className="mt-4 p-4 sm:p-6 bg-yellow-50 rounded-xl border border-yellow-200">
                  <p className="text-sm sm:text-base text-yellow-700 font-semibold mb-3 flex items-center">
                    <span className="text-lg mr-2">📱</span>
                    For Phone Packaging:
                  </p>
                  <div className="text-xs sm:text-sm text-yellow-600 space-y-2">
                    <p className="font-semibold text-yellow-800">
                      <span className="text-yellow-700">Important:</span> Scan only the <strong>IMEI1 barcode</strong> (the first IMEI)
                    </p>
                    <ul className="space-y-2">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Look for "IMEI1:" on the phone box</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Scan the barcode next to "IMEI1:" only</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Ignore IMEI2 or other barcodes</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>Make sure the barcode is clearly visible</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Mobile tip:</strong> Hold phone steady and get close to the barcode</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span><strong>Lighting:</strong> Ensure good lighting on the barcode</span>
                      </li>
                    </ul>
                  </div>
                </div>
                
                <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs text-green-700 font-medium mb-2">🧪 Test OCR with Image:</p>
                  <p className="text-xs text-green-600 mb-2">Upload a test image with IMEI text to verify OCR is working:</p>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        console.log("🧪 TEST: Processing uploaded test image:", file.name);
                        setOcrStatus("🧪 Testing OCR on uploaded image...");
                        try {
                          // Use the same image upload processing
                          const reader = new FileReader();
                          reader.onload = async (event) => {
                            try {
                              const img = document.createElement('img');
                              img.onload = async () => {
                                const canvas = document.createElement('canvas');
                                const ctx = canvas.getContext('2d');
                                if (!ctx) return;
                                
                                canvas.width = img.width;
                                canvas.height = img.height;
                                ctx.drawImage(img, 0, 0);
                                
                                const imeiPatterns = await extractIMEIsFromImage(canvas);
                                if (imeiPatterns.length > 0) {
                                  const firstImei = imeiPatterns[0];
                                  console.log("✅ TEST SUCCESS: Found IMEI in test image:", firstImei);
                                  setOcrStatus(`✅ TEST SUCCESS! Found IMEI: ${firstImei}`);
                                  alert(`✅ OCR Test Successful!\n\nFound IMEI: ${firstImei}\n\nAll IMEIs found: ${imeiPatterns.join(', ')}`);
                                  if (onScanSuccess) {
                                    onScanSuccess(firstImei);
                                  }
                                } else {
                                  console.log("❌ TEST: No IMEI found in test image");
                                  setOcrStatus("❌ No IMEI detected in test image");
                                  alert("❌ OCR Test: No IMEI found in the image.\n\nMake sure the image contains clear IMEI text (15 digits).");
                                }
                              };
                              img.src = event.target?.result as string;
                            } catch (error) {
                              console.error("❌ TEST ERROR:", error);
                              setOcrStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                            }
                          };
                          reader.readAsDataURL(file);
                        } catch (error) {
                          console.error("❌ TEST ERROR:", error);
                          setOcrStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        }
                      }
                    }}
                    className="w-full text-xs text-green-700 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-600 file:text-white hover:file:bg-green-700"
                  />
                  <p className="text-xs text-green-600 mt-2">
                    💡 Upload an image of a phone box with visible IMEI text to test OCR
                  </p>
                </div>
                
              </div>
            </div>
            
            <div className="flex flex-col items-center space-y-6">
              <label htmlFor="image-upload" className="cursor-pointer w-full">
                <div className="flex items-center justify-center w-full px-6 py-8 sm:px-8 sm:py-12 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors touch-manipulation">
                  <div className="text-center">
                    <Upload className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-4 text-gray-400" />
                    <p className="text-base sm:text-lg font-semibold text-gray-700 mb-2">
                      {isScanningImage ? 'Scanning image...' : 'Click to upload image'}
                    </p>
                    <p className="text-sm sm:text-base text-gray-500">PNG, JPG, JPEG up to 10MB</p>
                    {isScanningImage && (
                      <div className="mt-4 flex items-center justify-center space-x-2 text-blue-600">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm">Processing...</span>
                      </div>
                    )}
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
                <div className="w-full p-4 sm:p-6 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-center space-x-3 text-red-600 mb-4">
                    <AlertCircle className="h-5 w-5 sm:h-6 sm:w-6" />
                    <span className="text-base sm:text-lg font-semibold">Upload Error</span>
                  </div>
                  <div className="text-sm sm:text-base text-red-600 whitespace-pre-line mb-4">
                    {imageUploadError}
                  </div>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setImageUploadError('');
                        // Reset the file input
                        const fileInput = document.getElementById('image-upload') as HTMLInputElement;
                        if (fileInput) fileInput.value = '';
                      }}
                      className="w-full px-4 py-3 bg-red-100 text-red-700 rounded-lg text-sm sm:text-base font-medium hover:bg-red-200 active:bg-red-300 transition-colors touch-manipulation"
                    >
                      🔄 Try again with a different image
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
                      className="w-full px-4 py-3 bg-blue-100 text-blue-700 rounded-lg text-sm sm:text-base font-medium hover:bg-blue-200 active:bg-blue-300 transition-colors touch-manipulation"
                    >
                      ✏️ Enter IMEI manually
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
                      className="w-full px-4 py-3 bg-green-100 text-green-700 rounded-lg text-sm sm:text-base font-medium hover:bg-green-200 active:bg-green-300 transition-colors touch-manipulation"
                    >
                      🔍 Extract IMEI from image text
                    </button>
                    <button
                      onClick={async () => {
                        setImageUploadError('');
                        // Switch to camera mode
                        await switchToCameraMode();
                        setScanMode('camera');
                        // Start camera initialization
                        setTimeout(() => {
                          initializeScanner();
                        }, 100);
                      }}
                      className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg text-sm sm:text-base font-medium hover:bg-blue-700 active:bg-blue-800 transition-colors touch-manipulation"
                    >
                      📷 Switch to Camera Scanner
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
              <div className="flex items-center justify-center space-x-2 flex-wrap gap-2">
                <Camera className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-700">Camera Mode Active</span>
                {isInitialized && (
                  <span className="text-xs text-green-600">• Camera Ready</span>
                )}
                {isInitializing && (
                  <span className="text-xs text-yellow-600">• Initializing...</span>
                )}
                {ocrProcessingEnabled && isInitialized && (
                  <span className="text-xs text-purple-600 font-semibold">• OCR Enabled</span>
                )}
                {!ocrProcessingEnabled && isInitialized && (
                  <span className="text-xs text-orange-600">• OCR Disabled</span>
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
            {scanMode === 'camera' && isInitialized && (
              <div className="w-full p-4 text-center">
                {/* OCR Status Indicator - Real-time */}
                <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <div className="flex items-center justify-center space-x-2 mb-2">
                    <span className="text-lg">🔬</span>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      OCR Status: {ocrProcessingEnabled ? (
                        <span className="text-green-600 dark:text-green-400">✅ ENABLED</span>
                      ) : (
                        <span className="text-red-600 dark:text-red-400">❌ DISABLED</span>
                      )}
                    </span>
                  </div>
                  {ocrStatus && (
                    <div className="mb-2 p-2 bg-white dark:bg-gray-800 rounded border border-purple-200 dark:border-purple-700">
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200">
                        {ocrStatus}
                      </p>
                    </div>
                  )}
                  {ocrFrameCount > 0 && (
                    <p className="text-xs text-purple-600 dark:text-purple-400 mb-1">
                      📊 Frames processed: {ocrFrameCount}
                    </p>
                  )}
                  <p className="text-xs text-purple-600 dark:text-purple-400">
                    {ocrProcessingEnabled 
                      ? "OCR automatically processes camera frames every 1-2 seconds"
                      : "OCR is disabled. Enable it to use text recognition as fallback."}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    💡 Tip: Use the test button below to manually trigger OCR on current frame
                  </p>
                </div>
                <div className="mb-4 space-y-2">
                  <button
                    onClick={async () => {
                      console.log("🧪 TEST: Manual OCR trigger for camera...");
                      setOcrStatus("🧪 Testing OCR on current frame...");
                      try {
                        const ocrResult = await captureAndProcessCameraFrame();
                        if (ocrResult) {
                          console.log("✅ TEST SUCCESS: Manual OCR successful:", ocrResult);
                          setOcrStatus(`✅ SUCCESS! Found IMEI: ${ocrResult}`);
                          onScanSuccess(ocrResult);
                        } else {
                          console.log("❌ TEST: OCR could not detect IMEI");
                          setOcrStatus("❌ No IMEI detected. Try moving closer or improving lighting.");
                          alert("OCR could not detect IMEI in current camera view.\n\nTry:\n• Moving closer to the text/IMEI\n• Ensuring good lighting\n• Making sure the IMEI text is clearly visible\n• Hold phone steady for 2-3 seconds");
                        }
                      } catch (error) {
                        console.error("❌ TEST ERROR: Manual OCR failed:", error);
                        setOcrStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
                        alert("OCR processing failed. Please try again or use manual input.");
                      }
                    }}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors text-sm font-medium flex items-center justify-center space-x-2 touch-manipulation"
                  >
                    <span>🧪</span>
                    <span>TEST OCR Now (Current Frame)</span>
                  </button>
                  
                  <button
                    onClick={async () => {
                      console.log("Advanced OCR processing for camera...");
                      try {
                        // Try multiple OCR attempts with different settings
                        const ocrResult = await captureAndProcessCameraFrame();
                        if (ocrResult) {
                          console.log("Advanced OCR successful:", ocrResult);
                          onScanSuccess(ocrResult);
                        } else {
                          alert("Advanced OCR could not detect IMEI. The image might be too blurry or the IMEI might not be visible in the current view.");
                        }
                      } catch (error) {
                        console.error("Advanced OCR failed:", error);
                        alert("Advanced OCR processing failed. Please try again or use manual input.");
                      }
                    }}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2"
                  >
                    <span>🔬</span>
                    <span>Advanced OCR Processing</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  If barcode scanning isn't working, try OCR to read text from the camera view. 
                  Advanced OCR uses enhanced image processing for better text recognition.
                </p>
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
                <button
                  onClick={() => {
                    // Force clear any remaining camera elements
                    const container = document.getElementById(qrCodeContainerId);
                    if (container) {
                      container.innerHTML = '';
                    }
                    // Force stop any media streams
                    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                      navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
                        stream.getTracks().forEach(track => track.stop());
                      }).catch(() => {});
                    }
                  }}
                  className="mt-2 px-3 py-1 bg-red-100 text-red-600 rounded text-xs hover:bg-red-200"
                >
                  🛑 Force Stop Camera
                </button>
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