// 한국어 사전. en.ts 와 키가 1:1 로 일치해야 합니다.
// 스타일: 간결한 어휘, 버튼/메뉴는 종결어미 없이, 안내 문장은 평어.
// 브랜드명(GBL / GitHub / Finder)은 번역하지 않음.

import type { DictKey } from '#/main/i18n/en.ts'

export const ko: Record<DictKey, string> = {
  // ---- Menu --------------------------------------------------------------
  'menu.file': '파일',
  'menu.edit': '편집',
  'menu.view': '보기',
  'menu.window': '윈도우',
  'menu.help': '도움말',

  'menu.app.about': '{name} 정보',
  'menu.app.services': '서비스',
  'menu.app.hide': '{name} 가리기',
  'menu.app.hideOthers': '다른 항목 가리기',
  'menu.app.showAll': '모두 보기',
  'menu.app.quit': '{name} 종료',
  'menu.app.settings': '설정…',

  'menu.window.minimize': '최소화',
  'menu.window.zoom': '확대/축소',
  'menu.window.front': '모두 앞으로 가져오기',

  'menu.file.openRepo': '리포지토리 열기…',
  'menu.file.closeTab': '탭 닫기',
  'menu.file.settings': '설정…',
  'menu.file.quit': '종료',

  'menu.edit.cut': '잘라내기',
  'menu.edit.copy': '복사',
  'menu.edit.paste': '붙여넣기',
  'menu.edit.selectAll': '전체 선택',

  'menu.view.branches': '브랜치',
  'menu.view.log': '커밋 로그',
  'menu.view.status': '워킹 트리 상태',
  'menu.view.worktrees': '워크트리',
  'menu.view.refresh': '새로 고침',
  'menu.view.toggleTheme': '테마 전환',
  'menu.view.toggleDevTools': '개발자 도구',

  'menu.window.nextRepo': '다음 리포지토리',
  'menu.window.prevRepo': '이전 리포지토리',

  'menu.help.shortcuts': '키보드 단축키',

  // ---- Topbar ------------------------------------------------------------
  'topbar.open': '열기',
  'topbar.recents': '최근',
  'topbar.recentsEmpty': '최근에 연 리포지토리가 없습니다.',
  'topbar.help': '키보드 단축키 (?)',
  'topbar.settings': '설정 (⌘,)',

  // ---- Sidebar -----------------------------------------------------------
  'sidebar.repos': '리포지토리',
  'sidebar.empty.before': '툴바의 ',
  'sidebar.empty.openLabel': '열기',
  'sidebar.empty.after': ' 를 눌러 git 리포지토리를 추가하세요.',
  'sidebar.close': '닫기',
  'sidebar.missingTitle': '{n} 개 리포지토리를 복원하지 못했습니다',
  'sidebar.missingDismiss': '무시',

  // ---- Empty state -------------------------------------------------------
  'empty.title': '열린 리포지토리가 없습니다',
  'empty.body.before': '툴바의 ',
  'empty.body.openLabel': '열기',
  'empty.body.middle': ' 를 눌러 git 리포지토리를 추가하세요. 여러 리포지토리를 동시에 열고 사이드바에서 전환할 수 있습니다. ',
  'empty.body.after': ' 로 단축키 보기.',

  // ---- Right-side tabs ---------------------------------------------------
  'tab.branches': '브랜치',
  'tab.log': '로그',
  'tab.status': '상태',
  'tab.worktrees': '워크트리',
  'tab.fetching': '동기화',
  'tab.fetchingTitle': '백그라운드에서 fetch 진행 중',
  'tab.fetchFailed': '동기화 실패',
  'tab.fetchFailedTitle': '최근 백그라운드 fetch 가 실패했습니다 — 네트워크 또는 원격 저장소를 확인하세요.',

  // ---- Branches list -----------------------------------------------------
  'branches.empty': '이 리포지토리에 브랜치가 없습니다.',
  'branches.gone': '원격 사라짐',
  'branches.dirty': '변경',
  'branches.worktree': 'wt',
  'branches.noUpstream': '업스트림 없음',

  // ---- Log list ----------------------------------------------------------
  'log.empty': '표시할 커밋이 없습니다.',
  'log.emptyForBranch': '{branch} 에 표시할 커밋이 없습니다.',

  // ---- Status ------------------------------------------------------------
  'status.cleanTitle': '워킹 트리가 깨끗합니다',
  'status.cleanBody': '커밋할 변경 사항이 없습니다.',
  'status.staged': '스테이지됨',
  'status.stagedHint': '커밋 준비됨',
  'status.unstaged': '미스테이지',
  'status.unstagedHint': '워킹 트리에서 수정됨',
  'status.untracked': '미추적',
  'status.untrackedHint': '아직 추가되지 않음',
  'status.label.untracked': '미추적',
  'status.label.ignored': '무시됨',
  'status.label.added': '추가',
  'status.label.deleted': '삭제',
  'status.label.modified': '수정',
  'status.label.renamed': '이름 변경',
  'status.label.copied': '복사',
  'status.label.conflict': '충돌',
  'status.label.changed': '변경',

  // ---- Worktrees ---------------------------------------------------------
  'worktrees.empty': '등록된 워크트리가 없습니다.',
  'worktrees.detached': '(분리됨)',
  'worktrees.bare': '베어',
  'worktrees.dirtyCount': '{n} 변경',
  'worktrees.reveal': '열기',
  'worktrees.revealTitle': 'Finder 에서 보기',
  'worktrees.openInGhosttyTitle': 'Ghostty에서 열기',

  // ---- Repo actions ------------------------------------------------------
  'action.checkout': '체크아웃',
  'action.pull': '풀',
  'action.push': '푸시',
  'action.fetch': '페치',
  'action.github': 'GitHub',
  'action.checkoutCurrent': '이미 이 브랜치에 있습니다',
  'action.checkoutInWorktree': '{path} 워크트리에서 이미 체크아웃됨',
  'action.checkoutTitle': '{branch} 체크아웃',
  'action.pullFrom': '{tracking} 에서 풀',
  'action.pullNoUpstream': '업스트림 없음',
  'action.pushTitle': '{branch} 를 origin 으로 푸시',
  'action.fetchTitle': 'git fetch --all --prune',
  'action.githubTitle': '브라우저에서 리포지토리 열기',
  'action.resultOk': '성공',
  'action.resultError': '오류',
  'action.confirmPushProtectedTitle': '{branch} 에 푸시할까요?',
  'action.confirmPushProtectedBody.before': '',
  'action.confirmPushProtectedBody.after': ' 로 직접 푸시하려고 합니다. 보통은 PR 을 거치는 게 좋습니다. 계속할까요?',
  'action.confirmPushConfirm': '그래도 푸시',
  'action.cancel': '취소',
  'action.cancelTitle': '{op} 취소',

  // ---- Errors / banners --------------------------------------------------
  'error.notGitRepo': 'git 리포지토리가 아닙니다',
  'error.failedReadRepo': '리포지토리 읽기 실패',
  'error.openGithubNoOrigin': 'origin 원격이 없습니다',
  'error.invalidPath': '경로가 올바르지 않습니다',
  'error.renderCrashTitle': '이 화면을 렌더링하는 중에 오류가 발생했습니다',
  'error.renderCrashUnknown': '알 수 없는 렌더 오류.',
  'error.tryAgain': '다시 시도',
  'error.back': '뒤로 (Esc)',
  'error.settingsWriteTitle': '설정 저장 실패',

  // ---- Settings panel ----------------------------------------------------
  'settings.title': '설정',
  'settings.appearance': '외관',
  'settings.theme.auto': '자동',
  'settings.theme.light': '라이트',
  'settings.theme.dark': '다크',
  'settings.lang': '언어',
  'settings.lang.auto': '자동',
  'settings.lang.en': 'English',
  'settings.lang.zh': '中文',
  'settings.lang.ko': '한국어',
  'settings.lang.ja': '日本語',
  'settings.fetch': '자동 동기화',
  'settings.fetchHint':
    '활성 리포지토리에 대해 백그라운드에서 `git fetch` 를 실행합니다. 네트워크가 느릴 때는 끄세요.',
  'settings.fetch.off': '끄기',
  'settings.fetch.30s': '30 초',
  'settings.fetch.1m': '1 분',
  'settings.fetch.5m': '5 분',
  'settings.fetch.15m': '15 분',
  'settings.recents': '최근 리포지토리',
  'settings.recentsCount': '{n} 항목',
  'settings.clearRecents': '최근 항목 모두 지우기',
  'settings.clearRecentsConfirm': '한 번 더 누르면 확인',

  // ---- Help overlay ------------------------------------------------------
  'help.title': '키보드 단축키',
  'help.section.nav': '내비게이션',
  'help.section.views': '보기',
  'help.section.actions': '동작',
  'help.row.nextBranch': '다음 브랜치 / 커밋',
  'help.row.prevBranch': '이전 브랜치 / 커밋',
  'help.row.nextRepo': '다음 리포지토리',
  'help.row.prevRepo': '이전 리포지토리',
  'help.row.viewBranches': '브랜치',
  'help.row.viewLog': '커밋 로그',
  'help.row.viewStatus': '워킹 트리 상태',
  'help.row.viewWorktrees': '워크트리',
  'help.row.checkout': '선택한 브랜치로 체크아웃',
  'help.row.openRepo': '리포지토리 열기',
  'help.row.closeRepo': '현재 탭 닫기',
  'help.row.refresh': '새로 고침',
  'help.row.settings': '설정',
  'help.row.thisHelp': '이 도움말',
  'help.row.dismiss': '오버레이 닫기',

  // ---- Generic dialog ----------------------------------------------------
  'dialog.cancel': '취소',
  'dialog.close': '닫기 (Esc)',

  // ---- Commit detail -----------------------------------------------------
  'commit.parent': '부모 커밋',
  'commit.parents': '부모 커밋',
  'commit.filesChanged': '{n} 개 파일 변경',
  'commit.filesChangedPlural': '{n} 개 파일 변경',
  'commit.empty': '파일 변경 없음 (병합 또는 빈 커밋).',
  'commit.binary': '바이너리',
}
