import { useEffect, useState } from 'react';
import { getComments, createComment, deleteComment } from '../../api/comments';
import { useAuthStore } from '../../stores/authStore';
import { useUIStore } from '../../stores/uiStore';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import type { Comment } from '../../types';
import { formatDate } from '../../utils/date';

export function CommentList({ reportId }: { reportId: number }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const user = useAuthStore((s) => s.user);
  const addToast = useUIStore((s) => s.addToast);

  const loadComments = async () => {
    try {
      const data = await getComments(reportId);
      setComments(data);
    } catch {
      addToast('加载评论失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadComments(); }, [reportId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSubmitting(true);
    try {
      const comment = await createComment(reportId, content.trim());
      setComments((prev) => [...prev, comment]);
      setContent('');
      addToast('评论发表成功', 'success');
    } catch {
      addToast('评论失败', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await deleteComment(id);
      setComments((prev) => prev.filter((c) => c.id !== id));
      addToast('评论已删除', 'success');
    } catch {
      addToast('删除失败', 'error');
    }
  };

  return (
    <Card className="mt-6">
      <h2 className="font-semibold text-surface-800 mb-4">评论 ({comments.length})</h2>

      {/* Comment list */}
      {loading ? (
        <p className="text-sm text-surface-400">加载中...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-surface-400">暂无评论</p>
      ) : (
        <div className="space-y-4 mb-6">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium flex-shrink-0">
                {comment.username?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-surface-700">{comment.username}</span>
                  <span className="text-xs text-surface-400">{formatDate(comment.created_at)}</span>
                </div>
                <p className="text-sm text-surface-600 mt-1">{comment.content}</p>
              </div>
              {user?.id === comment.user_id && (
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="text-surface-300 hover:text-red-500 transition-colors flex-shrink-0"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3l8 8M11 3L3 11" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-medium flex-shrink-0">
          {user?.username?.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 flex gap-2">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="添加评论..."
            className="flex-1 px-3 py-2 rounded-lg border border-surface-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <Button type="submit" size="sm" isLoading={submitting} disabled={!content.trim()}>
            发表
          </Button>
        </div>
      </form>
    </Card>
  );
}
