import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environment";

export interface Service {
    id: number;
    name: string;
    responsibleId?: number;
}

export interface CreateServiceDto {
    name: string;
    responsibleId?: number;
}

export interface UpdateServiceDto {
    id: number;
    name: string;
    responsibleId?: number;
}

@Injectable({
    providedIn: "root",
})
export class ServiceService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/Service`;

    getServices(): Observable<Service[]> {
        return this.http.get<Service[]>(this.apiUrl);
    }

    getServiceById(id: number): Observable<Service> {
        return this.http.get<Service>(`${this.apiUrl}/${id}`);
    }
     createService(service: CreateServiceDto): Observable<{ id: number }> {
        return this.http.post<{ id: number }>(this.apiUrl, service);
    }

    updateService(id: number, service: UpdateServiceDto): Observable<void> {
        return this.http.put<void>(`${this.apiUrl}/${id}`, service);
    }

    deleteService(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}