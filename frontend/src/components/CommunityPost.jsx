// Một bài đăng Cộng Đồng: nội dung + ảnh, nút thích (optimistic), và khối bình luận
// LỒNG NHAU (tải khi mở). Tự quản lý like/comment cục bộ; báo ra ngoài khi xóa bài.
import { useState } from 'react'
import { Heart, Comment, Send, Reply, Trash, Close } from './icons.jsx'
import {
  addComment as apiAddComment,
  deleteComment as apiDeleteComment,
  deletePost as apiDeletePost,
  fetchComments,
  likePost,
  unlikePost,
} from '../data/community.js'

// Avatar chữ cái đầu từ tên.
function initials(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'NĐ'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

// Màu avatar ổn định theo tên (băm đơn giản → chọn 1 trong bảng màu).
const AVATAR_COLORS = ['#2563EB', '#7C3AED', '#0891B2', '#16A34A', '#DC2626', '#D97706', '#DB2777', '#0D9488']
function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function timeAgo(iso) {
  if (!iso) return ''
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (s < 60) return 'vừa xong'
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`
  if (s < 604800) return `${Math.floor(s / 86400)} ngày trước`
  return new Date(iso).toLocaleDateString('vi-VN')
}

function Avatar({ name, size = 36 }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, background: avatarColor(name), fontSize: size * 0.36 }}
    >
      {initials(name)}
    </div>
  )
}

// Lưới ảnh (1–4). Bấm mở ảnh gốc ở tab mới.
function ImageGrid({ images }) {
  if (!images?.length) return null
  return (
    <div className={'mt-2.5 grid gap-1.5 ' + (images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {images.map((url, i) => (
        <a key={i} href={url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg">
          <img
            src={url}
            alt=""
            loading="lazy"
            className="max-h-[420px] w-full object-cover transition-opacity hover:opacity-90"
          />
        </a>
      ))}
    </div>
  )
}

// Một nút bình luận trong cây (đệ quy). depth để thụt lề (cap để không tràn trên mobile).
function CommentNode({ node, childrenMap, currentUserId, depth, onReply, onDelete }) {
  const kids = childrenMap.get(node.id) || []
  const indent = Math.min(depth, 4) * 14
  return (
    <div style={{ marginLeft: indent }}>
      <div className="flex gap-2">
        <Avatar name={node.author_name} size={28} />
        <div className="min-w-0 flex-1">
          <div className="rounded-2xl bg-slate-100 px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-semibold text-slate-800">{node.author_name || 'Ẩn danh'}</span>
              <span className="text-[11px] text-slate-400">{timeAgo(node.created_at)}</span>
            </div>
            <p className="m-0 mt-0.5 whitespace-pre-wrap break-words text-[13.5px] leading-snug text-slate-700">
              {node.content}
            </p>
          </div>
          <div className="mt-1 flex items-center gap-3 pl-1 text-[12px] font-medium text-slate-400">
            <button onClick={() => onReply(node)} className="inline-flex items-center gap-1 hover:text-blue-600">
              <Reply size={13} /> Trả lời
            </button>
            {node.user_id === currentUserId && (
              <button onClick={() => onDelete(node)} className="inline-flex items-center gap-1 hover:text-red-500">
                <Trash size={12} /> Xóa
              </button>
            )}
          </div>
          {kids.length > 0 && (
            <div className="mt-2 flex flex-col gap-2">
              {kids.map((k) => (
                <CommentNode
                  key={k.id}
                  node={k}
                  childrenMap={childrenMap}
                  currentUserId={currentUserId}
                  depth={depth + 1}
                  onReply={onReply}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CommunityPost({ post, currentUserId, onDeleted }) {
  const [liked, setLiked] = useState(Boolean(post.liked_by_me))
  const [likeCount, setLikeCount] = useState(post.like_count || 0)
  const [likeBusy, setLikeBusy] = useState(false)

  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoaded, setCommentsLoaded] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comment_count || 0)
  const [replyTo, setReplyTo] = useState(null) // {id, author_name} hoặc null (bình luận gốc)
  const [commentText, setCommentText] = useState('')
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [err, setErr] = useState('')

  const isOwner = post.user_id === currentUserId

  async function toggleLike() {
    if (likeBusy) return
    setLikeBusy(true)
    const next = !liked
    // optimistic
    setLiked(next)
    setLikeCount((c) => c + (next ? 1 : -1))
    try {
      const r = next ? await likePost(post.id) : await unlikePost(post.id)
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch {
      // revert nếu lỗi
      setLiked(!next)
      setLikeCount((c) => c + (next ? -1 : 1))
    } finally {
      setLikeBusy(false)
    }
  }

  async function openComments() {
    setShowComments((v) => !v)
    if (commentsLoaded || commentsLoading) return
    setCommentsLoading(true)
    try {
      const list = await fetchComments(post.id)
      setComments(list)
      setCommentCount(list.length)
      setCommentsLoaded(true)
    } catch {
      setErr('Không tải được bình luận.')
    } finally {
      setCommentsLoading(false)
    }
  }

  async function submitComment() {
    const content = commentText.trim()
    if (!content || sending) return
    setSending(true)
    setErr('')
    try {
      const c = await apiAddComment(post.id, { content, parentId: replyTo?.id || null })
      setComments((list) => [...list, c])
      setCommentCount((n) => n + 1)
      setCommentText('')
      setReplyTo(null)
      setShowComments(true)
      setCommentsLoaded(true)
    } catch (e) {
      setErr(e.message || 'Không gửi được bình luận.')
    } finally {
      setSending(false)
    }
  }

  async function removeComment(node) {
    if (!window.confirm('Xóa bình luận này? Các trả lời bên trong cũng sẽ bị xóa.')) return
    try {
      await apiDeleteComment(node.id)
      // Xóa node + toàn bộ con cháu khỏi danh sách cục bộ (server đã CASCADE).
      const removed = new Set([node.id])
      let changed = true
      while (changed) {
        changed = false
        for (const c of comments) {
          if (c.parent_id && removed.has(c.parent_id) && !removed.has(c.id)) {
            removed.add(c.id)
            changed = true
          }
        }
      }
      setComments((list) => list.filter((c) => !removed.has(c.id)))
      setCommentCount((n) => Math.max(0, n - removed.size))
    } catch {
      setErr('Không xóa được bình luận.')
    }
  }

  async function removePost() {
    if (!window.confirm('Xóa bài đăng này?')) return
    setDeleting(true)
    try {
      await apiDeletePost(post.id)
      onDeleted?.(post.id)
    } catch {
      setErr('Không xóa được bài.')
      setDeleting(false)
    }
  }

  // Dựng map parent_id -> children để render cây (giữ thứ tự thời gian đã sort từ server).
  const childrenMap = new Map()
  for (const c of comments) {
    const key = c.parent_id || 'root'
    if (!childrenMap.has(key)) childrenMap.set(key, [])
    childrenMap.get(key).push(c)
  }
  const roots = childrenMap.get('root') || []

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* header */}
      <div className="flex items-start gap-2.5">
        <Avatar name={post.author_name} />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-slate-800">{post.author_name || 'Ẩn danh'}</div>
          <div className="text-[11.5px] text-slate-400">{timeAgo(post.created_at)}</div>
        </div>
        {isOwner && (
          <button
            onClick={removePost}
            disabled={deleting}
            title="Xóa bài"
            className="flex-none rounded-lg p-1.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
          >
            <Trash size={16} />
          </button>
        )}
      </div>

      {/* nội dung */}
      {post.content && (
        <p className="m-0 mt-2.5 whitespace-pre-wrap break-words text-[14.5px] leading-relaxed text-slate-800">
          {post.content}
        </p>
      )}
      <ImageGrid images={post.images} />

      {/* thanh like / comment */}
      <div className="mt-3 flex items-center gap-1 border-t border-slate-100 pt-2.5">
        <button
          onClick={toggleLike}
          className={
            'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold transition-colors ' +
            (liked ? 'text-red-600 hover:bg-red-50' : 'text-slate-500 hover:bg-slate-100')
          }
        >
          <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
          {likeCount > 0 ? likeCount : ''} Thích
        </button>
        <button
          onClick={openComments}
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-slate-500 transition-colors hover:bg-slate-100"
        >
          <Comment size={16} />
          {commentCount > 0 ? commentCount : ''} Bình luận
        </button>
      </div>

      {/* khối bình luận */}
      {showComments && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          {commentsLoading ? (
            <div className="py-2 text-center text-[13px] text-slate-400">Đang tải bình luận…</div>
          ) : (
            <>
              {roots.length > 0 && (
                <div className="mb-3 flex flex-col gap-3">
                  {roots.map((n) => (
                    <CommentNode
                      key={n.id}
                      node={n}
                      childrenMap={childrenMap}
                      currentUserId={currentUserId}
                      depth={0}
                      onReply={(node) => setReplyTo({ id: node.id, author_name: node.author_name })}
                      onDelete={removeComment}
                    />
                  ))}
                </div>
              )}

              {/* ô nhập bình luận / trả lời */}
              {replyTo && (
                <div className="mb-1.5 flex items-center gap-2 pl-1 text-[12px] text-slate-500">
                  <Reply size={13} /> Đang trả lời <b className="text-slate-700">{replyTo.author_name}</b>
                  <button onClick={() => setReplyTo(null)} className="text-slate-400 hover:text-slate-700">
                    <Close size={13} />
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submitComment()
                  }}
                  rows={1}
                  placeholder={replyTo ? `Trả lời ${replyTo.author_name}…` : 'Viết bình luận…'}
                  className="min-h-[38px] w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-[13.5px] outline-none focus:border-blue-500"
                />
                <button
                  onClick={submitComment}
                  disabled={sending || !commentText.trim()}
                  className="flex-none rounded-xl bg-blue-600 p-2.5 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  title="Gửi (Ctrl/⌘ + Enter)"
                >
                  <Send size={16} />
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {err && <div className="mt-2 text-[12.5px] text-red-600">{err}</div>}
    </div>
  )
}
