"use client";

import React, { useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { showError } from "@/utils/toast";

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

  useEffect(() => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5QrcodeScanner(
        qrCodeContainerId,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          disableFlip: false,
        },
        false, // verbose
      );

      scannerRef.current.render(
        (decodedText) => {
          onScanSuccess(decodedText);
          scannerRef.current?.clear().catch((err) => {
            console.error("Failed to clear scanner:", err);
          });
        },
        (errorMessage) => {
          if (errorMessage.includes("No cameras found")) {
            showError("No camera found. Please ensure a camera is connected and allowed.");
          }
          onScanError?.(errorMessage);
        },
      );
    }

    return () => {
      scannerRef.current?.clear().catch((err) => {
        console.error("Failed to clear scanner on unmount:", err);
      });
      scannerRef.current = null;
    };
  }, [onScanSuccess, onScanError, qrCodeContainerId]);

  return (
    <div id={qrCodeContainerId} className="w-full h-auto">
      {/* QR Code scanner will render here */}
    </div>
  );
};

export default QrScanner;