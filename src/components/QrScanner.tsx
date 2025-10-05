"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Html5QrcodeScanner, Html5QrcodeScanType, Html5Qrcode } from "html5-qrcode";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Camera } from "lucide-react";

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
        error.message.includes('not a child of this node')) {
      console.log('Scanner error boundary caught DOM manipulation error, suppressing...');
      return { hasError: false }; // Don't show error UI for these errors
    }
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Only log non-DOM manipulation errors
    if (!error.message.includes('Node.removeChild') && 
        !error.message.includes('not a child of this node')) {
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
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'denied' | 'prompt'>('unknown');
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<any[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');

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

  const safeStopScanner = useCallback(async (scanner: Html5Qrcode | null) => {
    if (!scanner) return;
    
    try {
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
    } catch (err) {
      console.error("Error stopping scanner:", err);
      // Continue anyway - the scanner might already be stopped
    }
  }, [qrCodeContainerId]);

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
      console.log("Initializing scanner with direct Html5Qrcode...");
      
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
          onScanSuccess(decodedText);
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
        (errorMessage) => {
          console.log("QR Scanner error:", errorMessage);
          // Don't show error for every failed scan attempt
          if (errorMessage.includes("NotFoundException")) {
            // This is normal - no QR code detected yet
            return;
          }
          onScanError?.(errorMessage);
        }
      );
      
      console.log("Direct scanner started successfully");
      setIsInitialized(true);
      
    } catch (error: any) {
      console.error("Direct scanner initialization error:", error);
      
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
    if (scannerRef.current || html5QrcodeRef.current || hasError || isInitialized || isInitializingRef.current) {
      console.log("Scanner already initialized, has error, or is initializing, skipping...");
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

  useEffect(() => {
    let isMounted = true;
    let initTimer: NodeJS.Timeout;
    
    // Add comprehensive error suppression for DOM manipulation
    const originalRemoveChild = Node.prototype.removeChild;
    const originalAppendChild = Node.prototype.appendChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    
    // Override DOM methods to handle scanner cleanup errors
    Node.prototype.removeChild = function<T extends Node>(child: T): T {
      try {
        return originalRemoveChild.call(this, child) as T;
      } catch (error: any) {
        if (error.message.includes('not a child of this node') || 
            error.message.includes('Node.removeChild')) {
          console.log('Suppressed DOM removeChild error during scanner cleanup');
          return child; // Return the child node as if removal was successful
        }
        throw error; // Re-throw other errors
      }
    };
    
    Node.prototype.appendChild = function<T extends Node>(child: T): T {
      try {
        return originalAppendChild.call(this, child) as T;
      } catch (error: any) {
        if (error.message.includes('not a child of this node') || 
            error.message.includes('Node.appendChild')) {
          console.log('Suppressed DOM appendChild error during scanner cleanup');
          return child; // Return the child node as if append was successful
        }
        throw error; // Re-throw other errors
      }
    };
    
    Node.prototype.insertBefore = function<T extends Node>(newNode: T, referenceNode: Node | null): T {
      try {
        return originalInsertBefore.call(this, newNode, referenceNode) as T;
      } catch (error: any) {
        if (error.message.includes('not a child of this node') || 
            error.message.includes('Node.insertBefore')) {
          console.log('Suppressed DOM insertBefore error during scanner cleanup');
          return newNode; // Return the new node as if insert was successful
        }
        throw error; // Re-throw other errors
      }
    };
    
    // Add global error handler for DOM manipulation errors
    const handleGlobalError = (event: ErrorEvent) => {
      if (event.message.includes('Node.removeChild') || 
          event.message.includes('not a child of this node')) {
        console.log('Suppressed DOM manipulation error during scanner cleanup');
        event.preventDefault();
        event.stopPropagation();
        return false;
      }
    };
    
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason && event.reason.message && 
          (event.reason.message.includes('Node.removeChild') || 
           event.reason.message.includes('not a child of this node'))) {
        console.log('Suppressed DOM manipulation promise rejection during scanner cleanup');
        event.preventDefault();
        return false;
      }
    };
    
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const initializeOnce = async () => {
      if (!isMounted || scannerRef.current || hasError) return;

      try {
        console.log("Starting one-time scanner initialization...");
        
        // Check permission state
        const permission = await checkCameraPermission();
        if (!isMounted) return;

        if (permission === 'denied') {
          setErrorMessage("Camera permission denied. Please allow camera access in your browser settings and refresh the page.");
          setHasError(true);
          return;
        }
        
        // Initialize scanner after permission check with longer delay for container mounting
        initTimer = setTimeout(() => {
          if (isMounted && !scannerRef.current && !hasError) {
            // Additional check to ensure container is mounted
            const containerElement = document.getElementById(qrCodeContainerId);
            if (containerElement) {
              console.log("Container found, initializing scanner...");
              initializeScanner();
            } else {
              console.log("Container not found, retrying in 500ms...");
              setTimeout(() => {
                if (isMounted && !scannerRef.current && !hasError) {
                  initializeScanner();
                }
              }, 500);
            }
          }
        }, 500); // Increased delay for better container mounting
      } catch (error) {
        console.error("Initial permission check failed:", error);
        if (isMounted) {
          setErrorMessage("Failed to check camera permissions.");
          setHasError(true);
        }
      }
    };

    initializeOnce();

    return () => {
      isMounted = false;
      isInitializingRef.current = false;
      if (initTimer) clearTimeout(initTimer);
      
      // Restore original DOM methods
      Node.prototype.removeChild = originalRemoveChild;
      Node.prototype.appendChild = originalAppendChild;
      Node.prototype.insertBefore = originalInsertBefore;
      
      // Remove global error handlers
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      
      if (scannerRef.current) {
        scannerRef.current.clear().catch((err) => {
        console.error("Failed to clear scanner on unmount:", err);
      });
      scannerRef.current = null;
      }
      
      if (html5QrcodeRef.current) {
        // Immediately nullify the reference to prevent further DOM manipulation
        const scanner = html5QrcodeRef.current;
        html5QrcodeRef.current = null;
        
        // Try to stop the scanner safely
        safeStopScanner(scanner).catch((err) => {
          console.error("Error in safe stop scanner:", err);
        });
      }
      
      setIsInitialized(false);
      setHasError(false);
    };
  }, []); // Empty dependency array to run only once

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
        
        <div 
          ref={containerRef}
          id={qrCodeContainerId} 
          className="w-full h-auto min-h-[300px]"
          style={{ minHeight: '300px' }}
        >
          {!isInitialized && (
            <div className="w-full p-4 text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 animate-pulse" />
              <p className="text-sm text-muted-foreground">Initializing camera...</p>
            </div>
          )}
      {/* QR Code scanner will render here */}
    </div>
      </div>
    </ScannerErrorBoundary>
  );
};

export default QrScanner;