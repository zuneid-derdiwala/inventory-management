"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

const ConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "disconnected">("checking");
  const [dataCounts, setDataCounts] = useState<{
    brands: number;
    sellers: number;
    models: number;
    bookingPersons: number;
    entries: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const testConnection = async () => {
    setConnectionStatus("checking");
    setError(null);
    
    try {
      // Test basic connection
      const { data, error } = await supabase.from("brands").select("count", { count: "exact" });
      
      if (error) {
        throw error;
      }
      
      setConnectionStatus("connected");
      
      // Get data counts
      const [brandsRes, sellersRes, modelsRes, bookingPersonsRes, entriesRes] = await Promise.all([
        supabase.from("brands").select("count", { count: "exact" }),
        supabase.from("sellers").select("count", { count: "exact" }),
        supabase.from("models").select("count", { count: "exact" }),
        supabase.from("booking_persons").select("count", { count: "exact" }),
        supabase.from("entries").select("count", { count: "exact" })
      ]);
      
      setDataCounts({
        brands: brandsRes.count || 0,
        sellers: sellersRes.count || 0,
        models: modelsRes.count || 0,
        bookingPersons: bookingPersonsRes.count || 0,
        entries: entriesRes.count || 0
      });
      
    } catch (err: any) {
      setConnectionStatus("disconnected");
      setError(err.message);
    }
  };

  useEffect(() => {
    if (user) {
      testConnection();
    }
  }, [user]);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Database Connection Test
          <Badge variant={connectionStatus === "connected" ? "default" : connectionStatus === "disconnected" ? "destructive" : "secondary"}>
            {connectionStatus === "checking" ? "Checking..." : connectionStatus === "connected" ? "Connected" : "Disconnected"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}
        
        {connectionStatus === "connected" && dataCounts && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-3 bg-green-50 rounded-md">
              <div className="text-2xl font-bold text-green-600">{dataCounts.brands}</div>
              <div className="text-sm text-green-600">Brands</div>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-md">
              <div className="text-2xl font-bold text-blue-600">{dataCounts.sellers}</div>
              <div className="text-sm text-blue-600">Sellers</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-md">
              <div className="text-2xl font-bold text-purple-600">{dataCounts.models}</div>
              <div className="text-sm text-purple-600">Models</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-md">
              <div className="text-2xl font-bold text-orange-600">{dataCounts.bookingPersons}</div>
              <div className="text-sm text-orange-600">Booking Persons</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-md">
              <div className="text-2xl font-bold text-gray-600">{dataCounts.entries}</div>
              <div className="text-sm text-gray-600">Entries</div>
            </div>
          </div>
        )}
        
        <div className="flex gap-2">
          <Button onClick={testConnection} variant="outline">
            Test Connection
          </Button>
          {connectionStatus === "disconnected" && (
            <Button onClick={() => window.open("/SUPABASE_SETUP.md", "_blank")} variant="secondary">
              View Setup Guide
            </Button>
          )}
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p><strong>User:</strong> {user ? "Authenticated" : "Not authenticated"}</p>
          <p><strong>Supabase URL:</strong> {(supabase as any).url}</p>
          <p><strong>Environment:</strong> {import.meta.env.MODE}</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default ConnectionTest;
