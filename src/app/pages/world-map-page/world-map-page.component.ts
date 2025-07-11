import { Component } from '@angular/core';
import { MapComponent } from '../../components/Atoms/map/map.component';
import { ProgressBarComponent } from '../../components/Atoms/progress-bar/progress-bar.component';
import { AccordionComponent } from '../../components/Atoms/accordion/accordion.component';
import { AccordionProps } from '../../model/accordion.model';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-world-map-page',
  imports: [MapComponent, ProgressBarComponent, AccordionComponent, FormsModule],
  templateUrl: './world-map-page.component.html',
  styleUrl: './world-map-page.component.scss',
})
export class WorldMapPageComponent {
  steps: (Pick<AccordionProps, 'id' | 'title' | 'date' | 'subTitle'> & { content: string })[] = [
    {
      id: 1,
      title: 'Arrivé à Madagascar',
      content: 'Me voilà arrivé sur cette Grande et magnifique île...',
      subTitle: 'Aéroport de Nosy Be',
      date: new Date('2018-11-08'),
    },
    {
      id: 2,
      title: 'Visite de Hell-ville',
      content: 'Il me fallait visiter cette visite atypique, avec sa triste réputation...',
      subTitle: 'Hell-Ville',
      date: new Date('2018-11-12'),
    },
    {
      id: 3,
      title: 'Tour des îles autour de Nosy Be',
      content:
        'Journée mémorable en découvrant les merveilles que la nature nous offre sur cette terre...',
      subTitle: 'Nosy Iranja',
      date: new Date('2018-11-15'),
    },
    {
      id: 4,
      title: 'Soirée malgache',
      content:
        "On peut dire que la musique malgache est très festive et entrainante, difficile de tenir le rytme jusqu'au bout de la nuit!",
      subTitle: 'Andilana Beach',
      date: new Date('2018-11-06'),
    },
  ];

  openedStepIds: number[] = [];
  completedSteps = 0;

  get totalStepCount(): number {
    return this.steps.length;
  }

  onAccordionToggle(stepId: number | undefined, isOpen: boolean) {
    if (!stepId) return;
    if (isOpen && !this.openedStepIds.includes(stepId)) {
      this.openedStepIds.push(stepId);
    } else if (!isOpen) {
      this.openedStepIds = this.openedStepIds.filter((id) => id !== stepId);
    }

    this.completedSteps = this.getProgressFromOpenedSteps();
  }

  getProgressFromOpenedSteps(): number {
    if (this.openedStepIds.length === 0) return 0;

    const maxOpened = Math.max(...this.openedStepIds);
    return maxOpened;
  }
}
