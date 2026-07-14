export default function Logo({ className = 'h-8', ...props }) {
  return <img src="/logo-mark.png" alt="StockSense VN" className={`w-auto ${className}`} {...props} />
}
