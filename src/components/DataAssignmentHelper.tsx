"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/utils/toast";
import { Database, Users, AlertTriangle } from "lucide-react";

const DataAssignmentHelper = () => {
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignmentStatus, setAssignmentStatus] = useState<{
    brands: number;
    sellers: number;
    models: number;
    bookingPersons: number;
    entries: number;
  } | null>(null);
  const { user } = useAuth();

  const assignDataToUser = async () => {
    if (!user) {
      showError("You must be logged in to assign data.");
      return;
    }

    setIsAssigning(true);
    setAssignmentStatus(null);

    try {
      // Call the Supabase function to assign null data to the current user
      const { data, error } = await supabase.rpc('assign_null_data_to_first_app_user');

      if (error) {
        throw error;
      }

      // Get updated counts
      const [brandsRes, sellersRes, modelsRes, bookingPersonsRes, entriesRes] = await Promise.all([
        supabase.from("brands").select("count", { count: "exact" }),
        supabase.from("sellers").select("count", { count: "exact" }),
        supabase.from("models").select("count", { count: "exact" }),
        supabase.from("booking_persons").select("count", { count: "exact" }),
        supabase.from("entries").select("count", { count: "exact" })
      ]);

      setAssignmentStatus({
        brands: brandsRes.count || 0,
        sellers: sellersRes.count || 0,
        models: modelsRes.count || 0,
        bookingPersons: bookingPersonsRes.count || 0,
        entries: entriesRes.count || 0
      });

      showSuccess("Data successfully assigned to your account! Please refresh the page.");
      
    } catch (error: any) {
      console.error("Error assigning data:", error);
      showError(`Failed to assign data: ${error.message}`);
    } finally {
      setIsAssigning(false);
    }
  };

  const checkUnassignedData = async () => {
    try {
      // Check for data without user_id
      const [brandsRes, sellersRes, modelsRes, bookingPersonsRes, entriesRes] = await Promise.all([
        supabase.from("brands").select("count", { count: "exact" }).is("user_id", null),
        supabase.from("sellers").select("count", { count: "exact" }).is("user_id", null),
        supabase.from("models").select("count", { count: "exact" }).is("user_id", null),
        supabase.from("booking_persons").select("count", { count: "exact" }).is("user_id", null),
        supabase.from("entries").select("count", { count: "exact" }).is("user_id", null)
      ]);

      const unassignedCount = 
        (brandsRes.count || 0) + 
        (sellersRes.count || 0) + 
        (modelsRes.count || 0) + 
        (bookingPersonsRes.count || 0) + 
        (entriesRes.count || 0);

      if (unassignedCount > 0) {
        showSuccess(`Found ${unassignedCount} unassigned records. You can assign them to your account.`);
      } else {
        showError("No unassigned data found. All data may already be assigned to users.");
      }
    } catch (error: any) {
      console.error("Error checking unassigned data:", error);
      showError(`Failed to check data: ${error.message}`);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Assignment Helper
          <Badge variant="outline">RLS Issue</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Issue:</strong> Your database has Row Level Security (RLS) enabled. This means you can only see data that belongs to your user account. The data you see in the Supabase dashboard may not be assigned to your current user.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            <strong>Solution:</strong> Assign existing data to your user account using the function below.
          </p>
          <p className="text-sm text-muted-foreground">
            <strong>User ID:</strong> {user?.id || "Not authenticated"}
          </p>
        </div>

        {assignmentStatus && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-green-50 rounded-md">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignmentStatus.brands}</div>
              <div className="text-sm text-green-600">Brands</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignmentStatus.sellers}</div>
              <div className="text-sm text-green-600">Sellers</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignmentStatus.models}</div>
              <div className="text-sm text-green-600">Models</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignmentStatus.bookingPersons}</div>
              <div className="text-sm text-green-600">Booking Persons</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{assignmentStatus.entries}</div>
              <div className="text-sm text-green-600">Entries</div>
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button 
            onClick={assignDataToUser} 
            disabled={isAssigning || !user}
            className="flex-1"
          >
            {isAssigning ? "Assigning..." : "Assign Data to My Account"}
          </Button>
          <Button 
            onClick={checkUnassignedData} 
            variant="outline"
            disabled={!user}
          >
            Check Unassigned Data
          </Button>
        </div>

        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>What this does:</strong> Assigns all data without a user_id to your current account.</p>
          <p><strong>Note:</strong> This should only be run once. After assignment, the data will be visible in your app.</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataAssignmentHelper;
