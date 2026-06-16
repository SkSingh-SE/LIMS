import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TestRequestNabl, TestRequestNablListResponse, TestRequestNablResponse } from '../models/testRequestNablModel';

@Injectable({
    providedIn: 'root',
})
export class TestRequestNablService {
    private apiUrl = environment.apiUrl + '/Nabl/TestRequest';
    private readonly Default_Note_Clause = '  1. For Metallurgical Testing, samples need to cut or machined. Therefore, sample will not remain intact after the testing. મેટલર્જીકલ ટેસ્ટિંગ માટે સેમ્પલને કાપવા અથવા મશીનિંગ કરવાની જરૂર પડે છે. તેથી ટેસ્ટિંગ પછી સેમ્પલ યથાવત રહેશે નહીં.'+
    '2. Returnable samples / left out material need to be collected within 7 days after testing date, henceforth, we will not be responsible to return it.'+
  'ટેસ્ટિંગ તારીખ પછી 7 દિવસની અંદર રિટર્નેબલ સેમ્પલ / બાકી રહેલ મટીરીયલ લઈ જવાનું રહેશે, ત્યારબાદ લેબોરેટરી જવાબદાર રહેશે નહીં.'

    constructor(private http: HttpClient) {}

    getDefaultNoteClause():string{
        return this.Default_Note_Clause;
    }
    getAll(params?: any): Observable<TestRequestNablListResponse> {
        return this.http.post<TestRequestNablListResponse>(this.apiUrl + '/list', params || {});
    }

    getById(id: number): Observable<TestRequestNabl | null> {
        return this.http.get<TestRequestNabl>(`${this.apiUrl}/details/${id}`);
    }

    create(data: TestRequestNabl): Observable<TestRequestNablResponse> {
        return this.http.post<TestRequestNablResponse>(`${this.apiUrl}/save`, data);
    }

    update(id: number, data: TestRequestNabl): Observable<TestRequestNablResponse> {
        data.id = id;
        return this.http.post<TestRequestNablResponse>(`${this.apiUrl}/save`, data);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/delete/${id}`);
    }
}
