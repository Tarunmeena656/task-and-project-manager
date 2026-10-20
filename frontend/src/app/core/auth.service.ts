import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, of, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { User } from './models';

interface AuthResponse {
  token: string;
  user: User;
}

const TOKEN_KEY = 'token';
const USER_KEY = 'user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  readonly user = signal<User | null>(this.loadUser());
  readonly isLoggedIn = computed(() => this.user() !== null);

  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  register(data: { name: string; email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.setSession(res)));
  }

  login(data: { email: string; password: string }) {
    return this.http
      .post<AuthResponse>(`${environment.apiUrl}/auth/login`, data)
      .pipe(tap((res) => this.setSession(res)));
  }

  logout() {
    this.http
      .post(`${environment.apiUrl}/auth/logout`, {})
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.clearSession();
        this.router.navigate(['/login']);
      });
  }

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.user.set(null);
  }

  private setSession(res: AuthResponse) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.user.set(res.user);
  }

  private loadUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || !localStorage.getItem(TOKEN_KEY)) {
      return null;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
