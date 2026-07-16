import { useEffect, useRef, useState } from "react"
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native"
import { useSafeAreaInsets } from "react-native-safe-area-context"

type BottomSheetModalProps = {
  visible: boolean
  onClose: () => void
  onClosed?: () => void
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
  onClosed,
  children,
  animationType = "slide",
  backdropOpacity = 0.4,
  sheetStyle,
  avoidKeyboard = true,
  accessibilityLabel = "Dismiss bottom sheet",
}: BottomSheetModalProps) {
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()
  const [rendered, setRendered] = useState(visible)
  const transition = useRef(
    new Animated.Value(visible && animationType === "none" ? 1 : 0),
  ).current
  const entranceDistance = useRef(new Animated.Value(windowHeight)).current
  const translateY = useRef(new Animated.Value(0)).current
  const isDismissingRef = useRef(false)
  const dismissRef = useRef<() => void>(() => {})
  const startOpenRef = useRef<() => void>(() => {})
  const finishClosedRef = useRef<() => void>(() => {})
  const modalShownRef = useRef(false)
  const pendingClosedRef = useRef(false)
  const phaseRef = useRef<"hidden" | "opening" | "open" | "closing">(
    visible ? "opening" : "hidden",
  )
  const onClosedRef = useRef(onClosed)
  const visibleChildrenRef = useRef(children)

  onClosedRef.current = onClosed
  if (visible) {
    visibleChildrenRef.current = children
  }

  const finishClosed = () => {
    if (!pendingClosedRef.current) return
    pendingClosedRef.current = false
    onClosedRef.current?.()
  }

  finishClosedRef.current = finishClosed

  const startOpenAnimation = () => {
    transition.stopAnimation()
    phaseRef.current = "opening"

    if (animationType === "none") {
      transition.setValue(1)
      phaseRef.current = "open"
      return
    }

    Animated.timing(transition, {
      toValue: 1,
      duration: animationType === "fade" ? 160 : 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) phaseRef.current = "open"
    })
  }

  startOpenRef.current = startOpenAnimation

  useEffect(() => {
    if (visible) {
      isDismissingRef.current = false
      pendingClosedRef.current = false
      translateY.stopAnimation()
      translateY.setValue(0)

      if (!rendered) {
        phaseRef.current = "opening"
        transition.stopAnimation()
        transition.setValue(animationType === "none" ? 1 : 0)
        entranceDistance.setValue(windowHeight)
        setRendered(true)
        return
      }

      if (modalShownRef.current) {
        startOpenRef.current()
      } else {
        transition.stopAnimation()
        transition.setValue(animationType === "none" ? 1 : 0)
      }
      return
    }

    if (!rendered) return

    phaseRef.current = "closing"
    transition.stopAnimation()

    const completeClose = () => {
      pendingClosedRef.current = true
      phaseRef.current = "hidden"
      modalShownRef.current = false
      setRendered(false)
    }

    if (animationType === "none") {
      transition.setValue(0)
      completeClose()
      return
    }

    const closeAnimation = Animated.timing(transition, {
      toValue: 0,
      duration: animationType === "fade" ? 140 : 200,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    })
    closeAnimation.start(({ finished }) => {
      if (finished) completeClose()
    })

    return () => closeAnimation.stop()
  }, [
    animationType,
    entranceDistance,
    rendered,
    transition,
    translateY,
    visible,
    windowHeight,
  ])

  useEffect(() => {
    if (Platform.OS !== "ios" && !rendered) {
      finishClosedRef.current()
    }
  }, [rendered])

  const dismiss = () => {
    if (isDismissingRef.current) return
    isDismissingRef.current = true
    translateY.stopAnimation()
    onClose()
    Animated.spring(translateY, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 0,
    }).start()
    // onClose may keep the sheet open (e.g. it only closed an inner picker),
    // so re-arm after this frame; the guard still blocks same-frame double-fires.
    requestAnimationFrame(() => {
      isDismissingRef.current = false
    })
  }

  dismissRef.current = dismiss

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(Math.max(0, gesture.dy))
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 80 || gesture.vy > 0.9) {
          dismissRef.current()
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

  const entranceTranslateY = Animated.multiply(
    Animated.subtract(1, transition),
    entranceDistance,
  )
  const sheetTranslateY =
    animationType === "slide"
      ? Animated.add(entranceTranslateY, translateY)
      : translateY
  const backdropAnimatedOpacity = transition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, backdropOpacity],
  })

  const content = (
    <View style={{ flex: 1, justifyContent: "flex-end" }}>
      <Animated.View
        pointerEvents={visible ? "auto" : "none"}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          backgroundColor: "black",
          opacity: backdropAnimatedOpacity,
        }}
      >
        <Pressable
          style={{ flex: 1 }}
          onPress={dismiss}
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
        />
      </Animated.View>
      <Animated.View
        {...panResponder.panHandlers}
        pointerEvents={visible ? "auto" : "none"}
        onLayout={(event) => {
          entranceDistance.setValue(event.nativeEvent.layout.height)
        }}
        style={[
          {
            backgroundColor: "white",
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
            paddingBottom: Math.max(insets.bottom + 16, 32),
            opacity: animationType === "fade" ? transition : 1,
            transform: [{ translateY: sheetTranslateY }],
          },
          sheetStyle,
        ]}
      >
        {visible ? children : visibleChildrenRef.current}
      </Animated.View>
    </View>
  )

  return (
    <Modal
      visible={rendered}
      transparent
      animationType="none"
      onShow={() => {
        modalShownRef.current = true
        if (visible) startOpenRef.current()
      }}
      onDismiss={() => {
        modalShownRef.current = false
        finishClosedRef.current()
      }}
      onRequestClose={dismiss}
    >
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
