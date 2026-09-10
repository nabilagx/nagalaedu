'use client'

interface NagalaLogoProps {
  size?: 'sm' | 'md' | 'lg'
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  className?: string
}

const NAGALA_LOGO_URL =
  'https://imgur.com/y9vt6v8.png'

const sizeClasses = {
  sm: 'h-9 w-9',
  md: 'h-10 w-10',
  lg: 'h-24 w-24',
}

const roundedClasses = {
  none: 'rounded-none',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-3xl',
  '2xl': 'rounded-[2rem]',
}

export default function NagalaLogo({
  size = 'md',
  rounded = 'md',
  className = '',
}: NagalaLogoProps) {
  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${roundedClasses[rounded]}
        shrink-0
        overflow-hidden
        bg-white
        ${className}
      `}
    >
      <img
        src={NAGALA_LOGO_URL}
        alt="NAGALA Education"
        className="h-full w-full object-cover"
      />
    </div>
  )
}