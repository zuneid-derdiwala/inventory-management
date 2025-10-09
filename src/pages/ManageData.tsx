"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, ChevronDown } from "lucide-react";
import { useData } from "@/context/DataContext";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showError, showSuccess, showLoading, dismissToast } from "@/utils/toast"; // Import toast functions
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { supabase } from "@/lib/supabase"; // Import supabase client

const ManageDataPage = () => {
  const {
    availableBrands,
    addBrand,
    updateBrand,
    deleteBrand,
    getModelsByBrand,
    addModel,
    updateModel,
    deleteModel,
    availableSellers,
    addSeller,
    updateSeller,
    deleteSeller,
    availableBookingPersons,
    addBookingPerson,
    updateBookingPerson,
    deleteBookingPerson,
    resetAllData,
    isLoadingData,
    fetchEntries,
    fetchBrands,
    fetchModels,
    fetchSellers,
    fetchBookingPersons,
  } = useData();

  const [newBrandName, setNewBrandName] = useState("");
  const [editBrandName, setEditBrandName] = useState("");
  const [brandToEdit, setBrandToEdit] = useState<string | null>(null);

  const [selectedBrandForModels, setSelectedBrandForModels] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const [editModelName, setEditModelName] = useState("");
  const [modelToEdit, setModelToEdit] = useState<string | null>(null);

  const [newSellerName, setNewSellerName] = useState("");
  const [editSellerName, setEditSellerName] = useState("");
  const [sellerToEdit, setSellerToEdit] = useState<string | null>(null);

  const [newBookingPersonName, setNewBookingPersonName] = useState("");
  const [editBookingPersonName, setEditBookingPersonName] = useState("");
  const [bookingPersonToEdit, setBookingPersonToEdit] = useState<string | null>(null);

  const [isBrandsOpen, setIsBrandsOpen] = useState(true);
  const [isModelsOpen, setIsModelsOpen] = useState(true);
  const [isSellersOpen, setIsSellersOpen] = useState(true);
  const [isBookingPersonsOpen, setIsBookingPersonsOpen] = useState(true);

  const handleAddBrand = async () => {
    if (await addBrand(newBrandName)) {
      setNewBrandName("");
    }
  };

  const handleUpdateBrand = async () => {
    if (brandToEdit && await updateBrand(brandToEdit, editBrandName)) {
      setBrandToEdit(null);
      setEditBrandName("");
    }
  };

  const handleDeleteBrand = async (brand: string) => {
    await deleteBrand(brand);
    if (selectedBrandForModels === brand) {
      setSelectedBrandForModels(""); // Clear selected brand if deleted
    }
  };

  const handleAddModel = async () => {
    if (!selectedBrandForModels) {
      showError("Please select a brand first to add a model.");
      return;
    }
    if (await addModel(selectedBrandForModels, newModelName)) {
      setNewModelName("");
    }
  };

  const handleUpdateModel = async () => {
    if (selectedBrandForModels && modelToEdit && await updateModel(selectedBrandForModels, modelToEdit, editModelName)) {
      setModelToEdit(null);
      setEditModelName("");
    }
  };

  const handleDeleteModel = async (model: string) => {
    if (selectedBrandForModels) {
      await deleteModel(selectedBrandForModels, model);
    }
  };

  const handleAddSeller = async () => {
    if (await addSeller(newSellerName)) {
      setNewSellerName("");
    }
  };

  const handleUpdateSeller = async () => {
    if (sellerToEdit && await updateSeller(sellerToEdit, editSellerName)) {
      setSellerToEdit(null);
      setEditSellerName("");
    }
  };

  const handleDeleteSeller = async (seller: string) => {
    await deleteSeller(seller);
  };

  const handleAddBookingPerson = async () => {
    if (await addBookingPerson(newBookingPersonName)) {
      setNewBookingPersonName("");
    }
  };

  const handleUpdateBookingPerson = async () => {
    if (bookingPersonToEdit && await updateBookingPerson(bookingPersonToEdit, editBookingPersonName)) {
      setBookingPersonToEdit(null);
      setEditBookingPersonName("");
    }
  };

  const handleDeleteBookingPerson = async (person: string) => {
    await deleteBookingPerson(person);
  };

  // Removed handleAssignExistingData as it's no longer relevant without user_id
  // and the assign_null_data_to_first_app_user function.

  const modelsForSelectedBrand = selectedBrandForModels ? getModelsByBrand(selectedBrandForModels) : [];

  if (isLoadingData) {
    return (
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center uppercase">Manage Data</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Skeleton className="h-24 w-full" />
            <Separator className="my-6" />
            <Skeleton className="h-24 w-full" />
            <Separator className="my-6" />
            <Skeleton className="h-24 w-full" />
            <Separator className="my-6" />
            <Skeleton className="h-24 w-full" />
            <Separator className="my-6" />
            <Skeleton className="h-16 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card className="col-span-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-center uppercase text-lg sm:text-xl">Manage Data</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:gap-6 p-4 sm:p-6">
          {/* Manage Brands Section */}
          <Collapsible open={isBrandsOpen} onOpenChange={setIsBrandsOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-3 px-2 text-lg sm:text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180 touch-manipulation">
              <h3>Manage Brands</h3>
              <ChevronDown className="h-5 w-5 sm:h-6 sm:w-6 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 sm:p-6 border rounded-md">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input
                  id="newBrandName"
                  value={newBrandName}
                  onChange={(e) => setNewBrandName(e.target.value)}
                  placeholder="New Brand Name"
                  className="flex-grow text-sm sm:text-base"
                />
                <Button onClick={handleAddBrand} disabled={!newBrandName.trim()} className="w-full sm:w-auto px-4 py-2 touch-manipulation">
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Brand
                </Button>
              </div>

              <div className="mt-4">
                <h4 className="text-base sm:text-lg font-medium mb-3">Existing Brands:</h4>
                {availableBrands.length > 0 ? (
                  <ul className="grid gap-3">
                    {availableBrands.map((brand) => (
                      <li key={brand} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border rounded-lg gap-3">
                        <span className="font-medium text-sm sm:text-base">{brand}</span>
                        <div className="flex gap-2 w-full sm:w-auto">
                          <AlertDialog open={brandToEdit === brand} onOpenChange={(open) => {
                            if (!open) {
                              setBrandToEdit(null);
                              setEditBrandName("");
                            }
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => {
                                setBrandToEdit(brand);
                                setEditBrandName(brand);
                              }}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit Brand</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Brand Name</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Enter the new name for the brand '{brand}'.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                id="editBrandName"
                                value={editBrandName}
                                onChange={(e) => setEditBrandName(e.target.value)}
                                placeholder="New Brand Name"
                                className="mt-4"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleUpdateBrand} disabled={!editBrandName.trim()}>Update</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Brand</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the brand '{brand}' and all its associated models.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBrand(brand)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No brands added yet.</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Manage Models Section */}
          <Collapsible open={isModelsOpen} onOpenChange={setIsModelsOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Manage Models</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 border rounded-md">
              <div className="grid gap-2">
                <Label htmlFor="selectBrandForModels">Select Brand</Label>
                <Select
                  value={selectedBrandForModels}
                  onValueChange={setSelectedBrandForModels}
                >
                  <SelectTrigger id="selectBrandForModels">
                    <SelectValue placeholder="Select a brand to manage models" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableBrands.length > 0 ? (
                      availableBrands.map((brand) => (
                        <SelectItem key={brand} value={brand}>
                          {brand}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="py-2 px-3 text-sm text-muted-foreground">No brands available. Add a brand first.</div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {selectedBrandForModels && (
                <>
                  <div className="flex gap-2 mt-4">
                    <Input
                      id="newModelName"
                      value={newModelName}
                      onChange={(e) => setNewModelName(e.target.value)}
                      placeholder={`New Model for ${selectedBrandForModels}`}
                      className="flex-grow"
                    />
                    <Button onClick={handleAddModel} disabled={!newModelName.trim()}>
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Model
                    </Button>
                  </div>

                  <div className="mt-4">
                    <h4 className="text-lg font-medium mb-2">Models for {selectedBrandForModels}:</h4>
                    {modelsForSelectedBrand.length > 0 ? (
                      <ul className="grid gap-2">
                        {modelsForSelectedBrand.map((model) => (
                          <li key={model} className="flex justify-between items-center p-2 border rounded-md">
                            <span className="font-medium">{model}</span>
                            <div className="flex gap-2">
                              <AlertDialog open={modelToEdit === model} onOpenChange={(open) => {
                                if (!open) {
                                  setModelToEdit(null);
                                  setEditModelName("");
                                }
                              }}>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="icon" onClick={() => {
                                    setModelToEdit(model);
                                    setEditModelName(model);
                                  }}>
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Model</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Edit Model Name</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Enter the new name for the model '{model}' under brand '{selectedBrandForModels}'.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <Input
                                    id="editModelName"
                                    value={editModelName}
                                    onChange={(e) => setEditModelName(e.target.value)}
                                    placeholder="New Model Name"
                                    className="mt-4"
                                  />
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={handleUpdateModel} disabled={!editModelName.trim()}>Update</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>

                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="destructive" size="icon">
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Model</span>
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the model '{model}' from brand '{selectedBrandForModels}'.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeleteModel(model)}>Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground">No models added for this brand yet.</p>
                    )}
                  </div>
                </>
              )}
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Manage Sellers Section */}
          <Collapsible open={isSellersOpen} onOpenChange={setIsSellersOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Manage Sellers</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 border rounded-md">
              <div className="flex gap-2">
                <Input
                  id="newSellerName"
                  value={newSellerName}
                  onChange={(e) => setNewSellerName(e.target.value)}
                  placeholder="New Seller Name"
                  className="flex-grow"
                />
                <Button onClick={handleAddSeller} disabled={!newSellerName.trim()}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Seller
                </Button>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-medium mb-2">Existing Sellers:</h4>
                {availableSellers.length > 0 ? (
                  <ul className="grid gap-2">
                    {availableSellers.map((seller) => (
                      <li key={seller} className="flex justify-between items-center p-2 border rounded-md">
                        <span className="font-medium">{seller}</span>
                        <div className="flex gap-2">
                          <AlertDialog open={sellerToEdit === seller} onOpenChange={(open) => {
                            if (!open) {
                              setSellerToEdit(null);
                              setEditSellerName("");
                            }
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => {
                                setSellerToEdit(seller);
                                setEditSellerName(seller);
                              }}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit Seller</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Seller Name</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Enter the new name for the seller '{seller}'.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                id="editSellerName"
                                value={editSellerName}
                                onChange={(e) => setEditSellerName(e.target.value)}
                                placeholder="New Seller Name"
                                className="mt-4"
                              />
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleUpdateSeller} disabled={!editSellerName.trim()}>Update</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Seller</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the seller '{seller}'.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteSeller(seller)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No sellers added yet.</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Manage Booking Persons Section */}
          <Collapsible open={isBookingPersonsOpen} onOpenChange={setIsBookingPersonsOpen} className="w-full">
            <CollapsibleTrigger className="flex items-center justify-between w-full py-2 text-xl font-semibold mb-2 [&[data-state=open]>svg]:rotate-180">
              <h3>Manage Booking Persons</h3>
              <ChevronDown className="h-5 w-5 transition-transform duration-200" />
            </CollapsibleTrigger>
            <CollapsibleContent className="grid gap-4 p-4 border rounded-md">
              <div className="flex gap-2">
                <Input
                  id="newBookingPersonName"
                  value={newBookingPersonName}
                  onChange={(e) => setNewBookingPersonName(e.target.value)}
                  placeholder="New Booking Person Name"
                  className="flex-grow"
                />
                <Button onClick={handleAddBookingPerson} disabled={!newBookingPersonName.trim()}>
                  <PlusCircle className="h-4 w-4 mr-2" /> Add Booking Person
                </Button>
              </div>

              <div className="mt-4">
                <h4 className="text-lg font-medium mb-2">Existing Booking Persons:</h4>
                {availableBookingPersons.length > 0 ? (
                  <ul className="grid gap-2">
                    {availableBookingPersons.map((person) => (
                      <li key={person} className="flex justify-between items-center p-2 border rounded-md">
                        <span className="font-medium">{person}</span>
                        <div className="flex gap-2">
                          <AlertDialog open={bookingPersonToEdit === person} onOpenChange={(open) => {
                            if (!open) {
                              setBookingPersonToEdit(null);
                              setEditBookingPersonName("");
                            }
                          }}>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="icon" onClick={() => {
                                setBookingPersonToEdit(person);
                                setEditBookingPersonName(person);
                              }}>
                                <Edit className="h-4 w-4" />
                                <span className="sr-only">Edit Booking Person</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Edit Booking Person Name</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Enter the new name for the booking person '{person}'.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <Input
                                id="editBookingPersonName"
                                value={editBookingPersonName}
                                onChange={(e) => setEditBookingPersonName(e.target.value)}
                                placeholder="New Booking Person Name"
                                className="mt-4"
                              />
                               <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleUpdateBookingPerson} disabled={!editBookingPersonName.trim()}>Update</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Delete Booking Person</span>
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete the booking person '{person}'.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteBookingPerson(person)}>Delete</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground">No booking persons added yet.</p>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>

          <Separator className="my-6" />

          {/* Data Management Section (Only Reset All Data remains) */}
          <div className="w-full p-4 border rounded-md">
            <h3 className="text-xl font-semibold mb-4">Data Management</h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full">Reset All Data</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete ALL inventory data, brands, models, sellers, and booking persons.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={resetAllData}>Reset All</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageDataPage;