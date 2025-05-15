import axios, { AxiosInstance, AxiosError, AxiosResponse } from 'axios';
export default class Api {
    private readonly axiosInstance: AxiosInstance;
    private readonly setAxiosHeaderContentType: (contentType: string) => void;
    private readonly defaultContentType: string = 'application/json';
    private readonly mergePatchContentType: string = 'application/merge-patch+json';

    // Configured using UI5 middleware, see webapp/ui5.yaml and /env
    private readonly baseURL: string = 'UI5_MIDDLEWARE_ENV_API_BASE_URL';


    constructor(tenantId: string) {
        this.axiosInstance = axios.create({
            baseURL: this.baseURL,
            headers: {
                'Content-Type': 'application/json',
                'X-Tenant': tenantId
            },
        });
        this.setAxiosHeaderContentType = (contentType) => {
            this.axiosInstance.defaults.headers['Content-Type'] = contentType;
        };

    }

    public async get<T>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
        this.setAxiosHeaderContentType(this.defaultContentType);
        try {
            const response: AxiosResponse<T> = await this.axiosInstance.get(endpoint, { params: { ...params, $count: true } });
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
        this.setAxiosHeaderContentType(this.defaultContentType);
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
        this.setAxiosHeaderContentType(this.defaultContentType);
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
        this.setAxiosHeaderContentType(this.mergePatchContentType);
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
        this.setAxiosHeaderContentType(this.defaultContentType);
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