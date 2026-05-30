import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private _dark = signal(false);
  isDark = this._dark.asReadonly();

  constructor() {
    const saved = localStorage.getItem('theme');
    const dark = saved ? saved === 'dark' : false;
    this._dark.set(dark);
    this.apply(dark);
  }

  toggle() {
    const dark = !this._dark();
    this._dark.set(dark);
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    this.apply(dark);
  }

  private apply(dark: boolean) {
    document.documentElement.classList.toggle('light-theme', !dark);
  }
}
