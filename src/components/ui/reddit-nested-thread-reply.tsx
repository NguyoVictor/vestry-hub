import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { MemberAvatar } from "@/components/shared/MemberAvatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface CommentNode {
  id: string;
  member_id: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  author: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
  replies: CommentNode[];
}

interface CommentThreadProps {
  comments: CommentNode[];
  currentMemberId: string;
  onAddComment: (body: string, parentId?: string) => void;
}

interface CommentItemProps {
  comment: CommentNode;
  currentMemberId: string;
  onAddComment: (body: string, parentId?: string) => void;
  depth?: number;
}

function CommentItem({ comment, currentMemberId, onAddComment, depth = 0 }: CommentItemProps) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  const authorName = comment.is_deleted
    ? "[deleted]"
    : `${comment.author.first_name} ${comment.author.last_name}`;

  const handleReplySubmit = () => {
    if (!replyText.trim()) return;
    onAddComment(replyText.trim(), comment.id);
    setReplyText("");
    setReplyOpen(false);
  };

  return (
    <div className={cn("font-jakarta", depth > 0 && "pl-6 border-l border-slate-100 dark:border-slate-800")}>
      <div className="flex gap-2.5 py-2">
        {!comment.is_deleted && (
          <MemberAvatar
            name={authorName}
            src={comment.author.avatar_url ?? undefined}
            size="sm"
          />
        )}
        <div className="flex-1 min-w-0">
          {comment.is_deleted ? (
            <p className="text-sm text-slate-400 italic">[deleted]</p>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {authorName}
                </span>
                <span className="text-xs text-slate-400">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                {comment.body}
              </p>
              <button
                onClick={() => setReplyOpen(v => !v)}
                className="text-xs text-slate-400 hover:text-orange-500 mt-1 transition-colors"
              >
                Reply
              </button>
            </>
          )}

          {replyOpen && (
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleReplySubmit()}
                placeholder="Write a reply..."
                className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
              />
              <Button
                size="sm"
                className="bg-orange-500 hover:bg-orange-600 text-white text-xs"
                onClick={handleReplySubmit}
                disabled={!replyText.trim()}
              >
                Reply
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Nested replies */}
      {comment.replies.map(reply => (
        <CommentItem
          key={reply.id}
          comment={reply}
          currentMemberId={currentMemberId}
          onAddComment={onAddComment}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export function CommentThread({ comments, currentMemberId, onAddComment }: CommentThreadProps) {
  const [newComment, setNewComment] = useState("");

  const handleSubmit = () => {
    if (!newComment.trim()) return;
    onAddComment(newComment.trim());
    setNewComment("");
  };

  return (
    <div className="font-jakarta space-y-1">
      {/* Comment list */}
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          currentMemberId={currentMemberId}
          onAddComment={onAddComment}
          depth={0}
        />
      ))}

      {/* New top-level comment input */}
      <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 mt-2">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleSubmit()}
          placeholder="Add a comment..."
          className="flex-1 text-sm border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
        />
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white"
          onClick={handleSubmit}
          disabled={!newComment.trim()}
        >
          Post
        </Button>
      </div>
    </div>
  );
}
