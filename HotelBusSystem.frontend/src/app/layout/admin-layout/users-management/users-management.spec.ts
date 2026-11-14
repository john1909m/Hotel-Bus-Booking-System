import '@angular/compiler';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Injector, runInInjectionContext, signal } from '@angular/core';
import { FormBuilder } from '@angular/forms';
import { of } from 'rxjs';
import { UsersManagement } from './users-management';
import { UserService } from '../../../core/services/user.service';
import { AuthService } from '../../../core/services/auth.service';
import { MessageService } from 'primeng/api';
import { UserDto } from '../../../core/models/User/user.model';
import { PageUserDto } from '../../../core/models/Pagination/userPage.model';

describe('UsersManagement Component', () => {
  let component: UsersManagement;
  let mockUserService: any;
  let mockAuthService: any;
  let mockMessageService: any;

  const mockUsers: UserDto[] = [
    { id: 1, name: 'Alice Admin', email: 'alice@test.com', phoneNumber: '01012345678', role: 'ADMIN' },
    { id: 2, name: 'Bob User', email: 'bob@test.com', phoneNumber: '01087654321', role: 'USER' }
  ];

  beforeEach(() => {
    vi.useFakeTimers();

    mockUserService = {
      getUsers: vi.fn().mockReturnValue(
        of({
          content: mockUsers,
          totalElements: 2,
          totalPages: 1,
          size: 10,
          number: 0,
          page: { totalElements: 2, totalPages: 1, size: 10, number: 0 }
        } as PageUserDto)
      ),
      createUser: vi.fn().mockReturnValue(of({ id: 3, name: 'New User' })),
      updateUser: vi.fn().mockReturnValue(of({ id: 1, name: 'Updated' })),
      deleteUser: vi.fn().mockReturnValue(of(void 0)),
    };

    mockAuthService = {
      currentUser: signal({ id: 99, email: 'admin@test.com', role: 'ADMIN' })
    };

    mockMessageService = {
      add: vi.fn(),
    };

    const injector = Injector.create({
      providers: [
        { provide: UserService, useValue: mockUserService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: MessageService, useValue: mockMessageService },
        { provide: FormBuilder, useClass: FormBuilder },
      ],
    });

    component = runInInjectionContext(injector, () => new UsersManagement());
  });

  afterEach(() => {
    component.ngOnDestroy();
    vi.useRealTimers();
  });

  it('should initialize and load users with server pagination', () => {
    component.ngOnInit();

    expect(mockUserService.getUsers).toHaveBeenCalledWith({
      page: 0,
      size: 10,
    });
    expect(component.users().length).toBe(2);
    expect(component.totalElements()).toBe(2);
  });

  it('should debounce search input by 300ms and reset page to 0', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockUserService.getUsers.mockClear();

    component.onSearchInput('ali');
    vi.advanceTimersByTime(200);
    expect(mockUserService.getUsers).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(component.currentPage()).toBe(0);
    expect(mockUserService.getUsers).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      q: 'ali'
    });
  });

  it('should reset page to 0 and query with role filter on role change', () => {
    component.ngOnInit();
    component.currentPage.set(2);
    mockUserService.getUsers.mockClear();

    component.onRoleChange('ADMIN');

    expect(component.currentPage()).toBe(0);
    expect(component.roleFilter()).toBe('ADMIN');
    expect(mockUserService.getUsers).toHaveBeenCalledWith({
      page: 0,
      size: 10,
      role: 'ADMIN' as any
    });
  });

  it('should reset all filters and reload on clearFilters', () => {
    component.ngOnInit();
    component.searchQuery.set('test');
    component.roleFilter.set('ADMIN');
    component.sortFilter.set('name,asc');
    component.currentPage.set(3);
    mockUserService.getUsers.mockClear();

    component.clearFilters();

    expect(component.searchQuery()).toBe('');
    expect(component.roleFilter()).toBe('');
    expect(component.sortFilter()).toBe('');
    expect(component.currentPage()).toBe(0);
    expect(mockUserService.getUsers).toHaveBeenCalledWith({
      page: 0,
      size: 10
    });
  });

  it('should request the correct page on page change', () => {
    component.ngOnInit();
    mockUserService.getUsers.mockClear();

    component.onPageChange({ first: 10, rows: 10 });

    expect(component.currentPage()).toBe(1);
    expect(mockUserService.getUsers).toHaveBeenCalledWith({
      page: 1,
      size: 10
    });
  });
});
