"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Database } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { showSuccess, showError } from "@/utils/toast";

const AssignData = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { user } = useAuth();

  const assignExistingData = async () => {
    if (!user) {
      showError("You must be logged in to assign data.");
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('assign_null_data_to_first_app_user');
      
      if (error) {
        console.error("Error assigning data:", error);
        showError(`Failed to assign data: ${error.message}`);
      } else {
        showSuccess("All existing data has been assigned to your account!");
        setIsCompleted(true);
      }
    } catch (error) {
      console.error("Error:", error);
      showError("An unexpected error occurred while assigning data.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-green-600">Data Assigned Successfully!</CardTitle>
            <CardDescription>
              All existing data has been assigned to your account. You can now see your inventory data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Database className="h-4 w-4" />
              <AlertDescription>
                Your existing inventory data is now linked to your account. You can access it from the main dashboard.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Assign Existing Data</CardTitle>
          <CardDescription>
            If you have existing inventory data without a user account, you can assign it to your current account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Database className="h-4 w-4" />
            <AlertDescription>
              This will assign all existing data (entries, brands, models, sellers, booking persons) 
              that don't have a user_id to your current account.
            </AlertDescription>
          </Alert>
          
          <Button 
            onClick={assignExistingData} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Assigning data...
              </>
            ) : (
              <>
                <Database className="mr-2 h-4 w-4" />
                Assign Data to My Account
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default AssignData;
