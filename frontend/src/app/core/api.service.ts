import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { Dashboard, Page, Project, ProjectInput, Task, TaskInput, TaskQuery } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  dashboard() {
    return this.http.get<Dashboard>(`${this.base}/dashboard`);
  }

  project(id: string) {
    return this.http.get<Project>(`${this.base}/projects/${id}`);
  }

  createProject(data: ProjectInput) {
    return this.http.post<Project>(`${this.base}/projects`, data);
  }

  updateProject(id: string, data: ProjectInput) {
    return this.http.put<Project>(`${this.base}/projects/${id}`, data);
  }

  deleteProject(id: string) {
    return this.http.delete<void>(`${this.base}/projects/${id}`);
  }

  tasks(projectId: string, query: TaskQuery) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== '' && value !== undefined && value !== null) {
        params = params.set(key, String(value));
      }
    }
    return this.http.get<Page<Task>>(`${this.base}/projects/${projectId}/tasks`, { params });
  }

  createTask(projectId: string, data: TaskInput) {
    return this.http.post<Task>(`${this.base}/projects/${projectId}/tasks`, data);
  }

  updateTask(id: string, data: TaskInput) {
    return this.http.put<Task>(`${this.base}/tasks/${id}`, data);
  }

  deleteTask(id: string) {
    return this.http.delete<void>(`${this.base}/tasks/${id}`);
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) {
      return 'Cannot reach the server. Please try again.';
    }
    const details = err.error?.errors as { field: string; message: string }[] | undefined;
    if (details?.length) {
      return details.map((d) => `${d.field}: ${d.message}`).join(', ');
    }
    return err.error?.message ?? 'Something went wrong';
  }
  return 'Something went wrong';
}
