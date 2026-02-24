import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TokenService } from '../../Auth/Service/token.service';
import { Service, ServicePage } from '../../Page/service-page/Service/Service';
import { UserApiService, UserDto } from '../../Page/Team/Service/UserApiService';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.html',
  styleUrl: './admin-dashboard.css'
})
export class AdminDashboard implements OnInit {
  private router = inject(Router);
  private tokenService = inject(TokenService);
  private servicePageService = inject(ServicePage);
  private userApiService = inject(UserApiService);
  private cdr = inject(ChangeDetectorRef);


  userName: string = 'Administrateur';
  userRole: string = 'Admin';
  currentDate: string = '';


  activeTab: string = 'dashboard';


  services: Service[] = [];
  filteredServices: Service[] = [];
  searchTerm: string = '';
  selectedStatus: string = 'all';
  loading = false;
  showNewServiceForm = false;
  showEditServiceForm = false;
  showDeleteConfirm = false;
  serviceToDelete: number | null = null;


  users: UserDto[] = [];

 
  newService = {
    name: '',
    responsibleId: undefined as number | undefined
  };

  editingService = {
    id: 0,
    name: '',
    responsibleId: undefined as number | undefined
  };

  ngOnInit(): void {
    const userData = this.tokenService.getUserData();
    if (userData?.firstName && userData?.lastName) {
      this.userName = `${userData.firstName} ${userData.lastName}`;
    }
    if (userData?.role) {
      this.userRole = userData.role;
    }
    this.setCurrentDate();
    this.loadServices();
    this.loadUsers();
  }

  setCurrentDate(): void {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    this.currentDate = new Date().toLocaleDateString('fr-FR', options);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'service') {
      this.loadServices();
    }
  }

  loadServices(): void {
    this.loading = true;
    this.servicePageService.getServices().subscribe({
      next: (data) => {
        this.services = data;
        this.filteredServices = data;
        this.loading = false;
          this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading services:', error);
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
          this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error loading users:', error);
      }
    });
  }

  filterServices(): void {
    this.filteredServices = this.services.filter(service => {
      const matchesSearch = service.name.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.selectedStatus === 'all' || service.name.toLowerCase().includes(this.selectedStatus);
      return matchesSearch && matchesStatus;
    });
  }

  viewProjects(serviceId: number): void {
    console.log('View projects for service:', serviceId);
  
  }

  getInitials(firstName: string, lastName: string): string {
    return `${firstName?.charAt(0) || ''}${lastName?.charAt(0) || ''}`.toUpperCase();
  }

  createService(): void {
    this.servicePageService.createService(this.newService).subscribe({
      next: (service) => {
        console.log('Service created:', service);
        this.loadServices();
        this.showNewServiceForm = false;
        this.newService = { name: '', responsibleId: undefined };
          this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error creating service:', error);
      }
    });
  }

  cancelNewService(): void {
    this.showNewServiceForm = false;
    this.newService = { name: '', responsibleId: undefined };
  }

  editService(service: Service): void {
    this.editingService = {
      id: service.id,
      name: service.name,
      responsibleId: service.responsible?.id
    };
    this.showEditServiceForm = true;
  }

  updateService(): void {
    this.servicePageService.updateService(this.editingService.id, this.editingService).subscribe({
      next: (service) => {
        console.log('Service updated:', service);
        this.loadServices();
        this.showEditServiceForm = false;
        this.editingService = { id: 0, name: '', responsibleId: undefined };
          this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error updating service:', error);
      }
    });
  }

  cancelEditService(): void {
    this.showEditServiceForm = false;
    this.editingService = { id: 0, name: '', responsibleId: undefined };
  }

  confirmDelete(serviceId: number): void {
    this.serviceToDelete = serviceId;
    this.showDeleteConfirm = true;
  }

  deleteService(): void {
    if (this.serviceToDelete) {
      this.servicePageService.deleteService(this.serviceToDelete).subscribe({
        next: () => {
          console.log('Service deleted');
          this.loadServices();
          this.showDeleteConfirm = false;
          this.serviceToDelete = null;
            this.cdr.detectChanges();
        },
        error: (error) => {
          console.error('Error deleting service:', error);
          this.showDeleteConfirm = false;
          this.serviceToDelete = null;
        }
      });
    }
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.serviceToDelete = null;
  }

  logout(): void {
    this.tokenService.clear();
    this.router.navigate(['/']);
  }
}
