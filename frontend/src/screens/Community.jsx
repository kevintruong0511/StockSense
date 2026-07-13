// Màn Cộng Đồng: nơi nhà đầu tư đăng bài (chữ + ảnh), thích và bình luận (lồng nhau).
// Ảnh tải lên Cloudinary từ trình duyệt (data/community.js) → chỉ lưu URL. Feed 2 tab:
// Mới nhất / Phổ biến. Bài đăng + bình luận nằm trong <CommunityPost>.
import { useEffect, useRef, useState } from 'react'
import { Users, ImageIcon, Close, AlertCircle } from '../components/icons.jsx'
import CommunityPost from '../components/CommunityPost.jsx'
import { fetchPosts, createPost, cloudinaryEnabled, uploadImage } from '../data/community.js'

const MAX_IMAGES = 4

export default function Community({ user }) {
  const [sort, setSort] = useState('new') // 'new' | 'top'
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // composer
  const [content, setContent] = useState('')
  const [images, setImages] = useState([]) // URL Cloudinary đã tải lên
  const [uploading, setUploading] = useState(false)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')
  const fileRef = useRef(null)

  async function load(nextSort = sort) {
    setLoading(true)
    setLoadError('')
    try {
      setPosts(await fetchPosts(nextSort))
    } catch (e) {
      setLoadError(e.message || 'Không tải được bảng tin.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load(sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sort])

  async function onPickFiles(fileList) {
    const all = Array.from(fileList || []).filter((f) => f.type?.startsWith('image/'))
    // Chỉ tải đúng số slot còn trống để không upload thừa ảnh sẽ bị bỏ.
    const files = all.slice(0, Math.max(0, MAX_IMAGES - images.length))
    if (!files.length) return
    setPostError('')
    setUploading(true)
    try {
      for (const f of files) {
        const url = await uploadImage(f)
        setImages((cur) => (cur.length >= MAX_IMAGES ? cur : [...cur, url]))
      }
    } catch (e) {
      setPostError(e.message || 'Tải ảnh lên thất bại.')
    } finally {
      setUploading(false)
    }
  }

  const removeImage = (i) => setImages((cur) => cur.filter((_, idx) => idx !== i))

  async function submitPost() {
    const text = content.trim()
    if ((!text && images.length === 0) || posting) return
    setPosting(true)
    setPostError('')
    try {
      const post = await createPost({ content: text, images })
      setPosts((list) => [post, ...list]) // bài mới lên đầu
      setContent('')
      setImages([])
      if (sort === 'top') setSort('new') // để người đăng thấy bài mình ở tab Mới nhất
    } catch (e) {
      setPostError(e.message || 'Không đăng được bài.')
    } finally {
      setPosting(false)
    }
  }

  const tabBtn = (key, label) => (
    <button
      onClick={() => setSort(key)}
      className={
        'rounded-lg px-3.5 py-1.5 text-[13px] font-semibold transition-colors ' +
        (sort === key ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-100')
      }
    >
      {label}
    </button>
  )

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      {/* header */}
      <div>
        <h1 className="m-0 flex items-center gap-2 text-2xl font-extrabold tracking-[-0.02em] text-slate-900">
          <Users size={22} className="text-blue-600" />
          Cộng Đồng
        </h1>
        <p className="m-0 mt-1 text-sm text-slate-500">
          Chia sẻ nhận định, đặt câu hỏi và thảo luận cùng các nhà đầu tư khác.
        </p>
      </div>

      {/* composer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder={`${user?.name ? user.name.split(' ').slice(-1)[0] + ' ơi, chia' : 'Chia'} sẻ suy nghĩ của bạn về thị trường…`}
          className="w-full resize-y rounded-xl border border-slate-300 p-3 text-sm text-slate-800 outline-none focus:border-blue-500"
        />

        {images.length > 0 && (
          <div className="mt-2.5 grid grid-cols-4 gap-2">
            {images.map((url, i) => (
              <div key={i} className="group relative overflow-hidden rounded-lg border border-slate-200">
                <img src={url} alt="" className="h-20 w-full object-cover" />
                <button
                  onClick={() => removeImage(i)}
                  className="absolute right-1 top-1 rounded-full bg-slate-900/60 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Bỏ ảnh"
                >
                  <Close size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {postError && (
          <div className="mt-2 flex items-center gap-1.5 text-[13px] text-red-600">
            <AlertCircle size={15} /> {postError}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              onPickFiles(e.target.files)
              e.target.value = ''
            }}
          />
          {cloudinaryEnabled && (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
              title={images.length >= MAX_IMAGES ? `Tối đa ${MAX_IMAGES} ảnh` : 'Đính kèm ảnh'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <ImageIcon size={16} />
              {uploading ? 'Đang tải ảnh…' : images.length ? `Ảnh (${images.length})` : 'Ảnh'}
            </button>
          )}
          <button
            onClick={submitPost}
            disabled={posting || uploading || (!content.trim() && images.length === 0)}
            className="ml-auto rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {posting ? 'Đang đăng…' : 'Đăng bài'}
          </button>
        </div>
      </div>

      {/* tabs */}
      <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
        {tabBtn('new', 'Mới nhất')}
        {tabBtn('top', 'Phổ biến')}
      </div>

      {/* feed */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex gap-2.5">
                <div className="ss-skel h-9 w-9 rounded-full" />
                <div className="flex-1">
                  <div className="ss-skel mb-1.5 h-3.5 w-32" />
                  <div className="ss-skel h-3 w-20" />
                </div>
              </div>
              <div className="ss-skel mt-3 h-4 w-full" />
              <div className="ss-skel mt-1.5 h-4 w-3/4" />
            </div>
          ))}
        </div>
      ) : loadError ? (
        <div className="flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={18} /> {loadError}
          <button onClick={() => load(sort)} className="ml-auto font-semibold underline hover:no-underline">
            Thử lại
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center text-sm text-slate-500">
          Chưa có bài đăng nào. Hãy là người <span className="font-semibold text-slate-700">đầu tiên chia sẻ</span>!
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {posts.map((p) => (
            <CommunityPost
              key={p.id}
              post={p}
              currentUserId={user?.id}
              onDeleted={(id) => setPosts((list) => list.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
