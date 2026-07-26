export const ROLE_LABELS: Record<string, string> = {
  admin: '管理员',
  manager: '团队负责人',
  member: '成员',
};

export const STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  submitted: '已提交',
};

export const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-100 text-yellow-800',
  submitted: 'bg-blue-100 text-blue-800',
  reviewed: 'bg-green-100 text-green-800',
};
