# TacDeform — Anonymous Project Page

심사용 정적 프로젝트 페이지입니다. 흰 배경, 단일 열, 로컬 리소스만 사용합니다.

구성 순서: 제목·익명 저자·PDF 링크 → 익명 호스팅 안내 문구 → 티저 → **Video** → **Qualitative results**(탭 전환 + 클릭 확대) → Abstract → Method → Quantitative results(Table I) → Experimental setup.

## 사용

- `index.html`과 `static/`을 같은 위치에 두고 웹 루트에 업로드합니다. 하위 경로에서도 상대 링크가 유지됩니다.
- 논문에 넣을 URL은 리뷰어가 로그인 없이 접근 가능한 익명 호스트 주소를 사용하세요.

## 영상 넣기

- `static/videos/overview.mp4`에 파일을 두면 상단 Video 섹션의 플레이어가 활성화됩니다.
- 파일이 없으면 해당 자리에 "Video slot" 안내 상자가 표시됩니다(빈 플레이어나 깨진 링크가 노출되지 않습니다).
- 업로드 전 영상의 음성·화면 텍스트·파일 메타데이터에 식별 정보가 없는지 확인하세요. 외부 임베드(YouTube 등)는 익명성 때문에 사용하지 않았습니다.

## Qualitative results

- 탭 3개: Response field(Fig. 4), Dense trajectories(Fig. 5), Deformation prediction(Fig. 6).
- 그림을 클릭하면 확대 뷰어가 열립니다. 좌/우 방향키, Home/End로 탭 이동이 가능합니다.
- 자바스크립트를 끄면 세 패널이 모두 펼쳐지고 그림 링크는 원본 이미지로 열립니다.
- 탭을 추가하려면 `.tabs` 안에 `role="tab"` 버튼과 같은 id 규칙의 `role="tabpanel"` 블록을 한 쌍 더 넣으면 됩니다. 스크립트 수정은 필요 없습니다.

## 수정 위치

- 본문·제목·표: `index.html`
- 색상·레이아웃·반응형: `static/css/style.css`
- 탭·영상 자리·확대 뷰어 동작: `static/js/main.js`
- 논문: `static/pdfs/paper.pdf` / 그림: `static/images/` / 영상: `static/videos/`

## 논문에서 확인이 필요한 사항

- 첨부 PDF는 `[DRAFT]` 표시와 편집 지시문이 남아 있는 초안입니다. 제출 전 확정된 익명 PDF로 교체하세요.
- Fig. 3의 목록에는 Scrub Brush가, Table I와 Fig. 6에는 Silicone Tube가 있습니다. 페이지의 표는 Table I를 그대로 따르며 전체 객체 목록은 단정하지 않았습니다.
- Fig. 1(teaser)에는 이전 표기인 "Stiffness proxy"와 k-hat이 남아 있습니다. 페이지 설명은 본문의 최신 정의인 relative response proxy를 사용하므로, 최종 teaser 표기를 맞추는 것이 좋습니다.
- 결과는 객체별 모델의 동일 객체 내 held-out interaction 평가입니다. 미학습 객체로의 일반화는 주장하지 않습니다.

## 익명화

저자·소속·개인 링크·트래커·외부 폰트/스크립트/영상 임베드를 넣지 않았습니다. 모든 리소스는 로컬 파일이며, `noindex`·`robots.txt`·`no-referrer`·CSP를 적용했습니다. 검색 제외는 접근 제어가 아니므로 배포 주소와 호스팅 계정 자체의 익명성도 확인하세요. `_headers`는 지원하는 호스트에서만 적용됩니다.

## Template attribution

Page structure adapted from Academic Project Page Template and Nerfies; the attribution and CC BY-SA 4.0 link are kept in the footer. Research content and figures come from the supplied manuscript; the template license is not a claim about the manuscript's license.

## Interactive gallery data

Qualitative results 갤러리의 각 탭(`response` / `trajectories` / `prediction`)은 객체별로 `static/data/<view>/<object-id>.json`을 읽습니다. 파일이 없는 객체는 칩을 눌렀을 때 "No export yet" 안내가 뜹니다. 객체 id는 `toy-hammer`, `sponge-brush`, `pointer-stick`, `shoe`, `bottle`, `silicone-tube`입니다.

JSON 형식:

```json
{"id":"bottle","name":"Bottle","units":"mm","frames":18,
 "object":[x,y,z, ...],
 "tracks":[[x,y,z, ...], ...],
 "contact":[x,y,z]}
```

`object`는 정적 포인트 클라우드, `tracks`는 프레임마다 모든 tactile anchor의 위치입니다(프레임당 하나의 평탄 배열). 좌표는 mm, 소수점 한 자리로 반올림합니다.

`tools/plotly_to_tacdeform.py`가 기존 Plotly `tracking_animation.html` 출력을 이 형식으로 변환합니다.

```
python3 tools/plotly_to_tacdeform.py tracking_animation.html bottle "Bottle" static/data/trajectories
```

포인트는 6,000개, 트랙은 700개로 다운샘플링합니다(스크립트 상단 상수). 84MB짜리 Plotly HTML이 약 230KB JSON이 됩니다.
