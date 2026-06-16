import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncate'
})
export class TruncatePipe implements PipeTransform {

   transform(value: any, limit: number = 30, ellipsis: string = '...'): string {
    if (value === null || value === undefined) return '';

    const str = value.toString();

    if (str.length <= limit) return str;

    return str.substring(0, limit) + ellipsis;
  }

}
