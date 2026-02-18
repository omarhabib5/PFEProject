import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface UserDto {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
}

@Injectable({
    providedIn: "root",
})
export class UserApiService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7219/api/user';

    getUsers(): Observable<UserDto[]> {
        return this.http.get<UserDto[]>(this.apiUrl);
    }

    getUserById(id: number): Observable<UserDto> {
        return this.http.get<UserDto>(`${this.apiUrl}/${id}`);
    }
}
