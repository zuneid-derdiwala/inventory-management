import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { EntryData } from "@/context/DataContext";
import { showError, showSuccess } from "./toast";
import { format } from "date-fns";

// Helper to convert Excel date number to Date object
const excelDateToJSDate = (excelDate: number): Date | undefined => {
  if (typeof excelDate !== 'number' || isNaN(excelDate)) {
    return undefined;
  }
  // Excel dates are days since 1900-01-01 (with 1900-02-29 bug)
  // JavaScript dates are milliseconds since 1970-01-01
  const date = new Date(Math.round((excelDate - 25569) * 86400 * 1000));
  // Check for valid date
  return isNaN(date.getTime()) ? undefined : date;
};


export const readExcelFile = (file: File): Promise<EntryData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array", cellDates: false }); // Read dates as numbers
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (json.length === 0) {
          showError("The uploaded file is empty.");
          resolve([]);
          return;
        }

        // Assuming the first row is the header
        const headers = json[0].map((h: string) => h ? h.trim() : '').filter(Boolean);
        const rows = json.slice(1);


        // Map headers to their column index
        const headerMap: { [key: string]: number } = {};
        headers.forEach((header: string, index: number) => {
          headerMap[header] = index;
        });

        // Helper function to find column index by multiple possible names
        const findColumnIndex = (possibleNames: string[]): number | undefined => {
          for (const name of possibleNames) {
            if (headerMap[name] !== undefined) {
              return headerMap[name];
            }
          }
          return undefined;
        };

        const importedData: EntryData[] = rows.map((row: any[]) => {
          // Helper to safely get cell value
          const getCellValue = (colIndex: number | undefined): any => {
            if (colIndex === undefined || colIndex >= row.length) return undefined;
            return row[colIndex];
          };

          // Find column indices with case-insensitive matching
          const imeiCol = findColumnIndex(["IMEI", "imei", "Imei"]);
          const brandCol = findColumnIndex(["Brand", "brand", "BRAND"]);
          const modelCol = findColumnIndex(["Model", "model", "MODEL"]);
          const sellerCol = findColumnIndex(["Seller", "seller", "SELLER"]);
          
          // Helper to safely convert to string and trim, returning undefined if empty
          const safeString = (value: any): string | undefined => {
            if (value === null || value === undefined) return undefined;
            const str = String(value).trim();
            return str.length > 0 ? str : undefined;
          };

          const entry: EntryData = {
            imei: String(getCellValue(imeiCol) || "").trim(),
            brand: safeString(getCellValue(brandCol)),
            model: safeString(getCellValue(modelCol)),
            seller: safeString(getCellValue(sellerCol)),
            bookingPerson: undefined,
            inwardDate: undefined,
            inwardAmount: undefined,
            buyer: undefined,
            outwardDate: undefined,
            outwardAmount: undefined,
          };

          // Handle Booking Person - could be "Booking Person", "Booking", or "Inward A" (which might contain names)
          // First try "Booking Person" column
          const bookingPersonCol = findColumnIndex(["Booking Person", "Booking person", "booking person", "BOOKING PERSON"]);
          if (bookingPersonCol !== undefined) {
            const bookingValue = getCellValue(bookingPersonCol);
            if (typeof bookingValue === 'string' && bookingValue.trim() !== '') {
              entry.bookingPerson = bookingValue.trim();
            } else if (typeof bookingValue === 'number') {
              // If it's a number, it might be a date serial number - but we'll skip it for booking person
              // Only use if it's clearly a name (very large numbers are likely not names)
              if (bookingValue < 1000) {
                // Very small number, might be a code, skip
              } else {
                // Could be a date serial number, skip for booking person
              }
            }
          }
          
          // If "Booking Person" column not found, check "Booking" column
          if (!entry.bookingPerson) {
            const bookingCol = findColumnIndex(["Booking", "booking", "BOOKING"]);
            if (bookingCol !== undefined) {
              const bookingValue = getCellValue(bookingCol);
              if (typeof bookingValue === 'string' && bookingValue.trim() !== '') {
                entry.bookingPerson = bookingValue.trim();
              }
              // Skip numbers in Booking column - they're likely date serial numbers, not names
            }
          }
          
          // Also check "Inward A" - it might contain booking person names (like "Jony", "Kammu")
          const inwardACol = findColumnIndex(["Inward A", "Inward a", "inward a", "Inward A", "INWARD A"]);
          if (inwardACol !== undefined && !entry.bookingPerson) {
            const inwardAValue = getCellValue(inwardACol);
            if (typeof inwardAValue === 'string' && inwardAValue.trim() !== '') {
              // Check if it's a name (not a number)
              const parsedNum = parseFloat(inwardAValue.replace(/[₹,]/g, ''));
              if (isNaN(parsedNum)) {
                // It's a name, use as booking person
                entry.bookingPerson = inwardAValue.trim();
              }
            }
          }

          // Handle Inward Date - could be "Inward Date", "Inward D", etc.
          const inwardDateCol = findColumnIndex(["Inward Date", "Inward date", "inward date", "Inward D", "Inward d", "inward d", "INWARD DATE", "INWARD D"]);
          if (inwardDateCol !== undefined) {
            const inwardDateValue = getCellValue(inwardDateCol);
            if (typeof inwardDateValue === 'number') {
              // Check if it's a date serial number (typically 1-100000) or an amount (larger numbers)
              // Date serial numbers are typically between 1 and ~100000 (for dates up to year 2174)
              if (inwardDateValue > 1 && inwardDateValue < 100000) {
                entry.inwardDate = excelDateToJSDate(inwardDateValue);
              }
              // If >= 100000, it's likely an amount, not a date
            } else if (typeof inwardDateValue === 'string' && inwardDateValue.trim() !== '') {
              // Try to parse as date string
              const parsedDate = new Date(inwardDateValue);
              if (!isNaN(parsedDate.getTime())) {
                entry.inwardDate = parsedDate;
              } else {
                // Try parsing as dd/MM/yyyy or dd-MM-yyyy
                const dateMatch = inwardDateValue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (dateMatch) {
                  const [, day, month, year] = dateMatch;
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  if (!isNaN(date.getTime())) {
                    entry.inwardDate = date;
                  }
                }
              }
            }
          }

          // Handle Inward Amount - could be "Inward Amount", "Inward A" (if it's a number), "Inward Amount (₹)", etc.
          // First try "Inward Amount" column
          const inwardAmountCol = findColumnIndex(["Inward Amount", "Inward amount", "inward amount", "Inward Amount (₹)", "INWARD AMOUNT"]);
          if (inwardAmountCol !== undefined) {
            const inwardAmountValue = getCellValue(inwardAmountCol);
            if (typeof inwardAmountValue === 'number') {
              entry.inwardAmount = inwardAmountValue;
            } else if (typeof inwardAmountValue === 'string' && inwardAmountValue.trim() !== '') {
              const parsedAmount = parseFloat(inwardAmountValue.replace(/[₹,]/g, ''));
              if (!isNaN(parsedAmount)) {
                entry.inwardAmount = parsedAmount;
              }
            }
          }
          
          // If "Inward Amount" not found, check "Inward A" - but only if it's a number (not a name)
          if (!entry.inwardAmount && inwardACol !== undefined) {
            const inwardAValue = getCellValue(inwardACol);
            if (typeof inwardAValue === 'number') {
              // If it's a number, it's likely an amount
              entry.inwardAmount = inwardAValue;
            } else if (typeof inwardAValue === 'string' && inwardAValue.trim() !== '') {
              // Check if it's a number string (not a name)
              const parsedAmount = parseFloat(inwardAValue.replace(/[₹,]/g, ''));
              if (!isNaN(parsedAmount)) {
                entry.inwardAmount = parsedAmount;
              }
              // If it's not a number, it's likely a booking person name (already handled above)
            }
          }
          
          // Also check "Inward D" - if it's a large number (>= 100000), it might be an amount
          if (!entry.inwardAmount && inwardDateCol !== undefined) {
            const inwardDValue = getCellValue(inwardDateCol);
            if (typeof inwardDValue === 'number' && inwardDValue >= 100000) {
              // Large number, likely an amount (not a date)
              entry.inwardAmount = inwardDValue;
              entry.inwardDate = undefined; // Clear date if we used it as amount
            }
          }

          // Handle Buyer - could be "Buyer" (name or date serial number)
          const buyerCol = findColumnIndex(["Buyer", "buyer", "BUYER"]);
          if (buyerCol !== undefined) {
            const buyerValue = getCellValue(buyerCol);
            if (typeof buyerValue === 'number') {
              // If it's a number in date range, it might be a date serial number
              if (buyerValue > 1 && buyerValue < 100000) {
                const buyerDate = excelDateToJSDate(buyerValue);
                entry.buyer = buyerDate ? format(buyerDate, "dd/MM/yyyy") : String(buyerValue);
              } else {
                // Large number, treat as string
                entry.buyer = String(buyerValue);
              }
            } else if (typeof buyerValue === 'string' && buyerValue.trim() !== '') {
              entry.buyer = buyerValue.trim();
            }
          }

          // Handle Outward Date - could be "Outward Date", "Outward D", etc.
          const outwardDateCol = findColumnIndex(["Outward Date", "Outward date", "outward date", "Outward D", "Outward d", "outward d", "OUTWARD DATE", "OUTWARD D"]);
          if (outwardDateCol !== undefined) {
            const outwardDateValue = getCellValue(outwardDateCol);
            if (typeof outwardDateValue === 'number') {
              if (outwardDateValue > 1 && outwardDateValue < 100000) {
                entry.outwardDate = excelDateToJSDate(outwardDateValue);
              }
            } else if (typeof outwardDateValue === 'string' && outwardDateValue.trim() !== '') {
              const parsedDate = new Date(outwardDateValue);
              if (!isNaN(parsedDate.getTime())) {
                entry.outwardDate = parsedDate;
              } else {
                // Try parsing as dd/MM/yyyy or dd-MM-yyyy
                const dateMatch = outwardDateValue.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
                if (dateMatch) {
                  const [, day, month, year] = dateMatch;
                  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                  if (!isNaN(date.getTime())) {
                    entry.outwardDate = date;
                  }
                }
              }
            }
          }

          // Handle Outward Amount - could be "Outward Amount", "Outward (1st)", "Outward (2nd)", "Outward Amount (₹)", etc.
          const outwardAmount1Col = findColumnIndex(["Outward Amount", "Outward amount", "outward amount", "Outward (1st)", "Outward(1st)", "outward (1st)", "Outward Amount (₹)", "OUTWARD AMOUNT", "Outward (1st)"]);
          const outwardAmount2Col = findColumnIndex(["Outward (2nd)", "Outward(2nd)", "outward (2nd)", "OUTWARD (2ND)"]);
          
          // Try to get outward amount from first column
          if (outwardAmount1Col !== undefined) {
            const outwardAmountValue = getCellValue(outwardAmount1Col);
            if (typeof outwardAmountValue === 'number') {
              entry.outwardAmount = outwardAmountValue;
            } else if (typeof outwardAmountValue === 'string' && outwardAmountValue.trim() !== '') {
              const parsedAmount = parseFloat(outwardAmountValue.replace(/[₹,]/g, ''));
              if (!isNaN(parsedAmount)) {
                entry.outwardAmount = parsedAmount;
              }
            }
          }
          
          // If there's a second outward amount column and first is empty, use second
          if (!entry.outwardAmount && outwardAmount2Col !== undefined) {
            const outwardAmount2Value = getCellValue(outwardAmount2Col);
            if (typeof outwardAmount2Value === 'number') {
              entry.outwardAmount = outwardAmount2Value;
            } else if (typeof outwardAmount2Value === 'string' && outwardAmount2Value.trim() !== '') {
              const parsedAmount = parseFloat(outwardAmount2Value.replace(/[₹,]/g, ''));
              if (!isNaN(parsedAmount)) {
                entry.outwardAmount = parsedAmount;
              }
            }
          }

          return entry;
        }).filter(entry => entry.imei.length > 0); // Only import entries with an IMEI

        resolve(importedData);
      } catch (error) {
        console.error("Error reading Excel/CSV file:", error);
        showError("Failed to read file. Please ensure it's a valid Excel or CSV format.");
        reject(error);
      }
    };

    reader.onerror = (error) => {
      console.error("File reader error:", error);
      showError("Error reading file.");
      reject(error);
    };

    reader.readAsArrayBuffer(file);
  });
};

export const exportToExcel = (data: EntryData[], filename: string = "inventory_data") => {
  if (!data || data.length === 0) {
    showError("No data to export.");
    return;
  }

  // Format dates as strings in dd/mm/yyyy format for better Excel compatibility
  const formatDate = (date: Date | undefined): string => {
    if (!date) return "";
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const exportData = data.map(entry => ({
    "IMEI": entry.imei,
    "Brand": entry.brand,
    "Model": entry.model,
    "Seller": entry.seller,
    "Booking Person": entry.bookingPerson,
    "Inward Date": formatDate(entry.inwardDate),
    "Inward Amount": entry.inwardAmount,
    "Buyer": entry.buyer,
    "Outward Date": formatDate(entry.outwardDate),
    "Outward Amount": entry.outwardAmount,
  }));

  const worksheet = XLSX.utils.json_to_sheet(exportData);

  // Set column widths for better readability
  const colWidths = [
    { wch: 15 }, // IMEI
    { wch: 10 }, // Brand
    { wch: 15 }, // Model
    { wch: 12 }, // Seller
    { wch: 15 }, // Booking Person
    { wch: 12 }, // Inward Date
    { wch: 12 }, // Inward Amount
    { wch: 12 }, // Buyer
    { wch: 12 }, // Outward Date
    { wch: 12 }, // Outward Amount
  ];
  worksheet['!cols'] = colWidths;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Inventory Data");

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const blob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(blob, `${filename}.xlsx`);
  showSuccess("Data exported successfully!");
};