import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CarbonApiService, CalculationRow } from '../../services/carbon-api.service';

type LevelFilter = 'Todos' | 'Bajo' | 'Medio' | 'Alto';

@Component({
  selector: 'app-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './history.component.html',
  styleUrl: './history.component.scss',
})
export class HistoryComponent implements OnInit {
  rows: CalculationRow[] = [];
  loading = false;
  error = '';
  filter: LevelFilter = 'Todos';

  constructor(private api: CarbonApiService) {}

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';

    this.api.getCalculations().subscribe({
      next: (data) => {
        const arr = Array.isArray(data) ? data : [];
        arr.sort((a, b) => {
          const da = new Date(a.created_at ?? 0).getTime();
          const db = new Date(b.created_at ?? 0).getTime();
          return db - da;
        });
        this.rows = arr;
        this.loading = false;
      },
      error: (err) => {
        console.error(err);
        this.rows = [];
        this.loading = false;
        this.error = 'No se pudo cargar el historial. Revisa backend/proxy.';
      },
    });
  }

  setFilter(v: LevelFilter): void {
    this.filter = v;
  }

  get viewRows(): CalculationRow[] {
    if (this.filter === 'Todos') return this.rows;
    return this.rows.filter((r) => (r.level ?? '').toLowerCase() === this.filter.toLowerCase());
  }

  levelClass(level?: string): string {
    const l = (level ?? '').toLowerCase();
    if (l === 'alto') return 'pill pill-alto';
    if (l === 'medio') return 'pill pill-medio';
    return 'pill pill-bajo';
  }

  formatDate(v?: string): string {
    if (!v) return '-';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return v;
    return d.toLocaleString();
  }

  fmt(n: any, decimals = 2): string {
    const v = Number(n);
    if (!Number.isFinite(v)) return (0).toFixed(decimals);
    return v.toFixed(decimals);
  }
}
