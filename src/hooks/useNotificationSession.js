import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function useNotificationSession(error) {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!error?.authExpired) return;
    logout();
    queryClient.clear();
    navigate("/login", {
      replace: true,
      state: { from: `${location.pathname}${location.search}`, message: error.message },
    });
  }, [error, logout, queryClient, navigate, location.pathname, location.search]);
}
