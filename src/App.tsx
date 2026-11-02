import { useHashRoute } from './lib/hash'
import { LAPTOP_QUERY, useMediaQuery } from './lib/useMediaQuery'
import { LaptopLayout } from './frames/LaptopLayout'
import { PhoneLayout } from './frames/PhoneLayout'

export default function App() {
  useHashRoute()
  const laptop = useMediaQuery(LAPTOP_QUERY)
  return laptop ? <LaptopLayout /> : <PhoneLayout />
}
