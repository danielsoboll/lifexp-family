'use client'

import { getAvatarImageSizesCss } from '../lib/avatarLibrary'
import { resolveAvatarAssetUrl } from '../lib/avatarAsset'

type AvatarPictureProps = {
  src: string
  alt: string
  objectPosition: string
  frameMaxPx: number
  priority?: boolean
  pictureKey?: string
}

export default function AvatarPicture({
  src,
  alt,
  objectPosition,
  frameMaxPx,
  priority = false,
  pictureKey,
}: AvatarPictureProps) {
  const { busted } = resolveAvatarAssetUrl(src)

  return (
    <img
      key={pictureKey}
      src={busted}
      alt={alt}
      width={frameMaxPx}
      height={frameMaxPx}
      sizes={getAvatarImageSizesCss(frameMaxPx)}
      className="lifexp-avatar-image absolute inset-0 h-full w-full object-contain"
      style={{ objectPosition }}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
    />
  )
}
