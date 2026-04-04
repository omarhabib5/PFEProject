import { Injectable, inject } from "@angular/core";
import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Observable } from "rxjs";

export interface UserDto {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
}

export interface CreateEmployeeRequest {
    firstName: string;
    lastName: string;
    email: string;
    role: number;
    serviceId?: number | null;
}

export interface UpdateUserRequest {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role: number;
}

@Injectable({
    providedIn: "root",
})
export class UserApiService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7219/api/user';
    private authApiUrl = 'https://localhost:7219/api/Auth';

    private isUsableToken(token: string | null): token is string {
        if (!token) {
            return false;
        }

        const normalized = token.trim().toLowerCase();
        return normalized !== '' && normalized !== 'undefined' && normalized !== 'null';
    }

    private resolveAuthToken(): string | null {
        const accessToken = localStorage.getItem('access_token');
        if (this.isUsableToken(accessToken)) {
            return accessToken;
        }

        const storedUser = localStorage.getItem('user_data');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser) as { accessToken?: string; token?: string };
                const userDataToken = parsed.accessToken ?? parsed.token ?? null;
                if (this.isUsableToken(userDataToken)) {
                    return userDataToken;
                }
            } catch {
               
            }
        }

        const legacyToken = localStorage.getItem('token');
        if (this.isUsableToken(legacyToken)) {
            return legacyToken;
        }

        return null;
    }

    private getAuthHeaders(): HttpHeaders {
        const token = this.resolveAuthToken();
        const headers: Record<string, string> = {
            'content-type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        return new HttpHeaders(headers);
    }

    getUsers(): Observable<UserDto[]> {
        return this.http.get<UserDto[]>(this.apiUrl);
    }

    getUserById(id: number): Observable<UserDto> {
        return this.http.get<UserDto>(`${this.apiUrl}/${id}`);
    }

     createEmployee(payload: CreateEmployeeRequest): Observable<any> {
        const requestBody: { firstName: string; lastName: string; email: string; role: number; serviceId?: number } = {
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            role: payload.role
        };

        if (payload.serviceId != null) {
            requestBody.serviceId = payload.serviceId;
        }

        return this.http.post<any>(`${this.authApiUrl}/create-employee`, requestBody, {
            headers: this.getAuthHeaders()
        });
    }

    updateUser(payload: UpdateUserRequest): Observable<UserDto> {
        return this.http.put<UserDto>(`${this.apiUrl}/${payload.id}`, payload, {
            headers: this.getAuthHeaders()
        });
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`, {
            headers: this.getAuthHeaders()
        });
    }
}