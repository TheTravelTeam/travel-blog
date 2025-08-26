import { FooterComponent } from './../../components/footer/footer.component';
import { Component } from '@angular/core';
import { EditorComponent } from 'shared/editor/editor.component';
@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [EditorComponent, FooterComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export class HomePageComponent {
  articleContent = '';

  saveContent() {
    console.log(this.articleContent);
    this.articleContent = '';
  }
}
