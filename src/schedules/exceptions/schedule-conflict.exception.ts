import { ConflictException } from "@nestjs/common";

export class ScheduleConflictException extends ConflictException {
  constructor() {
    super(
      "일정 정보가 다른 사용자에 의해 수정되었습니다. 최신 정보를 다시 불러온 후 수정해주세요.",
    );
  }
}
