import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor de requisições para anexar o token JWT
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('cobranca_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Interceptor de respostas para captura de 401 (expirado/não autorizado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Se não for a rota de login que deu 401, remove token e redireciona
      if (!error.config.url.includes('/auth/login')) {
        localStorage.removeItem('cobranca_token');
        localStorage.removeItem('cobranca_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
