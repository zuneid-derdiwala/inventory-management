import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { EntryData } from "@/context/DataContext";
import { showError, showSuccess } from "./toast";

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

        const importedData: EntryData[] = rows.map((row: any[]) => {
          const entry: EntryData = {
            imei: String(row[headerMap["IMEI"]] || "").trim(),
            brand: String(row[headerMap["Brand"]] || "").trim(),
            model: String(row[headerMap["Model"]] || "").trim(),
            seller: String(row[headerMap["Seller"]] || "").trim(),
            bookingPerson: String(row[headerMap["Booking Person"]] || "").trim(),
            inwardDate: undefined,
            inwardAmount: undefined,
            buyer: String(row[headerMap["Buyer"]] || "").trim(),
            outwardDate: undefined,
            outwardAmount: undefined,
          };

          // Handle Inward Date
          const inwardDateValue = row[headerMap["Inward Date"]];
          if (typeof inwardDateValue === 'number') {
            entry.inwardDate = excelDateToJSDate(inwardDateValue);
          } else if (typeof inwardDateValue === 'string' && inwardDateValue.trim() !== '') {
            const parsedDate = new Date(inwardDateValue);
            entry.inwardDate = isNaN(parsedDate.getTime()) ? undefined : parsedDate;
          }

          // Handle Inward Amount
          const inwardAmountValue = row[headerMap["Inward Amount"]];
          if (typeof inwardAmountValue === 'number') {
            entry.inwardAmount = inwardAmountValue;
          } else if (typeof inwardAmountValue === 'string' && inwardAmountValue.trim() !== '') {
            const parsedAmount = parseFloat(inwardAmountValue);
            entry.inwardAmount = isNaN(parsedAmount) ? undefined : parsedAmount;
          }

          // Handle Outward Date
          const outwardDateValue = row[headerMap["Outward Date"]];
          if (typeof outwardDateValue === 'number') {
            entry.outwardDate = excelDateToJSDate(outwardDateValue);
          } else if (typeof outwardDateValue === 'string' && outwardDateValue.trim() !== '') {
            const parsedDate = new Date(outwardDateValue);
            entry.outwardDate = isNaN(parsedDate.getTime()) ? undefined : parsedDate;
          }

          // Handle Outward Amount
          const outwardAmountValue = row[headerMap["Outward Amount"]];
          if (typeof outwardAmountValue === 'number') {
            entry.outwardAmount = outwardAmountValue;
          } else if (typeof outwardAmountValue === 'string' && outwardAmountValue.trim() !== '') {
            const parsedAmount = parseFloat(outwardAmountValue);
            entry.outwardAmount = isNaN(parsedAmount) ? undefined : parsedAmount;
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