# UploadDropzone

대시보드 홈 맨 위의 업로드 영역이에요. 전체가 `<label class="fs-drop">`이라 어디를 눌러도 파일 선택이 열려요.

끌어다 놓는 중에는 `.is-over`(초록 바탕). 남은 횟수가 0이면 `.is-disabled`로 바꾸고 바로 아래에 업그레이드 안내(`Notice` + 주요 버튼)를 보여요. 형식·크기 오류는 영역 아래 `fs-notice--error`로 알려요.
