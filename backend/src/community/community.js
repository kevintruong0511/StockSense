// Truy vấn Postgres cho tính năng Cộng Đồng: bài đăng + bình luận (lồng nhau) + like.
// Đếm like/comment bằng subquery (quy mô nhỏ, tránh counter lệch). Mọi thao tác sửa/xóa
// đều kiểm ownership theo userId để user không đụng được nội dung của người khác.
import { query } from '../db.js'

// Chọn trường bài đăng kèm tên tác giả, số like/comment và "mình đã like chưa".
// $1 = userId hiện tại (để tính liked_by_me).
const POST_SELECT = `
  SELECT p.id, p.user_id, p.content, p.images, p.created_at,
         u.name AS author_name,
         (SELECT count(*) FROM community_likes l WHERE l.post_id = p.id)::int AS like_count,
         (SELECT count(*) FROM community_comments c WHERE c.post_id = p.id)::int AS comment_count,
         EXISTS(SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = $1) AS liked_by_me
    FROM community_posts p
    JOIN users u ON u.id = p.user_id`

// Danh sách bài đăng. sort: 'new' (mới nhất) | 'top' (nhiều like nhất, rồi tới mới nhất).
export async function listPosts({ userId, sort = 'new', limit = 50 } = {}) {
  const orderBy = sort === 'top' ? 'like_count DESC, p.created_at DESC' : 'p.created_at DESC'
  const { rows } = await query(`${POST_SELECT} ORDER BY ${orderBy} LIMIT $2`, [userId, limit])
  return rows
}

// Lấy 1 bài (kèm số liệu như trên). Trả null nếu không tồn tại.
export async function getPost({ userId, postId }) {
  const { rows } = await query(`${POST_SELECT} WHERE p.id = $2`, [userId, postId])
  return rows[0] || null
}

// Tạo bài mới, trả bản ghi đã chuẩn hóa (like_count=0, comment_count=0, liked_by_me=false).
export async function createPost({ userId, content, images = [] }) {
  const { rows } = await query(
    `INSERT INTO community_posts (user_id, content, images)
     VALUES ($1, $2, $3::jsonb) RETURNING id`,
    [userId, content, JSON.stringify(images)],
  )
  return getPost({ userId, postId: rows[0].id })
}

// Xóa bài của chính mình. Trả true nếu có xóa (CASCADE xóa comment + like).
export async function deletePost({ userId, postId }) {
  const { rowCount } = await query('DELETE FROM community_posts WHERE id = $1 AND user_id = $2', [postId, userId])
  return rowCount > 0
}

// Thích / bỏ thích (idempotent). Trả { liked, likeCount } sau thao tác.
export async function setLike({ userId, postId, liked }) {
  if (liked) {
    await query(
      'INSERT INTO community_likes (post_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [postId, userId],
    )
  } else {
    await query('DELETE FROM community_likes WHERE post_id = $1 AND user_id = $2', [postId, userId])
  }
  const { rows } = await query('SELECT count(*)::int AS n FROM community_likes WHERE post_id = $1', [postId])
  return { liked, likeCount: rows[0].n }
}

// Kiểm tra bài có tồn tại không (trước khi like/comment).
export async function postExists(postId) {
  const { rowCount } = await query('SELECT 1 FROM community_posts WHERE id = $1', [postId])
  return rowCount > 0
}

// Toàn bộ bình luận của 1 bài (phẳng, kèm tên tác giả + parent_id). Frontend dựng cây.
export async function listComments(postId) {
  const { rows } = await query(
    `SELECT c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at, u.name AS author_name
       FROM community_comments c
       JOIN users u ON u.id = c.user_id
      WHERE c.post_id = $1
      ORDER BY c.created_at ASC`,
    [postId],
  )
  return rows
}

// Thêm bình luận (parentId tùy chọn = trả lời bình luận khác). Trả bản ghi kèm tên tác giả.
// Nếu parentId không thuộc cùng bài → coi như bình luận gốc (parent = null) cho an toàn.
export async function addComment({ userId, postId, parentId = null, content }) {
  let safeParent = null
  if (parentId) {
    const { rows } = await query('SELECT id FROM community_comments WHERE id = $1 AND post_id = $2', [parentId, postId])
    if (rows[0]) safeParent = parentId
  }
  const { rows } = await query(
    `INSERT INTO community_comments (post_id, user_id, parent_id, content)
     VALUES ($1, $2, $3, $4)
     RETURNING id, post_id, user_id, parent_id, content, created_at`,
    [postId, userId, safeParent, content],
  )
  const c = rows[0]
  const { rows: u } = await query('SELECT name FROM users WHERE id = $1', [userId])
  return { ...c, author_name: u[0]?.name || null }
}

// Xóa bình luận của chính mình (CASCADE xóa các trả lời con). Trả true nếu có xóa.
export async function deleteComment({ userId, commentId }) {
  const { rowCount } = await query('DELETE FROM community_comments WHERE id = $1 AND user_id = $2', [commentId, userId])
  return rowCount > 0
}
