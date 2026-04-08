import { Component, OnDestroy, OnInit } from '@angular/core';
import { GoogleDriveService, DriveImage } from './google-drive.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.scss'],        // ← Cambiado a app.scss
  standalone: false
})
export class AppComponent implements OnInit, OnDestroy {

  token: string = '';
  folderId: string = '';
  displayTime: number = 60;

  images: DriveImage[] = [];
  currentImageUrl: string = '';
  isSlideshowRunning: boolean = false;
  loading: boolean = false;
  error: string = '';

  private intervalId: any;
  private lastObjectUrl: string = '';

  constructor(private drive: GoogleDriveService) { }

  async cargarImagenes() {
    if (!this.token || !this.folderId) {
      this.error = '❌ Token y Folder ID son obligatorios';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      this.images = await this.drive.getAllVerticalImages(this.folderId, this.token);

      if (this.images.length === 0) {
        this.error = '⚠️ No se encontraron imágenes verticales en la carpeta.';
      } else {
        this.error = `✅ ${this.images.length} imágenes verticales cargadas`;
      }
    } catch (err: any) {
      this.error = `❌ Error: ${err.message || err}`;
      console.error(err);
    } finally {
      this.loading = false;
    }
  }

  iniciarSlideshow() {
    if (this.images.length === 0) return;
    this.isSlideshowRunning = true;
    this.mostrarImagenAleatoria();

    this.intervalId = setInterval(() => {
      this.mostrarImagenAleatoria();
    }, this.displayTime * 1000);
  }

  detenerSlideshow() {
    this.isSlideshowRunning = false;
    if (this.intervalId) clearInterval(this.intervalId);
    this.limpiarUrlAnterior();
    this.currentImageUrl = '';
  }

  // Método público para que el HTML pueda llamarlo
  mostrarImagenAleatoria() {
    if (this.images.length === 0) return;

    const idx = Math.floor(Math.random() * this.images.length);
    const selected = this.images[idx];

    this.limpiarUrlAnterior();

    this.drive.getImageBlobUrl(selected.id, this.token).then(url => {
      this.currentImageUrl = url;
      this.lastObjectUrl = url;
    }).catch(e => {
      console.error('Error cargando imagen:', e);
      setTimeout(() => this.mostrarImagenAleatoria(), 2000);
    });
  }

  private limpiarUrlAnterior() {
    if (this.lastObjectUrl) {
      URL.revokeObjectURL(this.lastObjectUrl);
      this.lastObjectUrl = '';
    }
  }

  actualizarTiempo() {
    if (this.isSlideshowRunning && this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = setInterval(() => this.mostrarImagenAleatoria(), this.displayTime * 1000);
    }
  }

  ngOnInit() {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this.isSlideshowRunning) return;
      if (e.key === 'Escape') this.detenerSlideshow();
      if (e.key === ' ') {
        e.preventDefault();
        this.mostrarImagenAleatoria();
      }
    });
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.limpiarUrlAnterior();
  }
}