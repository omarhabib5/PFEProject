import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Service {
    id: number;
    name: string;
    responsibleId?: number;
}

@Injectable({
    providedIn: "root",
})
export class ServiceService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7219/api/service';

    getServices(): Observable<Service[]> {
        return this.http.get<Service[]>(this.apiUrl);
    }

    getServiceById(id: number): Observable<Service> {
        return this.http.get<Service>(`${this.apiUrl}/${id}`);
    }
}
