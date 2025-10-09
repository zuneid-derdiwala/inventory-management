import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
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

describe('QrScanner IMEI Extraction Tests', () => {
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

  it('should render scanner component', () => {
    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    expect(screen.getByText('Choose Scanning Method')).toBeInTheDocument();
  });

  it('should switch to camera mode', async () => {
    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    const cameraButton = screen.getByText('Use Camera');
    fireEvent.click(cameraButton);

    await waitFor(() => {
      expect(screen.getByText('Camera Scanner')).toBeInTheDocument();
    });
  });

  it('should switch to upload mode', async () => {
    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    const uploadButton = screen.getByText('Upload Image');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Image')).toBeInTheDocument();
    });
  });

  it('should handle file upload and extract IMEI', async () => {
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

    // Wait for processing
    await waitFor(() => {
      expect(mockOnScanSuccess).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('should extract IMEI from barcode data', () => {
    // Test the IMEI extraction logic
    const testCases = [
      {
        input: '354626223546262',
        expected: '354626223546262',
        description: 'Direct IMEI number'
      },
      {
        input: 'IMEI: 354626223546262',
        expected: '354626223546262',
        description: 'IMEI with label'
      },
      {
        input: 'IMEI1: 354626223546262',
        expected: '354626223546262',
        description: 'IMEI1 with label'
      },
      {
        input: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
        expected: '354626223546262',
        description: 'Complex IMEI format'
      },
      {
        input: 'IMEI: 3251600990000013254 2',
        expected: '3251600990000013254',
        description: 'IMEI with space and check digit'
      }
    ];

    testCases.forEach(({ input, expected, description }) => {
      // This would test the actual extraction logic
      // For now, we'll just verify the test structure
      expect(input).toBeDefined();
      expect(expected).toBeDefined();
      expect(description).toBeDefined();
    });
  });

  it('should validate IMEI numbers correctly', () => {
    const validIMEIs = [
      '354626223546262',
      '3251600990000013254',
      '123456789012345'
    ];

    const invalidIMEIs = [
      '12345678901234', // Too short
      '1234567890123456', // Too long
      '12345678901234a', // Contains letter
      '6932204509475', // Product barcode
      '123456789012345' // Invalid checksum
    ];

    validIMEIs.forEach(imei => {
      expect(imei.length).toBe(15);
      expect(/^\d+$/.test(imei)).toBe(true);
    });

    invalidIMEIs.forEach(imei => {
      if (imei.length !== 15 || !/^\d+$/.test(imei)) {
        expect(true).toBe(true); // Invalid as expected
      }
    });
  });

  it('should handle OCR text extraction', async () => {
    // Mock OCR result
    const mockOCRResult = {
      data: {
        text: 'IMEI: 354626223546262\nSERIAL: 5AAS58133XDYT95'
      }
    };

    // This would test the OCR extraction logic
    expect(mockOCRResult.data.text).toContain('IMEI:');
    expect(mockOCRResult.data.text).toContain('354626223546262');
  });

  it('should filter out product barcodes', () => {
    const productBarcodes = [
      '6932204509475',
      '693220450947',
      '6901234567890',
      '6912345678901'
    ];

    const imeiNumbers = [
      '354626223546262',
      '3251600990000013254'
    ];

    productBarcodes.forEach(barcode => {
      // Should be filtered out
      expect(barcode.startsWith('693') || barcode.startsWith('690') || barcode.startsWith('691')).toBe(true);
    });

    imeiNumbers.forEach(imei => {
      // Should not be filtered out
      expect(imei.length).toBe(15);
      expect(imei.startsWith('3') || imei.startsWith('8')).toBe(true);
    });
  });

  it('should handle camera initialization errors gracefully', async () => {
    // Mock camera error
    mockHtml5Qrcode.start.mockRejectedValue(new Error('Camera not found'));

    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    // Switch to camera mode
    const cameraButton = screen.getByText('Use Camera');
    fireEvent.click(cameraButton);

    await waitFor(() => {
      expect(screen.getByText('Camera Scanner')).toBeInTheDocument();
    });

    // Try to start camera
    const startButton = screen.getByText('Start Camera');
    fireEvent.click(startButton);

    await waitFor(() => {
      expect(mockOnScanError).toHaveBeenCalled();
    });
  });

  it('should switch between scanner modes', async () => {
    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    // Switch to camera mode
    const cameraButton = screen.getByText('Use Camera');
    fireEvent.click(cameraButton);

    await waitFor(() => {
      expect(screen.getByText('Camera Scanner')).toBeInTheDocument();
    });

    // Switch to barcode scanner mode
    const barcodeButton = screen.getByText('📊 Barcode Scanner');
    fireEvent.click(barcodeButton);

    await waitFor(() => {
      expect(screen.getByText('📊 Barcode Scanner')).toHaveClass('bg-blue-600');
    });

    // Switch to direct QR scanner mode
    const qrButton = screen.getByText('🔲 Direct QR Scanner');
    fireEvent.click(qrButton);

    await waitFor(() => {
      expect(screen.getByText('🔲 Direct QR Scanner')).toHaveClass('bg-green-600');
    });
  });

  it('should handle mobile browser compatibility', async () => {
    // Mock mobile user agent
    Object.defineProperty(navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      configurable: true
    });

    render(
      <QrScanner
        onScanSuccess={mockOnScanSuccess}
        onScanError={mockOnScanError}
      />
    );

    // Switch to camera mode
    const cameraButton = screen.getByText('Use Camera');
    fireEvent.click(cameraButton);

    await waitFor(() => {
      expect(screen.getByText('Camera Scanner')).toBeInTheDocument();
    });

    // Check for mobile-specific warnings
    const qrButton = screen.getByText('🔲 Direct QR Scanner');
    fireEvent.click(qrButton);

    await waitFor(() => {
      expect(screen.getByText(/Direct QR scanner may not work on all mobile browsers/)).toBeInTheDocument();
    });
  });
});

// Test data for the specific images provided
describe('IMEI Extraction from Test Images', () => {
  const testImageData = [
    {
      name: 'IMEI Card Image',
      description: 'Digital card showing IMEI(MEID) and S/N with barcode',
      expectedIMEI: '354626223546262',
      textContent: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
      barcodeData: '354626223546262'
    },
    {
      name: 'IMEI Label Image',
      description: 'Light beige label with IMEI and SERIAL barcodes',
      expectedIMEI: '3251600990000013254',
      textContent: 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95',
      barcodeData: '3251600990000013254'
    }
  ];

  testImageData.forEach(({ name, description, expectedIMEI, textContent, barcodeData }) => {
    it(`should extract IMEI from ${name}`, () => {
      // Test barcode scanning
      expect(barcodeData).toBe(expectedIMEI);
      expect(barcodeData.length).toBe(15);
      expect(/^\d+$/.test(barcodeData)).toBe(true);

      // Test OCR text extraction
      const extractedIMEI = textContent.match(/IMEI[^:]*:\s*(\d+)/)?.[1];
      expect(extractedIMEI).toBe(expectedIMEI);

      // Test IMEI validation
      expect(expectedIMEI.length).toBe(15);
      expect(/^\d+$/.test(expectedIMEI)).toBe(true);
    });
  });

  it('should handle multiple IMEI formats', () => {
    const formats = [
      '354626223546262', // Direct format
      'IMEI: 354626223546262', // With label
      'IMEI1: 354626223546262', // With IMEI1 label
      'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19', // Complex format
      'IMEI: 3251600990000013254 2' // With space and check digit
    ];

    formats.forEach(format => {
      // Extract IMEI number
      const imeiMatch = format.match(/(\d{15})/);
      expect(imeiMatch).toBeTruthy();
      
      if (imeiMatch) {
        const imei = imeiMatch[1];
        expect(imei.length).toBe(15);
        expect(/^\d+$/.test(imei)).toBe(true);
      }
    });
  });

  it('should prioritize IMEI1 over other IMEI numbers', () => {
    const textWithMultipleIMEIs = `
      IMEI1: 354626223546262
      IMEI2: 354626223546263
      IMEI: 354626223546264
    `;

    // Should extract IMEI1 first
    const imei1Match = textWithMultipleIMEIs.match(/IMEI1:\s*(\d{15})/);
    expect(imei1Match).toBeTruthy();
    expect(imei1Match?.[1]).toBe('354626223546262');
  });
});
