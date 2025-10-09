import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import QrScanner from '../components/QrScanner';

// Mock the dependencies
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null })
    }
  }
}));

vi.mock('@/context/DataContext', () => ({
  useData: () => ({
    isLoadingData: false,
    availableBrands: [],
    availableModels: [],
    availableSellers: [],
    availableBookingPersons: []
  })
}));

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: null,
    isAdmin: false
  })
}));

// Mock HTML5QRCode
const mockHtml5Qrcode = {
  start: vi.fn(),
  stop: vi.fn(),
  clear: vi.fn(),
  scanFile: vi.fn(),
  getCameras: vi.fn().mockResolvedValue([
    { id: 'camera1', label: 'Back Camera' },
    { id: 'camera2', label: 'Front Camera' }
  ])
};

vi.mock('html5-qrcode', () => ({
  Html5Qrcode: vi.fn().mockImplementation(() => mockHtml5Qrcode)
}));

// Mock jsQR
vi.mock('jsqr', () => ({
  default: vi.fn()
}));

// Mock Tesseract.js
vi.mock('tesseract.js', () => ({
  createWorker: vi.fn().mockResolvedValue({
    recognize: vi.fn().mockResolvedValue({
      data: { text: 'IMEI: 354626223546262' }
    }),
    terminate: vi.fn()
  })
}));

// Mock canvas and video elements
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn().mockReturnValue({
    drawImage: vi.fn(),
    getImageData: vi.fn().mockReturnValue({
      data: new Uint8ClampedArray(4),
      width: 100,
      height: 100
    })
  })
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoWidth', {
  value: 640
});

Object.defineProperty(HTMLVideoElement.prototype, 'videoHeight', {
  value: 480
});

Object.defineProperty(HTMLVideoElement.prototype, 'readyState', {
  value: 2
});

// Create test images based on the provided images
const createTestImage = (name: string, expectedIMEI: string, textContent: string) => {
  // Create a canvas to generate test image data
  const canvas = document.createElement('canvas');
  canvas.width = 200;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    // Draw a simple test pattern
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, 200, 100);
    ctx.fillStyle = '#000';
    ctx.font = '12px Arial';
    ctx.fillText(textContent, 10, 50);
  }
  
  return {
    name,
    expectedIMEI,
    textContent,
    imageData: canvas.toDataURL('image/jpeg'),
    file: new File([canvas.toDataURL('image/jpeg')], `${name}.jpg`, { type: 'image/jpeg' })
  };
};

// Test images based on the provided images
const testImages = [
  createTestImage(
    'IMEI Card',
    '354626223546262',
    'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19'
  ),
  createTestImage(
    'IMEI Label',
    '325160099000001',
    'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95'
  )
];

describe('Real Image Scanning Tests', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnScanError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Image Storage and Processing', () => {
    testImages.forEach(({ name, expectedIMEI, textContent, file }) => {
      it(`should store and process ${name} image`, async () => {
        // Mock the scanFile method to return the expected IMEI
        mockHtml5Qrcode.scanFile.mockResolvedValue(expectedIMEI);
        
        // Mock Tesseract.js to return the text content
        const mockWorker = {
          recognize: vi.fn().mockResolvedValue({
            data: { text: textContent }
          }),
          terminate: vi.fn()
        };
        
        const { createWorker } = await import('tesseract.js');
        (createWorker as any).mockResolvedValue(mockWorker);

        render(
          <QrScanner
            onScanSuccess={mockOnScanSuccess}
            onScanError={mockOnScanError}
          />
        );

        // Switch to upload mode
        const uploadButton = screen.getByText('Upload Image');
        fireEvent.click(uploadButton);

        await waitFor(() => {
          expect(screen.getByText('Upload Image')).toBeInTheDocument();
        });

        // Upload the test image
        const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for processing
        await waitFor(() => {
          expect(mockOnScanSuccess).toHaveBeenCalledWith(expectedIMEI);
        }, { timeout: 5000 });

        // Verify the IMEI was extracted correctly
        expect(mockOnScanSuccess).toHaveBeenCalledWith(expectedIMEI);
      });
    });
  });

  describe('Barcode Detection from Stored Images', () => {
    testImages.forEach(({ name, expectedIMEI, file }) => {
      it(`should detect barcode from ${name}`, async () => {
        // Mock Html5Qrcode to return the barcode data
        mockHtml5Qrcode.scanFile.mockResolvedValue(expectedIMEI);

        render(
          <QrScanner
            onScanSuccess={mockOnScanSuccess}
            onScanError={mockOnScanError}
          />
        );

        // Switch to upload mode
        const uploadButton = screen.getByText('Upload Image');
        fireEvent.click(uploadButton);

        await waitFor(() => {
          expect(screen.getByText('Upload Image')).toBeInTheDocument();
        });

        // Upload the test image
        const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for barcode scanning
        await waitFor(() => {
          expect(mockHtml5Qrcode.scanFile).toHaveBeenCalled();
        });

        // Verify the barcode was detected
        expect(mockHtml5Qrcode.scanFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object)
        );
      });
    });
  });

  describe('OCR Text Extraction from Stored Images', () => {
    testImages.forEach(({ name, textContent, file }) => {
      it(`should extract text from ${name} using OCR`, async () => {
        // Mock Tesseract.js to return the text content
        const mockWorker = {
          recognize: vi.fn().mockResolvedValue({
            data: { text: textContent }
          }),
          terminate: vi.fn()
        };
        
        const { createWorker } = await import('tesseract.js');
        (createWorker as any).mockResolvedValue(mockWorker);

        render(
          <QrScanner
            onScanSuccess={mockOnScanSuccess}
            onScanError={mockOnScanError}
          />
        );

        // Switch to upload mode
        const uploadButton = screen.getByText('Upload Image');
        fireEvent.click(uploadButton);

        await waitFor(() => {
          expect(screen.getByText('Upload Image')).toBeInTheDocument();
        });

        // Upload the test image
        const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for OCR processing
        await waitFor(() => {
          expect(mockWorker.recognize).toHaveBeenCalled();
        });

        // Verify OCR was called
        expect(mockWorker.recognize).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object)
        );
      });
    });
  });

  describe('IMEI Validation from Stored Images', () => {
    testImages.forEach(({ name, expectedIMEI }) => {
      it(`should validate IMEI from ${name}`, () => {
        // Test IMEI validation logic
        const imeiIsValid = (imei: string): boolean => {
          if (imei.length !== 15 || !/^\d+$/.test(imei)) {
            return false;
          }
          
          let sum = 0;
          let isEven = false;
          
          for (let i = imei.length - 1; i >= 0; i--) {
            let digit = parseInt(imei[i]);
            
            if (isEven) {
              digit *= 2;
              if (digit > 9) {
                digit -= 9;
              }
            }
            
            sum += digit;
            isEven = !isEven;
          }
          
          return sum % 10 === 0;
        };

        // Test the expected IMEI
        if (expectedIMEI.length === 15) {
          expect(imeiIsValid(expectedIMEI)).toBe(true);
        } else {
          // For 16-digit IMEIs, test the first 15 digits
          const first15Digits = expectedIMEI.substring(0, 15);
          expect(first15Digits.length).toBe(15);
          expect(/^\d+$/.test(first15Digits)).toBe(true);
        }
      });
    });
  });

  describe('Complete Image Processing Pipeline', () => {
    it('should process images through the complete pipeline', async () => {
      const { name, expectedIMEI, textContent, file } = testImages[0];
      
      // Mock all the processing methods
      mockHtml5Qrcode.scanFile.mockResolvedValue(expectedIMEI);
      
      const mockWorker = {
        recognize: vi.fn().mockResolvedValue({
          data: { text: textContent }
        }),
        terminate: vi.fn()
      };
      
      const { createWorker } = await import('tesseract.js');
      (createWorker as any).mockResolvedValue(mockWorker);

      render(
        <QrScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
        />
      );

      // Switch to upload mode
      const uploadButton = screen.getByText('Upload Image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Upload Image')).toBeInTheDocument();
      });

      // Upload the test image
      const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for the complete processing pipeline
      await waitFor(() => {
        expect(mockOnScanSuccess).toHaveBeenCalledWith(expectedIMEI);
      }, { timeout: 10000 });

      // Verify all processing methods were called
      expect(mockHtml5Qrcode.scanFile).toHaveBeenCalled();
      expect(mockWorker.recognize).toHaveBeenCalled();
      expect(mockOnScanSuccess).toHaveBeenCalledWith(expectedIMEI);
    });
  });

  describe('Image Error Handling', () => {
    it('should handle image processing errors gracefully', async () => {
      const { file } = testImages[0];
      
      // Mock scanFile to throw an error
      mockHtml5Qrcode.scanFile.mockRejectedValue(new Error('Image processing failed'));
      
      // Mock Tesseract.js to throw an error
      const mockWorker = {
        recognize: vi.fn().mockRejectedValue(new Error('OCR failed')),
        terminate: vi.fn()
      };
      
      const { createWorker } = await import('tesseract.js');
      (createWorker as any).mockResolvedValue(mockWorker);

      render(
        <QrScanner
          onScanSuccess={mockOnScanSuccess}
          onScanError={mockOnScanError}
        />
      );

      // Switch to upload mode
      const uploadButton = screen.getByText('Upload Image');
      fireEvent.click(uploadButton);

      await waitFor(() => {
        expect(screen.getByText('Upload Image')).toBeInTheDocument();
      });

      // Upload the test image
      const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      // Wait for error handling
      await waitFor(() => {
        expect(mockOnScanError).toHaveBeenCalled();
      }, { timeout: 5000 });

      // Verify error was handled
      expect(mockOnScanError).toHaveBeenCalled();
      expect(mockOnScanSuccess).not.toHaveBeenCalled();
    });
  });

  describe('Image Format Support', () => {
    it('should support different image formats', async () => {
      const formats = ['image/jpeg', 'image/png', 'image/webp'];
      
      for (const format of formats) {
        const file = new File(['test'], `test.${format.split('/')[1]}`, { type: format });
        
        // Mock the scanFile method
        mockHtml5Qrcode.scanFile.mockResolvedValue('354626223546262');
        
        render(
          <QrScanner
            onScanSuccess={mockOnScanSuccess}
            onScanError={mockOnScanError}
          />
        );

        // Switch to upload mode
        const uploadButton = screen.getByText('Upload Image');
        fireEvent.click(uploadButton);

        await waitFor(() => {
          expect(screen.getByText('Upload Image')).toBeInTheDocument();
        });

        // Upload the test image
        const fileInput = screen.getByLabelText(/upload image/i) as HTMLInputElement;
        fireEvent.change(fileInput, { target: { files: [file] } });

        // Wait for processing
        await waitFor(() => {
          expect(mockHtml5Qrcode.scanFile).toHaveBeenCalled();
        });

        // Verify the format was accepted
        expect(mockHtml5Qrcode.scanFile).toHaveBeenCalledWith(
          expect.any(File),
          expect.any(Object)
        );
      }
    });
  });
});
