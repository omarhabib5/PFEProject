import { Injectable } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { inject } from "@angular/core";
import { Observable } from "rxjs";


export interface Service {
  id: number;
  name: string;
  responsibleId?: number;
  responsible?: User;
  members?: User[];
  teams?: Team[];
  projects?: Project[];
}

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
}

export interface Team {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  name: string;
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
export class ServicePage {
  private http = inject(HttpClient);
  private apiUrl = 'https://localhost:7219/api/Service';


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
