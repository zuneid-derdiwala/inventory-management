"use client";

import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";

/**
 * Handler page for Supabase password reset verify endpoint
 * This page processes the verify token and redirects to reset-password with hash fragments
 */
const HandlePasswordReset = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        const token = searchParams.get("token");
        const type = searchParams.get("type");
        const redirectTo = searchParams.get("redirect_to") || window.location.origin;

        console.log("HandlePasswordReset - Processing verify request:", { token: token?.substring(0, 20) + "...", type, redirectTo });

        // If this is a password recovery verify request
        if (type === "recovery" && token) {
          // Verify the token using verifyOtp
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: token,
            type: "recovery",
          });

          if (error) {
            console.error("Error verifying password reset token:", error);
            // Redirect to forgot password page with error
            navigate("/forgot-password?error=invalid_token");
            return;
          }

          if (data?.session) {
            console.log("Password reset token verified, session created");
            // Get the hash fragments from the session
            // Supabase will add hash fragments after verification
            // Wait a moment for the hash to be added, then redirect
            setTimeout(() => {
              const hash = window.location.hash;
              if (hash) {
                // Redirect to reset-password with hash fragments
                navigate(`/reset-password${hash}`, { replace: true });
              } else {
                // If no hash, try to get session and redirect
                navigate("/reset-password", { replace: true });
              }
            }, 100);
          } else {
            console.error("No session created after token verification");
            navigate("/forgot-password?error=verification_failed");
          }
        } else {
          // Not a password recovery request, redirect to home
          navigate("/", { replace: true });
        }
      } catch (error) {
        console.error("Error handling password reset:", error);
        navigate("/forgot-password?error=unexpected_error");
      }
    };

    handlePasswordReset();
  }, [navigate, searchParams]);

  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <div className="text-center">
        <p>Processing password reset...</p>
      </div>
    </div>
  );
};

export default HandlePasswordReset;

