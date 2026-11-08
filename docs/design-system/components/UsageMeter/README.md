# UsageMeter

이번 달 남은 분석 횟수 카드예요. 남은 횟수를 막대 길이로 보여줘요(사용한 양이 아니라 남은 양).

`fs-card` 안에 라벨 + `fs-num-lg` 숫자, `fs-meter`(role="meter"), 초기화 안내. 0회면 `.is-empty`예요. 업그레이드 안내는 업로드 영역 자리의 `LockedPanel` 소진 카드가 맡고, 여기에는 초기화 안내만 둬요.
