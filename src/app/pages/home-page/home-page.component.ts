import { VisualTripCardComponent } from 'components/Molecules/Card-ready-to-use/visual-trip-card/visual-trip-card.component';
import { FooterComponent } from 'components/Molecules/footer/footer.component';
import { Component, inject } from '@angular/core';
import { CardComponent } from 'components/Atoms/Card/card.component';
import { ButtonComponent } from 'components/Atoms/Button/button.component';
import { ChipComponent } from 'components/Atoms/chip/chip.component';
import { IconComponent } from 'components/Atoms/Icon/icon.component';
import { CommonModule } from '@angular/common';
import { BreakpointService } from '@service/breakpoint.service';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    FooterComponent,
    VisualTripCardComponent,
    CardComponent,
    ButtonComponent,
    ChipComponent,
    IconComponent,
    CommonModule,
  ],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  articleContent = '';

  public breakpoint = inject(BreakpointService);

  saveContent() {
    console.info(this.articleContent);
    this.articleContent = '';
  }

  cards = [
    {
      id: 1,
      title: 'Thailande',
      description: 'Circuit à Kho Tao',
      image: 'Images/paysage.jpg',
      author: 'autor',
      dateCreation: '22/03/2025',
    },
    {
      id: 2,
      title: 'Vietnam',
      description: 'Découverte du delta du Mékong',
      image: 'Images/paysage.jpg',
      author: 'autor',
      dateCreation: '15/04/2025',
    },
    {
      id: 3,
      title: 'Indonésie',
      description: 'Bali et ses temples',
      image: 'Images/paysage.jpg',
      author: 'autor',
      dateCreation: '01/05/2025',
    },
    {
      id: 4,
      title: 'Japon',
      description: 'Tokyo et Kyoto',
      image: 'Images/paysage.jpg',
      author: 'autor',
      dateCreation: '10/06/2025',
    },
  ];

  articles = [
    { id: 1, src: 'Images/paysage.jpg', title: 'Thailand' },
    { id: 2, src: 'Images/paysage.jpg', title: 'Japan' },
    { id: 3, src: 'Images/paysage.jpg', title: 'Iceland' },
    { id: 4, src: 'Images/paysage.jpg', title: 'Canada' },
    { id: 5, src: 'Images/paysage.jpg', title: 'Morocco' },
    { id: 6, src: 'Images/paysage.jpg', title: 'Italy' },
  ];
}
