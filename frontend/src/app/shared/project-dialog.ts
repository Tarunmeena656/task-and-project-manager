import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService, errorMessage } from '../core/api.service';
import { PROJECT_STATUSES, Project } from '../core/models';

@Component({
  selector: 'app-project-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './project-dialog.html',
  styleUrl: './dialog.scss',
})
export class ProjectDialog {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<ProjectDialog>);
  readonly project = inject<Project | null>(MAT_DIALOG_DATA);
  readonly statuses = PROJECT_STATUSES;

  readonly form = inject(FormBuilder).nonNullable.group({
    name: [this.project?.name ?? '', [Validators.required, Validators.maxLength(120)]],
    description: [this.project?.description ?? '', Validators.maxLength(2000)],
    status: [this.project?.status ?? 'ACTIVE', Validators.required],
  });
  readonly saving = signal(false);
  readonly error = signal('');

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.form.getRawValue();
    const request = this.project ? this.api.updateProject(this.project.id, value) : this.api.createProject(value);
    request.subscribe({
      next: (project) => this.dialogRef.close(project),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
