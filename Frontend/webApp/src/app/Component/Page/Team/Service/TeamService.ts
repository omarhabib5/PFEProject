import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";

export interface Team {
    id: number;
    name: string;
    serviceId?: number;
}

export interface TeamUser {
    id: number;
    userId: number;
    teamId: number;
    role: Role;
    joinedAt?: string;
    leftAt?: string | null;
    user?: UserInTeam;
}

export interface UserInTeam {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    role?: number;
}

export interface User {
    id: number;
    name: string;
    email: string;
}

export enum Role {
    Employer = 0,
    ProjectLeader = 1  
}

export interface CreateTeamRequest {
    name: string;
    serviceId: number;
}

export interface UpdateTeamRequest {
    id: number;
    name: string;
    serviceId: number;
}

export interface AddMemberRequest {
    userId: number;
    role: Role;
}

export interface CreateTeamUserCommand {
    UserId: number;
    TeamId?: number;
    role: Role;
}

@Injectable({
    providedIn: "root",
})
export class TeamService {
    private http = inject(HttpClient);
    private apiUrl = 'https://localhost:7219/api/teams';

    getTeams(): Observable<Team[]> {
        return this.http.get<Team[]>(this.apiUrl);
    }

    getTeamById(id: number): Observable<Team> {
        return this.http.get<Team>(`${this.apiUrl}/${id}`);
    }

    createTeam(team: CreateTeamRequest): Observable<any> {
        return this.http.post(this.apiUrl, team);
    }

    updateTeam(id: number, team: CreateTeamRequest): Observable<void> {
        const updateRequest: UpdateTeamRequest = {
            id: id,
            name: team.name,
            serviceId: team.serviceId
        };
        return this.http.put<void>(`${this.apiUrl}/${id}`, updateRequest);
    }

    deleteTeam(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }

    getMembersByTeamId(id: number): Observable<TeamUser[]> {
        return this.http.get<TeamUser[]>(`${this.apiUrl}/${id}/members`);
    }

    getLeadersByTeamId(id: number): Observable<TeamUser[]> {
        return this.http.get<TeamUser[]>(`${this.apiUrl}/${id}/members/leaders`);
    }

    getEmployeesByTeamId(id: number): Observable<TeamUser[]> {
        return this.http.get<TeamUser[]>(`${this.apiUrl}/${id}/members/employees`);
    }

    addMemberToTeam(teamId: number, request: AddMemberRequest): Observable<any> {
        const command: CreateTeamUserCommand = {
            UserId: request.userId,
            role: request.role
        };
        return this.http.post(`${this.apiUrl}/${teamId}/members`, command);
    }

    updateMemberRole(teamId: number, memberId: number, role: Role): Observable<void> {
        const command = { role: role };
        return this.http.put<void>(`${this.apiUrl}/${teamId}/members/${memberId}/role`, command);
    }

    removeMemberFromTeam(teamId: number, memberId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${teamId}/members/${memberId}`);
    }
}