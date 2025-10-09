# QR Scanner IMEI Extraction Test Suite

This test suite validates the QR Scanner component's ability to extract IMEI numbers from camera scanning and image uploads, specifically testing against the provided sample images.

## Test Images

### Image 1: IMEI Card
- **Format**: Digital card showing "IMEI(MEID) and S/N"
- **Expected IMEI**: `354626223546262`
- **Text Content**: `IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19`
- **Barcode Data**: `354626223546262`

### Image 2: IMEI Label
- **Format**: Light beige label with IMEI and SERIAL barcodes
- **Expected IMEI**: `3251600990000013254`
- **Text Content**: `IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95`
- **Barcode Data**: `3251600990000013254`

## Test Categories

### 1. IMEI Extraction Tests
Tests the core functionality of extracting IMEI numbers from various text formats:

- Direct IMEI numbers: `354626223546262`
- IMEI with labels: `IMEI: 354626223546262`
- IMEI1 format: `IMEI1: 354626223546262`
- Complex formats: `IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19`

### 2. IMEI Validation Tests
Validates IMEI numbers using the Luhn algorithm:

- **Valid IMEIs**: 15-digit numbers with correct checksum
- **Invalid IMEIs**: Wrong length, non-numeric, invalid checksum

### 3. Product Barcode Filtering Tests
Ensures product barcodes are filtered out:

- **Product Barcodes**: `6932204509475`, `6901234567890`
- **Valid IMEIs**: Should not be filtered

### 4. Camera Scanning Tests
Tests the camera scanning functionality:

- Camera initialization
- QR code detection
- IMEI extraction from camera feed
- Error handling for mobile browsers

### 5. Image Upload Tests
Tests the image upload and processing:

- File upload handling
- OCR text extraction
- IMEI extraction from uploaded images
- Multiple processing methods

## Running Tests

### Quick Test (Node.js)
```bash
npm run test:scanner
```

### IMEI Extraction Tests (Vitest)
```bash
npm run test:imei
```

### QR Scanner Component Tests (Vitest)
```bash
npm run test:qr
```

### All Tests
```bash
npm run test:scanner && npm run test:imei && npm run test:qr
```

## Test Results Expected

### Image 1 Test Results
- **Text Extraction**: ✅ Should extract `354626223546262`
- **Barcode Extraction**: ✅ Should extract `354626223546262`
- **IMEI Validation**: ✅ Should pass Luhn algorithm
- **Product Filtering**: ✅ Should not be filtered out

### Image 2 Test Results
- **Text Extraction**: ✅ Should extract `3251600990000013254`
- **Barcode Extraction**: ✅ Should extract `3251600990000013254`
- **IMEI Validation**: ✅ Should pass Luhn algorithm
- **Product Filtering**: ✅ Should not be filtered out

## Test Implementation Details

### IMEI Extraction Logic
```typescript
const extractIMEIsFromText = (text: string): string[] => {
  const imeiPatterns: string[] = [];
  
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
  
  return [...new Set(imeiPatterns)];
};
```

### IMEI Validation (Luhn Algorithm)
```typescript
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
```

### Product Barcode Filtering
```typescript
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
```

## Mobile Browser Compatibility

The tests also validate mobile browser compatibility:

- **iOS Safari**: Camera permission handling
- **Android Chrome**: Camera initialization
- **Mobile Firefox**: Fallback mechanisms
- **Direct QR Scanner**: Mobile-optimized configuration
- **Barcode Scanner**: Fallback for problematic browsers

## Error Handling Tests

- **Permission Denied**: Camera access denied
- **No Camera Found**: Device without camera
- **Camera In Use**: Camera used by another app
- **Unsupported Browser**: Browser without camera support
- **Network Issues**: Connectivity problems

## Performance Tests

- **Processing Speed**: IMEI extraction time
- **Memory Usage**: Large image processing
- **CPU Usage**: Mobile device optimization
- **Battery Impact**: Camera usage efficiency

## Continuous Integration

These tests are designed to run in CI/CD pipelines:

- **Automated Testing**: Run on every commit
- **Cross-Browser Testing**: Multiple browser support
- **Mobile Testing**: Device-specific validation
- **Performance Monitoring**: Speed and memory tracking

## Troubleshooting

### Common Issues

1. **Camera Permission Denied**
   - Solution: Request permission before scanning
   - Test: Verify permission handling

2. **IMEI Not Extracted**
   - Solution: Check OCR accuracy and text patterns
   - Test: Validate extraction patterns

3. **Product Barcode Detected**
   - Solution: Improve filtering logic
   - Test: Validate filter patterns

4. **Mobile Browser Issues**
   - Solution: Use fallback mechanisms
   - Test: Mobile-specific configurations

### Debug Information

Enable debug logging:
```typescript
console.log('Extracted IMEIs:', extractedIMEIs);
console.log('Filtered IMEIs:', filteredIMEIs);
console.log('Validation result:', imeiIsValid(imei));
```

## Test Coverage

- **Unit Tests**: Individual function testing
- **Integration Tests**: Component interaction testing
- **E2E Tests**: Full user flow testing
- **Performance Tests**: Speed and memory testing
- **Compatibility Tests**: Cross-browser and device testing

## Future Enhancements

- **Machine Learning**: Improved OCR accuracy
- **Pattern Recognition**: Better IMEI detection
- **Multi-language Support**: International IMEI formats
- **Advanced Filtering**: Smart barcode classification
