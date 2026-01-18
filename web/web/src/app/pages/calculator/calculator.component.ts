import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CarbonApiService, CalculationPayload } from '../../services/carbon-api.service';

@Component({
  selector: 'app-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calculator.component.html',
  styleUrl: './calculator.component.scss'
})
export class CalculatorComponent {

  // ✅ Horas por semana (vacío al inicio)
  stream: number | null = null;
  gaming: number | null = null;
  videocalls: number | null = null;
  social: number | null = null;
  cloud: number | null = null;

  // Config (deja tus defaults)
  weeksPerMonth = 4.345;
  co2PerKwh = 0.45;

  // Resultados
  totalKwhMonth = 0;
  totalCo2Month = 0;
  level = '';
  topContribution = '';

  // UI
  saving = false;
  msg = '';

  // Factores (kWh por hora aprox.) — ajustables
  private readonly FACTORS = {
    stream: 0.095,
    gaming: 0.11,
    videocalls: 0.09,
    social: 0.04,
    cloud: 0.07
  };

  constructor(private api: CarbonApiService) {}

  // ✅ Formatos para mostrar
  get totalKwhMonthFmt(): string {
    return this.totalKwhMonth.toFixed(2);
  }
  get totalCo2MonthFmt(): string {
    return this.totalCo2Month.toFixed(2);
  }

  calcular(): void {
    const stream = this.stream ?? 0;
    const gaming = this.gaming ?? 0;
    const videocalls = this.videocalls ?? 0;
    const social = this.social ?? 0;
    const cloud = this.cloud ?? 0;

    const kwhWeek =
      (stream * this.FACTORS.stream) +
      (gaming * this.FACTORS.gaming) +
      (videocalls * this.FACTORS.videocalls) +
      (social * this.FACTORS.social) +
      (cloud * this.FACTORS.cloud);

    this.totalKwhMonth = kwhWeek * (this.weeksPerMonth || 0);
    this.totalCo2Month = this.totalKwhMonth * (this.co2PerKwh || 0);

    this.level = this.classifyLevel(this.totalCo2Month);
    this.topContribution = this.getTopContribution(stream, gaming, videocalls, social, cloud);

    this.setMsg('Cálculo actualizado ✅');
  }

  guardar(): void {
    // Asegura cálculos antes de guardar
    this.calcular();

    const payload: CalculationPayload = {
      stream_video_hours_week: this.stream ?? 0,
      gaming_hours_week: this.gaming ?? 0,
      videocalls_hours_week: this.videocalls ?? 0,
      social_hours_week: this.social ?? 0,
      cloud_hours_week: this.cloud ?? 0,

      weeks_per_month: this.weeksPerMonth,
      co2_per_kwh: this.co2PerKwh,

      total_kwh_month: Number(this.totalKwhMonth.toFixed(2)),
      total_co2_month: Number(this.totalCo2Month.toFixed(2)),

      level: this.level || '-',
      top_contribution: this.topContribution || '-'
    };

    this.saving = true;
    this.api.saveCalculation(payload).subscribe({
      next: () => {
        this.saving = false;
        this.setMsg('Guardado en historial ✅');
      },
      error: () => {
        this.saving = false;
        this.setMsg('Error al guardar ❌');
      }
    });
  }

  limpiar(): void {
    this.stream = null;
    this.gaming = null;
    this.videocalls = null;
    this.social = null;
    this.cloud = null;

    this.totalKwhMonth = 0;
    this.totalCo2Month = 0;
    this.level = '';
    this.topContribution = '';
    this.msg = '';
  }

  private classifyLevel(co2Month: number): string {
    if (co2Month <= 3) return 'Bajo';
    if (co2Month <= 8) return 'Medio';
    return 'Alto';
  }

  private getTopContribution(
    stream: number,
    gaming: number,
    videocalls: number,
    social: number,
    cloud: number
  ): string {
    const contributions = [
      { label: 'Streaming', value: stream * this.FACTORS.stream },
      { label: 'Gaming', value: gaming * this.FACTORS.gaming },
      { label: 'Videollamadas', value: videocalls * this.FACTORS.videocalls },
      { label: 'Redes sociales', value: social * this.FACTORS.social },
      { label: 'Cloud', value: cloud * this.FACTORS.cloud }
    ];

    contributions.sort((a, b) => b.value - a.value);
    return contributions[0]?.value > 0 ? contributions[0].label : '-';
  }

  private setMsg(text: string, ms = 2500): void {
    this.msg = text;
    setTimeout(() => (this.msg = ''), ms);
  }
}
