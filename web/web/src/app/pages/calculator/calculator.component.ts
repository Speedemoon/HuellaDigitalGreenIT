import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CarbonApiService,
  CalculationPayload,
  CalculationRow,
} from '../../services/carbon-api.service';

type Level = 'Bajo' | 'Medio' | 'Alto';
type HourField = 'stream' | 'gaming' | 'videocalls' | 'social' | 'cloud';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss',
})
export class CalculatorComponent {
  // Inputs (horas/semana) -> null permite que el input quede vacío al enfocar
  stream: number | null = 0;
  gaming: number | null = 0;
  videocalls: number | null = 0;
  social: number | null = 0;
  cloud: number | null = 0;

  // Config
  weeksPerMonth: number | null = 4.345;
  co2PerKwh: number | null = 0.45;

  // Outputs
  totalKwhMonth = 0;
  totalCo2Month = 0;
  level: Level = 'Bajo';
  topContribution = '-';

  // UI
  saving = false;
  msg = '';
  saveError = '';

  // Factores kWh por hora (ajústalos si quieres)
  private readonly FACTORS = {
    stream: 0.08,
    gaming: 0.12,
    videocalls: 0.1,
    social: 0.05,
    cloud: 0.03,
  };

  constructor(private api: CarbonApiService) {}

  // ✅ Para que el 0 se REEMPLACE: si el valor es 0 al enfocar, lo limpia
  focusZero(field: HourField): void {
    if ((this as any)[field] === 0) (this as any)[field] = null;
  }

  // ✅ Si lo dejan vacío, al salir vuelve a 0
  blurZero(field: HourField): void {
    const v = (this as any)[field];
    if (v === null || v === undefined || v === '') (this as any)[field] = 0;
  }

  // ✅ Nombres en español por si tu HTML llama calcular/guardar/limpiar
  calcular(): void {
    this.msg = '';
    this.saveError = '';

    const s = this.toNum(this.stream);
    const g = this.toNum(this.gaming);
    const v = this.toNum(this.videocalls);
    const so = this.toNum(this.social);
    const c = this.toNum(this.cloud);

    const wk = this.toNum(this.weeksPerMonth, 4.345);
    const co2 = this.toNum(this.co2PerKwh, 0.45);

    const kwhWeek =
      s * this.FACTORS.stream +
      g * this.FACTORS.gaming +
      v * this.FACTORS.videocalls +
      so * this.FACTORS.social +
      c * this.FACTORS.cloud;

    this.totalKwhMonth = kwhWeek * wk;
    this.totalCo2Month = this.totalKwhMonth * co2;

    const parts: Array<[string, number]> = [
      ['Streaming', s * this.FACTORS.stream],
      ['Gaming', g * this.FACTORS.gaming],
      ['Videollamadas', v * this.FACTORS.videocalls],
      ['Redes sociales', so * this.FACTORS.social],
      ['Cloud', c * this.FACTORS.cloud],
    ];
    parts.sort((a, b) => b[1] - a[1]);
    this.topContribution = parts[0][1] > 0 ? parts[0][0] : '-';

    this.level = this.getLevel(this.totalCo2Month);
  }

  guardar(): void {
    this.saveError = '';
    this.msg = '';

    if (this.totalKwhMonth === 0 && this.totalCo2Month === 0) this.calcular();

    const payload: CalculationPayload = {
      stream_video_hours_week: this.toNum(this.stream),
      gaming_hours_week: this.toNum(this.gaming),
      videocalls_hours_week: this.toNum(this.videocalls),
      social_hours_week: this.toNum(this.social),
      cloud_hours_week: this.toNum(this.cloud),

      weeks_per_month: this.toNum(this.weeksPerMonth, 4.345),
      co2_per_kwh: this.toNum(this.co2PerKwh, 0.45),

      total_kwh_month: this.totalKwhMonth,
      total_co2_month: this.totalCo2Month,
      level: this.level,
      top_contribution: this.topContribution,
    };

    this.saving = true;
    this.api.saveCalculation(payload).subscribe({
      next: (_row: CalculationRow) => {
        this.saving = false;
        this.msg = 'Guardado ✅ (ve a Historial y presiona Actualizar)';
      },
      error: (err) => {
        this.saving = false;
        this.saveError = 'Error al guardar ❌ (revisa backend/proxy)';
        console.error(err);
      },
    });
  }

  limpiar(): void {
    this.stream = 0;
    this.gaming = 0;
    this.videocalls = 0;
    this.social = 0;
    this.cloud = 0;

    this.weeksPerMonth = 4.345;
    this.co2PerKwh = 0.45;

    this.totalKwhMonth = 0;
    this.totalCo2Month = 0;
    this.level = 'Bajo';
    this.topContribution = '-';
    this.msg = '';
    this.saveError = '';
  }

  private getLevel(co2: number): Level {
    if (co2 >= 50) return 'Alto';
    if (co2 >= 20) return 'Medio';
    return 'Bajo';
  }

  private toNum(x: any, fallback = 0): number {
    const v = Number(x);
    return Number.isFinite(v) ? v : fallback;
  }
}
