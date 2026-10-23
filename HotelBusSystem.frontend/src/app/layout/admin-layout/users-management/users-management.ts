import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { TagModule } from 'primeng/tag';
import { MessageService } from 'primeng/api';

// Core Models & Services
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { UserDto, UserRequestDto, role, UserListParams } from '../../../core/models/User/user.model';
import { PageUserDto } from '../../../core/models/Pagination/userPage.model';

@Component({
  selector: 'app-users-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TableModule,
    ButtonModule,
    DialogModule,
    ToastModule,
    TagModule,
  ],
  providers: [MessageService],
  templateUrl: './users-management.html',
  styleUrl: './users-management.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersManagement implements OnInit, OnDestroy {
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly messageService = inject(MessageService);
  private readonly destroy$ = new Subject<void>();
  private readonly searchSubject$ = new Subject<string>();

  // ── State Signals ──────────────────────────────────────────
  readonly users = signal<UserDto[]>([]);
  readonly pageData = signal<PageUserDto | null>(null);
  readonly loading = signal<boolean>(false);
  readonly saving = signal<boolean>(false);
  readonly deleting = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  // Current admin ID to prevent self-deletion
  readonly currentAdminId = computed(() => this.authService.currentUser()?.id);

  // ── Filter Signals ─────────────────────────────────────────
  readonly searchQuery = signal<string>('');
  readonly roleFilter = signal<string>('');
  readonly sortFilter = signal<string>('');
  readonly currentPage = signal<number>(0);
  readonly pageSize = signal<number>(10);

  // ── Dialog Signals ─────────────────────────────────────────
  readonly dialogVisible = signal<boolean>(false);
  readonly isEditMode = signal<boolean>(false);
  readonly editingUserId = signal<number | null>(null);

  readonly deleteDialogVisible = signal<boolean>(false);
  readonly userToDelete = signal<UserDto | null>(null);

  // ── Computed ───────────────────────────────────────────────
  readonly totalElements = computed(() => this.pageData()?.totalElements ?? 0);
  readonly firstRow = computed(() => this.currentPage() * this.pageSize());
  readonly hasActiveFilters = computed(
    () => !!(this.searchQuery() || this.roleFilter() || this.sortFilter())
  );

  // ── Reactive Form ──────────────────────────────────────────
  readonly userForm: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    phoneNumber: ['', [Validators.required, Validators.maxLength(25)]],
    role: ['USER', [Validators.required]],
    password: [''],
  });

  ngOnInit(): void {
    this.searchSubject$
      .pipe(debounceTime(400), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => {
        this.currentPage.set(0);
        this.loadUsers();
      });

    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Data Loading ───────────────────────────────────────────
  loadUsers(): void {
    this.loading.set(true);
    this.errorMessage.set(null);

    const params: UserListParams = {
      page: this.currentPage(),
      size: this.pageSize(),
    };

    const q = this.searchQuery().trim();
    if (q) params.q = q;

    const r = this.roleFilter();
    if (r) params.role = r;

    const s = this.sortFilter();
    if (s) params.sort = s;

    this.userService
      .getUsers(params)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.pageData.set(page);
          this.users.set(page.content || []);
          this.loading.set(false);
        },
        error: (err) => {
          this.loading.set(false);
          const msg = err?.message || 'Failed to load users. Please check backend connection.';
          this.errorMessage.set(msg);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Loading Users',
            detail: msg,
            life: 5000,
          });
        },
      });
  }

  // ── Filters & Search ───────────────────────────────────────
  onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchSubject$.next(value);
  }

  onRoleChange(value: string): void {
    this.roleFilter.set(value);
    this.currentPage.set(0);
    this.loadUsers();
  }

  onSortChange(value: string): void {
    this.sortFilter.set(value);
    this.currentPage.set(0);
    this.loadUsers();
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('');
    this.sortFilter.set('');
    this.currentPage.set(0);
    this.loadUsers();
  }

  // ── PrimeNG Table Page Event ───────────────────────────────
  onPageChange(event: { first: number; rows: number }): void {
    const pageIndex = Math.floor(event.first / event.rows);
    this.pageSize.set(event.rows);
    this.currentPage.set(pageIndex);
    this.loadUsers();
  }

  // ── Create & Edit Modal Handlers ───────────────────────────
  openCreateDialog(): void {
    this.isEditMode.set(false);
    this.editingUserId.set(null);

    // For create mode, password is required
    this.userForm.get('password')?.setValidators([Validators.required, Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.userForm.reset({
      name: '',
      email: '',
      phoneNumber: '',
      role: 'USER',
      password: '',
    });
    this.dialogVisible.set(true);
  }

  openEditDialog(user: UserDto): void {
    this.isEditMode.set(true);
    this.editingUserId.set(user.id);

    // For edit mode, password is optional
    this.userForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.userForm.get('password')?.updateValueAndValidity();

    this.userForm.patchValue({
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber || '',
      role: user.role,
      password: '',
    });
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.userForm.reset();
  }

  saveUser(): void {
    if (this.userForm.invalid) {
      this.userForm.markAllAsTouched();
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation Error',
        detail: 'Please check your inputs and complete required fields.',
        life: 4000,
      });
      return;
    }

    this.saving.set(true);
    const formVal = this.userForm.getRawValue();

    const payload: UserRequestDto = {
      name: formVal.name.trim(),
      email: formVal.email.trim(),
      phoneNumber: formVal.phoneNumber.trim(),
      role: formVal.role as role,
    };

    const pwd = formVal.password?.trim();
    if (pwd) {
      payload.password = pwd;
    }

    if (this.isEditMode()) {
      const id = this.editingUserId();
      if (!id) {
        this.saving.set(false);
        return;
      }

      this.userService
        .updateUser(id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (updated) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'User Updated',
              detail: `User ${updated.name} was successfully updated.`,
              life: 4000,
            });
            this.loadUsers();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to update user.';
            this.messageService.add({
              severity: 'error',
              summary: 'Update Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    } else {
      this.userService
        .createUser(payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (created) => {
            this.saving.set(false);
            this.dialogVisible.set(false);
            this.messageService.add({
              severity: 'success',
              summary: 'User Created',
              detail: `User ${created.name} was created successfully.`,
              life: 4000,
            });
            this.currentPage.set(0);
            this.loadUsers();
          },
          error: (err) => {
            this.saving.set(false);
            const msg = err?.message || 'Failed to create user.';
            this.messageService.add({
              severity: 'error',
              summary: 'Creation Failed',
              detail: msg,
              life: 5000,
            });
          },
        });
    }
  }

  // ── Delete Handlers ────────────────────────────────────────
  openDeleteDialog(user: UserDto): void {
    this.userToDelete.set(user);
    this.deleteDialogVisible.set(true);
  }

  closeDeleteDialog(): void {
    this.deleteDialogVisible.set(false);
    this.userToDelete.set(null);
  }

  confirmDeleteUser(): void {
    const user = this.userToDelete();
    if (!user) return;

    if (user.id === this.currentAdminId()) {
      this.messageService.add({
        severity: 'error',
        summary: 'Action Denied',
        detail: 'You cannot delete your own active administrator account.',
        life: 5000,
      });
      return;
    }

    this.deleting.set(true);

    this.userService
      .deleteUser(user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.deleting.set(false);
          this.deleteDialogVisible.set(false);
          this.userToDelete.set(null);
          this.messageService.add({
            severity: 'success',
            summary: 'User Deleted',
            detail: `User ${user.name} was deleted successfully.`,
            life: 4000,
          });

          // If last element on page, back one page
          if (this.users().length === 1 && this.currentPage() > 0) {
            this.currentPage.update((p) => p - 1);
          }
          this.loadUsers();
        },
        error: (err) => {
          this.deleting.set(false);
          const msg = err?.message || 'Failed to delete user.';
          this.messageService.add({
            severity: 'error',
            summary: 'Delete Failed',
            detail: msg,
            life: 5000,
          });
        },
      });
  }
}
