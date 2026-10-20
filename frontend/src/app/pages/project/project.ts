import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { ApiService, errorMessage } from '../../core/api.service';
import { Page, Project, TASK_PRIORITIES, TASK_STATUSES, Task, TaskPriority, TaskQuery, TaskStatus } from '../../core/models';
import { ConfirmDialog } from '../../shared/confirm-dialog';
import { ProjectDialog } from '../../shared/project-dialog';
import { TaskDialog } from '../../shared/task-dialog';

@Component({
  selector: 'app-project',
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './project.html',
  styleUrl: './project.scss',
})
export class ProjectPage {
  private api = inject(ApiService);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);
  private projectId = inject(ActivatedRoute).snapshot.paramMap.get('id')!;

  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;
  readonly columns = ['title', 'status', 'priority', 'dueDate', 'createdAt', 'actions'];

  readonly project = signal<Project | null>(null);
  readonly projectError = signal('');
  readonly tasks = signal<Page<Task> | null>(null);
  readonly tasksLoading = signal(true);
  readonly tasksError = signal('');

  readonly filters = inject(FormBuilder).nonNullable.group({
    search: '',
    status: '' as TaskStatus | '',
    priority: '' as TaskPriority | '',
    dueFrom: '',
    dueTo: '',
  });
  private query: TaskQuery = { sort: 'createdAt', order: 'desc', page: 1, pageSize: 10 };
  readonly hasFilters = toSignal(this.filters.valueChanges, { initialValue: this.filters.value });

  constructor() {
    this.loadProject();
    this.loadTasks();
    this.filters.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.query.page = 1;
      this.loadTasks();
    });
  }

  loadProject() {
    this.projectError.set('');
    this.api.project(this.projectId).subscribe({
      next: (project) => this.project.set(project),
      error: (err) => this.projectError.set(errorMessage(err)),
    });
  }

  loadTasks() {
    this.tasksLoading.set(true);
    this.tasksError.set('');
    this.api.tasks(this.projectId, { ...this.filters.getRawValue(), ...this.query }).subscribe({
      next: (page) => {
        this.tasks.set(page);
        this.tasksLoading.set(false);
      },
      error: (err) => {
        this.tasksError.set(errorMessage(err));
        this.tasksLoading.set(false);
      },
    });
  }

  clearFilters() {
    this.filters.reset();
  }

  onSort(sort: Sort) {
    this.query.sort = (sort.active as TaskQuery['sort']) || 'createdAt';
    this.query.order = sort.direction || 'desc';
    this.query.page = 1;
    this.loadTasks();
  }

  onPage(event: PageEvent) {
    this.query.page = event.pageIndex + 1;
    this.query.pageSize = event.pageSize;
    this.loadTasks();
  }

  editProject() {
    this.dialog
      .open(ProjectDialog, { data: this.project() })
      .afterClosed()
      .subscribe((project: Project | undefined) => {
        if (project) {
          this.project.set(project);
          this.snackBar.open('Project updated', 'OK', { duration: 3000 });
        }
      });
  }

  deleteProject() {
    this.confirm('Delete project', 'This will also delete all of its tasks.').subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.api.deleteProject(this.projectId).subscribe({
        next: () => {
          this.snackBar.open('Project deleted', 'OK', { duration: 3000 });
          this.router.navigate(['/dashboard']);
        },
        error: (err) => this.snackBar.open(errorMessage(err), 'OK', { duration: 5000 }),
      });
    });
  }

  openTask(task: Task | null) {
    this.dialog
      .open(TaskDialog, { data: { projectId: this.projectId, task } })
      .afterClosed()
      .subscribe((saved: Task | undefined) => {
        if (saved) {
          this.snackBar.open(task ? 'Task updated' : 'Task created', 'OK', { duration: 3000 });
          this.loadTasks();
          this.loadProject();
        }
      });
  }

  deleteTask(task: Task) {
    this.confirm('Delete task', `Delete "${task.title}"?`).subscribe((ok) => {
      if (!ok) {
        return;
      }
      this.api.deleteTask(task.id).subscribe({
        next: () => {
          this.snackBar.open('Task deleted', 'OK', { duration: 3000 });
          this.loadTasks();
          this.loadProject();
        },
        error: (err) => this.snackBar.open(errorMessage(err), 'OK', { duration: 5000 }),
      });
    });
  }

  private confirm(title: string, message: string) {
    return this.dialog.open(ConfirmDialog, { data: { title, message } }).afterClosed();
  }
}
