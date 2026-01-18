import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalculationPayload {
  stream_video_hours_week: number;
  gaming_hours_week: number;
  videocalls_hours_week: number;
  social_hours_week: number;
  cloud_hours_week: number;

  weeks_per_month: number; // ej. 4.345
  co2_per_kwh: number;     // ej. 0.45

  // opcional (si tu backend los guarda)
  total_kwh_month?: number;
  total_co2_month?: number;
  level?: string;
  top_contribution?: string;
}

export interface CalculationRow extends CalculationPayload {
  id?: number;
  created_at?: string;
}

@Injectable({ providedIn: 'root' })
export class CarbonApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  // 👉 Si tu backend usa otra ruta (ej. /api/history), cambia aquí:
  saveCalculation(payload: CalculationPayload): Observable<CalculationRow> {
    return this.http.post<CalculationRow>(`${this.base}/calculations`, payload);
  }

  getCalculations(): Observable<CalculationRow[]> {
    return this.http.get<CalculationRow[]>(`${this.base}/calculations`);
  }
}
