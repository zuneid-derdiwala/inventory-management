"use client";

import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useData } from "@/context/DataContext";
import { Skeleton } from "@/components/ui/skeleton";

const Index = () => {
  const { isLoadingData } = useData();

  if (isLoadingData) {
    return (
      <div className="flex flex-1 items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mx-auto mb-2" />
            <Skeleton className="h-6 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent className="grid gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-3xl font-bold">Welcome to Inventory Data</CardTitle>
          <CardDescription className="text-lg text-muted-foreground">
            Manage your Stock with ease.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Link to="/entry-form">
            <Button className="w-full">Go to Entry Form</Button>
          </Link>
          <Link to="/stock-data">
            <Button variant="outline" className="w-full">View Stock Data</Button>
          </Link>
          <Link to="/database">
            <Button variant="outline" className="w-full">Browse All Data</Button>
          </Link>
          <Link to="/manage-data">
            <Button variant="secondary" className="w-full">Manage Data</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default Index;