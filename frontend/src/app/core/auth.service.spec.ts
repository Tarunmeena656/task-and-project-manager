import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([{ path: 'login', children: [] }])],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('starts logged out', () => {
    expect(service.isLoggedIn()).toBe(false);
    expect(service.token).toBeNull();
  });

  it('stores the token and user after login', () => {
    const user = { id: '1', name: 'Alice', email: 'alice@example.com', createdAt: '2026-01-01' };
    service.login({ email: 'alice@example.com', password: 'password123' }).subscribe();

    const req = http.expectOne(`${environment.apiUrl}/auth/login`);
    expect(req.request.method).toBe('POST');
    req.flush({ token: 'jwt-token', user });

    expect(service.token).toBe('jwt-token');
    expect(service.user()).toEqual(user);
    expect(service.isLoggedIn()).toBe(true);
  });

  it('clears the session on logout even if the api call fails', () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Alice' }));
    service.user.set({ id: '1', name: 'Alice', email: 'a@b.c', createdAt: '' });

    service.logout();
    http.expectOne(`${environment.apiUrl}/auth/logout`).flush({ message: 'nope' }, { status: 500, statusText: 'Error' });

    expect(service.token).toBeNull();
    expect(service.isLoggedIn()).toBe(false);
  });
});
