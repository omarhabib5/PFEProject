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

    private getAuthHeaders(): HttpHeaders {
        const token = localStorage.getItem('access_token') || localStorage.getItem('token');
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
        return this.http.post<any>(`${this.authApiUrl}/create-employee`, payload, {
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