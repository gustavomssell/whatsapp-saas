import axios from "axios";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8090/api";

export const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  try {
    const raw = localStorage.getItem("wpsaas-auth");
    if (raw) {
      const parsed = JSON.parse(raw);
      const token = parsed?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch {}
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const raw = localStorage.getItem("wpsaas-auth");
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.state?.token;
          if (token) {
            const { data } = await axios.post(`${API_BASE}/auth/refresh`, {
              token,
            });
            if (data?.token) {
              const newState = { ...parsed, state: { ...parsed.state, token: data.token } };
              localStorage.setItem("wpsaas-auth", JSON.stringify(newState));
              originalRequest.headers.Authorization = `Bearer ${data.token}`;
              return apiClient(originalRequest);
            }
          }
        }
      } catch {
        localStorage.removeItem("wpsaas-auth");
        window.location.href = "/login";
      }
    }

    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "Erro desconhecido";
    return Promise.reject(new Error(message));
  }
);
