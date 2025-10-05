"use client";

import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { useData } from "@/context/DataContext";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, Search } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";
import { Separator } from "@/components/ui/separator"; // Import Separator
import DataImporter from "@/components/DataImporter"; // Import DataImporter
import DataExporter from "@/components/DataExporter"; // Import DataExporter
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const Database = () => {
  const { database, deleteEntry, availableBrands, availableModels, availableBookingPersons, isLoadingData } = useData();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  // States for input fields
  const [searchQuery1, setSearchQuery1] = useState("");
  const [searchQuery2, setSearchQuery2] = useState("");
  const [searchQuery3, setSearchQuery3] = useState("");

  // States for active search queries (used for filtering after button click)
  const [activeSearchQuery1, setActiveSearchQuery1] = useState("");
  const [activeSearchQuery2, setActiveSearchQuery2] = useState("");
  const [activeSearchQuery3, setActiveSearchQuery3] = useState("");

  // States for popover open/close
  const [open1, setOpen1] = useState(false);
  const [open2, setOpen2] = useState(false);
  const [open3, setOpen3] = useState(false);


  const handleSearch = () => {
    setActiveSearchQuery1(searchQuery1);
    setActiveSearchQuery2(searchQuery2);
    setActiveSearchQuery3(searchQuery3);
  };

  const filteredData = database.filter(entry => {
    const q1 = activeSearchQuery1.toLowerCase();
    const q2 = activeSearchQuery2.toLowerCase();
    const q3 = activeSearchQuery3.toLowerCase();

    const matchesQ1 = q1 === "" ||
      entry.imei.toLowerCase().includes(q1) ||
      (entry.inwardDate && format(entry.inwardDate, "dd/MM/yyyy").toLowerCase().includes(q1)) ||
      (entry.outwardDate && format(entry.outwardDate, "dd/MM/yyyy").toLowerCase().includes(q1));

    const matchesQ2 = q2 === "" ||
      (entry.brand && entry.brand.toLowerCase().includes(q2)) ||
      (entry.model && entry.model.toLowerCase().includes(q2));

    const matchesQ3 = q3 === "" ||
      (entry.bookingPerson && entry.bookingPerson.toLowerCase().includes(q3)) ||
      (entry.buyer && entry.buyer.toLowerCase().includes(q3));

    // An entry matches if it satisfies all non-empty search queries
    // If all queries are empty, all entries are shown.
    if (q1 === "" && q2 === "" && q3 === "") {
      return true;
    }

    return matchesQ1 && matchesQ2 && matchesQ3;
  });

  const handleEdit = (imei: string) => {
    navigate(`/entry-form?imei=${imei}`);
  };

  const handleDelete = async (imei: string) => {
    await deleteEntry(imei);
    // After deletion, re-apply the current active search to update the list
    handleSearch();
  };

  // --- Suggestion Generation ---

  const imeiDateSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    database.forEach(entry => {
      if (entry.imei) suggestions.add(entry.imei);
      if (entry.inwardDate) suggestions.add(format(entry.inwardDate, "dd/MM/yyyy"));
      if (entry.outwardDate) suggestions.add(format(entry.outwardDate, "dd/MM/yyyy"));
    });
    const query = searchQuery1.toLowerCase();
    return Array.from(suggestions).filter(s => s.toLowerCase().includes(query)).sort();
  }, [database, searchQuery1]);

  const brandModelSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    availableBrands.forEach(brand => suggestions.add(brand));
    Object.values(availableModels).flat().forEach(model => suggestions.add(model));
    const query = searchQuery2.toLowerCase();
    return Array.from(suggestions).filter(s => s.toLowerCase().includes(query)).sort();
  }, [availableBrands, availableModels, searchQuery2]);

  const bookingPersonBuyerSuggestions = useMemo(() => {
    const suggestions = new Set<string>();
    availableBookingPersons.forEach(person => suggestions.add(person));
    database.forEach(entry => {
      if (entry.buyer) suggestions.add(entry.buyer);
    });
    const query = searchQuery3.toLowerCase();
    return Array.from(suggestions).filter(s => s.toLowerCase().includes(query)).sort();
  }, [database, availableBookingPersons, searchQuery3]);

  if (isLoadingData) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="col-span-full">
          <CardHeader className="flex items-center justify-center space-y-0 pb-2">
            <CardTitle className="uppercase text-center">All Data Entries</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-full md:w-auto" />
            <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center">
              <Skeleton className="h-10 w-full sm:w-1/2" />
              <Skeleton className="h-10 w-full sm:w-1/2" />
            </div>
            <div className="mt-4 overflow-x-auto">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full mt-2" />
              <Skeleton className="h-12 w-full mt-2" />
              <Skeleton className="h-12 w-full mt-2" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Card className="col-span-full">
        <CardHeader className="flex items-center justify-center space-y-0 pb-2">
          <CardTitle className="uppercase text-center">All Data Entries</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="search1">Search by IMEI, Date</Label>
              <Popover open={open1} onOpenChange={setOpen1}>
                <PopoverTrigger asChild>
                  <Input
                    id="search1"
                    value={searchQuery1}
                    onChange={(e) => {
                      setSearchQuery1(e.target.value);
                      setOpen1(true);
                    }}
                    placeholder="Enter IMEI or Date (e.g., 01/01/2023)"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search suggestions..." value={searchQuery1} onValueChange={setSearchQuery1} />
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    <CommandGroup>
                      {imeiDateSuggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion}
                          onSelect={() => {
                            setSearchQuery1(suggestion);
                            setOpen1(false);
                          }}
                        >
                          {suggestion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search2">Search by Brand, Model</Label>
              <Popover open={open2} onOpenChange={setOpen2}>
                <PopoverTrigger asChild>
                  <Input
                    id="search2"
                    value={searchQuery2}
                    onChange={(e) => {
                      setSearchQuery2(e.target.value);
                      setOpen2(true);
                    }}
                    placeholder="Enter Brand or Model"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search suggestions..." value={searchQuery2} onValueChange={setSearchQuery2} />
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    <CommandGroup>
                      {brandModelSuggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion}
                          onSelect={() => {
                            setSearchQuery2(suggestion);
                            setOpen2(false);
                          }}
                        >
                          {suggestion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="search3">Search by Booking Person, Buyer</Label>
              <Popover open={open3} onOpenChange={setOpen3}>
                <PopoverTrigger asChild>
                  <Input
                    id="search3"
                    value={searchQuery3}
                    onChange={(e) => {
                      setSearchQuery3(e.target.value);
                      setOpen3(true);
                    }}
                    placeholder="Enter Booking Person or Buyer"
                  />
                </PopoverTrigger>
                <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
                  <Command>
                    <CommandInput placeholder="Search suggestions..." value={searchQuery3} onValueChange={setSearchQuery3} />
                    <CommandEmpty>No suggestions found.</CommandEmpty>
                    <CommandGroup>
                      {bookingPersonBuyerSuggestions.map((suggestion) => (
                        <CommandItem
                          key={suggestion}
                          onSelect={() => {
                            setSearchQuery3(suggestion);
                            setOpen3(false);
                          }}
                        >
                          {suggestion}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <Button onClick={handleSearch} className="w-full md:w-auto">
            <Search className="mr-2 h-4 w-4" /> Search
          </Button>

          {/* Data Import/Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 justify-center"> {/* Changed gap-2 to gap-4 */}
            <DataImporter />
            <DataExporter />
          </div>

          <div className="mt-4 overflow-x-auto">
            {filteredData.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IMEI</TableHead>
                    <TableHead>Brand</TableHead>
                    <TableHead>Model</TableHead>
                    <TableHead>Seller</TableHead>
                    <TableHead>Booking Person</TableHead>
                    <TableHead>Inward Date</TableHead>
                    <TableHead>Inward Amount</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>Outward Date</TableHead>
                    <TableHead>Outward Amount</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredData.map((entry, index) => (
                    <TableRow key={entry.imei || index}>
                      <TableCell className="font-medium">{entry.imei}</TableCell>
                      <TableCell>{entry.brand}</TableCell>
                      <TableCell>{entry.model}</TableCell>
                      <TableCell>{entry.seller}</TableCell>
                      <TableCell>{entry.bookingPerson}</TableCell>
                      <TableCell>{entry.inwardDate ? format(entry.inwardDate, "dd/MM/yyyy") : "N/A"}</TableCell>
                      <TableCell>{entry.inwardAmount ? `₹${entry.inwardAmount}` : "N/A"}</TableCell>
                      <TableCell>{entry.buyer || "N/A"}</TableCell>
                      <TableCell>{entry.outwardDate ? format(entry.outwardDate, "dd/MM/yyyy") : "N/A"}</TableCell>
                      <TableCell>{entry.outwardAmount ? `₹${entry.outwardAmount}` : "N/A"}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="icon" onClick={() => handleEdit(entry.imei)}>
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">Edit</span>
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="destructive" size="icon">
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the entry with IMEI: {entry.imei}.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(entry.imei)}>Delete</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-muted-foreground text-center py-4">No data entries found matching your search.</p>
            )}
          </div>

          <Separator className="my-6" />

          {/* Data Import/Export Section */}
          {/* Removed Collapsible wrapper as per previous request */}
          {/* <Collapsible open={isDataManagementOpen} onOpenChange={setIsDataManagementOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Data Import / Export</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 border rounded-md">
              <DataImporter />
              <DataExporter />
            </CollapsibleContent>
          </Collapsible> */}
        </CardContent>
      </Card>
    </div>
  );
};

export default Database;