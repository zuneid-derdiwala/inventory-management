"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useData } from "@/context/DataContext";
import { exportToExcel } from "@/utils/excelUtils";
import { Label } from "@/components/ui/label";

const DataExporter: React.FC = () => {
  const { database } = useData();

  const handleExport = () => {
    exportToExcel(database, "inventory_data");
  };

  return (
    <div className="grid gap-2">
      <Button onClick={handleExport} id="data-export">
        <Download className="h-4 w-4 mr-2" /> Export Data
      </Button>
    </div>
  );
};

export default DataExporter;