import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL + "/api/v1",
  withCredentials: true,
});

export function setToken(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
  document.cookie = `access_token=${access}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
}

export function clearToken() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
  document.cookie = "access_token=; path=/; max-age=0";
}

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry || typeof window === "undefined") {
      return Promise.reject(error);
    }

    original._retry = true;

    try {
      if (!refreshing) {
        const refreshToken = localStorage.getItem("refresh_token");
        if (!refreshToken) throw new Error("no refresh token");

        refreshing = axios
          .post(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/auth/refresh`, null, {
            params: { refresh_token: refreshToken },
          })
          .then(({ data }) => {
            setToken(data.access_token, data.refresh_token);
            return data.access_token;
          })
          .finally(() => { refreshing = null; });
      }

      const newToken = await refreshing;
      original.headers.Authorization = `Bearer ${newToken}`;
      return api(original);
    } catch {
      clearToken();
      window.location.href = "/login";
      return Promise.reject(error);
    }
  }
);

export default api;
