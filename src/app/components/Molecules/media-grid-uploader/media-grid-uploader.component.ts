import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CloudinaryService } from '@service/cloudinary.service';
import { CommonModule } from '@angular/common';

/**
 * Minimal shape shared with consumers to describe an uploaded Cloudinary
 * asset (public identifier and secure delivery URL).
 */
export interface MediaItem {
  publicId: string;
  secureUrl: string;
}
@Component({
  selector: 'app-media-grid-uploader',
  imports: [CommonModule],
  templateUrl: './media-grid-uploader.component.html',
  styleUrl: './media-grid-uploader.component.scss',
})
export class MediaGridUploaderComponent {
  /** Liste courante d’éléments déjà téléversés ou sélectionnés. */
  @Input() items: MediaItem[] = [];

  /**
   * Dossier Cloudinary dans lequel les éléments seront archivés. Permet de
   * réutiliser le composant pour différents contextes (étapes, carnets…).
   */
  @Input() folder = 'travel-diaries/steps';

  /**
   * Nombre maximum de fichiers autorisés dans la grille. Les fichiers
   * supplémentaires sont ignorés lors de la sélection.
   */
  @Input() maxItems = 12;

  /** Flux émis à chaque modification de la liste complète des médias. */
  @Output() itemsChange = new EventEmitter<MediaItem[]>();

  /**
   * Émission dédiée à l’élément principal (premier média de la collection).
   * Utile pour déterminer la couverture ou l’image mise en avant.
   */
  @Output() primaryChange = new EventEmitter<MediaItem | null>();

  /** Permet aux parents de connaître l'état de téléversement en temps réel. */
  @Output() uploadingChange = new EventEmitter<boolean>();

  /** Indique à l’UI qu’un transfert vers Cloudinary est en cours. */
  uploading = false;

  /** Message d’erreur de la dernière tentative d’upload, si applicable. */
  error: string | null = null;

  constructor(private cloud: CloudinaryService) {}

  /**
   * Gestionnaire appelé lors de la sélection de fichiers via l’input natif.
   * Les fichiers sont téléversés séquentiellement pour conserver un code
   * simple et la collection locale est mise à jour à chaque réussite.
   */
  onPickFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    if (!files.length) return;

    const room = this.maxItems - this.items.length;
    const toUpload = files.slice(0, room);
    if (!toUpload.length) return;

    this.setUploading(true);
    this.error = null;

    // upload séquentiel pour la simplicité
    (async () => {
      for (const f of toUpload) {
        try {
          const res = await this.cloud.uploadImage(f, { folder: this.folder }).toPromise();
          if (res) {
            const item: MediaItem = { publicId: res.publicId, secureUrl: res.secureUrl };
            this.items = [...this.items, item];
            this.itemsChange.emit(this.items);
            if (this.items.length === 1) this.primaryChange.emit(item);
          }
        } catch (error) {
          console.error('Upload vers Cloudinary impossible', error);
          this.error = `Échec d'upload pour ${f.name}`;
        }
      }
      this.setUploading(false);
    })();
  }

  /**
   * Supprime un média de la grille et notifie les consommateurs des
   * changements. Le média suivant devient la nouvelle sélection primaire.
   */
  remove(index: number) {
    this.items = this.items.filter((_, i) => i !== index);
    this.itemsChange.emit(this.items);
    this.primaryChange.emit(this.items[0] ?? null);
  }

  /**
   * Génère une URL Cloudinary pour afficher une miniature allégée. On
   * s’appuie sur une transformation `c_fill` 160x160 pour les aperçus.
   */
  thumb(url: string) {
    return url.replace('/upload/', `/upload/c_fill,w_160,h_160,q_auto,f_auto/`);
  }

  private setUploading(state: boolean): void {
    if (this.uploading === state) {
      return;
    }
    this.uploading = state;
    this.uploadingChange.emit(this.uploading);
  }
}
