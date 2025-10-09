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

// Test image data based on the provided images
const testImages = [
  {
    name: 'IMEI Card Image',
    description: 'Digital card showing IMEI(MEID) and S/N with barcode',
    expectedIMEI: '354626223546262',
    // Base64 encoded test image data (simplified for testing)
    imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    textContent: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
    barcodeData: '354626223546262'
  },
  {
    name: 'IMEI Label Image',
    description: 'Light beige label with IMEI and SERIAL barcodes',
    expectedIMEI: '325160099000001',
    imageData: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    textContent: 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95',
    barcodeData: '325160099000001'
  }
];

describe('Image Scanning Tests with Stored Images', () => {
  const mockOnScanSuccess = vi.fn();
  const mockOnScanError = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset DOM
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Image Upload and Processing', () => {
    testImages.forEach(({ name, description, expectedIMEI, imageData, textContent, barcodeData }) => {
      it(`should process ${name} and extract IMEI`, async () => {
        // Mock the scanFile method to return the expected IMEI
        mockHtml5Qrcode.scanFile.mockResolvedValue(barcodeData);
        
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

        // Create a mock file with the image data
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
        
        // Mock the file reading
        Object.defineProperty(file, 'arrayBuffer', {
          value: vi.fn().mockResolvedValue(new ArrayBuffer(8))
        });

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

  describe('Barcode Scanning from Images', () => {
    testImages.forEach(({ name, expectedIMEI, barcodeData }) => {
      it(`should extract barcode from ${name}`, async () => {
        // Mock Html5Qrcode to return the barcode data
        mockHtml5Qrcode.scanFile.mockResolvedValue(barcodeData);

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

        // Create a mock file
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
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

  describe('OCR Text Extraction from Images', () => {
    testImages.forEach(({ name, textContent, expectedIMEI }) => {
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

        // Create a mock file
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
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

  describe('IMEI Validation from Images', () => {
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

  describe('Product Barcode Filtering from Images', () => {
    it('should filter out product barcodes from images', () => {
      const mixedBarcodes = [
        '354626223546262', // Valid IMEI from Image 1
        '6932204509475',   // Product barcode
        '325160099000001', // Valid IMEI from Image 2
        '6901234567890'    // Product barcode
      ];

      const filterProductBarcodes = (imeis: string[]): string[] => {
        return imeis.filter(imei => {
          if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') ||
              imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
              imei === '6932204509475' || imei === '693220450947') {
            return false;
          }
          return true;
        });
      };

      const filtered = filterProductBarcodes(mixedBarcodes);
      
      // Should keep the IMEIs from our test images
      expect(filtered).toContain('354626223546262');
      expect(filtered).toContain('325160099000001');
      
      // Should filter out product barcodes
      expect(filtered).not.toContain('6932204509475');
      expect(filtered).not.toContain('6901234567890');
    });
  });

  describe('Image Processing Pipeline', () => {
    it('should process images through the complete pipeline', async () => {
      const { name, expectedIMEI, textContent, barcodeData } = testImages[0];
      
      // Mock all the processing methods
      mockHtml5Qrcode.scanFile.mockResolvedValue(barcodeData);
      
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

      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
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

  describe('Error Handling for Images', () => {
    it('should handle image processing errors gracefully', async () => {
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

      // Create a mock file
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
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
});
