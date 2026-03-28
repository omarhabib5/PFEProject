import { Component, OnDestroy, OnInit, inject,ChangeDetectorRef  } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Service, CreateServiceDto, UpdateServiceDto, ServicePage } from './Service/ServicePage';
import { UserApiService, UserDto } from '../Team/Service/UserApiService';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-service-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './service-page.html',
  styleUrl: './service-page.css',
})
export class servicepage implements OnInit, OnDestroy {
  private servicePageService = inject(ServicePage);
  private userApiService = inject(UserApiService);
  private cdr = inject(ChangeDetectorRef); 
  private autoRefreshSubscription: Subscription | null = null;
  private readonly autoRefreshMs = 15000;

  services: Service[] = [];
  users: UserDto[] = [];
  loading = false;
  error: string | null = null;
  
  showAddForm = false;
  showEditForm = false;
  
  newService: CreateServiceDto = {
    name: '',
    responsibleId: undefined
  };
  
  editingService: UpdateServiceDto = {
    id: 0,
    name: '',
    responsibleId: undefined
  };

  ngOnInit(): void {
    this.loadServices();
    this.loadUsers();
    this.startAutoRefresh();
  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();
  }

  loadServices(): void {
    this.loading = true;
    this.error = null;
    
    console.log('Loading services from:', this.servicePageService);
    
    this.servicePageService.getServices().subscribe({
      next: (data) => {
        console.log('Services loaded successfully:', data);
        this.services = data || [];
        this.loading = false;
          this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading services:', err);
        console.error('Error status:', err.status);
        console.error('Error message:', err.message);
        this.error = 'Failed to load services. Please try again.';
        this.services = [];
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  loadUsers(): void {
    this.userApiService.getUsers().subscribe({
      next: (data) => {
        this.users = data || [];
      },
      error: (err) => {
        console.error('Error loading users:', err);
      }
    });
  }

  
  openAddForm(): void {
    this.showAddForm = true;
    this.showEditForm = false;
    this.newService = { name: '', responsibleId: undefined };
    this.error = null;
  }

  closeAddForm(): void {
    this.showAddForm = false;
    this.newService = { name: '', responsibleId: undefined };
    this.error = null;
  }

  createService(): void {
    if (!this.newService.name.trim()) {
      this.error = 'Service name is required';
      return;
    }

    this.error = null;

    this.servicePageService.createService(this.newService).subscribe({
      next: (response) => {
        console.log('Service created with ID:', response.id);
      
        
        this.closeAddForm();
     
        this.loadServices();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to create service. Please try again.';
        console.error('Error creating service:', err);
        this.cdr.detectChanges();
      }
    });
  }


  openEditForm(service: Service): void {
    this.showEditForm = true;
    this.showAddForm = false;
    this.editingService = {
      id: service.id,
      name: service.name,
      responsibleId: service.responsibleId
    };
    this.error = null;
  }

  closeEditForm(): void {
    this.showEditForm = false;
    this.editingService = { id: 0, name: '', responsibleId: undefined };
    this.error = null;
  }

  updateService(): void {
    if (!this.editingService.name.trim()) {
      this.error = 'Service name is required';
      return;
    }

    this.error = null;

    this.servicePageService.updateService(this.editingService.id, this.editingService).subscribe({
      next: () => {
        this.closeEditForm();
    
        this.loadServices();
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to update service. Please try again.';
        console.error('Error updating service:', err);
        this.cdr.detectChanges();
      }
    });
  }

  deleteService(id: number): void {
    
    if (!confirm('Are you sure you want to delete this service?')) {
      return;
    }

    this.error = null;

    this.servicePageService.deleteService(id).subscribe({
      next: () => {
      
        this.services = this.services.filter(s => s.id !== id);
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = 'Failed to delete service. Please try again.';
        console.error('Error deleting service:', err);
        
        this.cdr.detectChanges();
      }
    });
  }


  getInitials(name: string): string {
    if (!name) return '';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  private startAutoRefresh(): void {
    this.stopAutoRefresh();
    this.autoRefreshSubscription = interval(this.autoRefreshMs).subscribe(() => {
      if (typeof document !== 'undefined' && document.hidden) {
        return;
      }

      this.loadServices();
      this.loadUsers();
    });
  }

  private stopAutoRefresh(): void {
    this.autoRefreshSubscription?.unsubscribe();
    this.autoRefreshSubscription = null;
  }
}