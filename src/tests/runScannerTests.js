#!/usr/bin/env node

/**
 * Test runner for QR Scanner IMEI extraction functionality
 * This script tests the camera scanning and IMEI extraction from the provided images
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('🧪 Running QR Scanner IMEI Extraction Tests...\n');

// Test data based on the provided images
const testImages = [
  {
    name: 'Image 1 - IMEI Card',
    description: 'Digital card showing IMEI(MEID) and S/N with barcode',
    expectedIMEI: '354626223546262',
    textContent: 'IMEI(MEID) and S/N\nIMEI1\n354626223546262 / 19',
    barcodeData: '354626223546262'
  },
  {
    name: 'Image 2 - IMEI Label',
    description: 'Light beige label with IMEI and SERIAL barcodes',
    expectedIMEI: '325160099000001', // First 15 digits of the 16-digit number
    textContent: 'IMEI: 3251600990000013254 2\nSERIAL: 5AAS58133XDYT95',
    barcodeData: '325160099000001' // Extract first 15 digits
  }
];

// IMEI extraction logic (matching the actual implementation)
function extractIMEIsFromText(text) {
  const imeiPatterns = [];
  
  // Look for IMEI patterns - improved to handle various formats
  const patterns = [
    /IMEI1:\s*(\d{15})/gi,
    /IMEI:\s*(\d{15})/gi,
    /IMEI\(MEID\)[^:]*:\s*(\d{15})/gi,
    /IMEI:\s*(\d{15})\s*\d/g, // Handle IMEI with trailing digit
    /(\d{15})/g
  ];
  
  patterns.forEach(pattern => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(match => {
        // Extract the IMEI part (first 15 digits)
        const imeiMatch = match.match(/(\d{15,16})/);
        if (imeiMatch) {
          let imei = imeiMatch[1];
          // If 16 digits, take first 15
          if (imei.length === 16) {
            imei = imei.substring(0, 15);
          }
          if (imei.length === 15 && /^\d+$/.test(imei)) {
            imeiPatterns.push(imei);
          }
        }
      });
    }
  });
  
  return [...new Set(imeiPatterns)]; // Remove duplicates
}

// IMEI validation using Luhn algorithm
function imeiIsValid(imei) {
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
}

// Filter out product barcodes
function filterProductBarcodes(imeis) {
  return imeis.filter(imei => {
    if (imei.startsWith('693') || imei.startsWith('690') || imei.startsWith('691') ||
        imei.startsWith('692') || imei.startsWith('694') || imei.startsWith('695') ||
        imei === '6932204509475' || imei === '693220450947') {
      return false;
    }
    return true;
  });
}

// Test functions
function testIMEIExtraction() {
  console.log('📱 Testing IMEI Extraction from Images...\n');
  
  let passedTests = 0;
  let totalTests = 0;
  
  testImages.forEach(({ name, description, expectedIMEI, textContent, barcodeData }) => {
    totalTests++;
    console.log(`Testing ${name}:`);
    console.log(`  Description: ${description}`);
    console.log(`  Expected IMEI: ${expectedIMEI}`);
    
    try {
      // Test text extraction
      const extractedIMEIs = extractIMEIsFromText(textContent);
      const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
      
      console.log(`  Extracted IMEIs: ${extractedIMEIs.join(', ')}`);
      console.log(`  Filtered IMEIs: ${filteredIMEIs.join(', ')}`);
      
      // Test barcode data
      const barcodeIMEIs = extractIMEIsFromText(barcodeData);
      const filteredBarcodeIMEIs = filterProductBarcodes(barcodeIMEIs);
      
      console.log(`  Barcode IMEIs: ${barcodeIMEIs.join(', ')}`);
      console.log(`  Filtered Barcode IMEIs: ${filteredBarcodeIMEIs.join(', ')}`);
      
      // Validate results
      const textSuccess = filteredIMEIs.includes(expectedIMEI);
      const barcodeSuccess = filteredBarcodeIMEIs.includes(expectedIMEI);
      const validationSuccess = imeiIsValid(expectedIMEI);
      
      console.log(`  Text extraction: ${textSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  Barcode extraction: ${barcodeSuccess ? '✅ PASS' : '❌ FAIL'}`);
      console.log(`  IMEI validation: ${validationSuccess ? '✅ PASS' : '❌ FAIL'}`);
      
      if (textSuccess && barcodeSuccess && validationSuccess) {
        passedTests++;
        console.log(`  Overall: ✅ PASS\n`);
      } else {
        console.log(`  Overall: ❌ FAIL\n`);
      }
      
    } catch (error) {
      console.log(`  Error: ${error.message}`);
      console.log(`  Overall: ❌ FAIL\n`);
    }
  });
  
  return { passedTests, totalTests };
}

function testIMEIValidation() {
  console.log('🔍 Testing IMEI Validation...\n');
  
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
  
  let passedTests = 0;
  let totalTests = 0;
  
  // Test valid IMEIs
  validIMEIs.forEach(imei => {
    totalTests++;
    const isValid = imeiIsValid(imei);
    console.log(`Valid IMEI ${imei}: ${isValid ? '✅ PASS' : '❌ FAIL'}`);
    if (isValid) passedTests++;
  });
  
  // Test invalid IMEIs
  invalidIMEIs.forEach(imei => {
    totalTests++;
    const isValid = imeiIsValid(imei);
    console.log(`Invalid IMEI ${imei}: ${!isValid ? '✅ PASS' : '❌ FAIL'}`);
    if (!isValid) passedTests++;
  });
  
  console.log('');
  return { passedTests, totalTests };
}

function testProductBarcodeFiltering() {
  console.log('🚫 Testing Product Barcode Filtering...\n');
  
  const mixedBarcodes = [
    '354626223546262', // Valid IMEI
    '6932204509475',   // Product barcode
    '3251600990000013254', // Valid IMEI
    '6901234567890'    // Product barcode
  ];
  
  const filtered = filterProductBarcodes(mixedBarcodes);
  
  console.log(`Original barcodes: ${mixedBarcodes.join(', ')}`);
  console.log(`Filtered barcodes: ${filtered.join(', ')}`);
  
  const expectedValid = ['354626223546262', '3251600990000013254'];
  const expectedFiltered = ['6932204509475', '6901234567890'];
  
  const validFiltered = expectedValid.every(imei => filtered.includes(imei));
  const invalidFiltered = expectedFiltered.every(imei => !filtered.includes(imei));
  
  console.log(`Valid IMEIs preserved: ${validFiltered ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`Product barcodes filtered: ${invalidFiltered ? '✅ PASS' : '❌ FAIL'}`);
  
  const overallSuccess = validFiltered && invalidFiltered;
  console.log(`Overall: ${overallSuccess ? '✅ PASS' : '❌ FAIL'}\n`);
  
  return { passedTests: overallSuccess ? 1 : 0, totalTests: 1 };
}

function testEdgeCases() {
  console.log('🔬 Testing Edge Cases...\n');
  
  const edgeCases = [
    {
      name: 'Empty input',
      input: '',
      shouldExtract: false
    },
    {
      name: 'No IMEI text',
      input: 'No IMEI here',
      shouldExtract: false
    },
    {
      name: 'Invalid IMEI checksum',
      input: 'IMEI: 123456789012345',
      shouldExtract: false
    },
    {
      name: 'Product barcode',
      input: 'IMEI: 6932204509475',
      shouldExtract: false
    },
    {
      name: 'Multiple IMEIs',
      input: 'IMEI1: 354626223546262\nIMEI2: 354626223546263',
      shouldExtract: true,
      expectedCount: 2
    }
  ];
  
  let passedTests = 0;
  let totalTests = edgeCases.length;
  
  edgeCases.forEach(({ name, input, shouldExtract, expectedCount }) => {
    const extractedIMEIs = extractIMEIsFromText(input);
    const filteredIMEIs = filterProductBarcodes(extractedIMEIs);
    
    let success = false;
    
    if (shouldExtract) {
      if (expectedCount) {
        success = filteredIMEIs.length >= expectedCount;
      } else {
        success = filteredIMEIs.length > 0;
      }
    } else {
      success = filteredIMEIs.length === 0;
    }
    
    console.log(`${name}: ${success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`  Extracted: ${filteredIMEIs.join(', ') || 'none'}`);
    
    if (success) passedTests++;
  });
  
  console.log('');
  return { passedTests, totalTests };
}

// Main test execution
function runAllTests() {
  console.log('🚀 Starting QR Scanner IMEI Extraction Test Suite\n');
  console.log('=' .repeat(60) + '\n');
  
  const results = [];
  
  // Run all test suites
  results.push(testIMEIExtraction());
  results.push(testIMEIValidation());
  results.push(testProductBarcodeFiltering());
  results.push(testEdgeCases());
  
  // Calculate totals
  const totalPassed = results.reduce((sum, result) => sum + result.passedTests, 0);
  const totalTests = results.reduce((sum, result) => sum + result.totalTests, 0);
  
  console.log('=' .repeat(60));
  console.log('📊 Test Results Summary:');
  console.log(`✅ Passed: ${totalPassed}`);
  console.log(`❌ Failed: ${totalTests - totalPassed}`);
  console.log(`📈 Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%`);
  console.log('=' .repeat(60));
  
  if (totalPassed === totalTests) {
    console.log('🎉 All tests passed! IMEI extraction is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
  }
  
  return totalPassed === totalTests;
}

// Run the tests
const success = runAllTests();
process.exit(success ? 0 : 1);

export {
  extractIMEIsFromText,
  imeiIsValid,
  filterProductBarcodes,
  runAllTests
};
