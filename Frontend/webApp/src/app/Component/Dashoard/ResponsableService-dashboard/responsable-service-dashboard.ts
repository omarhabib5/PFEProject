import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize, timeout } from 'rxjs';
import { CreateServiceDto, Service, ServicePage } from '../../Page/service-page/Service/ServicePage';
import { TokenService } from '../../Auth/Service/token.service';

interface TeamMemberRow {
  fullName: string;
  email: string;
  roleLabel: string;
  roleClass: string;
  activeTasks: number;
  completedTasks: number;
  avatar: string;
  subtitle?: string;
}

@Component({
  selector: 'app-responsable-service-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './responsable-service-dashboard.html',
  styleUrl: './responsable-service-dashboard.css',
})
export class ResponsableServiceDashboard implements OnInit {
  private serviceApi = inject(ServicePage);
  private router = inject(Router);
  private tokenService = inject(TokenService);

  activeSection: 'services' | 'calendar' = 'services';
  serviceViewMode: 'list' | 'detail' = 'list';
  activeTab: 'dashboard' | 'team' = 'dashboard';

  loading = false;
  error = '';
  searchTerm = '';
  statusFilter: 'all' | 'active' = 'all';

  services: Service[] = [];
  selectedServiceId: number | null = null;

  showCreateModal = false;
  newService: CreateServiceDto = {
    name: ''
  };

  currentDateLabel = '';
  userName = '';
  userRole = '';
  notificationCount = 0;
  currentMonth = new Date();
  calendarDays: Array<{ day: number; isToday: boolean; inCurrentMonth: boolean }> = [];

  get teamRows(): TeamMemberRow[] {
    const service = this.selectedService;
    if (!service) {
      return [];
    }

    return (service.members ?? []).map((member) => {
      const isManager = service.responsibleId === member.id;
      const memberData = member as unknown as Record<string, unknown>;
      const roleValue = memberData['role'];

      return {
        fullName: `${member.firstName} ${member.lastName}`,
        email: member.email,
        roleLabel: this.getRoleLabel(roleValue, isManager),
        roleClass: this.getRoleClass(roleValue, isManager),
        activeTasks: this.toNumber(memberData['activeTasks']),
        completedTasks: this.toNumber(memberData['completedTasks']),
        avatar: this.getInitials(`${member.firstName} ${member.lastName}`),
        subtitle: isManager ? 'Chef de service' : undefined
      };
    });
  }

  get completedTasksCount(): number {
    return this.teamRows.reduce((sum, row) => sum + row.completedTasks, 0);
  }

  get activeTasksCount(): number {
    return this.teamRows.reduce((sum, row) => sum + row.activeTasks, 0);
  }

  get globalProgressPercent(): number {
    const total = this.completedTasksCount + this.activeTasksCount;
    if (total === 0) return 0;
    return Math.round((this.completedTasksCount / total) * 100);
  }

  get userStoryTotal(): number {
    return 0;
  }

  get sprintTotal(): number {
    return 0;
  }

  get activeSprintCount(): number {
    return 0;
  }

  get completedSprintCount(): number {
    return 0;
  }

  get completedUserStoriesCount(): number {
    return 0;
  }

  get inProgressUserStoriesCount(): number {
    return 0;
  }

  get todoTasksCount(): number {
    return 0;
  }

  ngOnInit(): void {
    if (!this.tokenService.isAuthenticated()) {
      this.router.navigate(['/login']);
      return;
    }

    this.setUserProfile();
    this.setCurrentDate();
    this.generateCalendar();
    this.loadServices();
  }

  get pageTitle(): string {
    if (this.activeSection === 'calendar') return 'Calendrier';
    if (this.serviceViewMode === 'detail') return 'Mon Service';
    return 'Gestion des Services';
  }

  get selectedService(): Service | null {
    if (!this.selectedServiceId) return null;
    return this.services.find(service => service.id === this.selectedServiceId) ?? null;
  }

  get filteredServices(): Service[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.services.filter(service => {
      const matchesTerm = !term || service.name.toLowerCase().includes(term);
      const matchesStatus = this.statusFilter === 'all' || this.getServiceStatus(service) === 'Actif';
      return matchesTerm && matchesStatus;
    });
  }

  get membersCount(): number {
    return this.selectedService?.members?.length ?? 0;
  }

  get projectsCount(): number {
    return this.selectedService?.projects?.length ?? 0;
  }

  loadServices(): void {
    this.loading = true;
    this.error = '';

    this.serviceApi.getServices()
      .pipe(
        timeout(10000),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (data) => {
          this.services = data ?? [];
          if (this.services.length > 0 && !this.selectedServiceId) {
            this.selectedServiceId = this.services[0].id;
            this.serviceViewMode = 'detail';
          }
        },
        error: () => {
          this.error = 'Impossible de charger les services. Vérifiez que le backend est démarré.';
          this.services = [];
        }
      });
  }

  setSection(section: 'services' | 'calendar'): void {
    this.activeSection = section;
    if (section === 'services') {
      this.serviceViewMode = this.selectedServiceId ? 'detail' : 'list';
    }
  }

  openServiceDetails(service: Service): void {
    this.selectedServiceId = service.id;
    this.serviceViewMode = 'detail';
    this.activeSection = 'services';
    this.activeTab = 'dashboard';
  }

  backToServiceList(): void {
    this.serviceViewMode = 'list';
    this.selectedServiceId = null;
  }

  setTab(tab: 'dashboard' | 'team'): void {
    this.activeTab = tab;
  }

  openCreateServiceModal(): void {
    this.newService = { name: '' };
    this.showCreateModal = true;
  }

  closeCreateServiceModal(): void {
    this.showCreateModal = false;
  }

  createService(): void {
    if (!this.newService.name.trim()) {
      this.error = 'Le nom du service est obligatoire';
      return;
    }

    this.serviceApi.createService(this.newService).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.loadServices();
      },
      error: () => {
        this.error = 'Impossible de créer le service';
      }
    });
  }

  openProjects(): void {
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined
      }
    });
  }

  openProjectEdit(): void {
    this.router.navigate(['/ProjectManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  openAddMembers(): void {
    this.router.navigate(['/TeamManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined,
        source: 'service-manager'
      }
    });
  }

  openTeams(): void {
    this.router.navigate(['/TeamManage'], {
      queryParams: {
        serviceId: this.selectedServiceId ?? undefined
      }
    });
  }

  openUserStories(): void {
    const firstProjectId = this.selectedService?.projects?.[0]?.id;
    if (firstProjectId) {
      this.router.navigate(['/sprint/manage', firstProjectId]);
      return;
    }
    this.router.navigate(['/SprintManage']);
  }

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/login']);
  }

  getServiceStatus(_service: Service): 'Actif' {
    return 'Actif';
  }

  getServiceAvatars(service: Service): string[] {
    const members = service.members ?? [];
    return members.slice(0, 3).map(member => this.getInitials(`${member.firstName} ${member.lastName}`));
  }

  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  private getRoleLabel(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'Administrateur';
      if (role === 1) return 'Service Manager';
      if (role === 2) return 'Chef de projet';
      if (role === 3) return 'Employé';
    }
    if (typeof role === 'string' && role.trim().length > 0) {
      return role;
    }
    return isManager ? 'Manager' : 'Employé';
  }

  private getRoleClass(role: unknown, isManager: boolean): string {
    if (typeof role === 'number') {
      if (role === 0) return 'role-admin';
      if (role === 1) return 'role-manager';
      if (role === 2) return 'role-lead';
      if (role === 3) return 'role-employee';
    }
    return isManager ? 'role-manager' : 'role-employee';
  }

  private toNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private setCurrentDate(): void {
    this.currentDateLabel = new Date().toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  private setUserProfile(): void {
    const userData = this.tokenService.getUserData();
    if (userData?.firstName && userData?.lastName) {
      this.userName = `${userData.firstName} ${userData.lastName}`;
    } else {
      this.userName = '—';
    }
    if (userData?.role) {
      this.userRole = userData.role;
    } else {
      this.userRole = '—';
    }
  }

  private generateCalendar(): void {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    const today = new Date();
    this.calendarDays = [];

    for (let index = 0; index < totalCells; index++) {
      const dayNumber = index - startOffset + 1;
      const inCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
      const isToday = inCurrentMonth && dayNumber === today.getDate() && month === today.getMonth() && year === today.getFullYear();

      this.calendarDays.push({
        day: inCurrentMonth ? dayNumber : 0,
        isToday,
        inCurrentMonth
      });
    }
  }

}
