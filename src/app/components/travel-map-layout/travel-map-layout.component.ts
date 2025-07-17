import {
  Component,
  effect,
  ElementRef,
  EventEmitter,
  inject,
  Input,
  Output,
  signal,
  ViewChild,
} from '@angular/core';
import { Step } from '../../model/step';
import { BreakpointService } from '../../services/breakpoint.service';
import {
  MapComponent,
  MapDiarySelectedEvent,
  MapInitializedEvent,
  MapStepSelectedEvent,
} from '../Atoms/map/map.component';
import { TravelDiary } from '../../model/travelDiary';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../divider/divider.component';
import { AvatarComponent } from '../Atoms/avatar/avatar.component';
import { IconComponent } from '../icon/icon.component';
import { ProgressBarComponent } from '../Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../Atoms/accordion/accordion.component';
import { CheckboxComponent } from '../checkbox/checkbox.component';
import { ButtonComponent } from '../Button/button/button.component';

@Component({
  selector: 'app-travel-map-layout',
  imports: [
    MapComponent,
    CommonModule,
    DividerComponent,
    AvatarComponent,
    IconComponent,
    ProgressBarComponent,
    AccordionComponent,
    CheckboxComponent,
    ButtonComponent,
  ],
  templateUrl: './travel-map-layout.component.html',
  styleUrl: './travel-map-layout.component.scss',
})
export class TravelMapLayoutComponent {
  @Input() steps: Step[] = [];
  @Input() currentDiary: TravelDiary | null = null;
  @Input() allDiaries: TravelDiary[] = [];
  @Input() openedStepId: number | null = null;
  @Input() openedCommentStepId: number | null = null;
  @Input() completedSteps = 0;
  @Input() mapCenterCoords: { lat: number; lng: number } | null = null;

  @Output() diarySelected = new EventEmitter<MapDiarySelectedEvent>();
  @Output() stepSelected = new EventEmitter<MapStepSelectedEvent>();
  @Output() mapInitialized = new EventEmitter<MapInitializedEvent>();
  @Output() renitializeDiaries = new EventEmitter<void>();
  @Output() stepClicked = new EventEmitter<number>();
  @Output() toggleStepAccordion = new EventEmitter<{ stepId: number; isOpen: boolean }>();
  @Output() deleteStep = new EventEmitter<number>();
  @Output() btnClick = new EventEmitter<{ action: string; step: Step }>();

  panelHeight = signal<'collapsed' | 'expanded' | 'collapsedDiary'>('collapsed');

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;
  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  constructor() {
    effect(() => {
      if (this.panelHeight() === 'collapsedDiary') {
        queueMicrotask(() => {
          this.detailPanelRef?.nativeElement.scrollTo({ top: 0 });
        });
      }
    });
  }

  togglePanel(): void {
    if (!this.currentDiary) {
      // Si pas de diary, toggle simple entre collapsed/expanded
      this.panelHeight.set(this.panelHeight() === 'collapsed' ? 'expanded' : 'collapsed');
      return;
    }

    // Si diary présent, logique spéciale à 3 états
    switch (this.panelHeight()) {
      case 'collapsed':
        this.panelHeight.set('expanded');
        break;
      case 'expanded':
        this.panelHeight.set('collapsedDiary');
        break;
      case 'collapsedDiary':
        this.panelHeight.set('expanded');
        break;
      default:
        this.panelHeight.set('collapsed');
        break;
    }
  }

  getCommentLabel(step: Step) {
    const count = step.comments?.length ?? 0;
    if (count === 1) {
      return '1 commentaire';
    } else if (count > 1) {
      return `${count} commentaires`;
    } else {
      return 'commentaire';
    }
  }

  scrollMediaContainer(stepId: number, direction: 'left' | 'right') {
    const container = document.querySelector<HTMLDivElement>(
      `.step__media__container[data-id="${stepId}"]`
    );
    if (!container) return;
    const scrollAmount = 200;
    container.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth',
    });
  }

  onAccordionToggle(stepId: number | undefined, isOpen: boolean): void {
    if (!stepId) return;
    this.toggleStepAccordion.emit({ stepId, isOpen });
  }

  handleButtonClick(action: string, step: Step): void {
    this.btnClick.emit({ action, step });
  }

  onStepClicked(stepId: number): void {
    this.stepClicked.emit(stepId);
  }

  onDeleteSteps(stepId: number | undefined): void {
    if (stepId !== undefined) this.deleteStep.emit(stepId);
  }

  onMapInitialized(event: MapInitializedEvent): void {
    this.mapInitialized.emit(event);
  }

  onDiarySelected(event: MapDiarySelectedEvent): void {
    if (this.isTabletOrMobile()) {
      this.panelHeight.set('collapsedDiary');
    } else {
      this.panelHeight.set('expanded'); // Optionnel : comportement desktop
    }
    this.diarySelected.emit(event);
  }

  onStepSelected(event: MapStepSelectedEvent): void {
    this.panelHeight.set('expanded');
    this.stepSelected.emit(event);
  }

  onRenitializeDiaries(): void {
    this.panelHeight.set('collapsed');
    this.renitializeDiaries.emit();
  }

  get totalStepCount(): number {
    return this.steps.length;
  }
}
