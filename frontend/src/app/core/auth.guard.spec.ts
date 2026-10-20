import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';

describe('authGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
  });

  it('redirects to /login when logged out', () => {
    const result = TestBed.runInInjectionContext(() => authGuard(route, state)) as UrlTree;
    expect(result instanceof UrlTree).toBe(true);
    expect(TestBed.inject(Router).serializeUrl(result)).toBe('/login');
  });

  it('allows navigation when logged in', () => {
    localStorage.setItem('token', 'jwt-token');
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Alice', email: 'a@b.c', createdAt: '' }));
    TestBed.inject(AuthService);
    expect(TestBed.runInInjectionContext(() => authGuard(route, state))).toBe(true);
  });
});
