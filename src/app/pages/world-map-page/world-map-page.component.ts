import { Component, effect, ElementRef, inject, ViewChild, OnInit } from '@angular/core';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { FormsModule } from '@angular/forms';
import { Step } from '../../model/step';
import { ButtonComponent } from '../../components/Button/button/button.component';
import { CommonModule } from '@angular/common';
import { DividerComponent } from '../../components/divider/divider.component';
import { BreakpointService } from '../../services/breakpoint.service';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';
import { TravelMapStateService } from '../../services/travel-map-state.service';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-world-map-page',
  imports: [
    ProgressBarComponent,
    AccordionComponent,
    FormsModule,
    ButtonComponent,
    CommonModule,
    DividerComponent,
    AvatarComponent,
  ],
  templateUrl: './world-map-page.component.html',
  styleUrl: './world-map-page.component.scss',
})
export class WorldMapPageComponent implements OnInit {
  readonly state = inject(TravelMapStateService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  private activatedRoute = inject(ActivatedRoute);

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  // Reset du scroll avec des signals & un sélector via Angular ci dessus
  constructor() {
    effect(() => {
      if (this.state.panelHeight() === 'collapsedDiary') {
        // queueMicrotask --> Permet d’attendre que le DOM soit entièrement à jour avant d’agir (scroll, focus, etc.)
        queueMicrotask(() => {
          this.detailPanelRef?.nativeElement.scrollTo({ top: 0 });
        });
      }
    });
  }

  ngOnInit(): void {
    this.activatedRoute.paramMap.subscribe((params) => {
      const id = params.get('id');
      console.log(id);
      if (id) {
        // Met à jour l'état global avec l'id du carnet
        this.state.setCurrentDiaryId(+id); // <-- tu peux juste mettre un `TravelDiary` partiel ici
      }
    });
  }
  togglePanel() {
    if (!this.state.currentDiary()) {
      // Si pas de diary, toggle simple entre collapsed/expanded
      this.state.panelHeight.set(
        this.state.panelHeight() === 'collapsed' ? 'expanded' : 'collapsed'
      );
      return;
    }

    // Si diary présent, logique spéciale à 3 états
    switch (this.state.panelHeight()) {
      case 'collapsed':
        this.state.panelHeight.set('expanded');
        break;
      case 'expanded':
        this.state.panelHeight.set('collapsedDiary');
        break;
      case 'collapsedDiary':
        this.state.panelHeight.set('expanded');
        break;
      default:
        this.state.panelHeight.set('collapsed');
        break;
    }
  }

  // get totalStepCount(): number {
  //   return this.steps.length;
  // }

  // /**
  //  * Événement déclenché quand la map est initialisée avec tous les diaries
  //  */
  // onMapInitialized(event: MapInitializedEvent): void {
  //   this.allDiaries = event.diaries;

  //   // Optionnel : afficher tous les diaries ou garder les données statiques
  //   // this.updateStepsFromDiaries(event.diaries);
  // }

  // /**
  //  * Événement déclenché quand un diary est sélectionné sur la map
  //  */
  // onDiarySelected(event: MapDiarySelectedEvent): void {
  //   this.currentDiary = event.diary;
  //   this.updateStepsFromDiarySteps(event.steps);

  //   // Réinitialiser progression
  //   this.completedSteps = this.getProgressFromOpenedSteps();

  //   if (this.isTabletOrMobile()) {
  //     this.panelHeight.set('collapsedDiary');
  //   } else {
  //     this.panelHeight.set('expanded'); // Optionnel : comportement desktop
  //   }
  // }

  // /**
  //  * Événement déclenché quand un step est cliqué sur la map
  //  */
  // onStepSelected(event: MapStepSelectedEvent): void {
  //   const stepId = event.step.id;
  //   this.openedStepId = stepId;
  //   this.panelHeight.set('expanded');
  //   this.completedSteps = this.getProgressFromOpenedSteps();
  // }

  // onRenitializeDiaries(): void {
  //   this.currentDiary = null;
  //   this.steps = [];
  //   this.panelHeight.set('collapsed');
  // }

  // /**
  //  * Convertit les steps d'un diary en format accordion
  //  */
  // private updateStepsFromDiarySteps(steps: Step[]): void {
  //   this.steps = steps.map((step, index) => ({
  //     id: step.id,
  //     title: step.title || `Étape ${index + 1}`,
  //     description: step.description || 'Aucune description disponible',
  //     country: step.country || 'Adresse non disponible',
  //     startDate: step.startDate ? new Date(step.startDate) : new Date(),
  //     medias: step.medias,
  //     isEditing: step.isEditing,
  //     comments: step.comments,
  //     latitude: step.latitude ?? 0,
  //     longitude: step.longitude ?? 0,
  //     likes: step.likes,
  //   }));

  //   this.openFirstStep(this.steps);
  // }

  // private openFirstStep(steps: Step[]) {
  //   // Ouvrir directement le premier step s'il existe
  //   if (steps.length > 0) {
  //     this.state.openedStepId.set(steps[0].id);
  //   } else {
  //     this.state.openedStepId.set(null);
  //   }
  // }

  /**
   * Convertit tous les diaries en format accordion (optionnel)
   */
  // private updateStepsFromDiaries(diaries: TravelDiary[]): void {
  //   this.steps = diaries.map((diary, index) => ({
  //     id: diary.id,
  //     title: diary.title || `Diary ${index + 1}`,
  //     content: diary.description || 'Aucune description disponible',
  //     subTitle: `${diary.latitude.toFixed(4)}, ${diary.longitude.toFixed(4)}`,
  //     date: diary.createdAt ? new Date(diary.createdAt) : new Date(),
  //   }));
  // }

  onAccordionToggle(stepId: number | undefined, isOpen: boolean) {
    if (!stepId) return;
    if (isOpen) {
      this.state.openedStepId.set(stepId); // ✅ Ferme tous les autres, ouvre celui-ci
    } else {
      this.state.openedStepId.set(null); // ✅ Ferme tout
    }
  }

  onDeleteSteps(id: number | undefined) {
    this.state.steps.set(this.state.steps().filter((step) => step.id !== id));
  }

  onStepClicked(stepId: number) {
    const step = this.state.steps().find((step) => step.id === stepId);
    if (step) {
      this.state.mapCenterCoords.set({
        lat: step.latitude,
        lng: step.longitude,
      });
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

  handleButtonClick(action: string, step: Step): void {
    if (action === 'like') {
      console.log(`Step ${step.id} liké ! Total : ${step.likes}`);
      // Logique d'ajout de like dans le step -- Si pas déjà aimé en fonction de l'user
    } else if (action === 'comment') {
      console.log(`Afficher les commentaires du step ${step.id}`);
      // Gérer l'ouverture d'une section commentaires ou autre
      this.state.openedCommentStepId.set(
        this.state.openedCommentStepId() === step.id ? null : step.id
      );
    }
  }

  scrollMediaContainer(stepId: number, direction: 'left' | 'right') {
    // Trouver le container avec querySelector
    const container = document.querySelector<HTMLDivElement>(
      `.step__media__container[data-id="${stepId}"]`
    );

    if (!container) return;

    const scrollAmount = 200; // pixels à scroller

    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  }
}
