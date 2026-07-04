import { useState, useEffect } from 'react'
import { hashColor, faviconSrc, domainInitial } from '../lib/format.js'

// Site favicon with a colored-initial fallback while none is cached.
export default function Favicon({ bookmark: b, size = 14, radius = 4 }) {
  const [failed, setFailed] = useState(false)
  const src = faviconSrc(b)

  useEffect(() => {
    setFailed(false)
  }, [b.favicon_path])

  if (src && !failed) {
    return (
      <img
        className="card-fav-img"
        src={src}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size, borderRadius: radius }}
        draggable={false}
        onError={() => setFailed(true)}
      />
    )
  }
  return (
    <span
      className="card-fav"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        fontSize: size * 0.62,
        background: hashColor(b.domain || b.id)
      }}
    >
      {domainInitial(b)}
    </span>
  )
}
