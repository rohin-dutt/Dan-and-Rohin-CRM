import { View, ViewProps } from "react-native"

type CardProps = ViewProps & {
  children: React.ReactNode
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <View
      {...props}
      className={`bg-white border border-gray-100 rounded-2xl p-4 shadow-sm ${className ?? ""}`}
    >
      {children}
    </View>
  )
}
