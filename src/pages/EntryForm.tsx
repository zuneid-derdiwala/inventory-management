"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, QrCode, ChevronDown, ArrowLeft } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { showSuccess, showError } from "@/utils/toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useData, EntryData } from "@/context/DataContext";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import QrScanner from "@/components/QrScanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";
import ConnectionTest from "@/components/ConnectionTest";
import DataAssignmentHelper from "@/components/DataAssignmentHelper";

const initialFormData: EntryData = {
  imei: "",
  brand: "",
  model: "",
  seller: "",
  bookingPerson: "",
  inwardDate: undefined,
  inwardAmount: undefined,
  buyer: "",
  outwardDate: undefined,
  outwardAmount: undefined,
};

const EntryForm = () => {
  const { addEntry, searchEntry, updateEntry, deleteEntry, availableBrands, getModelsByBrand, availableSellers, availableBookingPersons, isLoadingData } = useData(); // Added isLoadingData
  const [formData, setFormData] = useState<EntryData>(initialFormData);
  const [isUpdateDeleteEnabled, setIsUpdateDeleteEnabled] = useState(false);
  const [isDeviceInfoOpen, setIsDeviceInfoOpen] = useState(true);
  const [isInwardOpen, setIsInwardOpen] = useState(true);
  const [isOutwardOpen, setIsOutwardOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    const imeiFromUrl = searchParams.get("imei");
    if (imeiFromUrl) {
      setFormData((prev) => ({ ...prev, imei: imeiFromUrl }));
      handleSearch(imeiFromUrl);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    // Attempt to parse the value to a float, if it's not a valid number, it will be undefined
    setFormData((prev) => ({ ...prev, [id]: parseFloat(value) || undefined }));
  };

  const handleDateChange = (date: Date | undefined, field: keyof EntryData) => {
    setFormData((prev) => ({ ...prev, [field]: date }));
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setIsUpdateDeleteEnabled(false);
    setIsDeviceInfoOpen(true);
    setIsInwardOpen(true);
    setIsOutwardOpen(false);
    setIsScanning(false);
    setShowManualInput(false);
    showSuccess("Form has been reset.");
  };

  const handleAddEntry = async () => {
    const success = await addEntry(formData);
    if (success) {
      resetForm();
    }
  };

  const handleSearch = async (imeiToSearch?: string) => {
    const imei = imeiToSearch || formData.imei;
    if (!imei) {
      showError("IMEI is required to search.");
      return;
    }
    const foundEntry = await searchEntry(imei);
    if (foundEntry) {
      setFormData(foundEntry);
      setIsUpdateDeleteEnabled(true);
      setIsDeviceInfoOpen(true);
      setIsInwardOpen(true);
      if (foundEntry.buyer || foundEntry.outwardDate || foundEntry.outwardAmount) {
        setIsOutwardOpen(true);
      } else {
        setIsOutwardOpen(false);
      }
    } else {
      setIsUpdateDeleteEnabled(false);
      setFormData((prev) => ({ ...initialFormData, imei: prev.imei }));
    }
  };

  const handleUpdate = async () => {
    const success = await updateEntry(formData);
    if (success) {
      resetForm();
    }
  };

  const handleDelete = async () => {
    const success = await deleteEntry(formData.imei);
    if (success) {
      resetForm();
    }
  };

  const handleScanSuccess = (decodedText: string) => {
    console.log("QR Code scanned successfully:", decodedText);
    showSuccess(`IMEI scanned: ${decodedText}`);
    setIsScanning(false);
    setFormData((prev) => ({ ...prev, imei: decodedText }));
    // Automatically search for the scanned IMEI
    handleSearch(decodedText);
  };

  const handleScanError = (errorMessage: string) => {
    console.error("QR Scan Error:", errorMessage);
    // Only show error for critical issues, not for normal scanning attempts
    if (errorMessage.includes("Permission denied") || 
        errorMessage.includes("No cameras found") ||
        errorMessage.includes("NotAllowedError")) {
      showError("Camera access issue: " + errorMessage);
    }
  };

  const handleBrandSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, brand: value, model: "" })); // Reset model when brand changes
  };

  const handleSellerSelectChange = (value: string) => {
    setFormData((prev) => ({ ...prev, seller: value }));
  };

  const handleBookingPersonSelectChange = (value: string) => { // New handler for booking person
    setFormData((prev) => ({ ...prev, bookingPerson: value }));
  };

  const modelsForSelectedBrand = getModelsByBrand(formData.brand || "");

  // Check if we have any data available
  const hasNoData = !isLoadingData && 
    availableBrands.length === 0 && 
    availableSellers.length === 0 && 
    availableBookingPersons.length === 0;

  if (isLoadingData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center uppercase">ENTRY FORM</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-10 w-full" />
            <div className="flex gap-2 mt-6 justify-end">
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
              <Skeleton className="h-10 w-20" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-center uppercase text-lg sm:text-xl">ENTRY FORM</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:gap-6 p-4 sm:p-6">
          {/* Info banner when no data is available */}
          {hasNoData && (
            <div className="space-y-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  No data found in your database. You can still use the form, but you'll need to add brands, models, sellers, and booking persons in the Manage Data page first.
                </AlertDescription>
              </Alert>
              <ConnectionTest />
              <DataAssignmentHelper />
            </div>
          )}
          
          {/* Device Information */}
          <Collapsible open={isDeviceInfoOpen} onOpenChange={setIsDeviceInfoOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-2 text-lg sm:text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180 touch-manipulation">
              <h3>Device Information</h3>
              <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 sm:p-6">
              <div className="grid gap-2">
                <Label htmlFor="imei">IMEI (Main Input)</Label>
                <div className="flex gap-2">
                  <Input
                    id="imei"
                    value={formData.imei}
                    onChange={handleChange}
                    placeholder="Enter IMEI"
                    className="flex-grow"
                    disabled={isScanning}
                  />
                  {!isScanning ? (
                    <Button onClick={() => setIsScanning(true)} variant="outline" size="icon">
                      <QrCode className="h-4 w-4" />
                      <span className="sr-only">Scan QR</span>
                    </Button>
                  ) : (
                    <Button onClick={() => setIsScanning(false)} variant="outline" size="icon">
                      <ArrowLeft className="h-4 w-4" />
                      <span className="sr-only">Stop Scan</span>
                    </Button>
                  )}
                </div>
                {isScanning && (
                  <div className="mt-2 p-4 border rounded-md bg-gray-50 dark:bg-gray-800">
                    <div className="flex items-center gap-2 mb-3">
                      <QrCode className="h-4 w-4 text-primary" />
                      <p className="text-sm font-medium">QR Code Scanner</p>
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">
                      Position the QR code within the camera view to scan the IMEI.
                    </p>
                    <div className="w-full min-h-[300px] flex items-center justify-center">
                      <QrScanner
                        qrCodeContainerId="qr-code-entry-form"
                        onScanSuccess={handleScanSuccess}
                        onScanError={handleScanError}
                      />
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowManualInput(!showManualInput)}
                      >
                        {showManualInput ? "Hide" : "Show"} Manual Input
                      </Button>
                    </div>
                    {showManualInput && (
                      <div className="mt-3 p-3 border rounded-md bg-blue-50 dark:bg-blue-900/20">
                        <p className="text-sm font-medium mb-2">Manual IMEI Input:</p>
                        <div className="flex gap-2">
                          <Input
                            placeholder="Enter IMEI manually"
                            value={formData.imei}
                            onChange={handleChange}
                            id="imei"
                          />
                          <Button
                            size="sm"
                            onClick={() => {
                              if (formData.imei) {
                                handleSearch(formData.imei);
                                setShowManualInput(false);
                              }
                            }}
                          >
                            Search
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="mt-3 text-xs text-muted-foreground">
                      <p>💡 Tips:</p>
                      <ul className="list-disc list-inside space-y-1 mt-1">
                        <li>Ensure good lighting</li>
                        <li>Hold the QR code steady</li>
                        <li>Make sure the QR code is clearly visible</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="brand">Brand</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.brand}
                      onValueChange={handleBrandSelectChange}
                    >
                      <SelectTrigger className="flex-grow">
                        <SelectValue placeholder="Select a brand" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableBrands.length > 0 ? (
                          availableBrands.map((brand) => (
                            <SelectItem key={brand} value={brand}>
                              {brand}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-2 px-3 text-sm text-muted-foreground">No brands available. Add one in Manage page.</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <div className="flex gap-2">
                    <Select
                      value={formData.model}
                      onValueChange={(value) => setFormData((prev) => ({ ...prev, model: value }))}
                      disabled={!formData.brand}
                    >
                      <SelectTrigger className="flex-grow">
                        <SelectValue placeholder={formData.brand ? "Select a model" : "Select a brand first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {modelsForSelectedBrand.length > 0 ? (
                          modelsForSelectedBrand.map((model) => (
                            <SelectItem key={model} value={model}>
                              {model}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="py-2 px-3 text-sm text-muted-foreground">
                            {formData.brand ? "No models available for this brand" : "Select a brand first"}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Inward Information */}
          <Collapsible open={isInwardOpen} onOpenChange={setIsInwardOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Inward Information</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="seller">Seller</Label>
                  <Select
                    value={formData.seller}
                    onValueChange={handleSellerSelectChange}
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select a seller" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableSellers.length > 0 ? (
                        availableSellers.map((seller) => (
                          <SelectItem key={seller} value={seller}>
                            {seller}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No sellers available. Add one in Manage page.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="bookingPerson">Booking Person</Label>
                  <Select
                    value={formData.bookingPerson}
                    onValueChange={handleBookingPersonSelectChange} // Use new handler
                  >
                    <SelectTrigger className="flex-grow">
                      <SelectValue placeholder="Select a booking person" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBookingPersons.length > 0 ? (
                        availableBookingPersons.map((person) => (
                          <SelectItem key={person} value={person}>
                            {person}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="py-2 px-3 text-sm text-muted-foreground">No booking persons available. Add one in Manage page.</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="inwardDate">Inward Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.inwardDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.inwardDate ? format(formData.inwardDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.inwardDate}
                        onSelect={(date) => handleDateChange(date, "inwardDate")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="inwardAmount">Inward Amount (₹)</Label>
                  {/* Changed to text */}
                  <Input
                    id="inwardAmount"
                    type="text"
                    value={formData.inwardAmount === undefined ? "" : formData.inwardAmount}
                    onChange={handleAmountChange}
                    placeholder="Enter Amount"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Outward Information */}
          <Collapsible open={isOutwardOpen} onOpenChange={setIsOutwardOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Outward Information</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4">
              <div className="grid gap-2">
                <Label htmlFor="buyer">Buyer</Label>
                <Input
                  id="buyer"
                  value={formData.buyer}
                  onChange={handleChange}
                  placeholder="Enter Buyer Name"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="outwardDate">Outward Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !formData.outwardDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.outwardDate ? format(formData.outwardDate, "dd/MM/yyyy") : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={formData.outwardDate}
                        onSelect={(date) => handleDateChange(date, "outwardDate")}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="outwardAmount">Outward Amount (₹)</Label>
                  {/* Changed to text */}
                  <Input
                    id="outwardAmount"
                    type="text"
                    value={formData.outwardAmount === undefined ? "" : formData.outwardAmount}
                    onChange={handleAmountChange}
                    placeholder="Enter Amount"
                  />
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 mt-6 justify-end">
            <Button onClick={handleAddEntry}>ADD</Button>
            <Button variant="outline" onClick={resetForm}>RESET</Button>
            <Button onClick={() => handleSearch()}>SEARCH</Button>
            <Button onClick={handleUpdate} disabled={!isUpdateDeleteEnabled}>UPDATE</Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={!isUpdateDeleteEnabled}>DELETE</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the entry.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EntryForm;