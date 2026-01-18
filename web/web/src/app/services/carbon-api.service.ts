import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CalculationPayload {
  stream_video_hours_week: number;
  gaming_hours_week: number;
  videocalls_hours_week: number;
  social_hours_week: number;
  cloud_hours_week: number;

  weeks_per_month: number;
  co2_per_kwh: number;

  total_kwh_month: number;
  total_co2_month: number;

  level: string;
  top_contribution: string;
}

export interface CalculationRow extends CalculationPayload {
  id: number;
  created_at: string;
}

@Injectable({ providedIn: 'root' })
export class CarbonApiService {
  private base = '/api';

  constructor(private http: HttpClient) {}

  health(): Observable<any> {
    return this.http.get(`${this.base}/health`);
  }

  getCalculations(): Observable<CalculationRow[]> {
    return this.http.get<CalculationRow[]>(`${this.base}/calculations`);
  }

  saveCalculation(payload: CalculationPayload): Observable<{ ok: boolean; id: number }> {
    return this.http.post<{ ok: boolean; id: number }>(`${this.base}/calculations`, payload);
  }
}
