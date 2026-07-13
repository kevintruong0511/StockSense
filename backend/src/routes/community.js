// API Cộng Đồng: bài đăng (CRUD), like, bình luận lồng nhau. Đều yêu cầu đăng nhập.
// Ảnh lưu dưới dạng URL (Cloudinary) — backend chỉ NHẬN & KIỂM URL https, không xử lý bytes.
import { Router } from 'express'
import { requireAuth } from '../auth.js'
import {
  addComment,
  createPost,
  deleteComment,
  deletePost,
  listComments,
  listPosts,
  postExists,
  setLike,
} from '../community/community.js'

const router = Router()
router.use(requireAuth)

const MAX_CONTENT = 5000 // ký tự tối đa cho bài/bình luận
const MAX_IMAGES = 4

// Lọc & kiểm mảng URL ảnh: chỉ nhận https, độ dài hợp lý, tối đa MAX_IMAGES.
function sanitizeImages(arr) {
  return (Array.isArray(arr) ? arr : [])
    .filter((u) => typeof u === 'string' && /^https:\/\/\S+$/.test(u) && u.length <= 500)
    .slice(0, MAX_IMAGES)
}

// ── Bài đăng ─────────────────────────────────────────────────────────────────

// Danh sách bài. ?sort=new|top (mặc định new).
router.get('/posts', async (req, res) => {
  try {
    const sort = req.query.sort === 'top' ? 'top' : 'new'
    const posts = await listPosts({ userId: req.userId, sort, limit: 50 })
    res.json({ posts })
  } catch (err) {
    console.error('[community:list]', err)
    res.status(500).json({ error: 'Không tải được bảng tin.' })
  }
})

// Tạo bài mới: { content, images? }.
router.post('/posts', async (req, res) => {
  const content = String(req.body?.content || '').trim()
  const images = sanitizeImages(req.body?.images)
  if (!content && images.length === 0) return res.status(400).json({ error: 'Bài đăng cần có nội dung hoặc ảnh.' })
  if (content.length > MAX_CONTENT) return res.status(400).json({ error: 'Nội dung quá dài.' })
  try {
    const post = await createPost({ userId: req.userId, content, images })
    res.json({ post })
  } catch (err) {
    console.error('[community:create]', err)
    res.status(500).json({ error: 'Không đăng được bài.' })
  }
})

// Xóa bài của chính mình.
router.delete('/posts/:id', async (req, res) => {
  try {
    const ok = await deletePost({ userId: req.userId, postId: req.params.id })
    if (!ok) return res.status(404).json({ error: 'Không tìm thấy bài (hoặc không phải bài của bạn).' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[community:delete]', err)
    res.status(500).json({ error: 'Không xóa được bài.' })
  }
})

// ── Like ─────────────────────────────────────────────────────────────────────

// Thích bài.
router.post('/posts/:id/like', async (req, res) => {
  try {
    if (!(await postExists(req.params.id))) return res.status(404).json({ error: 'Không tìm thấy bài.' })
    res.json(await setLike({ userId: req.userId, postId: req.params.id, liked: true }))
  } catch (err) {
    console.error('[community:like]', err)
    res.status(500).json({ error: 'Không thực hiện được.' })
  }
})

// Bỏ thích bài.
router.delete('/posts/:id/like', async (req, res) => {
  try {
    res.json(await setLike({ userId: req.userId, postId: req.params.id, liked: false }))
  } catch (err) {
    console.error('[community:unlike]', err)
    res.status(500).json({ error: 'Không thực hiện được.' })
  }
})

// ── Bình luận (lồng nhau) ────────────────────────────────────────────────────

// Toàn bộ bình luận của 1 bài (phẳng; frontend dựng cây theo parent_id).
router.get('/posts/:id/comments', async (req, res) => {
  try {
    res.json({ comments: await listComments(req.params.id) })
  } catch (err) {
    console.error('[community:comments:list]', err)
    res.status(500).json({ error: 'Không tải được bình luận.' })
  }
})

// Thêm bình luận: { content, parentId? }.
router.post('/posts/:id/comments', async (req, res) => {
  const content = String(req.body?.content || '').trim()
  if (!content) return res.status(400).json({ error: 'Bình luận không được để trống.' })
  if (content.length > MAX_CONTENT) return res.status(400).json({ error: 'Bình luận quá dài.' })
  try {
    if (!(await postExists(req.params.id))) return res.status(404).json({ error: 'Không tìm thấy bài.' })
    const comment = await addComment({
      userId: req.userId,
      postId: req.params.id,
      parentId: req.body?.parentId || null,
      content,
    })
    res.json({ comment })
  } catch (err) {
    console.error('[community:comments:add]', err)
    res.status(500).json({ error: 'Không gửi được bình luận.' })
  }
})

// Xóa bình luận của chính mình (CASCADE xóa các trả lời con).
router.delete('/comments/:id', async (req, res) => {
  try {
    const ok = await deleteComment({ userId: req.userId, commentId: req.params.id })
    if (!ok) return res.status(404).json({ error: 'Không tìm thấy bình luận (hoặc không phải của bạn).' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[community:comments:delete]', err)
    res.status(500).json({ error: 'Không xóa được bình luận.' })
  }
})

export default router
