import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { FormsModule } from '@angular/forms';
import { Step } from '@model/step.model';
import { Media } from '@model/media.model';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { CommonModule } from '@angular/common';
import { DividerComponent } from 'components/Atoms/Divider/divider.component';
import { BreakpointService } from '@service/breakpoint.service';
import { AvatarComponent } from '../../components/Atoms/avatar/avatar.component';
import { TravelMapStateService } from '@service/travel-map-state.service';
import { ActivatedRoute, Router } from '@angular/router';
import { UserService } from '@service/user.service';
import { User } from '@model/user.model';
import { Subscription } from 'rxjs';
import { take } from 'rxjs/operators';

type DiaryOwnerInfo = {
  id: number;
  avatar?: string | null;
  label: string;
};

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
  templateUrl: './diary-page.component.html',
  styleUrl: './diary-page.component.scss',
})
export class DiaryPageComponent implements OnInit, OnDestroy {
  readonly state = inject(TravelMapStateService);
  private userService = inject(UserService);

  private breakpointService = inject(BreakpointService);
  isTabletOrMobile = this.breakpointService.isMobileOrTablet;

  private activatedRoute = inject(ActivatedRoute);
  private router = inject(Router);

  @ViewChild('detailPanel') detailPanelRef!: ElementRef<HTMLDivElement>;

  private readonly diaryOwner = signal<DiaryOwnerInfo | null>(null);
  private ownerFetchSub: Subscription | null = null;

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

    effect(
      () => {
        this.resolveDiaryOwner(this.state.currentDiary());
      },
      { allowSignalWrites: true }
    );
  }

  readonly diaryOwnerInfo = computed<DiaryOwnerInfo | null>(() => this.diaryOwner());

  readonly isDiaryOwner = computed(() => {
    const owner = this.diaryOwnerInfo();
    if (!owner) {
      return false;
    }

    const current = this.userService.currentUserId();
    return typeof current === 'number' && owner.id === current;
  });

  getOwnerLinkAriaLabel(owner: DiaryOwnerInfo): string {
    const label = owner.label?.trim();
    return label ? `Voir les carnets de ${label}` : 'Voir les carnets de cet utilisateur';
  }

  onOwnerNavigate(owner: DiaryOwnerInfo | null): void {
    if (!owner) {
      return;
    }

    this.router.navigate(['/travels', 'users', owner.id]).catch(() => {
      /* Navigation errors ignored */
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

  ngOnDestroy(): void {
    this.ownerFetchSub?.unsubscribe();
  }

  private resolveDiaryOwner(diary: unknown) {
    this.ownerFetchSub?.unsubscribe();
    this.ownerFetchSub = null;

    if (!diary || typeof diary !== 'object') {
      this.diaryOwner.set(null);
      return;
    }

    const diaryWithUser = diary as { user?: unknown; userId?: number };
    const userField = diaryWithUser.user;
    const fallbackId = typeof diaryWithUser.userId === 'number' ? diaryWithUser.userId : undefined;

    if (userField && typeof userField === 'object') {
      const user = userField as Partial<User>;
      const id = typeof user.id === 'number' ? user.id : fallbackId;

      if (typeof id !== 'number') {
        this.diaryOwner.set(null);
        return;
      }

      this.diaryOwner.set({
        id,
        avatar: user.avatar ?? null,
        label: user.username ?? user.userName ?? '',
      });
      return;
    }

    const ownerId = typeof userField === 'number' ? userField : fallbackId;

    if (typeof ownerId !== 'number') {
      this.diaryOwner.set(null);
      return;
    }

    this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
    this.fetchDiaryOwner(ownerId);
  }

  private fetchDiaryOwner(ownerId: number) {
    this.ownerFetchSub = this.userService
      .getUserProfile(ownerId)
      .pipe(take(1))
      .subscribe({
        next: (profile) => {
          this.diaryOwner.set({
            id: profile.id,
            avatar: profile.avatar ?? null,
            label: profile.pseudo || profile.email || '',
          });
        },
        error: () => {
          this.diaryOwner.set({ id: ownerId, avatar: null, label: '' });
        },
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

  /** URL de couverture pour le panneau latéral (alias pratique pour le template). */
  getDiaryCover(): string {
    const diary = this.state.currentDiary();
    return diary ? this.state.getDiaryCoverUrl(diary) : '';
  }

  /** Renvoie les médias d'une étape via le service partagé. */
  getStepMedias(step: Step): Media[] {
    return this.state.getStepMediaList(step);
  }
}
