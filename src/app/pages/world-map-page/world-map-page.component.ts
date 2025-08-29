import { Component, effect, ElementRef, inject, ViewChild, OnInit } from '@angular/core';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { FormsModule } from '@angular/forms';
import { Step } from '@model/step.model';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { CommonModule } from '@angular/common';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { BreakpointService } from '@service/breakpoint.service';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';
import { TravelMapStateService } from '@service/travel-map-state.service';
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
      console.info(id);
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
      console.info(`Step ${step.id} liké ! Total : ${step.likes}`);
      // Logique d'ajout de like dans le step -- Si pas déjà aimé en fonction de l'user
    } else if (action === 'comment') {
      console.info(`Afficher les commentaires du step ${step.id}`);
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
