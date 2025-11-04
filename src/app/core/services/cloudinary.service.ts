import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/**
 * Paramètres facultatifs acceptés lors de l'upload (dossier Cloudinary, identifiant public, type de ressource).
 */
export interface CloudinaryUploadOptions {
  folder?: string;
  publicId?: string;
  resourceType?: 'image' | 'video' | 'raw' | 'auto';
}

/**
 * Résultat standardisé renvoyé après téléversement côté backend.
 */
export interface CloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  resourceType?: string;
}

@Injectable({ providedIn: 'root' })
export class CloudinaryService {
  private readonly apiUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  /**
   * Délègue l'upload d'un fichier au backend Spring qui gère la signature Cloudinary et le transfert.
   *
   * @param file binaire sélectionné par l'utilisateur
   * @param options options facultatives (dossier, identifiant public, type de ressource)
   */
  uploadImage(file: File, options: CloudinaryUploadOptions = {}): Observable<CloudinaryUploadResult> {
    const formData = new FormData();
    formData.append('file', file);

    if (options.folder) {
      formData.append('folder', options.folder);
    }

    if (options.publicId) {
      formData.append('publicId', options.publicId);
    }

    if (options.resourceType) {
      formData.append('resourceType', options.resourceType);
    }

    return this.http.post<CloudinaryUploadResult>(`${this.apiUrl}/cloudinary/upload`, formData);
  }
}
