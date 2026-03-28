import { Manrope } from 'next/font/google'

/** Меню и блоки главной: единая гарнитура без смены шрифта всего body. */
export const manropeHome = Manrope({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
})
