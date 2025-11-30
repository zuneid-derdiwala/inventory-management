"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit, Trash2, UserPlus } from "lucide-react";
import { useBookingPersons } from "@/hooks/use-booking-persons";
import { Skeleton } from "@/components/ui/skeleton";

const ManageBookingPersonsPage = () => {
  const {
    availableBookingPersons,
    addBookingPerson,
    updateBookingPerson,
    deleteBookingPerson,
    isLoading,
    fetchBookingPersons,
  } = useBookingPersons();

  const [newBookingPersonName, setNewBookingPersonName] = useState("");
  const [editBookingPersonName, setEditBookingPersonName] = useState("");
  const [bookingPersonToEdit, setBookingPersonToEdit] = useState<string | null>(null);

  // Track page navigation
  useEffect(() => {
    localStorage.setItem('lastVisitedPage', 'manage-booking-persons');
  }, []);

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

  const handleDeleteBookingPerson = async (personId: string) => {
    await deleteBookingPerson(personId);
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
        <Card className="col-span-full">
          <CardHeader>
            <CardTitle className="text-center uppercase">Manage Booking Persons</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-6">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
      <Card className="col-span-full">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-center uppercase text-lg sm:text-xl">Manage Booking Persons</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:gap-6 p-4 sm:p-6">
          {/* Add Booking Person Section */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="newBookingPersonName"
              value={newBookingPersonName}
              onChange={(e) => setNewBookingPersonName(e.target.value)}
              placeholder="New Booking Person Name"
              className="flex-grow text-sm sm:text-base"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newBookingPersonName.trim()) {
                  handleAddBookingPerson();
                }
              }}
            />
            <Button 
              onClick={handleAddBookingPerson} 
              disabled={!newBookingPersonName.trim()} 
              className="w-full sm:w-auto px-4 py-2 touch-manipulation"
            >
              <PlusCircle className="h-4 w-4 mr-2" /> Add Booking Person
            </Button>
          </div>

          {/* Existing Booking Persons List */}
          <div className="mt-4">
            <h4 className="text-base sm:text-lg font-medium mb-3">Existing Booking Persons:</h4>
            {availableBookingPersons.length > 0 ? (
              <ul className="grid gap-3">
                {availableBookingPersons.map((person) => (
                  <li key={person.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 sm:p-4 border rounded-lg gap-3">
                    <span className="font-medium text-sm sm:text-base">{person.name}</span>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <AlertDialog open={bookingPersonToEdit === person.id} onOpenChange={(open) => {
                        if (!open) {
                          setBookingPersonToEdit(null);
                          setEditBookingPersonName("");
                        }
                      }}>
                        <AlertDialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="icon" 
                            onClick={() => {
                              setBookingPersonToEdit(person.id);
                              setEditBookingPersonName(person.name);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Booking Person</span>
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Edit Booking Person Name</AlertDialogTitle>
                            <AlertDialogDescription>
                              Enter the new name for the booking person '{person.name}'.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <Input
                            id="editBookingPersonName"
                            value={editBookingPersonName}
                            onChange={(e) => setEditBookingPersonName(e.target.value)}
                            placeholder="New Booking Person Name"
                            className="mt-4"
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && editBookingPersonName.trim()) {
                                handleUpdateBookingPerson();
                              }
                            }}
                          />
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleUpdateBookingPerson} disabled={!editBookingPersonName.trim()}>
                              Update
                            </AlertDialogAction>
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
                              This action cannot be undone. This will permanently delete the booking person '{person.name}'.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDeleteBookingPerson(person.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed rounded-lg bg-muted/30">
                <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium text-muted-foreground mb-2">No booking person found</p>
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Get started by adding your first booking person using the form above.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManageBookingPersonsPage;

