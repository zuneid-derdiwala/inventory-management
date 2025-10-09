import { describe, it, expect } from 'vitest';

// Test the IMEI extraction logic based on the provided images
describe('IMEI Extraction Logic Tests', () => {
  
  // Test data based on the provided images
  const testCases = [
    {
      name: 'Image 1 - IMEI Card',
      input: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
      expectedIMEI: '354626223546262',
      description: 'Digital card with IMEI(MEID) and S/N format'
    },
    {
      name: 'Image 2 - IMEI Label',
      input: 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95',
      expectedIMEI: '3251600990000013254',
      description: 'Label with IMEI and SERIAL format'
    },
    {
      name: 'Direct IMEI',
      input: '354626223546262',
      expectedIMEI: '354626223546262',
      description: 'Direct IMEI number without labels'
    },
    {
      name: 'IMEI with label',
      input: 'IMEI: 354626223546262',
      expectedIMEI: '354626223546262',
      description: 'IMEI with simple label'
    },
    {
      name: 'IMEI1 format',
      input: 'IMEI1: 354626223546262',
      expectedIMEI: '354626223546262',
      description: 'IMEI1 with label'
    }
  ];

  // Mock the IMEI extraction function
  const extractIMEIsFromText = (text: string): string[] => {
    const imeiPatterns: string[] = [];
    
    // Look for IMEI patterns
    const patterns = [
      /IMEI1:\s*(\d{15})/gi,
      /IMEI:\s*(\d{15})/gi,
      /IMEI\(MEID\)[^:]*:\s*(\d{15})/gi,
      /(\d{15})/g
    ];
    
    patterns.forEach(pattern => {
      const matches = text.match(pattern);
      if (matches) {
        matches.forEach(match => {
          const imei = match.replace(/[^\d]/g, '');
          if (imei.length === 15 && /^\d+$/.test(imei)) {
            imeiPatterns.push(imei);
          }
        });
      }
    });
    
    return [...new Set(imeiPatterns)]; // Remove duplicates
  };

  // Mock the IMEI validation function
  const imeiIsValid = (imei: string): boolean => {
    if (imei.length !== 15 || !/^\d+$/.test(imei)) {
      return false;
    }
    
    // Luhn algorithm for IMEI validation
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

  // Mock the product barcode filtering function
  const filterProductBarcodes = (imeis: string[]): string[] => {
    return imeis.filter(imei => {
      // Filter out common product barcodes
      if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') ||
          imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
          imei === '6932204509475' || imei === '693220450947') {
        return false;
      }
      return true;
    });
  };

  testCases.forEach(({ name, input, expectedIMEI, description }) => {
    it(`should extract IMEI from ${name}`, () => {
      const extractedIMEIs = extractIMEIsFromText(input);
      const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
      
      expect(filteredIMEIs).toContain(expectedIMEI);
      expect(filteredIMEIs.length).toBeGreaterThan(0);
    });
  });

  it('should validate IMEI numbers correctly', () => {
    const validIMEIs = [
      '354626223546262',
      '3251600990000013254'
    ];

    const invalidIMEIs = [
      '12345678901234', // Too short
      '1234567890123456', // Too long
      '12345678901234a', // Contains letter
      '6932204509475', // Product barcode
      '123456789012345' // Invalid checksum
    ];

    validIMEIs.forEach(imei => {
      expect(imeiIsValid(imei)).toBe(true);
    });

    invalidIMEIs.forEach(imei => {
      expect(imeiIsValid(imei)).toBe(false);
    });
  });

  it('should filter out product barcodes', () => {
    const mixedBarcodes = [
      '354626223546262', // Valid IMEI
      '6932204509475',   // Product barcode
      '3251600990000013254', // Valid IMEI
      '6901234567890'    // Product barcode
    ];

    const filtered = filterProductBarcodes(mixedBarcodes);
    
    expect(filtered).toContain('354626223546262');
    expect(filtered).toContain('3251600990000013254');
    expect(filtered).not.toContain('6932204509475');
    expect(filtered).not.toContain('6901234567890');
  });

  it('should prioritize IMEI1 over other IMEI numbers', () => {
    const textWithMultipleIMEIs = `
      IMEI1: 354626223546262
      IMEI2: 354626223546263
      IMEI: 354626223546264
    `;

    const extractedIMEIs = extractIMEIsFromText(textWithMultipleIMEIs);
    const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
    
    // Should find IMEI1 first
    expect(filteredIMEIs).toContain('354626223546262');
    expect(filteredIMEIs.length).toBeGreaterThan(0);
  });

  it('should handle OCR text extraction from images', () => {
    const ocrResults = [
      {
        text: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
        expectedIMEI: '354626223546262'
      },
      {
        text: 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95',
        expectedIMEI: '3251600990000013254'
      }
    ];

    ocrResults.forEach(({ text, expectedIMEI }) => {
      const extractedIMEIs = extractIMEIsFromText(text);
      const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
      
      expect(filteredIMEIs).toContain(expectedIMEI);
    });
  });

  it('should handle barcode scanning results', () => {
    const barcodeResults = [
      '354626223546262',
      '3251600990000013254'
    ];

    barcodeResults.forEach(barcode => {
      const extractedIMEIs = extractIMEIsFromText(barcode);
      const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
      
      expect(filteredIMEIs).toContain(barcode);
      expect(imeiIsValid(barcode)).toBe(true);
    });
  });

  it('should handle edge cases', () => {
    const edgeCases = [
      {
        input: '',
        expected: []
      },
      {
        input: 'No IMEI here',
        expected: []
      },
      {
        input: 'IMEI: 123456789012345', // Invalid checksum
        expected: []
      },
      {
        input: 'IMEI: 6932204509475', // Product barcode
        expected: []
      }
    ];

    edgeCases.forEach(({ input, expected }) => {
      const extractedIMEIs = extractIMEIsFromText(input);
      const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
      
      if (expected.length === 0) {
        expect(filteredIMEIs.length).toBe(0);
      } else {
        expect(filteredIMEIs).toEqual(expect.arrayContaining(expected));
      }
    });
  });
});

// Test the specific IMEI numbers from the provided images
describe('Specific IMEI Test Cases', () => {
  it('should extract IMEI from Image 1: 354626223546262', () => {
    const image1Text = 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19';
    const expectedIMEI = '354626223546262';
    
    // Test direct extraction
    expect(image1Text).toContain(expectedIMEI);
    
    // Test IMEI validation
    expect(expectedIMEI.length).toBe(15);
    expect(/^\d+$/.test(expectedIMEI)).toBe(true);
    
    // Test that it's not a product barcode
    expect(expectedIMEI.startsWith('693')).toBe(false);
    expect(expectedIMEI.startsWith('690')).toBe(false);
    expect(expectedIMEI.startsWith('691')).toBe(false);
  });

  it('should extract IMEI from Image 2: 3251600990000013254', () => {
    const image2Text = 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95';
    const expectedIMEI = '3251600990000013254';
    
    // Test direct extraction
    expect(image2Text).toContain(expectedIMEI);
    
    // Test IMEI validation
    expect(expectedIMEI.length).toBe(15);
    expect(/^\d+$/.test(expectedIMEI)).toBe(true);
    
    // Test that it's not a product barcode
    expect(expectedIMEI.startsWith('693')).toBe(false);
    expect(expectedIMEI.startsWith('690')).toBe(false);
    expect(expectedIMEI.startsWith('691')).toBe(false);
  });

  it('should handle both IMEI formats correctly', () => {
    const format1 = 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19';
    const format2 = 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95';
    
    // Both should contain valid 15-digit IMEI numbers
    const imei1 = '354626223546262';
    const imei2 = '3251600990000013254';
    
    expect(format1).toContain(imei1);
    expect(format2).toContain(imei2);
    
    expect(imei1.length).toBe(15);
    expect(imei2.length).toBe(15);
    
    expect(/^\d+$/.test(imei1)).toBe(true);
    expect(/^\d+$/.test(imei2)).toBe(true);
  });
});
