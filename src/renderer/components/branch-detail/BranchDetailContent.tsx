import { FolderTree } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '#/renderer/stores/i18n.ts'
import type { DetailTab, RepoState } from '#/renderer/stores/repos/types.ts'
import { EmptyState, ScrollPane } from '#/renderer/components/Layout.tsx'
import { LogList } from '#/renderer/components/LogList.tsx'
import { StatusList } from '#/renderer/components/StatusList.tsx'
import { ListSkeleton } from '#/renderer/components/Skeleton.tsx'
import { BranchStatus } from '#/renderer/components/branch-detail/BranchStatus.tsx'
import type { SelectedBranchDetail } from '#/renderer/components/branch-detail/model.ts'
import { operationBusy } from '#/renderer/stores/repos/operations.ts'

interface Props {
  repo: RepoState
  detail: SelectedBranchDetail
  detailId: string
  contentId: string
}

interface TabPanelProps {
  detailId: string
  tabId: DetailTab
  children: ReactNode
}

type BranchDetailBranch = NonNullable<SelectedBranchDetail['branch']>

export function BranchDetailContent({ repo, detail, detailId, contentId }: Props) {
  const t = useT()
  const { branch } = detail
  if (!branch)
    return <EmptyState title={t(repo.data.branches.length === 0 ? 'branches.empty' : 'branches.filter-empty')} />

  return (
    <div id={contentId} className="flex min-h-0 flex-1 flex-col">
      {repo.ui.detailTab === 'status' && <BranchStatusTab detailId={detailId} detail={detail} />}
      {repo.ui.detailTab === 'changes' && (
        <BranchChangesTab detailId={detailId} repo={repo} branch={branch} selectedStatus={detail.selectedStatus} />
      )}
      {repo.ui.detailTab === 'commits' && (
        <BranchCommitsTab detailId={detailId} repoId={repo.id} branch={branch} branchLog={detail.branchLog} />
      )}
    </div>
  )
}

function BranchTabPanel({ detailId, tabId, children }: TabPanelProps) {
  return (
    <div
      id={`${detailId}-${tabId}-panel`}
      role="tabpanel"
      aria-labelledby={`${detailId}-${tabId}-tab`}
      className="flex min-h-0 flex-1 flex-col"
    >
      {children}
    </div>
  )
}

function BranchStatusTab({ detailId, detail }: { detailId: string; detail: SelectedBranchDetail }) {
  return (
    <BranchTabPanel detailId={detailId} tabId="status">
      <ScrollPane>
        <BranchStatus detail={detail} />
      </ScrollPane>
    </BranchTabPanel>
  )
}

function BranchChangesTab({
  detailId,
  repo,
  branch,
  selectedStatus,
}: {
  detailId: string
  repo: RepoState
  branch: BranchDetailBranch
  selectedStatus: SelectedBranchDetail['selectedStatus']
}) {
  const t = useT()
  const statusLoading = operationBusy(repo.ops.status)
  const statusError = repo.ops.status.error
  // Keep this tab-level count separate from StatusList's empty-state check: the tab decides the scroll boundary.
  const totalEntries = selectedStatus.reduce((n, wt) => n + wt.entries.length, 0)

  return (
    <BranchTabPanel detailId={detailId} tabId="changes">
      {branch.worktreePath && statusLoading && !repo.data.statusLoaded ? (
        <ListSkeleton rows={8} variant="status" />
      ) : branch.worktreePath && !repo.data.statusLoaded && statusError ? (
        <EmptyState title={t(statusError)} />
      ) : branch.worktreePath ? (
        totalEntries > 0 ? (
          <ScrollPane>
            <StatusList status={selectedStatus} emptyTitleKey="status.clean-title" emptyBodyKey="status.clean-body" />
          </ScrollPane>
        ) : (
          <StatusList status={selectedStatus} emptyTitleKey="status.clean-title" emptyBodyKey="status.clean-body" />
        )
      ) : (
        <EmptyState
          icon={<FolderTree size={16} />}
          title={t('status.no-worktree-title')}
          body={t('status.no-worktree-body')}
        />
      )}
    </BranchTabPanel>
  )
}

function BranchCommitsTab({
  detailId,
  repoId,
  branch,
  branchLog,
}: {
  detailId: string
  repoId: string
  branch: BranchDetailBranch
  branchLog: SelectedBranchDetail['branchLog']
}) {
  return (
    <BranchTabPanel detailId={detailId} tabId="commits">
      {branchLog?.loading && !branchLog.entries.length ? (
        <ListSkeleton variant="log" />
      ) : branchLog?.entries.length ? (
        <ScrollPane>
          <LogList
            repoId={repoId}
            log={branchLog.entries}
            branch={branch.name}
            selectedHash={branchLog.selectedHash ?? null}
          />
        </ScrollPane>
      ) : (
        <LogList repoId={repoId} log={[]} branch={branch.name} selectedHash={null} />
      )}
    </BranchTabPanel>
  )
}
