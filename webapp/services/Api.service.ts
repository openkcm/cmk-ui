import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
export default class Api {
    private readonly axiosInstance: AxiosInstance;

    // Configured using UI5 middleware, see webapp/ui5.yaml and /env
    private readonly baseURL: string = 'UI5_MIDDLEWARE_ENV_API_BASE_URL';
    constructor() {
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    public async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params });
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError.status,
                message: apiError.statusText,
            }));
        }
    }

    public async post<T, R>(endpoint: string, data: T): Promise<R> {
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.post(endpoint, data);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError.status,
                message: apiError.statusText,
            }));
        }
    }

    public async put<T, R>(endpoint: string, data: T): Promise<R> {
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.put(endpoint, data);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError.status,
                message: apiError.statusText,
            }));
        }
    }

    public async patch<T, R>(endpoint: string, data: T): Promise<R> {
        try {
            const response: AxiosResponse<R> = await this.axiosInstance.patch(endpoint, data);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError.status,
                message: apiError.statusText,
            }));
        }
    }

    public async delete<T>(endpoint: string): Promise<T> {
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.delete(endpoint);
            return response.data;
        } catch (error) {
            const axiosError = error as AxiosError;
            const apiError = axiosError.response;

            throw new Error(JSON.stringify({
                error: apiError,
                status: apiError.status,
                message: apiError.statusText,
            }));
        }
    }
}