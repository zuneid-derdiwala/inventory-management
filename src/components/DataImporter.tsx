"use client";

import React, { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Keep Input for ref, but it will be hidden
import { Label } from "@/components/ui/label";
import { Upload } from "lucide-react";
import { useData } from "@/context/DataContext";
import { readExcelFile } from "@/utils/excelUtils";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const DataImporter: React.FC = () => {
  const { bulkAddEntries, isResetting } = useData(); // Consume isResetting
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          file.type === "application/vnd.ms-excel" ||
          file.type === "text/csv") {
        setSelectedFile(file);
        setIsConfirmDialogOpen(true); // Open confirmation dialog
      } else {
        showError("Invalid file type. Please upload an Excel (.xlsx, .xls) or CSV (.csv) file.");
        setSelectedFile(null);
      }
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      showError("Please select a file to import.");
      return;
    }

    const loadingToastId = showLoading("Importing data...");
    try {
      const importedData = await readExcelFile(selectedFile);
      if (importedData.length > 0) {
        await bulkAddEntries(importedData);
        // showSuccess is now handled by bulkAddEntries
      } else {
        showError("No valid entries found in the file to import.");
      }
    } catch (error) {
      console.error("Import failed:", error);
      showError("Failed to import data. Check console for details.");
    } finally {
      dismissToast(loadingToastId);
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = ""; // Clear the file input
      }
      setIsConfirmDialogOpen(false);
    }
  };

  return (
    <>
      <div className="grid gap-2">
        <Input
          id="data-import-file-input"
          type="file"
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="hidden" // Hide the file input
        />
        <Button onClick={() => fileInputRef.current?.click()} id="data-import-button" disabled={isResetting}>
          <Upload className="h-4 w-4 mr-2" /> Import Data
        </Button>
      </div>

      <AlertDialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Data Import</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to import data from "{selectedFile?.name}"?
              Existing entries with matching IMEIs will be skipped.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setSelectedFile(null);
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
              }
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleImport}>Import</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default DataImporter;