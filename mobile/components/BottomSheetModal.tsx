import { useEffect, useRef } from "react"
import {
  Animated,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type BottomSheetModalProps = {
  visible: boolean
  onClose: () => void
  children: React.ReactNode
  animationType?: "none" | "slide" | "fade"
  backdropOpacity?: number
  sheetStyle?: StyleProp<ViewStyle>
  avoidKeyboard?: boolean
  accessibilityLabel?: string
}

export function BottomSheetModal({
  visible,
  onClose,
  children,
  animationType = "slide",
  backdropOpacity = 0.4,
  sheetStyle,
  avoidKeyboard = true,
  accessibilityLabel = "Dismiss bottom sheet",
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets()
  const translateY = useRef(new Animated.Value(0)).current
  const isDismissingRef = useRef(false)

  useEffect(() => {
    if (visible) {
      isDismissingRef.current = false
      translateY.setValue(0)
    }
  }, [translateY, visible])

  const dismiss = () => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    translateY.stopAnimation()
    translateY.setValue(0)
    onClose()
    // onClose may keep the sheet open (e.g. it only closed an inner picker),
    // so re-arm after this frame; the guard still blocks same-frame double-fires.
    requestAnimationFrame(() => {
      isDismissingRef.current = false
    })
  }

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy))
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.9) {
          dismiss()
          return
        }
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start()
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 0,
        }).start()
      },
    }),
  ).current

  const content = (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Pressable
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: `rgba(0,0,0,${backdropOpacity})`,
        }}
        onPress={dismiss}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      />
      <Animated.View
        {...panResponder.panHandlers}
        style={[
          {
            backgroundColor: "white",
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingBottom: Math.max(insets.bottom + 16, 32),
            transform: [{ translateY }],
          },
          sheetStyle,
        ]}
      >
        {children}
      </Animated.View>
    </View>
  )

  return (
    <Modal visible={visible} transparent animationType={animationType} onRequestClose={dismiss}>
      {avoidKeyboard ? (
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </Modal>
  )
}
