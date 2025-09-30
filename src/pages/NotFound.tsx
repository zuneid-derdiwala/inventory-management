import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useData } from "@/context/DataContext"; // Import useData
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton

const NotFound = () => {
  const location = useLocation();
  const { isLoadingData } = useData(); // Get loading state

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname,
    );
  }, [location.pathname]);

  if (isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="text-center">
          <Skeleton className="h-10 w-32 mx-auto mb-4" />
          <Skeleton className="h-6 w-64 mx-auto mb-4" />
          <Skeleton className="h-8 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">404</h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">Oops! Page not found</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;