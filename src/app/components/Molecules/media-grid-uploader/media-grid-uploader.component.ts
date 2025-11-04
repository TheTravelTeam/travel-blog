import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CloudinaryService } from '@service/cloudinary.service';
import { CommonModule } from '@angular/common';

/**
 * Minimal shape shared with consumers to describe an uploaded Cloudinary
 * asset (public identifier and secure delivery URL).
 */
export interface MediaItem {
  /** Optional identifier returned by the API once the media metadata is persisted. */
  id?: number | null;
  /** Cloudinary public identifier once the asset is uploaded. */
  publicId: string | null;
  /** Secure URL (Cloudinary ou object URL local tant que l'upload n'est pas fait). */
  secureUrl: string;
  /** Fichier sélectionné mais pas encore transféré sur Cloudinary lorsque l'upload est différé. */
  file?: File;
  /** Indique si le média a été synchronisé côté Cloudinary. */
  uploaded?: boolean;
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

  /**
   * Lorsque false, les fichiers sont ajoutés à la grille mais ne sont téléversés vers
   * Cloudinary qu'à l'appel explicite de {@link ensureUploaded}. Utile pour attendre la
   * validation d'un formulaire avant de stocker le média.
   */
  @Input() autoUpload = true;

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

    if (!this.autoUpload) {
      const pendingItems = toUpload.map((file) => ({
        id: null,
        publicId: null,
        secureUrl: URL.createObjectURL(file),
        file,
        uploaded: false,
      }));
      this.items = [...this.items, ...pendingItems];
      this.itemsChange.emit([...this.items]);
      if (this.items.length) {
        this.primaryChange.emit(this.items[0]);
      }
      return;
    }

    this.setUploading(true);
    this.error = null;

    // upload séquentiel pour la simplicité
    (async () => {
      for (const f of toUpload) {
        try {
          const res = await this.cloud.uploadImage(f, { folder: this.folder }).toPromise();
          if (res) {
            const item: MediaItem = {
              id: null,
              publicId: res.publicId,
              secureUrl: res.secureUrl,
              uploaded: true,
            };
            this.items = [...this.items, item];
            this.itemsChange.emit([...this.items]);
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
    const [removed] = this.items.splice(index, 1);
    if (removed && removed.secureUrl.startsWith('blob:')) {
      URL.revokeObjectURL(removed.secureUrl);
    }
    this.items = [...this.items];
    this.itemsChange.emit([...this.items]);
    this.primaryChange.emit(this.items[0] ?? null);
  }

  /**
   * Génère une URL Cloudinary pour afficher une miniature allégée. On
   * s’appuie sur une transformation `c_fill` 160x160 pour les aperçus.
   */
  thumb(url: string) {
    if (!url.includes('/upload/')) {
      return url;
    }
    return url.replace('/upload/', `/upload/c_fill,w_160,h_160,q_auto,f_auto/`);
  }

  /**
   * Téléverse les fichiers encore en attente lorsque `autoUpload` vaut `false`.
   * Les appels sont séquentiels pour conserver un flux simple. La méthode rejette
   * si un upload échoue afin que le parent puisse empêcher la soumission.
   */
  async ensureUploaded(): Promise<void> {
    const pending = this.items.filter((item) => item.file && !item.uploaded);
    if (!pending.length) {
      return;
    }

    this.setUploading(true);
    this.error = null;

    for (const item of pending) {
      const file = item.file;
      if (!file) {
        continue;
      }

      try {
        const res = await this.cloud.uploadImage(file, { folder: this.folder }).toPromise();
        if (!res) {
          throw new Error('Réponse Cloudinary vide');
        }
        if (item.secureUrl.startsWith('blob:')) {
          URL.revokeObjectURL(item.secureUrl);
        }
        item.publicId = res.publicId;
        item.secureUrl = res.secureUrl;
        item.file = undefined;
        item.uploaded = true;
      } catch (error) {
        console.error('Upload vers Cloudinary impossible', error);
        this.error = `Échec d'upload pour ${file.name}`;
        this.setUploading(false);
        throw error;
      }
    }

    this.items = [...this.items];
    this.itemsChange.emit([...this.items]);
    this.primaryChange.emit(this.items[0] ?? null);
    this.setUploading(false);
  }

  /** Vide la grille et libère les éventuelles URLs locales créées pour les aperçus. */
  clear(): void {
    this.items.forEach((item) => {
      if (item.secureUrl.startsWith('blob:')) {
        URL.revokeObjectURL(item.secureUrl);
      }
    });
    this.items = [];
    this.itemsChange.emit([]);
    this.primaryChange.emit(null);
    this.error = null;
    this.setUploading(false);
  }

  private setUploading(state: boolean): void {
    if (this.uploading === state) {
      return;
    }
    this.uploading = state;
    this.uploadingChange.emit(this.uploading);
  }
}
