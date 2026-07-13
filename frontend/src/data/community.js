// Client cho tính năng Cộng Đồng: bài đăng, like, bình luận (qua api() dùng Bearer token).
// Ảnh tải lên Cloudinary TRỰC TIẾP từ trình duyệt (unsigned upload preset) → chỉ lưu URL
// vào DB, không gửi bytes qua backend (nhẹ server + DB).
import { api } from './auth.js'

// ── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
// Chỉ bật nút đính kèm ảnh khi đã cấu hình 2 biến môi trường này.
export const cloudinaryEnabled = Boolean(CLOUD_NAME && UPLOAD_PRESET)

// Tải 1 ảnh lên Cloudinary, trả về secure_url (https). Ném lỗi tiếng Việt nếu thất bại.
export async function uploadImage(file) {
  if (!cloudinaryEnabled)
    throw new Error('Chưa cấu hình Cloudinary (VITE_CLOUDINARY_CLOUD_NAME / VITE_CLOUDINARY_UPLOAD_PRESET).')
  const form = new FormData()
  form.append('file', file)
  form.append('upload_preset', UPLOAD_PRESET)
  let res
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
  } catch {
    throw new Error('Không kết nối được Cloudinary để tải ảnh.')
  }
  if (!res.ok) throw new Error('Tải ảnh lên thất bại. Kiểm tra lại upload preset (phải là "unsigned").')
  const data = await res.json()
  if (!data?.secure_url) throw new Error('Cloudinary không trả về đường dẫn ảnh.')
  return data.secure_url
}

// ── Bài đăng ─────────────────────────────────────────────────────────────────
// sort: 'new' | 'top'
export const fetchPosts = (sort = 'new') =>
  api(`/community/posts?sort=${encodeURIComponent(sort)}`, { auth: true }).then((d) => d?.posts || [])

export const createPost = ({ content, images }) =>
  api('/community/posts', { method: 'POST', auth: true, body: { content, images } }).then((d) => d?.post)

export const deletePost = (id) => api(`/community/posts/${id}`, { method: 'DELETE', auth: true })

// ── Like ─────────────────────────────────────────────────────────────────────
// Trả { liked, likeCount }.
export const likePost = (id) => api(`/community/posts/${id}/like`, { method: 'POST', auth: true })
export const unlikePost = (id) => api(`/community/posts/${id}/like`, { method: 'DELETE', auth: true })

// ── Bình luận ────────────────────────────────────────────────────────────────
export const fetchComments = (postId) =>
  api(`/community/posts/${postId}/comments`, { auth: true }).then((d) => d?.comments || [])

export const addComment = (postId, { content, parentId }) =>
  api(`/community/posts/${postId}/comments`, { method: 'POST', auth: true, body: { content, parentId } }).then(
    (d) => d?.comment,
  )

export const deleteComment = (id) => api(`/community/comments/${id}`, { method: 'DELETE', auth: true })
