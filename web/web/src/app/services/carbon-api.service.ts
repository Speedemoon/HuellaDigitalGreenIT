import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface HistoryItem {
  id?: number | string;
  createdAt?: string;
  nivel?: 'Bajo' | 'Medio' | 'Alto' | string;
  co2Kg?: number;
  kwh?: number;
  actividad?: string;
  detalle?: any;
}

@Injectable({ providedIn: 'root' })
export class CarbonApiService {
  /**
   * IMPORTANTE:
   * - En PRODUCCIÓN (Railway): tu front y tu API viven en el MISMO dominio, entonces usa "/api"
   * - En LOCAL: el proxy.conf.json manda "/api" a http://localhost:3001
   */
  private readonly baseUrl = '/api';

  constructor(private http: HttpClient) {}

  // ====== FACTORES (si los usas) ======
  getFactors(): Observable<any> {
    return this.http
      .get(`${this.baseUrl}/factors`)
      .pipe(catchError(this.handleError));
  }

  // ====== CALCULO (si lo usas) ======
  calculate(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/calculate`, payload)
      .pipe(catchError(this.handleError));
  }

  // ====== HISTORIAL ======
  getHistory(filter?: 'Todos' | 'Bajo' | 'Medio' | 'Alto' | string): Observable<HistoryItem[]> {
    let params = new HttpParams();
    if (filter && filter !== 'Todos') params = params.set('nivel', filter);

    return this.http
      .get<HistoryItem[]>(`${this.baseUrl}/history`, { params })
      .pipe(catchError(this.handleError));
  }

  saveHistory(payload: any): Observable<any> {
    return this.http
      .post(`${this.baseUrl}/history`, payload)
      .pipe(catchError(this.handleError));
  }

  deleteHistory(id: number | string): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/history/${id}`)
      .pipe(catchError(this.handleError));
  }

  clearHistory(): Observable<any> {
    return this.http
      .delete(`${this.baseUrl}/history`)
      .pipe(catchError(this.handleError));
  }

  // ====== ERRORES ======
  private handleError(err: HttpErrorResponse) {
    const msg =
      typeof err.error === 'string'
        ? err.error
        : (err.error && err.error.message)
        ? err.error.message
        : err.message;

    return throwError(() => new Error(`API ${err.status}: ${msg}`));
  }
}
