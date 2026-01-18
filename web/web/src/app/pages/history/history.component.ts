import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarbonApiService, CalculationRow } from '../../services/carbon-api.service';

import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

type LevelFilter = 'Todos' | 'Bajo' | 'Medio' | 'Alto';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrls: ['./history.component.scss'],
})
export class HistoryComponent implements OnInit {
  rows: CalculationRow[] = [];
  loading = false;
  errorMsg = '';

  filterLevel: LevelFilter = 'Todos';

  constructor(private api: CarbonApiService, private router: Router) {}

  ngOnInit(): void {
    this.load();

    // ✅ Auto refresca al volver a /historial
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => {
        if (this.router.url.includes('/historial')) {
          this.load();
        }
      });
  }

  setFilter(l: LevelFilter): void {
    this.filterLevel = l;
  }

  refresh(): void {
    this.load();
  }

  private load(): void {
    this.loading = true;
    this.errorMsg = '';

    this.api.getCalculations().subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        // Ordenar por fecha DESC (más nuevo arriba)
        this.rows = arr.sort((a, b) => {
          const da = new Date(a.created_at).getTime();
          const db = new Date(b.created_at).getTime();
          return db - da;
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No se pudo cargar el historial. Revisa backend/proxy.';
      },
    });
  }

  get viewRows(): CalculationRow[] {
    if (this.filterLevel === 'Todos') return this.rows;
    return this.rows.filter((r) => (r.level || '').toLowerCase() === this.filterLevel.toLowerCase());
  }

  get totalRegistros(): number {
    return this.viewRows.length;
  }

  get promedioKwh(): number {
    if (!this.viewRows.length) return 0;
    const s = this.viewRows.reduce((acc, r) => acc + (Number(r.total_kwh_month) || 0), 0);
    return s / this.viewRows.length;
  }

  get promedioCo2(): number {
    if (!this.viewRows.length) return 0;
    const s = this.viewRows.reduce((acc, r) => acc + (Number(r.total_co2_month) || 0), 0);
    return s / this.viewRows.length;
  }

  get ultimoNivel(): string {
    return this.viewRows.length ? (this.viewRows[0].level || '-') : '-';
  }

  formatDate(s: string): string {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString();
  }

  levelClass(level: string): string {
    const l = (level || '').toLowerCase();
    if (l === 'bajo') return 'lvl low';
    if (l === 'medio') return 'lvl mid';
    if (l === 'alto') return 'lvl high';
    return 'lvl';
  }

  isActiveFilter(l: LevelFilter): boolean {
    return this.filterLevel === l;
  }
}
