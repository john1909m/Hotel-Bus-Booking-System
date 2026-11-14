import '@angular/compiler';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Injector, runInInjectionContext } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { of } from 'rxjs';
import { UserService } from './user.service';
import { environment } from '../../../environments/environment';
import { UserDto } from '../models/User/user.model';
import { PageUserDto } from '../models/Pagination/userPage.model';

describe('UserService', () => {
  let service: UserService;
  let mockHttp: any;
  const baseUrl = `${environment.apiBaseUrl}/users`;

  beforeEach(() => {
    mockHttp = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    };

    const injector = Injector.create({
      providers: [{ provide: HttpClient, useValue: mockHttp }],
    });

    service = runInInjectionContext(injector, () => new UserService());
  });

  it('getUsers should pass pagination and filter query params correctly', () => {
    mockHttp.get.mockReturnValue(of({
      content: [{ id: 1, name: 'Alice', email: 'alice@test.com', role: 'ADMIN' }],
      page: { totalElements: 1, totalPages: 1, size: 10, number: 0 }
    }));

    let res: PageUserDto | undefined;
    service.getUsers({ page: 0, size: 10, q: 'alice', role: 'ADMIN', sort: 'name,asc' }).subscribe(data => {
      res = data;
    });

    expect(mockHttp.get).toHaveBeenCalledWith(baseUrl, expect.anything());
    const params: HttpParams = mockHttp.get.mock.calls[0][1].params;
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('10');
    expect(params.get('q')).toBe('alice');
    expect(params.get('role')).toBe('ADMIN');
    expect(params.get('sort')).toBe('name,asc');

    expect(res?.totalElements).toBe(1);
    expect(res?.totalPages).toBe(1);
  });

  it('getUsers should normalize Spring Boot 3 PagedModel page metadata', () => {
    const rawResponse = {
      content: [
        { id: 1, name: 'User 1', email: 'u1@test.com', role: 'USER' },
        { id: 2, name: 'User 2', email: 'u2@test.com', role: 'ADMIN' }
      ],
      page: {
        totalElements: 42,
        totalPages: 5,
        size: 10,
        number: 0
      }
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PageUserDto | undefined;
    service.getUsers().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(42);
    expect(res?.totalPages).toBe(5);
    expect(res?.size).toBe(10);
    expect(res?.number).toBe(0);
    expect(res?.content?.length).toBe(2);
  });

  it('getUsers should fall back to legacy flat pagination fields if page metadata is missing', () => {
    const rawResponse = {
      content: [{ id: 1, name: 'User 1', email: 'u1@test.com', role: 'USER' }],
      totalElements: 1,
      totalPages: 1,
      size: 10,
      number: 0
    };
    mockHttp.get.mockReturnValue(of(rawResponse));

    let res: PageUserDto | undefined;
    service.getUsers().subscribe(data => {
      res = data;
    });

    expect(res?.totalElements).toBe(1);
    expect(res?.totalPages).toBe(1);
  });
});
