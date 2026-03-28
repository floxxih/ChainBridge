import { useState, useEffect } from "react";
import axios from "axios";
import config from "@/lib/config";

export function useAuth() {
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      // In a real app, this would be triggered by wallet connection or login
      // Or retrieved from a secure storage/cookie
      const savedToken = localStorage.getItem("cb_access_token");
      if (savedToken) {
        setToken(savedToken);
        return;
      }

      // If no token, we might need to exchange an API key
      const apiKey = localStorage.getItem("cb_api_key");
      if (!apiKey) return;

      setIsLoading(true);
      try {
        const response = await axios.post(
          `${config.api.url}/api/v1/auth/token`,
          {},
          {
            headers: { "X-API-Key": apiKey },
          }
        );
        const { access_token } = response.data;
        setToken(access_token);
        localStorage.setItem("cb_access_token", access_token);
      } catch (err: any) {
        setError(err.message || "Failed to fetch token");
      } finally {
        setIsLoading(false);
      }
    };

    fetchToken();
  }, []);

  return { token, isLoading, error };
}
