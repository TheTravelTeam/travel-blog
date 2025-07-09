import { Component, Input } from '@angular/core';
import { IconComponent } from '../../icon/icon.component';
import { ProgressBarProps } from '../../../model/progress-bar.model';

@Component({
  selector: 'app-progress-bar',
  imports: [IconComponent],
  templateUrl: './progress-bar.component.html',
  styleUrl: './progress-bar.component.scss',
})
export class ProgressBarComponent {
  @Input({ required: true }) totalSteps!: ProgressBarProps['totalSteps'];
  @Input({ required: true }) completedSteps!: ProgressBarProps['completedSteps'];

  get progress(): number {
    return Math.max((this.completedSteps / this.totalSteps) * 100, 2);
  }

  get isCompleted() {
    return this.completedSteps === this.totalSteps;
  }
}
