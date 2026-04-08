import { Injectable } from '@angular/core';

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  imageMediaMetadata?: {
    width: number;
    height: number;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleDriveService {

  async getAllVerticalImages(folderId: string, accessToken: string): Promise<DriveImage[]> {
    let allImages: DriveImage[] = [];
    let pageToken = '';

    do {
      const query = `'${folderId}' in parents and mimeType contains 'image/'`;
      const params = new URLSearchParams({
        q: query,
        fields: 'nextPageToken,files(id,name,mimeType,imageMediaMetadata(width,height))',
        pageSize: '1000',
        pageToken: pageToken
      });

      const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      // Handle token expiration
      if (response.status === 401) {
        throw new Error('❌ Token expirado. Por favor ingresa un token válido.');
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      allImages = allImages.concat(data.files || []);
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    // Filtrar SOLO imágenes verticales con validación de aspecto (height/width > 1.2)
    return allImages.filter(img => {
      const meta = img.imageMediaMetadata;
      if (!meta?.height || !meta?.width) return false;
      
      const aspectRatio = meta.height / meta.width;
      // Considerar vertical si la relación es > 1.2 (20% más alto que ancho)
      return aspectRatio > 1.2;
    });
  }

  async getImageBlobUrl(fileId: string, accessToken: string, timeoutMs: number = 10000): Promise<string> {
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('⏱️ Timeout al descargar la imagen'));
      }, timeoutMs);

      try {
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        // Handle token expiration
        if (response.status === 401) {
          clearTimeout(timeoutId);
          reject(new Error('❌ Token expirado. Por favor ingresa un token válido.'));
          return;
        }

        if (!response.ok) {
          clearTimeout(timeoutId);
          reject(new Error('Error al descargar la imagen'));
          return;
        }

        const blob = await response.blob();
        clearTimeout(timeoutId);
        resolve(URL.createObjectURL(blob));
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }
}