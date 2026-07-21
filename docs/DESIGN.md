# Design Guide

health-web·health-mobile 공용 디자인 토큰. `../docs/DESIGN-apple.md`(Apple 웹사이트 분석 원본)에서 실제로 쓰이는 값만 뽑아 고정한 것이며, 두 프로젝트는 이 문서에 정의된 값만 사용한다. 값이 더 필요해지면 `DESIGN-apple.md`에서 가져오되 반드시 이 문서에 먼저 추가한 뒤 코드에 반영한다.

## 목차
- [1. 색상](#1-색상)
- [2. 타이포그래피](#2-타이포그래피)
- [3. 반경 (Radius)](#3-반경-radius)
- [4. 간격 (Spacing)](#4-간격-spacing)
- [5. 상태 배지 보조 색상](#5-상태-배지-보조-색상)

## 1. 색상

| 토큰 | 값 | 용도 |
|---|---|---|
| `color-primary` | `#0066cc` | 주 강조색 — 버튼·링크 등 모든 인터랙션 요소 |
| `color-primary-focus` | `#0071e3` | 포커스 링 |
| `color-primary-on-dark` | `#2997ff` | 어두운 배경 위 링크 |
| `color-ink` | `#1d1d1f` | 기본 텍스트 |
| `color-body-on-dark` | `#ffffff` | 어두운 배경 위 텍스트 |
| `color-body-muted` | `#cccccc` | 어두운 배경 위 보조 텍스트 |
| `color-ink-muted-80` | `#333333` | 밝은 배경 위 보조 텍스트(약간 연함) |
| `color-ink-muted-48` | `#7a7a7a` | 비활성/설명 텍스트 |
| `color-divider-soft` | `#f0f0f0` | 연한 구분선 |
| `color-hairline` | `#e0e0e0` | 카드 테두리 |
| `color-canvas` | `#ffffff` | 기본 배경(카드 등) |
| `color-canvas-parchment` | `#f5f5f7` | 페이지 배경 |
| `color-surface-pearl` | `#fafafc` | 보조 버튼 배경 |
| `color-on-primary` | `#ffffff` | 강조색 위 텍스트 |

## 2. 타이포그래피

| 폰트 토큰 | 값 |
|---|---|
| `font-display` | `SF Pro Display, system-ui, -apple-system, sans-serif` |
| `font-text` | `SF Pro Text, system-ui, -apple-system, sans-serif` |

화면 제목 등 큰 텍스트는 `font-display`, 본문·라벨·버튼은 `font-text`를 쓴다. 크기·굵기는 화면별로 필요한 값을 이 표에 없으면 추가하고 정한다(현재는 로그인 화면 기준 28px/제목, 17px/본문, 13~14px/라벨·캡션 정도만 확정됨).

## 3. 반경 (Radius)

| 토큰 | 값 |
|---|---|
| `radius-xs` | 5px |
| `radius-sm` | 8px |
| `radius-md` | 11px |
| `radius-lg` | 18px |
| `radius-pill` | 9999px |

## 4. 간격 (Spacing)

| 토큰 | 값 |
|---|---|
| `space-xxs` | 4px |
| `space-xs` | 8px |
| `space-sm` | 12px |
| `space-md` | 17px |
| `space-lg` | 24px |
| `space-xl` | 32px |
| `space-xxl` | 48px |

## 5. 상태 배지 보조 색상

건강데이터 상태(정상/주의/위험) 배지 전용 색상. `DESIGN-apple.md`에는 정의돼 있지 않은 이 프로젝트 전용 값이다.

| 토큰 | 값 | 용도 |
|---|---|---|
| `color-status-success` | `#1a8754` | 정상 |
| `color-status-warning` | `#c77700` | 주의 |
| `color-status-danger` | `#d92d20` | 위험/에러 |
