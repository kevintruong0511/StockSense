import { useCallback, useEffect, useState } from 'react'

const THEME_KEY = 'stocksense.theme'
const VALID = ['light', 'dark', 'system']

// Chưa có lựa chọn lưu trước đó (lần đầu đăng nhập) → mặc định Tối.
function readStoredTheme() {
  const saved = localStorage.getItem(THEME_KEY)
  return VALID.includes(saved) ? saved : 'dark'
}

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
}

// theme: lựa chọn người dùng ('light' | 'dark' | 'system'); effectiveTheme: kết quả thật sự áp
// dụng ('light' | 'dark') sau khi đã quy đổi 'system' theo prefers-color-scheme của máy.
export function useTheme() {
  const [theme, setThemeState] = useState(readStoredTheme)
  const [effectiveTheme, setEffectiveTheme] = useState(() =>
    readStoredTheme() === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : readStoredTheme(),
  )

  useEffect(() => {
    setEffectiveTheme(theme === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : theme)
    if (theme !== 'system') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => setEffectiveTheme(mql.matches ? 'dark' : 'light')
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [theme])

  const setTheme = useCallback((next) => {
    if (!VALID.includes(next)) return
    localStorage.setItem(THEME_KEY, next)
    setThemeState(next)
  }, [])

  return { theme, effectiveTheme, setTheme }
}
