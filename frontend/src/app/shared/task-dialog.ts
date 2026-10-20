import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { ApiService, errorMessage } from '../core/api.service';
import { TASK_PRIORITIES, TASK_STATUSES, Task } from '../core/models';

export interface TaskDialogData {
  projectId: string;
  task: Task | null;
}

@Component({
  selector: 'app-task-dialog',
  imports: [ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  templateUrl: './task-dialog.html',
  styleUrl: './dialog.scss',
})
export class TaskDialog {
  private api = inject(ApiService);
  private dialogRef = inject(MatDialogRef<TaskDialog>);
  readonly data = inject<TaskDialogData>(MAT_DIALOG_DATA);
  readonly statuses = TASK_STATUSES;
  readonly priorities = TASK_PRIORITIES;

  readonly form = inject(FormBuilder).nonNullable.group({
    title: [this.data.task?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.task?.description ?? '', Validators.maxLength(5000)],
    status: [this.data.task?.status ?? 'TODO', Validators.required],
    priority: [this.data.task?.priority ?? 'MEDIUM', Validators.required],
    dueDate: [this.data.task?.dueDate?.slice(0, 10) ?? ''],
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
    const value = { ...this.form.getRawValue(), dueDate: this.form.getRawValue().dueDate || null };
    const request = this.data.task
      ? this.api.updateTask(this.data.task.id, value)
      : this.api.createTask(this.data.projectId, value);
    request.subscribe({
      next: (task) => this.dialogRef.close(task),
      error: (err) => {
        this.error.set(errorMessage(err));
        this.saving.set(false);
      },
    });
  }
}
