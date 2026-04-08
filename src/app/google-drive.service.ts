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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();
      allImages = allImages.concat(data.files || []);
      pageToken = data.nextPageToken || '';
    } while (pageToken);

    // Filtrar SOLO imágenes verticales (height > width)
    return allImages.filter(img => {
      const meta = img.imageMediaMetadata;
      return meta && meta.height && meta.width && meta.height > meta.width;
    });
  }

  async getImageBlobUrl(fileId: string, accessToken: string): Promise<string> {
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    if (!response.ok) {
      throw new Error('Error al descargar la imagen');
    }

    const blob = await response.blob();
    return URL.createObjectURL(blob);
  }
}