import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { ApiService, errorMessage } from '../../core/api.service';
import { Dashboard as DashboardData, Project } from '../../core/models';
import { ProjectDialog } from '../../shared/project-dialog';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard {
  private api = inject(ApiService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  readonly data = signal<DashboardData | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set('');
    this.api.dashboard().subscribe({
      next: (data) => {
        this.data.set(data);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  newProject() {
    this.dialog
      .open(ProjectDialog, { data: null })
      .afterClosed()
      .subscribe((project: Project | undefined) => {
        if (project) {
          this.snackBar.open('Project created', 'OK', { duration: 3000 });
          this.load();
        }
      });
  }
}
