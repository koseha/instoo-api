import { format } from "date-fns";
import { toZonedTime, fromZonedTime } from "date-fns-tz";

export class TimeUtils {
  private static readonly KST: string = "Asia/Seoul";

  // KST 시간 → UTC 저장
  static toUtc(kstTimeString: string): Date {
    const result = fromZonedTime(kstTimeString, this.KST);
    return result;
  }

  // UTC → KST 응답
  static toKst(utcDate: Date): string {
    const kstDate = toZonedTime(utcDate, this.KST);
    const result = format(kstDate, "yyyy-MM-dd'T'HH:mm:ssxxx");
    return result;
  }

  // UTC → KST 시간만 (HH:mm 형식)
  static toKstTimeOnly(utcDate: Date): string {
    const kstDate = toZonedTime(utcDate, this.KST);
    return format(kstDate, "HH:mm");
  }

  // KST 날짜 범위를 UTC 시간 범위로 변환
  static getDateRangeInUtc(startDate: string, endDate: string): { startTime: Date; endTime: Date } {
    // KST 기준 startDate 00:00:00 → UTC
    const kstStartTime = `${startDate}T00:00:00+09:00`;
    const utcStartTime = this.toUtc(kstStartTime);

    // KST 기준 endDate 23:59:59.999 → UTC
    const kstEndTime = `${endDate}T23:59:59.999+09:00`;
    const utcEndTime = this.toUtc(kstEndTime);

    return {
      startTime: utcStartTime,
      endTime: utcEndTime,
    };
  }

  // 날짜 문자열을 KST 기준 Date 객체로 변환
  static parseKstDate(dateString: string): Date {
    const kstDateString = `${dateString}T00:00:00+09:00`;
    return this.toUtc(kstDateString);
  }

  // UTC Date를 KST 날짜 문자열로 변환 (YYYY-MM-DD)
  static toKstDateString(utcDate: Date): string {
    const kstDate = toZonedTime(utcDate, this.KST);
    return format(kstDate, "yyyy-MM-dd");
  }
}
